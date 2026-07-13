import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Grid3X3, LayoutList, SlidersHorizontal } from "lucide-react";

import ProductCard from "@/components/ProductCard";
import BrandLoader from "@/components/BrandLoader";
import { fetchDisplayCategories, fetchDisplayProducts } from "@/lib/prestashop/catalog";
import type { CategoryDisplay, ProductDisplay } from "@/lib/prestashop/types";
import { useLanguage } from "@/lib/i18n";

interface FiltersState {
  collections: string[];
  colors: string[];
  priceRanges: string[];
  inStockOnly: boolean;
}

const initialFilters: FiltersState = {
  collections: [],
  colors: [],
  priceRanges: [],
  inStockOnly: false,
};

const priceRanges = [
  { key: "under-300", labelKey: "price.under300", min: 0, max: 300 },
  { key: "300-600", labelKey: "price.300600", min: 300, max: 600 },
  { key: "600-1200", labelKey: "price.6001200", min: 600, max: 1200 },
  { key: "over-1200", labelKey: "price.over1200", min: 1200, max: Number.POSITIVE_INFINITY },
];

const sortOptions = [
  { value: "relevance", labelKey: "sort.relevance" },
  { value: "price-asc", labelKey: "sort.priceAsc" },
  { value: "price-desc", labelKey: "sort.priceDesc" },
  { value: "name", labelKey: "sort.name" },
];

const Category = () => {
  const { t } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const [sortBy, setSortBy] = useState("relevance");
  const [sortOpen, setSortOpen] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [allProducts, setAllProducts] = useState<ProductDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState<FiltersState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(initialFilters);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [products, fetchedCategories] = await Promise.all([
          fetchDisplayProducts(),
          fetchDisplayCategories(),
        ]);

        if (!cancelled) {
          setAllProducts(products);
          setCategories(fetchedCategories);
        }
      } catch (error) {
        console.error("Unable to load Prestashop category data", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }, [slug]);

  const rootCategory = useMemo(() => {
    if (!slug) return null;
    const direct = categories.find((category) => category.slug === slug);
    if (direct) return direct;
    return categories.find((category) =>
      category.children?.some((child) => child.slug === slug)
    ) || null;
  }, [categories, slug]);

  const isChildCategory = useMemo(() => {
    if (!slug || !rootCategory) return false;
    return rootCategory.slug !== slug;
  }, [rootCategory, slug]);

  const currentCategoryName = useMemo(() => {
    if (!slug) return "";
    if (!rootCategory) return slug;
    if (!isChildCategory) return rootCategory.name;
    return (
      rootCategory.children?.find((child) => child.slug === slug)?.name || slug
    );
  }, [isChildCategory, rootCategory, slug]);

  const scopedProducts = useMemo(() => {
    if (!slug) return allProducts;
    if (!rootCategory) {
      return allProducts.filter((product) => product.categorySlugs.includes(slug));
    }

    if (isChildCategory) {
      return allProducts.filter((product) => product.categorySlugs.includes(slug));
    }

    const childSlugs = rootCategory.children?.map((child) => child.slug) || [];
    return allProducts.filter(
      (product) =>
        product.categorySlug === rootCategory.slug ||
        product.categorySlugs.includes(rootCategory.slug) ||
        childSlugs.some((childSlug) => product.categorySlugs.includes(childSlug))
    );
  }, [allProducts, isChildCategory, rootCategory, slug]);

  const collectionOptions = useMemo(
    () =>
      Array.from(
        new Set(scopedProducts.map((product) => product.collection).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    [scopedProducts]
  );

  const colorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of scopedProducts) {
      for (const color of product.colors) {
        if (!map.has(color.name)) map.set(color.name, color.hex);
      }
    }
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, [scopedProducts]);

  const filteredProducts = useMemo(() => {
    return scopedProducts.filter((product) => {
      if (
        appliedFilters.collections.length > 0 &&
        !appliedFilters.collections.includes(product.collection)
      ) {
        return false;
      }

      if (appliedFilters.colors.length > 0) {
        const productColorNames = product.colors.map((color) => color.name);
        if (!appliedFilters.colors.some((color) => productColorNames.includes(color))) {
          return false;
        }
      }

      if (appliedFilters.priceRanges.length > 0) {
        const inAnyRange = appliedFilters.priceRanges.some((rangeKey) => {
          const range = priceRanges.find((item) => item.key === rangeKey);
          if (!range) return false;
          return product.price >= range.min && product.price < range.max;
        });
        if (!inAnyRange) return false;
      }

      if (appliedFilters.inStockOnly && (!product.stock || product.stock <= 0)) {
        return false;
      }

      return true;
    });
  }, [appliedFilters, scopedProducts]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [filteredProducts, sortBy]);

  const selectedSortLabel = useMemo(
    () => t(sortOptions.find((option) => option.value === sortBy)?.labelKey || "sort.relevance"),
    [sortBy, t]
  );

  const toggleArrayValue = (
    key: keyof Pick<FiltersState, "collections" | "colors" | "priceRanges">,
    value: string
  ) => {
    setDraftFilters((previous) => ({
      ...previous,
      [key]: previous[key].includes(value)
        ? previous[key].filter((item) => item !== value)
        : [...previous[key], value],
    }));
  };

  if (loading) {
    return (
      <BrandLoader
        imageSrc="/assets/logo-loader.png"
        imageAlt="Chargement"
        spinImage
        hideMessage
        className="min-h-[calc(100vh-180px)] bg-[#f3f3f3]"
      />
    );
  }

  return (
    <div>
      <div className="samsonite-container py-3">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t("category.home")}
          </Link>
          {rootCategory && (
            <>
              <span>/</span>
              <Link to={`/categorie/${rootCategory.slug}`} className="hover:text-foreground">
                {rootCategory.name}
              </Link>
            </>
          )}
          {isChildCategory && (
            <>
              <span>/</span>
              <span className="text-foreground font-medium">{currentCategoryName}</span>
            </>
          )}
          {!isChildCategory && (
            <>
              <span>/</span>
              <span className="text-foreground font-medium">{currentCategoryName || slug}</span>
            </>
          )}
        </nav>
      </div>

      <div className="samsonite-container pb-6">
        <h1 className="text-3xl font-bold tracking-wider uppercase">
          {currentCategoryName || slug}
        </h1>
        {rootCategory?.description && !isChildCategory && (
          <p className="font-medium mt-4 text-sm leading-snug">
            {rootCategory.description}
          </p>
        )}
      </div>

      {rootCategory?.children && rootCategory.children.length > 0 && (
        <div className="samsonite-container pb-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <Link
              to={`/categorie/${rootCategory.slug}`}
              className={`whitespace-nowrap px-4 py-2 text-xs font-bold tracking-wider ${!isChildCategory ? "bg-foreground text-background" : "border border-border hover:bg-accent"
                }`}
            >
              {t("category.viewAll")}
            </Link>
            {rootCategory.children.map((sub) => (
              <Link
                key={sub.slug}
                to={`/categorie/${sub.slug}`}
                className={`whitespace-nowrap px-4 py-2 text-xs font-semibold tracking-wider border transition-colors ${slug === sub.slug ? "bg-foreground text-background border-foreground" : "border-border hover:bg-accent"
                  }`}
              >
                {sub.name.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-[120] overflow-visible border-y border-border bg-white/80 backdrop-blur">
        <div className="samsonite-container relative z-[120] flex items-center justify-between overflow-visible py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFiltersOpen((value) => !value)}
              className="premium-control flex items-center gap-2 border border-border bg-white px-3 py-2 text-xs font-semibold tracking-wider transition-colors hover:text-muted-foreground"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("category.filters")}
            </button>
            <span className="text-xs text-muted-foreground">
              {sortedProducts.length} {t("category.products")}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 sm:flex">
              <button
                onClick={() => setGridCols(3)}
                className={`premium-control p-2 ${gridCols === 3 ? "bg-black text-white" : "text-muted-foreground"}`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setGridCols(4)}
                className={`premium-control p-2 ${gridCols === 4 ? "bg-black text-white" : "text-muted-foreground"}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
            <div className="relative z-[130]">
              <button
                type="button"
                onClick={() => setSortOpen((value) => !value)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-background text-xs font-semibold tracking-wider hover:bg-accent transition-colors"
              >
                <span className="text-muted-foreground">{t("category.sortBy")}</span>
                <span>{selectedSortLabel}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>

              {sortOpen && (
                <div className="absolute right-0 top-full z-[140] mt-2 w-56 border border-border bg-background shadow-[0_20px_55px_rgba(0,0,0,0.16)]">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortBy(option.value);
                        setSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold tracking-wider transition-colors ${
                        sortBy === option.value
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="samsonite-container relative z-0 py-8">
        <div className="flex items-start gap-8">
          {filtersOpen && (
            <aside className="premium-surface sticky top-36 z-30 w-72 flex-shrink-0 self-start space-y-6 p-5 animate-fade-in">
              <div>
                <h3 className="text-xs font-bold tracking-wider mb-3">{t("category.collection")}</h3>
                <div className="soft-scrollbar max-h-44 space-y-2 overflow-auto pr-1">
                  {collectionOptions.map((collection) => (
                    <label key={collection} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-foreground"
                        checked={draftFilters.collections.includes(collection)}
                        onChange={() => toggleArrayValue("collections", collection)}
                      />
                      {collection}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold tracking-wider mb-3">{t("category.price")}</h3>
                <div className="space-y-2">
                  {priceRanges.map((range) => (
                    <label key={range.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-foreground"
                        checked={draftFilters.priceRanges.includes(range.key)}
                        onChange={() => toggleArrayValue("priceRanges", range.key)}
                      />
                      {t(range.labelKey)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold tracking-wider mb-3">{t("category.color")}</h3>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      title={color.name}
                      className={`w-7 h-7 rounded-full border-2 hover:scale-110 transition-transform ${draftFilters.colors.includes(color.name)
                          ? "border-foreground"
                          : "border-border"
                        }`}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => toggleArrayValue("colors", color.name)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold tracking-wider mb-3">{t("category.availability")}</h3>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-foreground"
                    checked={draftFilters.inStockOnly}
                    onChange={(event) =>
                      setDraftFilters((previous) => ({
                        ...previous,
                        inStockOnly: event.target.checked,
                      }))
                    }
                  />
                  {t("category.inStockOnly")}
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  className="premium-control flex-1 border border-border px-3 py-2 text-xs font-semibold tracking-wider hover:bg-accent"
                  onClick={() => {
                    setDraftFilters(initialFilters);
                    setAppliedFilters(initialFilters);
                  }}
                >
                  {t("category.reset")}
                </button>
                <button
                  type="button"
                  className="premium-control flex-1 bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background hover:bg-foreground/90"
                  onClick={() => setAppliedFilters(draftFilters)}
                >
                  {t("category.confirm")}
                </button>
              </div>
            </aside>
          )}

          <div className="relative z-0 flex-1">
            {sortedProducts.length > 0 ? (
              <div
                className={`grid gap-6 ${gridCols === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"
                  }`}
              >
                {sortedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-lg">{t("category.empty")}</p>
                <p className="text-sm mt-2">{t("category.emptyHint")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Category;
