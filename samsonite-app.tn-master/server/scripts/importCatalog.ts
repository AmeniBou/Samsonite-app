import csv from "csvtojson";
import { prisma } from "../src/db/prisma";
import {
  canonicalBrandName,
  canonicalCategoryName,
  cleanText,
  getColorHex,
  getParentCategoryName,
  inferProductCategory,
  normalizeAvailability,
  normalizeKey,
  slugify,
} from "./catalogCleaners";

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

type ProductVariantImportData = {
  productId: number;
  groupName: string;
  value: string;
  colorName?: string;
  colorHex?: string;
  size?: string;
  stock?: number;
  images: string[];
};

const cleanString = cleanText;

const stockFromAvailability = (availability?: string): number | undefined => {
  const normalized = normalizeAvailability(availability);
  if (!normalized) return undefined;
  if (/OutOfStock/i.test(normalized)) return 0;
  if (/InStock/i.test(normalized)) return 1;
  return undefined;
};

const readProductStockMap = async (): Promise<Map<string, number | undefined>> => {
  const rows = (await csv().fromFile("./data/products_details.csv")) as ProductDetailsCsvRow[];
  const stockMap = new Map<string, number | undefined>();

  for (const row of rows) {
    const scrapedId = parseProductIdFromUrl(row.url) ?? Number(cleanString(row.sku));
    if (!Number.isFinite(scrapedId)) continue;
    stockMap.set(String(scrapedId), stockFromAvailability(row.availability));
  }

  return stockMap;
};

const readProductImageMap = async (): Promise<Map<string, string[]>> => {
  const rows = (await csv().fromFile("./data/product_images.csv")) as ImageCsvRow[];
  const imageMap = new Map<string, Array<{ position: number; url: string }>>();

  for (const row of rows) {
    const productId = cleanString(row.product_id);
    const url = cleanString(row.image_url);
    if (!productId || !url) continue;

    const images = imageMap.get(productId) ?? [];
    images.push({ position: Number(row.position) || 0, url });
    imageMap.set(productId, images);
  }

  return new Map(
    Array.from(imageMap.entries()).map(([productId, images]) => [
      productId,
      images.sort((first, second) => first.position - second.position).map((image) => image.url),
    ]),
  );
};

const selectVariantImages = (productImages: string[], colorName?: string): string[] => {
  if (!productImages.length) return [];
  if (!colorName) return [];

  const colorKey = normalizeKey(colorName);
  const colorWords = colorKey.split(" ").filter((word) => word.length > 2);
  const matched = productImages.filter((imageUrl) => {
    const imageKey = normalizeKey(imageUrl);
    return colorWords.some((word) => imageKey.includes(word));
  });

  return matched.length ? matched : productImages;
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

async function ensureBrand(name?: string) {
  const brandName = cleanString(name);
  if (!brandName) return undefined;
  return prisma.brand.upsert({
    where: { name: brandName },
    create: { name: brandName },
    update: {},
  });
}

async function ensureCategory(name?: string, slug?: string) {
  const categoryName = canonicalCategoryName(name);
  if (!categoryName) return undefined;

  const parentName = getParentCategoryName(categoryName);
  const parent = parentName
    ? await prisma.category.upsert({
        where: { name: parentName },
        create: { name: parentName, slug: slugify(parentName) },
        update: { slug: slugify(parentName), parentId: null },
      })
    : undefined;

  return prisma.category.upsert({
    where: { name: categoryName },
    create: {
      name: categoryName,
      slug: slug ?? slugify(categoryName),
      parentId: parent && parent.name !== categoryName ? parent.id : undefined,
    },
    update: {
      slug: slug ?? slugify(categoryName),
      parentId: parent && parent.name !== categoryName ? parent.id : null,
    },
  });
}

async function importCategoriesCsv() {
  const rows = (await csv().fromFile("./data/categories.csv")) as CategoryCsvRow[];
  console.log(`Category rows found: ${rows.length}`);

  let imported = 0;

  for (const row of rows) {
    const name = canonicalCategoryName(row.name);
    if (!name || name === "Accueil") continue;

    const slug = parseSlugFromUrl(row.url) ?? slugify(name);
    await ensureCategory(name, slug);
    imported += 1;
  }

  console.log(`Categories imported/updated: ${imported}`);
}

async function importProducts() {
  const rows = (await csv().fromFile("./data/products_details.csv")) as ProductDetailsCsvRow[];
  console.log(`Product rows found: ${rows.length}`);

  let imported = 0;
  let updated = 0;

  for (const row of rows) {
    const sku = cleanString(row.sku);
    const name = cleanString(row.name);
    const categoryName = inferProductCategory(row);
    const brandName = canonicalBrandName(row.brand, row);

    if (!sku || !name || !categoryName || !brandName) {
      continue;
    }

    const scrapedId = parseProductIdFromUrl(row.url) ?? Number(sku);
    if (!Number.isFinite(scrapedId)) {
      continue;
    }

    const brand = await ensureBrand(brandName);
    const category = await ensureCategory(categoryName);
    if (!brand || !category) continue;

    const productData = {
      sku,
      name,
      description: cleanString(row.description) ?? "",
      price: row.price ?? "0",
      currency: cleanString(row.currency),
      availability: normalizeAvailability(row.availability),
      url: cleanString(row.url),
      brandId: brand.id,
    };

    const product = await prisma.product.upsert({
      where: { scrapedId },
      create: {
        scrapedId,
        ...productData,
      },
      update: productData,
      select: { id: true },
    });

    await prisma.productCategory.deleteMany({ where: { productId: product.id } });
    await prisma.productCategory.create({
      data: {
        productId: product.id,
        categoryId: category.id,
      },
    });

    const existed = await prisma.product.findUnique({ where: { scrapedId }, select: { createdAt: true, updatedAt: true } });
    if (existed && existed.createdAt.getTime() !== existed.updatedAt.getTime()) updated += 1;
    else imported += 1;
  }

  console.log(`Products imported: ${imported}`);
  console.log(`Products updated: ${updated}`);
}

async function importProductFeatures() {
  const rows = (await csv().fromFile("./data/product_features.csv")) as FeatureCsvRow[];
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
  const rows = (await csv().fromFile("./data/product_images.csv")) as ImageCsvRow[];
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
  const rows = (await csv().fromFile("./data/product_variants.csv")) as VariantCsvRow[];
  console.log(`Product variant rows found: ${rows.length}`);

  const productIds = Array.from(
    new Set(rows.map((row) => cleanString(row.product_id)).filter(Boolean) as string[]),
  );

  const products = await prisma.product.findMany({
    where: { scrapedId: { in: productIds.map(Number).filter(Number.isFinite) } },
    select: { id: true, scrapedId: true },
  });

  const productMap = new Map(products.map((product) => [String(product.scrapedId), product.id]));
  const stockMap = await readProductStockMap();
  const imageMap = await readProductImageMap();

  const variantData = rows
    .map((row) => {
      const scrapedProductId = cleanString(row.product_id);
      const product = scrapedProductId ? productMap.get(scrapedProductId) : undefined;
      const group = cleanString(row.group);
      const value = cleanString(row.value);
      if (!scrapedProductId || !product || !group || !value) return undefined;

      const key = normalizeKey(group);
      const isColor = /couleur|color/.test(key);
      const isSize = /taille|size/.test(key);
      const colorName = isColor ? value : undefined;
      const productImages = imageMap.get(scrapedProductId) ?? [];

      return {
        productId: product,
        groupName: group,
        value,
        colorName,
        colorHex: colorName ? getColorHex(colorName) : undefined,
        size: isSize ? value : undefined,
        stock: stockMap.get(scrapedProductId),
        images: selectVariantImages(productImages, colorName),
      };
    })
    .filter(Boolean) as ProductVariantImportData[];

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
