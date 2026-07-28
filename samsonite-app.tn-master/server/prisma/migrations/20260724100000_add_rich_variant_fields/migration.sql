ALTER TABLE "ProductVariant"
ADD COLUMN "weight" TEXT,
ADD COLUMN "width" TEXT,
ADD COLUMN "height" TEXT,
ADD COLUMN "depth" TEXT,
ADD COLUMN "volume" TEXT,
ADD COLUMN "stockInitial" INTEGER;

CREATE INDEX "ProductVariant_productId_colorName_size_idx"
ON "ProductVariant"("productId", "colorName", "size");
