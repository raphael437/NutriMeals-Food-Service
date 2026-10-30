import { prisma } from "../config/db.js";
import {
  createPaymobPayment,
  verifyPaymobHmac,
} from "../service/paymob.service.js";

/**
 * POST /api/payments/orders/:orderId/checkout
 * Creates a Paymob checkout for the authenticated customer's own order.
 * A new Paymob order may replace an old one only after a definitive failure.
 */
export async function createOrderCheckout(req, res, next) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        customer_id: req.user.id,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        address: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (order.status === "cancelled") {
      return res.status(409).json({ message: "Cancelled orders cannot be paid." });
    }
    if (order.payment_status === "paid") {
      return res.status(409).json({ message: "This order has already been paid." });
    }

    // Do not create a second active attempt while Paymob may still be processing
    // the first one. A retry is allowed only after the webhook records failure.
    if (order.paymob_order_id && order.payment_status !== "failed") {
      return res.status(409).json({
        message:
          "A Paymob payment attempt already exists. Wait for its final callback before retrying.",
      });
    }

    const { iframeUrl, paymobOrderId } = await createPaymobPayment({
      order,
      user: order.customer,
      address: order.address,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymob_order_id: String(paymobOrderId),
        payment_status: "pending",
      },
    });

    return res.status(201).json({
      message: "Paymob checkout created.",
      orderId: order.id,
      iframeUrl,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/payments/paymob/webhook
 * Paymob callbacks do not use a customer JWT. Verify HMAC before database writes.
 */
export async function handlePaymobWebhook(req, res, next) {
  try {
    if (!verifyPaymobHmac(req.query, req.body)) {
      return res.status(403).json({ message: "Invalid Paymob callback signature." });
    }

    const transaction = req.body?.obj;
    const rawPaymobOrderId = transaction?.order?.id;
    if (rawPaymobOrderId === undefined || rawPaymobOrderId === null) {
      return res.status(400).json({
        message: "Paymob callback does not contain an order ID.",
      });
    }

    const order = await prisma.order.findFirst({
      where: { paymob_order_id: String(rawPaymobOrderId) },
    });

    // A callback for an older attempt can arrive after a permitted retry replaced
    // the current Paymob order ID. Acknowledge it so the provider does not retry
    // an event that is no longer associated with the current attempt.
    if (!order) {
      return res.status(200).json({ received: true, ignored: true });
    }

    // Idempotent for duplicate success callbacks.
    if (order.payment_status === "paid") {
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    const amountCents = Number(transaction.amount_cents);
    const expectedCents = Math.round(Number(order.total) * 100);
    const currency = String(transaction.currency ?? "").toUpperCase();

    if (
      !Number.isFinite(amountCents) ||
      amountCents !== expectedCents ||
      currency !== "EGP"
    ) {
      return res.status(400).json({
        message: "Paymob amount or currency does not match the order.",
      });
    }

    // Pending callbacks are not final failures. Keep the order pending until
    // Paymob supplies a final success or failure transaction result.
    if (transaction.pending === true) {
      return res.status(200).json({ received: true, pending: true });
    }

    const successful =
      transaction.success === true &&
      transaction.pending !== true &&
      transaction.error_occured !== true &&
      transaction.is_refunded !== true &&
      transaction.is_voided !== true;

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { payment_status: successful ? "paid" : "failed" },
      select: { id: true, payment_status: true },
    });

    return res.status(200).json({ received: true, order: updatedOrder });
  } catch (error) {
    return next(error);
  }
}
