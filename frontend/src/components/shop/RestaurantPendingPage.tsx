"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuthState,
  type RestaurantSummary,
  type User,
} from "../../api/api";

export default function RestaurantPendingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  function redirectForStatus(currentUser: User, application: RestaurantSummary | null) {
    if (currentUser.role === "admin") {
      router.replace("/admin/dashboard");
      return true;
    }
    if (currentUser.role === "customer") {
      router.replace("/restaurants");
      return true;
    }
    if (application?.status === "APPROVED" && currentUser.role === "restaurant_owner") {
      router.replace("/dashboard");
      router.refresh();
      return true;
    }
    if (application?.status === "REJECTED") {
      router.replace("/restaurants/rejected");
      return true;
    }
    return false;
  }

  useEffect(() => {
    let active = true;

    async function loadInitialStatus() {
      try {
        const state = await getAuthState();
        if (!active) return;

        const currentUser = state.user;
        const restaurants = currentUser.restaurants ?? [];
        const application =
          restaurants.find((item) => item.status === "PENDING") ??
          restaurants.find((item) => item.status === "APPROVED") ??
          restaurants.find((item) => item.status === "REJECTED") ??
          restaurants[0] ??
          null;

        setUser(currentUser);
        setRestaurant(application);
        redirectForStatus(currentUser, application);
      } catch (cause: unknown) {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "We couldn't check your application status.",
        );
        router.replace("/signin?next=%2Frestaurants%2Fpending");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialStatus();
    return () => {
      active = false;
    };
  }, [router]);

  async function checkApplicationStatus() {
    setChecking(true);
    setError("");

    try {
      const state = await getAuthState();
      const currentUser = state.user;
      const restaurants = currentUser.restaurants ?? [];
      const application =
        restaurants.find((item) => item.status === "PENDING") ??
        restaurants.find((item) => item.status === "APPROVED") ??
        restaurants.find((item) => item.status === "REJECTED") ??
        restaurants[0] ??
        null;

      setUser(currentUser);
      setRestaurant(application);
      redirectForStatus(currentUser, application);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't check your application status. Please try again.",
      );
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#faf8f2] px-4">
        <p className="text-sm text-stone-600">Checking your application…</p>
      </main>
    );
  }

  return (
    <main className="grid min-h-[75vh] place-items-center bg-[#faf8f2] px-4 py-12 text-stone-900">
      <section className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-2xl"
          aria-hidden="true"
        >
          ⌛
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">
          Partner application
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Your application is under review
        </h1>
        <p className="mt-4 leading-7 text-stone-600">
          {restaurant?.name
            ? `We received the application for ${restaurant.name}. `
            : "We received your restaurant application. "}
          Our team needs to approve it before restaurant-owner dashboard access is enabled.
        </p>
        {user?.email ? (
          <p className="mt-3 text-sm text-stone-500">Signed in as {user.email}</p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-5 text-sm leading-6 text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void checkApplicationStatus()}
            disabled={checking}
            className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checking ? "Checking…" : "Check application status"}
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
