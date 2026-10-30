/*
  Warnings:

  - You are about to drop the `reservations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_restaurant_id_fkey";

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "calories" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "carbs_g" DECIMAL(7,2) NOT NULL DEFAULT 0,
ADD COLUMN     "dietary_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "fat_g" DECIMAL(7,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fiber_g" DECIMAL(7,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ingredients" TEXT,
ADD COLUMN     "protein_g" DECIMAL(7,2) NOT NULL DEFAULT 0,
ADD COLUMN     "serving_size" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "calories_at_order" INTEGER,
ADD COLUMN     "carbs_g_at_order" DECIMAL(7,2),
ADD COLUMN     "fat_g_at_order" DECIMAL(7,2),
ADD COLUMN     "fiber_g_at_order" DECIMAL(7,2),
ADD COLUMN     "protein_g_at_order" DECIMAL(7,2);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "estimated_delivery_at" TIMESTAMP(3),
ADD COLUMN     "out_for_delivery_at" TIMESTAMP(3);

-- DropTable
DROP TABLE "reservations";

-- DropEnum
DROP TYPE "ReservationStatus";

-- CreateTable
CREATE TABLE "nutrition_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "daily_calorie_goal" INTEGER NOT NULL DEFAULT 2000,
    "protein_goal_g" DECIMAL(7,2),
    "carbs_goal_g" DECIMAL(7,2),
    "fat_goal_g" DECIMAL(7,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutrition_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nutrition_profiles_user_id_key" ON "nutrition_profiles"("user_id");

-- CreateIndex
CREATE INDEX "menu_items_calories_idx" ON "menu_items"("calories");

-- AddForeignKey
ALTER TABLE "nutrition_profiles" ADD CONSTRAINT "nutrition_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
