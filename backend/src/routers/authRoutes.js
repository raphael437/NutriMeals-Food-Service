import { Router } from "express";
import {
  registerCustomer,
  registerRestaurantOwner,
  login,
  logout,
  getMe,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Public registration and login.
router.post("/register", registerCustomer);
router.post("/restaurant-register", registerRestaurantOwner);
router.post("/login", login);

// Logout is intentionally public so an expired session can still clear its cookie.
router.post("/logout", logout);
router.get("/me", authMiddleware, getMe);

export default router;
