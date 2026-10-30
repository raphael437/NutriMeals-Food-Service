import { prisma } from "../config/db.js";
import { invalidatePublicRestaurantCache } from "../service/publicRestaurantCache.js";

/**
 * POST /api/customer/reviews
 *
 * Customers can review only their own orders when:
 * 1. The order has been delivered.
 * 2. Payment has been confirmed.
 *
 * The database should enforce one review per order with a unique
 * constraint on Review.order_id.
 */
export async function createReview(req, res, next) {
  try {
    const customerId = req.user?.id;

    if (!customerId) {
      return res.status(401).json({
        message: "You must be logged in to submit a review.",
      });
    }

    const { order_id, rating, comment } = req.body ?? {};

    // Validate review input.
    if (
      typeof order_id !== "string" ||
      !order_id.trim() ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        message: "order_id and a rating from 1 to 5 are required.",
      });
    }

    if (
      comment !== undefined &&
      comment !== null &&
      typeof comment !== "string"
    ) {
      return res.status(400).json({
        message: "comment must be text.",
      });
    }

    if (typeof comment === "string" && comment.trim().length > 700) {
      return res.status(400).json({
        message: "comment must not exceed 700 characters.",
      });
    }

    // Find only an order belonging to this customer.
    const order = await prisma.order.findFirst({
      where: {
        id: order_id.trim(),
        customer_id: customerId,
      },
      select: {
        id: true,
        restaurant_id: true,
        status: true,
        payment_status: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    // The order must be delivered.
    if (order.status !== "delivered") {
      return res.status(409).json({
        message: "You can review an order only after it has been delivered.",
      });
    }

    // Payment must also be confirmed.
    if (order.payment_status !== "paid") {
      return res.status(409).json({
        message: "You can review an order only after payment is confirmed.",
      });
    }

    // Create the review using verified order and customer IDs.
    const review = await prisma.review.create({
      data: {
        customer_id: customerId,
        restaurant_id: order.restaurant_id,
        order_id: order.id,
        rating,
        comment:
          typeof comment === "string"
            ? comment.trim() || null
            : null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Invalidate cached public restaurant data after the review is saved.
    await invalidatePublicRestaurantCache();

    return res.status(201).json({
      message: "Review created successfully.",
      review,
    });
  } catch (error) {
    // Handles duplicate reviews when Review.order_id has a unique constraint.
    if (error?.code === "P2002") {
      return res.status(409).json({
        message: "This order has already been reviewed.",
      });
    }

    return next(error);
  }
}

/**
 * GET /api/customer/reviews
 *
 * Returns reviews created by the currently authenticated customer.
 */
export async function listMyReviews(req, res, next) {
  try {
    const customerId = req.user?.id;

    if (!customerId) {
      return res.status(401).json({
        message: "You must be logged in to view your reviews.",
      });
    }

    const reviews = await prisma.review.findMany({
      where: {
        customer_id: customerId,
      },
      orderBy: {
        created_at: "desc",
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.json({ reviews });
  } catch (error) {
    return next(error);
  }
}