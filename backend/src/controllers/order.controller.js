import { prisma } from "../config/db.js";

function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

/** POST /api/customer/orders */
export async function createOrder(req, res, next) {
  try {
    const { restaurant_id, address_id = null, items, notes = null } = req.body ?? {};

    if (
      typeof restaurant_id !== "string" ||
      !restaurant_id.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "restaurant_id and a non-empty items array are required.",
      });
    }

    // Every delivery order must have a saved address owned by this customer.
    if (typeof address_id !== "string" || !address_id.trim()) {
      return res.status(400).json({
        message: "address_id is required for delivery.",
      });
    }

    const address = await prisma.address.findFirst({
      where: { id: address_id, user_id: req.user.id },
      select: { id: true },
    });

    if (!address) {
      return res.status(400).json({
        message: "The selected delivery address is invalid.",
      });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurant_id,
        status: "APPROVED",
        is_open: true,
      },
      select: { id: true, name: true },
    });

    if (!restaurant) {
      return res.status(400).json({
        message: "This restaurant is not currently accepting orders.",
      });
    }

    // Collapse duplicate menu lines and reject invalid or excessive quantities.
    const quantities = new Map();

    for (const line of items) {
      if (
        !line ||
        typeof line.menu_item_id !== "string" ||
        !line.menu_item_id.trim() ||
        !Number.isInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 99
      ) {
        return res.status(400).json({
          message:
            "Each item needs a valid menu_item_id and quantity from 1 to 99.",
        });
      }

      const nextQuantity =
        (quantities.get(line.menu_item_id) ?? 0) + line.quantity;

      if (nextQuantity > 99) {
        return res.status(400).json({
          message: "The total quantity for a menu item cannot exceed 99.",
        });
      }

      quantities.set(line.menu_item_id, nextQuantity);
    }

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: [...quantities.keys()] },
        restaurant_id: restaurant.id,
        is_available: true,
      },
    });

    if (menuItems.length !== quantities.size) {
      return res.status(400).json({
        message:
          "One or more meals are unavailable or belong to another restaurant.",
      });
    }

    let totalCents = 0;

    const orderLines = menuItems.map((menuItem) => {
      const quantity = quantities.get(menuItem.id);
      const unitPriceCents = Math.round(Number(menuItem.price) * 100);

      totalCents += unitPriceCents * quantity;

      // Snapshot price and nutrition so later menu edits won't change this order's history.
      return {
        menu_item_id: menuItem.id,
        quantity,
        price_at_order: menuItem.price,
        calories_at_order: menuItem.calories ?? null,
        protein_g_at_order: menuItem.protein_g ?? null,
        carbs_g_at_order: menuItem.carbs_g ?? null,
        fat_g_at_order: menuItem.fat_g ?? null,
        fiber_g_at_order: menuItem.fiber_g ?? null,
      };
    });

    const order = await prisma.order.create({
      data: {
        customer_id: req.user.id,
        restaurant_id: restaurant.id,
        address_id,
        notes: typeof notes === "string" ? notes.trim() || null : null,
        total: (totalCents / 100).toFixed(2),
        status: "placed",
        payment_status: "pending",
        items: { create: orderLines },
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
        address: true,
        items: {
          include: {
            menu_item: {
              select: {
                id: true,
                restaurant_id: true,
                name: true,
                category: true,
                description: true,
                price: true,
                image_url: true,
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
      },
    });

    return res.status(201).json({
      message: "Order created. Payment is still pending.",
      order,
    });
  } catch (error) {
    return next(error);
  }
}

/** GET /api/customer/orders */
export async function listMyOrders(req, res, next) {
  try {
    const { page, limit, skip } = pagination(req.query);
    const where = { customer_id: req.user.id };

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
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
        },
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

/** GET /api/customer/orders/:orderId */
export async function getMyOrder(req, res, next) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        customer_id: req.user.id,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
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

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.json({ order });
  } catch (error) {
    return next(error);
  }
}

/** DELETE /api/customer/orders/:orderId/delete */
export async function deleteMyOrder(req, res, next) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        customer_id: req.user.id,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.payment_status === "paid") {
      return res.status(409).json({
        message: "Paid orders cannot be deleted.",
      });
    }

    if (
      order.payment_status === "pending" &&
      order.paymob_order_id
    ) {
      return res.status(409).json({
        message:
          "Cannot delete an order while its Paymob payment is pending.",
      });
    }

    if (order.status !== "placed") {
      return res.status(409).json({
        message:
          "Only orders that have not yet been confirmed can be deleted.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: { order_id: order.id },
      });

      await tx.order.delete({
        where: { id: order.id },
      });
    });

    return res.json({
      message: "Order deleted.",
      orderId: order.id,
    });
  } catch (error) {
    return next(error);
  }
}

/** PATCH /api/customer/orders/:orderId/cancel */
export async function cancelMyOrder(req, res, next) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        customer_id: req.user.id,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.status !== "placed") {
      return res.status(409).json({
        message:
          "Only orders that have not yet been confirmed can be cancelled.",
      });
    }

    if (order.payment_status === "paid") {
      return res.status(409).json({
        message: "Paid orders cannot be cancelled from this endpoint.",
      });
    }

    if (
      order.payment_status === "pending" &&
      order.paymob_order_id
    ) {
      return res.status(409).json({
        message:
          "This order has a pending Paymob payment; wait for its final status before cancelling.",
      });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "cancelled" },
    });

    return res.json({
      message: "Order cancelled.",
      order: updated,
    });
  } catch (error) {
    return next(error);
  }
}