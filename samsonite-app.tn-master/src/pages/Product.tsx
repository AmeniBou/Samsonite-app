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
import { useLanguage } from "@/lib/i18n";
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
  const [selectedColorChoiceKey, setSelectedColorChoiceKey] = useState("");
  const [selectedSizeChoice, setSelectedSizeChoice] = useState("");
  const [selectedDimensionChoice, setSelectedDimensionChoice] = useState("");
  const [selectedInferredColorKey, setSelectedInferredColorKey] = useState("");
  const [inferredColorGroups, setInferredColorGroups] = useState<
    Array<{ key: string; name: string; hex: string; images: string[] }>
  >([]);
  const { addItem } = useCart();
  const { t } = useLanguage();

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
          const defaultVariant = currentProduct?.variants.find((variant) => variant.isDefault);
          setSelectedCombinationId(defaultVariant?.combinationId ?? null);
          setSelectedColorChoiceKey("");
          setSelectedSizeChoice("");
          setSelectedDimensionChoice("");
          setSelectedInferredColorKey("");
          setInferredColorGroups([]);
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
    if (selectedInferredColorKey) {
      const inferredGroup = inferredColorGroups.find((group) => group.key === selectedInferredColorKey);
      if (inferredGroup?.images.length) return inferredGroup.images;
    }
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

  const selectedColorKey = useMemo(
    () => selectedColorChoiceKey || getColorKey(selectedVariant),
    [selectedColorChoiceKey, selectedVariant]
  );
  const selectedSize = selectedSizeChoice || (selectedVariant?.size || "").trim();

  const colorOptions = useMemo(() => {
    const byKey = new Map<
      string,
      { key: string; name: string; hex: string; combinationId: number; stock: number; images: string[]; score: number }
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
          stock: variant.stock || 0,
          images: variant.images || [],
          score,
        });
      }
    }
    return Array.from(byKey.values()).map(({ score: _score, ...color }) => color);
  }, [variants]);

  useEffect(() => {
    if (!product?.images?.length || colorOptions.length > 0) {
      setInferredColorGroups([]);
      setSelectedInferredColorKey("");
      return;
    }

    let cancelled = false;

    const palette = [
      { key: "vert", name: "Vert", hex: "#08645f", rgb: [8, 100, 95] },
      { key: "orange", name: "Orange", hex: "#e65f16", rgb: [230, 95, 22] },
      { key: "noir", name: "Noir", hex: "#111111", rgb: [17, 17, 17] },
      { key: "bleu", name: "Bleu", hex: "#24384f", rgb: [36, 56, 79] },
      { key: "gris", name: "Gris", hex: "#7d8580", rgb: [125, 133, 128] },
      { key: "rouge", name: "Rouge", hex: "#df332b", rgb: [223, 51, 43] },
      { key: "jaune", name: "Jaune", hex: "#f2aa2a", rgb: [242, 170, 42] },
      { key: "violet", name: "Violet", hex: "#8c83bd", rgb: [140, 131, 189] },
      { key: "rose", name: "Rose", hex: "#d9a2b8", rgb: [217, 162, 184] },
      { key: "marron", name: "Marron", hex: "#6f4e37", rgb: [111, 78, 55] },
      { key: "blanc", name: "Blanc", hex: "#f5f5f0", rgb: [245, 245, 240] },
    ] as const;

    const nearestPaletteColor = (rgb: [number, number, number]) =>
      palette.reduce((best, color) => {
        const distance =
          (rgb[0] - color.rgb[0]) ** 2 +
          (rgb[1] - color.rgb[1]) ** 2 +
          (rgb[2] - color.rgb[2]) ** 2;
        return distance < best.distance ? { color, distance } : best;
      }, { color: palette[0], distance: Number.POSITIVE_INFINITY }).color;

    const getDominantImageColor = (src: string) =>
      new Promise<[number, number, number] | null>((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 80;
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            resolve(null);
            return;
          }

          context.drawImage(image, 0, 0, size, size);
          const data = context.getImageData(0, 0, size, size).data;
          const buckets = new Map<string, { rgb: [number, number, number]; score: number }>();

          for (let index = 0; index < data.length; index += 4) {
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const alpha = data[index + 3];
            if (alpha < 180) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const brightness = (r + g + b) / 3;
            const saturation = max - min;
            if (brightness > 235 && saturation < 25) continue;
            if (brightness < 35) continue;

            const qr = Math.round(r / 24) * 24;
            const qg = Math.round(g / 24) * 24;
            const qb = Math.round(b / 24) * 24;
            const key = `${qr}-${qg}-${qb}`;
            const existing = buckets.get(key);
            const score = Math.max(1, saturation) * (brightness > 210 ? 0.35 : 1);
            if (existing) {
              existing.score += score;
            } else {
              buckets.set(key, { rgb: [qr, qg, qb], score });
            }
          }

          const dominant = Array.from(buckets.values()).sort((a, b) => b.score - a.score)[0];
          resolve(dominant?.rgb || null);
        };
        image.onerror = () => resolve(null);
        image.src = src;
      });

    (async () => {
      const groups = new Map<string, { key: string; name: string; hex: string; images: string[] }>();

      for (const image of product.images) {
        const dominantColor = await getDominantImageColor(image);
        if (!dominantColor || cancelled) continue;
        const color = nearestPaletteColor(dominantColor);
        const existing = groups.get(color.key);
        if (existing) {
          existing.images.push(image);
        } else {
          groups.set(color.key, {
            key: color.key,
            name: color.name,
            hex: color.hex,
            images: [image],
          });
        }
      }

      if (cancelled) return;
      const nextGroups = Array.from(groups.values()).filter((group) => group.images.length > 0);
      setInferredColorGroups(nextGroups.length > 1 ? nextGroups : []);
    })();

    return () => {
      cancelled = true;
    };
  }, [colorOptions.length, product?.images]);

  const displayColorOptions =
    colorOptions.length > 0
      ? colorOptions.map((color) => ({ ...color, inferred: false }))
      : inferredColorGroups.map((color) => ({ ...color, combinationId: 0, inferred: true }));

  const sizeOptions = useMemo(() => {
    const scopedVariants = variants;

    const byLabel = new Map<string, { label: string; combinationId: number; stock: number; score: number }>();
    for (const variant of scopedVariants) {
      const label = (variant.size || "").trim();
      if (!label) continue;
      const score = (variant.isDefault ? 100 : 0) + ((variant.stock || 0) > 0 ? 10 : 0);
      const key = label.toLowerCase();
      const existing = byLabel.get(key);
      if (!existing || score > existing.score) {
        byLabel.set(key, { label, combinationId: variant.combinationId, stock: variant.stock || 0, score });
      }
    }
    return Array.from(byLabel.values()).map(({ score: _score, ...size }) => size);
  }, [variants]);

  const handleColorSelect = (colorKey: string, colorCombinationId: number) => {
    setSelectedColorChoiceKey(colorKey);
    const compatibleVariants = variants.filter((v) => getColorKey(v) === colorKey);

    let targetVariant: ProductVariant | undefined;

    if (selectedSize) {
      const sizeMatches = compatibleVariants.filter((v) => (v.size || "").trim() === selectedSize);
      targetVariant =
        sizeMatches.find((v) => (v.stock || 0) > 0 && v.images.length > 0) ||
        sizeMatches.find((v) => v.images.length > 0) ||
        sizeMatches.find((v) => (v.dimensions || "").trim()) ||
        sizeMatches[0];
    }

    if (!targetVariant) {
      const defaultMatches = compatibleVariants.filter((v) => v.isDefault);
      targetVariant =
        defaultMatches.find((v) => (v.stock || 0) > 0 && v.images.length > 0) ||
        defaultMatches.find((v) => v.images.length > 0) ||
        defaultMatches.find((v) => (v.dimensions || "").trim()) ||
        defaultMatches[0] ||
        compatibleVariants.find((v) => (v.stock || 0) > 0 && v.images.length > 0) ||
        compatibleVariants.find((v) => v.images.length > 0) ||
        compatibleVariants.find((v) => (v.dimensions || "").trim()) ||
        compatibleVariants[0];
    }

    setSelectedCombinationId(targetVariant?.combinationId ?? colorCombinationId);
    setSelectedImageIdx(0);
  };

  const handleSizeSelect = (sizeLabel: string, sizeCombinationId: number) => {
    setSelectedSizeChoice(sizeLabel);
    let targetVariant: ProductVariant | undefined;

    if (selectedColorKey) {
      const compatibles = variants.filter(
        (v) => (v.size || "").trim() === sizeLabel && getColorKey(v) === selectedColorKey
      );
      targetVariant =
        compatibles.find((v) => (v.stock || 0) > 0 && v.images.length > 0) ||
        compatibles.find((v) => v.images.length > 0) ||
        compatibles.find((v) => (v.dimensions || "").trim()) ||
        compatibles[0];
    }

    setSelectedCombinationId(targetVariant?.combinationId ?? sizeCombinationId);
    setSelectedImageIdx(0);
  };

  const dimensionScopedVariants = useMemo(() => {
    let scoped = variants;
    return scoped;
  }, [variants]);

  const dimensionOptions = useMemo(() => {
    const sizeLabels = new Set(sizeOptions.map((s) => s.label.trim().toLowerCase()));

    const byLabel = new Map<
      string,
      { label: string; combinationId: number; sizeLabel: string; score: number }
    >();

    for (const variant of dimensionScopedVariants) {
      const label = (variant.dimensions || "").trim();
      const sizeLabel = (variant.size || "").trim();
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

  const activeColorKey = selectedColorKey || selectedInferredColorKey;
  const selectedColorName =
    displayColorOptions.find((color) => color.key === activeColorKey)?.name ||
    selectedVariant?.color?.name ||
    displayColorOptions[0]?.name ||
    "";
  const selectedDimensionLabel =
    selectedDimensionChoice ||
    selectedVariant?.dimensions ||
    dimensionOptions.find((dimension) => dimension.combinationId === selectedCombinationId)?.label ||
    dimensionOptions[0]?.label ||
    product?.dimensions ||
    "";
  const availabilityByColorKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const variant of variants) {
      const key = getColorKey(variant);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + (variant.stock || 0));
    }
    return map;
  }, [variants]);

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
        <h1 className="text-2xl font-bold mb-4">{t("product.notFound")}</h1>
        <Link to="/" className="underline">
          {t("product.backHome")}
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
                {t("category.home")}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-medium">{product.name}</span>
        </nav>
      </div>

      <div className="samsonite-container py-6 lg:py-10">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.02fr)_minmax(380px,0.98fr)] lg:gap-14">
          <div>
            <div className="premium-surface relative mx-auto mb-4 flex aspect-square max-w-[560px] items-center justify-center overflow-hidden bg-white">
              <img
                src={galleryImages[selectedImageIdx] || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-contain p-8 transition-transform duration-500"
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
                    className="premium-control absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setSelectedImageIdx((index) =>
                        index === galleryImages.length - 1 ? 0 : index + 1
                      )
                    }
                    className="premium-control absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="soft-scrollbar flex gap-3 overflow-x-auto pb-2">
                {galleryImages.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`h-20 w-20 flex-shrink-0 border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 ${
                      idx === selectedImageIdx ? "border-foreground shadow-[0_10px_24px_rgba(0,0,0,0.08)]" : "border-transparent"
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

          <div className="premium-surface space-y-6 self-start p-6 lg:p-8">
            <div>
              <h1 className="text-3xl font-black uppercase leading-tight tracking-tight">{product.name}</h1>
              <p className="mt-2 text-base leading-6 text-muted-foreground">{product.shortDescription}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="text-2xl font-black">{formatTnd(selectedPrice)}</div>
              <p
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                  isOutOfStock ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-current" />
                {isOutOfStock ? (
                  t("product.unavailable")
                ) : (
                  <>
                    {t("product.available")}{" "}
                    <span className="text-muted-foreground text-[12px]">
                      ({selectedStock} {t("product.inStock")})
                    </span>
                  </>
                )}
              </p>
            </div>

            {sizeOptions.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-black uppercase tracking-wide">
                  {t("product.size")}
                  {selectedDimensionLabel ? (
                    <span className="ml-3 text-sm font-semibold normal-case text-muted-foreground">
                      {selectedDimensionLabel}
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => (
                    <button
                      key={`${size.label}-${size.combinationId}`}
                      type="button"
                      onClick={() => handleSizeSelect(size.label, size.combinationId)}
                      className={`premium-control relative min-h-12 min-w-[82px] border px-5 py-3 text-base font-semibold leading-none ${
                        selectedSize === size.label
                          ? "border-black bg-black text-white"
                          : size.stock <= 0
                            ? "border-neutral-200 bg-neutral-50 text-muted-foreground opacity-60"
                            : "border-neutral-300 bg-white text-black hover:border-black"
                      }`}
                    >
                      <span className={size.stock <= 0 ? "line-through" : ""}>{size.label}</span>
                      {size.stock <= 0 && (
                        <span className="absolute -right-2 -top-2 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black uppercase text-red-600">
                          Rupture
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dimensionOptions.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-black uppercase tracking-wide">{t("product.dimension")}</p>
                <div className="flex flex-wrap gap-2">
                  {dimensionOptions.map((dimension) => (
                    <button
                      key={`${dimension.label}-${dimension.sizeLabel}-${dimension.combinationId}`}
                      type="button"
                      onClick={() => {
                        setSelectedDimensionChoice(dimension.label);
                        if (dimension.combinationId) {
                          setSelectedCombinationId(dimension.combinationId);
                        }
                      }}
                      className={`premium-control min-h-12 border px-5 py-3 text-base font-semibold leading-none ${
                        selectedDimensionLabel === dimension.label
                          ? "border-black bg-black text-white"
                          : selectedSize &&
                              dimension.sizeLabel &&
                              dimension.sizeLabel !== selectedSize
                            ? "border-neutral-200 bg-white text-muted-foreground opacity-70"
                            : "border-neutral-300 bg-white hover:border-black"
                      }`}
                    >
                      {dimension.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {displayColorOptions.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-black uppercase tracking-wide">
                  {t("product.color")}
                  {selectedColorName ? (
                    <span className="ml-3 text-sm font-semibold normal-case text-muted-foreground">
                      {selectedColorName}
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {displayColorOptions.map((color) => {
                    const colorStock = color.inferred ? 1 : availabilityByColorKey.get(color.key) || color.stock || 0;
                    return (
                    <button
                      key={`${color.key}-${color.combinationId}`}
                      title={color.name}
                      onClick={() => {
                        if (color.inferred) {
                          setSelectedInferredColorKey(color.key);
                          setSelectedColorChoiceKey("");
                          setSelectedImageIdx(0);
                          return;
                        }
                        setSelectedInferredColorKey("");
                        handleColorSelect(color.key, color.combinationId);
                      }}
                      className={`premium-control relative flex h-12 w-12 items-center justify-center rounded-full border ${
                        activeColorKey === color.key ? "border-black shadow-[0_0_0_4px_rgba(0,0,0,0.06)]" : "border-neutral-300"
                      } ${colorStock <= 0 ? "opacity-45" : ""}`}
                    >
                      <span
                        className="block h-8 w-8 rounded-full border border-black/10"
                        style={{ backgroundColor: color.hex }}
                      />
                      {colorStock <= 0 && <span className="absolute h-px w-10 rotate-45 bg-red-600" />}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            {extensibleDimensionOptions.length > 0 && (
              <div>
                <p className="text-xs font-bold tracking-wider mb-3">{t("product.expandableDimension")}</p>
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
                <p className="text-xs font-bold tracking-wider mb-3">{t("product.weight")}</p>
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
                <p className="text-xs font-bold tracking-wider mb-3">{t("product.volume")}</p>
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
                <p className="text-xs font-bold tracking-wider mb-3">{t("product.quantity")}</p>
                <div className="flex w-fit items-center border border-border bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-accent"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 h-10 flex items-center justify-center border-x border-border">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {product.description && (
              <section className="border-t border-border pt-6 space-y-2">
                <h2 className="text-sm font-bold tracking-wider uppercase">{t("product.description")}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{product.description}</p>
              </section>
            )}

            {guaranteeCharacteristics.length > 0 && (
              <section className="border-t border-border pt-6 space-y-2">
                <h2 className="text-sm font-bold tracking-wider uppercase">{t("product.warranty")}</h2>
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
                <h2 className="text-sm font-bold tracking-wider uppercase">{t("product.specs")}</h2>
                <dl className="overflow-hidden rounded-md border border-border bg-white">
                  {technicalCharacteristics.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className="grid gap-1 border-b border-border px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4"
                    >
                      <dt className="font-black uppercase tracking-wide text-foreground">{item.label}</dt>
                      <dd className="leading-6 text-muted-foreground">{item.value}</dd>
                    </div>
                  ))}
                </dl>
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
              className="premium-control flex w-full items-center justify-center gap-2 bg-foreground px-5 py-4 text-sm font-extrabold tracking-wider text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShoppingBag className="h-4 w-4" />
              {t("product.addToCart")}
            </button>

            <div className="grid gap-3 border-t border-border pt-6 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-semibold leading-4">{t("product.freeShipping")}</p>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-semibold leading-4">{t("product.freeReturns")}</p>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-semibold leading-4">{t("product.worldWarranty")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {similarProducts.length > 0 && (
        <section className="samsonite-container py-10 border-t border-border">
          <h2 className="text-xl font-bold tracking-wider uppercase mb-6">{t("product.similar")}</h2>
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
