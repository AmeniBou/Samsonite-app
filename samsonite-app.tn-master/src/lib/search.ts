import type { CategoryDisplay, ProductDisplay } from "@/lib/prestashop/types";

export interface SearchableCategory {
  name: string;
  slug: string;
}

export interface SearchSuggestion {
  type: "product" | "category" | "collection" | "color" | "size";
  label: string;
  value: string;
  href?: string;
}

export const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9&]+/g, " ")
    .trim();

export const levenshteinDistance = (a: string, b: string) => {
  const left = normalizeSearchText(a);
  const right = normalizeSearchText(b);
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }

  return previous[right.length];
};

export const isFuzzyMatch = (query: string, candidate: string) => {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedCandidate = normalizeSearchText(candidate);
  if (!normalizedQuery || !normalizedCandidate) return false;
  if (normalizedCandidate.includes(normalizedQuery)) return true;

  return normalizedCandidate
    .split(" ")
    .filter((word) => word.length >= 3)
    .some((word) => {
      const maxDistance = normalizedQuery.length <= 4 ? 1 : 2;
      return levenshteinDistance(normalizedQuery, word) <= maxDistance;
    });
};

export const flattenCategories = (categories: CategoryDisplay[]): SearchableCategory[] =>
  categories
    .flatMap((category) => [
      { name: category.name, slug: category.slug },
      ...(category.children || []),
    ])
    .filter((category, index, source) => source.findIndex((item) => item.slug === category.slug) === index);

export const getProductSearchParts = (
  product: ProductDisplay,
  categoryNameBySlug: Map<string, string>
) => [
  product.name,
  product.shortDescription,
  product.description,
  product.collection,
  product.dimensions || "",
  product.weight || "",
  ...product.categorySlugs.map((slug) => categoryNameBySlug.get(slug) || slug),
  ...product.colors.map((color) => color.name),
  ...product.variants.flatMap((variant) => [
    variant.size || "",
    variant.dimensions || "",
    variant.extensibleDimensions || "",
    variant.weight || "",
    variant.volume || "",
    variant.color?.name || "",
  ]),
  ...product.characteristics.flatMap((item) => [item.label, item.value]),
];

export const scoreProduct = (
  product: ProductDisplay,
  query: string,
  categoryNameBySlug: Map<string, string>
) => {
  const normalizedQuery = normalizeSearchText(query);
  const words = normalizedQuery.split(" ").filter(Boolean);
  const parts = getProductSearchParts(product, categoryNameBySlug);
  const haystack = normalizeSearchText(parts.join(" "));
  const name = normalizeSearchText(product.name);
  const collection = normalizeSearchText(product.collection);

  if (!normalizedQuery) return 1;

  let score = 0;
  if (name === normalizedQuery) score += 140;
  if (name.startsWith(normalizedQuery)) score += 90;
  if (name.includes(normalizedQuery)) score += 60;
  if (collection.includes(normalizedQuery)) score += 35;
  if (haystack.includes(normalizedQuery)) score += 35;

  for (const word of words) {
    if (name.includes(word)) score += 24;
    if (collection.includes(word)) score += 16;
    if (haystack.includes(word)) score += 10;
  }

  if (score === 0) {
    const fuzzyParts = [product.name, product.collection, ...product.colors.map((color) => color.name)];
    if (fuzzyParts.some((part) => isFuzzyMatch(normalizedQuery, part))) score += 18;
  }

  return score;
};

export const getSearchSuggestions = ({
  query,
  products,
  categories,
  limit = 8,
}: {
  query: string;
  products: ProductDisplay[];
  categories: CategoryDisplay[];
  limit?: number;
}) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const suggestions: SearchSuggestion[] = [];
  const seen = new Set<string>();
  const push = (suggestion: SearchSuggestion) => {
    const key = `${suggestion.type}:${normalizeSearchText(suggestion.value)}`;
    if (seen.has(key) || suggestions.length >= limit) return;
    seen.add(key);
    suggestions.push(suggestion);
  };

  for (const product of products) {
    if (suggestions.length >= limit) break;
    if (isFuzzyMatch(normalizedQuery, product.name)) {
      push({
        type: "product",
        label: product.name,
        value: product.name,
        href: `/produit/${product.id}-${product.slug}`,
      });
    }
  }

  for (const category of flattenCategories(categories)) {
    if (suggestions.length >= limit) break;
    if (isFuzzyMatch(normalizedQuery, category.name)) {
      push({
        type: "category",
        label: category.name,
        value: category.name,
        href: `/categorie/${category.slug}`,
      });
    }
  }

  const collections = Array.from(new Set(products.map((product) => product.collection).filter(Boolean)));
  for (const collection of collections) {
    if (suggestions.length >= limit) break;
    if (isFuzzyMatch(normalizedQuery, collection)) {
      push({ type: "collection", label: collection, value: collection });
    }
  }

  const colors = Array.from(new Set(products.flatMap((product) => product.colors.map((color) => color.name))));
  for (const color of colors) {
    if (suggestions.length >= limit) break;
    if (isFuzzyMatch(normalizedQuery, color)) {
      push({ type: "color", label: color, value: color });
    }
  }

  const sizes = Array.from(new Set(products.flatMap((product) => product.variants.map((variant) => variant.size || ""))))
    .filter(Boolean);
  for (const size of sizes) {
    if (suggestions.length >= limit) break;
    if (isFuzzyMatch(normalizedQuery, size)) {
      push({ type: "size", label: size, value: size });
    }
  }

  return suggestions;
};
