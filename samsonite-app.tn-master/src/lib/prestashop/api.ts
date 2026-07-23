import { getPrestashopConfig, isPrestashopConfigured } from "./config";
import type {
  PSCategory,
  PSCombination,
  PSFeature,
  PSFeatureValue,
  PSProductOption,
  PSProduct,
  PSProductOptionValue,
  PSStockAvailable,
} from "./types";

const isProxyEnabled = import.meta.env.VITE_PS_PROXY_ENABLED === "true";
const FETCH_TIMEOUT_MS = 12_000;
const FETCH_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const SHOULD_DEBUG_DIMENSION_FETCH = import.meta.env.DEV;
const DIMENSION_DEBUG_RESOURCES = new Set([
  "products",
  "combinations",
  "product_option_values",
  "product_features",
  "product_feature_values",
]);

const summarizePsResponse = (resource: string, data: unknown) => {
  if (!data || typeof data !== "object") return data;
  const record = data as Record<string, unknown>;

  if (resource === "products") {
    const products = Array.isArray(record.products) ? (record.products as unknown[]) : [];
    return {
      total: products.length,
      sample: products.slice(0, 1),
    };
  }

  if (resource === "combinations") {
    const combinations = Array.isArray(record.combinations)
      ? (record.combinations as unknown[])
      : [];
    return {
      total: combinations.length,
      sample: combinations.slice(0, 3),
    };
  }

  if (resource === "product_option_values") {
    const optionValues = Array.isArray(record.product_option_values)
      ? (record.product_option_values as unknown[])
      : [];
    return {
      total: optionValues.length,
      sample: optionValues.slice(0, 5),
    };
  }

  if (resource === "product_features") {
    const features = Array.isArray(record.product_features)
      ? (record.product_features as unknown[])
      : [];
    return {
      total: features.length,
      sample: features.slice(0, 5),
    };
  }

  if (resource === "product_feature_values") {
    const featureValues = Array.isArray(record.product_feature_values)
      ? (record.product_feature_values as unknown[])
      : [];
    return {
      total: featureValues.length,
      sample: featureValues.slice(0, 5),
    };
  }

  return data;
};

const buildProxyUrl = (
  resource: string,
  params?: Record<string, string>
): string => {
  const { apiKey } = getPrestashopConfig();
  const searchParams = new URLSearchParams({
    output_format: "JSON",
    ...(apiKey ? { ws_key: apiKey } : {}),
    ...params,
  });

  return `/prestashop-api/${resource}?${searchParams.toString()}`;
};

const buildDirectUrl = (
  resource: string,
  params?: Record<string, string>
): string => {
  const { apiUrl, apiKey } = getPrestashopConfig();
  const base = `${apiUrl}/api/${resource}`;

  const searchParams = new URLSearchParams({
    output_format: "JSON",
    ws_key: apiKey,
    ...params,
  });

  return `${base}?${searchParams.toString()}`;
};

const parseJsonResponse = async (response: Response): Promise<unknown> => {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    const snippet = raw.slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(`Prestashop reponse non JSON: ${snippet}`);
  }
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const fetchJson = async (url: string): Promise<unknown> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(`Prestashop API error (${response.status} ${response.statusText})`);
  }

  return data;
};

const fetchJsonWithRetry = async (url: string): Promise<unknown> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt += 1) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRIES) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError;
};

const fetchPS = async <T>(
  resource: string,
  params?: Record<string, string>
): Promise<T> => {
  if (isProxyEnabled) {
    const proxyUrl = buildProxyUrl(resource, params);
    if (SHOULD_DEBUG_DIMENSION_FETCH && DIMENSION_DEBUG_RESOURCES.has(resource)) {
      console.debug("[PS API][REQ][proxy]", { resource, url: proxyUrl, params: params || {} });
    }
    try {
      const proxyData = await fetchJsonWithRetry(proxyUrl);
      if (SHOULD_DEBUG_DIMENSION_FETCH && DIMENSION_DEBUG_RESOURCES.has(resource)) {
        console.debug("[PS API][RES][proxy]", {
          resource,
          url: proxyUrl,
          data: summarizePsResponse(resource, proxyData),
        });
      }
      return proxyData as T;
    } catch (proxyError) {
      console.error("Proxy Prestashop indisponible", proxyError);
      throw new Error(
        "Proxy Prestashop indisponible. Verifiez VITE_PS_PROXY_ENABLED, VITE_PS_API_URL et VITE_PS_API_KEY."
      );
    }
  }

  if (!isPrestashopConfigured()) {
    throw new Error("Prestashop non configure");
  }

  const directUrl = buildDirectUrl(resource, params);
  if (SHOULD_DEBUG_DIMENSION_FETCH && DIMENSION_DEBUG_RESOURCES.has(resource)) {
    console.debug("[PS API][REQ][direct]", { resource, url: directUrl, params: params || {} });
  }
  const directData = await fetchJsonWithRetry(directUrl);
  if (SHOULD_DEBUG_DIMENSION_FETCH && DIMENSION_DEBUG_RESOURCES.has(resource)) {
    console.debug("[PS API][RES][direct]", {
      resource,
      url: directUrl,
      data: summarizePsResponse(resource, directData),
    });
  }
  return directData as T;
};

export interface PSCatalogData {
  products: PSProduct[];
  categories: PSCategory[];
  combinations: PSCombination[];
  productOptions: PSProductOption[];
  productOptionValues: PSProductOptionValue[];
  stockAvailables: PSStockAvailable[];
  features: PSFeature[];
  featureValues: PSFeatureValue[];
}

const CATALOG_CACHE_TTL_MS = 60_000;
let catalogCache:
  | {
      data: PSCatalogData;
      createdAt: number;
    }
  | null = null;
let catalogInFlightPromise: Promise<PSCatalogData> | null = null;

export const clearCatalogCache = () => {
  catalogCache = null;
  catalogInFlightPromise = null;
};

if (typeof window !== "undefined") {
  window.addEventListener("samsonite:catalog-updated", clearCatalogCache);
}

const fetchAppCatalog = async (): Promise<PSCatalogData> => {
  const response = await fetch("/api/catalog", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Backend catalog error (${response.status})`);
  }
  return (await parseJsonResponse(response)) as PSCatalogData;
};

export const getCatalogData = async (): Promise<PSCatalogData> => {
  if (catalogCache && Date.now() - catalogCache.createdAt < CATALOG_CACHE_TTL_MS) {
    return catalogCache.data;
  }

  if (catalogInFlightPromise) {
    return catalogInFlightPromise;
  }

  catalogInFlightPromise = (async () => {
    const data = await fetchAppCatalog();
    catalogCache = {
      data,
      createdAt: Date.now(),
    };
    return data;
  })();

  try {
    return await catalogInFlightPromise;
  } finally {
    catalogInFlightPromise = null;
  }
};

export const getProduct = async (id: number): Promise<PSProduct> => {
  const data = await getCatalogData();
  const product = data.products.find((item) => Number(item.id) === id);

  if (!product) {
    throw new Error(`Produit introuvable (${id})`);
  }

  return product;
};

export const getProducts = async (): Promise<PSProduct[]> => {
  const data = await getCatalogData();
  return data.products;
};

export const getProductBySlug = async (
  slug: string
): Promise<PSProduct | null> => {
  const normalizedSlug = slug.trim().toLowerCase();
  const data = await getCatalogData();

  return (
    data.products.find((product) =>
      product.link_rewrite?.some(
        (entry) => entry.value?.trim().toLowerCase() === normalizedSlug
      )
    ) || null
  );
};

export const getCategories = async (): Promise<PSCategory[]> => {
  const data = await getCatalogData();
  return data.categories;
};

export const getCombinations = async (): Promise<PSCombination[]> => {
  const data = await getCatalogData();
  return data.combinations;
};

export const getProductOptionValues = async (): Promise<PSProductOptionValue[]> => {
  const data = await getCatalogData();
  return data.productOptionValues;
};

export const getStockAvailables = async (): Promise<PSStockAvailable[]> => {
  const data = await getCatalogData();
  return data.stockAvailables;
};

export const getProductImageUrl = (productId: number, imageId: number) => {
  // We prefer using the `associations.images[].imageUrl` provided by `/api/catalog`.
  // Return an empty string here to avoid constructing any proxy or PrestaShop URLs.
  // This ensures the UI falls back to the local DB-provided image URLs only.
  return "";
};

export const getCategoryImageUrl = (_categoryId: number) => {
  // Always return empty: categories should use the backend `/api/catalog` payload
  // or show the placeholder. Do not construct PrestaShop URLs.
  return "";
};
