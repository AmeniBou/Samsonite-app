import type { CartItem } from "@/lib/prestashop/types";

const ORDERS_STORAGE_KEY = "samsonite_orders";

export type OrderStatus = "new" | "confirmed" | "fulfilled" | "cancelled";

export interface StoredOrderItem {
  productId: number;
  slug: string;
  name: string;
  image: string;
  selectedColor?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface StoredOrder {
  id: string;
  createdAt: string;
  status: OrderStatus;
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
}

export interface CreateOrderInput {
  customer: StoredOrder["customer"];
  items: CartItem[];
  subtotal: number;
  shipping: number;
}

const readOrders = (): StoredOrder[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeOrders = (orders: StoredOrder[]) => {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
};

export const listOrders = () =>
  readOrders().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

export const getOrder = (id: string) => readOrders().find((order) => order.id === id) || null;

export const updateOrderStatus = (id: string, status: OrderStatus) => {
  const orders = readOrders();
  const nextOrders = orders.map((order) => (order.id === id ? { ...order, status } : order));
  writeOrders(nextOrders);
  return nextOrders.find((order) => order.id === id) || null;
};

export const createStoredOrder = ({
  customer,
  items,
  subtotal,
  shipping,
}: CreateOrderInput) => {
  const now = new Date();
  const id = `CMD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}-${String(now.getTime()).slice(-6)}`;

  const order: StoredOrder = {
    id,
    createdAt: now.toISOString(),
    status: "new",
    customer,
    items: items.map((item) => ({
      productId: item.product.id,
      slug: item.product.slug,
      name: item.product.name,
      image: item.product.images[0] || "/placeholder.svg",
      selectedColor: item.selectedColor,
      quantity: item.quantity,
      unitPrice: item.product.price,
      total: item.product.price * item.quantity,
    })),
    totals: {
      subtotal,
      shipping,
      total: subtotal + shipping,
    },
  };

  writeOrders([order, ...readOrders()]);
  return order;
};
