import csv from "csvtojson";
import { prisma } from "../src/db/prisma";
import {
  ROOT_CATEGORIES,
  canonicalBrandName,
  canonicalCategoryName,
  cleanText,
  getColorHex,
  getParentCategoryName,
  inferProductCategory,
  normalizeAvailability,
  normalizeKey,
  slugify,
  type ProductLikeRow,
} from "./catalogCleaners";

type ProductDetailsCsvRow = ProductLikeRow & {
  sku?: string;
  price?: string;
  currency?: string;
  availability?: string;
};

const parseProductIdFromUrl = (url?: string): number | undefined => {
  const raw = cleanText(url);
  if (!raw) return undefined;
  const match = raw.match(/\/(\d+)-[^/]+\.html/i);
  if (!match) return undefined;
  const productId = Number(match[1]);
  return Number.isFinite(productId) ? productId : undefined;
};


const stockFromProduct = (product: { quantity: number | null; availability: string | null }): number | undefined => {
  if (typeof product.quantity === "number") return product.quantity > 0 ? product.quantity : 0;
  const normalized = normalizeAvailability(product.availability);
  if (!normalized) return undefined;
  if (/OutOfStock/i.test(normalized)) return 0;
  if (/InStock/i.test(normalized)) return 1;
  return undefined;
};

const selectVariantImages = (productImages: string[], colorName?: string): string[] => {
  if (!productImages.length || !colorName) return [];

  const colorKey = normalizeKey(colorName);
  const colorWords = colorKey.split(" ").filter((word) => word.length > 2);
  const matched = productImages.filter((imageUrl) => {
    const imageKey = normalizeKey(imageUrl);
    return colorWords.some((word) => imageKey.includes(word));
  });

  return matched.length ? matched : productImages;
};
async function ensureBrand(name?: string) {
  const brandName = cleanText(name);
  if (!brandName) return undefined;
  return prisma.brand.upsert({
    where: { name: brandName },
    create: { name: brandName },
    update: {},
  });
}

async function ensureCategory(name?: string) {
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
      slug: slugify(categoryName),
      parentId: parent && parent.name !== categoryName ? parent.id : undefined,
    },
    update: {
      slug: slugify(categoryName),
      parentId: parent && parent.name !== categoryName ? parent.id : null,
    },
  });
}

async function moveCategoryLinks(fromCategoryId: number, toCategoryId: number) {
  if (fromCategoryId === toCategoryId) return;

  const links = await prisma.productCategory.findMany({
    where: { categoryId: fromCategoryId },
    select: { productId: true },
  });

  for (const link of links) {
    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: link.productId, categoryId: toCategoryId } },
      create: { productId: link.productId, categoryId: toCategoryId },
      update: {},
    });
  }

  await prisma.productCategory.deleteMany({ where: { categoryId: fromCategoryId } });
}

async function cleanBrands() {
  const brands = await prisma.brand.findMany({ select: { id: true, name: true } });
  let merged = 0;
  let renamed = 0;

  for (const brand of brands) {
    const canonical = canonicalBrandName(brand.name);
    if (!canonical || canonical === brand.name) continue;

    const target = await ensureBrand(canonical);
    if (!target) continue;

    if (target.id !== brand.id) {
      await prisma.product.updateMany({ where: { brandId: brand.id }, data: { brandId: target.id } });
      await prisma.brand.delete({ where: { id: brand.id } }).catch(() => undefined);
      merged += 1;
    } else {
      await prisma.brand.update({ where: { id: brand.id }, data: { name: canonical } });
      renamed += 1;
    }
  }

  return { merged, renamed };
}

async function cleanCategories() {
  for (const root of ROOT_CATEGORIES) {
    await ensureCategory(root);
  }

  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  let merged = 0;
  let deletedAccueil = 0;

  for (const category of categories) {
    const canonical = canonicalCategoryName(category.name);
    if (!canonical) continue;

    if (canonical === "Accueil") continue;

    const target = await ensureCategory(canonical);
    if (!target) continue;

    if (target.id !== category.id) {
      await moveCategoryLinks(category.id, target.id);
      await prisma.category.delete({ where: { id: category.id } }).catch(() => undefined);
      merged += 1;
    }
  }

  const updatedCategories = await prisma.category.findMany({ select: { id: true, name: true } });
  for (const category of updatedCategories) {
    const parentName = getParentCategoryName(category.name);
    const parent = parentName ? await ensureCategory(parentName) : undefined;
    await prisma.category.update({
      where: { id: category.id },
      data: {
        slug: slugify(category.name),
        parentId: parent && parent.id !== category.id ? parent.id : null,
      },
    });
  }

  const accueilCategories = await prisma.category.findMany({
    where: { name: { equals: "Accueil", mode: "insensitive" } },
    select: { id: true },
  });

  for (const category of accueilCategories) {
    const count = await prisma.productCategory.count({ where: { categoryId: category.id } });
    if (count === 0) {
      await prisma.category.delete({ where: { id: category.id } }).catch(() => undefined);
      deletedAccueil += 1;
    }
  }

  return { merged, deletedAccueil };
}

async function cleanProductsFromCsv() {
  const rows = (await csv().fromFile("./data/products_details.csv")) as ProductDetailsCsvRow[];
  let updated = 0;
  let recategorizedFromAccueil = 0;
  let brandFixed = 0;

  for (const row of rows) {
    const scrapedId = parseProductIdFromUrl(row.url) ?? Number(cleanText(row.sku));
    if (!Number.isFinite(scrapedId)) continue;

    const product = await prisma.product.findUnique({
      where: { scrapedId },
      select: { id: true, brandId: true, categories: { include: { category: true } } },
    });
    if (!product) continue;

    const categoryName = inferProductCategory(row);
    const category = categoryName ? await ensureCategory(categoryName) : undefined;
    const brandName = canonicalBrandName(row.brand, row);
    const brand = await ensureBrand(brandName);

    await prisma.product.update({
      where: { id: product.id },
      data: {
        name: cleanText(row.name),
        description: cleanText(row.description) ?? "",
        currency: cleanText(row.currency),
        availability: normalizeAvailability(row.availability),
        url: cleanText(row.url),
        brandId: brand?.id,
      },
    });

    if (brand && product.brandId !== brand.id) brandFixed += 1;

    if (category) {
      const hadAccueil = product.categories.some((item) => normalizeKey(item.category.name) === "accueil");
      await prisma.productCategory.deleteMany({ where: { productId: product.id } });
      await prisma.productCategory.create({ data: { productId: product.id, categoryId: category.id } });
      if (hadAccueil) recategorizedFromAccueil += 1;
    }

    updated += 1;
  }

  return { updated, recategorizedFromAccueil, brandFixed };
}

async function cleanLooseTexts() {
  const products = await prisma.product.findMany({ select: { id: true, name: true, description: true, availability: true } });
  let productsUpdated = 0;

  for (const product of products) {
    const name = cleanText(product.name) ?? product.name;
    const description = cleanText(product.description) ?? product.description;
    const availability = normalizeAvailability(product.availability) ?? product.availability;

    if (name !== product.name || description !== product.description || availability !== product.availability) {
      await prisma.product.update({ where: { id: product.id }, data: { name, description, availability } });
      productsUpdated += 1;
    }
  }

  const features = await prisma.productFeature.findMany({ select: { id: true, featureName: true, featureValue: true } });
  let featuresUpdated = 0;
  for (const feature of features) {
    const featureName = cleanText(feature.featureName) ?? feature.featureName;
    const featureValue = cleanText(feature.featureValue) ?? feature.featureValue;
    if (featureName !== feature.featureName || featureValue !== feature.featureValue) {
      await prisma.productFeature.update({ where: { id: feature.id }, data: { featureName, featureValue } });
      featuresUpdated += 1;
    }
  }

  const variantProducts = await prisma.product.findMany({
    select: {
      id: true,
      quantity: true,
      availability: true,
      images: { select: { imageUrl: true, position: true }, orderBy: { position: "asc" } },
    },
  });
  const variantProductMap = new Map(
    variantProducts.map((product) => [
      product.id,
      {
        stock: stockFromProduct(product),
        images: product.images.map((image) => image.imageUrl),
      },
    ]),
  );

  const variants = await prisma.productVariant.findMany({ select: { id: true, productId: true, groupName: true, value: true } });
  let variantsUpdated = 0;
  for (const variant of variants) {
    const groupName = cleanText(variant.groupName) ?? variant.groupName;
    const value = cleanText(variant.value) ?? variant.value;
    const key = normalizeKey(groupName);
    const isColor = /couleur|color/.test(key);
    const isSize = /taille|size/.test(key);
    const productMeta = variantProductMap.get(variant.productId);
    const colorName = isColor ? value : undefined;
    const data = {
      groupName,
      value,
      colorName,
      colorHex: colorName ? getColorHex(value) : undefined,
      size: isSize ? value : undefined,
      stock: productMeta?.stock,
      images: selectVariantImages(productMeta?.images ?? [], colorName),
    };

    await prisma.productVariant.update({ where: { id: variant.id }, data });
    variantsUpdated += 1;
  }

  return { productsUpdated, featuresUpdated, variantsUpdated };
}


async function pruneEmptyNavigationCategories() {
  const keep = new Set(ROOT_CATEGORIES);
  let deleted = 0;
  let changed = true;

  while (changed) {
    changed = false;
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { products: true, children: true } },
      },
    });

    for (const category of categories) {
      if (keep.has(category.name)) continue;
      if (category._count.products > 0 || category._count.children > 0) continue;

      await prisma.category.delete({ where: { id: category.id } }).catch(() => undefined);
      deleted += 1;
      changed = true;
    }
  }

  return { deleted };
}
async function reportSuspiciousProducts() {
  const suspicious = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: "Ã" } },
        { description: { contains: "Ã" } },
        { categories: { some: { category: { name: { equals: "Accueil", mode: "insensitive" } } } } },
      ],
    },
    select: {
      scrapedId: true,
      name: true,
      brand: { select: { name: true } },
      categories: { select: { category: { select: { name: true } } } },
    },
    take: 15,
  });

  return suspicious.map((product) => ({
    scrapedId: product.scrapedId,
    name: product.name,
    brand: product.brand?.name,
    categories: product.categories.map((item) => item.category.name).join(", "),
  }));
}

async function main() {
  console.log("Cleaning imported catalog data...");
  const brandResult = await cleanBrands();
  const categoryResult = await cleanCategories();
  const productResult = await cleanProductsFromCsv();
  const textResult = await cleanLooseTexts();
  const pruneResult = await pruneEmptyNavigationCategories();
  const suspicious = await reportSuspiciousProducts();

  console.log(JSON.stringify({ brandResult, categoryResult, productResult, textResult, pruneResult, suspicious }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



