import crypto from "node:crypto";
import { prisma } from "../config/db.js";

const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
];

function getValue(object, path) {
  return path
    .split(".")
    .reduce((value, key) => value?.[key], object);
}

function verifyPaymobHmac(transaction, receivedHmac) {
  const secret = process.env.PAYMOB_HMAC_SECRET;

  if (!secret || !receivedHmac) {
    return false;
  }

  const message = HMAC_FIELDS
    .map((field) => String(getValue(transaction, field) ?? ""))
    .join("");

  const expectedHmac = crypto
    .createHmac("sha512", secret)
    .update(message)
    .digest("hex");

  const expected = Buffer.from(expectedHmac, "hex");
  const received = Buffer.from(receivedHmac, "hex");

  return (
    expected.length === received.length &&
    expected.length > 0 &&
    crypto.timingSafeEqual(expected, received)
  );
}

function isTrue(value) {
  return value === true || value === "true";
}

export async function paymobTransactionCallback(req, res, next) {
  try {
    // Paymob's processed callback may wrap the transaction inside `obj`.
    const transaction = req.body?.obj ?? req.body;

    const receivedHmac =
      typeof req.query.hmac === "string"
        ? req.query.hmac
        : req.body?.hmac;

    if (!process.env.PAYMOB_HMAC_SECRET) {
      console.error("PAYMOB_HMAC_SECRET is not configured.");

      return res.status(500).json({
        message: "Payment callback verification is not configured.",
      });
    }

    if (!transaction || !verifyPaymobHmac(transaction, receivedHmac)) {
      console.warn("Rejected a Paymob callback with invalid HMAC.");

      return res.status(401).json({
        message: "Invalid Paymob callback signature.",
      });
    }

    // This is Paymob's order ID, not necessarily your local order ID.
    const paymobOrderId =
      transaction.order && typeof transaction.order === "object"
        ? transaction.order.id
        : transaction.order;

    if (paymobOrderId == null) {
      return res.status(400).json({
        message: "Paymob order ID is missing.",
      });
    }

    // The checkout controller must save this Paymob ID on the local order.
    const order = await prisma.order.findFirst({
      where: {
        paymob_order_id: String(paymobOrderId),
      },
    });

    if (!order) {
      console.error("No local order matched Paymob order ID:", paymobOrderId);

      return res.status(404).json({
        message: "No local order matches this Paymob order.",
      });
    }

    // Compare the amount in cents with the local order total in EGP.
    const expectedCents = Math.round(Number(order.total) * 100);
    const receivedCents = Number(transaction.amount_cents);

    if (
      !Number.isFinite(expectedCents) ||
      !Number.isFinite(receivedCents) ||
      expectedCents !== receivedCents ||
      String(transaction.currency).toUpperCase() !== "EGP"
    ) {
      console.error("Paymob amount/currency mismatch for order:", order.id);

      return res.status(409).json({
        message: "Paymob amount or currency does not match the order.",
      });
    }

    // Paymob can send an interim callback while a transaction is pending.
    if (isTrue(transaction.pending)) {
      return res.status(200).json({
        received: true,
        orderId: order.id,
        payment_status: order.payment_status,
        pending: true,
      });
    }

    const successful =
      isTrue(transaction.success) &&
      !isTrue(transaction.error_occured) &&
      !isTrue(transaction.is_voided) &&
      !isTrue(transaction.is_refunded);

    // Do not let a later retry/failure callback downgrade a paid order.
    if (order.payment_status !== "paid") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          payment_status: successful ? "paid" : "failed",
        },
      });
    }

    return res.status(200).json({
      received: true,
      orderId: order.id,
      payment_status:
        order.payment_status === "paid"
          ? "paid"
          : successful
            ? "paid"
            : "failed",
    });
  } catch (error) {
    return next(error);
  }
}