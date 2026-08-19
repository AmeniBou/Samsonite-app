CREATE TABLE "PromotionRule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromotionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromotionBrand" (
    "promotionId" INTEGER NOT NULL,
    "brandId" INTEGER NOT NULL,
    CONSTRAINT "PromotionBrand_pkey" PRIMARY KEY ("promotionId","brandId")
);

CREATE TABLE "PromotionCategory" (
    "promotionId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    CONSTRAINT "PromotionCategory_pkey" PRIMARY KEY ("promotionId","categoryId")
);

CREATE TABLE "PromotionProduct" (
    "promotionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    CONSTRAINT "PromotionProduct_pkey" PRIMARY KEY ("promotionId","productId")
);

CREATE INDEX "PromotionRule_active_startsAt_endsAt_idx" ON "PromotionRule"("active", "startsAt", "endsAt");
CREATE INDEX "PromotionRule_priority_updatedAt_idx" ON "PromotionRule"("priority", "updatedAt");
CREATE INDEX "PromotionBrand_brandId_idx" ON "PromotionBrand"("brandId");
CREATE INDEX "PromotionCategory_categoryId_idx" ON "PromotionCategory"("categoryId");
CREATE INDEX "PromotionProduct_productId_idx" ON "PromotionProduct"("productId");

ALTER TABLE "PromotionBrand" ADD CONSTRAINT "PromotionBrand_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "PromotionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionBrand" ADD CONSTRAINT "PromotionBrand_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionCategory" ADD CONSTRAINT "PromotionCategory_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "PromotionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionCategory" ADD CONSTRAINT "PromotionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "PromotionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
ADD COLUMN "originalUnitPrice" DECIMAL(10,2),
ADD COLUMN "discountPercent" DECIMAL(5,2),
ADD COLUMN "promotionName" TEXT;
