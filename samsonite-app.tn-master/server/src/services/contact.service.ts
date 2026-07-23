import { prisma } from "../db/prisma.js";

const CONTACT_STATUSES = new Set(["new", "read", "closed"]);

export interface CreateContactMessageInput {
  subject?: string;
  email?: string;
  message?: string;
  attachmentName?: string;
  attachmentUrl?: string;
}

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const mapContactMessage = (message: any) => ({
  id: message.id,
  subject: message.subject,
  email: message.email,
  message: message.message,
  attachmentName: message.attachmentName || "",
  attachmentUrl: message.attachmentUrl || "",
  status: message.status,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

export const createContactMessage = async (input: CreateContactMessageInput) => {
  const subject = String(input.subject || "").trim();
  const email = String(input.email || "").trim();
  const message = String(input.message || "").trim();
  const attachmentName = String(input.attachmentName || "").trim();
  const attachmentUrl = String(input.attachmentUrl || "").trim();

  if (!subject || !email || !message) {
    throw new Error("Sujet, email et message sont obligatoires");
  }
  if (!validateEmail(email)) {
    throw new Error("Email invalide");
  }
  if (message.length < 10) {
    throw new Error("Message trop court");
  }

  const created = await prisma.contactMessage.create({
    data: {
      subject,
      email,
      message,
      attachmentName: attachmentName || null,
      attachmentUrl: attachmentUrl || null,
      status: "new",
    },
  });

  return mapContactMessage(created);
};

export const listContactMessages = async () => {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });
  return messages.map(mapContactMessage);
};

export const updateContactMessageStatus = async (id: number, status: string) => {
  if (!CONTACT_STATUSES.has(status)) {
    throw new Error("Statut invalide");
  }

  const updated = await prisma.contactMessage.update({
    where: { id },
    data: { status },
  });

  return mapContactMessage(updated);
};
const DEFAULT_CONTACT_SUBJECTS = [
  { labelFr: "Service client", labelEn: "Customer service", position: 1 },
  { labelFr: "Suivi de commande", labelEn: "Order follow-up", position: 2 },
  { labelFr: "Service apres-vente", labelEn: "After-sales service", position: 3 },
  { labelFr: "Disponibilite produit", labelEn: "Product availability", position: 4 },
];

const mapContactSubject = (subject: any) => ({
  id: subject.id,
  labelFr: subject.labelFr,
  labelEn: subject.labelEn || "",
  active: subject.active,
  position: subject.position,
  createdAt: subject.createdAt,
  updatedAt: subject.updatedAt,
});

const ensureDefaultContactSubjects = async () => {
  const count = await prisma.contactSubject.count();
  if (count > 0) return;
  await prisma.contactSubject.createMany({ data: DEFAULT_CONTACT_SUBJECTS });
};

export const listContactSubjects = async (includeInactive = false) => {
  await ensureDefaultContactSubjects();
  const subjects = await prisma.contactSubject.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ position: "asc" }, { labelFr: "asc" }],
  });
  return subjects.map(mapContactSubject);
};

export const createContactSubject = async (input: { labelFr?: string; labelEn?: string; active?: boolean; position?: number }) => {
  const labelFr = String(input.labelFr || "").trim();
  const labelEn = String(input.labelEn || "").trim();
  const position = Number.isFinite(Number(input.position)) ? Number(input.position) : 0;

  if (!labelFr) throw new Error("Le sujet en francais est obligatoire");

  const created = await prisma.contactSubject.create({
    data: {
      labelFr,
      labelEn: labelEn || null,
      active: input.active !== false,
      position,
    },
  });
  return mapContactSubject(created);
};

export const updateContactSubject = async (
  id: number,
  input: Partial<{ labelFr: string; labelEn: string; active: boolean; position: number }>
) => {
  const existing = await prisma.contactSubject.findUnique({ where: { id } });
  if (!existing) throw new Error("Sujet introuvable");

  const data: any = {};
  if (input.labelFr !== undefined) {
    const labelFr = String(input.labelFr || "").trim();
    if (!labelFr) throw new Error("Le sujet en francais est obligatoire");
    data.labelFr = labelFr;
  }
  if (input.labelEn !== undefined) data.labelEn = String(input.labelEn || "").trim() || null;
  if (input.active !== undefined) data.active = Boolean(input.active);
  if (input.position !== undefined) data.position = Number.isFinite(Number(input.position)) ? Number(input.position) : 0;

  const updated = await prisma.contactSubject.update({ where: { id }, data });
  return mapContactSubject(updated);
};

export const deleteContactSubject = async (id: number) => {
  const existing = await prisma.contactSubject.findUnique({ where: { id } });
  if (!existing) throw new Error("Sujet introuvable");
  await prisma.contactSubject.delete({ where: { id } });
  return { success: true };
};

