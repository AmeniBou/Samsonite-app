import { Router, Request, Response } from "express";
import { getPublicCatalog, proxyProductImage } from "../services/catalog.service.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/catalog — full catalog data (public, for the frontend)
// ---------------------------------------------------------------------------

let catalogCache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 60_000; // 60s

router.get("/", async (_req: Request, res: Response): Promise<void> => {
    try {
        if (catalogCache && Date.now() - catalogCache.ts < CACHE_TTL) {
            res.json(catalogCache.data);
            return;
        }

        const data = await getPublicCatalog();
        catalogCache = { data, ts: Date.now() };
        res.json(data);
    } catch (err) {
        console.error("Erreur catalogue:", err);
        res.status(502).json({ error: "Impossible de charger le catalogue" });
    }
});

// ---------------------------------------------------------------------------
// GET /api/catalog/images/products/:productId/:imageId — proxy public product images
// ---------------------------------------------------------------------------

router.get("/images/products/:productId/:imageId", async (req: Request, res: Response): Promise<void> => {
    const productId = parseInt(req.params.productId, 10);
    const imageId = parseInt(req.params.imageId, 10);
    if (Number.isNaN(productId) || Number.isNaN(imageId)) {
        res.status(400).json({ error: "ID de produit ou d'image invalide" });
        return;
    }

    try {
        const result = await proxyProductImage(productId, imageId);
        if (!result) {
            res.status(404).json({ error: "Image introuvable" });
            return;
        }

        res.setHeader("Content-Type", result.contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.send(result.buffer);
    } catch (err) {
        console.error("Erreur proxy image:", err);
        res.status(502).json({ error: "Erreur proxy image" });
    }
});

// Force cache invalidation (called after admin CRUD operations)
export const invalidateCatalogCache = () => {
    catalogCache = null;
};

export default router;
