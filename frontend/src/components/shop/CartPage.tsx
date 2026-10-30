"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ApiError,
  createAddress,
  createOrder,
  deleteOrder,
  getRestaurant,
  getAddresses,
  getAuthState,
  getMyOrders,
  getMyNutritionProfile,
  updateMyNutritionProfile,
  getMenu,
  payOrder,
  type Address,
  type Order,
  type NutritionProfile,
  type User,
} from "../../api/api";
import CartLine from "./CartLine";
import CartSummary from "./CartSummary";
import {
  PENDING_ORDER_STORAGE_KEY,
  readCart,
  type StoredCart,
  type StoredCartItem,
} from "../../lib/cartStorage";
import { useCartStore } from "../providers/CartStoreProvider";

type AuthStatus = "loading" | "guest" | "customer" | "other";
const PENDING_ORDER_CART_KEY = "food-marketplace:pending-order-cart:v1";

export default function CartPage() {
  const router = useRouter();
  // The shared cart is owned by Zustand. Its provider reads localStorage after
  // mount; avoid rendering cart-dependent UI until hydration finishes.
  const cart = useCartStore((state) => state.cart);
  const cartHydrated = useCartStore((state) => state.hydrated);
  const replaceCart = useCartStore((state) => state.replaceCart);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState<boolean | null>(null);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("Cairo");
  const [notes, setNotes] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [restoringOrderId, setRestoringOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      const pending = window.sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY);
      const pendingCartKey = window.sessionStorage.getItem(PENDING_ORDER_CART_KEY);
      const currentCart = readCart();
      if (pending && pendingCartKey && currentCart) {
        const signature = JSON.stringify({
          restaurantId: currentCart.restaurantId,
          items: currentCart.items.map(({ id, quantity }) => ({ id, quantity })),
        });
        if (signature === pendingCartKey) return pending;
      }
      window.sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
      window.sessionStorage.removeItem(PENDING_ORDER_CART_KEY);
    } catch {
      // Checkout can still create a fresh order if session storage is unavailable.
    }
    return null;
  });
  const [nutritionProfile, setNutritionProfile] = useState<NutritionProfile | null>(null);
  const [dailyCalorieGoalInput, setDailyCalorieGoalInput] = useState("2000");
  const [nutritionSaving, setNutritionSaving] = useState(false);
  const [nutritionMessage, setNutritionMessage] = useState<string | null>(null);
  const [nutritionError, setNutritionError] = useState<string | null>(null);


  useEffect(() => {
    let cancelled = false;

    async function loadCustomerData() {
      try {
        const auth = await getAuthState();
        if (cancelled) return;
        setUser(auth.user);
        if (auth.user.role !== "customer") {
          setAuthStatus("other");
          return;
        }
        const [addressResult, orderResult, profileResult] = await Promise.all([
          getAddresses().catch(() => [] as Address[]),
          getMyOrders({ page: 1, limit: 5 }).catch(() => ({ orders: [], pagination: { page: 1, limit: 5, total: 0, pages: 0 } })),
          getMyNutritionProfile().catch(() => null as NutritionProfile | null),
        ]);
        if (cancelled) return;
        setAddresses(addressResult);
        setOrders(orderResult.orders);
        setNutritionProfile(profileResult);
        setDailyCalorieGoalInput(String(profileResult?.daily_calorie_goal ?? 2000));
        setAuthStatus("customer");
      } catch (error) {
        if (cancelled) return;
        setUser(null);
        setAuthStatus(error instanceof ApiError && error.status === 401 ? "guest" : "guest");
      }
    }

    void loadCustomerData();
    return () => { cancelled = true; };
  }, []);


  // Derive the default selection from the loaded addresses instead of syncing
  // it into state from an effect. null means the customer has not chosen an ID.
  const defaultAddress =
    addresses.find((address) => address.is_default) ?? addresses[0] ?? null;

  const selectedAddressIdForUse =
    selectedAddressId === null
      ? defaultAddress?.id ?? ""
      : selectedAddressId !== "" &&
          !addresses.some((address) => address.id === selectedAddressId)
        ? defaultAddress?.id ?? ""
        : selectedAddressId;

  // null means use the automatic default: show the form when a loaded customer
  // has no saved addresses. A button click can explicitly show or hide it.
  const isAddressFormVisible =
    showAddressForm ??
    (authStatus === "customer" && addresses.length === 0);

  const itemCount = useMemo(
    () => (cart?.items ?? []).reduce((total, line) => total + line.quantity, 0),
    [cart],
  );
  const cartNutrition = useMemo(() => {
    return (cart?.items ?? []).reduce((totals, line) => {
      // Older local carts won't have nutrition fields until refreshed from a menu.
      const nutrition = line as StoredCartItem & {
        calories?: number;
        protein_g?: number | string;
        carbs_g?: number | string;
        fat_g?: number | string;
        fiber_g?: number | string;
      };
      const quantity = Number(line.quantity) || 0;
      totals.calories += (Number(nutrition.calories) || 0) * quantity;
      totals.protein_g += (Number(nutrition.protein_g) || 0) * quantity;
      totals.carbs_g += (Number(nutrition.carbs_g) || 0) * quantity;
      totals.fat_g += (Number(nutrition.fat_g) || 0) * quantity;
      totals.fiber_g += (Number(nutrition.fiber_g) || 0) * quantity;
      return totals;
    }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });
  }, [cart]);

  const cartSignature = useCallback((value: StoredCart) => JSON.stringify({
    restaurantId: value.restaurantId,
    items: value.items.map(({ id, quantity }) => ({ id, quantity })),
  }), []);

  function updateCart(nextCart: StoredCart | null) {
    // Zustand updates the shared in-memory cart and persists it through the
    // existing cartStorage.ts helpers inside CartStoreProvider.
    replaceCart(nextCart);
    setPendingOrderId(null);
    setCheckoutError(null);
    setPageMessage(null);
    try {
      window.sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
      window.sessionStorage.removeItem(PENDING_ORDER_CART_KEY);
    } catch {
      // Ignore storage restrictions.
    }
  }

  function changeQuantity(itemId: string, delta: number) {
    if (!cart) return;
    const nextItems = cart.items
      .map((line) => line.id === itemId ? { ...line, quantity: Math.max(0, Math.min(99, line.quantity + delta)) } : line)
      .filter((line) => line.quantity > 0);
    updateCart(nextItems.length ? { ...cart, items: nextItems } : null);
  }

  function removeItem(itemId: string) {
    if (!cart) return;
    const nextItems = cart.items.filter((line) => line.id !== itemId);
    updateCart(nextItems.length ? { ...cart, items: nextItems } : null);
  }

  async function handleCreateAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError(null);
    setPageMessage(null);
    if (!addressLine1.trim() || !addressCity.trim()) {
      setCheckoutError("Please enter your street address and city.");
      return;
    }
    try {
      const address = await createAddress({
        label: addressLabel.trim() || "Home",
        line1: addressLine1.trim(),
        city: addressCity.trim(),
        is_default: addresses.length === 0,
      });
      setAddresses((current) => current.some((item) => item.id === address.id) ? current : [...current, address]);
      setSelectedAddressId(address.id);
      setAddressLine1("");
      setShowAddressForm(false);
      setPageMessage("Address saved successfully.");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Could not save your address.");
    }
  }

  async function handleSaveNutritionGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNutritionError(null);
    setNutritionMessage(null);
    const goal = Number(dailyCalorieGoalInput);
    if (!Number.isInteger(goal) || goal < 500 || goal > 8000) {
      setNutritionError("Choose a daily calorie target from 500 to 8,000 kcal.");
      return;
    }
    setNutritionSaving(true);
    try {
      const profile = await updateMyNutritionProfile({ daily_calorie_goal: goal });
      setNutritionProfile(profile);
      setDailyCalorieGoalInput(String(profile.daily_calorie_goal));
      setNutritionMessage("Your nutrition goal was saved.");
    } catch (error) {
      setNutritionError(error instanceof Error ? error.message : "Could not save your nutrition goal.");
    } finally {
      setNutritionSaving(false);
    }
  }

  async function handleCheckout() {
    if (authStatus !== "customer") {
      router.push(`/signin?next=${encodeURIComponent("/cart")}`);
      return;
    }
    if (!cart || cart.items.length === 0) {
      setCheckoutError("Add at least one item to your cart before checkout.");
      return;
    }
    if (!cart.restaurantIsOpen) {
      setCheckoutError("This restaurant is currently closed and cannot accept orders.");
      return;
    }
    if (!selectedAddressIdForUse) {
      setCheckoutError("Choose or add a delivery address before checkout.");
      setShowAddressForm(true);
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);
    setPageMessage(null);
    try {
      let orderId = pendingOrderId;
      if (!orderId) {
        const order = await createOrder({
          restaurant_id: cart.restaurantId,
          address_id: selectedAddressIdForUse,
          notes: notes.trim() || undefined,
          items: cart.items.map((line) => ({ menu_item_id: line.id, quantity: line.quantity })),
        });
        orderId = order.id;
        setPendingOrderId(orderId);
        try {
          window.sessionStorage.setItem(PENDING_ORDER_STORAGE_KEY, orderId);
          window.sessionStorage.setItem(PENDING_ORDER_CART_KEY, cartSignature(cart));
        } catch {
          // If storage is blocked, this tab can still continue to payment now.
        }
        setOrders((current) => [order, ...current].slice(0, 5));
        setPageMessage(`Order ${order.id} created. Opening Paymob checkout…`);
      }

      const checkout = await payOrder(orderId);

      // Persist the local NutriMeals order ID and the exact cart snapshot before
      // leaving the site. The payment-result page uses these keys to decide
      // whether it is safe to clear this cart after the backend confirms payment.
      try {
        window.sessionStorage.setItem(PENDING_ORDER_STORAGE_KEY, orderId);
        window.sessionStorage.setItem(PENDING_ORDER_CART_KEY, cartSignature(cart));
      } catch {
        // Payment can continue if session storage is unavailable.
      }

      // Do not clear the cart here. Paymob's browser redirect is not proof of
      // payment; only the backend-confirmed paid status should clear the cart.
      window.location.assign(checkout.iframeUrl);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? `${error.message} If the order was already created, retry checkout before submitting another order.`
          : "Checkout could not be started. Please try again.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  function canManageOrder(order: Order) {
    // Never move/delete a paid order, a restaurant-confirmed order, or a payment
    // that may still complete asynchronously through Paymob.
    return (
      order.status === "placed" &&
      order.payment_status !== "paid" &&
      !(order.payment_status === "pending" && Boolean(order.paymob_order_id))
    );
  }

  async function handleAddOrderToCart(order: Order) {
    setCheckoutError(null);
    setPageMessage(null);

    if (!canManageOrder(order)) {
      setCheckoutError("This order cannot be moved to the cart. Check its order and payment status.");
      return;
    }
    if (!order.items?.length) {
      setCheckoutError("This order has no items to add to the cart.");
      return;
    }
    if (cart?.items.length && cart.restaurantId !== order.restaurant_id) {
      setCheckoutError(
        `Your cart already contains items from ${cart.restaurantName}. Clear or check out that cart before adding an order from another restaurant.`,
      );
      return;
    }

    setRestoringOrderId(order.id);
    try {
      // Validate and prepare the new cart before deleting the saved order.
      const [menuResponse, restaurant] = await Promise.all([
        getMenu(order.restaurant_id),
        getRestaurant(order.restaurant_id),
      ]);
      const menuById = new Map(menuResponse.items.map((item) => [item.id, item]));
      const existingLines = new Map((cart?.items ?? []).map((line) => [line.id, line]));
      const quantities = new Map<string, number>();

      for (const line of cart?.items ?? []) {
        quantities.set(line.id, line.quantity);
      }

      const orderItemIds = new Set<string>();
      for (const orderItem of order.items) {
        const menuItem = menuById.get(orderItem.menu_item_id);
        if (!menuItem || !menuItem.is_available) {
          throw new Error(
            `${orderItem.menu_item?.name ?? "An item"} is no longer available. The saved order was not deleted.`,
          );
        }

        orderItemIds.add(menuItem.id);
        const nextQuantity = (quantities.get(menuItem.id) ?? 0) + orderItem.quantity;
        if (nextQuantity > 99) {
          throw new Error(`${menuItem.name} would exceed the maximum cart quantity of 99. The order was not deleted.`);
        }
        quantities.set(menuItem.id, nextQuantity);
      }

      const storedItems = [...quantities.entries()].map(([itemId, quantity]) => {
        const menuItem = menuById.get(itemId);
        if (menuItem?.is_available) {
          return {
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
            quantity,
          };
        }

        // Preserve an existing cart line if the restaurant removed it from the
        // current menu; order items themselves must always be currently available.
        const oldLine = existingLines.get(itemId);
        if (oldLine && !orderItemIds.has(itemId)) return { ...oldLine, quantity };
        throw new Error("A cart item could not be restored. The saved order was not deleted.");
      });

      const restoredCart: StoredCart = {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantIsOpen: restaurant.is_open,
        items: storedItems,
        updatedAt: new Date().toISOString(),
      };

      const confirmed = window.confirm(
        `Add order #${order.id.slice(0, 8)} to your cart? This will delete the saved unpaid order and move its items into your cart. Current menu prices will be used.`,
      );
      if (!confirmed) return;

      // Delete the database order only after all menu and cart validations pass.
      await deleteOrder(order.id);
      setOrders((current) => current.filter((currentOrder) => currentOrder.id !== order.id));
      updateCart(restoredCart);
      setPageMessage(`Order #${order.id.slice(0, 8)} was added to your cart. Prices use the current menu.`);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Could not add this order to the cart.",
      );
    } finally {
      setRestoringOrderId(null);
    }
  }

  async function handleDeleteOrder(order: Order) {
    setCheckoutError(null);
    setPageMessage(null);

    if (!canManageOrder(order)) {
      setCheckoutError("This order cannot be deleted. Paid or active payment orders must remain in your order history.");
      return;
    }

    const confirmed = window.confirm(
      `Delete order #${order.id.slice(0, 8)}? This permanently removes the saved unpaid order. Its items will not be added to your cart.`,
    );
    if (!confirmed) return;

    setDeletingOrderId(order.id);
    try {
      await deleteOrder(order.id);
      setOrders((current) => current.filter((currentOrder) => currentOrder.id !== order.id));
      setPageMessage(`Order #${order.id.slice(0, 8)} was deleted.`);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Could not delete this order.",
      );
    } finally {
      setDeletingOrderId(null);
    }
  }

  if (!cartHydrated || authStatus === "loading") {
    return <main className="mx-auto max-w-7xl px-4 py-12"><p className="animate-pulse text-gray-600">Loading your cart…</p></main>;
  }

  return (
    <main className="min-h-screen bg-[#FFF5DF] px-4 py-10 text-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-800">NutriMeals · healthy meal delivery</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Your cart</h1>
            <p className="mt-2 text-gray-700">Review your meals, nutrition totals, and delivery details.</p>
          </div>
          <Link href={cart ? `/restaurants/${cart.restaurantId}` : "/"} className="text-sm font-semibold text-orange-800 underline-offset-4 hover:underline">
            ← {cart ? "Back to menu" : "Explore restaurants"}
          </Link>
        </div>

        {authStatus === "guest" || authStatus === "other" ? (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            {authStatus === "guest" ? "Sign in with a customer account to order meals and save nutrition goals." : `You are signed in${user?.role ? ` as ${user.role.replaceAll("_", " ")}` : ""}. A customer account is required to checkout and save nutrition goals.`}
            <Link href={`/signin?next=${encodeURIComponent("/cart")}`} className="ml-2 font-semibold underline">Sign in</Link>
          </div>
        ) : null}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-8">
            <section aria-labelledby="cart-items-heading">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="cart-items-heading" className="text-2xl font-bold">Order items</h2>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-orange-800">{itemCount} item{itemCount === 1 ? "" : "s"}</span>
              </div>
              {!cart || cart.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-400 bg-white/70 p-8 text-center">
                  <p className="text-lg font-semibold">Your cart is empty.</p>
                  <p className="mt-2 text-sm text-gray-600">Open a restaurant menu and add dishes to get started.</p>
                  <Link href="/" className="mt-4 inline-flex rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800">Browse restaurants</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold">{cart.restaurantName}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cart.restaurantIsOpen ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                        {cart.restaurantIsOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">A single order can contain items from one restaurant.</p>
                  </div>
                  {cart.items.map((line) => (
                    <CartLine key={line.id} line={line} onQuantityChange={changeQuantity} onRemove={removeItem} />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="delivery-heading">
              <h2 id="delivery-heading" className="text-xl font-bold">Delivery details</h2>
              <div className="mt-4">
                <label htmlFor="delivery-address" className="mb-1 block text-sm font-semibold text-gray-800">Saved address</label>
                <select id="delivery-address" value={selectedAddressIdForUse} onChange={(event) => setSelectedAddressId(event.target.value)} disabled={addresses.length === 0} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm text-gray-950 disabled:bg-gray-100">
                  <option value="">Select an address</option>
                  {addresses.map((address) => <option key={address.id} value={address.id}>{address.label ? `${address.label}: ` : ""}{address.line1}, {address.city}</option>)}
                </select>
                <button type="button" onClick={() => setShowAddressForm(!isAddressFormVisible)} className="mt-2 text-sm font-semibold text-orange-800 underline-offset-4 hover:underline">{isAddressFormVisible ? "Cancel adding address" : addresses.length ? "+ Add another address" : "+ Add delivery address"}</button>
              </div>
              {isAddressFormVisible ? (
                <form onSubmit={handleCreateAddress} className="mt-4 space-y-3 rounded-xl border border-gray-200 p-4">
                  <div>
                    <label htmlFor="address-label" className="mb-1 block text-sm font-medium text-gray-700">Label</label>
                    <input id="address-label" value={addressLabel} onChange={(event) => setAddressLabel(event.target.value)} placeholder="Home, Work…" className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-600" />
                  </div>
                  <div>
                    <label htmlFor="address-line1" className="mb-1 block text-sm font-medium text-gray-700">Street address</label>
                    <input id="address-line1" required value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} placeholder="Building, street, area" className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-600" />
                  </div>
                  <div>
                    <label htmlFor="address-city" className="mb-1 block text-sm font-medium text-gray-700">City</label>
                    <input id="address-city" required value={addressCity} onChange={(event) => setAddressCity(event.target.value)} className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm text-black" />
                  </div>
                  <button type="submit" className="rounded-lg border border-gray-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-gray-100">Save address</button>
                </form>
              ) : null}
              <div className="mt-4">
                <label htmlFor="order-notes" className="mb-1 block text-sm font-semibold text-gray-800">Order notes <span className="font-normal text-gray-500">(optional)</span></label>
                <textarea id="order-notes" rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Delivery instructions or special requests" className="w-full rounded-lg border border-gray-500 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-600" />
              </div>
              {pageMessage ? <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{pageMessage}</p> : null}
              {checkoutError ? <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{checkoutError}</p> : null}
            </section>

            <section className="rounded-2xl border border-emerald-200 bg-white p-5" aria-labelledby="nutrition-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Nutrition snapshot</p>
                  <h2 id="nutrition-heading" className="mt-1 text-xl font-bold">Your meal plan</h2>
                  <p className="mt-1 text-sm text-gray-600">These are nutrition totals for the meals in your cart, not a record of food consumed.</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{cartNutrition.calories.toLocaleString()} kcal</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-800">Protein</p><p className="mt-1 text-lg font-bold text-emerald-950">{cartNutrition.protein_g.toFixed(1)} g</p></div>
                <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-800">Carbs</p><p className="mt-1 text-lg font-bold text-amber-950">{cartNutrition.carbs_g.toFixed(1)} g</p></div>
                <div className="rounded-xl bg-sky-50 p-3"><p className="text-xs text-sky-800">Fat</p><p className="mt-1 text-lg font-bold text-sky-950">{cartNutrition.fat_g.toFixed(1)} g</p></div>
                <div className="rounded-xl bg-violet-50 p-3"><p className="text-xs text-violet-800">Fiber</p><p className="mt-1 text-lg font-bold text-violet-950">{cartNutrition.fiber_g.toFixed(1)} g</p></div>
              </div>
              {cartNutrition.calories === 0 && cart?.items.length ? <p className="mt-3 text-xs text-amber-800">Nutrition values are not available for these saved cart items yet. Open the menu again after the meal catalogue has nutrition data.</p> : null}
              <form onSubmit={handleSaveNutritionGoal} className="mt-5 border-t border-gray-100 pt-4">
                <label htmlFor="daily-calorie-goal" className="block text-sm font-semibold text-gray-800">Your daily calorie target (kcal)</label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input id="daily-calorie-goal" type="number" min={500} max={8000} step={1} required value={dailyCalorieGoalInput} onChange={(event) => setDailyCalorieGoalInput(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-950 sm:max-w-[220px]" />
                  <button type="submit" disabled={nutritionSaving || authStatus !== "customer"} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{nutritionSaving ? "Saving…" : "Save target"}</button>
                </div>
                <p className="mt-2 text-xs text-gray-500">This target is user-entered for tracking and is not medical or dietary advice.</p>
                {nutritionMessage ? <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{nutritionMessage}</p> : null}
                {nutritionError ? <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{nutritionError}</p> : null}
              </form>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5" aria-labelledby="orders-heading">
              <h2 id="orders-heading" className="text-xl font-bold">Recent orders</h2>
              <p className="mt-2 text-xs leading-5 text-gray-600">
                Add an unpaid order back to your cart one at a time, or delete it. To pay, use Checkout with Paymob in the checkout summary.
              </p>
              {orders.length === 0 ? (
                <p className="mt-2 text-sm text-gray-600">Your recent orders will appear here after checkout.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {orders.map((order) => {
                    return (
                      <article key={order.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">Order #{order.id.slice(0, 8)}</p>
                            <p className="mt-1 text-sm text-gray-600">{order.restaurant?.name ?? "Restaurant"} · {new Date(order.created_at).toLocaleString()}</p>
                            {order.items?.length ? (
                              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                                {order.items.map((item) => (
                                  <li key={item.id}>{item.quantity} × {item.menu_item?.name ?? "Menu item"}</li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                          <div className="flex min-w-[180px] flex-col items-start gap-2 sm:items-end">
                            <p className="font-semibold">EGP {Number(order.total).toFixed(2)}</p>
                            <p className="text-xs capitalize text-gray-600">{order.status.replaceAll("_", " ")} · payment {order.payment_status}</p>
                            {canManageOrder(order) && order.items?.length ? (
                              <button
                                type="button"
                                onClick={() => void handleAddOrderToCart(order)}
                                disabled={restoringOrderId !== null || deletingOrderId !== null || checkoutLoading}
                                className="rounded-lg border border-orange-700 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {restoringOrderId === order.id ? "Adding to cart…" : "Add to cart"}
                              </button>
                            ) : null}
                            {canManageOrder(order) ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteOrder(order)}
                                disabled={restoringOrderId !== null || deletingOrderId !== null || checkoutLoading}
                                className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingOrderId === order.id ? "Deleting…" : "Delete order"}
                              </button>
                            ) : order.status === "placed" && order.payment_status === "pending" && order.paymob_order_id ? (
                              <p className="max-w-[220px] text-xs text-amber-700">Payment is pending in Paymob; wait for its final status before moving or deleting this order.</p>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-4 lg:sticky lg:top-6">
            <CartSummary
              items={cart?.items ?? []}
              restaurantName={cart?.restaurantName ?? ""}
              selectedAddress={addresses.find((address) => address.id === selectedAddressIdForUse) ?? null}
              orderNotes={notes}
              dailyCalorieGoal={nutritionProfile?.daily_calorie_goal ?? 2000}
              itemCount={itemCount}
              loading={checkoutLoading}
              disabled={!cart || cart.items.length === 0 || !cart.restaurantIsOpen || (authStatus === "customer" && (addresses.length === 0 || !selectedAddressIdForUse))}
              onCheckout={handleCheckout}
            />
            {cart && !cart.restaurantIsOpen ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This restaurant is closed, so checkout is unavailable.</p> : null}
            {authStatus === "customer" && addresses.length === 0 ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Add a delivery address before checking out.</p> : null}
            {pendingOrderId ? <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Order {pendingOrderId} was created. Use Checkout with Paymob to retry payment without creating a duplicate order.</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
