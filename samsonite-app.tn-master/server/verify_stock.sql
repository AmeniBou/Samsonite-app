SELECT COUNT(*) as total_variants, COUNT(CASE WHEN "stockInitial" = 4 THEN 1 END) as stock_4 FROM "ProductVariant";
