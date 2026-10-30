"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  LoaderCircle,
  Utensils,
} from "lucide-react";
import { getMenu, type MenuItem } from "../../api/api";

type MenuCategoryProps = {
  restaurantId: string;
  category: string;
};

function normalizeCategory(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

function formatPrice(price: number | string) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
}

function formatGrams(value: number | string | undefined) {
  if (value === undefined || value === null || value === "") return null;

  const amount = Number(value);

  return Number.isFinite(amount) ? `${amount.toLocaleString()} g` : null;
}

export default function MenuCategory({
  restaurantId,
  category,
}: MenuCategoryProps) {
  const [restaurantName, setRestaurantName] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMenu(restaurantId)
      .then((result) => {
        if (cancelled) return;

        setRestaurantName(result.restaurant.name);

        setItems(
          result.items.filter(
            (item) =>
              item.is_available &&
              normalizeCategory(item.category) ===
                normalizeCategory(category)
          )
        );

        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load this menu category."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId, category]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-64 max-w-7xl items-center justify-center gap-3 px-4 py-12 text-[#617267]">
        <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
        <p className="text-sm">Loading menu...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm leading-6 text-red-800"
        >
          {error}
        </div>

        <Link
          href={`/restaurants/${encodeURIComponent(restaurantId)}`}
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to restaurant
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-4 py-10 text-[#183b2b] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/restaurants/${encodeURIComponent(restaurantId)}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {restaurantName}
        </Link>

        <header className="mb-8 mt-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            {restaurantName}
          </p>

          <h1 className="mt-3 text-3xl font-semibold capitalize tracking-tight sm:text-4xl">
            {category.replace(/[-_]+/g, " ")}
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-[#617267]">
            Explore available meals and review their price and nutrition
            information before ordering.
          </p>
        </header>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-[#e2e9df] bg-white p-8 text-center sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
              <Utensils className="h-6 w-6" />
            </div>

            <h2 className="mt-4 text-xl font-semibold">No meals found</h2>

            <p className="mt-2 text-sm leading-6 text-[#617267]">
              There are currently no available meals in this category.
            </p>

            <Link
              href={`/restaurants/${encodeURIComponent(restaurantId)}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Browse restaurant menu
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const calories = Number(item.calories ?? 0);
              const protein = formatGrams(item.protein_g);
              const carbs = formatGrams(item.carbs_g);
              const fat = formatGrams(item.fat_g);

              return (
                <article
                  key={item.id}
                  className="group overflow-hidden rounded-2xl border border-[#e2e9df] bg-white transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/5"
                >
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="h-52 w-full bg-[#eef3e9] object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-[#eef3e9] text-emerald-800">
                      <Utensils className="h-10 w-10" />
                    </div>
                  )}

                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      {item.category || "Meal"}
                    </p>

                    <h2 className="mt-2 text-lg font-semibold text-[#183b2b]">
                      {item.name}
                    </h2>

                    {item.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#617267]">
                        {item.description}
                      </p>
                    )}

                    {calories > 0 && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#eef3e9] px-3 py-1.5 text-xs font-semibold text-emerald-900">
                        <Flame className="h-4 w-4" />
                        {calories.toLocaleString()} kcal / serving
                      </div>
                    )}

                    {(protein || carbs || fat) && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {[
                          { label: "Protein", value: protein },
                          { label: "Carbs", value: carbs },
                          { label: "Fat", value: fat },
                        ]
                          .filter((macro) => macro.value !== null)
                          .map((macro) => (
                            <div
                              key={macro.label}
                              className="rounded-lg bg-[#f7f8f4] p-2"
                            >
                              <p className="text-[10px] text-[#809087]">
                                {macro.label}
                              </p>
                              <p className="mt-1 text-xs font-semibold">
                                {macro.value}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e9eee7] pt-4">
                      <p className="font-semibold text-[#183b2b]">
                        {formatPrice(item.price)}
                      </p>

                      <Link
                        href={`/restaurants/${encodeURIComponent(restaurantId)}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
                      >
                        View menu
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}