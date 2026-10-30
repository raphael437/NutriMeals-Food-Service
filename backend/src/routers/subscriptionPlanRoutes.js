import { Router } from "express";
import {
  listActivePlans,
  getActivePlan,
} from "../controllers/subscriptionPlan.controller.js";

const router = Router();
router.get("/", listActivePlans);
router.get("/:planId", getActivePlan);

export default router;
