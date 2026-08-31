import type {
  PSCombination,
  PSFeatureValue,
  PSProduct,
  PSProductOptionValue,
  ProductDisplay,
} from "./types";
import { decodeHtmlEntities, getLangValue } from "./helpers";
import { getProductImageUrl } from "./api";

interface ProductMapOptions {
  categorySlugById?: Record<number, string>;
  categoryNameById?: Record<number, string>;
  parentCategorySlugById?: Record<number, string>;
  parentCategoryNameById?: Record<number, string>;
  combinationsByProductId?: Record<number, PSCombination[]>;
  optionValueById?: Record<number, PSProductOptionValue>;
  optionGroupNameById?: Record<number, string>;
  stockByProductAttributeId?: Record<string, number>;
  featureById?: Record<number, string>;
  featureValueById?: Record<number, PSFeatureValue>;
}

export const mapPSProductToDisplay = (
  product: PSProduct,
  options?: ProductMapOptions
): ProductDisplay => {
  const debugColors =
    import.meta.env.DEV && import.meta.env.VITE_PS_DEBUG_COLORS === "true";
  const stripHtml = (value: string) =>
    decodeHtmlEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

  const normalizeHex = (value: string): string | null => {
    const raw = value.trim();
    if (!raw) return null;
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
    return null;
  };

  const formatDecimal = (raw: string | undefined): string | null => {
    const normalized = (raw || "")
      .toString()
      .trim()
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    if (!normalized) return null;
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0) return null;
    return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, "");
  };

  const parseNumber = (value: unknown) => {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const hasPromotionFlag = (value: unknown) => value === true || value === "1" || value === 1 || value === "true";

  const isWeightText = (value: string) =>
    /poids|weight|\bkg\b/i.test(value.trim());
  const isDimensionText = (value: string) =>
    /dimension|\bcm\b|\bmm\b|\d+\s*[x]\s*\d+/i.test(value.trim());
  const isLikelySizeText = (value: string) =>
    /^(xxs|xs|s|m|l|xl|xxl|xxxl)$/i.test(value.trim()) ||
    /^\d{2,3}\s*(cm|")$/i.test(value.trim()) ||
    /^size\s*[:-]?\s*.+$/i.test(value.trim()) ||
    /^taille\s*[:-]?\s*.+$/i.test(value.trim());
  const isVolumeText = (value: string) =>
    /volume|\b\d+(?:[.,]\d+)?\s*l\b/i.test(value.trim());

  const toTitleCase = (value: string) =>
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        if (word.length <= 3 || /^[A-Z0-9-]+$/.test(word)) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");

  const getCollectionName = (productName: string, productSlug: string) => {
    const cleanedName = productName
      .replace(/^copy\s+of\s+/i, "")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    const typeSplit = cleanedName.split(
      /\s+(?:valise|spinner|sac|pilot|portefeuille|cadenas|sangle|housse|coussin|parapluie|masque|tablette|ordinateur)\b/i
    )[0];

    if (typeSplit && /[a-zA-Z]/.test(typeSplit)) {
      return typeSplit.toUpperCase();
    }

    const slugParts = (productSlug || "")
      .replace(/-html$/i, "")
      .split("-")
      .filter(Boolean)
      .filter((part) => !/^\d+$/.test(part));

    if (slugParts.length > 0) {
      return toTitleCase(slugParts.slice(0, 3).join(" "));
    }

    return cleanedName || "Samsonite";
  };

  const isMeaningfulValue = (value: string): boolean => {
    const normalized = stripHtml(value).replace(/\u00a0/g, " ").trim();
    if (!normalized) return false;

    const lower = normalized.toLowerCase();
    if (["null", "undefined", "n/a", "na", "-", "--", ":", "...", ""].includes(lower)) {
      return false;
    }

    if (/^[:.\-\s]+$/.test(normalized)) return false;
    return true;
  };

  const productId = Number(product.id);
  const defaultImageId = product.id_default_image
    ? Number(product.id_default_image)
    : undefined;
  const imageIdToUrl =
    product.associations?.images?.reduce<Record<number, string>>((acc, img) => {
      const id = Number(img.id);
      const url = typeof img.imageUrl === "string" ? img.imageUrl.trim() : "";
      if (id && url) acc[id] = url;
      return acc;
    }, {}) || {};
  const imageIds =
    product.associations?.images?.map((img) => Number(img.id)).filter(Boolean) || [];
  const finalImageIds = imageIds.length > 0 ? imageIds : defaultImageId ? [defaultImageId] : [];
  const finalImageUrls =
    finalImageIds
      .map((id) => imageIdToUrl[id])
      .filter((url): url is string => Boolean(url));

  const name = decodeHtmlEntities(getLangValue(product.name));
  const shortDesc = stripHtml(getLangValue(product.description_short));
  const fullDesc = stripHtml(getLangValue(product.description));
  const slug = getLangValue(product.link_rewrite);

  const categoryId = Number(product.categoryId || product.id_category_default);
  const associatedCategoryIds =
    product.associations?.categories?.map((category) => Number(category.id)).filter(Boolean) || [];
  const categorySlugs = associatedCategoryIds
    .map((id) => options?.categorySlugById?.[id])
    .filter((value): value is string => Boolean(value));

  const productCombinations = options?.combinationsByProductId?.[productId] || [];
  const stockByAttribute = options?.stockByProductAttributeId || {};
  const defaultCombinationId = Number(product.id_default_combination || 0);

  const variants = productCombinations.map((combination) => {
    const combinationId = Number(combination.id);
    const optionIds =
      combination.associations?.product_option_values?.map((item) => Number(item.id)) || [];
    const optionEntries = optionIds
      .map((optionId) => options?.optionValueById?.[optionId])
      .filter(Boolean)
      .map((option) => ({
        groupId: Number(option!.id_attribute_group || 0),
        groupName:
          options?.optionGroupNameById?.[Number(option!.id_attribute_group || 0)] || "",
        name: stripHtml(getLangValue(option!.name)).trim(),
        color: option!.color,
      }))
      .filter((entry) => Boolean(entry.name));
    const colorOption = optionIds
      .map((optionId) => options?.optionValueById?.[optionId])
      .find((option) => Boolean(option?.color && normalizeHex(option.color)));
    const dimensionOption = optionEntries.find(
      (entry) =>
        /dimension/i.test(entry.groupName.toLowerCase()) ||
        (isDimensionText(entry.name) && !isLikelySizeText(entry.name))
    );
    const extensibleDimensionOption = optionEntries.find(
      (entry) =>
        /extensible|expand/i.test(entry.groupName.toLowerCase()) ||
        (/\/\s*\d+/.test(entry.name) && isDimensionText(entry.name))
    );
    const weightOption = optionEntries.find(
      (entry) =>
        /poids|weight/i.test(entry.groupName.toLowerCase()) || isWeightText(entry.name)
    );
    const volumeOption = optionEntries.find(
      (entry) =>
        /volume/i.test(entry.groupName.toLowerCase()) || isVolumeText(entry.name)
    );
    const sizeOption = optionEntries.find(
      (entry) =>
        !isDimensionText(entry.name) &&
        !isWeightText(entry.name) &&
        !isVolumeText(entry.name) &&
        isLikelySizeText(entry.name)
    );

    const richColorHex = combination.colorHex ? normalizeHex(combination.colorHex) : null;
    const colorHex = richColorHex || (colorOption?.color ? normalizeHex(colorOption.color) : null);
    const price = parseNumber(combination.price);
    const originalPrice = parseNumber(combination.original_price);
    const promotionPrice = parseNumber(combination.promotion_price);
    const discountPercent = parseNumber(combination.discount_percent);
    const stock =
      combination.stock !== undefined && combination.stock !== ""
        ? Number(combination.stock)
        : stockByAttribute[`${productId}:${combinationId}`] || 0;
    const hasPromotion =
      hasPromotionFlag(combination.has_promotion) &&
      originalPrice > 0 &&
      promotionPrice > 0 &&
      promotionPrice < originalPrice &&
      stock > 0;
    const stockInitial =
      combination.stockInitial !== undefined && combination.stockInitial !== ""
        ? Number(combination.stockInitial)
        : undefined;
    const variantImageIds =
      combination.associations?.images?.map((image) => Number(image.id)).filter(Boolean) || [];
    const richImages = Array.isArray(combination.images)
      ? combination.images.filter((image): image is string => Boolean(image))
      : [];
    const images =
      richImages.length > 0
        ? richImages
        : variantImageIds.length > 0
        ? variantImageIds.map((imageId) => getProductImageUrl(productId, imageId))
        : finalImageUrls?.length
        ? finalImageUrls
        : finalImageIds.map((imageId) => getProductImageUrl(productId, imageId));
    const width = combination.width?.trim();
    const height = combination.height?.trim();
    const depth = combination.depth?.trim();
    const expandedWidth = combination.expandedWidth?.trim();
    const expandedHeight = combination.expandedHeight?.trim();
    const expandedDepth = combination.expandedDepth?.trim();
    const richDimensions =
      width && height && depth ? `${height} x ${width} x ${depth} cm` : undefined;
    const richExtensibleDimensions =
      (combination.isExpandable || expandedWidth || expandedHeight || expandedDepth) &&
      expandedWidth &&
      expandedHeight &&
      expandedDepth
        ? `${expandedHeight} x ${expandedWidth} x ${expandedDepth} cm`
        : undefined;

    return {
      combinationId,
      sku: combination.reference || String(combinationId),
      price,
      originalPrice: hasPromotion ? originalPrice : undefined,
      promotionPrice: hasPromotion ? promotionPrice : undefined,
      discountPercent: hasPromotion ? discountPercent : undefined,
      hasPromotion,
      promotionName: hasPromotion ? combination.promotion_name : undefined,
      stock,
      stockInitial,
      isDefault:
        combination.default_on === "1" ||
        (defaultCombinationId > 0 && combinationId === defaultCombinationId),
      size: combination.size || sizeOption?.name,
      dimensions: richDimensions || dimensionOption?.name,
      extensibleDimensions: richExtensibleDimensions || extensibleDimensionOption?.name,
      weight: combination.weight || weightOption?.name,
      width,
      height,
      depth,
      isExpandable: Boolean(combination.isExpandable || richExtensibleDimensions),
      expandedWidth,
      expandedHeight,
      expandedDepth,
      volume: combination.volume || volumeOption?.name,
      color:
        colorHex && (combination.colorName || colorOption)
          ? {
              name: combination.colorName || (colorOption ? getLangValue(colorOption.name) : "") || `Option ${colorOption?.id || combinationId}`,
              hex: colorHex,
            }
          : undefined,
      images,
    };
  });

  if (debugColors) {
    const rawColorCandidates = variants
      .filter((variant) => Boolean(variant.color))
      .map((variant) => ({
        combinationId: variant.combinationId,
        name: variant.color?.name,
        hex: variant.color?.hex,
      }));
    console.debug("[PS colors][raw]", {
      productId,
      productName: name,
      rawColorCandidates,
    });
  }

  const colorsByKey = new Map<
    string,
    {
      combinationId: number;
      name: string;
      hex: string;
      productId: number;
      score: number;
    }
  >();

  for (const variant of variants) {
    if (!variant.color) continue;

    const normalizedName = variant.color.name.trim().toLowerCase();
    const normalizedHex = variant.color.hex.trim().toLowerCase();
    const colorKey = normalizedHex || normalizedName;
    const score =
      (variant.isDefault ? 100 : 0) +
      ((variant.stock || 0) > 0 ? 10 : 0) +
      (variant.price > 0 ? 1 : 0);
    const existing = colorsByKey.get(colorKey);

    if (!existing || score > existing.score) {
      colorsByKey.set(colorKey, {
        combinationId: variant.combinationId,
        name: variant.color.name,
        hex: variant.color.hex,
        productId,
        score,
      });
    }
  }

  const colors = Array.from(colorsByKey.values()).map(({ score: _score, ...color }) => color);

  if (debugColors) {
    console.debug("[PS colors][deduped]", {
      productId,
      productName: name,
      colors,
    });
  }

  const stockFromCombinations = productCombinations.reduce((sum, combination) => {
    const combinationId = Number(combination.id);
    return sum + (stockByAttribute[`${productId}:${combinationId}`] || 0);
  }, 0);
  const fallbackStock = Number(product.quantity || 0);
  const stock = stockFromCombinations > 0 ? stockFromCombinations : fallbackStock;

  const defaultVariant =
    variants.find((variant) => variant.isDefault) ||
    variants.find((variant) => variant.price > 0) ||
    variants[0];
  const productBasePrice = parseNumber(product.price);
  const productOriginalPrice = parseNumber(product.original_price);
  const productPromotionPrice = parseNumber(product.promotion_price);
  const productDiscountPercent = parseNumber(product.discount_percent);
  const productHasPromotion =
    hasPromotionFlag(product.has_promotion) &&
    productOriginalPrice > 0 &&
    productPromotionPrice > 0 &&
    productPromotionPrice < productOriginalPrice &&
    stock > 0;
  const price =
    productBasePrice > 0
      ? productBasePrice
      : defaultVariant?.price && defaultVariant.price > 0
      ? defaultVariant.price
      : 0;

  const characteristics =
    product.associations?.product_features
      ?.map((productFeature) => {
        const featureId = Number(productFeature.id);
        const featureValueId = Number(productFeature.id_feature_value);
        const featureValue = options?.featureValueById?.[featureValueId];
        if (!featureValue) return null;

        const label = stripHtml(options?.featureById?.[featureId] || "").trim();
        const value = stripHtml(getLangValue(featureValue.value)).trim();
        if (!label || !isMeaningfulValue(value)) return null;

        return { label, value };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)) || [];

  // Some catalogs store dimensions/weight as combination option values
  // (not in product width/height/depth/weight). Extract them too.
  const optionIdsFromCombinations = productCombinations.flatMap((combination) =>
    combination.associations?.product_option_values?.map((item) => Number(item.id)) || []
  );
  const optionIdsFromProduct =
    product.associations?.product_option_values?.map((item) => Number(item.id)) || [];
  const optionIds = Array.from(
    new Set([...optionIdsFromCombinations, ...optionIdsFromProduct].filter(Boolean))
  );

  const optionCharacteristics = optionIds
    .map((optionId) => options?.optionValueById?.[optionId])
    .filter(Boolean)
    .map((option) => stripHtml(getLangValue(option!.name)).trim())
    .filter((value) => isMeaningfulValue(value))
    .map((value) => {
      const normalized = value.toLowerCase();
      const isWeight = /poids|weight|\bkg\b/.test(normalized);
      const isDimension =
        /dimension|\bcm\b|\bmm\b|\d+\s*[x]\s*\d+/.test(normalized) &&
        !isLikelySizeText(value);

      if (isWeight) return { label: "Poids", value };
      if (isDimension) return { label: "Dimension", value };
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const allCharacteristics = [...characteristics, ...optionCharacteristics].filter(
    (item, index, source) =>
      source.findIndex(
        (current) =>
          current.label.toLowerCase() === item.label.toLowerCase() &&
          current.value.toLowerCase() === item.value.toLowerCase()
      ) === index
  );

  const width = formatDecimal(product.width);
  const height = formatDecimal(product.height);
  const depth = formatDecimal(product.depth);
  const numericDimensions =
    width && height && depth ? `${width} x ${height} x ${depth} cm` : undefined;
  const numericWeight = formatDecimal(product.weight);

  const characteristicDimensions = allCharacteristics.find((item) =>
    /dimension/i.test(item.label)
  )?.value;
  const characteristicWeight = allCharacteristics.find((item) =>
    /poids|weight/i.test(item.label)
  )?.value;
  const characteristicVolume = allCharacteristics.find((item) =>
    /volume/i.test(item.label)
  )?.value || variants.find((variant) => variant.volume)?.volume;

  const collectionName = getCollectionName(name, slug || "");
  const rawBrandName =
    typeof product.manufacturer_name === "string"
      ? stripHtml(product.manufacturer_name).replace(/\s+/g, " ").trim()
      : "";
  const brandSearchText = `${rawBrandName} ${name} ${shortDesc} ${fullDesc} ${slug}`;
  const brandName = /american\s*tourister/i.test(brandSearchText)
    ? "American Tourister"
    : rawBrandName || "Samsonite";

  return {
    id: productId,
    name,
    brandName,
    collection: collectionName,
    shortDescription: shortDesc,
    description: fullDesc,
    price,
    originalPrice: productHasPromotion ? productOriginalPrice : undefined,
    promotionPrice: productHasPromotion ? productPromotionPrice : undefined,
    discountPercent: productHasPromotion ? productDiscountPercent : undefined,
    hasPromotion: productHasPromotion,
    promotionName: productHasPromotion ? product.promotion_name : undefined,
    images:
      finalImageUrls && finalImageUrls.length > 0
        ? finalImageUrls
        : finalImageIds.map((imageId) => getProductImageUrl(productId, imageId)),
    colors,
    variants,
    characteristics: allCharacteristics,
    dimensions: numericDimensions || characteristicDimensions,
    weight: numericWeight ? `${numericWeight} kg` : characteristicWeight,
    volume: characteristicVolume,
    slug: slug || `product-${productId}`,
    categoryId,
    categorySlug: product.categorySlug || options?.categorySlugById?.[categoryId] || `category-${categoryId}`,
    categoryName: product.categoryName || options?.categoryNameById?.[categoryId],
    parentCategoryId:
      product.parentCategoryId === null || product.parentCategoryId === undefined
        ? undefined
        : Number(product.parentCategoryId),
    parentCategorySlug: product.parentCategorySlug || options?.parentCategorySlugById?.[categoryId],
    parentCategoryName: product.parentCategoryName || options?.parentCategoryNameById?.[categoryId],
    categorySlugs,
    stock,
  };
};
