import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  ShoppingBag,
  Truck,
} from "lucide-react";

import ProductCard from "@/components/ProductCard";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import BrandLoader from "@/components/BrandLoader";
import { fetchDisplayCategories, fetchDisplayProducts } from "@/lib/prestashop/catalog";
import { formatTnd } from "@/lib/currency";
import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/lib/i18n";
import type { CategoryDisplay, ProductDisplay, ProductVariant } from "@/lib/prestashop/types";

const Product = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDisplay | null>(null);
  const [allProducts, setAllProducts] = useState<ProductDisplay[]>([]);
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedCombinationId, setSelectedCombinationId] = useState<number | null>(null);
  const [variantMessage, setVariantMessage] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [cartConfirmOpen, setCartConfirmOpen] = useState(false);
  const [selectedInferredColorKey, setSelectedInferredColorKey] = useState("");
  const [inferredColorGroups, setInferredColorGroups] = useState<
    Array<{ key: string; name: string; hex: string; images: string[] }>
  >([]);
  const { addItem } = useCart();
  const { t } = useLanguage();

  const variantUrlMatch = slug?.match(/^(\d+)-v-(\d+)$/);
  const productId = variantUrlMatch ? Number(variantUrlMatch[1]) : Number(slug);
  const variantIdFromUrl = variantUrlMatch ? Number(variantUrlMatch[2]) : null;
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
          const urlVariant = variantIdFromUrl
            ? currentProduct?.variants.find((variant) => variant.combinationId === variantIdFromUrl)
            : undefined;
          if (variantIdFromUrl && currentProduct && !urlVariant) {
            console.warn("[Product] Variante URL inexistante", {
              productId: currentProduct.id,
              variantId: variantIdFromUrl,
            });
          }
          const defaultVariant =
            urlVariant ||
            currentProduct?.variants.find((variant) => variant.isDefault) ||
            currentProduct?.variants[0];
          setSelectedCombinationId(defaultVariant?.combinationId ?? null);
          setVariantMessage("");
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
  }, [hasNumericId, productId, slug, variantIdFromUrl]);

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
    if (!product) return undefined;
    const exactVariant = selectedCombinationId
      ? product.variants.find((variant) => variant.combinationId === selectedCombinationId)
      : undefined;
    return exactVariant || product.variants.find((variant) => variant.isDefault) || product.variants[0];
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

  const normalizeGalleryImages = (images: string[]) => {
    const unique = Array.from(new Set(images.map((image) => image.trim()).filter(Boolean)));
    const localImages = unique.filter((image) => image.startsWith("/images/products/") || image.startsWith("/images/admin/"));
    return localImages.length > 0 ? localImages : unique;
  };

  const galleryImages = (() => {
    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      return normalizeGalleryImages(selectedVariant.images);
    }
    if (selectedInferredColorKey) {
      const inferredGroup = inferredColorGroups.find((group) => group.key === selectedInferredColorKey);
      if (inferredGroup?.images.length) return normalizeGalleryImages(inferredGroup.images);
    }
    if (product?.images && product.images.length > 0) return normalizeGalleryImages(product.images);
    // Fallback: use first similar product's first image so the UI isn't empty
    const fallback = similarProducts?.[0]?.images || [];
    return normalizeGalleryImages(fallback);
  })();
  const selectedPrice =
    selectedVariant && selectedVariant.price > 0 ? selectedVariant.price : product?.price || 0;
  const selectedStock =
    typeof selectedVariant?.stock === "number" ? selectedVariant.stock : product?.stock || 0;
  const lowStockThreshold = 3;
  const isOutOfStock = selectedStock <= 0;
  const isLowStock = selectedStock > 0 && selectedStock <= lowStockThreshold;
  const availabilityText = isOutOfStock
    ? "Temporairement indisponible"
    : isLowStock
    ? "Plus que quelques pièces disponibles"
    : t("product.available");

  

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
  const isSelectableVariant = (variant: ProductVariant) =>
    Boolean(
      variant.color ||
        variant.images.length > 0 ||
        variant.price > 0 ||
        variant.stock > 0 ||
        variant.width ||
        variant.height ||
        variant.depth ||
        variant.volume ||
        variant.weight
    );
  const selectableVariants = variants.filter(isSelectableVariant);
  const effectiveVariants = selectableVariants.length > 0 ? selectableVariants : variants;

  const getColorKey = (variant?: ProductVariant) =>
    (variant?.color?.hex || "").trim().toLowerCase() ||
    (variant?.color?.name || "").trim().toLowerCase();

  const normalizeVariantKey = (value?: string) => (value || "").trim().toLowerCase();
  const getVariantDimensionLabel = (variant?: ProductVariant) => {
    if (!variant) return "";
    const dimensions = (variant.dimensions || "").trim();
    if (dimensions && hasNonZeroNumeric(dimensions)) return dimensions;
    const physicalDimensions = [variant.height, variant.width, variant.depth]
      .map((value) => (value || "").trim())
      .filter(Boolean)
      .join(" x ");
    return physicalDimensions && hasNonZeroNumeric(physicalDimensions)
      ? `${physicalDimensions} cm`
      : "";
  };
  const pickBestVariant = (items: ProductVariant[]) =>
    [...items].sort((a, b) => {
      const stockScore = Number((b.stock || 0) > 0) - Number((a.stock || 0) > 0);
      if (stockScore !== 0) return stockScore;
      const defaultScore = Number(b.isDefault) - Number(a.isDefault);
      if (defaultScore !== 0) return defaultScore;
      const imageScore = (b.images?.length || 0) - (a.images?.length || 0);
      if (imageScore !== 0) return imageScore;
      return (b.price || 0) - (a.price || 0);
    })[0];

  const selectedColorKey = getColorKey(selectedVariant);
  const selectedSize = (selectedVariant?.size || "").trim();
  const selectedDimensionKey = normalizeVariantKey(getVariantDimensionLabel(selectedVariant));
  const findVariantBySelection = (size: string, colorKey: string, dimensionKey = "") => {
    const normalizedSize = normalizeVariantKey(size);
    const normalizedColor = normalizeVariantKey(colorKey);
    const normalizedDimension = normalizeVariantKey(dimensionKey);
    const matches = effectiveVariants.filter((variant) => {
      const variantSize = normalizeVariantKey(variant.size);
      const variantDimension = normalizeVariantKey(getVariantDimensionLabel(variant));
      return (
        (!normalizedSize || variantSize === normalizedSize) &&
        (!normalizedColor || getColorKey(variant) === normalizedColor) &&
        (!normalizedDimension || variantDimension === normalizedDimension)
      );
    });
    return pickBestVariant(matches);
  };
  const findBestVariantForColor = (colorKey: string) =>
    findVariantBySelection("", colorKey, selectedDimensionKey) ||
    findVariantBySelection("", colorKey, "");
  const findBestVariantForDimension = (dimensionKey: string) =>
    findVariantBySelection("", selectedColorKey, dimensionKey) ||
    findVariantBySelection("", "", dimensionKey);

  const colorOptions = useMemo(() => {
    const byKey = new Map<
      string,
      { key: string; name: string; hex: string; combinationId: number; stock: number; images: string[]; score: number }
    >();
    for (const variant of effectiveVariants) {
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
  }, [effectiveVariants]);

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

  const displayColorOptions = colorOptions.map((color) => ({ ...color, inferred: false }));

  const sizeOptions = useMemo(() => {
    const scopedVariants = effectiveVariants;

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
  }, [effectiveVariants]);

  const updateVariantUrl = (variant: ProductVariant) => {
    if (!product) return;
    navigate(`/produit/${product.id}-v-${variant.combinationId}`, { replace: true });
  };

  const handleColorSelect = (colorKey: string) => {
    if (!selectedVariant) return;
    const targetVariant = findBestVariantForColor(colorKey);
    if (!targetVariant) {
      setVariantMessage("Cette couleur n'est pas proposée dans la taille sélectionnée.");
      return;
    }
    setVariantMessage("");
    setSelectedCombinationId(targetVariant.combinationId);
    setSelectedImageIdx(0);
    updateVariantUrl(targetVariant);
  };

  const handleSizeSelect = (sizeLabel: string) => {
    if (!selectedVariant) return;
    const targetVariant = findVariantBySelection(sizeLabel, selectedColorKey);
    if (!targetVariant) {
      setVariantMessage("Cette taille n'est pas proposée dans la couleur sélectionnée.");
      return;
    }
    setVariantMessage("");
    setSelectedCombinationId(targetVariant.combinationId);
    setSelectedImageIdx(0);
    updateVariantUrl(targetVariant);
  };

  const handleDimensionSelect = (dimensionLabel: string) => {
    if (!selectedVariant) return;
    const targetVariant = findBestVariantForDimension(dimensionLabel);
    if (!targetVariant) {
      setVariantMessage("Cette dimension n'est pas proposée dans la couleur sélectionnée.");
      return;
    }
    setVariantMessage("");
    setSelectedCombinationId(targetVariant.combinationId);
    setSelectedImageIdx(0);
    updateVariantUrl(targetVariant);
  };

  const dimensionOptions = useMemo(() => {
    const byLabel = new Map<
      string,
      { label: string; combinationId: number; stock: number; price: number; score: number }
    >();

    for (const variant of effectiveVariants) {
      if (selectedColorKey && getColorKey(variant) !== selectedColorKey) continue;
      const label = getVariantDimensionLabel(variant);
      if (!label || !hasNonZeroNumeric(label)) continue;

      const key = normalizeVariantKey(label);
      const score = (variant.isDefault ? 100 : 0) + ((variant.stock || 0) > 0 ? 10 : 0);
      const existing = byLabel.get(key);

      if (!existing || score > existing.score) {
        byLabel.set(key, {
          label,
          combinationId: variant.combinationId,
          stock: variant.stock || 0,
          price: variant.price || product?.price || 0,
          score,
        });
      }
    }

    return Array.from(byLabel.values()).map(({ score: _score, ...dimension }) => dimension);
  }, [effectiveVariants, selectedColorKey]);

  const sizeSelectorOptions = useMemo(() => {
    if (sizeOptions.length > 0) {
      return sizeOptions.map((size) => ({
        kind: "size" as const,
        label: size.label,
        combinationId: size.combinationId,
        stock: size.stock,
      }));
    }

    return dimensionOptions.map((dimension) => ({
      kind: "dimension" as const,
      label: dimension.label,
      combinationId: dimension.combinationId,
      stock: dimension.stock,
    }));
  }, [dimensionOptions, sizeOptions]);

  const handleSizeSelectorSelect = (option: (typeof sizeSelectorOptions)[number]) => {
    if (option.kind === "size") {
      handleSizeSelect(option.label);
      return;
    }
    handleDimensionSelect(option.label);
  };

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

  const activeColorKey = selectedColorKey;
  const selectedColorName =
    displayColorOptions.find((color) => color.key === activeColorKey)?.name ||
    selectedVariant?.color?.name ||
    displayColorOptions[0]?.name ||
    "";
  const selectedDimensionLabel =
    getVariantDimensionLabel(selectedVariant) ||
    product?.dimensions ||
    "";
  const selectedPhysicalDimensions =
    selectedDimensionLabel ||
    [selectedVariant?.height, selectedVariant?.width, selectedVariant?.depth]
      .map((value) => (value || "").trim())
      .filter(Boolean)
      .join(" x ");
  const selectedExpandableDimensions = extensibleDimensionOptions[0] || "";
  const selectedVolume = volumeOptions[0] || product?.volume || "";
  const selectedWeight = weightOptions[0] || product?.weight || "";

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
  const displayTechnicalCharacteristics = useMemo(() => {
    const grouped = new Map<string, { label: string; values: string[] }>();

    technicalCharacteristics
      .filter((item) => !/garantie|warranty/i.test(item.label))
      .forEach((item) => {
        const key = item.label
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .trim()
          .toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
          const valueKey = item.value.trim().toLowerCase();
          if (!existing.values.some((value) => value.toLowerCase() === valueKey)) {
            existing.values.push(item.value.trim());
          }
        } else {
          grouped.set(key, { label: item.label.trim(), values: [item.value.trim()] });
        }
      });

    return Array.from(grouped.values()).map((item) => ({
      label: item.label,
      value: item.values.join(" / "),
    }));
  }, [technicalCharacteristics]);

  const specificationRows = useMemo(() => {
    const rows = [
      ...guaranteeCharacteristics,
      { label: "Couleur", value: selectedColorName },
      { label: "Dimensions", value: selectedPhysicalDimensions },
      { label: "Dimensions extensibles", value: selectedExpandableDimensions },
      { label: "Taille", value: selectedSize },
      { label: "Volume", value: selectedVolume },
      { label: "Poids", value: selectedWeight },
      { label: "SKU", value: selectedVariant?.sku || "" },
      ...displayTechnicalCharacteristics,
    ];
    const seen = new Set<string>();

    return rows.filter((row) => {
      const label = row.label.trim();
      const value = (row.value || "").trim();
      if (!label || !value) return false;
      const key = label
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [
    displayTechnicalCharacteristics,
    guaranteeCharacteristics,
    selectedColorName,
    selectedExpandableDimensions,
    selectedPhysicalDimensions,
    selectedSize,
    selectedVariant?.sku,
    selectedVolume,
    selectedWeight,
  ]);

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
        <button onClick={() => navigate(-1)} className="underline">
          {t("product.backHome")}
        </button>
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

      <div className="samsonite-container py-4 lg:py-6">
        <div className="grid gap-6 md:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.78fr)] lg:gap-9">
          <div>
            <div className="premium-surface relative mx-auto mb-4 flex aspect-square max-w-[470px] items-center justify-center overflow-hidden bg-white">
              <img
                src={galleryImages[selectedImageIdx] || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-contain p-6 transition-transform duration-500"
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
                    className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-sm backdrop-blur transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setSelectedImageIdx((index) =>
                        index === galleryImages.length - 1 ? 0 : index + 1
                      )
                    }
                    className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-sm backdrop-blur transition-shadow hover:shadow-[0_10px_30px_rgba(0,0,0,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
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
                    className={`h-16 w-16 flex-shrink-0 border-2 bg-white transition-all duration-200 hover:-translate-y-0.5 ${
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

          <div className="self-start space-y-4 lg:pt-0">
            <div className="space-y-1.5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                {product.brandName || "Samsonite"}
              </p>
              <h1 className="text-xl font-black uppercase leading-tight tracking-tight md:text-3xl">
                {product.name}
              </h1>
              {product.shortDescription && (
                <p className="text-sm leading-6 text-foreground/85">{product.shortDescription}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-y border-border py-3">
                <div className="min-w-[135px] text-xl font-black">{formatTnd(selectedPrice)}</div>
                <p
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                    isOutOfStock ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-current" />
                  {availabilityText}
                </p>
              <p className="text-xs font-semibold text-muted-foreground">TVA incl.</p>
            </div>

            {sizeOptions.length > 1 && (
              <div className="grid gap-2 sm:grid-cols-[118px_minmax(0,1fr)] sm:items-start">
                <p className="pt-2 text-xs font-black uppercase tracking-wide">
                  {t("product.size")}
                  {selectedPhysicalDimensions ? (
                    <span className="mt-1 block text-xs font-semibold normal-case text-muted-foreground">
                      {selectedPhysicalDimensions} <span className="text-muted-foreground/70">-</span>{" "}
                      <span className="border-b border-muted-foreground/40">Guide des tailles</span>
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => {
                    const exactVariant = findVariantBySelection(size.label, selectedColorKey);
                    const doesNotExist = !exactVariant;
                    const isUnavailable = Boolean(exactVariant && exactVariant.stock <= 0);
                    const isSelected = selectedSize.toLowerCase() === size.label.toLowerCase();
                    return (
                      <button
                        key={`${size.label}-${size.combinationId}`}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={doesNotExist}
                        title={doesNotExist ? "Cette taille n'est pas proposée dans la couleur sélectionnée." : size.label}
                        onClick={() => handleSizeSelect(size.label)}
                        className={`premium-control relative min-h-12 min-w-[82px] border px-4 py-3 text-sm font-semibold leading-none ${
                          isSelected
                            ? "border-black bg-black text-white"
                            : doesNotExist
                            ? "cursor-not-allowed border-neutral-200 bg-neutral-50 text-muted-foreground opacity-50"
                            : isUnavailable
                            ? "border-red-200 bg-red-50 text-red-700 hover:border-red-400"
                            : "border-neutral-300 bg-white text-black hover:border-black"
                        }`}
                      >
                        <span className={doesNotExist ? "line-through" : ""}>{size.label}</span>
                        {isUnavailable && (
                          <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                            Rupture
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {false && dimensionOptions.length > 1 && (
              <div className="grid gap-2 sm:grid-cols-[118px_minmax(0,1fr)] sm:items-start">
                <p className="pt-2 text-xs font-black uppercase tracking-wide">
                  {t("product.dimension")}
                  {getVariantDimensionLabel(selectedVariant) ? (
                    <span className="mt-1 block text-xs font-semibold normal-case text-muted-foreground">
                      {getVariantDimensionLabel(selectedVariant)}
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {dimensionOptions.map((dimension) => {
                    const exactVariant = findVariantBySelection("", selectedColorKey, dimension.label);
                    const doesNotExist = !exactVariant;
                    const isUnavailable = Boolean(exactVariant && exactVariant.stock <= 0);
                    const isSelected = selectedDimensionKey === normalizeVariantKey(dimension.label);
                    return (
                      <button
                        key={`${dimension.label}-${dimension.combinationId}`}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={doesNotExist}
                        title={doesNotExist ? "Cette dimension n'est pas proposée dans la couleur sélectionnée." : dimension.label}
                        onClick={() => handleDimensionSelect(dimension.label)}
                        className={`premium-control relative min-h-9 min-w-[118px] border px-3 py-2 text-sm font-semibold leading-none ${
                          isSelected
                            ? "border-black bg-black text-white"
                            : doesNotExist
                            ? "cursor-not-allowed border-neutral-200 bg-neutral-50 text-muted-foreground opacity-50"
                            : isUnavailable
                            ? "border-red-200 bg-red-50 text-red-700 hover:border-red-400"
                            : "border-neutral-300 bg-white text-black hover:border-black"
                        }`}
                      >
                        <span className={doesNotExist ? "line-through" : ""}>{dimension.label}</span>
                        {isUnavailable && (
                          <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                            Rupture
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {false && (selectedPhysicalDimensions || selectedExpandableDimensions || selectedVolume || selectedWeight) && (
              <div className="space-y-2 border-y border-border py-3">
                {selectedPhysicalDimensions && (
                  <p className="grid gap-1 text-sm sm:grid-cols-[118px_minmax(0,1fr)]">
                    <span className="text-xs font-black uppercase tracking-wide">{t("product.dimension")}</span>
                    <span className="text-muted-foreground">{selectedPhysicalDimensions}</span>
                  </p>
                )}
                {selectedExpandableDimensions && (
                  <p className="grid gap-1 text-sm sm:grid-cols-[118px_minmax(0,1fr)]">
                    <span className="text-xs font-black uppercase tracking-wide">{t("product.expandableDimension")}</span>
                    <span className="text-muted-foreground">{selectedExpandableDimensions}</span>
                  </p>
                )}
                {selectedVolume && (
                  <p className="grid gap-1 text-sm sm:grid-cols-[118px_minmax(0,1fr)]">
                    <span className="text-xs font-black uppercase tracking-wide">{t("product.volume")}</span>
                    <span className="text-muted-foreground">{selectedVolume}</span>
                  </p>
                )}
                {selectedWeight && (
                  <p className="grid gap-1 text-sm sm:grid-cols-[118px_minmax(0,1fr)]">
                    <span className="text-xs font-black uppercase tracking-wide">{t("product.weight")}</span>
                    <span className="text-muted-foreground">{selectedWeight}</span>
                  </p>
                )}
              </div>
            )}

            {displayColorOptions.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-[118px_minmax(0,1fr)] sm:items-start">
                <p className="pt-2 text-xs font-black uppercase tracking-wide">
                  {t("product.color")}
                  {selectedColorName ? (
                    <span className="mt-1 block text-xs font-semibold normal-case text-muted-foreground">
                      {selectedColorName}
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {displayColorOptions.map((color) => {
                    const exactVariant = color.inferred ? undefined : findBestVariantForColor(color.key);
                    const doesNotExist = !color.inferred && !exactVariant;
                    const isUnavailable = Boolean(exactVariant && exactVariant.stock <= 0);
                    const isSelected = activeColorKey === color.key;
                    return (
                      <button
                        key={`${color.key}-${color.combinationId}`}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={doesNotExist}
                        title={doesNotExist ? "Cette couleur n'est pas proposée dans la taille sélectionnée." : color.name}
                        onClick={() => {
                          if (doesNotExist) return;
                          if (color.inferred) {
                            setSelectedInferredColorKey(color.key);
                            setSelectedImageIdx(0);
                            return;
                          }
                          setSelectedInferredColorKey("");
                          handleColorSelect(color.key);
                        }}
                        className={`premium-control relative flex h-10 w-10 items-center justify-center rounded-full border bg-white ${
                          isSelected ? "border-black shadow-[0_0_0_4px_rgba(0,0,0,0.06)]" : isUnavailable ? "border-red-300" : "border-neutral-300"
                        } ${doesNotExist ? "cursor-not-allowed opacity-35" : ""}`}
                      >
                        <span
                          className="block h-6 w-6 rounded-full border border-black/10"
                          style={{ backgroundColor: color.hex }}
                        />
                        {isUnavailable && <span className="absolute h-px w-10 rotate-45 bg-red-600" />}
                        {isUnavailable && (
                          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-white bg-red-600" />
                        )}
                        {doesNotExist && <span className="absolute h-px w-10 rotate-45 bg-neutral-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {variantMessage && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                {variantMessage}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {!isOutOfStock && (
                <div className="flex w-fit items-center border border-border bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-accent"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex h-10 w-12 items-center justify-center border-x border-border font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(selectedStock, quantity + 1))}
                    disabled={quantity >= selectedStock}
                    className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button
                disabled={isOutOfStock || !selectedVariant || quantity > selectedStock}
                onClick={() => {
                  if (!selectedVariant || selectedStock <= 0 || quantity > selectedStock) return;
                  addItem(
                    {
                      ...product,
                      price: selectedPrice,
                      images: galleryImages.length ? galleryImages : product.images,
                    },
                    quantity,
                    {
                      variantId: selectedVariant.combinationId,
                      sku: selectedVariant.sku || String(selectedVariant.combinationId),
                      size: selectedVariant.size,
                      color: selectedVariant.color?.name || product.colors[0]?.name,
                      maxStock: selectedStock,
                    }
                  );
                  setCartConfirmOpen(true);
                }}
                className="premium-control flex min-h-10 flex-1 items-center justify-center gap-2 bg-foreground px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingBag className="h-4 w-4" />
                {t("product.addToCart")}
              </button>
            </div>

            <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold leading-4">{t("product.freeShipping")}</p>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold leading-4">{t("product.freeReturns")}</p>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold leading-4">{t("product.worldWarranty")}</p>
              </div>
            </div>

            {(product.description || specificationRows.length > 0) && (
              <section className="border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setDetailsOpen((open) => !open)}
                  className="flex w-full items-center justify-between py-2 text-left"
                  aria-expanded={detailsOpen}
                >
                  <span className="text-base font-black uppercase tracking-tight">D&eacute;tails du produit</span>
                  {detailsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>

                {detailsOpen && (
                  <div className="mt-3 bg-neutral-50">
                    {product.description && (
                      <div className="border-b border-neutral-200 px-5 py-5">
                        <p className="max-w-[36rem] text-sm leading-7 text-muted-foreground">
                          {product.description}
                        </p>
                      </div>
                    )}

                    <div className="bg-neutral-100 px-5 py-4 text-sm font-black uppercase tracking-wide text-muted-foreground">
                      Specifications
                    </div>
                    <dl className="divide-y divide-neutral-200 px-5">
                      {specificationRows.map((item, index) => (
                        <div
                          key={`${item.label}-${item.value}-${index}`}
                          className="grid gap-3 py-3.5 text-sm sm:grid-cols-[175px_minmax(0,1fr)]"
                        >
                          <dt className="font-semibold text-muted-foreground">{item.label}</dt>
                          <dd className="leading-6 text-muted-foreground">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>


      <Dialog open={cartConfirmOpen} onOpenChange={setCartConfirmOpen}>
        <DialogContent className="max-w-md rounded-none border-0 p-0 sm:rounded-none">
          <div className="border-b border-border px-6 py-5">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Article ajouté au panier</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Votre sélection a bien été ajoutée.
            </DialogDescription>
          </div>
          <div className="flex gap-4 px-6 py-5">
            <div className="h-24 w-24 flex-shrink-0 bg-white">
              <img
                src={galleryImages[selectedImageIdx] || product.images[0] || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase leading-5">{product.name}</p>
              <p className="mt-1 text-lg font-black text-samsonite-teal">{formatTnd(selectedPrice)}</p>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {selectedVariant?.size && <p>Taille: {selectedVariant.size}</p>}
                {selectedVariant?.color?.name && <p>Couleur: {selectedVariant.color.name}</p>}
                <p>Quantité: {quantity}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 border-t border-border px-6 py-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCartConfirmOpen(false)}
              className="border border-border px-4 py-3 text-sm font-black uppercase tracking-wide transition-colors hover:bg-neutral-50"
            >
              Continuer mes achats
            </button>
            <Link
              to="/panier"
              onClick={() => setCartConfirmOpen(false)}
              className="flex items-center justify-center bg-black px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-black/85"
            >
              Voir mon panier
            </Link>
          </div>
        </DialogContent>
      </Dialog>

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

