import { prisma } from "../config/db.js";
import { invalidatePublicRestaurantCache } from "../service/publicRestaurantCache.js";
const OWNER_ORDER_STATUSES = [
  "placed",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const OWNER_ORDER_INCLUDE = {
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
  restaurant: {
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      cover_image: true,
    },
  },
  address: true,
  items: {
    include: {
      menu_item: {
        select: {
          id: true,
          name: true,
          image_url: true,
          price: true,
          calories: true,
          protein_g: true,
          carbs_g: true,
          fat_g: true,
          fiber_g: true,
          serving_size: true,
        },
      },
    },
  },
};

function getOwnerOrderPagination(query) {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);

  const page = Math.max(
    1,
    Number.isFinite(parsedPage) ? parsedPage : 1
  );

  const limit = Math.min(
    50,
    Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 10)
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

async function findOwnedRestaurant(req) {
  return prisma.restaurant.findFirst({
    where: {
      id: req.params.restaurantId,
      owner_id: req.user.id,
    },
    select: {
      id: true,
      name: true,
      owner_id: true,
      status: true,
    },
  });
}

/**
 * GET /api/restaurant-owner/restaurants/:restaurantId/orders
 *
 * Query parameters:
 *   page=1
 *   limit=10
 *   status=preparing (optional)
 */
export async function getIncomingOrders(req, res, next) {
  try {
    const restaurant = await findOwnedRestaurant(req);

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    const rawStatus = req.query.status;

    if (
      rawStatus !== undefined &&
      (
        typeof rawStatus !== "string" ||
        !OWNER_ORDER_STATUSES.includes(rawStatus)
      )
    ) {
      return res.status(400).json({
        message: "Invalid order status filter.",
      });
    }

    const { page, limit, skip } =
      getOwnerOrderPagination(req.query);

    const where = {
      restaurant_id: restaurant.id,
      ...(rawStatus ? { status: rawStatus } : {}),
    };

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { created_at: "desc" },
          { id: "desc" },
        ],
        include: OWNER_ORDER_INCLUDE,
      }),

      prisma.order.count({ where }),
    ]);

    return res.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/restaurant-owner/restaurants/:restaurantId/orders/:orderId/status
 *
 * Only permits the next valid operational transition.
 */
export async function updateOrderStatus(req, res, next) {
  try {
    const { restaurantId, orderId } = req.params;
    const userId = req.user?.id;
    const { status } = req.body ?? {};

    // Validate request
    if (!restaurantId || !orderId) {
      return res.status(400).json({
        message: "Restaurant ID and order ID are required.",
      });
    }

    if (!userId) {
      return res.status(401).json({
        message: "You must be logged in to update orders.",
      });
    }

    const validStatuses = [
      "confirmed",
      "preparing",
      "out_for_delivery",
      "delivered",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    // Verify that this restaurant belongs to the logged-in owner.
    // Do not depend on req.restaurant being set by middleware.
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        owner_id: userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found or you do not own this restaurant.",
      });
    }

    if (restaurant.status !== "APPROVED") {
      return res.status(403).json({
        message: "This restaurant is not approved to manage orders.",
      });
    }

    // Ensure the order belongs to this restaurant.
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurant_id: restaurant.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found for this restaurant.",
      });
    }

    // Only permit valid forward transitions.
    const allowedTransitions = {
      placed: ["confirmed"],
      confirmed: ["preparing"],
      preparing: ["out_for_delivery"],
      out_for_delivery: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    if (!allowedTransitions[order.status]?.includes(status)) {
      return res.status(409).json({
        message: `Cannot change order status from "${order.status}" to "${status}".`,
      });
    }

    // Update the order.
    const updatedOrder = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        address: true,
        items: {
          include: {
            menu_item: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Order status updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    return next(error);
  }
}
export async function listMyRestaurants(req, res, next) {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { owner_id: req.user.id },
      orderBy: { created_at: "desc" },
      include: {
        _count: { select: { menu_items: true, orders: true, reviews: true } },
        subscriptions: { orderBy: { created_at: "desc" }, take: 1, include: { plan: true } },
      },
    });
    return res.json({ restaurants });
  } catch (error) {
    return next(error);
  }
}

export async function createRestaurantApplication(req, res, next) {
  try {
    const name = (req.body.name ?? req.body.restaurantName ?? "").trim();
    const address = (req.body.address ?? req.body.restaurantAddress ?? "").trim();
    const description = typeof req.body.description === "string" ? req.body.description.trim() : null;
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : null;
    const cover_image = typeof req.body.cover_image === "string" ? req.body.cover_image.trim() : null;
    if (!name || !address) return res.status(400).json({ message: "Restaurant name and address are required." });

    const restaurant = await prisma.restaurant.create({
      data: {
        owner_id: req.user.id,
        name,
        address,
        description: description || null,
        phone: phone || null,
        cover_image: cover_image || null,
        status: "PENDING",
        is_open: false,
      },
    });
    await invalidatePublicRestaurantCache();
    return res.status(201).json({ message: "Restaurant application submitted for review.", restaurant });
  } catch (error) {
    return next(error);
  }
}

export async function getMyRestaurant(req, res, next) {
  try {
    const restaurant = req.restaurant ?? await prisma.restaurant.findFirst({
      where: { id: req.params.restaurantId, owner_id: req.user.id },
    });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    return res.json({ restaurant });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyRestaurant(req, res, next) {
  try {
    const restaurant = req.restaurant ?? await prisma.restaurant.findFirst({
      where: { id: req.params.restaurantId, owner_id: req.user.id },
    });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });

    const data = {};
    for (const field of ["name", "description", "address", "phone", "cover_image"]) {
      if (Object.hasOwn(req.body, field)) {
        const value = req.body[field];
        if (value !== null && typeof value !== "string") {
          return res.status(400).json({ message: `${field} must be a string or null.` });
        }
        data[field] = typeof value === "string" ? value.trim() : null;
      }
    }
    if (Object.hasOwn(req.body, "is_open")) {
      if (typeof req.body.is_open !== "boolean") return res.status(400).json({ message: "is_open must be a boolean." });
      if (restaurant.status !== "APPROVED" && req.body.is_open === true) {
        return res.status(403).json({ message: "Only approved restaurants can be opened to customers." });
      }
      data.is_open = restaurant.status === "APPROVED" ? req.body.is_open : false;
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ message: "No editable fields were provided." });

    const updated = await prisma.restaurant.update({ where: { id: restaurant.id }, data });
    await invalidatePublicRestaurantCache();
    return res.json({ message: "Restaurant updated.", restaurant: updated });
  } catch (error) {
    return next(error);
  }
}
export async function getDashboard(req, res, next) {
  try {
    // Always verify ownership against the authenticated user.
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: req.params.restaurantId,
        owner_id: req.user.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        is_open: true,
      },
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found.",
      });
    }

    const now = new Date();

    const activeSubscriptionWhere = {
      restaurant_id: restaurant.id,
      status: "active",
      AND: [
        {
          OR: [
            { starts_at: null },
            { starts_at: { lte: now } },
          ],
        },
        {
          OR: [
            { ends_at: null },
            { ends_at: { gte: now } },
          ],
        },
      ],
    };

    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      paidBalance,
      paidOrderCount,
      paidDeliveredSales,
      menuItems,
      activeSubscription,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count({
        where: { restaurant_id: restaurant.id },
      }),

      prisma.order.count({
        where: {
          restaurant_id: restaurant.id,
          status: {
            in: ["placed", "confirmed", "preparing"],
          },
        },
      }),

      prisma.order.count({
        where: {
          restaurant_id: restaurant.id,
          status: "delivered",
        },
      }),

      // All paid orders, regardless of delivery status.
      prisma.order.aggregate({
        where: {
          restaurant_id: restaurant.id,
          payment_status: "paid",
        },
        _sum: { total: true },
      }),

      prisma.order.count({
        where: {
          restaurant_id: restaurant.id,
          payment_status: "paid",
        },
      }),

      // Preserve the original delivered-and-paid metric.
      prisma.order.aggregate({
        where: {
          restaurant_id: restaurant.id,
          status: "delivered",
          payment_status: "paid",
        },
        _sum: { total: true },
      }),

      prisma.menuItem.count({
        where: { restaurant_id: restaurant.id },
      }),

      prisma.restaurantSubscription.findFirst({
        where: activeSubscriptionWhere,
        orderBy: { created_at: "desc" },
        include: { plan: true },
      }),

      prisma.order.findMany({
        where: { restaurant_id: restaurant.id },
        orderBy: { created_at: "desc" },
        take: 5,
        include: {
          customer: {
            select: { id: true, name: true },
          },
          items: true,
        },
      }),
    ]);

    return res.json({
      restaurant,
      metrics: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        menuItems,

        paidOrderBalance: Number(
          paidBalance._sum.total ?? 0
        ),

        paidOrderCount,

        // Retained for compatibility with the existing dashboard.
        paidDeliveredSales: Number(
          paidDeliveredSales._sum.total ?? 0
        ),
      },

      activeSubscription,
      recentOrders,

      note:
        "Paid order balance is gross paid order value. " +
        "Refunds, commissions, and payouts are not included.",
    });
  } catch (error) {
    return next(error);
  }
}
export async function getEarnings(req, res, next) {
  try {
    const restaurant = req.restaurant;
    const since = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const until = req.query.to ? new Date(req.query.to) : new Date();
    if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime()) || since > until) {
      return res.status(400).json({ message: "Valid from/to dates are required; from must be before to." });
    }
    const aggregate = await prisma.order.aggregate({
      where: {
        restaurant_id: restaurant.id,
        status: "delivered",
        payment_status: "paid",
        created_at: { gte: since, lte: until },
      },
      _sum: { total: true },
      _count: { _all: true },
    });
    const orders = await prisma.order.findMany({
      where: { restaurant_id: restaurant.id, status: "delivered", payment_status: "paid", created_at: { gte: since, lte: until } },
      orderBy: { created_at: "desc" },
      select: { id: true, total: true, created_at: true },
    });
    return res.json({
      period: { from: since, to: until },
      paidDeliveredOrders: aggregate._count._all,
      grossSales: Number(aggregate._sum.total ?? 0),
      orders,
      note: "This is gross sales, not net payout or platform revenue. Refunds and commission accounting require additional models.",
    });
  } catch (error) {
    return next(error);
  }
}
