import { Router } from "express";
import {
  listApprovedRestaurants,
  getApprovedRestaurant,
  getPublicMenu,
  getPublicReviews,
} from "../controllers/restaurant.controller.js";

const router = Router();

router.get("/", listApprovedRestaurants);
router.get("/:restaurantId", getApprovedRestaurant);
router.get("/:restaurantId/menu", getPublicMenu);
router.get("/:restaurantId/reviews", getPublicReviews);

export default router;
