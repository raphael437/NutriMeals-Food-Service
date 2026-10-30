/*
  Warnings:

  - The values [owner] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'active', 'expired', 'cancelled', 'past_due');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('customer', 'restaurant_owner', 'admin');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer';
COMMIT;

-- DropIndex
DROP INDEX "restaurants_owner_id_key";

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "status" "RestaurantStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "is_open" SET DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "billing_interval" "BillingInterval" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_subscriptions" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "price_at_purchase" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'pending',
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE INDEX "restaurant_subscriptions_restaurant_id_status_idx" ON "restaurant_subscriptions"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "restaurant_subscriptions_plan_id_idx" ON "restaurant_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "restaurant_subscriptions_ends_at_idx" ON "restaurant_subscriptions"("ends_at");

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_idx" ON "menu_items"("restaurant_id");

-- CreateIndex
CREATE INDEX "orders_restaurant_id_status_idx" ON "orders"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "reservations_restaurant_id_reservation_time_idx" ON "reservations"("restaurant_id", "reservation_time");

-- CreateIndex
CREATE INDEX "restaurants_owner_id_idx" ON "restaurants"("owner_id");

-- CreateIndex
CREATE INDEX "restaurants_status_created_at_idx" ON "restaurants"("status", "created_at");

-- CreateIndex
CREATE INDEX "reviews_restaurant_id_created_at_idx" ON "reviews"("restaurant_id", "created_at");

-- AddForeignKey
ALTER TABLE "restaurant_subscriptions" ADD CONSTRAINT "restaurant_subscriptions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_subscriptions" ADD CONSTRAINT "restaurant_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
