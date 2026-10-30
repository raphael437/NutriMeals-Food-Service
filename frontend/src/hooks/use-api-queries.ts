"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAddress,
  createOrder,
  createReservation,
  createReview,
  deleteAddress,
  deleteOrder,
  getAddresses,
  getAuthState,
  getIncomingOrders,
  getMenu,
  getMyOrders,
  getMyReservations,
  getMyReviews,
  getOrder,
  getRestaurant,
  getRestaurantReviews,
  getRestaurants,
  logoutUser,
  updateAddress,
  updateOrderStatus,
  type OrderStatus,
} from "../api/api";

export const queryKeys = {
  authState: ["auth", "me"] as const,
  restaurants: (page = 1, limit = 20) =>
    ["restaurants", "list", { page, limit }] as const,
  restaurant: (restaurantId: string) => ["restaurants", "detail", restaurantId] as const,
  menu: (restaurantId: string) => ["restaurants", restaurantId, "menu"] as const,
  restaurantReviews: (restaurantId: string, page = 1, limit = 10) =>
    ["restaurants", restaurantId, "reviews", { page, limit }] as const,
  myOrdersPrefix: ["orders", "mine"] as const,
  myOrders: (page = 1, limit = 10) =>
    ["orders", "mine", { page, limit }] as const,
  order: (orderId: string) => ["orders", "detail", orderId] as const,
  addresses: ["addresses", "mine"] as const,
  myReviews: ["reviews", "mine"] as const,
  myReservations: ["reservations", "mine"] as const,
  incomingOrders: (restaurantId: string, page = 1, limit = 10, status?: OrderStatus) =>
    ["restaurants", restaurantId, "orders", { page, limit, status }] as const,
};

export function useAuthState(enabled = true) {
  return useQuery({
    queryKey: queryKeys.authState,
    queryFn: getAuthState,
    enabled,
    retry: false,
  });
}

export function useRestaurants(page = 1, limit = 20, enabled = true) {
  return useQuery({
    queryKey: queryKeys.restaurants(page, limit),
    queryFn: () => getRestaurants({ page, limit }),
    enabled,
  });
}

export function useRestaurant(restaurantId: string) {
  return useQuery({
    queryKey: queryKeys.restaurant(restaurantId),
    queryFn: () => getRestaurant(restaurantId),
    enabled: Boolean(restaurantId),
  });
}

export function useMenu(restaurantId: string) {
  return useQuery({
    queryKey: queryKeys.menu(restaurantId),
    queryFn: () => getMenu(restaurantId),
    enabled: Boolean(restaurantId),
  });
}

export function useRestaurantReviews(restaurantId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: queryKeys.restaurantReviews(restaurantId, page, limit),
    queryFn: () => getRestaurantReviews(restaurantId, { page, limit }),
    enabled: Boolean(restaurantId),
  });
}

export function useMyOrders(
  params: { page?: number; limit?: number } = {},
  options: { enabled?: boolean } = {},
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  return useQuery({
    queryKey: queryKeys.myOrders(page, limit),
    queryFn: () => getMyOrders({ page, limit }),
    enabled: options.enabled ?? true,
  });
}

export function useIncomingOrders(
  restaurantId: string,
  params: { status?: OrderStatus; page?: number; limit?: number } = {},
  enabled = true,
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  return useQuery({
    queryKey: queryKeys.incomingOrders(restaurantId, page, limit, params.status),
    queryFn: () => getIncomingOrders(restaurantId, { ...params, page, limit }),
    enabled: enabled && Boolean(restaurantId),
  });
}

export function useOrder(orderId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => getOrder(orderId),
    enabled: enabled && Boolean(orderId),
  });
}

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: queryKeys.addresses,
    queryFn: getAddresses,
    enabled,
  });
}

export function useMyReviews(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myReviews,
    queryFn: getMyReviews,
    enabled,
  });
}

export function useMyReservations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myReservations,
    queryFn: getMyReservations,
    enabled,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutUser,
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.removeQueries({ queryKey: queryKeys.authState, exact: true });
      queryClient.removeQueries({ queryKey: ["orders"] });
      queryClient.removeQueries({ queryKey: queryKeys.addresses, exact: true });
      queryClient.removeQueries({ queryKey: queryKeys.myReviews, exact: true });
      queryClient.removeQueries({ queryKey: queryKeys.myReservations, exact: true });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    onSuccess: async (order) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myOrdersPrefix }),
        queryClient.setQueryData(queryKeys.order(order.id), order),
      ]);
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOrder,
    onSuccess: async (_result, orderId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myOrdersPrefix }),
        queryClient.removeQueries({ queryKey: queryKeys.order(orderId), exact: true }),
      ]);
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReservation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.myReservations });
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReview,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myReviews }),
        queryClient.invalidateQueries({ queryKey: ["restaurants"] }),
      ]);
    },
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAddress,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ addressId, input }: {
      addressId: string;
      input: Parameters<typeof updateAddress>[1];
    }) => updateAddress(addressId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAddress,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ restaurantId, orderId, status }: {
      restaurantId: string;
      orderId: string;
      status: OrderStatus;
    }) => updateOrderStatus(restaurantId, orderId, status),
    onSuccess: async (order) => {
      queryClient.setQueryData(queryKeys.order(order.id), order);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myOrdersPrefix }),
        queryClient.invalidateQueries({ queryKey: ["restaurants", order.restaurant_id, "orders"] }),
      ]);
    },
  });
}
