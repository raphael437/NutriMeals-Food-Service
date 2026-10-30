import bcrypt from "bcrypt";
import { prisma } from "../src/config/db.js";

const ADMIN = {
  name: "NutriMeals Admin",
  email: "demo-admin@nutrimeals.test",
  password: "NutriMeals#Admin2026",
};

const RESTAURANT_SEEDS = [
  {
    owner: {
      name: "Mariam Hassan",
      email: "owner.green@nutrimeals.test",
      password: "GreenBowl#2026",
    },
    restaurant: {
      name: "Green Bowl Kitchen",
      description:
        "Fresh bowls, grilled proteins, and balanced meals made with care.",
      address: "12 Tahrir Street, Downtown, Cairo",
    },
    menuItems: [
      {
        name: "Grilled Chicken Quinoa Bowl",
        category: "Bowls",
        description: "Grilled chicken, quinoa, vegetables, and lemon dressing.",
        price: "245.00",
        calories: 520,
        protein_g: "42.00",
        carbs_g: "48.00",
        fat_g: "16.00",
        fiber_g: "9.00",
        serving_size: "1 bowl (450 g)",
        ingredients: "Chicken, quinoa, mixed vegetables, lemon dressing",
        allergens: [],
        dietary_tags: ["High protein"],
      },
      {
        name: "Avocado Chickpea Salad",
        category: "Salads",
        description: "Chickpeas, avocado, fresh greens, and lemon dressing.",
        price: "185.00",
        calories: 390,
        protein_g: "15.00",
        carbs_g: "42.00",
        fat_g: "18.00",
        fiber_g: "13.00",
        serving_size: "1 salad (350 g)",
        ingredients: "Chickpeas, avocado, lettuce, cucumber, lemon",
        allergens: [],
        dietary_tags: ["Vegetarian", "High fiber"],
      },
      {
        name: "Salmon Power Bowl",
        category: "Bowls",
        description: "Salmon, brown rice, vegetables, and herbs.",
        price: "320.00",
        calories: 610,
        protein_g: "38.00",
        carbs_g: "55.00",
        fat_g: "22.00",
        fiber_g: "8.00",
        serving_size: "1 bowl (450 g)",
        ingredients: "Salmon, brown rice, vegetables, herbs",
        allergens: ["Fish"],
        dietary_tags: ["High protein"],
      },
    ],
  },
  {
    owner: {
      name: "Omar Ibrahim",
      email: "owner.nile@nutrimeals.test",
      password: "NileHarvest#2026",
    },
    restaurant: {
      name: "Nile Harvest Cafe",
      description:
        "Comforting Egyptian favorites and satisfying meals for every day.",
      address: "5 Abu El Feda Street, Zamalek, Cairo",
    },
    menuItems: [
      {
        name: "Chicken Shawarma Wrap",
        category: "Wraps",
        description: "Chicken shawarma, fresh vegetables, and garlic sauce.",
        price: "210.00",
        calories: 580,
        protein_g: "36.00",
        carbs_g: "52.00",
        fat_g: "22.00",
        fiber_g: "6.00",
        serving_size: "1 wrap (320 g)",
        ingredients: "Chicken, flatbread, vegetables, garlic sauce",
        allergens: ["Gluten", "Egg"],
        dietary_tags: ["High protein"],
      },
      {
        name: "Egyptian Lentil Soup",
        category: "Soups",
        description: "Warm lentil soup with cumin and fresh herbs.",
        price: "95.00",
        calories: 240,
        protein_g: "13.00",
        carbs_g: "38.00",
        fat_g: "4.00",
        fiber_g: "10.00",
        serving_size: "1 bowl (300 ml)",
        ingredients: "Lentils, onion, carrot, cumin, herbs",
        allergens: [],
        dietary_tags: ["Vegetarian", "High fiber"],
      },
      {
        name: "Grilled Beef Rice Bowl",
        category: "Bowls",
        description: "Grilled beef, rice, and seasonal vegetables.",
        price: "285.00",
        calories: 650,
        protein_g: "40.00",
        carbs_g: "70.00",
        fat_g: "18.00",
        fiber_g: "5.00",
        serving_size: "1 bowl (480 g)",
        ingredients: "Beef, rice, vegetables, seasoning",
        allergens: [],
        dietary_tags: ["High protein"],
      },
    ],
  },
  {
    owner: {
      name: "Salma Adel",
      email: "owner.mediterranean@nutrimeals.test",
      password: "MedTable#2026",
    },
    restaurant: {
      name: "Mediterranean Table",
      description:
        "Mediterranean-inspired plates, fresh salads, and herb-seasoned dishes.",
      address: "18 Road 9, Maadi, Cairo",
    },
    menuItems: [
      {
        name: "Lemon Herb Chicken Plate",
        category: "Main Courses",
        description: "Herb-grilled chicken with rice and vegetables.",
        price: "265.00",
        calories: 560,
        protein_g: "46.00",
        carbs_g: "48.00",
        fat_g: "14.00",
        fiber_g: "7.00",
        serving_size: "1 plate (450 g)",
        ingredients: "Chicken, rice, vegetables, lemon, herbs",
        allergens: [],
        dietary_tags: ["High protein"],
      },
      {
        name: "Greek Chickpea Salad",
        category: "Salads",
        description: "Chickpeas, cucumber, tomato, olives, and feta.",
        price: "195.00",
        calories: 420,
        protein_g: "16.00",
        carbs_g: "45.00",
        fat_g: "19.00",
        fiber_g: "12.00",
        serving_size: "1 salad (350 g)",
        ingredients: "Chickpeas, cucumber, tomato, olives, feta",
        allergens: ["Milk"],
        dietary_tags: ["Vegetarian", "High fiber"],
      },
      {
        name: "Baked Salmon with Rice",
        category: "Main Courses",
        description: "Oven-baked salmon with rice and seasonal vegetables.",
        price: "335.00",
        calories: 620,
        protein_g: "40.00",
        carbs_g: "58.00",
        fat_g: "20.00",
        fiber_g: "5.00",
        serving_size: "1 plate (460 g)",
        ingredients: "Salmon, rice, vegetables, lemon, herbs",
        allergens: ["Fish"],
        dietary_tags: ["High protein"],
      },
    ],
  },
];

async function upsertUser({ name, email, password, role }) {
  const password_hash = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      password_hash,
      phone: null,
      role,
    },
    create: {
      name,
      email,
      password_hash,
      phone: null,
      role,
    },
  });
}

async function upsertRestaurant(ownerId, restaurantData) {
  const existing = await prisma.restaurant.findFirst({
    where: {
      owner_id: ownerId,
      name: restaurantData.name,
    },
    select: { id: true },
  });

  const data = {
    owner_id: ownerId,
    name: restaurantData.name,
    description: restaurantData.description,
    address: restaurantData.address,
    phone: null,
    cover_image: null,

    // Approved and open so the restaurant appears in the public marketplace.
    status: "APPROVED",
    is_open: true,
  };

  if (existing) {
    return prisma.restaurant.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.restaurant.create({ data });
}

async function upsertMenuItem(restaurantId, item) {
  const { name, ...fields } = item;

  const existing = await prisma.menuItem.findFirst({
    where: {
      restaurant_id: restaurantId,
      name,
    },
    select: { id: true },
  });

  const data = {
    name,
    ...fields,
    image_url: null,
    is_available: true,
  };

  if (existing) {
    return prisma.menuItem.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.menuItem.create({
    data: {
      restaurant_id: restaurantId,
      ...data,
    },
  });
}

async function main() {
  console.log("Starting NutriMeals development seed...");

  // Create an admin account for managing the development marketplace.
  await upsertUser({
    ...ADMIN,
    role: "admin",
  });

  console.log(`Created/updated admin: ${ADMIN.email}`);

  for (const entry of RESTAURANT_SEEDS) {
    const owner = await upsertUser({
      ...entry.owner,
      role: "restaurant_owner",
    });

    const restaurant = await upsertRestaurant(
      owner.id,
      entry.restaurant,
    );

    for (const item of entry.menuItems) {
      await upsertMenuItem(restaurant.id, item);
    }

    console.log(
      `Created/updated "${restaurant.name}" with owner ${owner.email} and ${entry.menuItems.length} menu items.`,
    );
  }

  console.log("\nNutriMeals development seed completed.");
  console.log("\nDemo login credentials (development only):");
  console.log(`Admin: ${ADMIN.email} / ${ADMIN.password}`);

  for (const entry of RESTAURANT_SEEDS) {
    console.log(
      `${entry.restaurant.name}: ${entry.owner.email} / ${entry.owner.password}`,
    );
  }

  console.log(
    "\nThe nutrition values are sample data for UI testing, not verified nutrition facts.",
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });