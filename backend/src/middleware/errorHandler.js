import { Prisma } from "@prisma/client";

export const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";

  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid data provided";
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 409;
      const field = err.meta?.target?.[0] || "field";
      message = `${field} already exists`;
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = "Record not found";
    } else if (err.code === "P2003") {
      statusCode = 400;
      message = "Invalid reference: related record does not exist";
    }
  }

  if (res.headersSent) return;

  return res.status(statusCode).json({
    status: statusCode >= 500 ? "error" : "fail",
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
