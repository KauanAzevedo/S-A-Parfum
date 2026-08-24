ALTER TABLE "AdminSettings"
ALTER COLUMN "pixDiscount" SET DEFAULT 8;

UPDATE "AdminSettings"
SET "pixDiscount" = 8
WHERE "pixDiscount" = 5;
