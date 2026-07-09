import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
    getMappedAdminProducts,
    getMappedAdminProduct,
    getCategories,
    createProduct,
    updateProduct,
    deleteProduct,
} from "../services/catalog.service.js";
import { invalidateCatalogCache } from "./catalog.routes.js";

const router = Router();

// All routes here require authentication
router.use(requireAuth);

// ---------------------------------------------------------------------------
// GET /api/admin/products — list all products (for admin table)
// ---------------------------------------------------------------------------

const getLangValue = (field?: { id: string; value: string }[], langId = "2"): string => {
    if (!field) return "";
    // Prioritize requested langId, fallback to French (2), then first available
    const match = field.find((f) => f.id === langId) || field.find((f) => f.id === "2");
    return (match?.value || field[0]?.value || "").trim();
};

router.get("/products", async (_req: Request, res: Response): Promise<void> => {
    try {
        const simplified = await getMappedAdminProducts();
        res.json({ products: simplified, total: simplified.length });
    } catch (err) {
        console.error("Erreur liste produits admin:", err);
        const detail = err instanceof Error ? err.message : "Erreur inconnue";
        res.status(502).json({ error: "Impossible de charger les produits", detail });
    }
});

// ---------------------------------------------------------------------------
// GET /api/admin/products/:id — get single product details
// ---------------------------------------------------------------------------

router.get("/products/:id", async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID produit invalide" });
        return;
    }

    try {
        const product = await getMappedAdminProduct(id);
        if (!product) {
            res.status(404).json({ error: "Produit introuvable" });
            return;
        }
        res.json({ product });
    } catch (err) {
        console.error("Erreur produit admin:", err);
        const detail = err instanceof Error ? err.message : "Erreur inconnue";
        res.status(502).json({ error: "Impossible de charger le produit", detail });
    }
});

// ---------------------------------------------------------------------------
// GET /api/admin/categories — list categories (for product form dropdown)
// ---------------------------------------------------------------------------

router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
    try {
        const categories = await getCategories();
        const simplified = categories
            .filter((c) => c.active === "1")
            .map((c) => ({
                id: Number(c.id),
                name: getLangValue(c.name),
                parentId: Number(c.id_parent),
            }));

        res.json({ categories: simplified });
    } catch (err) {
        console.error("Erreur catégories admin:", err);
        const detail = err instanceof Error ? err.message : "Erreur inconnue";
        res.status(502).json({ error: "Impossible de charger les categories", detail });
    }
});

// ---------------------------------------------------------------------------
// POST /api/admin/products — create a new product
// ---------------------------------------------------------------------------

router.post("/products", async (req: Request, res: Response): Promise<void> => {
    const {
        name,
        description,
        descriptionShort,
        price,
        categoryId,
        active,
        reference,
        weight,
        width,
        height,
        depth,
        onSale,
        onlineOnly,
        quantity,
        images,
        features,
        // variants not yet handled
    } = req.body as {
        name?: string;
        description?: string;
        descriptionShort?: string;
        price?: number | string;
        categoryId?: number;
        active?: boolean;
        reference?: string;
        weight?: string | number;
        width?: string | number;
        height?: string | number;
        depth?: string | number;
        onSale?: boolean;
        onlineOnly?: boolean;
        quantity?: number | string;
        images?: string[];
        features?: Array<{ label: string; value: string }>;
    };

    const numericPrice = typeof price === "string" ? parseFloat(price) : price;
    if (!name || numericPrice === undefined || Number.isNaN(numericPrice) || !categoryId) {
        res.status(400).json({ error: "Nom, prix et catégorie sont requis" });
        return;
    }

    try {
        const result = await createProduct({
            name,
            description,
            descriptionShort,
            price: numericPrice,
            categoryId,
            active,
            reference,
            weight,
            width,
            height,
            depth,
            onSale,
            onlineOnly,
            quantity: quantity !== undefined ? Number(quantity) : undefined,
            images: images || [],
            features: features || [],
        });

        if (!result.success) {
            res.status(502).json({ error: result.error });
            return;
        }

        // Invalidate cache so the frontend picks up the new product
        invalidateCatalogCache();

        res.status(201).json({ success: true, id: result.id });
    } catch (err) {
        console.error("Erreur création produit:", err);
        res.status(500).json({ error: "Erreur création produit" });
    }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/products/:id — update a product
// ---------------------------------------------------------------------------

router.put("/products/:id", async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID produit invalide" });
        return;
    }

    const fields = req.body as Partial<{
        name: string;
        description: string;
        descriptionShort: string;
        price: number | string;
        active: boolean;
        reference: string;
        weight: string | number;
        width: string | number;
        height: string | number;
        depth: string | number;
        onSale: boolean;
        onlineOnly: boolean;
        quantity: number | string;
        images: string[];
        features: Array<{ label: string; value: string }>;
    }>;

    const normalizedFields = { ...fields } as {
        name?: string;
        description?: string;
        descriptionShort?: string;
        price?: number;
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
    };

    if (fields.price !== undefined) {
        normalizedFields.price = typeof fields.price === "string" ? parseFloat(fields.price) : fields.price;
    }
    if (fields.quantity !== undefined) {
        normalizedFields.quantity =
            typeof fields.quantity === "string" ? parseFloat(fields.quantity) : fields.quantity;
    }

    try {
        const result = await updateProduct(id, normalizedFields);
        if (!result.success) {
            res.status(502).json({ error: result.error });
            return;
        }

        invalidateCatalogCache();
        res.json({ success: true });
    } catch (err) {
        console.error("Erreur modification produit:", err);
        res.status(500).json({ error: "Erreur modification produit" });
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/products/:id — delete a product
// ---------------------------------------------------------------------------

router.delete("/products/:id", async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID produit invalide" });
        return;
    }

    try {
        const result = await deleteProduct(id);
        if (!result.success) {
            res.status(502).json({ error: result.error });
            return;
        }

        invalidateCatalogCache();
        res.json({ success: true });
    } catch (err) {
        console.error("Erreur suppression produit:", err);
        res.status(500).json({ error: "Erreur suppression produit" });
    }
});

export default router;
