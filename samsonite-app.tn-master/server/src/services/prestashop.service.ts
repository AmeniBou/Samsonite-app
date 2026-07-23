import { config } from "../config.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PS_TIMEOUT_MS = 45_000;

const psUrl = (resource: string, params?: Record<string, string>): string => {
    const searchParams = new URLSearchParams({
        output_format: "JSON",
        ws_key: config.ps.apiKey,
        ...params,
    });
    return `${config.ps.apiUrl}/api/${resource}?${searchParams.toString()}`;
};

const psHeaders = (): Record<string, string> => {
    const encoded = Buffer.from(`${config.ps.apiKey}:`).toString("base64");
    return {
        Authorization: `Basic ${encoded}`,
    };
};

const fetchJson = async (url: string): Promise<unknown> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PS_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: psHeaders(),
        });
        const text = await res.text();
        if (!res.ok) {
            throw new Error(`PrestaShop ${res.status}: ${text.slice(0, 300)}`);
        }
        return text ? JSON.parse(text) : null;
    } finally {
        clearTimeout(timeout);
    }
};

// ---------------------------------------------------------------------------
// READ — Catalogue (JSON)
// ---------------------------------------------------------------------------

export interface PSProductRaw {
    id: number | string;
    name: { id: string; value: string }[];
    description?: { id: string; value: string }[];
    description_short?: { id: string; value: string }[];
    link_rewrite?: { id: string; value: string }[];
    price: string;
    reference: string;
    active: string;
    id_category_default: number | string;
    id_default_image?: number | string;
    id_manufacturer?: number | string;
    manufacturer_name?: string;
    weight: string;
    width: string;
    height: string;
    depth: string;
    volume?: string;
    on_sale: string;
    online_only: string;
    quantity?: number | string;
    associations?: Record<string, unknown>;
}

export interface PSCategoryRaw {
    id: number | string;
    id_parent: number | string;
    name: { id: string; value: string }[];
    description?: { id: string; value: string }[];
    link_rewrite?: { id: string; value: string }[];
    active: string;
}

const extractCollection = <T>(data: unknown, pluralKey: string, singularKey: string): T[] => {
    const root = (data as Record<string, unknown> | null)?.[pluralKey];

    if (Array.isArray(root)) return root as T[];

    if (root && typeof root === "object") {
        const nested = (root as Record<string, unknown>)[singularKey];
        if (Array.isArray(nested)) return nested as T[];
    }

    return [];
};

export const getProducts = async (): Promise<PSProductRaw[]> => {
    // Keep payload smaller than "full" to reduce timeouts on large catalogs.
    const data = await fetchJson(
        psUrl("products", {
            display:
                "[id,name,description,description_short,price,reference,active,id_category_default,id_default_image,id_manufacturer,manufacturer_name,weight,quantity]",
        })
    );
    return extractCollection<PSProductRaw>(data, "products", "product");
};

export const getProduct = async (id: number): Promise<PSProductRaw | null> => {
    try {
        const data = (await fetchJson(psUrl(`products/${id}`, { display: "full" }))) as {
            product?: PSProductRaw;
        };
        return data?.product || null;
    } catch {
        return null;
    }
};

export const getCategories = async (): Promise<PSCategoryRaw[]> => {
    const data = await fetchJson(psUrl("categories", { display: "full" }));
    return extractCollection<PSCategoryRaw>(data, "categories", "category");
};

export const getCombinations = async () => {
    const data = await fetchJson(psUrl("combinations", { display: "full" }));
    return extractCollection<unknown>(data, "combinations", "combination");
};

export const getProductOptions = async () => {
    const data = await fetchJson(psUrl("product_options", { display: "full" }));
    return extractCollection<unknown>(data, "product_options", "product_option");
};

export const getProductOptionValues = async () => {
    const data = await fetchJson(psUrl("product_option_values", { display: "full" }));
    return extractCollection<unknown>(data, "product_option_values", "product_option_value");
};

export const getStockAvailables = async () => {
    const data = await fetchJson(psUrl("stock_availables", { display: "full" }));
    return extractCollection<unknown>(data, "stock_availables", "stock_available");
};

export const getFeatures = async () => {
    const data = await fetchJson(psUrl("product_features", { display: "full" }));
    return extractCollection<unknown>(data, "product_features", "product_feature");
};

export const getFeatureValues = async () => {
    const data = await fetchJson(psUrl("product_feature_values", { display: "full" }));
    return extractCollection<unknown>(data, "product_feature_values", "product_feature_value");
};

/** Full catalog fetch — mirrors what the existing frontend does */
export const getFullCatalog = async () => {
    const [
        products,
        categories,
        combinations,
        productOptions,
        productOptionValues,
        stockAvailables,
        features,
        featureValues,
    ] = await Promise.allSettled([
        getProducts(),
        getCategories(),
        getCombinations(),
        getProductOptions(),
        getProductOptionValues(),
        getStockAvailables(),
        getFeatures(),
        getFeatureValues(),
    ]);

    return {
        products: products.status === "fulfilled" ? products.value : [],
        categories: categories.status === "fulfilled" ? categories.value : [],
        combinations: combinations.status === "fulfilled" ? combinations.value : [],
        productOptions: productOptions.status === "fulfilled" ? productOptions.value : [],
        productOptionValues: productOptionValues.status === "fulfilled" ? productOptionValues.value : [],
        stockAvailables: stockAvailables.status === "fulfilled" ? stockAvailables.value : [],
        features: features.status === "fulfilled" ? features.value : [],
        featureValues: featureValues.status === "fulfilled" ? featureValues.value : [],
    };
};

// ---------------------------------------------------------------------------
// Admin Enriched Data (Mapped)
// ---------------------------------------------------------------------------

const getLangValue = (field?: { id: string; value: string }[], langId = "2"): string => {
    if (!field) return "";
    const match = field.find((f) => f.id === langId) || field.find((f) => f.id === "2");
    return (match?.value || field[0]?.value || "").trim();
};

export const getMappedAdminProducts = async () => {
    // Products are mandatory for admin listing. If this fails, surface an error upstream.
    const products = await getProducts();

    // Secondary resources are optional; when unavailable, we still return product rows.
    const [categories, combinations, stockAvailables, features, featureValues, productOptions, productOptionValues] = await Promise.all([
        getCategories().catch(() => [] as PSCategoryRaw[]),
        getCombinations().catch(() => [] as unknown[]),
        getStockAvailables().catch(() => [] as unknown[]),
        getFeatures().catch(() => [] as unknown[]),
        getFeatureValues().catch(() => [] as unknown[]),
        getProductOptions().catch(() => [] as unknown[]),
        getProductOptionValues().catch(() => [] as unknown[]),
    ]);

    const categoryNameById: Record<number, string> = {};
    for (const cat of categories) {
        categoryNameById[Number(cat.id)] = getLangValue(cat.name);
    }

    const stockByAttribute = (stockAvailables as any[]).reduce((acc, stock) => {
        acc[`${stock.id_product}:${stock.id_product_attribute}`] = Number(stock.quantity || 0);
        return acc;
    }, {} as Record<string, number>);

    const combinationsByProduct = (combinations as any[]).reduce((acc, comb) => {
        const pid = Number(comb.id_product);
        if (!acc[pid]) acc[pid] = [];
        acc[pid].push(comb);
        return acc;
    }, {} as Record<number, any[]>);

    const optionValueById: Record<number, any> = {};
    for (const val of productOptionValues as any[]) {
        optionValueById[Number(val.id)] = val;
    }
    const optionGroupNameById: Record<number, string> = {};
    for (const opt of productOptions as any[]) {
        optionGroupNameById[Number(opt.id)] = getLangValue(opt.public_name || opt.name);
    }

    const normalizeHex = (value: string): string | null => {
        const raw = (value || "").trim();
        if (!raw) return null;
        if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
        if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
        return null;
    };
    const stripHtml = (value: string) =>
        (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const isLikelySizeText = (value: string) =>
        /^(xxs|xs|s|m|l|xl|xxl|xxxl)$/i.test(value.trim()) ||
        /^\d{2,3}\s*(cm|")$/i.test(value.trim()) ||
        /^size\s*[:-]?\s*.+$/i.test(value.trim()) ||
        /^taille\s*[:-]?\s*.+$/i.test(value.trim());

    return products.map((p) => {
        const productId = Number(p.id);
        const productCombinations = combinationsByProduct[productId] || [];

        // Stock logic: Sum of combinations or product quantity
        let totalStock = 0;
        if (productCombinations.length > 0) {
            totalStock = productCombinations.reduce((sum: number, comb: any) =>
                sum + (stockByAttribute[`${productId}:${comb.id}`] || 0), 0);
        } else {
            totalStock = Number(p.quantity || 0);
        }

        // Price logic: Product price or first combination price
        const productBasePrice = parseFloat(p.price) || 0;
        let finalPrice = productBasePrice;
        if (finalPrice <= 0 && productCombinations.length > 0) {
            const defaultComb = productCombinations.find((c: any) => c.default_on === "1") || productCombinations[0];
            finalPrice = parseFloat(defaultComb.price) || 0;
        }

        const variants = productCombinations.map((comb: any) => {
            const combinationId = Number(comb.id);
            const optionIds =
                comb.associations?.product_option_values?.map((item: any) => Number(item.id)) || [];
            const optionEntries = optionIds
                .map((optionId: number) => optionValueById[optionId])
                .filter((option: unknown): option is any => Boolean(option))
                .map((option: any) => ({
                    groupId: Number(option.id_attribute_group || 0),
                    groupName: optionGroupNameById[Number(option.id_attribute_group || 0)] || "",
                    name: stripHtml(getLangValue(option.name)).trim(),
                    color: option.color,
                }))
                .filter(
                    (entry: unknown): entry is { name: string; color?: string; groupName: string } =>
                        Boolean((entry as { name?: string }).name),
                );

            const colorOption = optionEntries.find((entry: { name: string; color?: string; groupName: string }) =>
                normalizeHex(entry.color || ""),
            );
            const sizeOption = optionEntries.find(
                (entry: { name: string; color?: string; groupName: string }) =>
                    isLikelySizeText(entry.name) || /taille/i.test(entry.groupName),
            );

            const colorHex = colorOption?.color ? normalizeHex(colorOption.color) : null;
            const variantImageIds =
                comb.associations?.images?.map((image: any) => Number(image.id)).filter(Boolean) || [];
            const images = (variantImageIds.length > 0 ? variantImageIds : []).map((imageId: number) =>
                getProductImageUrl(productId, imageId)
            );

            return {
                colorName: colorOption ? colorOption.name : undefined,
                colorHex: colorHex || undefined,
                size: sizeOption ? sizeOption.name : undefined,
                price: comb.price ? parseFloat(comb.price) : undefined,
                stock: stockByAttribute[`${productId}:${combinationId}`] || 0,
                images,
            };
        });

        const firstColorVariant = variants.find((v: { colorName?: string; colorHex?: string }) => v.colorName || v.colorHex);

        return {
            id: productId,
            name: getLangValue(p.name),
            reference: p.reference || "",
            price: finalPrice,
            active: p.active === "1",
            categoryId: Number(p.id_category_default),
            categoryName: categoryNameById[Number(p.id_category_default)] || "-",
            imageId: p.id_default_image ? Number(p.id_default_image) : null,
            stock: totalStock,
            quantity: totalStock,
            hasVariants: productCombinations.length > 0,
            description: getLangValue(p.description),
            descriptionShort: getLangValue(p.description_short),
            weight: p.weight || "",
            width: p.width || "",
            height: p.height || "",
            depth: p.depth || "",
            onSale: p.on_sale === "1",
            onlineOnly: p.online_only === "1",
            images:
                (p.associations?.images as any[] | undefined)
                    ?.map((img: any) => Number(img.id))
                    .filter(Boolean)
                    .map((id) => getProductImageUrl(productId, id)) || [],
            features:
                (p.associations?.product_features as any[] | undefined)?.map((f: any) => {
                    const featureId = Number(f.id);
                    const featureValueId = Number(f.id_feature_value);
                    const label = getLangValue((features as any[]).find((fe) => Number(fe.id) === featureId)?.name);
                    const value = getLangValue(
                        (featureValues as any[]).find((fv) => Number(fv.id) === featureValueId)?.value
                    );
                    return { label, value };
                }) || [],
            variants,
            colorName: firstColorVariant?.colorName,
            colorHex: firstColorVariant?.colorHex,
        };
    });
};

export const getMappedAdminProduct = async (id: number) => {
    const products = await getMappedAdminProducts();
    return products.find(p => p.id === id) || null;
};

// ---------------------------------------------------------------------------
// Image proxy
// ---------------------------------------------------------------------------

export const getProductImageUrl = (productId: number, imageId: number): string => {
    return `${config.ps.apiUrl}/api/images/products/${productId}/${imageId}?ws_key=${config.ps.apiKey}`;
};

export const getCategoryImageUrl = (categoryId: number): string => {
    return `${config.ps.apiUrl}/api/images/categories/${categoryId}?ws_key=${config.ps.apiKey}`;
};

export const proxyImage = async (imagePath: string): Promise<{ buffer: Buffer; contentType: string } | null> => {
    const url = `${config.ps.apiUrl}/api/images/${imagePath}?ws_key=${config.ps.apiKey}`;
    try {
        const res = await fetch(url, { headers: psHeaders() });
        if (!res.ok) return null;
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return { buffer, contentType };
    } catch {
        return null;
    }
};

// ---------------------------------------------------------------------------
// WRITE — Products (XML, PrestaShop webservice format)
// ---------------------------------------------------------------------------

const formatDecimal = (value?: string | number): string => {
    if (value === undefined || value === null || value === "") return "0";
    const num = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
    if (!Number.isFinite(num)) return "0";
    return num % 1 === 0 ? num.toString() : num.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
};

const buildProductXml = (fields: {
    name: string;
    description?: string;
    descriptionShort?: string;
    price: number;
    categoryId: number;
    active?: boolean;
    reference?: string;
    weight?: string | number;
    width?: string | number;
    height?: string | number;
    depth?: string | number;
    onSale?: boolean;
    onlineOnly?: boolean;
    features?: Array<{ featureId: number; featureValueId: number }>;
}): string => {
    const esc = (s: string | number) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cdata = (s: string) => `<![CDATA[${s}]]>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id_category_default>${fields.categoryId}</id_category_default>
    <active>${fields.active !== false ? 1 : 0}</active>
    <price>${fields.price.toFixed(6)}</price>
    <reference>${esc(fields.reference || "")}</reference>
    <weight>${formatDecimal(fields.weight)}</weight>
    <width>${formatDecimal(fields.width)}</width>
    <height>${formatDecimal(fields.height)}</height>
    <depth>${formatDecimal(fields.depth)}</depth>
    <on_sale>${fields.onSale ? 1 : 0}</on_sale>
    <online_only>${fields.onlineOnly ? 1 : 0}</online_only>
    <name>
      <language id="1">${cdata(fields.name)}</language>
    </name>
    <description>
      <language id="1">${cdata(fields.description || "")}</language>
    </description>
    <description_short>
      <language id="1">${cdata(fields.descriptionShort || fields.description?.slice(0, 200) || "")}</language>
    </description_short>
    <link_rewrite>
      <language id="1">${esc(fields.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))}</language>
    </link_rewrite>
    <associations>
      <categories>
        <category><id>${fields.categoryId}</id></category>
      </categories>
      ${fields.features && fields.features.length > 0 ? `<product_features>
        ${fields.features
            .map(
                (f) => `<product_feature>
          <id_feature>${f.featureId}</id_feature>
          <id_feature_value>${f.featureValueId}</id_feature_value>
        </product_feature>`
            )
            .join("\n")}
      </product_features>` : ""}
    </associations>
  </product>
</prestashop>`;
};

export const createProduct = async (fields: {
    name: string;
    description?: string;
    descriptionShort?: string;
    price: number;
    categoryId: number;
    active?: boolean;
    reference?: string;
    weight?: string | number;
    width?: string | number;
    height?: string | number;
    depth?: string | number;
    onSale?: boolean;
    onlineOnly?: boolean;
    quantity?: number;
    images?: string[];
    features?: Array<{ label: string; value: string }>;
}): Promise<{ success: boolean; id?: number; error?: string }> => {
    // Prepare features (ensure they exist)
    const mappedFeatures = await ensureFeatures(fields.features || []);
    const xml = buildProductXml({ ...fields, features: mappedFeatures });
    const url = `${config.ps.apiUrl}/api/products?ws_key=${config.ps.apiKey}`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                ...psHeaders(),
                "Content-Type": "application/xml",
            },
            body: xml,
        });

        const text = await res.text();
        if (!res.ok) {
            return { success: false, error: `PrestaShop ${res.status}: ${text.slice(0, 500)}` };
        }

        // Try to extract the new product ID from the response XML
        const idMatch = text.match(/<id>(?:<!\[CDATA\[)?(\d+)(?:\]\]>)?<\/id>/);
        const id = idMatch ? parseInt(idMatch[1], 10) : undefined;

        // Stock
        if (id && fields.quantity !== undefined) {
            await upsertStock(id, 0, fields.quantity).catch(() => {});
        }

        // Images
        if (id && fields.images?.length) {
            for (const imageUrl of fields.images) {
                await uploadProductImage(id, imageUrl).catch(() => {});
            }
        }

        return { success: true, id };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
};

export const deleteProduct = async (id: number): Promise<{ success: boolean; error?: string }> => {
    const url = `${config.ps.apiUrl}/api/products/${id}?ws_key=${config.ps.apiKey}`;

    try {
        const res = await fetch(url, {
            method: "DELETE",
            headers: psHeaders(),
        });

        if (!res.ok) {
            const text = await res.text();
            return { success: false, error: `PrestaShop ${res.status}: ${text.slice(0, 500)}` };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
};

export const updateProduct = async (
    id: number,
    fields: Partial<{
        name: string;
        description: string;
        descriptionShort: string;
        price: number;
        active: boolean;
        reference: string;
        weight: string | number;
        width: string | number;
        height: string | number;
        depth: string | number;
        onSale: boolean;
        onlineOnly: boolean;
        quantity: number;
        images: string[];
        features: Array<{ label: string; value: string }>;
    }>
): Promise<{ success: boolean; error?: string }> => {
    // First, fetch the current product XML so we can modify only what's needed
    const getUrl = `${config.ps.apiUrl}/api/products/${id}?ws_key=${config.ps.apiKey}`;

    try {
        const getRes = await fetch(getUrl, { headers: psHeaders() });
        if (!getRes.ok) {
            return { success: false, error: `Produit ${id} introuvable` };
        }

        let xml = await getRes.text();

        // Remove read-only nodes that PrestaShop rejects on PUT
        const readOnlyTags = [
            "id_default_image",
            "id_default_combination",
            "position_in_category",
            "manufacturer_name",
            "quantity",
            "type",
            "date_add",
            "date_upd",
        ];
        for (const tag of readOnlyTags) {
            xml = xml.replace(new RegExp(`<${tag}>.*?</${tag}>`, "gs"), "");
            xml = xml.replace(new RegExp(`<${tag}\\s*/>`, "g"), "");
        }

        // Apply changes
        const mappedFeatures = fields.features ? await ensureFeatures(fields.features) : undefined;

        if (fields.name !== undefined) {
            xml = xml.replace(
                /<name>[\s\S]*?<\/name>/,
                `<name><language id="1"><![CDATA[${fields.name}]]></language></name>`
            );
        }
        if (fields.description !== undefined) {
            xml = xml.replace(
                /<description>[\s\S]*?<\/description>/,
                `<description><language id="1"><![CDATA[${fields.description}]]></language></description>`
            );
        }
        if (fields.price !== undefined) {
            xml = xml.replace(/<price>[\s\S]*?<\/price>/, `<price>${fields.price.toFixed(6)}</price>`);
        }
        if (fields.active !== undefined) {
            xml = xml.replace(/<active>[\s\S]*?<\/active>/, `<active>${fields.active ? 1 : 0}</active>`);
        }
        if (fields.reference !== undefined) {
            xml = xml.replace(/<reference>[\s\S]*?<\/reference>/, `<reference>${fields.reference}</reference>`);
        }
        if (fields.weight !== undefined) {
            xml = xml.replace(/<weight>[\s\S]*?<\/weight>/, `<weight>${formatDecimal(fields.weight)}</weight>`);
        }
        if (fields.width !== undefined) {
            xml = xml.replace(/<width>[\s\S]*?<\/width>/, `<width>${formatDecimal(fields.width)}</width>`);
        }
        if (fields.height !== undefined) {
            xml = xml.replace(/<height>[\s\S]*?<\/height>/, `<height>${formatDecimal(fields.height)}</height>`);
        }
        if (fields.depth !== undefined) {
            xml = xml.replace(/<depth>[\s\S]*?<\/depth>/, `<depth>${formatDecimal(fields.depth)}</depth>`);
        }
        if (fields.onSale !== undefined) {
            xml = xml.replace(/<on_sale>[\s\S]*?<\/on_sale>/, `<on_sale>${fields.onSale ? 1 : 0}</on_sale>`);
        }
        if (fields.onlineOnly !== undefined) {
            xml = xml.replace(
                /<online_only>[\s\S]*?<\/online_only>/,
                `<online_only>${fields.onlineOnly ? 1 : 0}</online_only>`
            );
        }
        if (mappedFeatures !== undefined) {
            const featuresXml = mappedFeatures
                .map(
                    (f) => `<product_feature>
          <id_feature>${f.featureId}</id_feature>
          <id_feature_value>${f.featureValueId}</id_feature_value>
        </product_feature>`
                )
                .join("");
            if (/<product_features>[\s\S]*?<\/product_features>/.test(xml)) {
                xml = xml.replace(
                    /<product_features>[\s\S]*?<\/product_features>/,
                    `<product_features>${featuresXml}</product_features>`
                );
            } else {
                xml = xml.replace(
                    /<\/associations>/,
                    `<product_features>${featuresXml}</product_features></associations>`
                );
            }
        }

        const putUrl = `${config.ps.apiUrl}/api/products/${id}?ws_key=${config.ps.apiKey}`;
        const putRes = await fetch(putUrl, {
            method: "PUT",
            headers: {
                ...psHeaders(),
                "Content-Type": "application/xml",
            },
            body: xml,
        });

        if (!putRes.ok) {
            const text = await putRes.text();
            return { success: false, error: `PrestaShop PUT ${putRes.status}: ${text.slice(0, 500)}` };
        }

        if (fields.quantity !== undefined) {
            await upsertStock(id, 0, fields.quantity).catch(() => {});
        }

        if (fields.images?.length) {
            for (const imageUrl of fields.images) {
                await uploadProductImage(id, imageUrl).catch(() => {});
            }
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
};

// ---------------------------------------------------------------------------
// Update stock
// ---------------------------------------------------------------------------

export const updateStock = async (
    stockId: number,
    quantity: number
): Promise<{ success: boolean; error?: string }> => {
    const getUrl = `${config.ps.apiUrl}/api/stock_availables/${stockId}?ws_key=${config.ps.apiKey}`;

    try {
        const getRes = await fetch(getUrl, { headers: psHeaders() });
        if (!getRes.ok) return { success: false, error: `Stock ${stockId} introuvable` };

        let xml = await getRes.text();
        xml = xml.replace(/<quantity>[\s\S]*?<\/quantity>/, `<quantity>${quantity}</quantity>`);

        const putRes = await fetch(getUrl, {
            method: "PUT",
            headers: { ...psHeaders(), "Content-Type": "application/xml" },
            body: xml,
        });

        if (!putRes.ok) {
            const text = await putRes.text();
            return { success: false, error: `PrestaShop PUT ${putRes.status}: ${text.slice(0, 300)}` };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
};

// ---------------------------------------------------------------------------
// Create/Update stock for a product (default attribute)
// ---------------------------------------------------------------------------

const upsertStock = async (productId: number, productAttributeId: number, quantity: number) => {
    const url = `${config.ps.apiUrl}/api/stock_availables?ws_key=${config.ps.apiKey}`;
    const esc = (s: string | number) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id_product>${productId}</id_product>
    <id_product_attribute>${productAttributeId}</id_product_attribute>
    <quantity>${esc(quantity)}</quantity>
    <out_of_stock>2</out_of_stock>
  </stock_available>
</prestashop>`;

    const res = await fetch(url, {
        method: "POST",
        headers: { ...psHeaders(), "Content-Type": "application/xml" },
        body: xml,
    });

    if (res.ok) return true;

    // Fallback: try update existing via PUT when POST fails because it exists
    const stockList = await fetchJson(psUrl("stock_availables", {
        filter_id_product: `[${productId}]`,
        filter_id_product_attribute: `[${productAttributeId}]`,
        display: "[id]"
    })) as any;
    const stockArray = stockList?.stock_availables?.stock_available;
    const existingId = Array.isArray(stockArray) ? stockArray[0]?.id : stockArray?.id;
    if (!existingId) return false;

    const putUrl = `${config.ps.apiUrl}/api/stock_availables/${existingId}?ws_key=${config.ps.apiKey}`;
    const currentRes = await fetch(putUrl, { headers: psHeaders() });
    if (!currentRes.ok) return false;
    let currentXml = await currentRes.text();
    currentXml = currentXml.replace(/<quantity>[\s\S]*?<\/quantity>/, `<quantity>${esc(quantity)}</quantity>`);
    const putRes = await fetch(putUrl, {
        method: "PUT",
        headers: { ...psHeaders(), "Content-Type": "application/xml" },
        body: currentXml,
    });
    return putRes.ok;
};

// ---------------------------------------------------------------------------
// Feature helpers
// ---------------------------------------------------------------------------

const findFeatureByName = (features: any[], name: string) => {
    const normalized = name.trim().toLowerCase();
    return features.find((f) => getLangValue(f.name).trim().toLowerCase() === normalized);
};

const findFeatureValue = (values: any[], featureId: number, value: string) => {
    const normalized = value.trim().toLowerCase();
    return values.find(
        (v) => Number(v.id_feature) === featureId && getLangValue(v.value).trim().toLowerCase() === normalized
    );
};

const createFeature = async (name: string): Promise<number | null> => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product_feature>
    <name><language id="1"><![CDATA[${name}]]></language></name>
  </product_feature>
</prestashop>`;
    const url = `${config.ps.apiUrl}/api/product_features?ws_key=${config.ps.apiKey}`;
    const res = await fetch(url, { method: "POST", headers: { ...psHeaders(), "Content-Type": "application/xml" }, body: xml });
    const text = await res.text();
    if (!res.ok) return null;
    const idMatch = text.match(/<id>(\d+)<\/id>/);
    return idMatch ? Number(idMatch[1]) : null;
};

const createFeatureValue = async (featureId: number, value: string): Promise<number | null> => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product_feature_value>
    <id_feature>${featureId}</id_feature>
    <value><language id="1"><![CDATA[${value}]]></language></value>
  </product_feature_value>
</prestashop>`;
    const url = `${config.ps.apiUrl}/api/product_feature_values?ws_key=${config.ps.apiKey}`;
    const res = await fetch(url, { method: "POST", headers: { ...psHeaders(), "Content-Type": "application/xml" }, body: xml });
    const text = await res.text();
    if (!res.ok) return null;
    const idMatch = text.match(/<id>(\d+)<\/id>/);
    return idMatch ? Number(idMatch[1]) : null;
};

const ensureFeatures = async (entries: Array<{ label: string; value: string }>) => {
    if (!entries?.length) return [];
    const [features, featureValues] = await Promise.all([getFeatures(), getFeatureValues()]);
    const result: Array<{ featureId: number; featureValueId: number }> = [];

    for (const entry of entries) {
        const label = entry.label.trim();
        const value = entry.value.trim();
        if (!label || !value) continue;

        let feature = findFeatureByName(features as any[], label);
        let featureId = feature ? Number((feature as any).id) : await createFeature(label);
        if (!featureId) continue;

        let featureValue = findFeatureValue(featureValues as any[], featureId, value);
        let featureValueId = featureValue ? Number((featureValue as any).id) : await createFeatureValue(featureId, value);
        if (!featureValueId) continue;

        result.push({ featureId, featureValueId });
    }
    return result;
};

// ---------------------------------------------------------------------------
// Images upload
// ---------------------------------------------------------------------------

const uploadProductImage = async (productId: number, imageUrl: string) => {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("download image failed");
    const buffer = Buffer.from(await response.arrayBuffer());
    const form = new FormData();
    form.append("image", new Blob([buffer]), "image.jpg");
    const url = `${config.ps.apiUrl}/api/images/products/${productId}?ws_key=${config.ps.apiKey}`;
    const res = await fetch(url, { method: "POST", headers: psHeaders() as any, body: form as any });
    if (!res.ok) throw new Error(`upload failed ${res.status}`);
};
