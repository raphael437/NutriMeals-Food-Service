
"use client";

import type { Address } from "../../api/api";
import type { StoredCartItem } from "../../lib/cartStorage";

type CartSummaryProps = {
  items: StoredCartItem[];
  restaurantName: string;
  selectedAddress: Address | null;
  orderNotes: string;
  dailyCalorieGoal: number;
  itemCount: number;
  disabled?: boolean;
  loading?: boolean;
  onCheckout: () => void;
};

type NutritionLine = StoredCartItem & {
  calories?: number;
  protein_g?: number | string;
  carbs_g?: number | string;
  fat_g?: number | string;
  fiber_g?: number | string;
};

export default function CartSummary({
  items,
  restaurantName,
  selectedAddress,
  orderNotes,
  dailyCalorieGoal,
  itemCount,
  disabled = false,
  loading = false,
  onCheckout,
}: CartSummaryProps) {
  const totals = items.reduce(
    (result, sourceLine) => {
      const item = sourceLine as NutritionLine;
      const quantity = Number(item.quantity) || 0;

      result.calories += (Number(item.calories) || 0) * quantity;
      result.protein += (Number(item.protein_g) || 0) * quantity;
      result.carbs += (Number(item.carbs_g) || 0) * quantity;
      result.fat += (Number(item.fat_g) || 0) * quantity;
      result.fiber += (Number(item.fiber_g) || 0) * quantity;
      result.subtotal += (Number(item.price) || 0) * quantity;

      return result;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      subtotal: 0,
    },
  );

  const calorieGoal = Math.max(
    1,
    Number(dailyCalorieGoal) || 2000,
  );

  const caloriePercent = Math.min(
    100,
    Math.round((totals.calories / calorieGoal) * 100),
  );

  return (
    <aside
      className="rounded-2xl border border-stone-200 bg-white p-5 text-[#18392C] shadow-sm sm:p-6"
      aria-labelledby="cart-summary-heading"
    >
      {/* Summary heading */}
      <div className="border-b border-stone-100 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          Almost there
        </p>

        <h2
          id="cart-summary-heading"
          className="mt-2 text-2xl font-bold tracking-tight"
        >
          Checkout summary
        </h2>

        {restaurantName ? (
          <p className="mt-2 text-sm text-stone-600">
            Your order from{" "}
            <span className="font-semibold text-[#18392C]">
              {restaurantName}
            </span>
          </p>
        ) : null}
      </div>

      {/* Meal breakdown */}
      <section
        className="pt-5"
        aria-labelledby="summary-order-heading"
      >
        <div className="flex items-center justify-between gap-3">
          <h3
            id="summary-order-heading"
            className="font-bold text-[#18392C]"
          >
            Your meals
          </h3>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="mt-4 rounded-xl bg-[#FAF9F6] p-4 text-center">
            <span className="text-2xl" aria-hidden="true">
              🥗
            </span>

            <p className="mt-2 text-sm leading-6 text-stone-600">
              Your cart is empty. Browse restaurants to discover your next
              favorite meal.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {items.map((sourceLine) => {
              const item = sourceLine as NutritionLine;
              const quantity = Number(item.quantity) || 0;
              const price = Number(item.price) || 0;
              const calories = Number(item.calories) || 0;

              return (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold leading-5 text-[#18392C]">
                      {item.name}
                    </p>

                    <p className="mt-1 text-xs text-stone-500">
                      {quantity} × EGP {price.toFixed(2)}
                    </p>

                    <p className="mt-1 text-xs text-emerald-800">
                      {calories > 0
                        ? `${(calories * quantity).toLocaleString()} kcal total`
                        : "Nutrition data unavailable"}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-bold text-[#18392C]">
                    EGP {(price * quantity).toFixed(2)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Nutrition breakdown */}
      <section
        className="mt-6 border-t border-stone-100 pt-5"
        aria-labelledby="summary-nutrition-heading"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              id="summary-nutrition-heading"
              className="font-bold text-[#18392C]"
            >
              Nutrition snapshot
            </h3>

            <p className="mt-1 text-xs text-stone-500">
              Nutrients across your selected meals
            </p>
          </div>

          <span className="shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
            {totals.calories.toLocaleString()} kcal
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-stone-600">
            <span>Daily calorie target</span>
            <span className="font-semibold text-[#18392C]">
              {calorieGoal.toLocaleString()} kcal
            </span>
          </div>

          <div
            className="h-2.5 overflow-hidden rounded-full bg-stone-100"
            role="progressbar"
            aria-label="Cart calories as a portion of daily calorie target"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={caloriePercent}
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${caloriePercent}%` }}
            />
          </div>

          <p className="mt-2 text-xs leading-5 text-stone-500">
            {caloriePercent}% of your entered target. This compares the
            selected meals with your target; it does not track food consumed.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-800">
              Protein
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-950">
              {totals.protein.toFixed(1)} g
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-800">
              Carbs
            </p>
            <p className="mt-1 text-lg font-bold text-amber-950">
              {totals.carbs.toFixed(1)} g
            </p>
          </div>

          <div className="rounded-xl bg-sky-50 p-3">
            <p className="text-xs font-medium text-sky-800">
              Fat
            </p>
            <p className="mt-1 text-lg font-bold text-sky-950">
              {totals.fat.toFixed(1)} g
            </p>
          </div>

          <div className="rounded-xl bg-violet-50 p-3">
            <p className="text-xs font-medium text-violet-800">
              Fiber
            </p>
            <p className="mt-1 text-lg font-bold text-violet-950">
              {totals.fiber.toFixed(1)} g
            </p>
          </div>
        </div>

        {items.length > 0 && totals.calories === 0 ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Nutrition values have not been provided for these meals yet.
            Check the menu for updates.
          </p>
        ) : null}
      </section>

      {/* Delivery details */}
      <section
        className="mt-6 border-t border-stone-100 pt-5"
        aria-labelledby="summary-delivery-heading"
      >
        <h3
          id="summary-delivery-heading"
          className="font-bold text-[#18392C]"
        >
          Delivery details
        </h3>

        {selectedAddress ? (
          <div className="mt-3 rounded-xl bg-[#FAF9F6] p-3">
            <p className="font-semibold text-[#18392C]">
              {selectedAddress.label || "Delivery address"}
            </p>

            <p className="mt-1 text-sm leading-5 text-stone-600">
              {selectedAddress.line1}
            </p>

            <p className="text-sm leading-5 text-stone-600">
              {selectedAddress.city}
            </p>
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-900">
            Select or add a delivery address before placing your order.
          </p>
        )}

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Delivery instructions
          </p>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-stone-600">
            {orderNotes.trim() || "No delivery instructions added."}
          </p>
        </div>
      </section>

      {/* Payment summary */}
      <section
        className="mt-6 border-t border-stone-100 pt-5"
        aria-label="Price summary"
      >
        <div className="flex items-center justify-between text-sm text-stone-600">
          <span>Total quantity</span>
          <span className="font-semibold text-[#18392C]">
            {itemCount}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-bold text-[#18392C]">
            Meal subtotal
          </span>

          <span className="text-xl font-bold text-emerald-800">
            EGP {totals.subtotal.toFixed(2)}
          </span>
        </div>

        <p className="mt-2 text-xs leading-5 text-stone-500">
          Delivery charges, when applicable, and the final payable amount
          are calculated by the backend.
        </p>
      </section>

      {/* Checkout action */}
      <button
        type="button"
        onClick={onCheckout}
        disabled={disabled || loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
      >
        {loading ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
            Preparing checkout…
          </>
        ) : (
          "Checkout with Paymob"
        )}
      </button>

      <p className="mt-4 text-center text-xs leading-5 text-stone-500">
        Nutrition information is provided for reference. Confirm meal
        ingredients and nutrition with the restaurant when needed.
      </p>
    </aside>
  );
}
