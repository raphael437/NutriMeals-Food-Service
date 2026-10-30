"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { getOrder } from "../../api/api";
import {
  clearCart,
  PENDING_ORDER_STORAGE_KEY,
} from "../../lib/cartStorage";

type PaymentState =
  | "checking"
  | "paid"
  | "failed"
  | "pending"
  | "error";

const PENDING_ORDER_CART_KEY =
  "food-marketplace:pending-order-cart:v1";

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export default function PaymantResultPage() {
  const [state, setState] = useState<PaymentState>("checking");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState(
    "Checking your payment with NutriMeals...",
  );
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function verifyPayment() {
      // Defer state changes until after the effect has completed its
      // initial synchronous execution.
      await Promise.resolve();

      if (cancelled) return;

      const params = new URLSearchParams(window.location.search);

      // merchant_order_id is the local NutriMeals order ID.
      // Paymob's "order" parameter is its own order ID.
      const localOrderId =
        params.get("merchant_order_id") ||
        params.get("orderId");

      if (!localOrderId) {
        setOrderId(null);
        setState("error");
        setMessage(
          "We couldn't identify your NutriMeals order from the payment return URL.",
        );
        return;
      }

      // From this point forward, TypeScript knows this is a string.
      setOrderId(localOrderId);
      setState("checking");
      setMessage(
        "Your payment return was received. Waiting for backend confirmation...",
      );

      let lastRequestFailed = false;

      // Wait for the Paymob callback to update the database.
      for (let attempt = 0; attempt < 15; attempt += 1) {
        if (cancelled) return;

        try {
          const order = await getOrder(localOrderId);

          if (cancelled) return;

          lastRequestFailed = false;

          if (order.payment_status === "paid") {
            // Clear the cart only when this checkout's order is confirmed.
            try {
              const pendingOrderId = window.sessionStorage.getItem(
                PENDING_ORDER_STORAGE_KEY,
              );

              if (pendingOrderId === localOrderId) {
                clearCart();

                window.sessionStorage.removeItem(
                  PENDING_ORDER_STORAGE_KEY,
                );

                window.sessionStorage.removeItem(
                  PENDING_ORDER_CART_KEY,
                );
              }
            } catch {
              // Storage failures must not change the payment result.
            }

            setState("paid");
            setMessage(
              "Your payment has been confirmed by NutriMeals. Your order is recorded as paid.",
            );

            return;
          }

          if (order.payment_status === "failed") {
            setState("failed");
            setMessage(
              "The backend recorded this payment as failed. Your cart has been preserved so you can retry.",
            );

            return;
          }
        } catch {
          // The callback may not have updated the database yet.
          lastRequestFailed = true;
        }

        if (attempt < 14) {
          await wait(2000);
        }
      }

      if (cancelled) return;

      setState("pending");
      setMessage(
        lastRequestFailed
          ? "We couldn't retrieve your order status. Check your connection and try again."
          : "Your payment is still awaiting confirmation. Your cart has been preserved. Please check again shortly.",
      );
    }

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [retry]);

  const isChecking = state === "checking";

  const Icon =
    state === "paid"
      ? CheckCircle2
      : state === "failed"
        ? XCircle
        : state === "error"
          ? AlertCircle
          : state === "pending"
            ? Clock3
            : RefreshCw;

  const iconClass =
    state === "paid"
      ? "bg-emerald-100 text-emerald-800"
      : state === "failed" || state === "error"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-900";

  const title =
    state === "paid"
      ? "Payment confirmed"
      : state === "failed"
        ? "Payment failed"
        : state === "error"
          ? "Unable to identify order"
          : state === "pending"
            ? "Payment confirmation pending"
            : "Verifying your payment";

  return (
    <main className="grid min-h-[75vh] place-items-center bg-[#faf8f2] px-4 py-12 text-[#183b2b]">
      <section className="w-full max-w-xl rounded-3xl border border-[#e2e9df] bg-white p-7 text-center shadow-sm sm:p-10">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${iconClass}`}
        >
          <Icon
            className={`h-8 w-8 ${isChecking ? "animate-spin" : ""}`}
          />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
          NutriMeals checkout
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {title}
        </h1>

        <p
          role="status"
          aria-live="polite"
          className="mt-4 text-sm leading-7 text-[#718078]"
        >
          {message}
        </p>

        {orderId ? (
          <p className="mt-4 break-all rounded-xl bg-[#f7f8f4] p-3 text-xs text-[#718078]">
            Order reference: {orderId}
          </p>
        ) : null}

        {state === "paid" ? (
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/cart"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
            >
              View my orders
            </Link>

            <Link
              href="/restaurants"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dce5da] px-5 py-3 text-sm font-semibold text-[#173d2b] transition hover:bg-[#f2f6ef]"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {(state === "pending" || state === "error") && (
              <button
                type="button"
                onClick={() => setRetry((current) => current + 1)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                <RefreshCw className="h-4 w-4" />
                Check payment again
              </button>
            )}

            <Link
              href="/cart"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dce5da] px-5 py-3 text-sm font-semibold text-[#173d2b] transition hover:bg-[#f2f6ef]"
            >
              Return to cart
            </Link>
          </div>
        )}

        <p className="mt-6 text-xs leading-5 text-[#809087]">
          Your payment status is retrieved from the backend, not inferred
          from Paymob success parameter.
        </p>
      </section>
    </main>
  );
}