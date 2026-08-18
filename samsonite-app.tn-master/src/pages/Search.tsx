import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal } from "lucide-react";

import ProductCard from "@/components/ProductCard";
import BrandLoader from "@/components/BrandLoader";
import { fetchDisplayCategories, fetchDisplayProducts } from "@/lib/prestashop/catalog";
import type { CategoryDisplay, ProductDisplay } from "@/lib/prestashop/types";
import { useLanguage } from "@/lib/i18n";
import {
  flattenCategories,
  getSearchSuggestions,
  normalizeSearchText,
  scoreProduct,
} from "@/lib/search";

const sortOptions = [
  { value: "relevance", labelKey: "sort.relevance" },
  { value: "price-asc", labelKey: "sort.priceAsc" },
  { value: "price-desc", labelKey: "sort.priceDesc" },
  { value: "name", labelKey: "sort.name" },
];

const Search = () => {
  const { t, td } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const normalizedQuery = normalizeSearchText(query);
  const [searchInput, setSearchInput] = useState(query);
  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("relevance");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

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
    return flattenCategories(categories)
      .filter((category) => normalizeSearchText(category.name).includes(normalizedQuery))
      .slice(0, 5);
  }, [categories, normalizedQuery]);

  const liveSuggestions = useMemo(
    () => {
      if (normalizeSearchText(searchInput).length < 2) return [];
      return getSearchSuggestions({
        query: searchInput,
        products,
        categories,
        limit: 8,
      });
    },
    [categories, products, searchInput]
  );

  const scoredResults = useMemo(() => {
    if (!normalizedQuery) {
      return products
        .filter((product) => !inStockOnly || (product.stock || 0) > 0)
        .map((product) => ({ product, score: 1 }));
    }

    return products
      .map((product) => {
        return { product, score: scoreProduct(product, normalizedQuery, categoryNameBySlug) };
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
    setSuggestionsOpen(false);
  };

  const chooseSuggestion = (value: string, href?: string) => {
    setSuggestionsOpen(false);
    setSearchInput(value);
    if (href) {
      navigate(href);
      return;
    }
    navigate(`/recherche?q=${encodeURIComponent(value)}`);
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

        <form onSubmit={submitSearch} className="relative flex min-h-12 w-full border border-border bg-white lg:max-w-xl">
          <input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
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
          {suggestionsOpen && liveSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 border border-border bg-white shadow-[0_18px_45px_rgba(0,0,0,0.12)]">
              {liveSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseSuggestion(suggestion.value, suggestion.href)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent"
                >
                  <span className="font-semibold">{suggestion.label}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t(`search.type.${suggestion.type}`)}
                  </span>
                </button>
              ))}
            </div>
          )}
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
                {td(category.name)}
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
          <button onClick={() => navigate(-1)} className="text-sm font-bold underline">
            {t("product.backHome")}
          </button>
        </div>
      )}
    </div>
  );
};

export default Search;
