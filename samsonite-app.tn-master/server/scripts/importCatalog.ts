import csv from "csvtojson";
import { prisma } from "../src/db/prisma";

type CategoryCsvRow = { name?: string; url?: string };
type ProductDetailsCsvRow = {
  name?: string;
  description?: string;
  category?: string;
  sku?: string;
  brand?: string;
  price?: string;
  currency?: string;
  availability?: string;
  url?: string;
};
type FeatureCsvRow = {
  product_id?: string;
  feature_name?: string;
  feature_value?: string;
};
type ImageCsvRow = {
  product_id?: string;
  position?: string;
  image_url?: string;
};
type VariantCsvRow = {
  product_id?: string;
  group?: string;
  value?: string;
};

const cleanString = (value?: string): string | undefined => {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
};

const cleanCategoryName = (value?: string): string | undefined => {
  const text = cleanString(value);
  if (!text) return undefined;
  const cleaned = text.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  return cleaned.length ? cleaned : undefined;
};

const parseProductIdFromUrl = (url?: string): number | undefined => {
  const raw = cleanString(url);
  if (!raw) return undefined;

  const match = raw.match(/\/(\d+)-[^/]+\.html/i);
  if (!match) return undefined;

  const productId = Number(match[1]);
  return Number.isFinite(productId) ? productId : undefined;
};
const parseSlugFromUrl = (url?: string): string | undefined => {
  const raw = cleanString(url);
  if (!raw) return undefined;

  try {
    const parsed = new URL(raw, "https://example.com");
    const path = parsed.pathname.replace(/\/$/, "");
    const segment = path.split("/").filter(Boolean).pop();
    if (!segment) return undefined;

    return segment
      .replace(/^\d+-/, "")
      .replace(/\.html$/, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  } catch {
    return undefined;
  }
};

async function importCategoriesCsv() {
  const rows = await csv().fromFile("./data/categories.csv") as CategoryCsvRow[];
  console.log(`Category rows found: ${rows.length}`);

  let imported = 0;

  for (const row of rows) {
    const name = cleanCategoryName(row.name);
    if (!name) continue;

    const slug = parseSlugFromUrl(row.url);

    await prisma.category.upsert({
      where: { name },
      create: { name, slug },
      update: { slug: slug ?? undefined },
    });

    imported += 1;
  }

  console.log(`Categories imported/updated: ${imported}`);
}

async function importProducts() {
  const rows = await csv().fromFile("./data/products_details.csv") as ProductDetailsCsvRow[];
  console.log(`Product rows found: ${rows.length}`);

  let imported = 0;

  for (const row of rows) {
    const sku = cleanString(row.sku);
    const name = cleanString(row.name);
    const categoryName = cleanCategoryName(row.category);
    const brandName = cleanString(row.brand);

    if (!sku || !name || !categoryName || !brandName) {
      continue;
    }

    const scrapedId = parseProductIdFromUrl(row.url) ?? Number(sku);
    if (!Number.isFinite(scrapedId)) {
      continue;
    }

    const brand = await prisma.brand.upsert({
      where: { name: brandName },
      create: { name: brandName },
      update: {},
    });

    const category = await prisma.category.upsert({
      where: { name: categoryName },
      create: { name: categoryName },
      update: {},
    });

    const existing = await prisma.product.findUnique({
      where: { scrapedId },
      select: { id: true },
    });

    if (existing) {
      imported += 1;
      continue;
    }

    const product = await prisma.product.create({
      data: {
        scrapedId,
        sku,
        name,
        description: cleanString(row.description) ?? "",
        price: row.price ?? "0",
        currency: cleanString(row.currency),
        availability: cleanString(row.availability),
        url: cleanString(row.url),
        brandId: brand.id,
      },
    });

    await prisma.productCategory.create({
      data: {
        productId: product.id,
        categoryId: category.id,
      },
    });

    imported += 1;
  }

  console.log(`Products imported: ${imported}`);
}

async function importProductFeatures() {
  const rows = await csv().fromFile("./data/product_features.csv") as FeatureCsvRow[];
  console.log(`Product feature rows found: ${rows.length}`);

  const productIds = Array.from(
    new Set(rows.map((row) => cleanString(row.product_id)).filter(Boolean) as string[]),
  );

  const products = await prisma.product.findMany({
    where: { scrapedId: { in: productIds.map(Number).filter(Number.isFinite) } },
    select: { id: true, scrapedId: true },
  });

  const productMap = new Map(products.map((product) => [String(product.scrapedId), product.id]));
  const featureData = rows
    .map((row) => {
      const productId = cleanString(row.product_id);
      const product = productId ? productMap.get(productId) : undefined;
      const name = cleanString(row.feature_name);
      if (!product || !name) return undefined;
      return {
        productId: product,
        featureName: name,
        featureValue: cleanString(row.feature_value) ?? "",
      };
    })
    .filter(Boolean) as Array<{ productId: number; featureName: string; featureValue: string }>;

  if (!featureData.length) {
    console.log("No product features imported.");
    return;
  }

  await prisma.productFeature.deleteMany({
    where: { productId: { in: Array.from(new Set(featureData.map((item) => item.productId))) } },
  });

  await prisma.productFeature.createMany({ data: featureData });
  console.log(`Product features imported: ${featureData.length}`);
}

async function importProductImages() {
  const rows = await csv().fromFile("./data/product_images.csv") as ImageCsvRow[];
  console.log(`Product image rows found: ${rows.length}`);

  const productIds = Array.from(
    new Set(rows.map((row) => cleanString(row.product_id)).filter(Boolean) as string[]),
  );

  const products = await prisma.product.findMany({
    where: { scrapedId: { in: productIds.map(Number).filter(Number.isFinite) } },
    select: { id: true, scrapedId: true },
  });

  const productMap = new Map(products.map((product) => [String(product.scrapedId), product.id]));
  const imageData = rows
    .map((row) => {
      const productId = cleanString(row.product_id);
      const product = productId ? productMap.get(productId) : undefined;
      const url = cleanString(row.image_url);
      if (!product || !url) return undefined;
      return {
        productId: product,
        position: Number(row.position) || 0,
        imageUrl: url,
      };
    })
    .filter(Boolean) as Array<{ productId: number; position: number; imageUrl: string }>;

  if (!imageData.length) {
    console.log("No product images imported.");
    return;
  }

  await prisma.productImage.deleteMany({
    where: { productId: { in: Array.from(new Set(imageData.map((item) => item.productId))) } },
  });

  await prisma.productImage.createMany({ data: imageData });
  console.log(`Product images imported: ${imageData.length}`);
}

async function importProductVariants() {
  const rows = await csv().fromFile("./data/product_variants.csv") as VariantCsvRow[];
  console.log(`Product variant rows found: ${rows.length}`);

  const productIds = Array.from(
    new Set(rows.map((row) => cleanString(row.product_id)).filter(Boolean) as string[]),
  );

  const products = await prisma.product.findMany({
    where: { scrapedId: { in: productIds.map(Number).filter(Number.isFinite) } },
    select: { id: true, scrapedId: true },
  });

  const productMap = new Map(products.map((product) => [String(product.scrapedId), product.id]));
  const variantData = rows
    .map((row) => {
      const productId = cleanString(row.product_id);
      const product = productId ? productMap.get(productId) : undefined;
      const group = cleanString(row.group);
      const value = cleanString(row.value);
      if (!product || !group || !value) return undefined;
      return {
        productId: product,
        groupName: group,
        value,
      };
    })
    .filter(Boolean) as Array<{ productId: number; groupName: string; value: string }>;

  if (!variantData.length) {
    console.log("No product variants imported.");
    return;
  }

  await prisma.productVariant.deleteMany({
    where: { productId: { in: Array.from(new Set(variantData.map((item) => item.productId))) } },
  });

  await prisma.productVariant.createMany({ data: variantData });
  console.log(`Product variants imported: ${variantData.length}`);
}

async function main() {
  await importCategoriesCsv();
  await importProducts();
  await importProductFeatures();
  await importProductImages();
  await importProductVariants();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });