import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Grid3X3, LayoutList, SlidersHorizontal } from "lucide-react";

import ProductCard from "@/components/ProductCard";
import BrandLoader from "@/components/BrandLoader";
import { fetchDisplayCategories, fetchDisplayProducts } from "@/lib/prestashop/catalog";
import type { CategoryDisplay, ProductDisplay } from "@/lib/prestashop/types";
import { useLanguage } from "@/lib/i18n";

interface FiltersState {
  brands: string[];
  collections: string[];
  colors: string[];
  priceRanges: string[];
  sizes: string[];
  luggageTypes: string[];
  volumeRanges: string[];
  weightRanges: string[];
  inStockOnly: boolean;
}

const initialFilters: FiltersState = {
  brands: [],
  collections: [],
  colors: [],
  priceRanges: [],
  sizes: [],
  luggageTypes: [],
  volumeRanges: [],
  weightRanges: [],
  inStockOnly: false,
};

const parseFirstNumber = (value?: string) => {
  const match = (value || "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const priceRanges = [
  { key: "under-300", labelKey: "price.under300", min: 0, max: 300 },
  { key: "300-600", labelKey: "price.300600", min: 300, max: 600 },
  { key: "600-1200", labelKey: "price.6001200", min: 600, max: 1200 },
  { key: "over-1200", labelKey: "price.over1200", min: 1200, max: Number.POSITIVE_INFINITY },
];

const volumeRanges = [
  { key: "under-30", label: "Moins de 30 L", min: 0, max: 30 },
  { key: "30-60", label: "30 L - 60 L", min: 30, max: 60 },
  { key: "60-90", label: "60 L - 90 L", min: 60, max: 90 },
  { key: "over-90", label: "Plus de 90 L", min: 90, max: Number.POSITIVE_INFINITY },
];

const weightRanges = [
  { key: "under-2", label: "Moins de 2 kg", min: 0, max: 2 },
  { key: "2-3", label: "2 kg - 3 kg", min: 2, max: 3 },
  { key: "3-4", label: "3 kg - 4 kg", min: 3, max: 4 },
  { key: "over-4", label: "Plus de 4 kg", min: 4, max: Number.POSITIVE_INFINITY },
];

const luggageTypeOptions = [
  { key: "rigide", label: "Valise rigide", test: /rigide|proxis|c-lite|essens|s.?cure|stackd|nuon|magnum|boss alu/i },
  { key: "souple", label: "Valise souple", test: /souple|soft|pulsonic|crosstrack|hyperspeed/i },
  { key: "cabine", label: "Cabine", test: /cabine|55\s*cm|\bs\b/i },
  { key: "extensible", label: "Extensible", test: /extensible|expand/i },
];

const sortOptions = [
  { value: "relevance", labelKey: "sort.relevance" },
  { value: "price-asc", labelKey: "sort.priceAsc" },
  { value: "price-desc", labelKey: "sort.priceDesc" },
  { value: "name", labelKey: "sort.name" },
];

const Category = () => {
  const { t, td } = useLanguage();
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
  const [visibleCount, setVisibleCount] = useState(24);

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
    setVisibleCount(24);
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

  const brandOptions = useMemo(() => {
    const preferredOrder = ["Samsonite", "American Tourister"];
    const brands = Array.from(
      new Set(scopedProducts.map((product) => product.brandName).filter(Boolean))
    );
    return brands.sort((a, b) => {
      const indexA = preferredOrder.indexOf(a);
      const indexB = preferredOrder.indexOf(b);
      if (indexA !== -1 || indexB !== -1) {
        return (indexA === -1 ? preferredOrder.length : indexA) - (indexB === -1 ? preferredOrder.length : indexB);
      }
      return a.localeCompare(b);
    });
  }, [scopedProducts]);
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
  const sizeOptions = useMemo(() => {
    const sizes = new Set<string>();
    for (const product of scopedProducts) {
      for (const variant of product.variants) {
        if (variant.size) sizes.add(variant.size);
      }
    }
    return Array.from(sizes).sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  }, [scopedProducts]);

  const productSearchText = (product: ProductDisplay) =>
    `${product.name} ${product.shortDescription} ${product.description} ${product.collection} ${product.categorySlug} ${product.categorySlugs.join(" ")} ${product.characteristics.map((item) => `${item.label} ${item.value}`).join(" ")} ${product.variants.map((variant) => `${variant.size || ""} ${variant.dimensions || ""} ${variant.extensibleDimensions || ""}`).join(" ")}`;

  const filteredProducts = useMemo(() => {
    return scopedProducts.filter((product) => {
      if (
        appliedFilters.brands.length > 0 &&
        !appliedFilters.brands.includes(product.brandName)
      ) {
        return false;
      }
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

      if (appliedFilters.sizes.length > 0) {
        const productSizes = product.variants.map((variant) => variant.size).filter(Boolean) as string[];
        if (!appliedFilters.sizes.some((size) => productSizes.includes(size))) {
          return false;
        }
      }

      if (appliedFilters.luggageTypes.length > 0) {
        const text = productSearchText(product);
        const hasType = appliedFilters.luggageTypes.some((typeKey) => {
          const option = luggageTypeOptions.find((item) => item.key === typeKey);
          return option ? option.test.test(text) : false;
        });
        if (!hasType) return false;
      }

      if (appliedFilters.volumeRanges.length > 0) {
        const volume = parseFirstNumber(product.volume || product.variants.find((variant) => variant.volume)?.volume);
        if (volume == null) return false;
        const inAnyRange = appliedFilters.volumeRanges.some((rangeKey) => {
          const range = volumeRanges.find((item) => item.key === rangeKey);
          if (!range) return false;
          return volume >= range.min && volume < range.max;
        });
        if (!inAnyRange) return false;
      }

      if (appliedFilters.weightRanges.length > 0) {
        const weight = parseFirstNumber(product.weight || product.variants.find((variant) => variant.weight)?.weight);
        if (weight == null) return false;
        const inAnyRange = appliedFilters.weightRanges.some((rangeKey) => {
          const range = weightRanges.find((item) => item.key === rangeKey);
          if (!range) return false;
          return weight >= range.min && weight < range.max;
        });
        if (!inAnyRange) return false;
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

  const activeDraftFilterCount = useMemo(
    () =>
      draftFilters.brands.length +
      draftFilters.collections.length +
      draftFilters.colors.length +
      draftFilters.priceRanges.length +
      draftFilters.sizes.length +
      draftFilters.luggageTypes.length +
      draftFilters.volumeRanges.length +
      draftFilters.weightRanges.length +
      (draftFilters.inStockOnly ? 1 : 0),
    [draftFilters]
  );
  const isAmericanTouristerApplied = appliedFilters.brands.includes("American Tourister");
  useEffect(() => {
    setVisibleCount(24);
  }, [appliedFilters, sortBy, slug]);

  const visibleProducts = useMemo(
    () => sortedProducts.slice(0, visibleCount),
    [sortedProducts, visibleCount]
  );

  const selectedSortLabel = useMemo(
    () => t(sortOptions.find((option) => option.value === sortBy)?.labelKey || "sort.relevance"),
    [sortBy, t]
  );

  const toggleArrayValue = (
    key: keyof Pick<FiltersState, "brands" | "collections" | "colors" | "priceRanges" | "sizes" | "luggageTypes" | "volumeRanges" | "weightRanges">,
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
              <span className="text-foreground font-medium">{td(currentCategoryName)}</span>
            </>
          )}
          {!isChildCategory && (
            <>
              <span>/</span>
              <span className="text-foreground font-medium">{td(currentCategoryName || slug)}</span>
            </>
          )}
        </nav>
      </div>

      <div className="samsonite-container pb-6">
        <h1 className="text-3xl font-bold tracking-wider uppercase">
          {td(currentCategoryName || slug)}
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

      <div className="relative z-[140] overflow-visible border-y border-border bg-white/80 backdrop-blur">
        <div className="samsonite-container relative  flex items-center justify-between overflow-visible py-3">
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
            <div className="relative z-10">
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
                <div className="absolute right-0 top-full z-20 mt-2 w-56 border border-border bg-background shadow-[0_20px_55px_rgba(0,0,0,0.16)]">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortBy(option.value);
                        setSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold tracking-wider transition-colors ${sortBy === option.value
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
            <aside className="premium-surface sticky top-32 z-30 flex max-h-[calc(100vh-8rem)] w-80 max-w-[calc(100vw-2rem)] flex-shrink-0 flex-col self-start overflow-hidden animate-fade-in">
              <div className="border-b border-border bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                      {t("category.filters")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {activeDraftFilterCount > 0
                        ? `${activeDraftFilterCount} ${t("category.selectedFilters")}`
                        : t("category.noFilterSelected")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={activeDraftFilterCount === 0}
                    onClick={() => {
                      setDraftFilters(initialFilters);
                      setAppliedFilters(initialFilters);
                    }}
                  >
                    {t("category.reset")}
                  </button>
                </div>
              </div>

              <div className="soft-scrollbar flex-1 space-y-6 overflow-y-auto p-5 pr-4">
                <div>
                  <h3 className="mb-3 text-xs font-bold tracking-wider">{t("category.brand")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {brandOptions.map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors ${draftFilters.brands.includes(brand)
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-white hover:border-foreground"
                          }`}
                        onClick={() => toggleArrayValue("brands", brand)}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>


                <div>
                  <h3 className="mb-3 text-xs font-bold tracking-wider">{t("category.collection")}</h3>
                  <div className="soft-scrollbar max-h-48 space-y-2 overflow-auto pr-1">
                    {collectionOptions.map((collection) => (
                      <label key={collection} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-foreground"
                          checked={draftFilters.collections.includes(collection)}
                          onChange={() => toggleArrayValue("collections", collection)}
                        />
                        <span className="leading-snug">{td(collection)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-bold tracking-wider">{t("category.price")}</h3>
                  <div className="space-y-2">
                    {priceRanges.map((range) => (
                      <label key={range.key} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-foreground"
                          checked={draftFilters.priceRanges.includes(range.key)}
                          onChange={() => toggleArrayValue("priceRanges", range.key)}
                        />
                        {t(range.labelKey)}
                      </label>
                    ))}
                  </div>
                </div>
                {sizeOptions.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-bold tracking-wider">{td("Taille")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {sizeOptions.map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors ${draftFilters.sizes.includes(size)
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-white hover:border-foreground"
                            }`}
                          onClick={() => toggleArrayValue("sizes", size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="mb-3 text-xs font-bold tracking-wider">{td("Type de valise")}</h3>
                  <div className="space-y-2">
                    {luggageTypeOptions.map((option) => (
                      <label key={option.key} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-foreground"
                          checked={draftFilters.luggageTypes.includes(option.key)}
                          onChange={() => toggleArrayValue("luggageTypes", option.key)}
                        />
                        {td(option.label)}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-bold tracking-wider">{td("Volume")}</h3>
                  <div className="space-y-2">
                    {volumeRanges.map((range) => (
                      <label key={range.key} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-foreground"
                          checked={draftFilters.volumeRanges.includes(range.key)}
                          onChange={() => toggleArrayValue("volumeRanges", range.key)}
                        />
                        {td(range.label)}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-bold tracking-wider">{td("Poids")}</h3>
                  <div className="space-y-2">
                    {weightRanges.map((range) => (
                      <label key={range.key} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-foreground"
                          checked={draftFilters.weightRanges.includes(range.key)}
                          onChange={() => toggleArrayValue("weightRanges", range.key)}
                        />
                        {td(range.label)}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-bold tracking-wider">{t("category.color")}</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {colorOptions.map((color) => (
                      <button
                        key={color.name}
                        type="button"
                        title={td(color.name)}
                        className={`h-9 w-9 rounded-full border-2 shadow-sm transition-transform hover:scale-105 ${draftFilters.colors.includes(color.name)
                          ? "border-foreground ring-2 ring-foreground/20"
                          : "border-border"
                          }`}
                        style={{ backgroundColor: color.hex }}
                        onClick={() => toggleArrayValue("colors", color.name)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-bold tracking-wider">{t("category.availability")}</h3>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-full border border-border px-4 py-3 text-sm font-semibold transition-colors hover:border-foreground">
                    <span>{t("category.inStockOnly")}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-foreground"
                      checked={draftFilters.inStockOnly}
                      onChange={(event) =>
                        setDraftFilters((previous) => ({
                          ...previous,
                          inStockOnly: event.target.checked,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-border bg-white p-4 shadow-[0_-16px_35px_rgba(0,0,0,0.08)]">
                <button
                  type="button"
                  className="premium-control flex w-full items-center justify-center bg-foreground px-4 py-3 text-xs font-black tracking-wider text-background transition-colors hover:bg-foreground/90"
                  onClick={() => setAppliedFilters(draftFilters)}
                >
                  {t("category.confirm")}
                </button>
              </div>
            </aside>
          )}

          <div className="relative z-0 flex-1">
            {isAmericanTouristerApplied && (
              <div className="mb-8 overflow-hidden border border-[#d8e0eb] bg-white shadow-[0_18px_55px_rgba(12,52,120,0.08)]" aria-label="American Tourister brand banner">
                <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-r from-[#f8fbff] via-white to-[#fff8fa] px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#0b3b82]">
                      Selection de marque
                    </p>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      Produits American Tourister disponibles dans cette catégorie
                    </p>
                  </div>
                  <div className="rounded-full border border-[#d7dfe8] bg-white px-5 py-3 shadow-sm">
                    <img
                      src="/assets/american-tourister-logo.png"
                      alt="American Tourister"
                      className="h-16 w-auto max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {sortedProducts.length > 0 ? (
              <>
                <div
                  className={`grid gap-6 ${gridCols === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"
                    }`}
                >
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {visibleProducts.length < sortedProducts.length && (
                  <div className="mt-10 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((count) => count + 24)}
                      className="premium-control border border-foreground bg-white px-6 py-3 text-xs font-black uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
                    >
                      Charger plus ({visibleProducts.length}/{sortedProducts.length})
                    </button>
                  </div>
                )}
              </>
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
