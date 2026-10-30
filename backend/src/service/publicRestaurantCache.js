import redis from "../config/redis.js";

// ✅ CHANGED: 1 Hour TTL (60 minutes * 60 seconds)
export const PUBLIC_RESTAURANT_CACHE_TTL_SECONDS = 60 * 60; 
const CACHE_PREFIX = "public:marketplace:v1";

export const publicRestaurantCacheKeys = {
  list(page, limit) {
    return `${CACHE_PREFIX}:restaurants:list:${page}:${limit}`;
  },
  detail(restaurantId) {
    return `${CACHE_PREFIX}:restaurants:detail:${restaurantId}`;
  },
  menu(restaurantId) {
    return `${CACHE_PREFIX}:restaurants:menu:${restaurantId}`;
  },
  reviews(restaurantId, page, limit) {
    return `${CACHE_PREFIX}:restaurants:reviews:${restaurantId}:${page}:${limit}`;
  },
};

/**
 * Read only while Redis is ready. A Redis failure must not break public pages;
 * callers treat null as a cache miss and fall back to PostgreSQL.
 */
export async function getPublicCache(key) {
  try {
    if (redis.status !== "ready") return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      await redis.del(key).catch(() => {});
      return null;
    }
  } catch (error) {
    console.warn(`[public-cache] Redis read failed for ${key}:`, error.message);
    return null;
  }
}

/** Cache writes are best-effort. The database remains the source of truth. */
export async function setPublicCache(key, value) {
  try {
    if (redis.status !== "ready") return;
    await redis.set(
      key,
      JSON.stringify(value),
      "EX",
      PUBLIC_RESTAURANT_CACHE_TTL_SECONDS
    );
  } catch (error) {
    console.warn(`[public-cache] Redis write failed for ${key}:`, error.message);
  }
}

/**
 * Clear all public restaurant cache keys after a restaurant/menu/review change.
 * SCAN avoids blocking Redis like KEYS would. Failures are logged and ignored;
 * requests can still be served from PostgreSQL.
 */
export async function invalidatePublicRestaurantCache() {
  try {
    if (redis.status !== "ready") return;

    let cursor = "0";
    const keysToDelete = [];
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${CACHE_PREFIX}:*`,
        "COUNT",
        100
      );
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== "0");

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }
  } catch (error) {
    console.warn("[public-cache] Redis invalidation failed:", error.message);
  }
}