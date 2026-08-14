UPDATE "ProductVariant" SET "stockInitial" = 4 WHERE "stockInitial" IS NULL OR "stockInitial" != 4;
SELECT COUNT(*) as updated_count FROM "ProductVariant" WHERE "stockInitial" = 4;
