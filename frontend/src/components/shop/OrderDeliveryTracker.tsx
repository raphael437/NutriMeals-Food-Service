"use client";

import {
  Bike,
  Check,
  ChefHat,
  Circle,
  ClipboardCheck,
  Clock3,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { Order, OrderStatus } from "../../api/api";

type OrderDeliveryTrackerProps = {
  order: Order;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
};

const steps: Array<{
  status: Exclude<OrderStatus, "cancelled">;
  title: string;
  description: string;
  Icon: typeof ClipboardCheck;
}> = [
  {
    status: "placed",
    title: "Order received",
    description: "Your order is in our system. We’ll show the next update here.",
    Icon: ClipboardCheck,
  },
  {
    status: "confirmed",
    title: "Restaurant confirmed",
    description: "The restaurant has accepted your order.",
    Icon: ShieldCheck,
  },
  {
    status: "preparing",
    title: "Freshly preparing",
    description: "Your meal is being prepared by the restaurant.",
    Icon: ChefHat,
  },
  {
    status: "out_for_delivery",
    title: "Out for delivery",
    description: "Your order is on its way to your delivery address.",
    Icon: Bike,
  },
  {
    status: "delivered",
    title: "Delivered with care",
    description: "Enjoy your meal. We hope it brings a little goodness to your day.",
    Icon: PackageCheck,
  },
];

const statusCopy: Record<OrderStatus, { title: string; description: string }> = {
  placed: {
    title: "We’ve received your order",
    description: "Your NutriMeals journey has started. We’ll show each status update below.",
  },
  confirmed: {
    title: "The restaurant is on it",
    description: "Your order has been accepted and is moving to the kitchen.",
  },
  preparing: {
    title: "Freshness in progress",
    description: "Your meal is being prepared. Check back here for the next update.",
  },
  out_for_delivery: {
    title: "Your order is on its way",
    description: "The restaurant marked this order as out for delivery.",
  },
  delivered: {
    title: "Delivered with care",
    description: "Your order is marked as delivered. We hope you enjoy every bite.",
  },
  cancelled: {
    title: "This order was cancelled",
    description: "This order will no longer move through the delivery steps.",
  },
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function paymentLabel(status: Order["payment_status"]) {
  if (status === "paid") return "Paid";
  if (status === "failed") return "Payment failed";
  return "Payment pending";
}

export default function OrderDeliveryTracker({
  order,
  onRefresh,
  refreshing = false,
}: OrderDeliveryTrackerProps) {
  const isCancelled = order.status === "cancelled";
  const activeIndex = steps.findIndex((step) => step.status === order.status);
  const completedSteps = order.status === "delivered" ? steps.length : Math.max(0, activeIndex);
  const status = statusCopy[order.status];

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#e2e9df] bg-[#fffefa] text-[#173d2b] shadow-sm shadow-emerald-950/[0.03]">
      <div className="relative overflow-hidden bg-[#173d2b] px-5 py-6 text-white sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-8 h-36 w-36 rounded-full border border-white/10" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#c8d9c0]">
              NutriMeals · delivery update
            </p>
            <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
              {status.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#e0e9dc]">{status.description}</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#e3eddb] ring-1 ring-inset ring-white/15" aria-hidden="true">
            {isCancelled ? <XCircle className="h-7 w-7" /> : order.status === "delivered" ? <PackageCheck className="h-7 w-7" /> : order.status === "out_for_delivery" ? <Bike className="h-7 w-7" /> : order.status === "preparing" ? <ChefHat className="h-7 w-7" /> : <Clock3 className="h-7 w-7" />}
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap items-center gap-2 text-xs text-[#e0e9dc]">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
            {order.restaurant?.name ?? "NutriMeals restaurant"}
          </span>
        </div>
      </div>

      <div className="grid gap-0 border-b border-[#e9eee7] sm:grid-cols-3 sm:divide-x sm:divide-[#e9eee7]">
        <div className="px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#809087]">Order placed</p>
          <p className="mt-1.5 text-sm font-semibold text-[#173d2b]">{formatDate(order.created_at)}</p>
        </div>
        <div className="border-t border-[#e9eee7] px-5 py-4 sm:border-t-0 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#809087]">Order total</p>
          <p className="mt-1.5 text-sm font-semibold text-[#173d2b]">EGP {Number(order.total).toFixed(2)}</p>
        </div>
        <div className="border-t border-[#e9eee7] px-5 py-4 sm:border-t-0 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#809087]">Payment</p>
          <p className={`mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold ${order.payment_status === "paid" ? "text-[#28613c]" : order.payment_status === "failed" ? "text-[#a13e30]" : "text-[#98651b]"}`}>
            {order.payment_status === "paid" ? <Check className="h-4 w-4" /> : order.payment_status === "failed" ? <XCircle className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
            {paymentLabel(order.payment_status)}
          </p>
        </div>
      </div>

      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#66806e]">The journey</p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-tight">Delivery progress</h3>
            </div>
            {!isCancelled ? (
              <span className="text-xs font-medium text-[#809087]">{Math.max(0, completedSteps)} of {steps.length} steps complete</span>
            ) : null}
          </div>

          {isCancelled ? (
            <div className="mt-5 flex gap-3 rounded-2xl border border-[#efd8d3] bg-[#fff7f5] p-4 text-[#8d382d]" role="status">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Delivery stopped</p>
                <p className="mt-1 text-sm leading-6 text-[#8d5148]">If you need help with this order, contact the NutriMeals support team.</p>
              </div>
            </div>
          ) : (
            <ol className="mt-5">
              {steps.map((step, index) => {
                const isDone = order.status === "delivered" || index < activeIndex;
                const isCurrent = index === activeIndex;
                const Icon = step.Icon;
                return (
                  <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < steps.length - 1 ? (
                      <span className={`absolute left-[19px] top-10 h-[calc(100%-24px)] w-px ${isDone ? "bg-[#86a98a]" : "bg-[#e2e9df]"}`} aria-hidden="true" />
                    ) : null}
                    <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset transition ${isDone ? "bg-[#e5efe1] text-[#315c40] ring-[#cadcc5]" : isCurrent ? "bg-[#173d2b] text-white ring-[#173d2b] shadow-md shadow-emerald-950/10" : "bg-[#faf8f2] text-[#a0aca0] ring-[#e2e9df]"}`}>
                      {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`text-sm font-semibold ${isDone || isCurrent ? "text-[#173d2b]" : "text-[#809087]"}`}>{step.title}</h4>
                        {isCurrent ? <span className="rounded-full bg-[#eef3e9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#315c40]">Current status</span> : null}
                      </div>
                      <p className={`mt-1 text-sm leading-6 ${isDone || isCurrent ? "text-[#52665a]" : "text-[#9aa69b]"}`}>{step.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-5 rounded-xl bg-[#faf8f2] px-4 py-3 text-xs leading-5 text-[#718078]">
            This timeline reflects the latest order status saved by the restaurant. It does not show live courier GPS or promise an estimated arrival time.
          </p>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#e2e9df] bg-[#faf8f2] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#173d2b]">
              <MapPin className="h-4 w-4 text-[#66806e]" /> Delivery address
            </div>
            {order.address ? (
              <p className="mt-2 text-sm leading-6 text-[#52665a]">
                {order.address.line1}<br />{order.address.city}
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[#809087]">Address details are unavailable for this order.</p>
            )}
            {order.restaurant?.address ? (
              <p className="mt-3 border-t border-[#e2e9df] pt-3 text-xs leading-5 text-[#809087]">
                Restaurant: {order.restaurant.address}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#d9e5d4] bg-[#f1f6ed] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#315c40]">
              <ShieldCheck className="h-4 w-4" /> Order care
            </div>
            <p className="mt-2 text-sm leading-6 text-[#52665a]">
              We’ll keep the status clear, from the restaurant’s confirmation to delivery.
            </p>
          </div>

          {onRefresh ? (
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={refreshing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#24543a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c9d7b] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Checking status…" : "Check status again"}
            </button>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
