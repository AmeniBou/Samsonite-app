-- Category hierarchy
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "parentId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Category_parentId_fkey'
  ) THEN
    ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Rich product variants
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "colorName" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "colorHex" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "size" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2);
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "stock" INTEGER;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill simple imported variants into richer fields.
UPDATE "ProductVariant"
SET "colorName" = "value"
WHERE "colorName" IS NULL AND lower("groupName") LIKE '%couleur%';

UPDATE "ProductVariant"
SET "size" = "value"
WHERE "size" IS NULL AND lower("groupName") LIKE '%taille%';
-- Backfill category hierarchy for the current Samsonite catalog.
UPDATE "Category" child
SET "parentId" = parent."id"
FROM "Category" parent
WHERE child."parentId" IS NULL
  AND parent."name" = 'Valises'
  AND child."name" IN ('Rigides', 'Souples', 'Ensembles de valises', 'Valises');

UPDATE "Category" child
SET "parentId" = parent."id"
FROM "Category" parent
WHERE child."parentId" IS NULL
  AND parent."name" = 'Sacs'
  AND child."name" IN ('Sac à dos', 'Sac a dos', 'Sacs à dos', 'Sacs a dos');

UPDATE "Category" child
SET "parentId" = parent."id"
FROM "Category" parent
WHERE child."parentId" IS NULL
  AND parent."name" = 'Business'
  AND child."name" IN ('Sac Ordinateur', 'Sac ordinateur', 'Pilot Case', 'Portefeuille');

UPDATE "Category" child
SET "parentId" = parent."id"
FROM "Category" parent
WHERE child."parentId" IS NULL
  AND parent."name" = 'Disney & Enfant'
  AND child."name" IN ('Disney & Enfant', 'Disney &amp; Enfant', 'Valise enfant', 'Sac à dos enfants', 'Sac a dos enfants', 'Sac Scolaire', 'Sac scolaire');

UPDATE "Category" child
SET "parentId" = parent."id"
FROM "Category" parent
WHERE child."parentId" IS NULL
  AND parent."name" = 'Accessoires'
  AND child."name" IN ('Housse de valise', 'Cadenas', 'Sangles', 'Coussin de voyage', 'Parapluie', 'Masques');