import { prisma } from "../config/db.js";

const DEFAULT_CALORIE_GOAL = 2000;
const MIN_CALORIE_GOAL = 500;
const MAX_CALORIE_GOAL = 8000;

function parseOptionalMacro(value, fieldName) {
  if (value === undefined) return { valid: true, value: undefined };
  if (value === null || value === "") return { valid: true, value: null };

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000) {
    return {
      valid: false,
      message: `${fieldName} must be a number between 0 and 1000 grams, or null.`,
    };
  }

  return { valid: true, value: parsed.toFixed(2) };
}

const profileSelect = {
  id: true,
  user_id: true,
  daily_calorie_goal: true,
  protein_goal_g: true,
  carbs_goal_g: true,
  fat_goal_g: true,
  created_at: true,
  updated_at: true,
};

/** GET /api/customer/nutrition-profile */
export async function getMyNutritionProfile(req, res, next) {
  try {
    const profile = await prisma.nutritionProfile.upsert({
      where: { user_id: req.user.id },
      create: {
        user_id: req.user.id,
        daily_calorie_goal: DEFAULT_CALORIE_GOAL,
      },
      update: {},
      select: profileSelect,
    });

    return res.status(200).json({ profile });
  } catch (error) {
    return next(error);
  }
}

/** PUT /api/customer/nutrition-profile */
export async function updateMyNutritionProfile(req, res, next) {
  try {
    const {
      daily_calorie_goal,
      protein_goal_g,
      carbs_goal_g,
      fat_goal_g,
    } = req.body ?? {};

    if (
      !Number.isInteger(Number(daily_calorie_goal)) ||
      Number(daily_calorie_goal) < MIN_CALORIE_GOAL ||
      Number(daily_calorie_goal) > MAX_CALORIE_GOAL
    ) {
      return res.status(400).json({
        message: `daily_calorie_goal must be an integer between ${MIN_CALORIE_GOAL} and ${MAX_CALORIE_GOAL}.`,
      });
    }

    const protein = parseOptionalMacro(protein_goal_g, "protein_goal_g");
    const carbs = parseOptionalMacro(carbs_goal_g, "carbs_goal_g");
    const fat = parseOptionalMacro(fat_goal_g, "fat_goal_g");
    const invalidMacro = [protein, carbs, fat].find((result) => !result.valid);
    if (invalidMacro) {
      return res.status(400).json({ message: invalidMacro.message });
    }

    const update = { daily_calorie_goal: Number(daily_calorie_goal) };
    if (protein.value !== undefined) update.protein_goal_g = protein.value;
    if (carbs.value !== undefined) update.carbs_goal_g = carbs.value;
    if (fat.value !== undefined) update.fat_goal_g = fat.value;

    const profile = await prisma.nutritionProfile.upsert({
      where: { user_id: req.user.id },
      create: {
        user_id: req.user.id,
        daily_calorie_goal: Number(daily_calorie_goal),
        protein_goal_g: protein.value ?? null,
        carbs_goal_g: carbs.value ?? null,
        fat_goal_g: fat.value ?? null,
      },
      update,
      select: profileSelect,
    });

    return res.status(200).json({ message: "Nutrition goals saved.", profile });
  } catch (error) {
    return next(error);
  }
}
