
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveRestaurant,
  getAuthState,
  getRestaurantApplications,
  rejectRestaurant,
  type Restaurant,
} from "../../api/api";

export default function RestaurantApplicationsPage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Fetching data and checking authorization do not update React state.
  const fetchApplications = useCallback(async (): Promise<Restaurant[] | null> => {
    const auth = await getAuthState();

    if (auth.user.role !== "admin") {
      router.replace(auth.next || "/restaurants");
      return null;
    }

    const result = await getRestaurantApplications({
      status: "PENDING",
      page: 1,
      limit: 50,
    });

    return result.restaurants;
  }, [router]);

  // Initial load: state updates happen only after the async request settles.
  useEffect(() => {
    let active = true;

    async function loadInitialApplications() {
      try {
        const result = await fetchApplications();

        if (active && result !== null) {
          setRestaurants(result);
        }
      } catch (cause: unknown) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load restaurant applications.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialApplications();

    return () => {
      active = false;
    };
  }, [fetchApplications]);

  // Manual refresh: this runs from a button click, not from the effect.
  const loadApplications = useCallback(async () => {
    setRefreshing(true);
    setError("");
    setNotice("");

    try {
      const result = await fetchApplications();

      if (result !== null) {
        setRestaurants(result);
      }
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not refresh restaurant applications.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [fetchApplications]);

  async function handleApprove(restaurant: Restaurant) {
    const confirmed = window.confirm(
      `Approve ${restaurant.name}? The applicant will receive restaurant-owner access.`,
    );

    if (!confirmed) return;

    setActingId(restaurant.id);
    setError("");
    setNotice("");

    try {
      await approveRestaurant(restaurant.id);

      setRestaurants((current) =>
        current.filter((item) => item.id !== restaurant.id),
      );

      setNotice(
        `${restaurant.name} was approved. The owner can now sign in to the dashboard.`,
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not approve this application.",
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(restaurant: Restaurant) {
    const reason = (reasons[restaurant.id] ?? "").trim();

    if (!reason) {
      setError(
        `Enter a rejection reason for ${restaurant.name} before rejecting it.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Reject the application for ${restaurant.name}?`,
    );

    if (!confirmed) return;

    setActingId(restaurant.id);
    setError("");
    setNotice("");

    try {
      await rejectRestaurant(restaurant.id, reason);

      setRestaurants((current) =>
        current.filter((item) => item.id !== restaurant.id),
      );

      setNotice(
        `${restaurant.name} was rejected. The applicant can see the reason on the rejected page.`,
      );
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not reject this application.",
      );
    } finally {
      setActingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f2] px-4 py-10 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">
              Platform administration
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Restaurant applications
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Review each application. Approval changes the applicant’s role
              to restaurant owner; rejection requires a reason and does not
              grant owner access.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadApplications()}
            disabled={refreshing || loading}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
          >
            {refreshing ? "Refreshing…" : "Refresh list"}
          </button>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}

        {notice ? (
          <p
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            {notice}
          </p>
        ) : null}

        {loading ? (
          <div className="py-16 text-center text-sm text-stone-600">
            Loading applications…
          </div>
        ) : restaurants.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-stone-200 bg-white px-6 py-16 text-center">
            <h2 className="text-xl font-semibold">
              No pending applications
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              New restaurant applications will appear here.
            </p>
          </section>
        ) : (
          <div className="mt-8 grid gap-5">
            {restaurants.map((restaurant) => (
              <article
                key={restaurant.id}
                className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold">
                        {restaurant.name}
                      </h2>

                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                        Pending review
                      </span>
                    </div>

                    {restaurant.description ? (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                        {restaurant.description}
                      </p>
                    ) : null}

                    <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          Address
                        </dt>
                        <dd className="mt-1 text-stone-800">
                          {restaurant.address}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          Restaurant phone
                        </dt>
                        <dd className="mt-1 text-stone-800">
                          {restaurant.phone || "Not provided"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          Applicant
                        </dt>
                        <dd className="mt-1 text-stone-800">
                          {restaurant.owner?.name || "Unknown applicant"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          Applicant email
                        </dt>
                        <dd className="mt-1 break-all text-stone-800">
                          {restaurant.owner?.email || "Not provided"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          Applicant phone
                        </dt>
                        <dd className="mt-1 text-stone-800">
                          {restaurant.owner?.phone || "Not provided"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                          Submitted
                        </dt>
                        <dd className="mt-1 text-stone-800">
                          {restaurant.created_at
                            ? new Date(
                                restaurant.created_at,
                              ).toLocaleString()
                            : "Unknown"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="shrink-0 self-start rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500">
                    ID: {restaurant.id}
                  </div>
                </div>

                <label className="mt-7 block text-sm font-medium text-stone-700">
                  Rejection reason (required to reject)

                  <textarea
                    value={reasons[restaurant.id] ?? ""}
                    onChange={(event) =>
                      setReasons((current) => ({
                        ...current,
                        [restaurant.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    maxLength={2000}
                    placeholder="Explain what needs to be corrected…"
                    className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
                  />
                </label>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={actingId === restaurant.id}
                    onClick={() => void handleReject(restaurant)}
                    className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {actingId === restaurant.id
                      ? "Working…"
                      : "Reject application"}
                  </button>

                  <button
                    type="button"
                    disabled={actingId === restaurant.id}
                    onClick={() => void handleApprove(restaurant)}
                    className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
                  >
                    {actingId === restaurant.id
                      ? "Working…"
                      : "Approve restaurant"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
