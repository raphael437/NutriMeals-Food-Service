"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  Utensils,
} from "lucide-react";

import {
  deleteOrder,
  type Order,
  type OrderStatus,
  type Pagination,
} from "../../api/api";
import { queryKeys, useAuthState, useMyOrders } from "../../hooks/use-api-queries";

type AuthPhase = "loading" | "customer" | "unauthorized";

type OrderFilter = "all" | OrderStatus;

const FILTERS: Array<{ label: string; value: OrderFilter }> = [
  { label: "All orders", value: "all" },
  { label: "Placed", value: "placed" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Preparing", value: "preparing" },
  { label: "Out for delivery", value: "out_for_delivery" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  placed: "bg-amber-50 text-amber-800 ring-amber-200",
  confirmed: "bg-blue-50 text-blue-800 ring-blue-200",
  preparing: "bg-violet-50 text-violet-800 ring-violet-200",
  out_for_delivery: "bg-orange-50 text-orange-800 ring-orange-200",
  delivered: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-red-50 text-red-800 ring-red-200",
};

const INITIAL_PAGINATION: Pagination = {
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function canDeleteOrder(order: Order) {
  return (
    order.status === "placed" &&
    order.payment_status !== "paid" &&
    !(
      order.payment_status === "pending" &&
      Boolean(order.paymob_order_id)
    )
  );
}

function getPaymentStyle(status: Order["payment_status"]) {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-800";

    case "failed":
      return "bg-red-50 text-red-800";

    default:
      return "bg-amber-50 text-amber-800";
  }
}

function LoadingState() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e2e9df] bg-white p-6 text-sm text-[#617267]">
      <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
      Loading your orders...
    </div>
  );
}

function EmptyState({
  title,
  description,
  showBrowseButton = true,
}: {
  title: string;
  description: string;
  showBrowseButton?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-dashed border-[#d5e0d2] bg-white px-6 py-14 text-center sm:px-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
        <ShoppingBag className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-xl font-semibold text-[#183b2b]">{title}</h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#617267]">
        {description}
      </p>

      {showBrowseButton && (
        <Link
          href="/restaurants"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
        >
          Explore restaurants
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e2e9df] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#617267]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#183b2b]">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#809087]">{description}</p>
    </article>
  );
}

export default function OrdersPage() {
  const authQuery = useAuthState();
  const authState = authQuery.data;
  const authPhase: AuthPhase = authQuery.isPending
    ? "loading"
    : authState?.user.role === "customer"
      ? "customer"
      : "unauthorized";
  const customerName = authState?.user.name ?? "";
  const authError = authQuery.error instanceof Error
    ? authQuery.error.message
    : authState && authState.user.role !== "customer"
      ? "Order history is available only to customer accounts."
      : "Please sign in to view your orders.";

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<OrderFilter>("all");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const queryClient = useQueryClient();
  const ordersQuery = useMyOrders({ page, limit: 10 }, { enabled: authPhase === "customer" });
  const orders = ordersQuery.data?.orders ?? [];
  const pagination = ordersQuery.data?.pagination ?? INITIAL_PAGINATION;
  const loading = authPhase === "customer" && ordersQuery.isFetching;
  const displayedError = error || (
    ordersQuery.error instanceof Error ? ordersQuery.error.message : ""
  );

  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(
    null
  );

  const completedOrders = orders.filter(
    (order) => order.status === "delivered"
  ).length;

  const totalOfLoadedOrders = orders.reduce(
    (total, order) => total + Number(order.total || 0),
    0
  );

  // Filters apply to the orders currently displayed on this page.
  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  function changePage(nextPage: number) {
    if (
      nextPage < 1 ||
      nextPage > pagination.pages ||
      nextPage === page
    ) {
      return;
    }

    setError("");
    setMessage("");
    setPage(nextPage);
  }

  function refreshOrders() {
    setError("");
    setMessage("");
    void ordersQuery.refetch();
  }

  async function handleDeleteOrder(order: Order) {
    if (!canDeleteOrder(order)) {
      setError(
        "This order cannot be deleted. Paid orders, active payments, and orders already being processed must remain in your order history."
      );
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete unpaid order #${order.id.slice(0, 8)}?`
    );

    if (!confirmed) return;

    setDeletingOrderId(order.id);
    setError("");
    setMessage("");

    try {
      await deleteOrder(order.id);

      setMessage(
        `Order #${order.id.slice(0, 8)} was deleted successfully.`
      );

      // Refresh the cached server state so the page and pagination stay accurate.
      if (orders.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await queryClient.invalidateQueries({ queryKey: queryKeys.myOrdersPrefix });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete this order. Please try again."
      );
    } finally {
      setDeletingOrderId(null);
    }
  }

  if (authPhase === "loading") {
    return (
      <main className="min-h-screen bg-[#f7f8f4] px-5 py-10 text-[#183b2b] sm:px-8">
        <div className="mx-auto max-w-7xl">
          <LoadingState />
        </div>
      </main>
    );
  }

  if (authPhase === "unauthorized") {
    return (
      <main className="min-h-screen bg-[#f7f8f4] px-5 py-12 text-[#183b2b]">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#e2e9df] bg-white p-8 sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
            <ShoppingBag className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold">
            Your orders are waiting here
          </h1>

          <p className="mt-3 leading-7 text-[#617267]">{authError}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Sign in
            </Link>

            <Link
              href="/restaurants"
              className="rounded-xl border border-[#dce5da] px-5 py-3 text-sm font-semibold hover:bg-[#f7f8f4]"
            >
              Browse restaurants
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#183b2b]">
      {/* Hero */}
      <section className="border-b border-[#e2e9df] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#617267] transition hover:text-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Package className="h-4 w-4" />
                Customer account
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Your orders{customerName ? `, ${customerName}` : ""}
              </h1>

              <p className="mt-3 max-w-2xl leading-7 text-[#617267]">
                Keep track of your meals, check payment information, and
                follow every order from placement to delivery.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={refreshOrders}
                disabled={loading || deletingOrderId !== null}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce5da] bg-white px-4 py-3 text-sm font-semibold transition hover:bg-[#f7f8f4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <Link
                href="/restaurants"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                <Utensils className="h-4 w-4" />
                Order meals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        {/* Summary */}
        {!error && !loading && orders.length > 0 && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total orders"
              value={pagination.total.toLocaleString()}
              description="Orders in your complete order history"
              icon={<ShoppingBag className="h-5 w-5" />}
              iconClass="bg-blue-50 text-blue-800"
            />

            <SummaryCard
              label="Delivered on this page"
              value={completedOrders.toLocaleString()}
              description="Successfully delivered orders in this page"
              icon={<Truck className="h-5 w-5" />}
              iconClass="bg-emerald-50 text-emerald-800"
            />

            <SummaryCard
              label="Value on this page"
              value={formatMoney(totalOfLoadedOrders)}
              description="Combined order totals on this page, not lifetime spend"
              icon={<CreditCard className="h-5 w-5" />}
              iconClass="bg-violet-50 text-violet-800"
            />

            <SummaryCard
              label="Current page"
              value={`${page}${pagination.pages ? ` / ${pagination.pages}` : ""}`}
              description="Use the controls below to browse your history"
              icon={<Clock3 className="h-5 w-5" />}
              iconClass="bg-amber-50 text-amber-800"
            />
          </section>
        )}

        {/* Messages */}
        {message && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            {message}
          </div>
        )}

        {displayedError && (
          <section
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5"
          >
            <h2 className="font-semibold text-red-900">
              Something went wrong
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-800">{displayedError}</p>

            <button
              type="button"
              onClick={refreshOrders}
              className="mt-4 rounded-lg bg-red-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900"
            >
              Try again
            </button>
          </section>
        )}

        {/* Order list */}
        <section>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Order history
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#617267]">
                Select an order to view its details and status.
              </p>
            </div>

            {!loading && orders.length > 0 && (
              <p className="text-sm text-[#617267]">
                {pagination.total} order(s) total
              </p>
            )}
          </div>

          {/* Filters */}
          {!loading && !error && orders.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  aria-pressed={filter === item.value}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    filter === item.value
                      ? "border-[#173d2b] bg-[#173d2b] text-white"
                      : "border-[#dce5da] bg-white text-[#617267] hover:border-emerald-700 hover:text-emerald-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <LoadingState />
          ) : !error && orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Your order history is empty. Explore the marketplace to discover restaurants and choose meals that suit your preferences."
            />
          ) : !error && filteredOrders.length === 0 ? (
            <EmptyState
              title="No matching orders on this page"
              description="This status filter has no matches in the current page. Try another status or browse a different page."
              showBrowseButton={false}
            />
          ) : !error ? (
            <div className="space-y-4">
              {filteredOrders.map((order: Order) => {
                const itemCount =
                  order.items?.reduce(
                    (total: number, item) => total + item.quantity,
                    0
                  ) ?? 0;

                const deletable = canDeleteOrder(order);

                return (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-2xl border border-[#e2e9df] bg-white transition hover:border-[#c9d9c5] hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf4e9] text-emerald-800">
                            <Store className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="break-words text-lg font-semibold">
                              {order.restaurant?.name ?? "NutriMeals order"}
                            </h3>

                            <p className="mt-1 text-xs text-[#809087]">
                              Order #{order.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 text-sm text-[#617267]">
                          Placed on {formatDate(order.created_at)}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset ${
                              STATUS_STYLES[order.status]
                            }`}
                          >
                            {formatStatus(order.status)}
                          </span>

                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${getPaymentStyle(
                              order.payment_status
                            )}`}
                          >
                            Payment: {order.payment_status}
                          </span>
                        </div>

                        {order.items && order.items.length > 0 ? (
                          <div className="mt-5 rounded-xl bg-[#f7f8f4] p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#617267]">
                              Items in this order
                            </p>

                            <ul className="mt-3 space-y-2">
                              {order.items
                                .slice(0, 4)
                                .map((item) => (
                                  <li
                                    key={item.id}
                                    className="flex items-start justify-between gap-3 text-sm"
                                  >
                                    <span className="min-w-0 text-[#617267]">
                                      <span className="font-semibold text-[#183b2b]">
                                        {item.quantity} ×
                                      </span>{" "}
                                      {item.menu_item?.name ?? "Meal"}
                                    </span>

                                    <span className="shrink-0 font-medium text-[#183b2b]">
                                      {formatMoney(
                                        Number(item.price_at_order) *
                                          item.quantity
                                      )}
                                    </span>
                                  </li>
                                ))}
                            </ul>

                            {order.items.length > 4 && (
                              <p className="mt-3 text-xs text-[#809087]">
                                And {order.items.length - 4} more item(s)
                              </p>
                            )}

                            <p className="mt-3 border-t border-[#e2e9df] pt-3 text-xs text-[#809087]">
                              {itemCount} item(s) in total
                            </p>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-[#809087]">
                            Item details are not available in this response.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-4 border-t border-[#e9eee7] pt-5 lg:w-56 lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                        <div>
                          <p className="text-sm text-[#617267]">
                            Order total
                          </p>

                          <p className="mt-1 text-2xl font-semibold tracking-tight">
                            {formatMoney(order.total)}
                          </p>
                        </div>

                        <Link
                          href={`/orders/${encodeURIComponent(order.id)}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
                        >
                          View details
                          <ArrowRight className="h-4 w-4" />
                        </Link>

                        <Link
                          href={`/orders/${encodeURIComponent(order.id)}/tracking`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce5da] bg-white px-4 py-3 text-sm font-semibold text-[#173d2b] transition hover:border-emerald-700 hover:bg-[#f7f8f4]"
                        >
                          <Truck className="h-4 w-4" />
                          Track order
                          <ArrowRight className="h-4 w-4" />
                        </Link>

                        {deletable && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteOrder(order)}
                            disabled={deletingOrderId !== null}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingOrderId === order.id ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}

                            {deletingOrderId === order.id
                              ? "Deleting..."
                              : "Delete unpaid order"}
                          </button>
                        )}

                        {order.status === "placed" &&
                          order.payment_status === "pending" &&
                          order.paymob_order_id && (
                            <p className="text-xs leading-5 text-amber-800">
                              Payment is pending. Wait for Paymob to confirm
                              its final status before attempting to delete
                              this order.
                            </p>
                          )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {/* Pagination */}
          {!loading && !error && pagination.pages > 1 && (
            <nav
              aria-label="Order history pagination"
              className="mt-7 flex flex-col gap-4 rounded-2xl border border-[#e2e9df] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <p className="text-sm text-[#617267]">
                Page {page} of {pagination.pages}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => changePage(page - 1)}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#dce5da] px-4 py-2.5 text-sm font-semibold transition hover:bg-[#f7f8f4] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => changePage(page + 1)}
                  disabled={page >= pagination.pages || loading}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#dce5da] px-4 py-2.5 text-sm font-semibold transition hover:bg-[#f7f8f4] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
          )}

          <p className="mt-5 text-xs leading-5 text-[#809087]">
            Order statuses and payment information come from the backend.
            Only eligible unpaid orders can be deleted; orders with completed
            payments or active payment attempts are protected.
          </p>
        </section>
      </div>
    </main>
  );
}