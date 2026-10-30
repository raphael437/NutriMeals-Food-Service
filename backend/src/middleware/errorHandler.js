
export const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";

  const errorName = err?.name;
  const prismaCode = err?.code;

  if (errorName === "PrismaClientValidationError") {
    statusCode = 400;
    message = "Invalid data provided";
  } else if (
    errorName === "PrismaClientKnownRequestError" ||
    ["P2002", "P2025", "P2003"].includes(prismaCode)
  ) {
    if (prismaCode === "P2002") {
      statusCode = 409;

      const target = err.meta?.target;
      const field = Array.isArray(target)
        ? target[0]
        : target || "field";

      message = `${field} already exists`;
    } else if (prismaCode === "P2025") {
      statusCode = 404;
      message = "Record not found";
    } else if (prismaCode === "P2003") {
      statusCode = 400;
      message = "Invalid reference: related record does not exist";
    }
  }

  if (res.headersSent) {
    return next(err);
  }

  return res.status(statusCode).json({
    status: statusCode >= 500 ? "error" : "fail",
    message,
    ...(process.env.NODE_ENV === "development"
      ? { stack: err.stack }
      : {}),
  });
};
