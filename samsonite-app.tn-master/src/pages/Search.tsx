import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";

import ProductCard from "@/components/ProductCard";
import BrandLoader from "@/components/BrandLoader";
import { fetchDisplayCategories, fetchDisplayProducts } from "@/lib/prestashop/catalog";
import type { CategoryDisplay, ProductDisplay } from "@/lib/prestashop/types";
import { useLanguage } from "@/lib/i18n";

const sortOptions = [
  { value: "relevance", labelKey: "sort.relevance" },
  { value: "price-asc", labelKey: "sort.priceAsc" },
  { value: "price-desc", labelKey: "sort.priceDesc" },
  { value: "name", labelKey: "sort.name" },
];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9&]+/g, " ")
    .trim();

const Search = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const normalizedQuery = normalizeText(query);
  const [searchInput, setSearchInput] = useState(query);
  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("relevance");
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [fetchedProducts, fetchedCategories] = await Promise.all([
          fetchDisplayProducts(),
          fetchDisplayCategories(),
        ]);
        if (!cancelled) {
          setProducts(fetchedProducts);
          setCategories(fetchedCategories);
        }
      } catch (error) {
        console.error("Unable to load Prestashop search data", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.slug, category.name);
      for (const child of category.children || []) {
        map.set(child.slug, child.name);
      }
    }
    return map;
  }, [categories]);

  const categorySuggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    return categories
      .flatMap((category) => [
        { name: category.name, slug: category.slug },
        ...(category.children || []),
      ])
      .filter((category, index, source) => source.findIndex((item) => item.slug === category.slug) === index)
      .filter((category) => normalizeText(category.name).includes(normalizedQuery))
      .slice(0, 5);
  }, [categories, normalizedQuery]);

  const scoredResults = useMemo(() => {
    const words = normalizedQuery.split(" ").filter(Boolean);

    return products
      .map((product) => {
        const searchableParts = [
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

        const haystack = normalizeText(searchableParts.join(" "));
        const name = normalizeText(product.name);
        const collection = normalizeText(product.collection);
        let score = 0;

        if (!normalizedQuery) {
          score = 1;
        } else {
          if (name === normalizedQuery) score += 120;
          if (name.startsWith(normalizedQuery)) score += 80;
          if (name.includes(normalizedQuery)) score += 55;
          if (collection.includes(normalizedQuery)) score += 25;
          if (haystack.includes(normalizedQuery)) score += 30;
          for (const word of words) {
            if (name.includes(word)) score += 20;
            if (haystack.includes(word)) score += 8;
          }
        }

        return { product, score };
      })
      .filter(({ product, score }) => score > 0 && (!inStockOnly || (product.stock || 0) > 0));
  }, [categoryNameBySlug, inStockOnly, normalizedQuery, products]);

  const results = useMemo(() => {
    const nextResults = [...scoredResults].sort((a, b) => {
      if (sortBy === "price-asc") return a.product.price - b.product.price;
      if (sortBy === "price-desc") return b.product.price - a.product.price;
      if (sortBy === "name") return a.product.name.localeCompare(b.product.name);
      return b.score - a.score || a.product.name.localeCompare(b.product.name);
    });

    return nextResults.map(({ product }) => product);
  }, [scoredResults, sortBy]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    if (!nextQuery) return;
    navigate(`/recherche?q=${encodeURIComponent(nextQuery)}`);
  };

  return (
    <div className="samsonite-container py-8">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">
          {t("category.home")}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{t("search.title")}</span>
      </nav>

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">{t("search.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {query
              ? `${results.length} ${t("search.foundFor")} "${query}"`
              : `${results.length} ${t("search.available")}`}
          </p>
        </div>

        <form onSubmit={submitSearch} className="flex min-h-12 w-full border border-border bg-white lg:max-w-xl">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("search.placeholder")}
            className="min-w-0 flex-1 px-4 text-sm outline-none"
          />
          <button
            type="submit"
            className="flex w-14 items-center justify-center bg-black text-white"
            aria-label={t("search.title")}
          >
            <SearchIcon className="h-5 w-5" />
          </button>
        </form>
      </div>

      <div className="mb-8 flex flex-col gap-4 border-y border-border py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide">
            <SlidersHorizontal className="h-4 w-4" />
            {t("search.refine")}
          </span>
          <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <input
              type="checkbox"
              className="accent-black"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
            />
            {t("category.inStockOnly")}
          </label>
        </div>

        <label className="flex items-center gap-3 text-xs font-black uppercase tracking-wide">
          {t("category.sortBy")}
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-10 border border-border bg-white px-3 text-xs font-semibold outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {categorySuggestions.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
            {t("search.suggested")}
          </p>
          <div className="flex flex-wrap gap-2">
            {categorySuggestions.map((category) => (
              <Link
                key={category.slug}
                to={`/categorie/${category.slug}`}
                className="border border-border px-4 py-2 text-xs font-bold uppercase tracking-wide hover:border-black"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <BrandLoader
          imageSrc="/assets/logo-loader.png"
          imageAlt="Chargement"
          spinImage
          hideMessage
          className="min-h-[calc(100vh-180px)] bg-[#f3f3f3]"
        />
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground mb-4">{t("search.empty")}</p>
          <Link to="/" className="text-sm font-bold underline">
            {t("product.backHome")}
          </Link>
        </div>
      )}
    </div>
  );
};

export default Search;
