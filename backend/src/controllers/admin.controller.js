import { prisma } from "../config/db.js";
import { invalidatePublicRestaurantCache } from "../service/publicRestaurantCache.js";

function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export async function getDashboard(_req, res, next) {
  try {
    const [users, customers, restaurantOwners, pendingRestaurants, approvedRestaurants, rejectedRestaurants, suspendedRestaurants, orders, paidOrderVolume, activeSubscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.user.count({ where: { role: "restaurant_owner" } }),
      prisma.restaurant.count({ where: { status: "PENDING" } }),
      prisma.restaurant.count({ where: { status: "APPROVED" } }),
      prisma.restaurant.count({ where: { status: "REJECTED" } }),
      prisma.restaurant.count({ where: { status: "SUSPENDED" } }),
      prisma.order.count(),
      prisma.order.aggregate({ where: { payment_status: "paid" }, _sum: { total: true } }),
      prisma.restaurantSubscription.count({ where: { status: "active" } }),
    ]);
    return res.json({
      metrics: {
        users, customers, restaurantOwners, pendingRestaurants,
        approvedRestaurants, rejectedRestaurants, suspendedRestaurants,
        orders, activeSubscriptions,
        paidOrderVolume: Number(paidOrderVolume._sum.total ?? 0),
      },
      note: "Paid order volume is not platform revenue. Subscription payments, commissions, refunds, and payouts require a payment/ledger model.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function listRestaurantApplications(req, res, next) {
  try {
    const { page, limit, skip } = pagination(req.query);
    const status = req.query.status || "PENDING";
    if (!["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].includes(status)) {
      return res.status(400).json({ message: "Invalid restaurant status filter." });
    }
    const where = { status };
    const [restaurants, total] = await prisma.$transaction([
      prisma.restaurant.findMany({
        where, skip, take: limit, orderBy: { created_at: "asc" },
        include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
      }),
      prisma.restaurant.count({ where }),
    ]);
    return res.json({ data: restaurants, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
}

export async function approveRestaurant(req, res, next) {
  try {
    const restaurantId = req.params.restaurantId;

    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, owner_id: true, status: true },
      });

      if (!restaurant) {
        const error = new Error("Restaurant application not found.");
        error.status = 404;
        throw error;
      }
      if (restaurant.status !== "PENDING") {
        const error = new Error("Only pending applications can be approved.");
        error.status = 409;
        throw error;
      }
      if (!restaurant.owner_id) {
        const error = new Error("This restaurant application has no owner account.");
        error.status = 409;
        throw error;
      }

      // Grant owner permissions in the same transaction as the approval.
      await tx.user.update({
        where: { id: restaurant.owner_id },
        data: { role: "restaurant_owner" },
      });

      const updatedRestaurant = await tx.restaurant.update({
        where: { id: restaurant.id },
        data: {
          status: "APPROVED",
          reviewed_at: new Date(),
          rejection_reason: null,
          // The owner explicitly opens the restaurant after setting it up.
          is_open: false,
        },
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      return updatedRestaurant;
    });

    await invalidatePublicRestaurantCache();
    return res.json({ message: "Restaurant approved.", restaurant: result });
  } catch (error) {
    if (error?.status === 404 || error?.status === 409) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
}

export async function rejectRestaurant(req, res, next) {
  try {
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) return res.status(400).json({ message: "A rejection reason is required." });
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.restaurantId } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant application not found." });
    if (restaurant.status !== "PENDING") return res.status(409).json({ message: "Only pending applications can be rejected." });
    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { status: "REJECTED", rejection_reason: reason, reviewed_at: new Date(), is_open: false },
    });
    await invalidatePublicRestaurantCache();
    return res.json({ message: "Restaurant application rejected.", restaurant: updated });
  } catch (error) {
    return next(error);
  }
}

export async function listAllRestaurants(req, res, next) {
  try {
    const { page, limit, skip } = pagination(req.query);
    const where = {};
    if (req.query.status) {
      if (!["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].includes(req.query.status)) {
        return res.status(400).json({ message: "Invalid status filter." });
      }
      where.status = req.query.status;
    }
    const [restaurants, total] = await prisma.$transaction([
      prisma.restaurant.findMany({
        where, skip, take: limit, orderBy: { created_at: "desc" },
        include: { owner: { select: { id: true, name: true, email: true, phone: true } }, _count: { select: { orders: true, menu_items: true } } },
      }),
      prisma.restaurant.count({ where }),
    ]);
    return res.json({ data: restaurants, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
}

export async function suspendRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.restaurantId } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    if (restaurant.status !== "APPROVED") return res.status(409).json({ message: "Only approved restaurants can be suspended." });
    const updated = await prisma.restaurant.update({ where: { id: restaurant.id }, data: { status: "SUSPENDED", is_open: false } });
    return res.json({ message: "Restaurant suspended.", restaurant: updated });
  } catch (error) {
    return next(error);
  }
}

export async function restoreRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.restaurantId } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    if (restaurant.status !== "SUSPENDED") return res.status(409).json({ message: "Only suspended restaurants can be restored." });
    const updated = await prisma.restaurant.update({ where: { id: restaurant.id }, data: { status: "APPROVED" } });
    return res.json({ message: "Restaurant restored. The owner can reopen it when ready.", restaurant: updated });
  } catch (error) {
    return next(error);
  }
}
