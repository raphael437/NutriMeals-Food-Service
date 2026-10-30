-- AlterEnum
BEGIN;

CREATE TYPE "Role_new" AS ENUM (
    'customer',
    'restaurant_owner',
    'admin'
);

ALTER TABLE "public"."users"
ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "public"."users"
ALTER COLUMN "role" TYPE "Role_new"
USING (
    CASE
        WHEN "role"::text = 'owner'
            THEN 'restaurant_owner'
        ELSE "role"::text
    END
)::"Role_new";

ALTER TYPE "Role" RENAME TO "Role_old";

ALTER TYPE "Role_new" RENAME TO "Role";

DROP TYPE "public"."Role_old";

ALTER TABLE "public"."users"
ALTER COLUMN "role" SET DEFAULT 'customer';

COMMIT;