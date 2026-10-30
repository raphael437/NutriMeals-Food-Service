'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  ApiError,
  type MenuItem,
} from '../../api/api';
import PublicRestaurantReviews from './PublicRestaurantReviews';
import type { StoredCartItem } from '../../lib/cartStorage';
import { useCartStore } from '../../components/providers/CartStoreProvider';
import {
  useAuthState,
  useAddresses,
  useCreateAddress,
  useMenu,
  useRestaurant,
} from '../../hooks/use-api-queries';

type Cart = Record<string, number>;
type AuthStatus = 'loading' | 'guest' | 'customer' | 'other';

type RestaurantDetailsProps = {
  restaurantId: string;
};

export default function RestaurantDetails({
  restaurantId,
}: RestaurantDetailsProps) {
  // Restaurant and menu are server state: TanStack Query owns their cache.
  const restaurantQuery = useRestaurant(restaurantId);
  const menuQuery = useMenu(restaurantId);
  const restaurant = restaurantQuery.data ?? null;
  const menu = menuQuery.data ?? null;
  const loading = Boolean(restaurantId) && (restaurantQuery.isPending || menuQuery.isPending);
  const error = !restaurantId
    ? 'A restaurant ID was not provided in the URL.'
    : restaurantQuery.error instanceof Error
      ? restaurantQuery.error.message
      : menuQuery.error instanceof Error
        ? menuQuery.error.message
        : null;

  // Cart state is shared between menu, header, and checkout components.
  const globalCart = useCartStore((state) => state.cart);
  const cartHydrated = useCartStore((state) => state.hydrated);
  const replaceCart = useCartStore((state) => state.replaceCart);
  const cart = useMemo<Cart>(() => {
    if (!restaurant || globalCart?.restaurantId !== restaurant.id) return {};
    return Object.fromEntries(globalCart.items.map((item) => [item.id, item.quantity]));
  }, [globalCart, restaurant?.id]);
  const [mealSearch, setMealSearch] = useState("");
  const [maxCaloriesFilter, setMaxCaloriesFilter] = useState("all");
  const authQuery = useAuthState();
  const user = authQuery.data?.user ?? null;
  const authStatus: AuthStatus = authQuery.isPending
    ? 'loading'
    : !user
      ? 'guest'
      : user.role === 'customer'
        ? 'customer'
        : 'other';
  const addressesQuery = useAddresses(authStatus === 'customer');
  const addresses = addressesQuery.data ?? [];
  const addressesLoading = authStatus === 'customer' && addressesQuery.isPending;
  const createAddressMutation = useCreateAddress();
  // null means no manual selection has been made yet; in that case, use the
  // customer's default address (or the first saved address) during render.
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [addressLabel, setAddressLabel] = useState('Home');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressCity, setAddressCity] = useState('Cairo');
  // null lets the UI derive the initial visibility from address-query data.
  const [showNewAddress, setShowNewAddress] = useState<boolean | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  const defaultAddress =
    addresses.find((address) => address.is_default) ?? addresses[0] ?? null;

  const selectedAddressIdForUse =
    selectedAddressId === null
      ? defaultAddress?.id ?? ''
      : selectedAddressId === '' ||
          addresses.some((address) => address.id === selectedAddressId)
        ? selectedAddressId
        : defaultAddress?.id ?? '';

  const shouldShowNewAddress =
    showNewAddress ??
    (authStatus === 'customer' && !addressesLoading && addresses.length === 0);

  // Once the server menu is cached and the persisted cart has hydrated, refresh
  // prices/nutrition snapshots for items in this restaurant's cart. The signature
  // intentionally ignores updatedAt so this effect does not loop after a write.
  useEffect(() => {
    if (
      !cartHydrated ||
      !restaurant ||
      !menu ||
      !globalCart ||
      globalCart.restaurantId !== restaurant.id
    ) {
      return;
    }

    const savedQuantities = new Map<string, number>(
      globalCart.items.map((item) => [item.id, item.quantity]),
    );
    const refreshedItems: StoredCartItem[] = menu.items
      .filter((item) => (savedQuantities.get(item.id) ?? 0) > 0)
      .map((item) => ({
        id: item.id,
        restaurant_id: item.restaurant_id,
        name: item.name,
        category: item.category,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g,
        serving_size: item.serving_size,
        quantity: Math.min(99, savedQuantities.get(item.id) ?? 0),
      }));

    if (refreshedItems.length === 0) {
      replaceCart(null);
      return;
    }

    const signature = (items: StoredCartItem[]) =>
      JSON.stringify(items.map((item) => [
        item.id,
        item.restaurant_id,
        item.name,
        item.category,
        item.description,
        item.price,
        item.image_url,
        item.calories,
        item.protein_g,
        item.carbs_g,
        item.fat_g,
        item.fiber_g,
        item.serving_size,
        item.quantity,
      ]));

    const metadataChanged =
      globalCart.restaurantName !== restaurant.name ||
      globalCart.restaurantIsOpen !== restaurant.is_open;

    if (metadataChanged || signature(globalCart.items) !== signature(refreshedItems)) {
      replaceCart({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantIsOpen: restaurant.is_open,
        items: refreshedItems,
        updatedAt: new Date().toISOString(),
      });
    }
  }, [cartHydrated, restaurant, menu, globalCart, replaceCart]);

  const menuByCategory = useMemo(() => {
    const grouped = new Map<string, MenuItem[]>();
    const search = mealSearch.trim().toLocaleLowerCase();
    const maxCalories = maxCaloriesFilter === "all" ? null : Number(maxCaloriesFilter);

    for (const item of menu?.items ?? []) {
      // When a calorie filter is selected, hide meals with missing nutrition
      // instead of treating an unknown calorie count as zero.
      if (maxCalories !== null && (!Number(item.calories) || Number(item.calories) > maxCalories)) continue;
      const searchable = [item.name, item.description, item.ingredients, ...(item.dietary_tags ?? [])]
        .filter(Boolean).join(" ").toLocaleLowerCase();
      if (search && !searchable.includes(search)) continue;

      const category = item.category || 'Meals';
      const current = grouped.get(category) ?? [];
      current.push(item);
      grouped.set(category, current);
    }
    return Array.from(grouped.entries());
  }, [menu, mealSearch, maxCaloriesFilter]);

  const cartLines = useMemo(() => {
    const items = menu?.items ?? [];
    return Object.entries(cart)
      .map(([menuItemId, quantity]) => {
        const item = items.find(candidate => candidate.id === menuItemId);
        return item && quantity > 0 ? { item, quantity } : null;
      })
      .filter(
        (line): line is { item: MenuItem; quantity: number } => line !== null,
      );
  }, [cart, menu]);

  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartLines.reduce(
    (sum, line) => sum + Number(line.item.price) * line.quantity,
    0,
  );

  const changeQuantity = useCallback((item: MenuItem, delta: number) => {
    if (!restaurant) return;

    const savedCart = globalCart;
    if (savedCart && savedCart.items.length > 0 && savedCart.restaurantId !== restaurant.id) {
      setCheckoutError(
        `Your cart already contains items from ${savedCart.restaurantName}. Finish or clear that cart before adding items from ${restaurant.name}.`,
      );
      return;
    }

    const next = { ...cart };
    const quantity = (next[item.id] ?? 0) + delta;
    if (quantity <= 0) delete next[item.id];
    else next[item.id] = Math.min(99, quantity);
    const storedItems = (menu?.items ?? [])
      .filter((menuItem) => (next[menuItem.id] ?? 0) > 0)
      .map((menuItem) => ({
        id: menuItem.id,
        restaurant_id: menuItem.restaurant_id,
        name: menuItem.name,
        category: menuItem.category,
        description: menuItem.description,
        price: menuItem.price,
        image_url: menuItem.image_url,
        calories: menuItem.calories,
        protein_g: menuItem.protein_g,
        carbs_g: menuItem.carbs_g,
        fat_g: menuItem.fat_g,
        fiber_g: menuItem.fiber_g,
        serving_size: menuItem.serving_size,
        quantity: next[menuItem.id] ?? 0,
      }));

    if (storedItems.length > 0) {
      replaceCart({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantIsOpen: restaurant.is_open,
        items: storedItems,
        updatedAt: new Date().toISOString(),
      });
    } else {
      replaceCart(null);
    }

    setCartMessage('Cart updated. Your items and subtotal are ready in checkout.');
    setCheckoutError(null);
  }, [cart, menu, restaurant, globalCart, replaceCart]);

  async function handleCreateAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError(null);
    setCartMessage(null);

    const line1 = addressLine1.trim();
    const city = addressCity.trim();
    if (!line1 || !city) {
      setCheckoutError('Please enter your street address and city.');
      return;
    }

    try {
      // This calls POST /api/customer/addresses. The backend controller saves
      // the address with req.user.id using Prisma, so it belongs to this user.
      const address = await createAddressMutation.mutateAsync({
        label: addressLabel.trim() || 'Address',
        line1,
        city,
        // The backend decides whether this should be the customer's default
        // address by checking the addresses already stored in the database.
      });

      setSelectedAddressId(address.id);
      setAddressLine1('');
      setShowNewAddress(false);
      setCheckoutError(null);
      setCartMessage('Address saved successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const isMissingRoute =
        (err instanceof ApiError && err.status === 404) ||
        /route\s+.*not found/i.test(message);

      setCheckoutError(
        isMissingRoute
          ? 'We could not save your address. Please try again.'
          : message || 'Could not save your address. Please try again.',
      );
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12" aria-live="polite">
        <p className="animate-pulse text-gray-600">Loading restaurant…</p>
      </main>
    );
  }

  if (error || !restaurant || !menu) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <Link
          href="/"
          className="text-sm font-semibold text-orange-800 hover:underline"
        >
          ← All restaurants
        </Link>
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5"
          role="alert"
        >
          <h1 className="font-semibold text-red-900">Restaurant unavailable</h1>
          <p className="mt-1 text-sm text-red-800">
            {error ?? 'This restaurant could not be found or is not approved.'}
          </p>
          <button
            type="button"
            onClick={() => {
              void restaurantQuery.refetch();
              void menuQuery.refetch();
            }}
            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="text-sm font-semibold text-orange-800 hover:underline"
      >
        ← All restaurants
      </Link>

      <header className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {restaurant.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.cover_image}
            alt={restaurant.name}
            className="h-56 w-full object-cover sm:h-72"
          />
        ) : (
          <div
            className="flex h-48 items-center justify-center bg-gradient-to-br from-orange-100 via-amber-50 to-stone-100 text-6xl"
            aria-hidden="true"
          >
            🍽️
          </div>
        )}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-950">
                {restaurant.name}
              </h1>
              {restaurant.description ? (
                <p className="mt-2 max-w-2xl text-gray-600">
                  {restaurant.description}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-gray-500">{restaurant.address}</p>
              {restaurant.phone ? (
                <p className="mt-1 text-sm text-gray-500">{restaurant.phone}</p>
              ) : null}
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${restaurant.is_open ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
            >
              {restaurant.is_open ? 'Open for orders' : 'Currently closed'}
            </span>
          </div>
        </div>
      </header>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="menu-heading">
          <div className="mb-5">
            <h2 id="menu-heading" className="text-2xl font-bold text-gray-950">
              Menu
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Browse meals by calories, search ingredients or dietary tags, and add meals to your delivery cart.
            </p>
            <div className="mt-4 grid gap-3 rounded-xl border border-emerald-100 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
              <label className="block text-sm font-medium text-gray-700">
                Search meals, ingredients or diet tags
                <input value={mealSearch} onChange={(event) => setMealSearch(event.target.value)} placeholder="e.g. chicken, vegetarian, high-protein" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Maximum calories per serving
                <select value={maxCaloriesFilter} onChange={(event) => setMaxCaloriesFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950">
                  <option value="all">All calorie amounts</option>
                  <option value="400">Up to 400 kcal</option>
                  <option value="600">Up to 600 kcal</option>
                  <option value="800">Up to 800 kcal</option>
                  <option value="1000">Up to 1,000 kcal</option>
                </select>
              </label>
            </div>
          </div>

          {menu.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-600">
              This restaurant has no available menu items right now.
            </p>
          ) : (
            menuByCategory.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 p-6 text-gray-600">No meals match these filters. Try a higher calorie limit or a different search.</p>
            ) : <div className="space-y-8">
              {menuByCategory.map(([category, items]) => (
                <section
                  key={category}
                  aria-labelledby={`category-${category.replace(/[^a-z0-9]/gi, '-')}`}
                >
                  <h3
                    id={`category-${category.replace(/[^a-z0-9]/gi, '-')}`}
                    className="mb-3 text-xl font-semibold text-gray-900"
                  >
                    {category}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {items.map(item => {
                      const quantity = cart[item.id] ?? 0;
                      return (
                        <article
                          key={item.id}
                          className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4"
                        >
                          {item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-20 w-20 shrink-0 rounded-lg object-cover"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="font-semibold text-gray-950">
                                {item.name}
                              </h4>
                              <p className="shrink-0 font-semibold text-orange-800">
                                EGP {Number(item.price).toFixed(2)}
                              </p>
                            </div>
                            {item.description ? (
                              <p className="mt-1 text-sm text-gray-600">
                                {item.description}
                              </p>
                            ) : null}
                            <p className="mt-2 text-xs font-semibold text-emerald-800">
                              {Number(item.calories) > 0 ? `${item.calories} kcal per serving` : "Nutrition information not provided"}
                              {item.protein_g !== undefined ? ` · Protein ${Number(item.protein_g)} g` : ""}
                              {item.carbs_g !== undefined ? ` · Carbs ${Number(item.carbs_g)} g` : ""}
                              {item.fat_g !== undefined ? ` · Fat ${Number(item.fat_g)} g` : ""}
                            </p>
                            {item.dietary_tags?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{item.dietary_tags.map((tag) => <span key={tag} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">{tag}</span>)}</div> : null}
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {quantity > 0
                                  ? `${quantity} in your order`
                                  : ''}
                              </span>
                              {quantity === 0 ? (
                                <button
                                  type="button"
                                  disabled={!restaurant.is_open}
                                  onClick={() => changeQuantity(item, 1)}
                                  className="cursor-pointer rounded-lg bg-orange-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                                >
                                  Add
                                </button>
                              ) : (
                                <div
                                  className="flex items-center gap-2"
                                  aria-label={`Quantity for ${item.name}`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => changeQuantity(item, -1)}
                                    className="h-8 w-8 rounded-full border border-gray-300 font-semibold"
                                    aria-label={`Remove one ${item.name}`}
                                  >
                                    −
                                  </button>
                                  <span className="min-w-5 text-center text-sm font-semibold">
                                    {quantity}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={
                                      !restaurant.is_open || quantity >= 99
                                    }
                                    onClick={() => changeQuantity(item, 1)}
                                    className="h-8 w-8 rounded-full border border-gray-300 font-semibold disabled:opacity-40"
                                    aria-label={`Add one ${item.name}`}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <aside
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6"
          aria-labelledby="order-heading"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="order-heading" className="text-xl font-bold text-gray-950">
              Your order
            </h2>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-sm font-semibold text-orange-800">
              {cartCount} item{cartCount === 1 ? '' : 's'}
            </span>
          </div>

          {cartLines.length === 0 ? (
            <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              Your order is empty. Add something from the menu to get started.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {cartLines.map(({ item, quantity }) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="text-gray-700">
                    {quantity} × {item.name}
                  </span>
                  <span className="shrink-0 font-medium">
                    EGP {(Number(item.price) * quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-gray-200 pt-3 font-bold text-gray-950">
                <span>Subtotal</span>
                <span>EGP {cartTotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500">
                Final total is calculated by the server. Delivery fees, if any,
                are not included in this subtotal.
              </p>
            </div>
          )}

          {authStatus === 'loading' ? (
            <p className="mt-5 text-sm text-gray-500">Checking sign-in…</p>
          ) : null}
          {authStatus === 'guest' ? (
            <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Sign in to place your order.</p>
              <p className="mt-1">
                Your cart is kept while you stay on this page.
              </p>
              <Link
                href={`/signin?next=${encodeURIComponent(`/restaurants/${restaurant.id}`)}`}
                className="mt-3 inline-block rounded-lg bg-orange-700 px-4 py-2 font-semibold text-white hover:bg-orange-800"
              >
                Sign in
              </Link>
            </div>
          ) : null}
          {authStatus === 'other' ? (
            <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Sign in with a customer account to place an order. You are
              currently signed in
              {user?.role ? ` as ${user.role.replaceAll('_', ' ')}` : ''}.
            </p>
          ) : null}

          {authStatus === 'customer' ? (
            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="delivery-address"
                  className="mb-1 block text-sm font-semibold text-gray-800"
                >
                  Delivery address
                </label>
                {addressesLoading ? (
                  <p className="text-sm text-gray-500">Loading addresses…</p>
                ) : (
                  <select
                    id="delivery-address"
                    value={selectedAddressIdForUse}
                    onChange={event => { setSelectedAddressId(event.target.value); setCartMessage(null); }}
                    className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm text-gray-950 focus:border-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-700/30"
                    style={{ color: "#000000", backgroundColor: "#ffffff" }}
                    disabled={addresses.length === 0}
                  >
                    <option value="">Select an address</option>
                    {addresses.map(address => (
                      <option key={address.id} value={address.id}>
                        {address.label ? `${address.label}: ` : ''}
                        {address.line1}, {address.city}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setShowNewAddress(!shouldShowNewAddress)}
                  className="mt-2 text-sm font-semibold text-orange-800 hover:underline"
                >
                  {shouldShowNewAddress
                    ? 'Cancel adding address'
                    : addresses.length
                      ? '+ Add a new address'
                      : '+ Add delivery address'}
                </button>
              </div>

              {shouldShowNewAddress ? (
                <form
                  onSubmit={handleCreateAddress}
                  className="space-y-3 rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <label
                      htmlFor="address-label"
                      className="mb-1 block text-xs font-medium text-gray-700"
                    >
                      Label
                    </label>
                    <input
                      id="address-label"
                      value={addressLabel}
                      onChange={event => setAddressLabel(event.target.value)}
                      className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-600 focus:border-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-700/30"
                      style={{ color: "#000000", backgroundColor: "#ffffff" }}
                      placeholder="Home, Work…"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="address-line"
                      className="mb-1 block text-xs font-medium text-gray-700"
                    >
                      Street address
                    </label>
                    <input
                      id="address-line"
                      required
                      value={addressLine1}
                      onChange={event => setAddressLine1(event.target.value)}
                      className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-600 focus:border-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-700/30"
                      style={{ color: "#000000", backgroundColor: "#ffffff" }}
                      placeholder="Building, street, area"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="address-city"
                      className="mb-1 block text-xs font-medium text-gray-700"
                    >
                      City
                    </label>
                    <input
                      id="address-city"
                      required
                      value={addressCity}
                      onChange={event => setAddressCity(event.target.value)}
                      className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-600 focus:border-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-700/30"
                      style={{ color: "#000000", backgroundColor: "#ffffff" }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-gray-500 bg-white px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-700/30"
                  >
                    Save address
                  </button>
                </form>
              ) : null}

              <div>
                <label
                  htmlFor="order-notes"
                  className="mb-1 block text-sm font-semibold text-gray-800"
                >
                  Order notes{' '}
                  <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  id="order-notes"
                  value={notes}
                  onChange={event => { setNotes(event.target.value); setCartMessage(null); }}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-600 focus:border-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-700/30"
                  style={{ color: "#000000", backgroundColor: "#ffffff" }}
                  placeholder="Delivery instructions or special requests"
                />
              </div>

              <Link
                href="/cart"
                className="block w-full rounded-xl bg-orange-700 px-4 py-3 text-center text-sm font-bold text-white hover:bg-orange-800"
              >
                {cartLines.length > 0
                  ? `Review cart & checkout · EGP ${cartTotal.toFixed(2)}`
                  : 'Open cart'}
              </Link>
              {!restaurant.is_open ? (
                <p className="text-sm text-gray-500">
                  This restaurant is closed, so ordering is temporarily
                  disabled.
                </p>
              ) : null}
            </div>
          ) : null}

          {cartMessage ? (
            <p
              className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800"
              role="status"
            >
              {cartMessage}
            </p>
          ) : null}
          {checkoutError ? (
            <div
              className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              {checkoutError}
            </div>
          ) : null}
        </aside>
      </div>

      <section
        className="mt-12 border-t border-gray-200 pt-8"
        aria-label="Customer reviews"
      >
        <PublicRestaurantReviews restaurantId={restaurant.id} />
      </section>
    </main>
  );
}
