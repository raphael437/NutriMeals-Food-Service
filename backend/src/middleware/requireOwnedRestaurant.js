import { prisma } from "../config/db.js";

export async function requireOwnedRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: req.params.restaurantId,
        owner_id: req.user.id,
      },
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    req.restaurant = restaurant;
    return next();
  } catch (error) {
    return next(error);
  }
}
