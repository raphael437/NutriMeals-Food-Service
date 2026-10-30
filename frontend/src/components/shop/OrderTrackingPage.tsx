"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Leaf,
  LoaderCircle,
} from "lucide-react";

import {
  getOrder,
  getMyReviews,
  type Order,
} from "../../api/api";

import OrderDeliveryTracker from "../shop/OrderDeliveryTracker";
import ReviewOrderForm from "../shop/ReviewForm";

type OrderTrackingPageProps = {
  orderId: string;
};

export default function OrderTrackingPage({
  orderId,
}: OrderTrackingPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(
    async (manualRefresh = false) => {
      if (!orderId) {
        setError("The order reference is missing from the URL.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (manualRefresh) {
        setRefreshing(true);
      }

      setError(null);

      try {
        // The backend allows customers to retrieve only their own orders.
        const latestOrder = await getOrder(orderId);

        setOrder(latestOrder);

        // Check whether this customer has already reviewed this order.
        // Review lookup failure should not prevent order tracking.
        try {
          const myReviews = await getMyReviews();

          setReviewed(
            myReviews.some(
              (review) => review.order_id === latestOrder.id,
            ),
          );
        } catch {
          setReviewed(false);
        }
      } catch (cause: unknown) {
        setError(
          cause instanceof Error
            ? cause.message
            : "We couldn't retrieve this order. Please check your connection and try again.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      // Keep initial loading state changes after an async boundary.
      await Promise.resolve();

      if (active) {
        await loadOrder(false);
      }
    }

    void initialLoad();

    return () => {
      active = false;
    };
  }, [loadOrder]);

  if (loading) {
    return (
      <main className="grid min-h-[65vh] place-items-center bg-[#faf8f2] px-4 py-12 text-[#173d2b]">
        <div className="flex items-center gap-3 rounded-2xl border border-[#e2e9df] bg-[#fffefa] px-5 py-4 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-[#66806e]" />
          <p className="text-sm font-medium">
            Checking your order with NutriMeals…
          </p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-[65vh] bg-[#faf8f2] px-4 py-10 text-[#173d2b] sm:px-6">
        <section
          className="mx-auto max-w-2xl rounded-[28px] border border-[#ead9c6] bg-[#fffefa] p-6 shadow-sm sm:p-8"
          role="alert"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fcf1e4] text-[#8a5a24]">
            <AlertCircle className="h-6 w-6" />
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            We could not load this order
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#52665a]">
            {error ?? "This order could not be found."}
          </p>

          <p className="mt-3 text-xs leading-5 text-[#809087]">
            For privacy, you can only view orders belonging to your signed-in
            customer account.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadOrder(false);
              }}
              className="inline-flex items-center justify-center rounded-xl bg-[#173d2b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24543a]"
            >
              Try again
            </button>

            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-xl border border-[#dce5da] px-4 py-2.5 text-sm font-semibold text-[#315c40] hover:bg-[#f2f6ef]"
            >
              Return to my orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // A review is allowed only if BOTH conditions are true.
  const canReview =
    order.status === "delivered" &&
    order.payment_status === "paid";

  const deliveredButNotPaid =
    order.status === "delivered" &&
    order.payment_status !== "paid";

  return (
    <main className="min-h-screen bg-[#faf8f2] px-4 py-8 text-[#173d2b] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/orders"
          className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#52665a] transition hover:text-[#173d2b]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my orders
        </Link>

        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#66806e]">
              <Leaf className="h-3.5 w-3.5" />
              Eat well. Live well.
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Your delivery
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52665a]">
              Follow your latest order status. Once your order is delivered
              and payment is confirmed, you can share your experience.
            </p>
          </div>

          <p className="text-xs text-[#809087]">
            Reference: {order.id}
          </p>
        </header>

        <OrderDeliveryTracker
          order={order}
          onRefresh={() => loadOrder(true)}
          refreshing={refreshing}
        />

        {/* Show review UI only for paid and delivered orders. */}
        {canReview ? (
          reviewed ? (
            <section
              className="mt-5 flex gap-3 rounded-[24px] border border-[#d9e5d4] bg-[#f1f6ed] p-5 text-[#315c40] sm:p-6"
              aria-live="polite"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <h2 className="font-semibold">
                  Thank you for sharing your experience
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#52665a]">
                  Your review is saved. It can appear in the public reviews
                  section for{" "}
                  {order.restaurant?.name ?? "this restaurant"}.
                </p>
              </div>
            </section>
          ) : (
            <div className="mt-5">
              <ReviewOrderForm
                orderId={order.id}
                restaurantName={
                  order.restaurant?.name ?? "this restaurant"
                }
                onSubmitted={() => setReviewed(true)}
              />
            </div>
          )
        ) : deliveredButNotPaid ? (
          <section
            className="mt-5 rounded-[24px] border border-[#e2e9df] bg-[#fffefa] p-5 sm:p-6"
            role="status"
          >
            <h2 className="font-semibold text-[#173d2b]">
              Your review will be available after payment
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#52665a]">
              Your order has been delivered, but its payment has not yet been
              confirmed. Once the payment status changes to paid, you can rate
              your meal and share your experience.
            </p>

            {order.payment_status === "failed" ? (
              <p className="mt-2 text-sm font-medium text-red-700">
                This payment has failed. Please resolve the payment issue
                before submitting a review.
              </p>
            ) : null}
          </section>
        ) : null}

        {order.restaurant_id ? (
          <div className="mt-5 text-sm">
            <Link
              href={`/restaurants/${order.restaurant_id}`}
              className="font-semibold text-[#315c40] underline decoration-[#b7cbb2] underline-offset-4 hover:text-[#173d2b]"
            >
              View restaurant details and guest reviews
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}