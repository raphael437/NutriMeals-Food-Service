
"use client";

import type { StoredCartItem } from "../../lib/cartStorage";

type CartLineProps = {
  line: StoredCartItem;
  onQuantityChange: (itemId: string, delta: number) => void;
  onRemove: (itemId: string) => void;
};

export default function CartLine({
  line,
  onQuantityChange,
  onRemove,
}: CartLineProps) {
  const price = Number(line.price) || 0;
  const calories = Number(line.calories);

  return (
    <article className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm sm:p-5">
      {line.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={line.image_url}
          alt={line.name}
          loading="lazy"
          className="h-24 w-24 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28"
        />
      ) : (
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-3xl sm:h-28 sm:w-28"
          aria-hidden="true"
        >
          🥗
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-bold text-[#18392C]">{line.name}</h3>

          <p className="shrink-0 font-bold text-emerald-800">
            EGP {(price * line.quantity).toFixed(2)}
          </p>
        </div>

        {line.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">
            {line.description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-900">
            {Number.isFinite(calories) && calories > 0
              ? `${calories} kcal / serving`
              : "Calories not listed"}
          </span>

          {line.protein_g !== undefined ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
              Protein {Number(line.protein_g) || 0} g
            </span>
          ) : null}

          {line.carbs_g !== undefined ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
              Carbs {Number(line.carbs_g) || 0} g
            </span>
          ) : null}

          {line.fat_g !== undefined ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
              Fat {Number(line.fat_g) || 0} g
            </span>
          ) : null}

          {line.fiber_g !== undefined ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-700">
              Fiber {Number(line.fiber_g) || 0} g
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
          <div
            className="flex items-center gap-3"
            aria-label={`Quantity for ${line.name}`}
          >
            <button
              type="button"
              onClick={() => onQuantityChange(line.id, -1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 text-lg font-semibold text-[#18392C] transition hover:border-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              aria-label={`Remove one ${line.name}`}
            >
              −
            </button>

            <span className="min-w-5 text-center text-sm font-bold text-[#18392C]">
              {line.quantity}
            </span>

            <button
              type="button"
              onClick={() => onQuantityChange(line.id, 1)}
              disabled={line.quantity >= 99}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 text-lg font-semibold text-[#18392C] transition hover:border-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Add one ${line.name}`}
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(line.id)}
            className="text-sm font-semibold text-red-700 underline-offset-4 transition hover:text-red-900 hover:underline"
          >
            Remove item
          </button>
        </div>
      </div>
    </article>
  );
}
