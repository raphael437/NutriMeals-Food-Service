"use client";

export type MealNutritionFormValue = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size: string;
  ingredients: string;
  allergens: string[];
  dietary_tags: string[];
};

type MealNutritionFieldsProps = {
  value: MealNutritionFormValue;
  onChange: (next: MealNutritionFormValue) => void;
  disabled?: boolean;
};

export const emptyMealNutrition: MealNutritionFormValue = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  serving_size: "",
  ingredients: "",
  allergens: [],
  dietary_tags: [],
};

export default function MealNutritionFields({
  value,
  onChange,
  disabled = false,
}: MealNutritionFieldsProps) {
  function numberField(
    field: "calories" | "protein_g" | "carbs_g" | "fat_g" | "fiber_g",
    label: string,
    unit: string,
  ) {
    return (
      <label
        className="block text-sm font-medium text-gray-700"
        key={field}
      >
        {label} ({unit})

        <input
          type="number"
          min={0}
          step={field === "calories" ? 1 : 0.1}
          value={value[field]}
          disabled={disabled}
          required={
            field === "calories" ||
            field === "protein_g" ||
            field === "carbs_g" ||
            field === "fat_g"
          }
          onChange={(event) =>
            onChange({
              ...value,
              [field]: Number(event.target.value),
            })
          }
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950"
        />
      </label>
    );
  }

  return (
    <fieldset
      disabled={disabled}
      className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
    >
      <legend className="px-1 text-sm font-bold text-emerald-900">
        Nutrition per serving
      </legend>

      <div className="grid gap-3 sm:grid-cols-2">
        {numberField("calories", "Calories", "kcal")}
        {numberField("protein_g", "Protein", "g")}
        {numberField("carbs_g", "Carbohydrates", "g")}
        {numberField("fat_g", "Fat", "g")}
        {numberField("fiber_g", "Fiber", "g")}
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Serving size

        <input
          value={value.serving_size}
          onChange={(event) =>
            onChange({
              ...value,
              serving_size: event.target.value,
            })
          }
          placeholder="e.g. 350 g bowl"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950"
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Ingredients

        <textarea
          value={value.ingredients}
          onChange={(event) =>
            onChange({
              ...value,
              ingredients: event.target.value,
            })
          }
          rows={2}
          placeholder="List the meal ingredients"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950"
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Allergens (comma separated)

        <input
          value={value.allergens.join(", ")}
          onChange={(event) =>
            onChange({
              ...value,
              allergens: event.target.value
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean),
            })
          }
          placeholder="e.g. milk, sesame"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950"
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Dietary tags (comma separated)

        <input
          value={value.dietary_tags.join(", ")}
          onChange={(event) =>
            onChange({
              ...value,
              dietary_tags: event.target.value
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean),
            })
          }
          placeholder="e.g. high-protein, vegetarian"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-950"
        />
      </label>

      <p className="text-xs leading-5 text-gray-600">
        Enter verified values for one serving. Do not estimate nutrition
        or allergen information if you cannot verify it.
      </p>
    </fieldset>
  );
}