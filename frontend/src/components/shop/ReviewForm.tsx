"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Star } from "lucide-react";
import { createReview } from "../../api/api";

type ReviewOrderFormProps = {
  orderId: string;
  restaurantName: string;
  onSubmitted?: () => void;
};

export default function ReviewOrderForm({
  orderId,
  restaurantName,
  onSubmitted,
}: ReviewOrderFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      setError("Please select a rating from 1 to 5.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createReview({
        order_id: orderId,
        rating,
        comment: comment.trim(),
      });

      setSubmitted(true);
      onSubmitted?.();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't submit your review. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="rounded-[28px] border border-[#d9e5d4] bg-[#fffefa] p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf4e9] text-[#315c40]">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#173d2b]">
              Review submitted!
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#52665a]">
              Thank you for sharing your experience with{" "}
              {restaurantName}.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#e2e9df] bg-[#fffefa] shadow-sm">
      <div className="border-b border-[#e8ede4] bg-[#f3f6ee] px-5 py-5 sm:px-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#66806e]">
          Your experience matters
        </p>

        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#173d2b]">
          How was your meal?
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#52665a]">
          Tell us about your experience with {restaurantName}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">
        <fieldset>
          <legend className="text-sm font-semibold text-[#173d2b]">
            Your rating
          </legend>

          <div className="mt-3 flex items-center gap-2">
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1;
              const selected = value <= rating;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  disabled={submitting}
                  aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                  aria-pressed={rating === value}
                  className="rounded-lg p-1 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66806e] disabled:cursor-not-allowed"
                >
                  <Star
                    className={`h-8 w-8 ${
                      selected
                        ? "fill-[#d9a441] text-[#d9a441]"
                        : "text-[#cbd5c8]"
                    }`}
                  />
                </button>
              );
            })}

            <span className="ml-2 text-sm font-medium text-[#52665a]">
              {rating}/5
            </span>
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="review-comment"
            className="block text-sm font-semibold text-[#173d2b]"
          >
            Your comments
            <span className="ml-2 font-normal text-[#809087]">
              (optional)
            </span>
          </label>

          <textarea
            id="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What did you enjoy? Tell other customers about your meal..."
            rows={4}
            maxLength={1000}
            disabled={submitting}
            className="mt-3 w-full resize-y rounded-2xl border border-[#dce5da] bg-white px-4 py-3 text-sm leading-6 text-[#173d2b] outline-none transition placeholder:text-[#96a398] focus:border-[#66806e] focus:ring-2 focus:ring-[#66806e]/15 disabled:opacity-60"
          />

          <p className="mt-2 text-right text-xs text-[#809087]">
            {comment.length}/1000
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#ead9c6] bg-[#fcf1e4] px-4 py-3 text-sm leading-6 text-[#8a5a24]"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24543a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#66806e] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Submitting review...
            </>
          ) : (
            "Submit review"
          )}
        </button>
      </form>
    </section>
  );
}