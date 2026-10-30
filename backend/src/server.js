import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routers/authRoutes.js";
import publicRestaurantRoutes from "./routers/publicRestaurantRoutes.js";
import customerRoutes from "./routers/customerRoutes.js";
import restaurantOwnerRoutes from "./routers/restaurantOwnerRoutes.js";
import adminRoutes from "./routers/adminRoutes.js";
import subscriptionPlanRoutes from "./routers/subscriptionPlanRoutes.js";
import paymentRoutes from "./routers/paymentRoutes.js";

import { connectDB, disconnectDb } from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();
const port = Number(process.env.PORT) || 5000;
const allowedOrigins = [
  "https://frontend-tan-gamma-68.vercel.app/",
  "http://localhost:3000",
  process.env.CLIENT_URL,
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header, such as server-to-server requests.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },

  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));

// Authentication
app.use("/api/auth", authRoutes);

// Public marketplace endpoints
app.use("/api/restaurants", publicRestaurantRoutes);
app.use("/api/subscription-plans", subscriptionPlanRoutes);

// Protected customer, restaurant-owner, and admin endpoints
app.use("/api/customer", customerRoutes);
app.use("/api/restaurant-owner", restaurantOwnerRoutes);
app.use("/api/admin", adminRoutes);

// Payment checkout and Paymob webhook
app.use("/api/payments", paymentRoutes);

// API homepage
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NutriMeals API is running",
  });
});



// Keep 404 and error handling after every router.
app.use(notFound);
app.use(errorHandler);

let server;
let isShuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received; shutting down.`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  try {
    await disconnectDb();
  } catch (error) {
    console.error("Error disconnecting database:", error);
    exitCode = 1;
  }

  process.exit(exitCode);
}

async function start() {
  await connectDB();
  server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start().catch(async (error) => {
  console.error("Failed to start server:", error);
  try {
    await disconnectDb();
  } finally {
    process.exit(1);
  }
});

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  void shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  void shutdown("uncaughtException", 1);
});

export default app;
