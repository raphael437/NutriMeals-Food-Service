import { prisma } from "../config/db.js";

export async function getRestaurantSubscription(req, res, next) {
  try {
    const restaurantId = req.restaurant?.id ?? req.params.restaurantId;
    const restaurant = req.restaurant ?? await prisma.restaurant.findFirst({ where: { id: restaurantId, owner_id: req.user.id } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });

    const [current, history] = await Promise.all([
      prisma.restaurantSubscription.findFirst({
        where: { restaurant_id: restaurant.id, status: "active" },
        orderBy: { created_at: "desc" },
        include: { plan: true },
      }),
      prisma.restaurantSubscription.findMany({
        where: { restaurant_id: restaurant.id },
        orderBy: { created_at: "desc" },
        take: 20,
        include: { plan: true },
      }),
    ]);
    return res.json({ restaurantId: restaurant.id, current, history });
  } catch (error) {
    return next(error);
  }
}

export async function createCheckout(req, res, next) {
  try {
    const restaurant = req.restaurant ?? await prisma.restaurant.findFirst({ where: { id: req.params.restaurantId, owner_id: req.user.id } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    if (restaurant.status !== "APPROVED") {
      return res.status(403).json({ message: "Your restaurant must be approved before purchasing a subscription." });
    }

    const planId = req.body.planId;
    if (typeof planId !== "string" || !planId) return res.status(400).json({ message: "planId is required." });
    const plan = await prisma.subscriptionPlan.findFirst({ where: { id: planId, is_active: true } });
    if (!plan) return res.status(404).json({ message: "Active subscription plan not found." });

    const now = new Date();
    const active = await prisma.restaurantSubscription.findFirst({
      where: {
        restaurant_id: restaurant.id,
        status: "active",
        AND: [
          { OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
          { OR: [{ ends_at: null }, { ends_at: { gte: now } }] },
        ],
      },
    });
    if (active) return res.status(409).json({ message: "This restaurant already has an active subscription." });

    // This creates only a PENDING database record. It does not create a Paymob
    // checkout session and must not be treated as a payment confirmation.
    const subscription = await prisma.restaurantSubscription.create({
      data: {
        restaurant_id: restaurant.id,
        plan_id: plan.id,
        price_at_purchase: plan.price,
        currency: plan.currency,
        status: "pending",
      },
      include: { plan: true },
    });

    return res.status(201).json({
      message: "Pending subscription created. Paymob checkout is not connected yet; the subscription is not active until payment is verified.",
      subscription,
      checkoutReady: false,
    });
  } catch (error) {
    return next(error);
  }
}
