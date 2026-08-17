ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "variantId" INTEGER;

CREATE INDEX IF NOT EXISTS "OrderItem_variantId_idx" ON "OrderItem"("variantId");
