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

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface AdminProduct {
    id: number;
    name: string;
    reference: string;
    price: number;
    active: boolean;
    categoryId: number;
    categoryName: string;
    imageId: number | null;
    stock: number;
    hasVariants: boolean;
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
    price?: number;
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
    return res.json();
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
    return res.json();
};

export const deleteProduct = async (id: number): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    return res.json();
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface AdminCategory {
    id: number;
    name: string;
    parentId: number;
}

export const fetchAdminCategories = async (): Promise<AdminCategory[]> => {
    const res = await fetch(`${API_BASE}/admin/categories`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Erreur chargement catégories");
    const data = await res.json();
    return data.categories;
};
