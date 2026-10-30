import { Router } from "express";
import {
  createOrder,
  listMyOrders,
  getMyOrder,
  deleteMyOrder,
} from "../controllers/order.controller.js";
import {
  getMyNutritionProfile,
  updateMyNutritionProfile,
} from "../controllers/nutrition.controller.js";
import {
  createReview,
  listMyReviews,
} from "../controllers/review.controller.js";
import {
  createAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} from "../controllers/address.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
router.use(authMiddleware, requireRole("customer"));

// Customer addresses for meal delivery.
router.post("/addresses", createAddress);
router.get("/addresses", getAddresses);
router.patch("/addresses/:addressId", updateAddress);
router.delete("/addresses/:addressId", deleteAddress);

// Customer orders and delivery.
router.post("/orders", createOrder);
router.get("/orders", listMyOrders);
router.get("/orders/:orderId", getMyOrder);
router.delete("/orders/:orderId/delete", deleteMyOrder);

// Customer-set nutrition goals. These are preferences, not medical advice.
router.get("/nutrition-profile", getMyNutritionProfile);
router.put("/nutrition-profile", updateMyNutritionProfile);

// Reviews.
router.post("/reviews", createReview);
router.get("/reviews", listMyReviews);

export default router;
