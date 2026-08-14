import type { CartItem } from "@/lib/prestashop/types";

const API_BASE = "/api";

const getToken = (): string | null => localStorage.getItem("samsonite_admin_token");

const authHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export type OrderStatus = "new" | "confirmed" | "preparing" | "shipped" | "fulfilled" | "delivery_failed" | "cancelled";
export type ShippingMethod = "standard" | "express" | "pickup";
export type PaymentMethod = "cash_on_delivery" | "bank_transfer";

export interface StoredOrderItem {
  productId: number | null;
  slug: string;
  name: string;
  image: string;
  selectedColor?: string;
  selectedSize?: string;
  variantId?: number;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface StoredOrder {
  id: string;
  databaseId?: number;
  createdAt: string;
  updatedAt?: string;
  status: OrderStatus;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    postalCode?: string;
    notes?: string;
  };
  items: StoredOrderItem[];
  totals: {
    subtotal: number;
    shipping: number;
    total: number;
  };
  statusHistory?: Array<{
    id: number;
    previousStatus?: string;
    newStatus: OrderStatus;
    note?: string;
    createdAt: string;
  }>;
}

export interface CreateOrderInput {
  customer: StoredOrder["customer"];
  items: CartItem[];
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
}

export const createStoredOrder = async ({
  customer,
  items,
  shippingMethod,
  paymentMethod,
}: CreateOrderInput) => {
  const formatVariantLabel = (item: CartItem) =>
    [
      item.selectedColor ? `Couleur: ${item.selectedColor}` : "",
      item.selectedSize ? `Taille: ${item.selectedSize}` : "",
      item.sku ? `SKU: ${item.sku}` : "",
      item.variantId ? `Variante: ${item.variantId}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer,
      shippingMethod,
      paymentMethod,
      items: items.map((item) => ({
        productId: item.product.id,
        slug: item.product.slug,
        name: item.product.name,
        image: item.product.images[0] || "/placeholder.svg",
        selectedColor: formatVariantLabel(item) || item.selectedColor,
        selectedSize: item.selectedSize,
        variantId: item.variantId,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.product.price,
      })),
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.order) {
    throw new Error(data.error || "Impossible de creer la commande");
  }
  return data.order as StoredOrder;
};

export const getOrder = async (id: string) => {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.order || null) as StoredOrder | null;
};

export const listOrders = async (reference?: string) => {
  const query = reference?.trim() ? `?reference=${encodeURIComponent(reference.trim())}` : "";
  const res = await fetch(`${API_BASE}/admin/orders${query}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Impossible de charger les commandes");
  const data = await res.json();
  return (data.orders || []) as StoredOrder[];
};

export const updateOrderStatus = async (id: string, status: OrderStatus, note?: string) => {
  const res = await fetch(`${API_BASE}/admin/orders/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status, note }),
  });
  const data = await res.json();
  if (!res.ok || !data.order) {
    throw new Error(data.error || "Impossible de modifier le statut");
  }
  return data.order as StoredOrder;
};
