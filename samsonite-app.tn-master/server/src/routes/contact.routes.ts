import { Router, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "../middleware/auth.js";
import {
  createContactMessage,
  listContactMessages,
  updateContactMessageStatus,
  listContactSubjects,
  createContactSubject,
  updateContactSubject,
  deleteContactSubject,
} from "../services/contact.service.js";

export const publicContactRouter = Router();
export const adminContactRouter = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const attachmentsDir = path.join(__dirname, "../../public/attachments/contact");

const saveAttachment = async (attachment?: { name?: string; type?: string; data?: string }) => {
  if (!attachment?.data) return { attachmentName: "", attachmentUrl: "" };

  const base64 = attachment.data.replace(/^data:[^;]+;base64,/, "");
  if (!base64) return { attachmentName: "", attachmentUrl: "" };

  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("Piece jointe trop volumineuse (max 5 Mo)");
  }

  await fs.mkdir(attachmentsDir, { recursive: true });

  const extensionFromName = path.extname(attachment.name || "").toLowerCase();
  const extensionFromType =
    attachment.type === "application/pdf"
      ? ".pdf"
      : attachment.type === "image/png"
        ? ".png"
        : attachment.type === "image/webp"
          ? ".webp"
          : attachment.type === "image/jpeg"
            ? ".jpg"
            : extensionFromName || ".bin";
  const extension = extensionFromName || extensionFromType;
  const safeBaseName =
    path
      .basename(attachment.name || "piece-jointe", extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "piece-jointe";
  const filename = `${Date.now()}-${safeBaseName}${extension}`;

  await fs.writeFile(path.join(attachmentsDir, filename), buffer);

  return {
    attachmentName: attachment.name || filename,
    attachmentUrl: `/attachments/contact/${filename}`,
  };
};

publicContactRouter.get("/subjects", async (_req: Request, res: Response): Promise<void> => {
  try {
    const subjects = await listContactSubjects(false);
    res.json({ subjects });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(500).json({ error: "Impossible de charger les sujets", detail });
  }
});
publicContactRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const attachment = await saveAttachment(req.body?.attachment);
    const message = await createContactMessage({ ...req.body, ...attachment });
    res.status(201).json({ success: true, message });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(400).json({ success: false, error: detail });
  }
});

adminContactRouter.use(requireAuth);

adminContactRouter.get("/subjects", async (_req: Request, res: Response): Promise<void> => {
  try {
    const subjects = await listContactSubjects(true);
    res.json({ subjects });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(500).json({ error: "Impossible de charger les sujets", detail });
  }
});

adminContactRouter.post("/subjects", async (req: Request, res: Response): Promise<void> => {
  try {
    const subject = await createContactSubject(req.body || {});
    res.status(201).json({ success: true, subject });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(400).json({ success: false, error: detail });
  }
});

adminContactRouter.put("/subjects/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const subject = await updateContactSubject(Number(req.params.id), req.body || {});
    res.json({ success: true, subject });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(400).json({ success: false, error: detail });
  }
});

adminContactRouter.delete("/subjects/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteContactSubject(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(400).json({ success: false, error: detail });
  }
});
adminContactRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const messages = await listContactMessages();
    res.json({ messages, total: messages.length });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(500).json({ error: "Impossible de charger les messages", detail });
  }
});

adminContactRouter.put("/:id/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const message = await updateContactMessageStatus(Number(req.params.id), String(req.body.status || ""));
    res.json({ success: true, message });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erreur inconnue";
    res.status(400).json({ success: false, error: detail });
  }
});

