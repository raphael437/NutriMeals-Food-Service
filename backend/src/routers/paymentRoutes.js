import { Router } from "express";
import {
  createOrderCheckout,
  handlePaymobWebhook,
} from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  paymobTransactionCallback,
} from "../controllers/paymobCallBack.controller.js";

const router = Router();

// Customer checkout. The controller verifies the order belongs to req.user.
router.post(
  "/orders/:orderId/checkout",
  authMiddleware,
  requireRole("customer"),
  createOrderCheckout
);
router.post("/paymob/callback", paymobTransactionCallback);
// Payment-provider callbacks cannot use the customer's JWT.
// The controller must validate Paymob's HMAC before changing an order.
router.post("/paymob/webhook", handlePaymobWebhook);

export default router;
