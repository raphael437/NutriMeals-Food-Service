"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createMenuItem,
  deleteMenuItem,
  getMyMenuItems,
  updateMenuItem,
  type CreateMenuItemInput,
  type MenuItem,
} from "../../api/api";
import MealNutritionFields, {
  emptyMealNutrition,
  type MealNutritionFormValue,
} from "./MealNutritionFields";

type RestaurantOwnerMenuManagerProps = {
  restaurantId: string;
};

type MenuFormState = {
  name: string;
  category: string;
  price: string;
  description: string;
  image_url: string;
  is_available: boolean;
};

const EMPTY_FORM: MenuFormState = {
  name: "",
  category: "",
  price: "",
  description: "",
  image_url: "",
  is_available: true,
};

function nutritionFromItem(item: MenuItem): MealNutritionFormValue {
  return {
    calories: Number(item.calories ?? 0),
    protein_g: Number(item.protein_g ?? 0),
    carbs_g: Number(item.carbs_g ?? 0),
    fat_g: Number(item.fat_g ?? 0),
    fiber_g: Number(item.fiber_g ?? 0),
    serving_size: item.serving_size ?? "",
    ingredients: item.ingredients ?? "",
    allergens: item.allergens ?? [],
    dietary_tags: item.dietary_tags ?? [],
  };
}

export default function RestaurantOwnerMenuManager({
  restaurantId,
}: RestaurantOwnerMenuManagerProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState<MenuFormState>(EMPTY_FORM);
  const [nutrition, setNutrition] =
    useState<MealNutritionFormValue>({ ...emptyMealNutrition });

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadMenuItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getMyMenuItems(restaurantId);
      setItems(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load the restaurant menu.",
      );
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);
useEffect(() => {
  let cancelled = false;

  getMyMenuItems(restaurantId)
    .then((result) => {
      if (!cancelled) {
        setItems(result);
      }
    })
    .catch((err: unknown) => {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load the restaurant menu.",
        );
      }
    })
    .finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

  return () => {
    cancelled = true;
  };
}, [restaurantId]);
  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setNutrition({ ...emptyMealNutrition });
    setEditingItemId(null);
    setError(null);
    setMessage(null);
  }

  function startEditing(item: MenuItem) {
    setEditingItemId(item.id);

    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      description: item.description ?? "",
      image_url: item.image_url ?? "",
      is_available: item.is_available,
    });

    // Nullable database text values are converted to empty strings.
    setNutrition(nutritionFromItem(item));

    setError(null);
    setMessage(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateForm(): string | null {
    if (!form.name.trim()) {
      return "Enter a meal name.";
    }

    if (!form.category.trim()) {
      return "Enter a meal category.";
    }

    const price = Number(form.price);

    if (!Number.isFinite(price) || price <= 0) {
      return "Enter a valid price greater than zero.";
    }

    if (
      !Number.isInteger(nutrition.calories) ||
      nutrition.calories <= 0
    ) {
      return "Enter verified calories per serving as a positive whole number.";
    }

    for (const [label, value] of [
      ["Protein", nutrition.protein_g],
      ["Carbohydrates", nutrition.carbs_g],
      ["Fat", nutrition.fat_g],
      ["Fiber", nutrition.fiber_g],
    ] as const) {
      if (!Number.isFinite(value) || value < 0) {
        return `${label} must be a non-negative number.`;
      }
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: CreateMenuItemInput = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: Number(form.price),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      is_available: form.is_available,

      // Include the nutrition values in both create and edit requests.
      calories: nutrition.calories,
      protein_g: nutrition.protein_g,
      carbs_g: nutrition.carbs_g,
      fat_g: nutrition.fat_g,
      fiber_g: nutrition.fiber_g,
      serving_size: nutrition.serving_size.trim() || null,
      ingredients: nutrition.ingredients.trim() || null,
      allergens: nutrition.allergens,
      dietary_tags: nutrition.dietary_tags,
    };

    setIsSubmitting(true);

    try {
      if (editingItemId) {
        const updatedItem = await updateMenuItem(
          restaurantId,
          editingItemId,
          payload,
        );

        setItems((current) =>
          current.map((item) =>
            item.id === updatedItem.id ? updatedItem : item,
          ),
        );

        setMessage("Meal and nutrition information updated successfully.");
      } else {
        const createdItem = await createMenuItem(
          restaurantId,
          payload,
        );

        setItems((current) => [createdItem, ...current]);

        setMessage("Meal created successfully.");
      }

      setForm({ ...EMPTY_FORM });
      setNutrition({ ...emptyMealNutrition });
      setEditingItemId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the meal. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: MenuItem) {
    const confirmed = window.confirm(
      `Remove "${item.name}" from the available menu?`,
    );

    if (!confirmed) return;

    setDeletingItemId(item.id);
    setError(null);
    setMessage(null);

    try {
      // The API marks the item unavailable rather than physically deleting it.
      const updatedItem = await deleteMenuItem(
        restaurantId,
        item.id,
      );

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === updatedItem.id
            ? updatedItem
            : currentItem,
        ),
      );

      if (editingItemId === item.id) {
        resetForm();
      }

      setMessage("Meal removed from the available menu.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove this meal.",
      );
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-sm font-semibold text-emerald-700">
            RESTAURANT MANAGEMENT
          </p>

          <h2 className="mt-1 text-2xl font-bold text-gray-950">
            {editingItemId ? "Edit meal" : "Add a meal"}
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Enter meal details and accurate nutrition values for one
            serving. These values are used on the public menu and in
            customers cart totals.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              Meal name

              <input
                required
                maxLength={120}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950"
                placeholder="e.g. Grilled chicken bowl"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Category

              <input
                required
                maxLength={120}
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950"
                placeholder="e.g. Lunch"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Price (EGP)

              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950"
                placeholder="150.00"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Image URL

              <input
                type="url"
                value={form.image_url}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    image_url: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950"
                placeholder="https://example.com/meal.jpg"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Description

            <textarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950"
              placeholder="Describe the meal."
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  is_available: event.target.checked,
                }))
              }
              className="h-4 w-4 accent-emerald-700"
            />
            Available for customers to order
          </label>

          <MealNutritionFields
            value={nutrition}
            onChange={setNutrition}
            disabled={isSubmitting}
          />

          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}

          {message ? (
            <p
              role="status"
              className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving meal…"
                : editingItemId
                  ? "Save meal changes"
                  : "Create meal"}
            </button>

            {editingItemId ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel editing
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-950">
              Your meals
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Edit nutrition details or remove a meal from your available
              menu.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadMenuItems()}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh menu"}
          </button>
        </div>

        {loading ? (
          <p className="mt-5 animate-pulse text-sm text-gray-500">
            Loading menu items…
          </p>
        ) : items.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">
            You have not added any meals yet. Use the form above to add
            your first meal.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-gray-100">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-950">
                      {item.name}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.is_available
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-600">
                    {item.category} · EGP {Number(item.price).toFixed(2)}
                  </p>

                  <p className="mt-2 text-sm text-emerald-800">
                    {Number(item.calories) > 0
                      ? `${item.calories} kcal per serving`
                      : "Verified calorie information not entered"}
                    {" · "}
                    Protein {Number(item.protein_g ?? 0)} g
                    {" · "}
                    Carbs {Number(item.carbs_g ?? 0)} g
                    {" · "}
                    Fat {Number(item.fat_g ?? 0)} g
                  </p>

                  {item.serving_size ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Serving size: {item.serving_size}
                    </p>
                  ) : null}

                  {item.description ? (
                    <p className="mt-2 max-w-2xl text-sm text-gray-600">
                      {item.description}
                    </p>
                  ) : null}

                  {item.dietary_tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.dietary_tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>

                  {item.is_available ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={deletingItemId === item.id}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingItemId === item.id
                        ? "Removing…"
                        : "Remove"}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}