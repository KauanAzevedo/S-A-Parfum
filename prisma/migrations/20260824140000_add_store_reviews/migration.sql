ALTER TABLE "Review"
ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "Review"
ADD COLUMN IF NOT EXISTS "targetKey" TEXT;

UPDATE "Review"
SET "targetKey" = "productId"
WHERE "targetKey" IS NULL;

ALTER TABLE "Review"
ALTER COLUMN "targetKey" SET NOT NULL;

DROP INDEX IF EXISTS "Review_userId_productId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Review_userId_targetKey_key"
ON "Review"("userId", "targetKey");

CREATE INDEX IF NOT EXISTS "Review_targetKey_approved_createdAt_idx"
ON "Review"("targetKey", "approved", "createdAt");
