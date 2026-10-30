import { prisma } from "../config/db.js";

const intervals = ["monthly", "yearly"];

function validatePlan(body, partial = false) {
  const data = {};
  if (Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string" || !body.name.trim()) return { error: "name is required." };
    data.name = body.name.trim();
  }
  if (Object.hasOwn(body, "description")) {
    if (body.description !== null && typeof body.description !== "string") return { error: "description must be a string or null." };
    data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if (Object.hasOwn(body, "price")) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return { error: "price must be a non-negative number." };
    data.price = price.toFixed(2);
  }
  if (Object.hasOwn(body, "currency")) {
    if (typeof body.currency !== "string" || !/^[A-Z]{3}$/.test(body.currency.trim().toUpperCase())) return { error: "currency must be a three-letter currency code, such as EGP." };
    data.currency = body.currency.trim().toUpperCase();
  }
  if (Object.hasOwn(body, "billing_interval")) {
    if (!intervals.includes(body.billing_interval)) return { error: "billing_interval must be monthly or yearly." };
    data.billing_interval = body.billing_interval;
  }
  if (Object.hasOwn(body, "is_active")) {
    if (typeof body.is_active !== "boolean") return { error: "is_active must be a boolean." };
    data.is_active = body.is_active;
  }
  if (!partial && (!data.name || data.price === undefined || !data.billing_interval)) {
    return { error: "name, price and billing_interval are required." };
  }
  if (partial && Object.keys(data).length === 0) return { error: "No editable fields were provided." };
  return { data };
}

export async function listActivePlans(_req, res, next) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ where: { is_active: true }, orderBy: [{ price: "asc" }, { name: "asc" }] });
    return res.json({ plans });
  } catch (error) { return next(error); }
}

export async function getActivePlan(req, res, next) {
  try {
    const plan = await prisma.subscriptionPlan.findFirst({ where: { id: req.params.planId, is_active: true } });
    if (!plan) return res.status(404).json({ message: "Subscription plan not found." });
    return res.json({ plan });
  } catch (error) { return next(error); }
}

export async function listAllPlans(_req, res, next) {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { created_at: "desc" }, include: { _count: { select: { subscriptions: true } } } });
    return res.json({ plans });
  } catch (error) { return next(error); }
}

export async function createPlan(req, res, next) {
  try {
    const { data, error } = validatePlan(req.body);
    if (error) return res.status(400).json({ message: error });
    const plan = await prisma.subscriptionPlan.create({ data });
    return res.status(201).json({ message: "Subscription plan created.", plan });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ message: "A plan with this name already exists." });
    return next(error);
  }
}

export async function updatePlan(req, res, next) {
  try {
    const { data, error } = validatePlan(req.body, true);
    if (error) return res.status(400).json({ message: error });
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id: req.params.planId } });
    if (!existing) return res.status(404).json({ message: "Subscription plan not found." });
    const plan = await prisma.subscriptionPlan.update({ where: { id: existing.id }, data });
    return res.json({ message: "Subscription plan updated.", plan });
  } catch (error) {
    if (error?.code === "P2002") return res.status(409).json({ message: "A plan with this name already exists." });
    return next(error);
  }
}

export async function deactivatePlan(req, res, next) {
  try {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id: req.params.planId } });
    if (!existing) return res.status(404).json({ message: "Subscription plan not found." });
    const plan = await prisma.subscriptionPlan.update({ where: { id: existing.id }, data: { is_active: false } });
    return res.json({ message: "Plan deactivated. Existing subscription records are retained.", plan });
  } catch (error) { return next(error); }
}
