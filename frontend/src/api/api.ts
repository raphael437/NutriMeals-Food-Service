/*
 * src/api/api.ts
 * Single source of truth for requests to the current food marketplace backend.
 *
 * IMPORTANT:
 * - Current Express routers are mounted under /api (not /api/v1).
 * - Authentication uses an httpOnly `jwt` cookie; do not store the token in localStorage.
 * - Several controllers return different top-level keys (`user`, `data`, `order`, etc.),
 *   so each helper below unwraps the response shape its controller actually returns.
 */

import axios, { type AxiosError } from "axios";

const configuredApiUrl =
  process.env.NEXT_PUBLIC_BACK_API_URL ?? "http://localhost:5000/api";

// The previous client used /api/v1, but the current server mounts its routers
// under /api. Normalize the old suffix if it remains in .env.local.
const API_URL = configuredApiUrl
  .replace(/\/api\/v1\/?$/, "/api")
  .replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ---------- ERROR HANDLING ----------

type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
  status?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const message =
      (typeof body?.message === "string" && body.message) ||
      (typeof body?.error === "string" && body.error) ||
      error.message ||
      "Something went wrong";

    return Promise.reject(new ApiError(message, status));
  }
);


// ---------- PUBLIC API CACHE (5 minutes) ----------
// Cache only public marketplace data in the browser. This avoids repeated
// requests when moving between the restaurant list and a restaurant detail page,
// and sessionStorage preserves the cache across refreshes in the same tab.
const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_CACHE_STORAGE_PREFIX = "food-marketplace:public-cache:v1:";

type PublicCacheEntry = {
  expiresAt: number;
  value: unknown;
};

const publicMemoryCache = new Map<string, PublicCacheEntry>();
const inFlightPublicRequests = new Map<
  string,
  { id: symbol; promise: Promise<unknown> }
>();
let publicCacheGeneration = 0;

function readPublicCache<T>(key: string): { hit: true; value: T } | { hit: false } {
  if (typeof window === "undefined") return { hit: false };

  const now = Date.now();
  const memoryEntry = publicMemoryCache.get(key);
  if (memoryEntry) {
    if (memoryEntry.expiresAt > now) {
      return { hit: true, value: memoryEntry.value as T };
    }
    publicMemoryCache.delete(key);
  }

  try {
    const storageKey = PUBLIC_CACHE_STORAGE_PREFIX + key;
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return { hit: false };

    const entry = JSON.parse(raw) as PublicCacheEntry;
    if (typeof entry.expiresAt === "number" && entry.expiresAt > now) {
      publicMemoryCache.set(key, entry);
      return { hit: true, value: entry.value as T };
    }

    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Storage can be disabled by browser settings. Continue with API requests.
  }

  return { hit: false };
}

function writePublicCache<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;

  const entry: PublicCacheEntry = {
    expiresAt: Date.now() + PUBLIC_CACHE_TTL_MS,
    value,
  };
  publicMemoryCache.set(key, entry);

  try {
    window.sessionStorage.setItem(
      PUBLIC_CACHE_STORAGE_PREFIX + key,
      JSON.stringify(entry)
    );
  } catch {
    // Memory cache still works if sessionStorage is unavailable or full.
  }
}

async function getCachedPublic<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Never share a module-level public cache between server-rendered requests.
  if (typeof window === "undefined") return fetcher();

  const cached = readPublicCache<T>(key);
  if (cached.hit) return cached.value;

  const inFlight = inFlightPublicRequests.get(key);
  if (inFlight) return inFlight.promise as Promise<T>;

  const generationAtStart = publicCacheGeneration;
  const requestId = Symbol(key);
  const request: Promise<T> = fetcher()
    .then((value) => {
      // Don't repopulate stale cache if a mutation invalidated it mid-request.
      if (generationAtStart === publicCacheGeneration) {
        writePublicCache(key, value);
      }
      return value;
    })
    .finally(() => {
      // An older request must not remove a newer request for the same key.
      if (inFlightPublicRequests.get(key)?.id === requestId) {
        inFlightPublicRequests.delete(key);
      }
    });

  inFlightPublicRequests.set(key, { id: requestId, promise: request });
  return request;
}

/** Clear browser-cached public restaurant data after relevant mutations. */
export function clearPublicApiCache(): void {
  publicCacheGeneration += 1;
  publicMemoryCache.clear();
  inFlightPublicRequests.clear();
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(PUBLIC_CACHE_STORAGE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Cache invalidation should never prevent a successful mutation response.
  }
}

// ---------- SHARED TYPES ----------

export type Role = "customer" | "restaurant_applicant" | "restaurant_owner" | "admin";

export type RestaurantStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed";
export type ReservationStatus = "pending" | "confirmed" | "declined" | "cancelled";
export type BillingInterval = "monthly" | "yearly";
export type SubscriptionStatus =
  | "pending"
  | "active"
  | "expired"
  | "cancelled"
  | "past_due";

// Prisma Decimal values are commonly serialized as strings over JSON.
export type Money = number | string;

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface RestaurantSummary {
  id: string;
  name: string;
  status?: RestaurantStatus;
  is_open?: boolean;
  rejection_reason?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  created_at?: string;
  restaurants?: RestaurantSummary[];
}

export interface Restaurant {
  id: string;
  owner_id?: string;
  name: string;
  description?: string | null;
  address: string;
  phone?: string | null;
  status?: RestaurantStatus;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  is_open: boolean;
  cover_image?: string | null;
  created_at: string;
  updated_at?: string;
  owner?: Pick<User, "id" | "name" | "email" | "phone">;
  _count?: {
    reviews?: number;
    menu_items?: number;
    orders?: number;
  };
  subscriptions?: RestaurantSubscription[];
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category: string;
  name: string;
  description?: string | null;
  price: Money;
  image_url?: string | null;
  is_available: boolean;
  // Nutrition values are measured per serving. Null/undefined means not entered.
  calories?: number;
  protein_g?: Money;
  carbs_g?: Money;
  fat_g?: Money;
  fiber_g?: Money;
  serving_size?: string | null;
  ingredients?: string | null;
  allergens?: string[];
  dietary_tags?: string[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price_at_order: Money;
  // Nutrition snapshot at the time the order was placed.
  calories_at_order?: number | null;
  protein_g_at_order?: Money | null;
  carbs_g_at_order?: Money | null;
  fat_g_at_order?: Money | null;
  fiber_g_at_order?: Money | null;
  menu_item?: Pick<
    MenuItem,
    | "id"
    | "name"
    | "image_url"
    | "price"
    | "calories"
    | "protein_g"
    | "carbs_g"
    | "fat_g"
    | "fiber_g"
    | "serving_size"
  >;
}

export interface Address {
  id: string;
  user_id: string;
  label?: string | null;
  line1: string;
  city: string;
  is_default: boolean;
}

export interface Order {
  id: string;
  customer_id: string;
  restaurant_id: string;
  address_id?: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  paymob_order_id?: string | null;
  total: Money;
  notes?: string | null;
  estimated_delivery_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  items?: OrderItem[];
  customer?: { id?: string; name: string; phone?: string | null };
  restaurant?: Pick<Restaurant, "id" | "name" | "phone" | "address" | "cover_image">;
  address?: Address | null;
}

export interface NutritionProfile {
  id: string;
  user_id: string;
  daily_calorie_goal: number;
  protein_goal_g?: Money | null;
  carbs_goal_g?: Money | null;
  fat_goal_g?: Money | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateNutritionProfileInput {
  daily_calorie_goal: number;
  protein_goal_g?: number | null;
  carbs_goal_g?: number | null;
  fat_goal_g?: number | null;
}

export interface Reservation {
  id: string;
  customer_id: string;
  restaurant_id: string;
  party_size: number;
  reservation_time: string;
  status: ReservationStatus;
  created_at: string;
  restaurant?: Pick<Restaurant, "id" | "name" | "address">;
}

export interface Review {
  id: string;
  customer_id: string;
  restaurant_id: string;
  order_id?: string | null;
  rating: number;
  comment?: string | null;
  created_at: string;
  customer?: { id?: string; name: string };
  restaurant?: Pick<Restaurant, "id" | "name">;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  price: Money;
  currency: string;
  billing_interval: BillingInterval;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: { subscriptions: number };
}

export interface RestaurantSubscription {
  id: string;
  restaurant_id: string;
  plan_id: string;
  price_at_purchase: Money;
  currency: string;
  status: SubscriptionStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface AuthState {
  user: User;
  next: string;
}

export interface AuthResult extends AuthState {
  message: string;
  token?: string;
}

export interface CreateCustomerInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterRestaurantOwnerInput extends CreateCustomerInput {
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone?: string;
  description?: string;
}

export interface CreateOrderInput {
  restaurant_id: string;
  address_id?: string | null;
  notes?: string;
  items: Array<{ menu_item_id: string; quantity: number }>;
}

export interface CreateAddressInput {
  label?: string | null;
  line1: string;
  city: string;
  is_default?: boolean;
}

export interface UpdateAddressInput {
  label?: string | null;
  line1?: string;
  city?: string;
  is_default?: boolean;
}

export interface CreateRestaurantInput {
  name: string;
  address: string;
  description?: string | null;
  phone?: string | null;
  cover_image?: string | null;
}

export interface CreateMenuItemInput {
  name: string;
  category: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
  is_available?: boolean;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  serving_size?: string | null;
  ingredients?: string | null;
  allergens?: string[];
  dietary_tags?: string[];
}

export interface CreateSubscriptionPlanInput {
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  billing_interval: BillingInterval;
  is_active?: boolean;
}

export interface UpdateSubscriptionPlanInput {
  name?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  billing_interval?: BillingInterval;
  is_active?: boolean;
}

export interface AdminDashboard {
  metrics: {
    users: number;
    customers: number;
    restaurantOwners: number;
    pendingRestaurants: number;
    approvedRestaurants: number;
    rejectedRestaurants: number;
    suspendedRestaurants: number;
    orders: number;
    activeSubscriptions: number;
    paidOrderVolume: number;
  };
  note: string;
}
export interface RestaurantDashboard {
  restaurant: Pick<
    Restaurant,
    "id" | "name" | "status" | "is_open"
  >;

  metrics: {
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    menuItems: number;

    paidOrderBalance: number;
    paidOrderCount: number;

    // Retain the existing delivered-and-paid metric.
    paidDeliveredSales: number;
  };

  activeSubscription: RestaurantSubscription | null;
  recentOrders: Order[];
  note: string;
}

export interface RestaurantEarnings {
  period: { from: string; to: string };
  paidDeliveredOrders: number;
  grossSales: number;
  orders: Array<{ id: string; total: Money; created_at: string }>;
  note: string;
}

// ---------- AUTH ----------

export async function signupUser(
  input: CreateCustomerInput
): Promise<{ user: User; message: string }> {
  const { data } = await apiClient.post<{ user: User; message: string }>(
    "/auth/register",
    input
  );
  return data;
}

export async function signupRestaurantOwner(
  input: RegisterRestaurantOwnerInput
): Promise<{
  message: string;
  user: User;
  restaurant: Restaurant;
  next: string;
}> {
  const { data } = await apiClient.post<{
    message: string;
    user: User;
    restaurant: Restaurant;
    next: string;
  }>("/auth/restaurant-register", input);
  return data;
}

export async function signinUser(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const { data } = await apiClient.post<AuthResult>("/auth/login", input);
  return data;
}

export async function logoutUser(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getAuthState(): Promise<AuthState> {
  const { data } = await apiClient.get<AuthState>("/auth/me");
  return data;
}

// Compatibility helper for components that only need the user object.
export async function getMe(): Promise<User> {
  const state = await getAuthState();
  return state.user;
}

export const authApi = {
  signup: signupUser,
  signupRestaurantOwner: signupRestaurantOwner,
  signin: signinUser,
  logout: logoutUser,
  me: getAuthState,
};

// ---------- PUBLIC MARKETPLACE ----------

export async function getRestaurants(params: {
  page?: number;
  limit?: number;
} = {}): Promise<{ restaurants: Restaurant[]; pagination: Pagination }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  return getCachedPublic(`restaurants:list:page=${page}:limit=${limit}`, async () => {
    const { data } = await apiClient.get<{
      data: Restaurant[];
      pagination: Pagination;
    }>("/restaurants", { params: { page, limit } });
    return { restaurants: data.data, pagination: data.pagination };
  });
}

export async function getRestaurant(restaurantId: string): Promise<Restaurant> {
  const id = encodeURIComponent(restaurantId);
  return getCachedPublic(`restaurant:detail:${id}`, async () => {
    const { data } = await apiClient.get<{ restaurant: Restaurant }>(
      `/restaurants/${id}`
    );
    return data.restaurant;
  });
}

export async function getMenu(
  restaurantId: string
): Promise<{ restaurant: Pick<Restaurant, "id" | "name">; items: MenuItem[] }> {
  const id = encodeURIComponent(restaurantId);
  return getCachedPublic(`restaurant:menu:${id}`, async () => {
    const { data } = await apiClient.get<{
      restaurant: Pick<Restaurant, "id" | "name">;
      items: MenuItem[];
    }>(`/restaurants/${id}/menu`);
    return data;
  });
}

export async function getRestaurantReviews(
  restaurantId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ reviews: Review[]; pagination: Pagination }> {
  const id = encodeURIComponent(restaurantId);
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  return getCachedPublic(`restaurant:reviews:${id}:page=${page}:limit=${limit}`, async () => {
    const { data } = await apiClient.get<{
      data: Review[];
      pagination: Pagination;
    }>(`/restaurants/${id}/reviews`, { params: { page, limit } });
    return { reviews: data.data, pagination: data.pagination };
  });
}

// ---------- CUSTOMER: ORDERS ----------

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { data } = await apiClient.post<{ order: Order }>(
    "/customer/orders",
    input
  );
  return data.order;
}

export async function getMyOrders(params: {
  page?: number;
  limit?: number;
} = {}): Promise<{ orders: Order[]; pagination: Pagination }> {
  const { data } = await apiClient.get<{
    data: Order[];
    pagination: Pagination;
  }>("/customer/orders", { params });
  return { orders: data.data, pagination: data.pagination };
}

export async function getOrder(orderId: string): Promise<Order> {
  const { data } = await apiClient.get<{ order: Order }>(
    `/customer/orders/${encodeURIComponent(orderId)}`
  );
  return data.order;
}

export async function cancelOrder(orderId: string): Promise<Order> {
  const { data } = await apiClient.patch<{ order: Order }>(
    `/customer/orders/${encodeURIComponent(orderId)}/cancel`
  );
  return data.order;
}

/**
 * Delete an order when the backend permits deletion (usually before processing).
 * Keep this separate from cancelOrder: these endpoints have different semantics.
 */
export async function deleteOrder(
  orderId: string
): Promise<{ message: string; orderId: string }> {
  const { data } = await apiClient.delete<{
    message: string;
    orderId: string;
  }>(`/customer/orders/${encodeURIComponent(orderId)}/delete`);
  return data;
}

// ---------- CUSTOMER: ADDRESSES ----------

export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const { data } = await apiClient.post<{ message: string; address: Address }>(
    "/customer/addresses",
    input
  );
  return data.address;
}

export async function getAddresses(): Promise<Address[]> {
  const { data } = await apiClient.get<{ addresses: Address[] }>(
    "/customer/addresses"
  );
  return data.addresses;
}

export async function updateAddress(
  addressId: string,
  input: UpdateAddressInput
): Promise<Address> {
  const { data } = await apiClient.patch<{
    message: string;
    address: Address;
  }>(`/customer/addresses/${encodeURIComponent(addressId)}`, input);
  return data.address;
}

export async function deleteAddress(addressId: string): Promise<void> {
  await apiClient.delete<{ message: string }>(
    `/customer/addresses/${encodeURIComponent(addressId)}`
  );
}

export interface OrderCheckoutResponse {
  message: string;
  orderId: string;
  iframeUrl: string;
}

export async function payOrder(orderId: string): Promise<OrderCheckoutResponse> {
  const { data } = await apiClient.post<OrderCheckoutResponse>(
    `/payments/orders/${encodeURIComponent(orderId)}/checkout`
  );
  return data;
}

// ---------- CUSTOMER: NUTRITION PROFILE ----------

export async function getMyNutritionProfile(): Promise<NutritionProfile> {
  const { data } = await apiClient.get<{ profile: NutritionProfile }>(
    "/customer/nutrition-profile"
  );
  return data.profile;
}

export async function updateMyNutritionProfile(
  input: UpdateNutritionProfileInput
): Promise<NutritionProfile> {
  const { data } = await apiClient.put<{
    message: string;
    profile: NutritionProfile;
  }>("/customer/nutrition-profile", input);
  return data.profile;
}

// ---------- CUSTOMER: RESERVATIONS ----------

export async function createReservation(input: {
  restaurant_id: string;
  party_size: number;
  reservation_time: string;
}): Promise<Reservation> {
  const { data } = await apiClient.post<{ reservation: Reservation }>(
    "/customer/reservations",
    input
  );
  return data.reservation;
}

export async function getMyReservations(): Promise<Reservation[]> {
  const { data } = await apiClient.get<{ reservations: Reservation[] }>(
    "/customer/reservations"
  );
  return data.reservations;
}

export async function cancelReservation(
  reservationId: string
): Promise<Reservation> {
  const { data } = await apiClient.patch<{
    message: string;
    reservation: Reservation;
  }>(
    `/customer/reservations/${encodeURIComponent(reservationId)}/cancel`
  );
  return data.reservation;
}

// ---------- CUSTOMER: REVIEWS ----------

export async function createReview(input: {
  order_id: string;
  rating: number;
  comment?: string;
}): Promise<Review> {
  const { data } = await apiClient.post<{ review: Review }>(
    "/customer/reviews",
    input
  );
  clearPublicApiCache();
  return data.review;
}

export async function getMyReviews(): Promise<Review[]> {
  const { data } = await apiClient.get<{ reviews: Review[] }>(
    "/customer/reviews"
  );
  return data.reviews;
}

// Compatibility alias: the previous client used getReviews() for the current
// customer's reviews. For a restaurant's public reviews, use getRestaurantReviews(id).
export const getReviews = getMyReviews;

// ---------- RESTAURANT OWNER ----------

export async function getMyRestaurants(): Promise<Restaurant[]> {
  const { data } = await apiClient.get<{ restaurants: Restaurant[] }>(
    "/restaurant-owner/restaurants"
  );
  return data.restaurants;
}

export async function createRestaurantApplication(
  input: CreateRestaurantInput
): Promise<{ message: string; restaurant: Restaurant }> {
  const { data } = await apiClient.post<{ message: string; restaurant: Restaurant }>(
    "/restaurant-owner/restaurants",
    input
  );
  clearPublicApiCache();
  return data;
}

export async function getMyRestaurantInfo(
  restaurantId: string
): Promise<Restaurant> {
  const { data } = await apiClient.get<{ restaurant: Restaurant }>(
    `/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}`
  );
  return data.restaurant;
}

export async function updateMyRestaurant(
  restaurantId: string,
  input: Partial<CreateRestaurantInput> & { is_open?: boolean }
): Promise<Restaurant> {
  const { data } = await apiClient.patch<{ restaurant: Restaurant }>(
    `/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}`,
    input
  );
  clearPublicApiCache();
  return data.restaurant;
}

export async function getDashboard(
  restaurantId: string
): Promise<RestaurantDashboard> {
  const { data } = await apiClient.get<RestaurantDashboard>(
    `/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}/dashboard`
  );
  return data;
}

export async function getEarnings(
  restaurantId: string,
  params: { from?: string; to?: string } = {}
): Promise<RestaurantEarnings> {
  const { data } = await apiClient.get<RestaurantEarnings>(
    `/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}/earnings`,
    { params }
  );
  return data;
}

export async function getIncomingOrders(
  restaurantId: string,
  params: { status?: OrderStatus; page?: number; limit?: number } = {}
): Promise<{ orders: Order[]; pagination: Pagination }> {
  const { data } = await apiClient.get<{
    data: Order[];
    pagination: Pagination;
  }>(`/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}/orders`, {
    params,
  });
  return { orders: data.data, pagination: data.pagination };
}

export async function updateOrderStatus(
  restaurantId: string,
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  const { data } = await apiClient.patch<{ order: Order }>(
    `/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}/orders/${encodeURIComponent(orderId)}/status`,
    { status }
  );
  return data.order;
}

export async function createMenuItem(
  restaurantId: string,
  input: CreateMenuItemInput
): Promise<MenuItem> {
  const { data } = await apiClient.post<{ item: MenuItem }>(
    `/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}/menu-items`,
    input
  );
  clearPublicApiCache();
  return data.item;
}

export async function getMyMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const { data } = await apiClient.get<{ items: MenuItem[] }>(
    `/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}/menu-items`
  );
  return data.items;
}

export async function updateMenuItem(
  restaurantId: string,
  menuItemId: string,
  input: Partial<CreateMenuItemInput>
): Promise<MenuItem> {
  const { data } = await apiClient.patch<{ item: MenuItem }>(
    `/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}/menu-items/${encodeURIComponent(menuItemId)}`,
    input
  );
  clearPublicApiCache();
  return data.item;
}

// Backend marks menu items unavailable instead of physically deleting them,
// because existing OrderItem records may reference them.
export async function deleteMenuItem(
  restaurantId: string,
  menuItemId: string
): Promise<MenuItem> {
  const { data } = await apiClient.delete<{ item: MenuItem }>(
    `/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}/menu-items/${encodeURIComponent(menuItemId)}`
  );
  clearPublicApiCache();
  return data.item;
}

export async function getRestaurantSubscription(restaurantId: string): Promise<{
  restaurantId: string;
  current: RestaurantSubscription | null;
  history: RestaurantSubscription[];
}> {
  const { data } = await apiClient.get<{
    restaurantId: string;
    current: RestaurantSubscription | null;
    history: RestaurantSubscription[];
  }>(`/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}/subscription`);
  return data;
}

export async function createSubscriptionCheckout(
  restaurantId: string,
  planId: string
): Promise<{
  message: string;
  subscription: RestaurantSubscription;
  checkoutReady: false;
}> {
  const { data } = await apiClient.post<{
    message: string;
    subscription: RestaurantSubscription;
    checkoutReady: false;
  }>(
    `/restaurant-owner/restaurants/${encodeURIComponent(restaurantId)}/subscription/checkout`,
    { planId }
  );
  return data;
}

// ---------- SUBSCRIPTION PLANS: PUBLIC ----------

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await apiClient.get<{ plans: SubscriptionPlan[] }>(
    "/subscription-plans"
  );
  return data.plans;
}

export async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan> {
  const { data } = await apiClient.get<{ plan: SubscriptionPlan }>(
    `/subscription-plans/${encodeURIComponent(planId)}`
  );
  return data.plan;
}

// ---------- PLATFORM ADMIN ----------

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const { data } = await apiClient.get<AdminDashboard>("/admin/dashboard");
  return data;
}

export async function getRestaurantApplications(params: {
  status?: RestaurantStatus;
  page?: number;
  limit?: number;
} = {}): Promise<{ restaurants: Restaurant[]; pagination: Pagination }> {
  const { data } = await apiClient.get<{
    data: Restaurant[];
    pagination: Pagination;
  }>("/admin/restaurant-applications", { params });
  return { restaurants: data.data, pagination: data.pagination };
}

export async function approveRestaurant(restaurantId: string): Promise<Restaurant> {
  const { data } = await apiClient.patch<{ restaurant: Restaurant }>(
    `/admin/restaurant-applications/${encodeURIComponent(restaurantId)}/approve`
  );
  clearPublicApiCache();
  return data.restaurant;
}

export async function rejectRestaurant(
  restaurantId: string,
  reason: string
): Promise<Restaurant> {
  const { data } = await apiClient.patch<{ restaurant: Restaurant }>(
    `/admin/restaurant-applications/${encodeURIComponent(restaurantId)}/reject`,
    { reason }
  );
  clearPublicApiCache();
  return data.restaurant;
}

export async function getAllRestaurants(params: {
  status?: RestaurantStatus;
  page?: number;
  limit?: number;
} = {}): Promise<{ restaurants: Restaurant[]; pagination: Pagination }> {
  const { data } = await apiClient.get<{
    data: Restaurant[];
    pagination: Pagination;
  }>("/admin/restaurants", { params });
  return { restaurants: data.data, pagination: data.pagination };
}

export async function suspendRestaurant(restaurantId: string): Promise<Restaurant> {
  const { data } = await apiClient.patch<{ restaurant: Restaurant }>(
    `/admin/restaurants/${encodeURIComponent(restaurantId)}/suspend`
  );
  clearPublicApiCache();
  return data.restaurant;
}

export async function restoreRestaurant(restaurantId: string): Promise<Restaurant> {
  const { data } = await apiClient.patch<{ restaurant: Restaurant }>(
    `/admin/restaurants/${encodeURIComponent(restaurantId)}/restore`
  );
  clearPublicApiCache();
  return data.restaurant;
}

// ---------- SUBSCRIPTION PLANS: ADMIN ----------

export async function getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await apiClient.get<{ plans: SubscriptionPlan[] }>(
    "/admin/subscription-plans"
  );
  return data.plans;
}

export async function createSubscriptionPlan(
  input: CreateSubscriptionPlanInput
): Promise<SubscriptionPlan> {
  const { data } = await apiClient.post<{ plan: SubscriptionPlan }>(
    "/admin/subscription-plans",
    input
  );
  return data.plan;
}

export async function updateSubscriptionPlan(
  planId: string,
  input: UpdateSubscriptionPlanInput
): Promise<SubscriptionPlan> {
  const { data } = await apiClient.patch<{ plan: SubscriptionPlan }>(
    `/admin/subscription-plans/${encodeURIComponent(planId)}`,
    input
  );
  return data.plan;
}

export async function deactivateSubscriptionPlan(
  planId: string
): Promise<SubscriptionPlan> {
  const { data } = await apiClient.patch<{ plan: SubscriptionPlan }>(
    `/admin/subscription-plans/${encodeURIComponent(planId)}/deactivate`
  );
  return data.plan;
}

// ---------- HEALTH CHECK ----------
// The current server exposes health at /api/v1/health, separately from the
// business API mounted under /api. Use the server origin for this call.
export async function checkBackendHealth(): Promise<{ status: string }> {
  const apiOrigin = API_URL.replace(/\/api\/?$/, "");
  const { data } = await axios.get<{ status: string }>(`${apiOrigin}/api/v1/health`, {
    withCredentials: true,
  });
  return data;
}

/*
 * Customer helpers used by the marketplace UI include:
 * - POST/GET /customer/addresses and PATCH/DELETE /customer/addresses/:addressId
 * - POST/GET /customer/orders, GET /customer/orders/:orderId, and order cancel/delete actions
 * - GET/PUT /customer/nutrition-profile
 * - Reservation helpers remain available for components that still use them
 */
