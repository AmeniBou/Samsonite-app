const API_BASE = "/api";

const getToken = (): string | null => {
    return localStorage.getItem("samsonite_admin_token");
};

const authHeaders = (): HeadersInit => {
    const token = getToken();
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const notifyCatalogUpdated = () => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("samsonite:catalog-updated"));
    }
};
// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface AdminProduct {
    id: number;
    name: string;
    reference: string;
    price: number;
    active: boolean;
    brandId: number;
    brandName: string;
    categoryId: number;
    categoryName: string;
    imageId: number | null;
    imageUrl?: string | null;
    stock: number;
    hasVariants: boolean;
    variantCount?: number;
    description?: string;
    descriptionShort?: string;
    weight?: string;
    width?: string;
    height?: string;
    depth?: string;
    onSale?: boolean;
    onlineOnly?: boolean;
    quantity?: number;
    volume?: string;
    colorName?: string;
    colorHex?: string;
    images?: string[];
    features?: Array<{ label: string; value: string }>;
    variants?: AdminVariant[];
}

export interface AdminVariant {
    colorName?: string;
    colorHex?: string;
    size?: string;
    weight?: string;
    width?: string;
    height?: string;
    depth?: string;
    isExpandable?: boolean;
    expandedWidth?: string;
    expandedHeight?: string;
    expandedDepth?: string;
    volume?: string;
    price?: number;
    stockInitial?: number;
    stock?: number;
    images?: string[];
}

export const fetchAdminProducts = async (): Promise<AdminProduct[]> => {
    const res = await fetch(`${API_BASE}/admin/products`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Erreur chargement produits");
    const data = await res.json();
    return data.products;
};

export const fetchAdminProduct = async (id: number): Promise<AdminProduct> => {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Erreur chargement produit");
    const data = await res.json();
    return data.product;
};

export const createProduct = async (product: {
    name: string;
    description?: string;
    descriptionShort?: string;
    price: number;
    categoryId: number;
    brandId: number;
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
    variants?: AdminVariant[];
}): Promise<{ success: boolean; id?: number; error?: string }> => {
    const res = await fetch(`${API_BASE}/admin/products`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(product),
    });
    const result = await res.json();
    if (result.success) notifyCatalogUpdated();
    return result;
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
        categoryId: number;
        brandId: number;
        weight: string | number;
        width: string | number;
        height: string | number;
        depth: string | number;
        onSale: boolean;
        onlineOnly: boolean;
        quantity: number;
        images: string[];
        features: Array<{ label: string; value: string }>;
        variants: AdminVariant[];
    }>
): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(fields),
    });
    const result = await res.json();
    if (result.success) notifyCatalogUpdated();
    return result;
};

export const uploadAdminImages = async (
    files: File[]
): Promise<{ success: boolean; images?: string[]; error?: string }> => {
    const toBase64 = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });

    const images = await Promise.all(
        files.map(async (file) => ({
            name: file.name,
            type: file.type,
            data: await toBase64(file),
        }))
    );

    const res = await fetch(`${API_BASE}/admin/images`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ images }),
    });
    return res.json();
};

export const deleteProduct = async (id: number): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    const result = await res.json();
    if (result.success) notifyCatalogUpdated();
    return result;
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface AdminCategory {
    id: number;
    name: string;
    slug?: string;
    parentId: number;
    parentName?: string;
    productCount?: number;
    childCount?: number;
    isActive: boolean;
    showInMainMenu: boolean;
}

export interface AdminBrand {
    id: number;
    name: string;
}

export const fetchAdminBrands = async (): Promise<AdminBrand[]> => {
    const res = await fetch(`${API_BASE}/admin/brands`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Erreur chargement marques");
    const data = await res.json();
    return data.brands;
};

export const fetchAdminCategories = async (): Promise<AdminCategory[]> => {
    const res = await fetch(`${API_BASE}/admin/categories`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Erreur chargement catégories");
    const data = await res.json();
    return data.categories;
};

export const fetchAdminCatégories = fetchAdminCategories;

export const createCategory = async (category: {
    name: string;
    slug?: string;
    parentId?: number | null;
    isActive?: boolean;
    showInMainMenu?: boolean;
}): Promise<{ success: boolean; id?: number; error?: string }> => {
    const res = await fetch(`${API_BASE}/admin/categories`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(category),
    });
    const result = await res.json();
    if (result.success) notifyCatalogUpdated();
    return result;
};

export const updateCategory = async (
    id: number,
    fields: Partial<{ name: string; slug: string; parentId: number | null; isActive: boolean; showInMainMenu: boolean }>
): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`${API_BASE}/admin/categories/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(fields),
    });
    const result = await res.json();
    if (result.success) notifyCatalogUpdated();
    return result;
};

export const deleteCategory = async (id: number): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`${API_BASE}/admin/categories/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    const result = await res.json();
    if (result.success) notifyCatalogUpdated();
    return result;
};

// ---------------------------------------------------------------------------
// Data quality
// ---------------------------------------------------------------------------

export type DataQualitySeverity = "critical" | "warning" | "info";
export type DataQualityEntityType = "product" | "variant" | "category" | "brand" | "order" | "contact";

export interface DataQualityIssue {
    id: string;
    severity: DataQualitySeverity;
    entityType: DataQualityEntityType;
    entityId?: number;
    entityName?: string;
    title: string;
    description: string;
    fixUrl?: string;
}

export interface DataQualityReport {
    generatedAt: string;
    summary: {
        products: number;
        variants: number;
        categories: number;
        brands: number;
        orders: number;
        contactMessages: number;
        mainMenuCategories: number;
        criticalIssues: number;
        warningIssues: number;
        infoIssues: number;
    };
    issues: DataQualityIssue[];
}

export const fetchDataQualityReport = async (): Promise<DataQualityReport> => {
    const res = await fetch(`${API_BASE}/admin/data-quality`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Erreur chargement qualite des donnees");
    return res.json();
};
