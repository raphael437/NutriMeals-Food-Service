import { Router } from "express";
import {
  getDashboard,
  listRestaurantApplications,
  approveRestaurant,
  rejectRestaurant,
  listAllRestaurants,
  suspendRestaurant,
  restoreRestaurant,
} from "../controllers/admin.controller.js";
import {
  listAllPlans,
  createPlan,
  updatePlan,
  deactivatePlan,
} from "../controllers/subscriptionPlan.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
router.use(authMiddleware, requireRole("admin"));

router.get("/dashboard", getDashboard);

// Application review workflow.
router.get("/restaurant-applications", listRestaurantApplications);
router.patch(
  "/restaurant-applications/:restaurantId/approve",
  approveRestaurant
);
router.patch(
  "/restaurant-applications/:restaurantId/reject",
  rejectRestaurant
);

// Platform-wide restaurant management.
router.get("/restaurants", listAllRestaurants);
router.patch("/restaurants/:restaurantId/suspend", suspendRestaurant);
router.patch("/restaurants/:restaurantId/restore", restoreRestaurant);

// Subscription plan administration.
router.get("/subscription-plans", listAllPlans);
router.post("/subscription-plans", createPlan);
router.patch("/subscription-plans/:planId", updatePlan);
router.patch(
  "/subscription-plans/:planId/deactivate",
  deactivatePlan
);

export default router;
