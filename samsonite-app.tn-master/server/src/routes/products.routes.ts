import { Router, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";
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

type QualitySeverity = "critical" | "warning" | "info";
type QualityEntityType = "product" | "variant" | "category" | "brand" | "order" | "contact";

const hasBrokenText = (value?: string | null) => Boolean(value && /Ã|Â|â€|&amp;|&#/.test(value));
const isBlank = (value?: string | number | null) => value === null || value === undefined || String(value).trim() === "";

const qualityIssue = (
    issues: Array<{
        id: string;
        severity: QualitySeverity;
        entityType: QualityEntityType;
        entityId?: number;
        entityName?: string;
        title: string;
        description: string;
        fixUrl?: string;
    }>,
    issue: {
        severity: QualitySeverity;
        entityType: QualityEntityType;
        entityId?: number;
        entityName?: string;
        title: string;
        description: string;
        fixUrl?: string;
    }
) => {
    issues.push({
        id: `${issue.entityType}-${issue.entityId || "global"}-${issues.length + 1}`,
        ...issue,
    });
};

// All routes here require authentication
router.use(requireAuth);

// ---------------------------------------------------------------------------
// GET /api/admin/data-quality - database consistency report
// ---------------------------------------------------------------------------

router.get("/data-quality", async (_req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const [products, categories, brands, orders, contactMessages] = await Promise.all([
            prisma.product.findMany({
                include: {
                    brand: true,
                    images: true,
                    features: true,
                    variants: true,
                    categories: { include: { category: true } },
                },
                orderBy: { id: "asc" },
            }),
            prisma.category.findMany({
                include: {
                    parent: true,
                    children: true,
                    products: true,
                },
                orderBy: { name: "asc" },
            }),
            prisma.brand.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } }),
            prisma.order.findMany({
                include: { items: true, statusHistory: true },
                orderBy: { createdAt: "desc" },
            }),
            prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } }),
        ]);

        const issues: Array<{
            id: string;
            severity: QualitySeverity;
            entityType: QualityEntityType;
            entityId?: number;
            entityName?: string;
            title: string;
            description: string;
            fixUrl?: string;
        }> = [];

        const mainMenuCategories = categories.filter(
            (category) => !category.parentId && category.isActive && category.showInMainMenu
        );

        if (mainMenuCategories.length > 7) {
            qualityIssue(issues, {
                severity: "critical",
                entityType: "category",
                title: "Trop de categories dans le menu principal",
                description: `${mainMenuCategories.length} categories principales sont marquees pour le menu, maximum autorise: 7.`,
                fixUrl: "/admin/categories",
            });
        }

        categories.forEach((category) => {
            if (hasBrokenText(category.name) || hasBrokenText(category.slug)) {
                qualityIssue(issues, {
                    severity: "warning",
                    entityType: "category",
                    entityId: category.id,
                    entityName: category.name,
                    title: "Texte categorie a nettoyer",
                    description: "Le nom ou le slug contient des caracteres encodes ou casses.",
                    fixUrl: "/admin/categories",
                });
            }
            if (category.parentId && category.showInMainMenu) {
                qualityIssue(issues, {
                    severity: "warning",
                    entityType: "category",
                    entityId: category.id,
                    entityName: category.name,
                    title: "Sous-categorie marquee menu principal",
                    description: "Une sous-categorie doit rester sous Explorer ou sous sa categorie parent.",
                    fixUrl: "/admin/categories",
                });
            }
            if (category.isActive && category.products.length === 0 && category.children.length === 0) {
                qualityIssue(issues, {
                    severity: "info",
                    entityType: "category",
                    entityId: category.id,
                    entityName: category.name,
                    title: "Categorie active vide",
                    description: "Cette categorie est visible mais ne contient aucun produit ni sous-categorie.",
                    fixUrl: "/admin/categories",
                });
            }
        });

        brands.forEach((brand) => {
            if (brand._count.products === 0) {
                qualityIssue(issues, {
                    severity: "info",
                    entityType: "brand",
                    entityId: brand.id,
                    entityName: brand.name,
                    title: "Marque sans produits",
                    description: "Cette marque existe en base mais aucun produit ne lui est associe.",
                });
            }
        });

        products.forEach((product) => {
            const fixUrl = `/admin/produits/modifier/${product.id}`;
            const productName = product.name || `Produit #${product.id}`;

            if (isBlank(product.name)) {
                qualityIssue(issues, {
                    severity: "critical",
                    entityType: "product",
                    entityId: product.id,
                    entityName: productName,
                    title: "Produit sans nom",
                    description: "Le nom est obligatoire pour afficher correctement le catalogue.",
                    fixUrl,
                });
            }
            if (hasBrokenText(product.name) || hasBrokenText(product.description) || hasBrokenText(product.sku)) {
                qualityIssue(issues, {
                    severity: "warning",
                    entityType: "product",
                    entityId: product.id,
                    entityName: productName,
                    title: "Texte produit a nettoyer",
                    description: "Le produit contient probablement des accents ou entites HTML mal encodes.",
                    fixUrl,
                });
            }
            if (!product.brandId || !product.brand) {
                qualityIssue(issues, {
                    severity: "critical",
                    entityType: "product",
                    entityId: product.id,
                    entityName: productName,
                    title: "Produit sans marque",
                    description: "La marque est obligatoire pour les filtres, les badges et la coherence catalogue.",
                    fixUrl,
                });
            }
            if (product.categories.length === 0) {
                qualityIssue(issues, {
                    severity: "critical",
                    entityType: "product",
                    entityId: product.id,
                    entityName: productName,
                    title: "Produit sans categorie",
                    description: "Le produit ne peut pas etre retrouve correctement dans les pages categories.",
                    fixUrl,
                });
            }
            if (Number(product.price) <= 0) {
                qualityIssue(issues, {
                    severity: "critical",
                    entityType: "product",
                    entityId: product.id,
                    entityName: productName,
                    title: "Prix produit invalide",
                    description: "Le prix principal doit etre superieur a 0.",
                    fixUrl,
                });
            }
            if (product.images.length === 0) {
                qualityIssue(issues, {
                    severity: "warning",
                    entityType: "product",
                    entityId: product.id,
                    entityName: productName,
                    title: "Produit sans image",
                    description: "Aucune image globale n'est associee au produit.",
                    fixUrl,
                });
            }
            if (product.variants.length === 0) {
                qualityIssue(issues, {
                    severity: "critical",
                    entityType: "product",
                    entityId: product.id,
                    entityName: productName,
                    title: "Produit sans variante",
                    description: "Chaque produit doit avoir au moins une variante avec prix, stock et dimensions.",
                    fixUrl,
                });
            }

            const seenVariantKeys = new Set<string>();
            product.variants.forEach((variant) => {
                const key = [
                    variant.colorName || "",
                    variant.colorHex || "",
                    variant.size || "",
                    variant.width || "",
                    variant.height || "",
                    variant.depth || "",
                    variant.volume || "",
                    variant.weight || "",
                ].join("|").toLowerCase();

                if (seenVariantKeys.has(key)) {
                    qualityIssue(issues, {
                        severity: "warning",
                        entityType: "variant",
                        entityId: variant.id,
                        entityName: productName,
                        title: "Variante dupliquee",
                        description: "Une variante avec la meme couleur, taille et dimensions existe deja sur ce produit.",
                        fixUrl,
                    });
                }
                seenVariantKeys.add(key);

                const missingFields = [
                    isBlank(variant.colorName) ? "couleur" : "",
                    isBlank(variant.colorHex) ? "code couleur" : "",
                    isBlank(variant.width) ? "largeur" : "",
                    isBlank(variant.height) ? "hauteur" : "",
                    isBlank(variant.depth) ? "profondeur" : "",
                    isBlank(variant.volume) ? "volume" : "",
                    isBlank(variant.weight) ? "poids" : "",
                    variant.price === null || variant.price === undefined || Number(variant.price) <= 0 ? "prix" : "",
                    variant.stock === null || variant.stock === undefined || variant.stock < 0 ? "stock" : "",
                    variant.images.length === 0 ? "images" : "",
                ].filter(Boolean);

                if (missingFields.length > 0) {
                    qualityIssue(issues, {
                        severity: missingFields.includes("prix") || missingFields.includes("stock") ? "critical" : "warning",
                        entityType: "variant",
                        entityId: variant.id,
                        entityName: productName,
                        title: "Variante incomplete",
                        description: `Champs manquants: ${missingFields.join(", ")}.`,
                        fixUrl,
                    });
                }
            });
        });

        orders.forEach((order) => {
            if (order.createdAt > now || order.updatedAt > now) {
                qualityIssue(issues, {
                    severity: "critical",
                    entityType: "order",
                    entityId: order.id,
                    entityName: order.reference,
                    title: "Commande avec date future",
                    description: "La date de creation ou de modification est posterieure a la date actuelle.",
                    fixUrl: "/admin/commandes",
                });
            }
            if (order.updatedAt < order.createdAt) {
                qualityIssue(issues, {
                    severity: "critical",
                    entityType: "order",
                    entityId: order.id,
                    entityName: order.reference,
                    title: "Commande avec dates incoherentes",
                    description: "La date de modification est anterieure a la date de creation.",
                    fixUrl: "/admin/commandes",
                });
            }
            if (order.items.length === 0) {
                qualityIssue(issues, {
                    severity: "warning",
                    entityType: "order",
                    entityId: order.id,
                    entityName: order.reference,
                    title: "Commande sans articles",
                    description: "Cette commande existe mais ne contient aucune ligne produit.",
                    fixUrl: "/admin/commandes",
                });
            }
        });

        contactMessages.forEach((message) => {
            if (message.createdAt > now || message.updatedAt > now) {
                qualityIssue(issues, {
                    severity: "critical",
                    entityType: "contact",
                    entityId: message.id,
                    entityName: message.subject,
                    title: "Message avec date future",
                    description: "La date de creation ou de modification est posterieure a la date actuelle.",
                    fixUrl: "/admin/messages",
                });
            }
            if (message.updatedAt < message.createdAt) {
                qualityIssue(issues, {
                    severity: "critical",
                    entityType: "contact",
                    entityId: message.id,
                    entityName: message.subject,
                    title: "Message avec dates incoherentes",
                    description: "La date de modification est anterieure a la date de creation.",
                    fixUrl: "/admin/messages",
                });
            }
            if (message.attachmentName && !message.attachmentUrl) {
                qualityIssue(issues, {
                    severity: "warning",
                    entityType: "contact",
                    entityId: message.id,
                    entityName: message.subject,
                    title: "Piece jointe sans URL",
                    description: "Le nom de fichier existe mais le lien vers le document est absent.",
                    fixUrl: "/admin/messages",
                });
            }
        });

        res.json({
            generatedAt: now.toISOString(),
            summary: {
                products: products.length,
                variants: products.reduce((total, product) => total + product.variants.length, 0),
                categories: categories.length,
                brands: brands.length,
                orders: orders.length,
                contactMessages: contactMessages.length,
                mainMenuCategories: mainMenuCategories.length,
                criticalIssues: issues.filter((issue) => issue.severity === "critical").length,
                warningIssues: issues.filter((issue) => issue.severity === "warning").length,
                infoIssues: issues.filter((issue) => issue.severity === "info").length,
            },
            issues,
        });
    } catch (err) {
        console.error("Erreur rapport qualite donnees:", err);
        const detail = err instanceof Error ? err.message : "Erreur inconnue";
        res.status(500).json({ error: "Impossible de generer le rapport qualite", detail });
    }
});

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
        variants?: Array<{ colorName?: string; colorHex?: string; size?: string; weight?: string | number; width?: string | number; height?: string | number; depth?: string | number; isExpandable?: boolean; expandedWidth?: string | number; expandedHeight?: string | number; expandedDepth?: string | number; volume?: string | number; price?: string | number; stockInitial?: string | number; stock?: string | number; imagesText?: string; images?: string[] }>;
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
        variants: Array<{ colorName?: string; colorHex?: string; size?: string; weight?: string | number; width?: string | number; height?: string | number; depth?: string | number; isExpandable?: boolean; expandedWidth?: string | number; expandedHeight?: string | number; expandedDepth?: string | number; volume?: string | number; price?: string | number; stockInitial?: string | number; stock?: string | number; imagesText?: string; images?: string[] }>;
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
