import { prisma } from "../db/prisma.js";

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildLangField = (value: string) => [{ id: "2", value: value || "" }];

const COLOR_HEX_BY_NAME: Record<string, string> = {
  blanc: "#f5f5f0",
  black: "#111111",
  bleu: "#24384f",
  "bleu ciel": "#9fb5c8",
  "bleu petrole": "#1f3b4a",
  "bleu pétrole": "#1f3b4a",
  bordeaux: "#6f1d2c",
  brown: "#5b3a2e",
  gris: "#7d8580",
  jaune: "#f2aa2a",
  marron: "#6f4e37",
  noir: "#111111",
  orange: "#d85f2a",
  rose: "#d9a2b8",
  rouge: "#df332b",
  teal: "#08645f",
  vert: "#586a5a",
  violet: "#8c83bd",
};

const normalizeLabel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const getColorHex = (value: string) => {
  const normalized = normalizeLabel(value).replace(/_/g, " ");
  return COLOR_HEX_BY_NAME[normalized] || COLOR_HEX_BY_NAME[normalized.split(" ")[0]] || "#9ca3af";
};

const mapCategoryToRaw = (category: {
  id: number;
  name: string;
  slug?: string | null;
}) => ({
  id: category.id,
  id_parent: 2,
  name: buildLangField(category.name),
  description: buildLangField(""),
  link_rewrite: buildLangField(category.slug || normalizeSlug(category.name)),
  active: "1",
});

const mapProductToRaw = (product: {
  id: number;
  scrapedId: number;
  name: string;
  description?: string | null;
  price: { toString(): string };
  sku?: string | null;
  availability?: string | null;
  url?: string | null;
  weight?: string | null;
  width?: string | null;
  height?: string | null;
  depth?: string | null;
  quantity?: number | null;
  images: Array<{ id: number; imageUrl: string }>;
  categories: Array<{ category: { id: number; slug?: string | null } }>;
  variants: Array<{ id: number; groupName: string; value: string }>;
  features: Array<{ id: number; featureName: string; featureValue: string }>;
}) => {
  const imageIds = product.images.map((image) => image.id).filter(Boolean);
  const categoryAssociations = product.categories
    .map((relation) => ({ id: relation.category.id }))
    .filter(Boolean);

  return {
    id: product.id,
    name: buildLangField(product.name),
    description: buildLangField(product.description || ""),
    description_short: buildLangField(product.description || ""),
    link_rewrite: buildLangField(
      product.url ? normalizeSlug(new URL(product.url, "https://example.com").pathname.split("/").pop() || product.name) : normalizeSlug(product.name)
    ),
    price: product.price.toString(),
    reference: product.sku || "",
    active: product.availability === "inactive" ? "0" : "1",
    id_category_default: product.categories[0]?.category.id ?? 0,
    id_default_image: imageIds.length > 0 ? imageIds[0] : undefined,
    weight: product.weight || "",
    width: product.width || "",
    height: product.height || "",
    depth: product.depth || "",
    quantity: product.quantity ?? 0,
    associations: {
      categories: categoryAssociations,
      images: imageIds.map((id) => ({ id, imageUrl: product.images.find((img) => img.id === id)?.imageUrl })),
      product_option_values: product.variants.map((variant) => ({ id: variant.id })),
      product_features: product.features.map((feature) => ({
        id: feature.id,
        id_feature_value: feature.id,
      })),
    },
  };
};

export const getPublicCatalog = async () => {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      orderBy: { id: "asc" },
      include: {
        images: { orderBy: { position: "asc" } },
        categories: { include: { category: true } },
        variants: { orderBy: { id: "asc" } },
        features: { orderBy: { id: "asc" } },
      },
    }),
  ]);

  const groupNameById = new Map<string, number>();
  const getGroupId = (groupName: string) => {
    const key = normalizeLabel(groupName);
    const existing = groupNameById.get(key);
    if (existing) return existing;
    const nextId = groupNameById.size + 1;
    groupNameById.set(key, nextId);
    return nextId;
  };

  for (const product of products) {
    for (const variant of product.variants) {
      getGroupId(variant.groupName);
    }
  }

  const variants = products.flatMap((product) =>
    product.variants.map((variant) => ({
      product,
      variant,
      groupId: getGroupId(variant.groupName),
    }))
  );

  return {
    products: products.map(mapProductToRaw),
    categories: categories.map(mapCategoryToRaw),
    combinations: variants.map(({ product, variant }) => ({
      id: variant.id,
      id_product: product.id,
      price: "0",
      default_on: "0",
      associations: {
        product_option_values: [{ id: variant.id }],
        images: [],
      },
    })),
    productOptions: Array.from(groupNameById.entries()).map(([groupName, id]) => ({
      id,
      name: buildLangField(groupName),
      public_name: buildLangField(groupName),
    })),
    productOptionValues: variants.map(({ variant, groupId }) => ({
      id: variant.id,
      id_attribute_group: groupId,
      color: /couleur|color/i.test(variant.groupName) ? getColorHex(variant.value) : undefined,
      name: buildLangField(variant.value),
    })),
    stockAvailables: variants.map(({ product, variant }) => ({
      id: variant.id,
      id_product: product.id,
      id_product_attribute: variant.id,
      quantity: product.quantity ?? 0,
    })),
    features: products.flatMap((product) =>
      product.features.map((feature) => ({
        id: feature.id,
        name: buildLangField(feature.featureName),
      }))
    ),
    featureValues: products.flatMap((product) =>
      product.features.map((feature) => ({
        id: feature.id,
        id_feature: feature.id,
        value: buildLangField(feature.featureValue),
      }))
    ),
  };
};

export const getCategories = async () => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return categories.map((category) => ({
    id: category.id,
    id_parent: 2,
    name: buildLangField(category.name),
    description: buildLangField(""),
    link_rewrite: buildLangField(category.slug || normalizeSlug(category.name)),
    active: "1",
  }));
};

const mapAdminProduct = (product: {
  id: number;
  name: string;
  sku?: string | null;
  price: { toNumber(): number; toString(): string };
  availability?: string | null;
  category: { id: number; name: string } | null;
  images: Array<{ id: number; imageUrl: string }>;
  features: Array<{ featureName: string; featureValue: string }>;
  variants: Array<{ groupName: string; value: string }>;
  description?: string | null;
  quantity?: number | null;
  weight?: string | null;
  width?: string | null;
  height?: string | null;
  depth?: string | null;
}) => {
  const imageId = product.images[0]?.id ?? null;
  const stock = product.quantity ?? 0;
  const variants = product.variants.map((variant, index) => ({
    colorName: variant.groupName || undefined,
    colorHex: undefined,
    size: variant.value || undefined,
    price: Number(product.price) || undefined,
    stock: 0,
    images: [],
  }));

  return {
    id: product.id,
    name: product.name,
    reference: product.sku || "",
    price: Number(product.price) || 0,
    active: product.availability !== "inactive",
    categoryId: product.category?.id ?? 0,
    categoryName: product.category?.name ?? "Sans catégorie",
    imageId,
    stock,
    hasVariants: variants.length > 0,
    description: product.description || "",
    descriptionShort: product.description || "",
    weight: product.weight || "",
    width: product.width || "",
    height: product.height || "",
    depth: product.depth || "",
    onSale: false,
    onlineOnly: false,
    quantity: product.quantity ?? 0,
    volume: undefined,
    colorName: variants[0]?.colorName,
    colorHex: variants[0]?.colorHex,
    images: product.images.map((image) => image.imageUrl),
    features: product.features.map((feature) => ({
      label: feature.featureName,
      value: feature.featureValue,
    })),
    variants,
  };
};

export const getMappedAdminProducts = async () => {
  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
    include: {
      images: { orderBy: { position: "asc" } },
      categories: { include: { category: true } },
      features: true,
      variants: true,
    },
  });

  return products.map((product) =>
    mapAdminProduct({
      ...product,
      category: product.categories[0]?.category ?? null,
    })
  );
};

export const getMappedAdminProduct = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      categories: { include: { category: true } },
      features: true,
      variants: true,
    },
  });

  if (!product) return null;

  return mapAdminProduct({
    ...product,
    category: product.categories[0]?.category ?? null,
  });
};

const ensureCategory = async (categoryId: number) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new Error(`Catégorie introuvable: ${categoryId}`);
  }
  return category;
};

const createProductCategoryLinks = async (productId: number, categoryId: number) => {
  await prisma.productCategory.create({
    data: {
      productId,
      categoryId,
    },
  });
};

const createOrUpdateImages = async (productId: number, images: string[]) => {
  if (!images.length) return;
  await prisma.productImage.deleteMany({ where: { productId } });
  await prisma.productImage.createMany({
    data: images.map((imageUrl, index) => ({
      productId,
      imageUrl,
      position: index + 1,
    })),
  });
};

const createOrUpdateFeatures = async (
  productId: number,
  features: Array<{ label: string; value: string }>
) => {
  if (!features.length) return;
  await prisma.productFeature.deleteMany({ where: { productId } });
  await prisma.productFeature.createMany({
    data: features.map((feature) => ({
      productId,
      featureName: feature.label,
      featureValue: feature.value,
    })),
  });
};

const createOrUpdateVariants = async (
  productId: number,
  variants: Array<{ colorName?: string; colorHex?: string; size?: string; price?: string; stock?: string; imagesText?: string }>
) => {
  if (!variants.length) return;
  await prisma.productVariant.deleteMany({ where: { productId } });
  await prisma.productVariant.createMany({
    data: variants.map((variant) => ({
      productId,
      groupName: variant.colorName || variant.size || "",
      value: variant.size || variant.colorName || "",
    })),
  });
};

export const createProduct = async (fields: {
  name: string;
  description?: string;
  descriptionShort?: string;
  price: number;
  categoryId: number;
  active?: boolean;
  reference?: string;
  weight?: string | number;
  width?: string | number;
  height?: string | number;
  depth?: string | number;
  onSale?: boolean;
  onlineOnly?: boolean;
  quantity?: number;
  images?: string[];
  features?: Array<{ label: string; value: string }>;
}) => {
  try {
    const category = await ensureCategory(fields.categoryId);
    const maxScraped = await prisma.product.aggregate({ _max: { scrapedId: true } });
    const nextScrapedId = (maxScraped._max.scrapedId ?? 0) + 1;

    const product = await prisma.product.create({
      data: {
        scrapedId: nextScrapedId,
        sku: fields.reference || String(nextScrapedId),
        name: fields.name,
        description: fields.description || fields.descriptionShort || "",
        price: fields.price,
        currency: "TND",
        availability: fields.active === false ? "inactive" : "active",
        url: undefined,
        weight: fields.weight?.toString() || "",
        width: fields.width?.toString() || "",
        height: fields.height?.toString() || "",
        depth: fields.depth?.toString() || "",
        quantity: fields.quantity ?? 0,
        categories: {
          create: { categoryId: category.id },
        },
      },
    });

    await createOrUpdateImages(product.id, fields.images || []);
    await createOrUpdateFeatures(product.id, fields.features || []);

    return { success: true, id: product.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
};

export const updateProduct = async (
  id: number,
  fields: Partial<{
    name: string;
    description: string;
    descriptionShort: string;
    price: number;
    active: boolean;
    reference: string;
    weight: string | number;
    width: string | number;
    height: string | number;
    depth: string | number;
    onSale: boolean;
    onlineOnly: boolean;
    quantity: number;
    images: string[];
    features: Array<{ label: string; value: string }>;
    categoryId: number;
  }>
) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Produit introuvable" };
    }

    const data: any = {};
    if (fields.name !== undefined) data.name = fields.name;
    if (fields.description !== undefined) data.description = fields.description;
    if (fields.price !== undefined) data.price = fields.price;
    if (fields.reference !== undefined) data.sku = fields.reference;
    if (fields.weight !== undefined) data.weight = fields.weight.toString();
    if (fields.width !== undefined) data.width = fields.width.toString();
    if (fields.height !== undefined) data.height = fields.height.toString();
    if (fields.depth !== undefined) data.depth = fields.depth.toString();
    if (fields.quantity !== undefined) data.quantity = fields.quantity;
    if (fields.active !== undefined) data.availability = fields.active ? "active" : "inactive";

    await prisma.product.update({ where: { id }, data });

    if (fields.categoryId !== undefined) {
      await prisma.productCategory.deleteMany({ where: { productId: id } });
      await prisma.productCategory.create({ data: { productId: id, categoryId: fields.categoryId } });
    }

    if (fields.images) {
      await createOrUpdateImages(id, fields.images);
    }

    if (fields.features) {
      await createOrUpdateFeatures(id, fields.features);
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
};

export const deleteProduct = async (id: number) => {
  try {
    await prisma.productFeature.deleteMany({ where: { productId: id } });
    await prisma.productImage.deleteMany({ where: { productId: id } });
    await prisma.productVariant.deleteMany({ where: { productId: id } });
    await prisma.productCategory.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
};

export const proxyProductImage = async (
  productId: number,
  imageId: number
): Promise<{ buffer: Buffer; contentType: string } | null> => {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) return null;

  try {
    const response = await fetch(image.imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept:
          "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(
        `Image proxy fetch failed for ${image.imageUrl}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      buffer,
      contentType: response.headers.get("content-type") || "image/jpeg",
    };
  } catch (err) {
    console.error(`Image proxy error for ${image.imageUrl}:`, err);
    return null;
  }
};
