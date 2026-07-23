const API_BASE = "/api";

const getToken = (): string | null => localStorage.getItem("samsonite_admin_token");

const authHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export type ContactMessageStatus = "new" | "read" | "closed";

export interface ContactMessage {
  id: number;
  subject: string;
  email: string;
  message: string;
  attachmentName?: string;
  attachmentUrl?: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSubject {
  id: number;
  labelFr: string;
  labelEn?: string;
  active: boolean;
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateContactMessageInput {
  subject: string;
  email: string;
  message: string;
  attachmentName?: string;
  attachment?: {
    name: string;
    type: string;
    data: string;
  };
}

export const createContactMessage = async (input: CreateContactMessageInput) => {
  const res = await fetch(`${API_BASE}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.message) {
    throw new Error(data.error || "Impossible d'envoyer le message");
  }
  return data.message as ContactMessage;
};

export const listContactMessages = async () => {
  const res = await fetch(`${API_BASE}/admin/contact-messages`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Impossible de charger les messages");
  const data = await res.json();
  return (data.messages || []) as ContactMessage[];
};

export const updateContactMessageStatus = async (id: number, status: ContactMessageStatus) => {
  const res = await fetch(`${API_BASE}/admin/contact-messages/${id}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok || !data.message) {
    throw new Error(data.error || "Impossible de modifier le statut");
  }
  return data.message as ContactMessage;
};
export const listContactSubjects = async (includeInactive = false) => {
  const url = includeInactive ? `${API_BASE}/admin/contact-messages/subjects` : `${API_BASE}/contact/subjects`;
  const res = await fetch(url, { headers: includeInactive ? authHeaders() : undefined });
  if (!res.ok) throw new Error("Impossible de charger les sujets");
  const data = await res.json();
  return (data.subjects || []) as ContactSubject[];
};

export const createContactSubject = async (input: {
  labelFr: string;
  labelEn?: string;
  active?: boolean;
  position?: number;
}) => {
  const res = await fetch(`${API_BASE}/admin/contact-messages/subjects`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.subject) throw new Error(data.error || "Impossible d'ajouter le sujet");
  return data.subject as ContactSubject;
};

export const updateContactSubject = async (id: number, input: Partial<ContactSubject>) => {
  const res = await fetch(`${API_BASE}/admin/contact-messages/subjects/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.subject) throw new Error(data.error || "Impossible de modifier le sujet");
  return data.subject as ContactSubject;
};

export const deleteContactSubject = async (id: number) => {
  const res = await fetch(`${API_BASE}/admin/contact-messages/subjects/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || "Impossible de supprimer le sujet");
  return true;
};

