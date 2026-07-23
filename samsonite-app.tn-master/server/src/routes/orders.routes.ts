import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createOrder,
  getOrderByReference,
  listOrders,
  updateOrderStatus,
} from "../services/orders.service.js";

export const publicOrdersRouter = Router();
export const adminOrdersRouter = Router();

publicOrdersRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json({ success: true, order });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(400).json({ success: false, error: detail });
  }
});

publicOrdersRouter.get("/:reference", async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await getOrderByReference(req.params.reference);
    if (!order) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }
    res.json({ order });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(500).json({ error: "Impossible de charger la commande", detail });
  }
});

adminOrdersRouter.use(requireAuth);

adminOrdersRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await listOrders(String(req.query.reference || ""));
    res.json({ orders, total: orders.length });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(500).json({ error: "Impossible de charger les commandes", detail });
  }
});

adminOrdersRouter.put("/:reference/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await updateOrderStatus(req.params.reference, String(req.body.status || ""));
    res.json({ success: true, order });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(400).json({ success: false, error: detail });
  }
});
