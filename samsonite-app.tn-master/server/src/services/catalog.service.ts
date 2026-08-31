import { prisma } from "../db/prisma.js";
import fs from "fs";
import path from "path";
import { getBestPromotionForProduct, getPromotionPrice, listActivePromotions, PromotionWithTargets } from "./promotions.service.js";

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildLangField = (value: string) => [{ id: "2", value: value || "" }];
const isAvailabilityInStock = (availability?: string | null) =>
  /instock|in_stock|available|disponible|active/i.test(availability || "");

const isAvailabilityInactive = (availability?: string | null) =>
  /inactive|disabled|desactive/i.test(availability || "");

const isAvailabilityOutOfStock = (availability?: string | null) =>
  /outofstock|out_of_stock|rupture|unavailable/i.test(availability || "");

const getCatalogQuantity = (availability?: string | null, quantity?: number | null) => {
  if (typeof quantity === "number" && quantity > 0) return quantity;
  if (isAvailabilityInStock(availability)) return 1;
  return 0;
};

// A promotion must never turn an unavailable item into an apparent offer.
const isCatalogItemAvailable = (availability?: string | null, quantity?: number | null) =>
  !isAvailabilityInactive(availability) && !isAvailabilityOutOfStock(availability) && getCatalogQuantity(availability, quantity) > 0;

type CatalogVariantRow = {
  id: number;
  groupName: string;
  value: string;
  colorName?: string | null;
  colorHex?: string | null;
  size?: string | null;
  weight?: string | null;
  width?: string | null;
  height?: string | null;
  depth?: string | null;
  isExpandable?: boolean | null;
  expandedWidth?: string | null;
  expandedHeight?: string | null;
  expandedDepth?: string | null;
  volume?: string | null;
  price?: { toString(): string; toNumber?: () => number } | null;
  stockInitial?: number | null;
  stock?: number | null;
  images?: string[];
};

type CatalogImageRow = { imageUrl: string };

const firstByGroup = (variants: CatalogVariantRow[], pattern: RegExp) =>
  variants.find((variant) => pattern.test(normalizeLabel(variant.groupName)));

const splitDimensions = (value?: string | null) => {
  const matches = (value || "").match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length < 3) return {};
  const [height, width, depth] = matches.map((entry) => entry.replace(",", "."));
  return { height, width, depth };
};

const isLegacyAttributeVariant = (variant: CatalogVariantRow) => {
  const group = normalizeLabel(variant.groupName);
  return /taille|size|dimension|poids|weight|volume/.test(group) && !variant.colorName && !(variant.images || []).length;
};

const hasRichVariantData = (variant: CatalogVariantRow) =>
  Boolean(
    variant.colorName?.trim() ||
      variant.colorHex?.trim() ||
      variant.width?.trim() ||
      variant.height?.trim() ||
      variant.depth?.trim() ||
      variant.expandedWidth?.trim() ||
      variant.expandedHeight?.trim() ||
      variant.expandedDepth?.trim() ||
      variant.volume?.trim() ||
      variant.weight?.trim() ||
      variant.price ||
      (variant.images || []).length > 0
  );

const getCatalogProductVariants = (
  variants: CatalogVariantRow[],
  productImages: CatalogImageRow[] = []
): CatalogVariantRow[] => {
  const colorRows = variants.filter(
    (variant) => /couleur|color/i.test(variant.groupName) || Boolean(variant.colorName || variant.colorHex)
  );
  const legacyRows = variants.filter(isLegacyAttributeVariant);

  if (colorRows.length > 0 && legacyRows.length > 0) {
    const sizeRow = firstByGroup(legacyRows, /taille|size/);
    const dimensionRow = firstByGroup(legacyRows, /dimension/);
    const weightRow = firstByGroup(legacyRows, /poids|weight/);
    const volumeRow = firstByGroup(legacyRows, /volume/);
    const dimensions = splitDimensions(dimensionRow?.value);
    const fallbackImages = productImages.map((image) => image.imageUrl).filter(Boolean);

    return colorRows.map((colorRow) => ({
      ...colorRow,
      groupName: "Variante",
      value: [colorRow.colorName || colorRow.value, sizeRow?.value].filter(Boolean).join(" / ") || "Variante",
      colorName: colorRow.colorName || colorRow.value,
      colorHex: colorRow.colorHex || getColorHex(colorRow.colorName || colorRow.value),
      size: colorRow.size || sizeRow?.value || null,
      height: colorRow.height || dimensions.height || null,
      width: colorRow.width || dimensions.width || null,
      depth: colorRow.depth || dimensions.depth || null,
      isExpandable: colorRow.isExpandable || Boolean(colorRow.expandedWidth || colorRow.expandedHeight || colorRow.expandedDepth),
      expandedWidth: colorRow.expandedWidth || null,
      expandedHeight: colorRow.expandedHeight || null,
      expandedDepth: colorRow.expandedDepth || null,
      weight: colorRow.weight || weightRow?.value || null,
      volume: colorRow.volume || volumeRow?.value || null,
      stock: colorRow.stock ?? sizeRow?.stock ?? 0,
      stockInitial: colorRow.stockInitial ?? sizeRow?.stockInitial ?? null,
      images: (colorRow.images || []).length > 0 ? colorRow.images : fallbackImages,
    }));
  }

  const meaningful = variants.filter(hasRichVariantData);
  return meaningful.length > 0 ? meaningful : variants;
};

const isRemoteUrl = (value: string) => /^https?:\/\//i.test(value);

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
  parentId?: number | null;
  isActive?: boolean;
  showInMainMenu?: boolean;
}) => ({
  id: category.id,
  id_parent: category.parentId ?? 2,
  name: buildLangField(category.name),
  description: buildLangField(""),
  link_rewrite: buildLangField(category.slug || normalizeSlug(category.name)),
  active: category.isActive === false ? "0" : "1",
  show_in_main_menu: category.showInMainMenu === false ? "0" : "1",
});

const mapProductToRaw = (product: {
  id: number;
  scrapedId: number;
  name: string;
  description?: string | null;
  price: { toString(): string };
  sku?: string | null;
  availability?: string | null;
  brandId?: number | null;
  brand?: { id: number; name: string } | null;
  url?: string | null;
  weight?: string | null;
  width?: string | null;
  height?: string | null;
  depth?: string | null;
  quantity?: number | null;
  images: Array<{ id: number; imageUrl: string }>;
  categories: Array<{
    category: {
      id: number;
      name: string;
      slug?: string | null;
      parentId?: number | null;
      parent?: { id: number; name: string; slug?: string | null; parentId?: number | null } | null;
    };
  }>;
  variants: CatalogVariantRow[];
  features: Array<{ id: number; featureName: string; featureValue: string }>;
}, activePromotions: PromotionWithTargets[] = []) => {
  const imageIds = product.images.map((image) => image.id).filter(Boolean);
  const catalogVariants = getCatalogProductVariants(product.variants, product.images);
  const quantity = getCatalogQuantity(product.availability, product.quantity);
  const promotion = isCatalogItemAvailable(product.availability, quantity)
    ? getBestPromotionForProduct(product, activePromotions)
    : undefined;
  const originalPrice = Number(product.price);
  const promotionPrice = getPromotionPrice(originalPrice, promotion);
  const categoryIds = new Set<number>();
  for (const relation of product.categories) {
    if (relation.category.id) categoryIds.add(relation.category.id);
    if (relation.category.parentId) categoryIds.add(relation.category.parentId);
  }
  const categoryAssociations = Array.from(categoryIds).map((id) => ({ id }));
  const defaultCategory =
    product.categories.find((relation) => relation.category.parentId)?.category ||
    product.categories[0]?.category;
  const parentCategory = defaultCategory?.parent || null;

  return {
    id: product.id,
    categoryId: defaultCategory?.id ?? 0,
    categoryName: defaultCategory?.name ?? "",
    categorySlug: defaultCategory?.slug || (defaultCategory?.name ? normalizeSlug(defaultCategory.name) : ""),
    parentCategoryId: parentCategory?.id ?? null,
    parentCategoryName: parentCategory?.name ?? "",
    parentCategorySlug: parentCategory?.slug || (parentCategory?.name ? normalizeSlug(parentCategory.name) : ""),
    name: buildLangField(product.name),
    description: buildLangField(product.description || ""),
    description_short: buildLangField(product.description || ""),
    link_rewrite: buildLangField(
      product.url ? normalizeSlug(new URL(product.url, "https://example.com").pathname.split("/").pop() || product.name) : normalizeSlug(product.name)
    ),
    price: promotionPrice.toString(),
    original_price: originalPrice.toString(),
    promotion_price: promotion ? promotionPrice.toString() : "",
    discount_percent: promotion ? promotion.percentage.toString() : "",
    has_promotion: promotion ? "1" : "0",
    promotion_name: promotion?.name || "",
    reference: product.sku || "",
    active: isAvailabilityInactive(product.availability) ? "0" : "1",
    manufacturer_name: product.brand?.name || "Samsonite",
    id_category_default: defaultCategory?.id ?? 0,
    id_default_image: imageIds.length > 0 ? imageIds[0] : undefined,
    weight: product.weight || "",
    width: product.width || "",
    height: product.height || "",
    depth: product.depth || "",
    quantity,
    associations: {
      categories: categoryAssociations,
      images: imageIds.map((id) => ({ id, imageUrl: product.images.find((img) => img.id === id)?.imageUrl })),
      product_option_values: catalogVariants.map((variant) => ({ id: variant.id })),
      product_features: product.features.map((feature) => ({
        id: feature.id,
        id_feature_value: feature.id,
      })),
    },
  };
};

export const getPublicCatalog = async () => {
  try {
    const [categories, products, activePromotions] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.product.findMany({
        orderBy: { id: "asc" },
        include: {
          images: { orderBy: { position: "asc" } },
          categories: { include: { category: { include: { parent: true } } } },
          brand: true,
          variants: { orderBy: { id: "asc" } },
          features: { orderBy: { id: "asc" } },
        },
      }),
      listActivePromotions(),
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
      for (const variant of getCatalogProductVariants(product.variants, product.images)) {
        getGroupId(variant.groupName);
      }
    }

    const variants = products.flatMap((product) =>
      getCatalogProductVariants(product.variants, product.images).map((variant) => ({
        product,
        variant,
        groupId: getGroupId(variant.groupName),
      }))
    );

    return {
      products: products.map((product) => mapProductToRaw(product, activePromotions)),
      categories: categories.map(mapCategoryToRaw),
      combinations: variants.map(({ product, variant }) => {
        const productQuantity = getCatalogQuantity(product.availability, product.quantity);
        const promotion = isCatalogItemAvailable(product.availability, productQuantity) && (variant.stock ?? 0) > 0
          ? getBestPromotionForProduct(product, activePromotions)
          : undefined;
        const originalPrice = Number(variant.price ?? product.price);
        const promotionPrice = getPromotionPrice(originalPrice, promotion);
        return {
          id: variant.id,
          id_product: product.id,
          price: promotionPrice.toString(),
          original_price: originalPrice.toString(),
          promotion_price: promotion ? promotionPrice.toString() : "",
          discount_percent: promotion ? promotion.percentage.toString() : "",
          has_promotion: promotion ? "1" : "0",
          promotion_name: promotion?.name || "",
          default_on: "0",
          colorName: variant.colorName || undefined,
          colorHex: variant.colorHex || undefined,
          size: variant.size || undefined,
          weight: variant.weight || undefined,
          width: variant.width || undefined,
          height: variant.height || undefined,
          depth: variant.depth || undefined,
          isExpandable: variant.isExpandable || undefined,
          expandedWidth: variant.expandedWidth || undefined,
          expandedHeight: variant.expandedHeight || undefined,
          expandedDepth: variant.expandedDepth || undefined,
          volume: variant.volume || undefined,
          stockInitial: variant.stockInitial ?? undefined,
          stock: variant.stock ?? undefined,
          images: variant.images || [],
          associations: {
            product_option_values: [{ id: variant.id }],
            images: (variant.images || []).map((imageUrl, index) => ({ id: variant.id * 1000 + index + 1, imageUrl })),
          },
        };
      }),
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
        quantity: variant.stock ?? getCatalogQuantity(product.availability, product.quantity),
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
  } catch (err) {
    console.warn("Prisma/DB unavailable, serving diagnostic fallback catalog", err);
    try {
      const base = path.join(process.cwd(), "server");
      const productsRaw = JSON.parse(fs.readFileSync(path.join(base, "products_diag.json"), "utf-8"));
      const categoriesRaw = JSON.parse(fs.readFileSync(path.join(base, "categories_diag.json"), "utf-8"));

      return {
        products: productsRaw,
        categories: categoriesRaw,
        combinations: [],
        productOptions: [],
        productOptionValues: [],
        stockAvailables: [],
        features: [],
        featureValues: [],
      };
    } catch (diagErr) {
      console.error("Failed to load diagnostic catalog fallback:", diagErr);
      throw err;
    }
  }
};

export const getBrands = async () => {
  return prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
};

const ensureUniqueBrandName = async (name: string, excludeId?: number) => {
  const existing = await prisma.brand.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });

  if (existing) {
    throw new Error(`La marque "${name}" existe deja. Choisis un autre nom.`);
  }
};

export const createBrand = async (fields: { name?: string }) => {
  try {
    const name = fields.name?.trim();
    if (!name) return { success: false, error: "Le nom de la marque est requis" };

    await ensureUniqueBrandName(name);
    const brand = await prisma.brand.create({ data: { name } });
    return { success: true, id: brand.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
};

export const updateBrand = async (id: number, fields: { name?: string }) => {
  try {
    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Marque introuvable" };

    const name = fields.name?.trim();
    if (!name) return { success: false, error: "Le nom de la marque est requis" };

    await ensureUniqueBrandName(name, id);
    await prisma.brand.update({ where: { id }, data: { name } });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
};

export const deleteBrand = async (id: number) => {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) return { success: false, error: "Marque introuvable" };
    if (brand._count.products > 0) {
      return {
        success: false,
        error: `Impossible de supprimer "${brand.name}" car ${brand._count.products} produit(s) utilisent cette marque.`,
      };
    }

    await prisma.brand.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
};

export const getCategories = async () => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return categories.map((category) => ({
    id: category.id,
    id_parent: category.parentId ?? 2,
    name: buildLangField(category.name),
    description: buildLangField(""),
    link_rewrite: buildLangField(category.slug || normalizeSlug(category.name)),
    active: category.isActive === false ? "0" : "1",
    show_in_main_menu: category.showInMainMenu === false ? "0" : "1",
  }));
};

export const getAdminCategories = async () => {
  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  const childrenByParentId = new Map<number, typeof categories>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const children = childrenByParentId.get(category.parentId) || [];
    children.push(category);
    childrenByParentId.set(category.parentId, children);
  }

  const totalProductCountCache = new Map<number, number>();
  const getTotalProductCount = (categoryId: number): number => {
    const cached = totalProductCountCache.get(categoryId);
    if (cached !== undefined) return cached;

    const category = categories.find((item) => item.id === categoryId);
    if (!category) return 0;

    const total =
      category._count.products +
      (childrenByParentId.get(categoryId) || []).reduce(
        (sum, child) => sum + getTotalProductCount(child.id),
        0
      );

    totalProductCountCache.set(categoryId, total);
    return total;
  };

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug || normalizeSlug(category.name),
    parentId: category.parentId ?? 0,
    parentName: category.parent?.name || "",
    productCount: category._count.products,
    totalProductCount: getTotalProductCount(category.id),
    childCount: category._count.children,
    isActive: category.isActive,
    showInMainMenu: category.showInMainMenu,
  }));
};

const normalizeCategoryParentId = (parentId?: number | null) => {
  if (!parentId || parentId <= 0) return null;
  return parentId;
};

const ensureCategoryParent = async (parentId: number | null) => {
  if (!parentId) return null;
  const parent = await prisma.category.findUnique({ where: { id: parentId } });
  if (!parent) {
    throw new Error(`Catégorie parente introuvable: ${parentId}`);
  }
  if (parent.parentId) {
    throw new Error("Une sous-catégorie ne peut pas devenir catégorie parente");
  }
  return parent;
};

const MAIN_MENU_CATEGORY_LIMIT = 7;

const ensureUniqueCategoryName = async (name: string, excludeId?: number) => {
  const existing = await prisma.category.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });

  if (existing) {
    throw new Error(`La catégorie "${name}" existe déjà. Choisis un autre nom.`);
  }
};

const ensureUniqueCategorySlug = async (slug: string, excludeId?: number) => {
  const existing = await prisma.category.findFirst({
    where: {
      slug: { equals: slug, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true, slug: true },
  });

  if (existing) {
    throw new Error(`Le slug "${slug}" est déjà utilisé par la catégorie "${existing.name}". Un slug doit être unique.`);
  }
};

const ensureMainMenuCategoryLimit = async (excludeId?: number) => {
  const count = await prisma.category.count({
    where: {
      parentId: null,
      isActive: true,
      showInMainMenu: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  if (count >= MAIN_MENU_CATEGORY_LIMIT) {
    throw new Error(`Limite atteinte : le menu principal contient déjà ${MAIN_MENU_CATEGORY_LIMIT} catégories. Retire une autre catégorie du menu principal ou choisis "Explorer seul".`);
  }
};

const wouldCreateCategoryCycle = async (categoryId: number, parentId: number | null) => {
  let currentParentId = parentId;
  while (currentParentId) {
    if (currentParentId === categoryId) return true;
    const current = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });
    currentParentId = current?.parentId ?? null;
  }
  return false;
};

export const createCategory = async (fields: {
  name?: string;
  slug?: string;
  parentId?: number | null;
  isActive?: boolean;
  showInMainMenu?: boolean;
}) => {
  try {
    const name = fields.name?.trim();
    if (!name) return { success: false, error: "Le nom de la catégorie est requis" };

    const parentId = normalizeCategoryParentId(fields.parentId);
    await ensureCategoryParent(parentId);
    const slug = fields.slug?.trim() || normalizeSlug(name);
    await ensureUniqueCategoryName(name);
    await ensureUniqueCategorySlug(slug);
    const isActive = fields.isActive ?? true;
    const showInMainMenu = parentId ? false : fields.showInMainMenu ?? true;

    if (!parentId && isActive && showInMainMenu) {
      await ensureMainMenuCategoryLimit();
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        parentId,
        isActive,
        showInMainMenu,
      },
    });

    return { success: true, id: category.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
};

export const updateCategory = async (
  id: number,
  fields: Partial<{ name: string; slug: string; parentId: number | null; isActive: boolean; showInMainMenu: boolean }>
) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Catégorie introuvable" };

    const data: { name?: string; slug?: string; parentId?: number | null; isActive?: boolean; showInMainMenu?: boolean } = {};
    if (fields.name !== undefined) {
      const name = fields.name.trim();
      if (!name) return { success: false, error: "Le nom de la catégorie est requis" };
      await ensureUniqueCategoryName(name, id);
      data.name = name;
    }
    if (fields.slug !== undefined || fields.name !== undefined) {
      const slug = fields.slug?.trim() || normalizeSlug(data.name || existing.name);
      await ensureUniqueCategorySlug(slug, id);
      data.slug = slug;
    }
    if (fields.parentId !== undefined) {
      const parentId = normalizeCategoryParentId(fields.parentId);
      await ensureCategoryParent(parentId);
      if (await wouldCreateCategoryCycle(id, parentId)) {
        return { success: false, error: "Une catégorie ne peut pas être son propre parent" };
      }
      data.parentId = parentId;
      if (parentId) data.showInMainMenu = false;
    }
    if (fields.isActive !== undefined) {
      data.isActive = Boolean(fields.isActive);
    }
    if (fields.showInMainMenu !== undefined && !(data.parentId ?? existing.parentId)) {
      data.showInMainMenu = Boolean(fields.showInMainMenu);
    }

    const finalParentId = data.parentId !== undefined ? data.parentId : existing.parentId;
    const finalIsActive = data.isActive !== undefined ? data.isActive : existing.isActive;
    const finalShowInMainMenu =
      data.showInMainMenu !== undefined ? data.showInMainMenu : existing.showInMainMenu;

    if (!finalParentId && finalIsActive && finalShowInMainMenu) {
      await ensureMainMenuCategoryLimit(id);
    }

    await prisma.category.update({ where: { id }, data });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
};

export const deleteCategory = async (id: number) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) return { success: false, error: "Catégorie introuvable" };
    if (category._count.products > 0 || category._count.children > 0) {
      return {
        success: false,
        error: "Impossible de supprimer une catégorie utilisée par des produits ou des sous-catégories",
      };
    }

    await prisma.category.delete({ where: { id } });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
};
const mapAdminProduct = (product: {
  id: number;
  name: string;
  sku?: string | null;
  price: { toNumber(): number; toString(): string };
  availability?: string | null;
  brand?: { id: number; name: string } | null;
  category: { id: number; name: string; parentId?: number | null } | null;
  images: Array<{ id: number; imageUrl: string }>;
  features: Array<{ featureName: string; featureValue: string }>;
  variants: CatalogVariantRow[];
  description?: string | null;
  quantity?: number | null;
  weight?: string | null;
  width?: string | null;
  height?: string | null;
  depth?: string | null;
}) => {
  const mainImage = product.images[0] ?? null;
  const imageId = mainImage?.id ?? null;
  // "Stock Actuel" is stored in ProductVariant.stock. For products with
  // variants, the product stock is always their current-stock total.
  const variantStock = product.variants.length > 0
    ? product.variants.reduce((total, variant) => total + Math.max(0, variant.stock ?? 0), 0)
    : null;
  const stock = variantStock ?? getCatalogQuantity(product.availability, product.quantity);
  const meaningfulVariants = getCatalogProductVariants(product.variants, product.images);
  const variants = meaningfulVariants.map((variant) => {
    const group = normalizeLabel(variant.groupName);
    const isColor = /couleur|color/.test(group);
    const isSize = /taille|size/.test(group);
    const colorName = variant.colorName || (isColor ? variant.value : undefined);
    const size = variant.size || (isSize ? variant.value : !isColor ? variant.value : undefined);
    return {
      colorName,
      colorHex: variant.colorHex || (colorName ? getColorHex(colorName) : undefined),
      size,
      weight: variant.weight || undefined,
      width: variant.width || undefined,
      height: variant.height || undefined,
      depth: variant.depth || undefined,
      isExpandable: variant.isExpandable || undefined,
      expandedWidth: variant.expandedWidth || undefined,
      expandedHeight: variant.expandedHeight || undefined,
      expandedDepth: variant.expandedDepth || undefined,
      volume: variant.volume || undefined,
      price: variant.price ? Number(variant.price) : Number(product.price) || undefined,
      stockInitial: variant.stockInitial ?? undefined,
      stock: variant.stock ?? stock,
      images: variant.images || [],
    };
  });

  return {
    id: product.id,
    name: product.name,
    reference: product.sku || "",
    price: Number(product.price) || 0,
    active: !isAvailabilityInactive(product.availability),
    brandId: product.brand?.id ?? 0,
    brandName: product.brand?.name ?? "Sans marque",
    categoryId: product.category?.id ?? 0,
    parentCategoryId: product.category?.parentId ?? product.category?.id ?? 0,
    categoryName: product.category?.name ?? "Sans catégorie",
    imageId,
    imageUrl: mainImage?.imageUrl ?? null,
    stock,
    hasVariants: variants.length > 0,
    variantCount: variants.length,
    description: product.description || "",
    descriptionShort: product.description || "",
    weight: product.weight || "",
    width: product.width || "",
    height: product.height || "",
    depth: product.depth || "",
    onSale: false,
    onlineOnly: false,
    quantity: stock,
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

const selectAdminProductCategory = (
  categories: Array<{ category: { id: number; name: string; parentId?: number | null } }>
) => {
  if (categories.length === 0) return null;
  return categories.find((relation) => relation.category.parentId)?.category ?? categories[0]?.category ?? null;
};

export const getMappedAdminProducts = async () => {
  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
    include: {
      images: { orderBy: { position: "asc" } },
      categories: { include: { category: true } },
      brand: true,
      features: true,
      variants: true,
    },
  });

  return products.map((product) =>
    mapAdminProduct({
      ...product,
      category: selectAdminProductCategory(product.categories),
    })
  );
};

export const getMappedAdminProduct = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      categories: { include: { category: true } },
      brand: true,
      features: true,
      variants: true,
    },
  });

  if (!product) return null;

  return mapAdminProduct({
    ...product,
    category: selectAdminProductCategory(product.categories),
  });
};

const ensureBrand = async (brandId?: number) => {
  if (!brandId) return null;
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    throw new Error(`Marque introuvable: ${brandId}`);
  }
  return brand;
};

const ensureCategory = async (categoryId: number) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new Error(`Catégorie introuvable: ${categoryId}`);
  }
  return category;
};

const ensureProductSubCategory = async (categoryId: number) => {
  const category = await ensureCategory(categoryId);
  if (!category.parentId) {
    throw new Error("Choisis une vraie sous-categorie, pas une categorie parente.");
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

const isValidImageReference = (value: string): boolean => {
  const trimmed = value.trim();
  return /^(https?:\/\/|\/)([^\s]+)\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(trimmed);
};

const ensureUniqueProductReference = async (reference?: string, excludeId?: number) => {
  const sku = reference?.trim();
  if (!sku) return;

  const existing = await prisma.product.findFirst({
    where: {
      sku,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, name: true },
  });

  if (existing) {
    throw new Error(`La référence "${sku}" est déjà utilisée par le produit "${existing.name}".`);
  }
};

const createOrUpdateVariants = async (
  productId: number,
  variants: Array<{ colorName?: string; colorHex?: string; size?: string; weight?: string | number; width?: string | number; height?: string | number; depth?: string | number; isExpandable?: boolean; expandedWidth?: string | number; expandedHeight?: string | number; expandedDepth?: string | number; volume?: string | number; price?: string | number; stockInitial?: string | number; stock?: string | number; imagesText?: string; images?: string[] }>
) => {
  if (!variants.length) {
    throw new Error("Un produit doit contenir au moins une variante.");
  }

  const seenVariantKeys = new Set<string>();
  for (const [index, variant] of variants.entries()) {
    const colorName = variant.colorName?.trim().toLowerCase() || "";
    const size = variant.size?.trim().toLowerCase() || "";
    const price = variant.price !== undefined && variant.price !== "" ? Number(variant.price) : NaN;
    const stock = variant.stock !== undefined && variant.stock !== "" ? Number(variant.stock) : NaN;
    const stockInitial = variant.stockInitial !== undefined && variant.stockInitial !== "" ? Number(variant.stockInitial) : undefined;
    const images = variant.images || variant.imagesText
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean) || [];

    if (!colorName) {
      throw new Error(`La couleur de la variante #${index + 1} est requise.`);
    }
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`Le prix de la variante #${index + 1} est requis et doit être supérieur à 0.`);
    }
    if (!Number.isFinite(stock) || stock < 0) {
      throw new Error(`Le stock de la variante #${index + 1} doit être un nombre positif ou nul.`);
    }
    if (stockInitial !== undefined && (!Number.isFinite(stockInitial) || stockInitial < 0)) {
      throw new Error(`Le stock initial de la variante #${index + 1} doit être un nombre positif ou nul.`);
    }
    if (!images.length) {
      throw new Error(`Ajoute au moins une image pour la variante #${index + 1}.`);
    }
    const invalidImage = images.find((image) => !isValidImageReference(image));
    if (invalidImage) {
      throw new Error(`Image invalide dans la variante #${index + 1}: ${invalidImage}`);
    }

    const key = [
      colorName,
      size,
      String(variant.height || "").trim().toLowerCase(),
      String(variant.width || "").trim().toLowerCase(),
      String(variant.depth || "").trim().toLowerCase(),
      String(variant.volume || "").trim().toLowerCase(),
    ].join("::");
    if (seenVariantKeys.has(key)) {
      throw new Error(`La variante #${index + 1} est dupliquée pour ce produit. Change la couleur, la taille ou les dimensions.`);
    }
    seenVariantKeys.add(key);
  }

  await prisma.productVariant.deleteMany({ where: { productId } });
  const data = variants
    .map((variant) => {
      const colorName = variant.colorName?.trim() || undefined;
      const size = variant.size?.trim() || undefined;
      const images = variant.images || variant.imagesText
        ?.split("\n")
        .map((line) => line.trim())
        .filter(Boolean) || [];
      const weight = variant.weight !== undefined ? String(variant.weight).trim() || undefined : undefined;
      const width = variant.width !== undefined ? String(variant.width).trim() || undefined : undefined;
      const height = variant.height !== undefined ? String(variant.height).trim() || undefined : undefined;
      const depth = variant.depth !== undefined ? String(variant.depth).trim() || undefined : undefined;
      const isExpandable = Boolean(variant.isExpandable);
      const expandedWidth = isExpandable && variant.expandedWidth !== undefined ? String(variant.expandedWidth).trim() || undefined : undefined;
      const expandedHeight = isExpandable && variant.expandedHeight !== undefined ? String(variant.expandedHeight).trim() || undefined : undefined;
      const expandedDepth = isExpandable && variant.expandedDepth !== undefined ? String(variant.expandedDepth).trim() || undefined : undefined;
      const volume = variant.volume !== undefined ? String(variant.volume).trim() || undefined : undefined;
      const stockInitial =
        variant.stockInitial !== undefined && variant.stockInitial !== ""
          ? Math.max(0, Math.floor(Number(variant.stockInitial)))
          : undefined;
      if (
        !colorName &&
        !size &&
        !weight &&
        !width &&
        !height &&
        !depth &&
        !isExpandable &&
        !expandedWidth &&
        !expandedHeight &&
        !expandedDepth &&
        !volume &&
        variant.price === undefined &&
        stockInitial === undefined &&
        variant.stock === undefined &&
        images.length === 0
      ) {
        return null;
      }
      return {
        productId,
        groupName: "Variante",
        value: [colorName, size].filter(Boolean).join(" / ") || "Variante",
        colorName,
        colorHex: variant.colorHex?.trim() || undefined,
        size,
        weight,
        width,
        height,
        depth,
        isExpandable,
        expandedWidth,
        expandedHeight,
        expandedDepth,
        volume,
        price: variant.price !== undefined && variant.price !== "" ? Number(variant.price) : undefined,
        stockInitial,
        stock: variant.stock !== undefined && variant.stock !== "" ? Math.max(0, Math.floor(Number(variant.stock))) : stockInitial,
        images,
      };
    })
    .filter((variant): variant is NonNullable<typeof variant> => Boolean(variant));
  if (!data.length) return;
  await prisma.productVariant.createMany({ data });
};

const syncProductQuantityFromVariants = async (productId: number) => {
  const result = await prisma.productVariant.aggregate({
    where: { productId },
    _sum: { stock: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: { quantity: Math.max(0, result._sum.stock ?? 0) },
  });
};
export const createProduct = async (fields: {
  name: string;
  description?: string;
  descriptionShort?: string;
  price: number;
  categoryId: number;
  brandId?: number;
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
  variants?: Array<{ colorName?: string; colorHex?: string; size?: string; weight?: string | number; width?: string | number; height?: string | number; depth?: string | number; isExpandable?: boolean; expandedWidth?: string | number; expandedHeight?: string | number; expandedDepth?: string | number; volume?: string | number; price?: string | number; stockInitial?: string | number; stock?: string | number; imagesText?: string; images?: string[] }>;
}) => {
  try {
    if (!Number.isFinite(fields.price) || fields.price <= 0) {
      throw new Error("Le prix du produit est obligatoire et doit être supérieur à 0.");
    }
    await ensureUniqueProductReference(fields.reference);
    const category = await ensureProductSubCategory(fields.categoryId);
    const brand = await ensureBrand(fields.brandId);
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
        brandId: brand?.id,
        categories: {
          create: { categoryId: category.id },
        },
      },
    });

    await createOrUpdateImages(product.id, fields.images || []);
    await createOrUpdateFeatures(product.id, fields.features || []);
    await createOrUpdateVariants(product.id, fields.variants || []);
    await syncProductQuantityFromVariants(product.id);

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
    variants: Array<{ colorName?: string; colorHex?: string; size?: string; weight?: string | number; width?: string | number; height?: string | number; depth?: string | number; isExpandable?: boolean; expandedWidth?: string | number; expandedHeight?: string | number; expandedDepth?: string | number; volume?: string | number; price?: string | number; stockInitial?: string | number; stock?: string | number; imagesText?: string; images?: string[] }>;
    categoryId: number;
    brandId: number;
  }>
) => {
  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { categories: true },
    });
    if (!existing) {
      return { success: false, error: "Produit introuvable" };
    }

    if (fields.price !== undefined && (!Number.isFinite(fields.price) || fields.price <= 0)) {
      throw new Error("Le prix du produit est obligatoire et doit être supérieur à 0.");
    }
    if (fields.reference !== undefined) {
      await ensureUniqueProductReference(fields.reference, id);
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
    if (fields.brandId !== undefined) {
      const brand = await ensureBrand(fields.brandId);
      data.brandId = brand?.id ?? null;
    }

    await prisma.product.update({ where: { id }, data });

    if (fields.categoryId !== undefined) {
      await ensureProductSubCategory(fields.categoryId);
      await prisma.productCategory.deleteMany({ where: { productId: id } });
      await prisma.productCategory.create({ data: { productId: id, categoryId: fields.categoryId } });
    }

    if (fields.images) {
      await createOrUpdateImages(id, fields.images);
    }

    if (fields.features) {
      await createOrUpdateFeatures(id, fields.features);
    }

    if (fields.variants) {
      await createOrUpdateVariants(id, fields.variants);
      await syncProductQuantityFromVariants(id);
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
  if (!isRemoteUrl(image.imageUrl)) return null;

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
