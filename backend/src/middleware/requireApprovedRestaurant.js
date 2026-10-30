export function requireApprovedRestaurant(req, res, next) {
  if (!req.restaurant) {
    return res.status(500).json({
      message: "Restaurant ownership must be checked first.",
    });
  }

  if (req.restaurant.status !== "APPROVED") {
    return res.status(403).json({
      message: "Your restaurant is not approved yet.",
      status: req.restaurant.status,
    });
  }

  return next();
}
