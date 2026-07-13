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

const CATEGORY_GROUPS: Array<{
  name: string;
  slug: string;
  childSlugs: string[];
}> = [
  {
    name: "Valises",
    slug: "valises",
    childSlugs: ["rigides", "souples", "ensembles-de-valises", "valise-enfant"],
  },
  {
    name: "Sacs",
    slug: "sacs",
    childSlugs: ["sac-a-dos", "sac-ordinateur"],
  },
  {
    name: "Business",
    slug: "business",
    childSlugs: ["pilot-case", "portefeuille"],
  },
  {
    name: "Disney & Enfant",
    slug: "disney-amp-enfant",
    childSlugs: ["valise-enfant", "sac-scolaire", "sac-a-dos-enfants"],
  },
  {
    name: "Accessoires",
    slug: "accessoires",
    childSlugs: [
      "cadenas",
      "sangles",
      "housse-de-valise",
      "coussin-de-voyage",
      "parapluie",
      "masques",
    ],
  },
];

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
  const nodeBySlug = new Map(nodes.map((node) => [node.slug, node]));
  const productCountByCategoryId = activeProducts.reduce<Record<number, number>>((acc, product) => {
    for (const category of product.associations?.categories || []) {
      const categoryId = Number(category.id);
      acc[categoryId] = (acc[categoryId] || 0) + 1;
    }
    return acc;
  }, {});
  const productCountBySlug = nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.slug] = productCountByCategoryId[node.id] || 0;
    return acc;
  }, {});

  return CATEGORY_GROUPS.map((group, index) => {
    const node = nodeBySlug.get(group.slug);
    const children = group.childSlugs
      .map((childSlug) => nodeBySlug.get(childSlug))
      .filter((child): child is CategoryNode => Boolean(child))
      .filter((child) => (productCountBySlug[child.slug] || 0) > 0)
      .map((child) => ({ name: child.name, slug: child.slug }));
    return {
      id: node?.id || 1000 + index,
      name: node?.name || group.name,
      slug: group.slug,
      description: node?.description,
      image: node ? getCategoryImageUrl(node.id) : undefined,
      children,
    };
  }).filter((category) => {
    const childCount = category.children?.length || 0;
    const node = nodeBySlug.get(category.slug);
    return childCount > 0 || (node ? (productCountBySlug[node.slug] || 0) > 0 : false);
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
