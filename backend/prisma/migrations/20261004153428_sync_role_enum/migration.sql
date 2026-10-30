/*
  Warnings:

  - The values [restaurant_owner] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `created_at` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `lat` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `line2` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `menu_items` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `commission_rate` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `is_approved` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `lat` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `restaurants` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_verified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profile_image` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[owner_id]` on the table `restaurants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `menu_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('customer', 'owner');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer';
COMMIT;

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_restaurant_id_fkey";

-- DropForeignKey
ALTER TABLE "menu_items" DROP CONSTRAINT "menu_items_category_id_fkey";

-- AlterTable
ALTER TABLE "addresses" DROP COLUMN "created_at",
DROP COLUMN "lat",
DROP COLUMN "line2",
DROP COLUMN "lng";

-- AlterTable
ALTER TABLE "menu_items" DROP COLUMN "category_id",
DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "category" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "payment_method",
DROP COLUMN "updated_at",
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "paymob_order_id" TEXT;

-- AlterTable
ALTER TABLE "restaurants" DROP COLUMN "commission_rate",
DROP COLUMN "is_approved",
DROP COLUMN "lat",
DROP COLUMN "lng",
DROP COLUMN "updated_at",
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_active",
DROP COLUMN "is_verified",
DROP COLUMN "profile_image",
DROP COLUMN "updated_at";

-- DropTable
DROP TABLE "categories";

-- DropEnum
DROP TYPE "PaymentMethod";

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_owner_id_key" ON "restaurants"("owner_id");
