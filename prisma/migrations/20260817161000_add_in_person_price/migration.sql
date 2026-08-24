ALTER TABLE "Product"
ADD COLUMN "inPersonPrice" DECIMAL(10, 2);

UPDATE "Product"
SET "inPersonPrice" = "price"
WHERE "inPersonPrice" IS NULL;

ALTER TABLE "Product"
ALTER COLUMN "inPersonPrice" SET DEFAULT 0,
ALTER COLUMN "inPersonPrice" SET NOT NULL;
