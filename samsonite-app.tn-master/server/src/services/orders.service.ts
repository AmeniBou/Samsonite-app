import { prisma } from "../db/prisma.js";

const ORDER_STATUSES = new Set(["new", "confirmed", "fulfilled", "cancelled"]);
const PAYMENT_METHODS = new Set(["cash_on_delivery", "bank_transfer"]);
const SHIPPING_METHODS = new Set(["standard", "express", "pickup"]);

export interface CreateOrderItemInput {
  productId?: number;
  slug?: string;
  name?: string;
  image?: string;
  selectedColor?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface CreateOrderInput {
  customer?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    notes?: string;
  };
  items?: CreateOrderItemInput[];
  shippingMethod?: string;
  paymentMethod?: string;
}

const toNumber = (value: unknown) => Number(value || 0);

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePhone = (phone: string) => /^[+()\s0-9.-]{8,20}$/.test(phone);

const generateReference = () => {
  const now = new Date();
  return `CMD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}-${String(now.getTime()).slice(-6)}`;
};

const getShippingFee = (method: string, subtotal: number) => {
  if (method === "pickup") return 0;
  if (method === "express") return 12;
  return subtotal >= 300 ? 0 : 7;
};

export const mapOrder = (order: any) => ({
  id: order.reference,
  databaseId: order.id,
  createdAt: order.createdAt,
  status: order.status,
  shippingMethod: order.shippingMethod,
  paymentMethod: order.paymentMethod,
  customer: {
    firstName: order.customerFirstName,
    lastName: order.customerLastName,
    phone: order.customerPhone,
    email: order.customerEmail,
    address: order.shippingAddress,
    city: order.shippingCity,
    postalCode: order.shippingPostalCode || "",
    notes: order.customerNotes || "",
  },
  items: (order.items || []).map((item: any) => ({
    productId: item.productId,
    slug: item.productSlug || "",
    name: item.productName,
    image: item.productImage || "/placeholder.svg",
    selectedColor: item.selectedColor || "",
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    total: Number(item.lineTotal),
  })),
  totals: {
    subtotal: Number(order.subtotal),
    shipping: Number(order.shippingFee),
    total: Number(order.total),
  },
});

export const createOrder = async (input: CreateOrderInput) => {
  const customer = input.customer || {};
  const items = Array.isArray(input.items) ? input.items : [];
  const shippingMethod = SHIPPING_METHODS.has(input.shippingMethod || "")
    ? input.shippingMethod!
    : "standard";
  const paymentMethod = PAYMENT_METHODS.has(input.paymentMethod || "")
    ? input.paymentMethod!
    : "cash_on_delivery";

  const required = [
    customer.firstName,
    customer.lastName,
    customer.phone,
    customer.email,
    customer.address,
    customer.city,
  ];
  if (required.some((value) => !String(value || "").trim())) {
    throw new Error("Informations client incompletes");
  }
  if (!validateEmail(String(customer.email))) {
    throw new Error("Email invalide");
  }
  if (!validatePhone(String(customer.phone))) {
    throw new Error("Telephone invalide");
  }
  if (items.length === 0) {
    throw new Error("Aucun article dans la commande");
  }

  const normalizedItems = items.map((item) => {
    const quantity = Math.max(1, Math.floor(toNumber(item.quantity)));
    const unitPrice = toNumber(item.unitPrice);
    if (!item.name || unitPrice <= 0) {
      throw new Error("Article invalide");
    }
    return {
      productId: item.productId ? Number(item.productId) : null,
      productName: String(item.name),
      productSlug: item.slug || null,
      productImage: item.image || null,
      selectedColor: item.selectedColor || null,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingFee = getShippingFee(shippingMethod, subtotal);
  const total = subtotal + shippingFee;

  let reference = generateReference();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const exists = await prisma.order.findUnique({ where: { reference } });
    if (!exists) break;
    reference = generateReference();
  }

  const order = await prisma.order.create({
    data: {
      reference,
      status: "new",
      customerFirstName: String(customer.firstName).trim(),
      customerLastName: String(customer.lastName).trim(),
      customerPhone: String(customer.phone).trim(),
      customerEmail: String(customer.email).trim(),
      shippingAddress: String(customer.address).trim(),
      shippingCity: String(customer.city).trim(),
      shippingPostalCode: customer.postalCode?.trim() || null,
      customerNotes: customer.notes?.trim() || null,
      shippingMethod,
      paymentMethod,
      subtotal,
      shippingFee,
      total,
      items: {
        create: normalizedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          productImage: item.productImage,
          selectedColor: item.selectedColor,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      },
    },
    include: { items: true },
  });

  return mapOrder(order);
};

export const getOrderByReference = async (reference: string) => {
  const order = await prisma.order.findUnique({
    where: { reference },
    include: { items: true },
  });
  return order ? mapOrder(order) : null;
};

export const listOrders = async () => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  return orders.map(mapOrder);
};

export const updateOrderStatus = async (reference: string, status: string) => {
  if (!ORDER_STATUSES.has(status)) {
    throw new Error("Statut invalide");
  }
  const order = await prisma.order.update({
    where: { reference },
    data: { status },
    include: { items: true },
  });
  return mapOrder(order);
};
