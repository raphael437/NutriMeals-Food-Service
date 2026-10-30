import { prisma } from "../config/db.js";
import { invalidatePublicRestaurantCache } from "../service/publicRestaurantCache.js";

function normalizeNullableText(value, fieldName) {
  if (value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== "string") {
    return {
      valid: false,
      message: `${fieldName} must be text or null.`,
    };
  }

  return {
    valid: true,
    value: value.trim() || null,
  };
}

function normalizeStringList(value, fieldName) {
  if (value === undefined) {
    return { valid: true, value: undefined };
  }

  if (value === null) {
    return { valid: true, value: [] };
  }

  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : null;

  if (!values || values.some((entry) => typeof entry !== "string")) {
    return {
      valid: false,
      message:
        `${fieldName} must be an array of strings or comma-separated text.`,
    };
  }

  const normalized = [
    ...new Set(
      values.map((entry) => entry.trim()).filter(Boolean)
    ),
  ];

  return { valid: true, value: normalized };
}

function normalizeNutrition(body, { partial = false } = {}) {
  const data = {};

  const numberFields = [
    { key: "calories", integer: true, max: 20000 },
    { key: "protein_g", integer: false, max: 5000 },
    { key: "carbs_g", integer: false, max: 5000 },
    { key: "fat_g", integer: false, max: 5000 },
    { key: "fiber_g", integer: false, max: 5000 },
  ];

  for (const field of numberFields) {
    const supplied = Object.prototype.hasOwnProperty.call(
      body,
      field.key
    );

    if (partial && !supplied) continue;

    const raw = supplied ? body[field.key] : 0;
    const value = raw === "" ? Number.NaN : Number(raw);

    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > field.max ||
      (field.integer && !Number.isInteger(value))
    ) {
      return {
        valid: false,
        message: field.integer
          ? `${field.key} must be a whole number between 0 and ${field.max}.`
          : `${field.key} must be a number between 0 and ${field.max} grams.`,
      };
    }

    data[field.key] = field.integer
      ? value
      : value.toFixed(2);
  }

  for (const field of ["serving_size", "ingredients"]) {
    const supplied = Object.prototype.hasOwnProperty.call(
      body,
      field
    );

    if (partial && !supplied) continue;

    const result = normalizeNullableText(
      supplied ? body[field] : null,
      field
    );

    if (!result.valid) return result;

    data[field] = result.value;
  }

  for (const field of ["allergens", "dietary_tags"]) {
    const supplied = Object.prototype.hasOwnProperty.call(
      body,
      field
    );

    if (partial && !supplied) continue;

    const result = normalizeStringList(
      supplied ? body[field] : [],
      field
    );

    if (!result.valid) return result;

    data[field] = result.value;
  }

  return { valid: true, data };
}

function normalizeBaseFields(body, { partial = false } = {}) {
  const data = {};

  for (const field of ["name", "category"]) {
    const supplied = Object.prototype.hasOwnProperty.call(
      body,
      field
    );

    if (partial && !supplied) continue;

    const value = body[field];

    if (typeof value !== "string" || !value.trim()) {
      return {
        valid: false,
        message:
          `${field} is required and must be non-empty text.`,
      };
    }

    if (value.trim().length > 120) {
      return {
        valid: false,
        message: `${field} must not exceed 120 characters.`,
      };
    }

    data[field] = value.trim();
  }

  const priceSupplied = Object.prototype.hasOwnProperty.call(
    body,
    "price"
  );

  if (!partial || priceSupplied) {
    const price = Number(body.price);

    if (
      !Number.isFinite(price) ||
      price < 0.01 ||
      price > 99999999.99
    ) {
      return {
        valid: false,
        message:
          "price must be a positive amount no greater than 99,999,999.99.",
      };
    }

    data.price = price.toFixed(2);
  }

  for (const field of ["description", "image_url"]) {
    const supplied = Object.prototype.hasOwnProperty.call(
      body,
      field
    );

    if (!supplied) continue;

    if (body[field] === null) {
      data[field] = null;
      continue;
    }

    if (typeof body[field] !== "string") {
      return {
        valid: false,
        message: `${field} must be text or null.`,
      };
    }

    data[field] = body[field].trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, "is_available")) {
    if (typeof body.is_available !== "boolean") {
      return {
        valid: false,
        message: "is_available must be a boolean.",
      };
    }

    data.is_available = body.is_available;
  } else if (!partial) {
    data.is_available = true;
  }

  return { valid: true, data };
}

async function findOwnedRestaurant(restaurantId, userId) {
  if (!restaurantId) return null;

  return prisma.restaurant.findFirst({
    where: {
      id: restaurantId,
      owner_id: userId,
    },
    select: {
      id: true,
      owner_id: true,
      status: true,
    },
  });
}

/** POST /api/restaurant-owner/restaurants/:restaurantId/menu-items */
export async function createMenuItem(req, res, next) {
  try {
    const restaurant = await findOwnedRestaurant(
      req.params.restaurantId,
      req.user.id
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    if (restaurant.status === "SUSPENDED") {
      return res.status(409).json({
        message:
          "A suspended restaurant cannot change its menu.",
      });
    }

    const body = req.body ?? {};

    const base = normalizeBaseFields(body);
    if (!base.valid) {
      return res.status(400).json({
        message: base.message,
      });
    }

    const nutrition = normalizeNutrition(body);
    if (!nutrition.valid) {
      return res.status(400).json({
        message: nutrition.message,
      });
    }

    const item = await prisma.menuItem.create({
      data: {
        restaurant_id: restaurant.id,
        ...base.data,
        ...nutrition.data,
      },
    });

    await invalidatePublicRestaurantCache();

    return res.status(201).json({
      message: "Meal created.",
      item,
    });
  } catch (error) {
    return next(error);
  }
}

/** GET /api/restaurant-owner/restaurants/:restaurantId/menu-items */
export async function getMyMenuItems(req, res, next) {
  try {
    const restaurant = await findOwnedRestaurant(
      req.params.restaurantId,
      req.user.id
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    const items = await prisma.menuItem.findMany({
      where: {
        restaurant_id: restaurant.id,
      },
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
}

/** PATCH /api/restaurant-owner/restaurants/:restaurantId/menu-items/:menuItemId */
export async function updateMenuItem(req, res, next) {
  try {
    const restaurant = await findOwnedRestaurant(
      req.params.restaurantId,
      req.user.id
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    if (restaurant.status === "SUSPENDED") {
      return res.status(409).json({
        message:
          "A suspended restaurant cannot change its menu.",
      });
    }

    const item = await prisma.menuItem.findFirst({
      where: {
        id: req.params.menuItemId,
        restaurant_id: restaurant.id,
      },
    });

    if (!item) {
      return res.status(404).json({
        message: "Meal not found.",
      });
    }

    const body = req.body ?? {};

    if (Object.keys(body).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    const base = normalizeBaseFields(body, {
      partial: true,
    });

    if (!base.valid) {
      return res.status(400).json({
        message: base.message,
      });
    }

    const nutrition = normalizeNutrition(body, {
      partial: true,
    });

    if (!nutrition.valid) {
      return res.status(400).json({
        message: nutrition.message,
      });
    }

    const data = {
      ...base.data,
      ...nutrition.data,
    };

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "No supported menu fields were provided.",
      });
    }

    const updated = await prisma.menuItem.update({
      where: { id: item.id },
      data,
    });

    await invalidatePublicRestaurantCache();

    return res.json({
      message: "Meal updated.",
      item: updated,
    });
  } catch (error) {
    return next(error);
  }
}

/** DELETE /api/restaurant-owner/restaurants/:restaurantId/menu-items/:menuItemId */
export async function deleteMenuItem(req, res, next) {
  try {
    const restaurant = await findOwnedRestaurant(
      req.params.restaurantId,
      req.user.id
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    const item = await prisma.menuItem.findFirst({
      where: {
        id: req.params.menuItemId,
        restaurant_id: restaurant.id,
      },
    });

    if (!item) {
      return res.status(404).json({
        message: "Meal not found.",
      });
    }

    // Soft-delete so historical OrderItem relations remain intact.
    const updated = await prisma.menuItem.update({
      where: { id: item.id },
      data: { is_available: false },
    });

    await invalidatePublicRestaurantCache();

    return res.json({
      message: "Meal removed from the public menu.",
      item: updated,
    });
  } catch (error) {
    return next(error);
  }
}