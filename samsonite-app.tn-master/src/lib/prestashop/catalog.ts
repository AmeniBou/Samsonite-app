import { getCatalogData, getCategoryImageUrl } from "./api";
import { decodeHtmlEntities, getLangValue } from "./helpers";
import { mapPSProductToDisplay } from "./mappers";
import type {
  CategoryDisplay,
  ProductDisplay,
  PSCategory,
  PSCombination,
  PSFeatureValue,
  PSProductOptionValue,
  PSStockAvailable,
} from "./types";

interface CategoryNode {
  id: number;
  parentId: number;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
}

const stripHtml = (value: string): string => {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
};

const getRawLangValue = (
  field?: { id: string; value: string }[],
  langId = "1"
): string => {
  if (!field) return "";

  const normalize = (value?: string) => (value || "").trim();
  const requested = field.find((f) => f.id === langId);
  const requestedValue = normalize(requested?.value);
  if (requestedValue) return requestedValue;

  const firstNonEmpty = field.find((f) => normalize(f.value));
  if (firstNonEmpty) return normalize(firstNonEmpty.value);

  return normalize(field[0]?.value);
};

const ROOT_CATEGORY_ID = 2;
const EXCLUDED_TOP_CATEGORY_IDS = new Set<number>([40]);
const NAV_PRIORITY_BY_ID: Record<number, number> = {
  13: 1, // Valises
  32: 2, // Sac a dos
  10: 3, // Business
  17: 4, // Accessoires
  27: 5, // Disney & Enfant
  37: 6, // Promos
};

const mapCategoryNode = (category: PSCategory): CategoryNode => {
  const id = Number(category.id);
  return {
    id,
    parentId: Number(category.id_parent),
    name: decodeHtmlEntities(getLangValue(category.name)),
    slug: getRawLangValue(category.link_rewrite) || `category-${id}`,
    description: category.description
      ? stripHtml(getLangValue(category.description))
      : undefined,
    active: category.active === "1",
  };
};

export const fetchDisplayCategories = async (): Promise<CategoryDisplay[]> => {
  const { categories: rawCategories, products: rawProducts } = await getCatalogData();
  const activeProducts = rawProducts.filter((product) => product.active === "1");
  const nodes = rawCategories
    .map(mapCategoryNode)
    .filter((node) => node.active && Boolean(node.name && node.slug));
  const productCountByCategoryId = activeProducts.reduce<Record<number, number>>((acc, product) => {
    for (const category of product.associations?.categories || []) {
      const categoryId = Number(category.id);
      acc[categoryId] = (acc[categoryId] || 0) + 1;
    }
    return acc;
  }, {});

  const topCategories = nodes
    .filter((node) => node.parentId === ROOT_CATEGORY_ID)
    .filter((node) => !EXCLUDED_TOP_CATEGORY_IDS.has(node.id))
    .filter((node) => (productCountByCategoryId[node.id] || 0) > 0)
    .sort((a, b) => {
      const rankA = NAV_PRIORITY_BY_ID[a.id] ?? 99;
      const rankB = NAV_PRIORITY_BY_ID[b.id] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    });

  return topCategories.map((node) => {
    const children = nodes
      .filter((child) => child.parentId === node.id)
      .filter((child) => (productCountByCategoryId[child.id] || 0) > 0)
      .map((child) => ({ name: child.name, slug: child.slug }));

    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      description: node.description,
      image: getCategoryImageUrl(node.id),
      children,
    };
  });
};

export const fetchDisplayProducts = async (): Promise<ProductDisplay[]> => {
  const {
    products: rawProducts,
    categories: rawCategories,
    combinations,
    productOptions,
    productOptionValues,
    stockAvailables,
    features,
    featureValues,
  } =
    await getCatalogData();
  const activeProducts = rawProducts.filter((product) => product.active === "1");

  const categorySlugById: Record<number, string> = {};
  for (const rawCategory of rawCategories) {
    const id = Number(rawCategory.id);
    const slug = getRawLangValue(rawCategory.link_rewrite);
    if (slug) categorySlugById[id] = slug;
  }

  const combinationsByProductId = combinations.reduce<Record<number, PSCombination[]>>(
    (acc, combination) => {
      const productId = Number(combination.id_product);
      if (!acc[productId]) acc[productId] = [];
      acc[productId].push(combination);
      return acc;
    },
    {}
  );

  const optionValueById = productOptionValues.reduce<Record<number, PSProductOptionValue>>(
    (acc, option) => {
      acc[Number(option.id)] = option;
      return acc;
    },
    {}
  );

  const optionGroupNameById = productOptions.reduce<Record<number, string>>((acc, option) => {
    const id = Number(option.id);
    const name = getLangValue(option.name) || getLangValue(option.public_name);
    if (id && name) acc[id] = name.trim();
    return acc;
  }, {});

  const stockByProductAttributeId = stockAvailables.reduce<Record<string, number>>(
    (acc, stock: PSStockAvailable) => {
      const productId = Number(stock.id_product);
      const attributeId = Number(stock.id_product_attribute);
      acc[`${productId}:${attributeId}`] = Number(stock.quantity || 0);
      return acc;
    },
    {}
  );
  const featureValueById = featureValues.reduce<Record<number, PSFeatureValue>>(
    (acc, featureValue) => {
      acc[Number(featureValue.id)] = featureValue;
      return acc;
    },
    {}
  );
  const featureById = features.reduce<Record<number, string>>((acc, feature) => {
    acc[Number(feature.id)] = getLangValue(feature.name);
    return acc;
  }, {});

  return activeProducts.map((product) =>
    mapPSProductToDisplay(product, {
      categorySlugById,
      combinationsByProductId,
      optionValueById,
      optionGroupNameById,
      stockByProductAttributeId,
      featureById,
      featureValueById,
    })
  );
};
