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
  showInMainMenu: boolean;
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
    showInMainMenu: category.show_in_main_menu !== "0",
  };
};

export const fetchDisplayCategories = async (): Promise<CategoryDisplay[]> => {
  const { categories: rawCategories } = await getCatalogData();
  const allNodes = rawCategories
    .map(mapCategoryNode)
    .filter((node) => Boolean(node.name && node.slug));
  const inactiveSlugs = new Set(allNodes.filter((node) => !node.active).map((node) => node.slug));
  const nodes = allNodes.filter((node) => node.active);
  const nodeBySlug = new Map(nodes.map((node) => [node.slug, node]));
  const childrenByParentId = nodes.reduce<Record<number, CategoryNode[]>>((acc, node) => {
    if (!node.parentId || node.parentId === 2) return acc;
    if (!acc[node.parentId]) acc[node.parentId] = [];
    acc[node.parentId].push(node);
    return acc;
  }, {});

  const usedSlugs = new Set<string>();
  const toChildDisplay = (node: CategoryNode) => ({ name: node.name, slug: node.slug, isActive: node.active });
  const sortChildren = (items: Array<{ name: string; slug: string }>) =>
    items.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  const groupedCategories = CATEGORY_GROUPS.filter((group) => !inactiveSlugs.has(group.slug)).map((group, index) => {
    const node = nodeBySlug.get(group.slug);
    const childNodes = [
      ...group.childSlugs
        .map((childSlug) => nodeBySlug.get(childSlug))
        .filter((child): child is CategoryNode => Boolean(child)),
      ...(node ? childrenByParentId[node.id] || [] : []),
    ];
    const children = sortChildren(
      Array.from(new Map(childNodes.map((child) => [child.slug, toChildDisplay(child)])).values())
        .filter((child) => child.slug !== group.slug)
    );

    usedSlugs.add(group.slug);
    children.forEach((child) => usedSlugs.add(child.slug));

    return {
      id: node?.id || 1000 + index,
      name: node?.name || group.name,
      slug: group.slug,
      description: node?.description,
      image: node ? getCategoryImageUrl(node.id) : undefined,
      isActive: node?.active ?? true,
      showInMainMenu: node?.showInMainMenu ?? true,
      children,
    };
  });

  const extraRootCategories = nodes
    .filter((node) => !usedSlugs.has(node.slug))
    .filter((node) => !node.parentId || node.parentId === 2 || !nodes.some((parent) => parent.id === node.parentId))
    .map((node) => {
      const children = sortChildren(
        (childrenByParentId[node.id] || [])
          .filter((child) => child.slug !== node.slug)
          .map(toChildDisplay)
      );
      children.forEach((child) => usedSlugs.add(child.slug));
      usedSlugs.add(node.slug);
      return {
        id: node.id,
        name: node.name,
        slug: node.slug,
        description: node.description,
        image: getCategoryImageUrl(node.id),
        isActive: node.active,
        showInMainMenu: node.showInMainMenu,
        children,
      };
    });

  const orphanChildren = nodes
    .filter((node) => !usedSlugs.has(node.slug))
    .map((node) => ({
      id: node.id,
      name: node.name,
      slug: node.slug,
      description: node.description,
      image: getCategoryImageUrl(node.id),
      isActive: node.active,
      showInMainMenu: node.showInMainMenu,
      children: [],
    }));

  return [...groupedCategories, ...extraRootCategories, ...orphanChildren];
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
