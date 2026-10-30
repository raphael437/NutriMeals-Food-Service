export const requireRole = (requiredRole) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: "fail",
      message: "Not authenticated",
    });
  }

  if (req.user.role !== requiredRole) {
    return res.status(403).json({
      status: "fail",
      message: "You do not have permission to access this resource",
    });
  }

  return next();
};
