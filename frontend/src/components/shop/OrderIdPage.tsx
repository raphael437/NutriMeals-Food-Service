"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  MapPin,
  Package,
  ShieldCheck,
  Store,
  Truck,
  Utensils,
} from "lucide-react";

import {
  getAuthState,
  getOrder,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "../../api/api";

const ORDER_STEPS: Array<{
  status: OrderStatus;
  title: string;
  description: string;
}> = [
  {
    status: "placed",
    title: "Order placed",
    description: "Your order has been created.",
  },
  {
    status: "confirmed",
    title: "Order confirmed",
    description: "The restaurant has confirmed your order.",
  },
  {
    status: "preparing",
    title: "Preparing your meals",
    description: "Your meals are being prepared.",
  },
  {
    status: "out_for_delivery",
    title: "Out for delivery",
    description: "Your order is on its way.",
  },
  {
    status: "delivered",
    title: "Delivered",
    description: "Your order has been delivered.",
  },
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  placed: "bg-amber-50 text-amber-800 ring-amber-200",
  confirmed: "bg-blue-50 text-blue-800 ring-blue-200",
  preparing: "bg-violet-50 text-violet-800 ring-violet-200",
  out_for_delivery: "bg-orange-50 text-orange-800 ring-orange-200",
  delivered: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-red-50 text-red-800 ring-red-200",
};

function formatMoney(value: number | string) {
  const amount = Number(value);

  return `EGP ${
    Number.isFinite(amount)
      ? amount.toLocaleString("en-EG", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00"
  }`;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGrams(value: number) {
  return `${Number(value.toFixed(1))} g`;
}

function getCalories(item: OrderItem) {
  return Number(
    item.calories_at_order ?? item.menu_item?.calories ?? 0
  );
}

function getProtein(item: OrderItem) {
  return Number(
    item.protein_g_at_order ?? item.menu_item?.protein_g ?? 0
  );
}

function getCarbs(item: OrderItem) {
  return Number(
    item.carbs_g_at_order ?? item.menu_item?.carbs_g ?? 0
  );
}

function getFat(item: OrderItem) {
  return Number(
    item.fat_g_at_order ?? item.menu_item?.fat_g ?? 0
  );
}

function getFiber(item: OrderItem) {
  return Number(item.fiber_g_at_order ?? item.menu_item?.fiber_g ?? 0);
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 py-12 text-[#183b2b] sm:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-2xl border border-[#e2e9df] bg-white p-6">
        <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
        <p className="text-sm text-[#617267]">Loading order details...</p>
      </div>
    </main>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 py-12 text-[#183b2b] sm:px-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-[#e2e9df] bg-white p-8 sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
          <Package className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold">
          Unable to load this order
        </h1>

        <p className="mt-3 break-words leading-7 text-[#617267]">
          {message}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
          >
            Try again
          </button>

          <Link
            href="/orders"
            className="rounded-xl border border-[#dce5da] px-5 py-3 text-sm font-semibold transition hover:bg-[#f7f8f4]"
          >
            Back to orders
          </Link>
        </div>
      </div>
    </main>
  );
}

function InformationCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e2e9df] bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-[#e9eee7] pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
          {icon}
        </div>

        <h2 className="font-semibold">{title}</h2>
      </div>

      <div className="pt-5">{children}</div>
    </section>
  );
}

export default function OrderDetailsPage() {
  const params = useParams<{ orderid: string }>();
  const orderId = params?.orderid;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      if (!orderId) {
        setError("No order ID was provided in the URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const auth = await getAuthState();

        if (cancelled) return;

        if (auth.user.role !== "customer") {
          setOrder(null);
          setError("Sign in with a customer account to view your orders.");
          return;
        }

        const result = await getOrder(orderId);

        if (cancelled) return;

        setOrder(result);
      } catch (err) {
        if (cancelled) return;

        setOrder(null);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load this order. Check your connection and try again."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId, retryKey]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !order) {
    return (
      <ErrorState
        message={error || "This order could not be found."}
        onRetry={() => {
          setLoading(true);
          setRetryKey((current) => current + 1);
        }}
      />
    );
  }

  const items = order.items ?? [];

  const totalItems = items.reduce(
    (total: number, item: OrderItem) => total + item.quantity,
    0
  );

  const totalCalories = items.reduce(
    (total: number, item: OrderItem) =>
      total + getCalories(item) * item.quantity,
    0
  );

  const totalProtein = items.reduce(
    (total: number, item: OrderItem) =>
      total + getProtein(item) * item.quantity,
    0
  );

  const totalCarbs = items.reduce(
    (total: number, item: OrderItem) =>
      total + getCarbs(item) * item.quantity,
    0
  );

  const totalFat = items.reduce(
    (total: number, item: OrderItem) =>
      total + getFat(item) * item.quantity,
    0
  );

  const totalFiber = items.reduce(
    (total: number, item: OrderItem) =>
      total + getFiber(item) * item.quantity,
    0
  );

  const currentStep = ORDER_STEPS.findIndex(
    (step) => step.status === order.status
  );

  const isCancelled = order.status === "cancelled";

  const hasNutrition = items.some(
    (item) =>
      item.calories_at_order != null ||
      item.protein_g_at_order != null ||
      item.carbs_g_at_order != null ||
      item.fat_g_at_order != null ||
      item.fiber_g_at_order != null ||
      item.menu_item?.calories != null ||
      item.menu_item?.protein_g != null ||
      item.menu_item?.carbs_g != null ||
      item.menu_item?.fat_g != null ||
      item.menu_item?.fiber_g != null
  );

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#183b2b]">
      {/* Header */}
      <section className="border-b border-[#e2e9df] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#617267] transition hover:text-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all orders
          </Link>

          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Package className="h-4 w-4" />
                Order details
              </div>

              <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                Order #{order.id.slice(0, 8)}
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#617267]">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold capitalize ring-1 ring-inset ${
                  STATUS_STYLES[order.status]
                }`}
              >
                {formatStatus(order.status)}
              </span>

              <span
                className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                  order.payment_status === "paid"
                    ? "bg-emerald-50 text-emerald-800"
                    : order.payment_status === "failed"
                      ? "bg-red-50 text-red-800"
                      : "bg-amber-50 text-amber-800"
                }`}
              >
                {order.payment_status === "paid"
                  ? "Paid"
                  : `Payment ${order.payment_status}`}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:px-12 lg:py-10">
        <div className="min-w-0 space-y-8">
          {/* Delivery progress */}
          <section className="rounded-3xl border border-[#e2e9df] bg-white p-5 sm:p-8">
            <div>
              <h2 className="text-xl font-semibold">Order progress</h2>

              <p className="mt-2 text-sm leading-6 text-[#617267]">
                Follow your order from placement to delivery.
              </p>
            </div>

            {isCancelled ? (
              <div
                role="status"
                className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5"
              >
                <p className="font-semibold text-red-900">Order cancelled</p>

                <p className="mt-2 text-sm leading-6 text-red-800">
                  This order has been cancelled. For questions about payment
                  or refunds, contact NutriMeals support.
                </p>

                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-900 underline underline-offset-4"
                >
                  Contact support
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <ol className="mt-7 space-y-6">
                {ORDER_STEPS.map((step, index) => {
                  const completed = index <= currentStep;
                  const current = index === currentStep;

                  return (
                    <li key={step.status} className="relative flex gap-4">
                      {index < ORDER_STEPS.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={`absolute left-5 top-11 h-[calc(100%+0.5rem)] w-0.5 ${
                            index < currentStep
                              ? "bg-emerald-600"
                              : "bg-[#e2e9df]"
                          }`}
                        />
                      )}

                      <span
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          completed
                            ? "bg-emerald-700 text-white"
                            : "bg-[#f0f3ed] text-[#809087]"
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Clock3 className="h-5 w-5" />
                        )}
                      </span>

                      <div className="min-w-0 pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`font-semibold ${
                              completed
                                ? "text-[#183b2b]"
                                : "text-[#809087]"
                            }`}
                          >
                            {step.title}
                          </h3>

                          {current && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                              Current status
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm leading-6 text-[#617267]">
                          {step.description}
                        </p>

                        {step.status === "out_for_delivery" &&
                          order.out_for_delivery_at && (
                            <p className="mt-2 text-xs text-[#809087]">
                              Updated: {formatDate(order.out_for_delivery_at)}
                            </p>
                          )}

                        {step.status === "delivered" &&
                          order.delivered_at && (
                            <p className="mt-2 text-xs text-[#809087]">
                              Delivered: {formatDate(order.delivered_at)}
                            </p>
                          )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* Ordered meals */}
          <InformationCard
            title={`Your meals (${totalItems} item${totalItems === 1 ? "" : "s"})`}
            icon={<Utensils className="h-5 w-5" />}
          >
            {items.length === 0 ? (
              <p className="text-sm leading-6 text-[#617267]">
                Item details are not available for this order.
              </p>
            ) : (
              <div className="divide-y divide-[#e9eee7]">
                {items.map((item: OrderItem) => {
                  const unitPrice = Number(item.price_at_order);
                  const calories = getCalories(item);

                  return (
                    <article
                      key={item.id}
                      className="flex gap-4 py-5 first:pt-0 last:pb-0"
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eef3e9] text-emerald-800">
                        {item.menu_item?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.menu_item.image_url}
                            alt={item.menu_item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Utensils className="h-7 w-7" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold">
                          {item.menu_item?.name ?? "Meal"}
                        </h3>

                        <p className="mt-1 text-sm text-[#617267]">
                          Quantity: {item.quantity}
                        </p>

                        {calories > 0 && (
                          <p className="mt-2 text-xs font-medium text-emerald-800">
                            {Math.round(calories)} kcal per serving
                          </p>
                        )}

                        <p className="mt-2 text-xs leading-5 text-[#809087]">
                          Price at order: {formatMoney(item.price_at_order)}{" "}
                          each
                        </p>
                      </div>

                      <p className="shrink-0 text-right font-semibold">
                        {formatMoney(unitPrice * item.quantity)}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </InformationCard>

          {/* Nutrition summary */}
          <InformationCard
            title="Nutrition summary"
            icon={<ShieldCheck className="h-5 w-5" />}
          >
            {!hasNutrition ? (
              <p className="text-sm leading-6 text-[#617267]">
                Nutrition information is unavailable for these order items.
                When recorded meal nutrition is available, this section will
                summarize the quantities ordered.
              </p>
            ) : (
              <>
                <p className="mb-5 text-sm leading-6 text-[#617267]">
                  Estimated nutrition for all the meals in this order,
                  calculated using recorded per-serving values and ordered
                  quantities.
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <NutritionTile
                    label="Calories"
                    value={`${Math.round(totalCalories).toLocaleString()} kcal`}
                  />

                  <NutritionTile
                    label="Protein"
                    value={formatGrams(totalProtein)}
                  />

                  <NutritionTile
                    label="Carbohydrates"
                    value={formatGrams(totalCarbs)}
                  />

                  <NutritionTile
                    label="Fat"
                    value={formatGrams(totalFat)}
                  />

                  <NutritionTile
                    label="Fiber"
                    value={formatGrams(totalFiber)}
                  />
                </div>

                <p className="mt-4 text-xs leading-5 text-[#809087]">
                  Nutrition is an estimate based on information saved with
                  the order or currently available for the meal. Values
                  may be incomplete if some nutrition fields have not been
                  provided.
                </p>
              </>
            )}
          </InformationCard>

          {/* Notes */}
          {order.notes && (
            <InformationCard
              title="Order notes"
              icon={<Package className="h-5 w-5" />}
            >
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#617267]">
                {order.notes}
              </p>
            </InformationCard>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {/* Total */}
          <section className="rounded-3xl bg-[#173d2b] p-6 text-white sm:p-7">
            <p className="text-sm font-medium text-emerald-100">
              Order total
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {formatMoney(order.total)}
            </p>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/15 pt-5 text-sm">
              <span className="text-emerald-100/80">Payment status</span>

              <span className="font-semibold capitalize">
                {order.payment_status}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <span className="text-emerald-100/80">Order status</span>

              <span className="font-semibold capitalize">
                {formatStatus(order.status)}
              </span>
            </div>
          </section>

          {/* Restaurant */}
          <InformationCard
            title="Restaurant"
            icon={<Store className="h-5 w-5" />}
          >
            <h3 className="font-semibold">
              {order.restaurant?.name ?? "Restaurant"}
            </h3>

            {order.restaurant?.address && (
              <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#617267]">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-emerald-800" />
                {order.restaurant.address}
              </p>
            )}

            {order.restaurant?.phone && (
              <p className="mt-3 text-sm text-[#617267]">
                Contact: {order.restaurant.phone}
              </p>
            )}

            <Link
              href="/restaurants"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
            >
              Browse restaurants
              <ArrowRight className="h-4 w-4" />
            </Link>
          </InformationCard>

          {/* Delivery address */}
          <InformationCard
            title="Delivery address"
            icon={<Truck className="h-5 w-5" />}
          >
            {order.address ? (
              <>
                <p className="font-semibold">
                  {order.address.label || "Delivery address"}
                </p>

                <p className="mt-2 text-sm leading-6 text-[#617267]">
                  {order.address.line1}
                  <br />
                  {order.address.city}
                </p>
              </>
            ) : (
              <p className="text-sm leading-6 text-[#617267]">
                No delivery address was returned with this order.
              </p>
            )}

            {order.estimated_delivery_at &&
              order.status !== "delivered" &&
              order.status !== "cancelled" && (
                <div className="mt-5 rounded-xl bg-[#f7f8f4] p-4">
                  <p className="text-xs font-medium text-[#617267]">
                    Estimated delivery
                  </p>

                  <p className="mt-2 text-sm font-semibold">
                    {formatDate(order.estimated_delivery_at)}
                  </p>
                </div>
              )}
          </InformationCard>

          {/* Payment */}
          <InformationCard
            title="Payment information"
            icon={<CreditCard className="h-5 w-5" />}
          >
            <div className="flex items-start gap-3">
              {order.payment_status === "paid" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              ) : (
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              )}

              <div>
                <p className="font-semibold capitalize">
                  {order.payment_status}
                </p>

                <p className="mt-2 text-sm leading-6 text-[#617267]">
                  {order.payment_status === "paid"
                    ? "Payment has been marked as paid."
                    : order.payment_status === "failed"
                      ? "Payment has failed. Please check your order history or contact support."
                      : "Payment has not yet been marked as complete."}
                </p>
              </div>
            </div>

            {order.payment_status !== "paid" && (
              <Link
                href="/contact"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
              >
                Need payment help?
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </InformationCard>

          <Link
            href="/orders"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#dce5da] bg-white px-5 py-3.5 text-sm font-semibold transition hover:bg-[#eef3e9]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to order history
          </Link>
        </aside>
      </div>
    </main>
  );
}

function NutritionTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#e2e9df] bg-[#fbfcfa] p-4">
      <p className="text-xs font-medium text-[#617267]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#183b2b]">{value}</p>
    </div>
  );
}