"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getRestaurants,
  type Pagination,
  type Restaurant,
} from "../../api/api";

const PAGE_SIZE = 12;

export default function RestaurantMarketplace() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadRestaurants() {
      setLoading(true);
      setError(null);

      try {
        const result = await getRestaurants({
          page,
          limit: PAGE_SIZE,
        });

        if (cancelled) return;

        setRestaurants(result.restaurants);
        setPagination(result.pagination);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load restaurants. Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRestaurants();

    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  return (
    <main className="min-h-screen bg-[#FAF9F6]">
      <section
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
        aria-labelledby="restaurants-heading"
      >
        {/* Marketplace introduction */}
        <header className="mb-9">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                <span
                  className="h-2 w-2 rounded-full bg-emerald-600"
                  aria-hidden="true"
                />
                Good food, better choices
              </span>

              <h1
                id="restaurants-heading"
                className="mt-5 text-3xl font-bold tracking-tight text-[#18392C] sm:text-4xl lg:text-5xl"
              >
                Find your next
                <span className="block text-emerald-700">
                  favorite meal.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                Discover local restaurants, explore their menus, check
                nutritional information, and order the food you love.
              </p>
            </div>

            {pagination ? (
              <p className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm">
                <span className="font-bold text-[#18392C]">
                  {pagination.total}
                </span>{" "}
                restaurant{pagination.total === 1 ? "" : "s"} to explore
              </p>
            ) : null}
          </div>
        </header>

        {/* Loading skeletons */}
        {loading ? (
          <div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Loading restaurants"
            aria-live="polite"
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-2xl border border-stone-200 bg-white"
              >
                <div className="h-52 bg-stone-200" />

                <div className="space-y-3 p-5">
                  <div className="h-5 w-2/3 rounded bg-stone-200" />
                  <div className="h-4 w-full rounded bg-stone-100" />
                  <div className="h-4 w-1/2 rounded bg-stone-100" />
                  <div className="mt-5 h-9 rounded-lg bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error state */
          <div
            className="rounded-2xl border border-red-200 bg-white p-6 sm:p-8"
            role="alert"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl">
              !
            </div>

            <h2 className="mt-4 text-xl font-bold text-stone-900">
              We couldn’t load the restaurants.
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-600">{error}</p>

            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="mt-5 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
            >
              Try again
            </button>
          </div>
        ) : restaurants.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl"
              aria-hidden="true"
            >
              🍃
            </div>

            <h2 className="mt-5 text-2xl font-bold text-[#18392C]">
              Something delicious is on its way.
            </h2>

            <p className="mx-auto mt-3 max-w-md leading-7 text-stone-600">
              There are no restaurants available right now. Check back soon
              for more places and meals to discover.
            </p>

            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="mt-6 rounded-xl border border-emerald-800 px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
            >
              Refresh restaurants
            </button>
          </div>
        ) : (
          <>
            {/* Restaurant cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((restaurant) => {
                const reviewCount = restaurant._count?.reviews ?? 0;

                return (
                  <article
                    key={restaurant.id}
                    className="group overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
                  >
                    <Link
                      href={`/restaurants/${restaurant.id}`}
                      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                      aria-label={`Explore the menu at ${restaurant.name}`}
                    >
                      {/* Restaurant image */}
                      <div className="relative h-52 overflow-hidden bg-stone-100">
                        {restaurant.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={restaurant.cover_image}
                            alt={restaurant.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 via-[#F5F3E8] to-amber-50">
                            <span className="text-6xl" aria-hidden="true">
                              🍽️
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />

                        <span
                          className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                            restaurant.is_open
                              ? "bg-white text-emerald-800"
                              : "bg-white/95 text-stone-600"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              restaurant.is_open
                                ? "bg-emerald-500"
                                : "bg-stone-400"
                            }`}
                            aria-hidden="true"
                          />
                          {restaurant.is_open ? "Open for orders" : "Closed"}
                        </span>
                      </div>

                      {/* Restaurant information */}
                      <div className="p-5">
                        <h2 className="text-xl font-bold tracking-tight text-[#18392C] transition group-hover:text-emerald-700">
                          {restaurant.name}
                        </h2>

                        {restaurant.description ? (
                          <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-stone-600">
                            {restaurant.description}
                          </p>
                        ) : (
                          <p className="mt-2 min-h-12 text-sm leading-6 text-stone-500">
                            Discover the menu and find something you’ll love.
                          </p>
                        )}

                        <p className="mt-3 flex items-start gap-2 text-sm text-stone-500">
                          <span aria-hidden="true">⌖</span>
                          <span className="line-clamp-1">
                            {restaurant.address}
                          </span>
                        </p>

                        <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
                          <span className="text-sm text-stone-500">
                            {reviewCount} review
                            {reviewCount === 1 ? "" : "s"}
                          </span>

                          <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 transition group-hover:gap-3">
                            Explore menu
                            <span aria-hidden="true">→</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 ? (
              <nav
                className="mt-10 flex flex-wrap items-center justify-center gap-4"
                aria-label="Restaurant pages"
              >
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                <span className="text-sm text-stone-600" aria-live="polite">
                  Page{" "}
                  <span className="font-bold text-[#18392C]">
                    {pagination.page}
                  </span>{" "}
                  of {pagination.pages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.pages, current + 1),
                    )
                  }
                  disabled={page >= pagination.pages || loading}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}