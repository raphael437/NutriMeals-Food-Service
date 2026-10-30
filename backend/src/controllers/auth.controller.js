import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  created_at: true,
  restaurants: {
    select: { id: true, name: true, status: true, is_open: true, rejection_reason: true },
  },
};

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Use the same destination after registration, login, and session refresh. */
function getNextPath(user) {
  const restaurants = Array.isArray(user.restaurants) ? user.restaurants : [];

  if (user.role === "admin") return "/admin/dashboard";

  if (user.role === "restaurant_applicant") {
    return restaurants.some((restaurant) => restaurant.status === "REJECTED")
      ? "/restaurants/rejected"
      : "/restaurants/pending";
  }

  if (user.role === "restaurant_owner") {
    if (restaurants.some((restaurant) => restaurant.status === "APPROVED")) {
      return "/dashboard";
    }
    if (restaurants.some((restaurant) => restaurant.status === "REJECTED")) {
      return "/restaurants/rejected";
    }
    if (restaurants.some((restaurant) => restaurant.status === "PENDING")) {
      return "/restaurants/pending";
    }
    return "/dashboard";
  }

  return "/restaurants";
}

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}
function setAuthCookie(res, token) {
  const production = process.env.NODE_ENV === "production";

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function handlePrismaError(error, res, next) {
  if (error?.code === "P2002") {
    return res.status(409).json({ message: "An account with this email already exists." });
  }
  return next(error);
}

export async function registerCustomer(req, res, next) {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : null;

    if (!name || !email || typeof password !== "string") {
      return res.status(400).json({ message: "Name, email and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password_hash, phone: phone || null, role: "customer" },
      select: publicUserSelect,
    });

    return res.status(201).json({ message: "Customer registered successfully.", user });
  } catch (error) {
    return handlePrismaError(error, res, next);
  }
}

export async function registerRestaurantOwner(req, res, next) {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : null;
    const restaurantName = (req.body.restaurantName ?? req.body.restaurant_name ?? "").trim();
    const address = (req.body.restaurantAddress ?? req.body.address ?? "").trim();
    const restaurantPhone = (req.body.restaurantPhone ?? req.body.restaurant_phone ?? phone ?? "").trim();
    const description = typeof req.body.description === "string" ? req.body.description.trim() : null;

    if (!name || !email || typeof password !== "string" || !restaurantName || !address) {
      return res.status(400).json({
        message: "Name, email, password, restaurant name and restaurant address are required.",
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password_hash, phone: phone || null, role: "restaurant_applicant" },
        select: { id: true, name: true, email: true, role: true, phone: true, created_at: true },
      });
      const restaurant = await tx.restaurant.create({
        data: {
          owner_id: user.id,
          name: restaurantName,
          description: description || null,
          address,
          phone: restaurantPhone || null,
          status: "PENDING",
          is_open: false,
        },
      });
      return { user, restaurant };
    });

    // Sign the applicant in immediately so the pending page can request /auth/me.
    const token = createToken(result.user);
    setAuthCookie(res, token);

    return res.status(201).json({
      message: "Your restaurant application was submitted and is pending review.",
      user: { ...result.user, restaurants: [result.restaurant] },
      restaurant: result.restaurant,
      next: "/restaurants/pending",
    });
  } catch (error) {
    return handlePrismaError(error, res, next);
  }
}

export async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    if (!email || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        restaurants: {
          select: { id: true, name: true, status: true, is_open: true, rejection_reason: true },
        },
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(user);
    setAuthCookie(res, token);
    const { password_hash: _passwordHash, ...safeUser } = user;

    const nextPath = getNextPath(user);
    return res.json({ message: "Login successful.", token, user: safeUser, next: nextPath });
  } catch (error) {
    return next(error);
  }
}
export async function logout(_req, res) {
  const production = process.env.NODE_ENV === "production";

  res.clearCookie("jwt", {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
  });

  return res.json({ message: "Logged out successfully." });
}
export async function getMe(req, res, next) {
  try {
    // Re-fetch current data so a changed role/status is reflected immediately.
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: publicUserSelect,
    });
    if (!user) return res.status(401).json({ message: "User account no longer exists." });

    const nextPath = getNextPath(user);
    return res.json({ user, next: nextPath });
  } catch (error) {
    return next(error);
  }
}
