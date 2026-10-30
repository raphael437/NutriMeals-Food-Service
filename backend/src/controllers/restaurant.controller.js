import { prisma } from "../config/db.js";
import {
  getPublicCache,
  setPublicCache,
  publicRestaurantCacheKeys,
} from "../service/publicRestaurantCache.js";

function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

/** Return the approved public restaurant listing with pagination. */
export async function listApprovedRestaurants(req, res, next) {
  try {
    const { page, limit, skip } = pagination(req.query);
    const cacheKey = publicRestaurantCacheKeys.list(page, limit);
    const cached = await getPublicCache(cacheKey);
    if (cached !== null) return res.json(cached);

    const where = { status: "APPROVED" };

    // These are independent read-only queries. Run them without an explicit
    // interactive/array transaction so a slow transaction startup cannot
    // prevent the public listing from loading. Run sequentially to reduce
    // pressure on a small PostgreSQL connection pool.
    const items = await prisma.restaurant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        is_open: true,
        cover_image: true,
        created_at: true,
        _count: { select: { reviews: true } },
      },
    });

    const total = await prisma.restaurant.count({ where });

    const response = {
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };

    await setPublicCache(cacheKey, response);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
}

/** Return one approved restaurant's public details. */
export async function getApprovedRestaurant(req, res, next) {
  try {
    const restaurantId = req.params.restaurantId;
    const cacheKey = publicRestaurantCacheKeys.detail(restaurantId);
    const cached = await getPublicCache(cacheKey);
    if (cached !== null) return res.json(cached);

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, status: "APPROVED" },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        is_open: true,
        cover_image: true,
        created_at: true,
        _count: { select: { reviews: true, menu_items: true } },
      },
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    const response = { restaurant };
    await setPublicCache(cacheKey, response);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
}

/** Return available menu items for one approved restaurant. */
export async function getPublicMenu(req, res, next) {
  try {
    const restaurantId = req.params.restaurantId;
    const cacheKey = publicRestaurantCacheKeys.menu(restaurantId);
    const cached = await getPublicCache(cacheKey);
    if (cached !== null) return res.json(cached);

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, status: "APPROVED" },
      select: { id: true, name: true },
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    const items = await prisma.menuItem.findMany({
      where: { restaurant_id: restaurant.id, is_available: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const response = { restaurant, items };
    await setPublicCache(cacheKey, response);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
}

/** Return public reviews for one approved restaurant with pagination. */
export async function getPublicReviews(req, res, next) {
  try {
    const restaurantId = req.params.restaurantId;
    const { page, limit, skip } = pagination(req.query);
    const cacheKey = publicRestaurantCacheKeys.reviews(restaurantId, page, limit);
    const cached = await getPublicCache(cacheKey);
    if (cached !== null) return res.json(cached);

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, status: "APPROVED" },
      select: { id: true },
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    const where = { restaurant_id: restaurant.id };

    // Same fix as the restaurant listing: independent reads, no transaction.
    const reviews = await prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: { customer: { select: { id: true, name: true } } },
    });

    const total = await prisma.review.count({ where });

    const response = {
      data: reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };

    await setPublicCache(cacheKey, response);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
}
