ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "styles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "intensity" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "occasions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "characteristics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "isArabian" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Product" p
SET "isArabian" = true
FROM "Category" c
WHERE p."categoryId" = c.id
  AND (lower(c.name) LIKE '%árabe%' OR lower(c.slug) = 'arabe');
