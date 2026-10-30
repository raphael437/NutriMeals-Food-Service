"use client";

import { useEffect, useState } from "react";
import {
  getRestaurantReviews,
  type Review,
  type Pagination,
} from "../../api/api";

type PublicRestaurantReviewsProps = {
  restaurantId: string;
  pageSize?: number;
};

function formatReviewDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "G";
}

function Stars({ rating }: { rating: number }) {
  const safeRating = Math.max(
    0,
    Math.min(5, Math.round(Number(rating) || 0))
  );

  return (
    <span
      className="inline-flex items-center gap-0.5 text-lg leading-none tracking-tight"
      aria-label={`${safeRating} out of 5 stars`}
      title={`${safeRating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={
            index < safeRating
              ? "text-[#b7791f]"
              : "text-[#d8dfd4]"
          }
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function PublicRestaurantReviews({
  restaurantId,
  pageSize = 10,
}: PublicRestaurantReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      try {
        // Wait for the API response before updating React state.
        const result = await getRestaurantReviews(restaurantId, {
          page,
          limit: pageSize,
        });

        if (cancelled) return;

        setReviews(result.reviews);
        setPagination(result.pagination);
        setError(null);
      } catch (cause: unknown) {
        if (cancelled) return;

        setError(
          cause instanceof Error
            ? cause.message
            : "We couldn't load these reviews."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (restaurantId) {
      void loadReviews();
    }

    return () => {
      cancelled = true;
    };
  }, [restaurantId, page, pageSize, reloadKey]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    setReloadKey((current) => current + 1);
  }

  function handlePreviousPage() {
    setLoading(true);
    setPage((current) => Math.max(1, current - 1));
  }

  function handleNextPage() {
    if (!pagination) return;

    setLoading(true);
    setPage((current) =>
      Math.min(pagination.pages, current + 1)
    );
  }

  if (!restaurantId) {
    return (
      <section className="rounded-[28px] border border-[#e2e9df] bg-[#fffefa] p-6 text-[#173d2b]">
        <h2 className="text-xl font-semibold">
          Guest reviews
        </h2>
        <p className="mt-2 text-sm text-[#52665a]">
          Choose a restaurant to see its reviews.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="public-reviews-title"
      className="rounded-[28px] border border-[#e2e9df] bg-[#fffefa] p-5 text-[#173d2b] shadow-sm shadow-emerald-950/[0.03] sm:p-7 lg:p-8"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-[#e9eee7] pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#66806e]">
            From the table
          </p>

          <h2
            id="public-reviews-title"
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Words from our guests
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#52665a]">
            Real experiences from people who have enjoyed a
            meal here.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e2e9df] bg-[#faf8f2] px-3.5 py-2 text-sm font-semibold text-[#52665a]">
          <span
            className="grid h-7 w-7 place-items-center rounded-full bg-[#e8efe4] text-[#315c40]"
            aria-hidden="true"
          >
            ✦
          </span>

          {pagination
            ? `${pagination.total} ${
                pagination.total === 1 ? "review" : "reviews"
              }`
            : "Guest reviews"}
        </div>
      </div>

      {loading ? (
        <div
          className="space-y-3 pt-5"
          aria-live="polite"
          aria-label="Loading reviews"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-[#e9eee7] p-5"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-[#eef3e9]" />

                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-[#eef3e9]" />
                  <div className="h-3 w-20 rounded bg-[#f3f5f0]" />
                </div>
              </div>

              <div className="mt-4 h-3 w-full rounded bg-[#f3f5f0]" />
              <div className="mt-2 h-3 w-3/4 rounded bg-[#f3f5f0]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          className="mt-5 rounded-2xl border border-[#ead9c6] bg-[#fcf6ed] p-5"
          role="alert"
        >
          <p className="font-semibold text-[#6f4522]">
            We could not bring the reviews in.
          </p>

          <p className="mt-1 text-sm leading-6 text-[#795f46]">
            {error}
          </p>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#173d2b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24543a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c9d7b] focus-visible:ring-offset-2"
          >
            Try again
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#cfdacb] bg-[#faf8f2] px-5 py-10 text-center">
          <div
            className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8efe4] text-2xl text-[#315c40]"
            aria-hidden="true"
          >
            ♡
          </div>

          <h3 className="mt-4 text-lg font-semibold text-[#173d2b]">
            The first kind word is still waiting
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#52665a]">
            There are no reviews yet. After a completed order,
            guests can share what they loved about their meal.
          </p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-[#e9eee7]">
            {reviews.map((review) => {
              const displayName =
                review.customer?.name?.trim() ||
                "NutriMeals guest";

              return (
                <li
                  key={review.id}
                  className="py-5 first:pt-5 last:pb-1"
                >
                  <article className="flex gap-3.5 sm:gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e8efe4] text-sm font-bold text-[#315c40] ring-1 ring-inset ring-[#d8e4d3]">
                      {getInitials(displayName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-[#173d2b]">
                            {displayName}
                          </h3>

                          <time
                            dateTime={review.created_at}
                            className="mt-1 block text-xs text-[#809087]"
                          >
                            {formatReviewDate(review.created_at)}
                          </time>
                        </div>

                        <div className="w-fit rounded-full bg-[#faf8f2] px-2.5 py-1">
                          <Stars rating={review.rating} />
                        </div>
                      </div>

                      {review.comment ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#52665a]">
                          {review.comment}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm italic text-[#809087]">
                          Left a rating without a written comment.
                        </p>
                      )}

                      <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#66806e]">
                        <span aria-hidden="true">✓</span>
                        Guest review
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

          {pagination && pagination.pages > 1 && (
            <nav
              aria-label="Review pages"
              className="mt-5 flex flex-col gap-3 border-t border-[#e9eee7] pt-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-[#809087]">
                Page{" "}
                <span className="font-semibold text-[#173d2b]">
                  {pagination.page}
                </span>{" "}
                of {pagination.pages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviousPage}
                  disabled={page <= 1 || loading}
                  className="rounded-xl border border-[#dce5da] bg-white px-4 py-2.5 text-sm font-semibold text-[#315c40] transition hover:bg-[#f2f6ef] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={page >= pagination.pages || loading}
                  className="rounded-xl bg-[#173d2b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#24543a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next page
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </section>
  );
}