import { Router, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";
import {
    getMappedAdminProducts,
    getMappedAdminProduct,
    getAdminCategories,
    getBrands,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../services/catalog.service.js";
import { invalidateCatalogCache } from "./catalog.routes.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminImagesDir = path.join(__dirname, "../../public/images/admin");
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const allowedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const maxImageBytes = 5 * 1024 * 1024;

// All routes here require authentication
router.use(requireAuth);

// ---------------------------------------------------------------------------
// GET /api/admin/products - list all products (for admin table)
// ---------------------------------------------------------------------------


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
// GET /api/admin/products/:id - get single product details
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
// GET /api/admin/categories - list categories (for product form dropdown)
// ---------------------------------------------------------------------------

router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
    try {
        const categories = await getAdminCategories();
        res.json({ categories });
    } catch (err) {
        console.error("Erreur categories admin:", err);
        const detail = err instanceof Error ? err.message : "Erreur inconnue";
        res.status(502).json({ error: "Impossible de charger les categories", detail });
    }
});

router.post("/categories", async (req: Request, res: Response): Promise<void> => {
    const { name, slug, parentId, isActive, showInMainMenu } = req.body as { name?: string; slug?: string; parentId?: number | null; isActive?: boolean; showInMainMenu?: boolean };

    try {
        const result = await createCategory({ name, slug, parentId, isActive, showInMainMenu });
        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        invalidateCatalogCache();
        res.status(201).json({ success: true, id: result.id });
    } catch (err) {
        console.error("Erreur creation categorie:", err);
        res.status(500).json({ error: "Erreur creation categorie" });
    }
});

router.put("/categories/:id", async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID categorie invalide" });
        return;
    }

    const fields = req.body as Partial<{ name: string; slug: string; parentId: number | null; isActive: boolean; showInMainMenu: boolean }>;

    try {
        const result = await updateCategory(id, fields);
        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        invalidateCatalogCache();
        res.json({ success: true });
    } catch (err) {
        console.error("Erreur modification categorie:", err);
        res.status(500).json({ error: "Erreur modification categorie" });
    }
});

router.delete("/categories/:id", async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID categorie invalide" });
        return;
    }

    try {
        const result = await deleteCategory(id);
        if (!result.success) {
            res.status(400).json({ error: result.error });
            return;
        }

        invalidateCatalogCache();
        res.json({ success: true });
    } catch (err) {
        console.error("Erreur suppression categorie:", err);
        res.status(500).json({ error: "Erreur suppression categorie" });
    }
});


router.get("/brands", async (_req: Request, res: Response): Promise<void> => {
    try {
        const brands = await getBrands();
        res.json({ brands: brands.map((brand) => ({ id: brand.id, name: brand.name })) });
    } catch (err) {
        console.error("Erreur marques admin:", err);
        const detail = err instanceof Error ? err.message : "Erreur inconnue";
        res.status(502).json({ error: "Impossible de charger les marques", detail });
    }
});
// ---------------------------------------------------------------------------
// POST /api/admin/products - create a new product
// ---------------------------------------------------------------------------

router.post("/images", async (req: Request, res: Response): Promise<void> => {
    const { images } = req.body as {
        images?: Array<{ name?: string; type?: string; data?: string }>;
    };

    if (!Array.isArray(images) || images.length === 0) {
        res.status(400).json({ error: "Aucune image fournie" });
        return;
    }

    try {
        await fs.mkdir(adminImagesDir, { recursive: true });

        const saved = await Promise.all(
            images.map(async (image, index) => {
                if (!image.type || !allowedImageTypes.has(image.type)) {
                    throw new Error(`Type d image invalide: ${image.name || "image"}`);
                }
                const base64 = (image.data || "").replace(/^data:[^;]+;base64,/, "");
                if (!base64) throw new Error("Image invalide");
                const buffer = Buffer.from(base64, "base64");
                if (buffer.byteLength > maxImageBytes) {
                    throw new Error(`Image trop lourde: ${image.name || "image"}`);
                }

                const extensionFromName = path.extname(image.name || "").toLowerCase();
                const extensionFromType =
                    image.type === "image/png"
                        ? ".png"
                        : image.type === "image/webp"
                          ? ".webp"
                          : image.type === "image/gif"
                            ? ".gif"
                            : ".jpg";
                const extension = allowedImageExtensions.has(extensionFromName) ? extensionFromName : extensionFromType;
                const safeBaseName =
                    path
                        .basename(image.name || `image-${index + 1}`, extension)
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "")
                        .slice(0, 60) || `image-${index + 1}`;
                const filename = `${Date.now()}-${index + 1}-${safeBaseName}${extension}`;
                const filePath = path.join(adminImagesDir, filename);

                await fs.writeFile(filePath, buffer);

                return `/images/admin/${filename}`;
            })
        );

        res.status(201).json({ success: true, images: saved });
    } catch (err) {
        console.error("Erreur upload images admin:", err);
        const detail = err instanceof Error ? err.message : "Impossible d importer les images";
        res.status(400).json({ error: detail });
    }
});

router.post("/products", async (req: Request, res: Response): Promise<void> => {
    const {
        name,
        description,
        descriptionShort,
        price,
        categoryId,
        brandId,
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
        variants,
    } = req.body as {
        name?: string;
        description?: string;
        descriptionShort?: string;
        price?: number | string;
        categoryId?: number;
        brandId?: number;
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
        variants?: Array<{ colorName?: string; colorHex?: string; size?: string; weight?: string | number; width?: string | number; height?: string | number; depth?: string | number; volume?: string | number; price?: string | number; stockInitial?: string | number; stock?: string | number; imagesText?: string; images?: string[] }>;
    };

    const numericPrice = typeof price === "string" ? parseFloat(price) : price;
    const numericQuantity = quantity !== undefined && quantity !== "" ? Number(quantity) : undefined;
    if (!name?.trim()) {
        res.status(400).json({ error: "Le nom du produit est requis" });
        return;
    }
    if (numericPrice === undefined || !Number.isFinite(numericPrice) || numericPrice <= 0) {
        res.status(400).json({ error: "Le prix est obligatoire et doit etre superieur a 0" });
        return;
    }
    if (!categoryId) {
        res.status(400).json({ error: "La categorie est requise" });
        return;
    }
    if (!brandId) {
        res.status(400).json({ error: "La marque est requise" });
        return;
    }
    if (numericQuantity !== undefined && (!Number.isFinite(numericQuantity) || numericQuantity < 0)) {
        res.status(400).json({ error: "Le stock doit etre un nombre positif" });
        return;
    }

    try {
        const result = await createProduct({
            name,
            description,
            descriptionShort,
            price: numericPrice,
            categoryId,
            brandId,
            active,
            reference,
            weight,
            width,
            height,
            depth,
            onSale,
            onlineOnly,
            quantity: numericQuantity,
            images: images || [],
            features: features || [],
            variants: variants || [],
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
// PUT /api/admin/products/:id - update a product
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
        variants: Array<{ colorName?: string; colorHex?: string; size?: string; weight?: string | number; width?: string | number; height?: string | number; depth?: string | number; volume?: string | number; price?: string | number; stockInitial?: string | number; stock?: string | number; imagesText?: string; images?: string[] }>;
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
        variants?: Array<{ colorName?: string; colorHex?: string; size?: string; weight?: string | number; width?: string | number; height?: string | number; depth?: string | number; volume?: string | number; price?: string | number; stockInitial?: string | number; stock?: string | number; imagesText?: string; images?: string[] }>;
    };

    if (fields.price !== undefined) {
        normalizedFields.price = typeof fields.price === "string" ? parseFloat(fields.price) : fields.price;
    }
    if (fields.quantity !== undefined) {
        normalizedFields.quantity =
            typeof fields.quantity === "string" ? parseFloat(fields.quantity) : fields.quantity;
    }
    if (fields.price !== undefined && (!Number.isFinite(normalizedFields.price) || normalizedFields.price! <= 0)) {
        res.status(400).json({ error: "Le prix doit etre un nombre superieur a 0" });
        return;
    }
    if (fields.quantity !== undefined && (!Number.isFinite(normalizedFields.quantity) || normalizedFields.quantity! < 0)) {
        res.status(400).json({ error: "Le stock doit etre un nombre positif" });
        return;
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
// DELETE /api/admin/products/:id - delete a product
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
