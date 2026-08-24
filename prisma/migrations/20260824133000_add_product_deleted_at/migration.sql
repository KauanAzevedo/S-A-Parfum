ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "Product" AS product
SET "deletedAt" = archived."createdAt"
FROM (
  SELECT "entityId", MAX("createdAt") AS "createdAt"
  FROM "AuditLog"
  WHERE "entity" = 'Product' AND "action" = 'ARCHIVE'
  GROUP BY "entityId"
) AS archived
WHERE product."id" = archived."entityId"
  AND product."deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Product_deletedAt_idx"
ON "Product" ("deletedAt");
