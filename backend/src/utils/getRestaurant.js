import { prisma } from '../config/db.js';

export async function getTheRestaurant() {
  const restaurants = await prisma.restaurant.findMany();
  if (restaurants.length > 1) {
    throw new Error('Expected exactly one restaurant, found multiple — data integrity issue');
  }
  return restaurants[0] || null;
}