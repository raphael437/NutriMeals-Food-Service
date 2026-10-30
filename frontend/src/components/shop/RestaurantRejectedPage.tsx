"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthState, type RestaurantSummary } from "../../api/api";

export default function RestaurantRejectedPage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<RestaurantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const state = await getAuthState();
        if (!active) return;

        if (state.user.role === "admin") {
          router.replace("/admin/dashboard");
          return;
        }
        if (state.user.role === "customer") {
          router.replace("/restaurants");
          return;
        }

        const restaurants = state.user.restaurants ?? [];
        const rejected = restaurants.find((item) => item.status === "REJECTED");
        if (!rejected) {
          const approved = restaurants.some((item) => item.status === "APPROVED");
          router.replace(approved ? "/dashboard" : "/restaurants/pending");
          return;
        }

        setRestaurant(rejected);
      } catch (cause: unknown) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Unable to load the application status.");
        router.replace("/signin?next=%2Frestaurants%2Frejected");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#faf8f2] px-4">
        <p className="text-sm text-stone-600">Loading application result…</p>
      </main>
    );
  }

  return (
    <main className="grid min-h-[75vh] place-items-center bg-[#faf8f2] px-4 py-12 text-stone-900">
      <section className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-2xl text-red-800" aria-hidden="true">
          !
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
          Partner application
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Your application was not approved
        </h1>
        <p className="mt-4 leading-7 text-stone-600">
          {restaurant?.name
            ? `The application for ${restaurant.name} was declined.`
            : "Your restaurant application was declined."} You can review the feedback below and contact the NutriMeals team for clarification.
        </p>
        {restaurant?.rejection_reason ? (
          <div className="mt-6 rounded-2xl bg-stone-50 p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Reason provided
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {restaurant.rejection_reason}
            </p>
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/contact")}
            className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            Contact support
          </button>
          <button
            type="button"
            onClick={() => router.push("/restaurants")}
            className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Browse restaurants
          </button>
        </div>
      </section>
    </main>
  );
}
