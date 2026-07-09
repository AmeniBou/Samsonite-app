import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  ShoppingBag,
  Truck,
} from "lucide-react";

import ProductCard from "@/components/ProductCard";
import BrandLoader from "@/components/BrandLoader";
import { fetchDisplayCategories, fetchDisplayProducts } from "@/lib/prestashop/catalog";
import { formatTnd } from "@/lib/currency";
import { useCart } from "@/hooks/useCart";
import type { CategoryDisplay, ProductDisplay, ProductVariant } from "@/lib/prestashop/types";

const Product = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<ProductDisplay | null>(null);
  const [allProducts, setAllProducts] = useState<ProductDisplay[]>([]);
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedCombinationId, setSelectedCombinationId] = useState<number | null>(null);
  const { addItem } = useCart();

  const productId = Number(slug);
  const hasNumericId = Number.isInteger(productId) && productId > 0;

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [products, fetchedCategories] = await Promise.all([
          fetchDisplayProducts(),
          fetchDisplayCategories(),
        ]);

        let currentProduct = hasNumericId
          ? products.find((item) => item.id === productId) || null
          : products.find((item) => item.slug === slug) || null;

        // Fallback: try more flexible slug matching in case of encoding/normalization differences
        if (!currentProduct && !hasNumericId) {
          const normalized = (slug || "").trim().toLowerCase();
          currentProduct =
            products.find((p) => (p.slug || "").toLowerCase() === normalized) ||
            products.find((p) => (p.slug || "").toLowerCase().includes(normalized)) ||
            products.find((p) => normalized.includes((p.slug || "").toLowerCase())) ||
            products.find((p) => (p.name || "").toLowerCase().includes(normalized.replace(/-/g, " ")) ) ||
            null;
        }

        if (!cancelled) {
          setAllProducts(products);
          setCategories(fetchedCategories);
          setProduct(currentProduct);
          console.log("Resolved product for slug", slug, "->", currentProduct?.id, "images:", currentProduct?.images?.length || 0);
          console.log("Resolved product.images sample:", currentProduct?.images?.slice(0,5));
          const defaultVariant = currentProduct?.variants.find((variant) => variant.isDefault);
          setSelectedCombinationId(defaultVariant?.combinationId ?? null);
          setSelectedImageIdx(0);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setProduct(null);
          setAllProducts([]);
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [hasNumericId, productId, slug]);

  // Resolve any product image URLs that point to HTML pages by fetching them in the browser
  // and extracting a real image URL (og:image, twitter:image, link[rel=image_src], or first large image).
  useEffect(() => {
    if (!product) return;

    const isLikelyImage = (u: string) => /\.(jpe?g|png|webp|avif|gif)(?:[?#].*)?$/i.test(u) || /large_default|medium_default|home_default|thickbox_default/i.test(u);

    const extractFromHtml = (html: string, base: string): string | null => {
      const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
      if (og && og[1]) return new URL(og[1], base).toString();
      const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
      if (tw && tw[1]) return new URL(tw[1], base).toString();
      const link = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i);
      if (link && link[1]) return new URL(link[1], base).toString();
      const img = html.match(/https?:\/\/(?:[^"'<>\s]+)\/(?:[\w-]+_)?(?:large_default|medium_default|home_default|thickbox_default|original)[^"'<>\s]*/i);
      if (img && img[0]) return img[0];
      const img2 = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (img2 && img2[1]) return new URL(img2[1], base).toString();
      return null;
    };

    let mounted = true;

    (async () => {
      const updates: Record<number, string> = {};
      for (let i = 0; i < product.images.length; i++) {
        const url = product.images[i];
        if (!url || isLikelyImage(url)) continue;
        try {
          const res = await fetch(url, { method: 'GET', redirect: 'follow' });
          const ct = res.headers.get('content-type') || '';
          if (ct.startsWith('image/')) {
            updates[i] = res.url;
            continue;
          }
          if (ct.startsWith('text/html')) {
            const text = await res.text();
            const found = extractFromHtml(text, res.url);
            if (found && isLikelyImage(found)) {
              updates[i] = found;
            }
          }
        } catch (err) {
          // ignore per-image errors
        }
      }

      if (!mounted) return;
      if (Object.keys(updates).length > 0) {
        setProduct((prev) => {
          if (!prev) return prev;
          const imgs = [...prev.images];
          for (const [idxStr, newUrl] of Object.entries(updates)) {
            const idx = Number(idxStr);
            imgs[idx] = newUrl;
          }
          return { ...prev, images: imgs } as typeof prev;
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [product]);

  const selectedVariant: ProductVariant | undefined = useMemo(() => {
    if (!product || !selectedCombinationId) return undefined;
    return product.variants.find((variant) => variant.combinationId === selectedCombinationId);
  }, [product, selectedCombinationId]);
  const similarProducts = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((item) => item.id !== product.id)
      .filter((item) =>
        item.categorySlugs.some((categorySlug) => product.categorySlugs.includes(categorySlug))
      )
      .slice(0, 4);
  }, [allProducts, product]);

  const galleryImages = (() => {
    if (selectedVariant?.images && selectedVariant.images.length > 0) return selectedVariant.images;
    if (product?.images && product.images.length > 0) return product.images;
    // Fallback: use first similar product's first image so the UI isn't empty
    const fallback = similarProducts?.[0]?.images || [];
    return fallback;
  })();
  const selectedPrice =
    selectedVariant && selectedVariant.price > 0 ? selectedVariant.price : product?.price || 0;
  const selectedStock =
    typeof selectedVariant?.stock === "number" ? selectedVariant.stock : product?.stock || 0;
  const isOutOfStock = selectedStock <= 0;

  

  const rootCategory = useMemo(() => {
    if (!product) return null;
    return (
      categories.find((category) =>
        product.categorySlugs.includes(category.slug) || product.categorySlug === category.slug
      ) || null
    );
  }, [categories, product]);

  const hasNonZeroNumeric = (value: string): boolean => {
    const matches = value.match(/-?\d+(?:[.,]\d+)?/g);
    if (!matches || matches.length === 0) return true;
    return matches.some((entry) => Number(entry.replace(",", ".")) > 0);
  };

  const variants = product?.variants || [];

  const getColorKey = (variant?: ProductVariant) =>
    (variant?.color?.hex || "").trim().toLowerCase() ||
    (variant?.color?.name || "").trim().toLowerCase();

  const selectedColorKey = useMemo(() => getColorKey(selectedVariant), [selectedVariant]);
  const selectedSize = (selectedVariant?.size || "").trim();

  const colorOptions = useMemo(() => {
    const byKey = new Map<
      string,
      { key: string; name: string; hex: string; combinationId: number; score: number }
    >();
    for (const variant of variants) {
      if (!variant.color) continue;
      const key = getColorKey(variant);
      if (!key) continue;
      const score = (variant.isDefault ? 100 : 0) + ((variant.stock || 0) > 0 ? 10 : 0);
      const existing = byKey.get(key);
      if (!existing || score > existing.score) {
        byKey.set(key, {
          key,
          name: variant.color.name,
          hex: variant.color.hex,
          combinationId: variant.combinationId,
          score,
        });
      }
    }
    return Array.from(byKey.values()).map(({ score: _score, ...color }) => color);
  }, [variants]);

  const sizeOptions = useMemo(() => {
    const scopedVariants = selectedColorKey
      ? variants.filter((variant) => getColorKey(variant) === selectedColorKey)
      : variants;

    const byLabel = new Map<string, { label: string; combinationId: number; score: number }>();
    for (const variant of scopedVariants) {
      const label = (variant.size || "").trim();
      if (!label) continue;
      const score = (variant.isDefault ? 100 : 0) + ((variant.stock || 0) > 0 ? 10 : 0);
      const key = label.toLowerCase();
      const existing = byLabel.get(key);
      if (!existing || score > existing.score) {
        byLabel.set(key, { label, combinationId: variant.combinationId, score });
      }
    }
    return Array.from(byLabel.values()).map(({ score: _score, ...size }) => size);
  }, [variants, selectedColorKey]);

  const handleColorSelect = (colorKey: string, colorCombinationId: number) => {
    const compatibleVariants = variants.filter((v) => getColorKey(v) === colorKey);

    let targetVariant: ProductVariant | undefined;

    if (selectedSize) {
      const sizeMatches = compatibleVariants.filter((v) => (v.size || "").trim() === selectedSize);
      targetVariant = sizeMatches.find((v) => (v.dimensions || "").trim()) || sizeMatches[0];
    }

    if (!targetVariant) {
      const defaultMatches = compatibleVariants.filter((v) => v.isDefault);
      targetVariant =
        defaultMatches.find((v) => (v.dimensions || "").trim()) ||
        defaultMatches[0] ||
        compatibleVariants.find((v) => (v.dimensions || "").trim()) ||
        compatibleVariants[0];
    }

    setSelectedCombinationId(targetVariant?.combinationId ?? colorCombinationId);
  };

  const handleSizeSelect = (sizeLabel: string, sizeCombinationId: number) => {
    let targetVariant: ProductVariant | undefined;

    if (selectedColorKey) {
      const compatibles = variants.filter(
        (v) => (v.size || "").trim() === sizeLabel && getColorKey(v) === selectedColorKey
      );
      console.log(compatibles);

      targetVariant = compatibles.find((v) => (v.dimensions || "").trim()) || compatibles[0];
    }

    setSelectedCombinationId(targetVariant?.combinationId ?? sizeCombinationId);
  };

  const dimensionScopedVariants = useMemo(() => {
    let scoped = variants;
    if (selectedColorKey) {
      scoped = scoped.filter((v) => getColorKey(v) === selectedColorKey);
    }
    if (selectedSize) {
      scoped = scoped.filter((v) => (v.size || "").trim() === selectedSize);
    }
    return scoped;
  }, [variants, selectedColorKey, selectedSize]);

  const dimensionOptions = useMemo(() => {
    const sizeLabels = new Set(sizeOptions.map((s) => s.label.trim().toLowerCase()));

    const byLabel = new Map<
      string,
      { label: string; combinationId: number; sizeLabel: string; score: number }
    >();

    for (const variant of dimensionScopedVariants) {
      const label = (variant.dimensions || "").trim();
      const sizeLabel = (variant.size || "").trim();
      console.log("dimension variant: ", variant);
      if (!label || !hasNonZeroNumeric(label)) continue;
      if (sizeLabels.has(label.toLowerCase())) continue;
      if (label.toLowerCase() === sizeLabel.toLowerCase()) continue;

      const key = `${label.toLowerCase()}::${sizeLabel.toLowerCase()}`;
      const score = (variant.isDefault ? 100 : 0) + ((variant.stock || 0) > 0 ? 10 : 0);
      const existing = byLabel.get(key);

      if (!existing || score > existing.score) {
        byLabel.set(key, {
          label,
          combinationId: variant.combinationId,
          sizeLabel,
          score,
        });
      }
    }

    if (byLabel.size > 0) {
      return Array.from(byLabel.values()).map(({ score: _score, ...dimension }) => dimension);
    }

    if (!product) return [];
    console.log("Logging product .... ", product.characteristics);
    return product.characteristics
      .filter((item) => /dimension|taille|size/i.test(item.label))
      .map((item) => item.value.trim())
      .filter((value) => Boolean(value) && hasNonZeroNumeric(value))
      .filter((value) => !sizeLabels.has(value.toLowerCase()))
      .map((value) => ({ label: value, combinationId: selectedCombinationId || 0, sizeLabel: "" }));
  }, [dimensionScopedVariants, product, selectedCombinationId, sizeOptions]);

  const weightOptions = useMemo(() => {
    const value = (selectedVariant?.weight || "").trim();
    if (value && hasNonZeroNumeric(value)) return [value];
    if (!product) return [];
    return product.characteristics
      .filter((item) => /poids|weight/i.test(item.label))
      .map((item) => item.value.trim())
      .filter((entry) => Boolean(entry) && hasNonZeroNumeric(entry));
  }, [product, selectedVariant]);

  const volumeOptions = useMemo(() => {
    const value = (selectedVariant?.volume || "").trim();
    return value ? [value] : [];
  }, [selectedVariant]);

  const extensibleDimensionOptions = useMemo(() => {
    const value = (selectedVariant?.extensibleDimensions || "").trim();
    return value && hasNonZeroNumeric(value) ? [value] : [];
  }, [selectedVariant]);

  const selectedColorName = selectedVariant?.color?.name || colorOptions[0]?.name || "";
  const technicalCharacteristics = useMemo(() => {
    if (!product) return [];
    const excludedLabelPattern =
      /prix|price|dimension|poids|weight|volume|taille|size|couleur|color/i;
    return product.characteristics.filter((item) => {
      const label = item.label.trim();
      const value = item.value.trim();
      if (!label || !value) return false;
      if (excludedLabelPattern.test(label)) return false;
      const lower = value.toLowerCase();
      if (["null", "undefined", "n/a", "na", "-", "--", ":", "...", "…"].includes(lower)) {
        return false;
      }
      if (/^[:.\-\s]+$/.test(value)) return false;
      return true;
    });
  }, [product]);
  const guaranteeCharacteristics = useMemo(
    () =>
      technicalCharacteristics.filter((item) => /garantie|warranty/i.test(item.label)) || [],
    [technicalCharacteristics]
  );

  useEffect(() => {
    setSelectedImageIdx(0);
  }, [selectedCombinationId]);

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

  if (!product) {
    return (
      <div className="samsonite-container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Produit non trouve</h1>
        <Link to="/" className="underline">
          Retour a l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="samsonite-container py-3">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          {rootCategory ? (
            <>
              <Link to={`/categorie/${rootCategory.slug}`} className="hover:text-foreground">
                {rootCategory.name}
              </Link>
              <span>/</span>
            </>
          ) : (
            <>
              <Link to="/" className="hover:text-foreground">
                Accueil
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-medium">{product.name}</span>
        </nav>
      </div>

      <div className="samsonite-container py-6">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          <div>
            <div className="relative mx-auto mb-4 flex aspect-square max-w-[560px] items-center justify-center bg-white">
              <img
                src={galleryImages[selectedImageIdx] || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-contain p-8"
                onError={(event) => {
                  event.currentTarget.src = "/placeholder.svg";
                }}
              />
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setSelectedImageIdx((index) =>
                        index === 0 ? galleryImages.length - 1 : index - 1
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/85 border border-border flex items-center justify-center"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setSelectedImageIdx((index) =>
                        index === galleryImages.length - 1 ? 0 : index + 1
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/85 border border-border flex items-center justify-center"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {galleryImages.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`w-20 h-20 bg-white border-2 flex-shrink-0 ${
                      idx === selectedImageIdx ? "border-foreground" : "border-transparent"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={(event) => {
                        event.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold uppercase">{product.name}</h1>
              <p className="mt-0">{product.shortDescription}</p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="text-xl font-bold">{formatTnd(selectedPrice)}</div>
              <p
                className={`text-sm font-semibold flex items-center gap-1.5 ${
                  isOutOfStock ? "text-red-500" : "text-green-500"
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-current" />
                {isOutOfStock ? (
                  "NON DISPONIBLE"
                ) : (
                  <>
                    DISPONIBLE{" "}
                    <span className="text-muted-foreground text-[12px]">
                      ({selectedStock} EN STOCK)
                    </span>
                  </>
                )}
              </p>
            </div>

            {colorOptions.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-wider mb-3">
                  COULEUR
                  {selectedColorName ? (
                    <span className="ml-2 font-medium normal-case text-muted-foreground">
                      {selectedColorName}
                    </span>
                  ) : null}
                </p>
                <div className="flex items-center gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={`${color.key}-${color.combinationId}`}
                      title={color.name}
                      onClick={() => handleColorSelect(color.key, color.combinationId)}
                      className={`w-7 h-7 rounded-full border-2 ${
                        selectedColorKey === color.key ? "border-foreground" : "border-border"
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </div>
            )}

            {sizeOptions.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-wider mb-3">TAILLE</p>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => (
                    <button
                      key={`${size.label}-${size.combinationId}`}
                      type="button"
                      onClick={() => handleSizeSelect(size.label, size.combinationId)}
                      className={`border px-4 py-1.5 text-sm font-semibold leading-none transition-colors ${
                        selectedSize === size.label
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dimensionOptions.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-wider mb-3">Dimensions</p>
                <div className="flex flex-wrap gap-2">
                  {dimensionOptions.map((dimension) => (
                    <button
                      key={`${dimension.label}-${dimension.sizeLabel}-${dimension.combinationId}`}
                      type="button"
                      onClick={() => {
                        if (dimension.combinationId) {
                          setSelectedCombinationId(dimension.combinationId);
                        }
                      }}
                      className={`border px-4 py-1.5 text-sm font-semibold leading-none transition-colors ${
                        selectedCombinationId === dimension.combinationId
                          ? "border-foreground bg-foreground text-background"
                          : selectedSize &&
                              dimension.sizeLabel &&
                              dimension.sizeLabel !== selectedSize
                            ? "border-border text-muted-foreground opacity-60"
                            : "border-border hover:bg-accent"
                      }`}
                    >
                      {dimension.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {extensibleDimensionOptions.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-wider mb-3">Dimension extensible</p>
                <div className="flex flex-wrap gap-2">
                  {extensibleDimensionOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="border border-foreground px-4 py-1.5 text-sm font-semibold leading-none"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {weightOptions.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-wider mb-3">Poids</p>
                <div className="flex flex-wrap gap-2">
                  {weightOptions.map((weight) => (
                    <button
                      key={weight}
                      type="button"
                      className="border border-foreground px-4 py-1.5 text-sm font-semibold leading-none"
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {volumeOptions.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-wider mb-3">Volume</p>
                <div className="flex flex-wrap gap-2">
                  {volumeOptions.map((volume) => (
                    <button
                      key={volume}
                      type="button"
                      className="border border-foreground px-4 py-1.5 text-sm font-semibold leading-none"
                    >
                      {volume}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isOutOfStock && (
              <div>
                <p className="text-xs font-bold tracking-wider mb-3">QUANTITE</p>
                <div className="flex items-center border border-border w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-accent"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 h-10 flex items-center justify-center border-x border-border">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {product.description && (
              <section className="border-t border-border pt-6 space-y-2">
                <h2 className="text-sm font-bold tracking-wider uppercase">Description</h2>
                <p className="text-sm leading-6 text-muted-foreground">{product.description}</p>
              </section>
            )}

            {guaranteeCharacteristics.length > 0 && (
              <section className="border-t border-border pt-6 space-y-2">
                <h2 className="text-sm font-bold tracking-wider uppercase">Garantie</h2>
                <div className="space-y-1">
                  {guaranteeCharacteristics.map((item, index) => (
                    <p key={`${item.label}-${index}`} className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{item.label}:</span>{" "}
                      {item.value}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {technicalCharacteristics.length > 0 && (
              <section className="border-t border-border pt-6 space-y-3">
                <h2 className="text-sm font-bold tracking-wider uppercase">Fiche technique</h2>
                <div className="border border-border divide-y divide-border">
                  {technicalCharacteristics.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="grid grid-cols-2 text-sm">
                      <div className="px-3 py-2 font-semibold bg-accent/40">{item.label}</div>
                      <div className="px-3 py-2 text-muted-foreground">{item.value}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <button
              disabled={isOutOfStock}
              onClick={() =>
                addItem(
                  {
                    ...product,
                    price: selectedPrice,
                  },
                  quantity,
                  selectedVariant?.color?.name || product.colors[0]?.name
                )
              }
              className="bg-foreground text-background px-5 py-3 w-full text-sm font-extrabold tracking-wider hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="h-4 w-4" />
              AJOUTER AU PANIER
            </button>

            <div className="border-t border-border pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-semibold">Livraison offerte a partir de 300 TND</p>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-semibold">Retours gratuits sous 30 jours</p>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-semibold">Garantie mondiale</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {similarProducts.length > 0 && (
        <section className="samsonite-container py-10 border-t border-border">
          <h2 className="text-xl font-bold tracking-wider uppercase mb-6">Produits similaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similarProducts.map((similarProduct) => (
              <ProductCard key={similarProduct.id} product={similarProduct} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Product;
