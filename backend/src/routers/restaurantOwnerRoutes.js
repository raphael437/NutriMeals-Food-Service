
import { Router } from "express";

import {
  listMyRestaurants,
  createRestaurantApplication,
  getMyRestaurant,
  updateMyRestaurant,
  getDashboard,
  getEarnings,
} from "../controllers/restaurantOwner.controller.js";

import {
  getMyMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/menu.controller.js";

import {
  listRestaurantOrders,
  updateOrderStatus,
} from "../controllers/restaurantOrder.controller.js";

import {
  getRestaurantSubscription,
  createCheckout,
} from "../controllers/subscription.controller.js";

import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { requireOwnedRestaurant } from "../middleware/requireOwnedRestaurant.js";
import { requireApprovedRestaurant } from "../middleware/requireApprovedRestaurant.js";

const router = Router();

// All endpoints require an authenticated restaurant owner.
router.use(authMiddleware, requireRole("restaurant_owner"));

// Restaurant applications.
router.get("/restaurants", listMyRestaurants);
router.post("/restaurants", createRestaurantApplication);

// Restaurant profile.
router.get(
  "/restaurants/:restaurantId",
  requireOwnedRestaurant,
  getMyRestaurant
);


router.patch(
  "/restaurants/:restaurantId/orders/:orderId/status",
  updateOrderStatus
);
router.patch(
  "/restaurants/:restaurantId",
  requireOwnedRestaurant,
  updateMyRestaurant
);

// Dashboard and earnings.
router.get(
  "/restaurants/:restaurantId/dashboard",
  requireOwnedRestaurant,
  requireApprovedRestaurant,
  getDashboard
);

router.get(
  "/restaurants/:restaurantId/earnings",
  requireOwnedRestaurant,
  requireApprovedRestaurant,
  getEarnings
);

// Menu management.
router.get(
  "/restaurants/:restaurantId/menu-items",
  requireOwnedRestaurant,
  getMyMenuItems
);

router.post(
  "/restaurants/:restaurantId/menu-items",
  requireOwnedRestaurant,
  requireApprovedRestaurant,
  createMenuItem
);

router.patch(
  "/restaurants/:restaurantId/menu-items/:menuItemId",
  requireOwnedRestaurant,
  requireApprovedRestaurant,
  updateMenuItem
);

router.delete(
  "/restaurants/:restaurantId/menu-items/:menuItemId",
  requireOwnedRestaurant,
  requireApprovedRestaurant,
  deleteMenuItem
);

// Order management.
router.get(
  "/restaurants/:restaurantId/orders",
  requireOwnedRestaurant,
  requireApprovedRestaurant,
  listRestaurantOrders
);

router.patch(
  "/restaurants/:restaurantId/orders/:orderId/status",
  requireOwnedRestaurant,
  requireApprovedRestaurant,
  updateOrderStatus
);

// Subscription management.
router.get(
  "/restaurants/:restaurantId/subscription",
  requireOwnedRestaurant,
  getRestaurantSubscription
);

router.post(
  "/restaurants/:restaurantId/subscription/checkout",
  requireOwnedRestaurant,
  createCheckout
);

export default router;
