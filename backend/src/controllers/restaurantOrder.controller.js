import { prisma } from "../config/db.js";

const allowedNextStatuses = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

export async function listRestaurantOrders(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const where = { restaurant_id: req.restaurant.id };
    if (req.query.status) {
      if (!Object.hasOwn(allowedNextStatuses, req.query.status)) return res.status(400).json({ message: "Invalid order status filter." });
      where.status = req.query.status;
    }
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { created_at: "desc" },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          address: true,
          items: { include: { menu_item: { select: { id: true, name: true, price: true } } } },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return res.json({ data: orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { restaurantId, orderId } = req.params;
    const status = req.body?.status;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const allowedTransitions = {
      placed: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["out_for_delivery", "cancelled"],
      out_for_delivery: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    const validTargets = [
      "confirmed",
      "preparing",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];

    if (!validTargets.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    // Find the restaurant directly instead of relying on req.restaurant.
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
        message: "Restaurant not found or not owned by this account.",
      });
    }

    if (restaurant.status !== "APPROVED") {
      return res.status(403).json({
        message: "Only approved restaurants can manage orders.",
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        restaurant_id: restaurant.id,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found for this restaurant.",
      });
    }

    if (!allowedTransitions[order.status]?.includes(status)) {
      return res.status(409).json({
        message: `Cannot change order from "${order.status}" to "${status}".`,
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status },
      include: {
        restaurant: {
          select: { id: true, name: true },
        },
        customer: {
          select: { id: true, name: true, phone: true },
        },
        address: true,
        items: {
          include: {
            menu_item: true,
          },
        },
      },
    });

    return res.json({
      message: "Order status updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    return next(error);
  }
}