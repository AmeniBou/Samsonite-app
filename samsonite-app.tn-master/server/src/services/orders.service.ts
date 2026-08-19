import fs from "fs/promises";
import net from "net";
import path from "path";
import tls from "tls";
import { fileURLToPath } from "url";
import { prisma } from "../db/prisma.js";
import { getBestPromotionForProduct, getPromotionPrice, listActivePromotions } from "./promotions.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const orderEmailsDir = path.join(__dirname, "../../public/order-emails");

const ORDER_STATUSES = new Set([
  "new",
  "confirmed",
  "preparing",
  "shipped",
  "fulfilled",
  "delivery_failed",
  "cancelled",
]);

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["fulfilled", "delivery_failed"],
  delivery_failed: ["shipped", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

const ORDER_STATUS_TRANSITION_NOTES: Record<string, string> = {
  "new:confirmed": "Commande confirmee par le backoffice",
  "new:cancelled": "Commande annulee avant confirmation",
  "confirmed:preparing": "Commande envoyee en preparation",
  "confirmed:cancelled": "Commande annulee avant preparation",
  "preparing:shipped": "Commande expediee",
  "preparing:cancelled": "Commande annulee pendant la preparation",
  "shipped:fulfilled": "Commande livree au client",
  "shipped:delivery_failed": "Livraison echouee",
  "delivery_failed:shipped": "Nouvelle tentative de livraison",
  "delivery_failed:cancelled": "Commande annulee apres echec de livraison",
};
const PAYMENT_METHODS = new Set(["cash_on_delivery", "bank_transfer"]);
const SHIPPING_METHODS = new Set(["standard", "express", "pickup"]);

export interface CreateOrderItemInput {
  productId?: number;
  variantId?: number;
  slug?: string;
  name?: string;
  image?: string;
  selectedColor?: string;
  selectedSize?: string;
  sku?: string;
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


const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatTnd = (value: number) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);


const encodeBase64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

const sanitizeMailHeader = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

const smtpRead = (socket: net.Socket | tls.TLSSocket) =>
  new Promise<string>((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP timeout"));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("data", onData);
      socket.off("error", onError);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] || "";
      if (/^\d{3}\s/.test(lastLine)) {
        cleanup();
        resolve(buffer);
      }
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });

const smtpWrite = async (socket: net.Socket | tls.TLSSocket, command: string, expected: number[]) => {
  socket.write(`${command}\r\n`);
  const response = await smtpRead(socket);
  const code = Number(response.slice(0, 3));
  if (!expected.includes(code)) {
    throw new Error(`SMTP command failed (${command}): ${response.trim()}`);
  }
  return response;
};

const connectSmtp = (host: string, port: number, secure: boolean) =>
  new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(socket))
      : net.connect({ host, port }, () => resolve(socket));

    socket.setTimeout(20000);
    socket.once("error", reject);
    socket.once("timeout", () => reject(new Error("SMTP connection timeout")));
  });

const sendSmtpMail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;

  if (!host || !from) {
    return { sent: false, reason: "SMTP_HOST/SMTP_FROM missing" };
  }

  let socket = await connectSmtp(host, port, secure);

  try {
    await smtpRead(socket);
    await smtpWrite(socket, `EHLO ${host}`, [250]);

    if (!secure && port !== 25) {
      await smtpWrite(socket, "STARTTLS", [220]);
      socket = tls.connect({ socket, servername: host });
      await new Promise<void>((resolve, reject) => {
        socket.once("secureConnect", () => resolve());
        socket.once("error", reject);
      });
      await smtpWrite(socket, `EHLO ${host}`, [250]);
    }

    if (user && pass) {
      await smtpWrite(socket, "AUTH LOGIN", [334]);
      await smtpWrite(socket, encodeBase64(user), [334]);
      await smtpWrite(socket, encodeBase64(pass), [235]);
    }

    const safeFrom = sanitizeMailHeader(from);
    const safeTo = sanitizeMailHeader(to);
    const safeSubject = sanitizeMailHeader(subject);
    const message = [
      `From: ${safeFrom}`,
      `To: ${safeTo}`,
      `Subject: ${safeSubject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      html,
      ".",
    ].join("\r\n");

    await smtpWrite(socket, `MAIL FROM:<${safeFrom.replace(/^.*<|>.*$/g, "")}>`, [250]);
    await smtpWrite(socket, `RCPT TO:<${safeTo}>`, [250, 251]);
    await smtpWrite(socket, "DATA", [354]);
    await smtpWrite(socket, message, [250]);
    await smtpWrite(socket, "QUIT", [221]);
    return { sent: true };
  } finally {
    socket.end();
  }
};
const buildOrderConfirmationHtml = (order: any) => {
  const items = order.items
    .map(
      (item: any) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;">${escapeHtml(item.name)}${item.selectedColor ? `<br><small>Couleur: ${escapeHtml(item.selectedColor)}</small>` : ""}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${formatTnd(item.unitPrice)}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${formatTnd(item.total)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><title>Confirmation ${escapeHtml(order.id)}</title></head>
<body style="font-family:Arial,sans-serif;color:#111;line-height:1.5;margin:0;background:#f6f6f6;padding:24px;">
  <main style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;padding:28px;">
    <h1 style="margin:0 0 8px;font-size:24px;">Commande reçue</h1>
    <p style="margin:0 0 24px;color:#555;">Bonjour ${escapeHtml(order.customer.firstName)}, votre commande <strong>${escapeHtml(order.id)}</strong> a bien été enregistrée.</p>
    <h2 style="font-size:16px;margin:0 0 10px;">Résumé</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="background:#f8f8f8;"><th style="padding:10px;text-align:left;">Article</th><th style="padding:10px;">Qté</th><th style="padding:10px;text-align:right;">Prix</th><th style="padding:10px;text-align:right;">Total</th></tr></thead>
      <tbody>${items}</tbody>
    </table>
    <div style="margin-top:18px;border-top:1px solid #eee;padding-top:14px;">
      <p style="margin:4px 0;text-align:right;">Sous-total: ${formatTnd(order.totals.subtotal)}</p>
      <p style="margin:4px 0;text-align:right;">Livraison: ${order.totals.shipping === 0 ? "Gratuite" : formatTnd(order.totals.shipping)}</p>
      <p style="margin:8px 0 0;text-align:right;font-size:18px;font-weight:bold;">Total: ${formatTnd(order.totals.total)}</p>
    </div>
    <h2 style="font-size:16px;margin:24px 0 10px;">Livraison</h2>
    <p style="margin:0;color:#555;">${escapeHtml(order.customer.address)}, ${escapeHtml(order.customer.city)} ${escapeHtml(order.customer.postalCode || "")}</p>
    <p style="margin:24px 0 0;color:#555;">Nous vous contacterons pour confirmer les détails de livraison.</p>
  </main>
</body>
</html>`;
};

const sendOrderConfirmation = async (order: any) => {
  const html = buildOrderConfirmationHtml(order);
  await fs.mkdir(orderEmailsDir, { recursive: true });
  const filename = `${order.id.replace(/[^a-zA-Z0-9-]/g, "-")}.html`;
  await fs.writeFile(path.join(orderEmailsDir, filename), html, "utf8");

  const mailResult = await sendSmtpMail({
    to: order.customer.email,
    subject: `Confirmation de commande ${order.id}`,
    html,
  });

  if (mailResult.sent) {
    console.info(`Confirmation commande envoyee a ${order.customer.email}`);
  } else {
    console.info(
      `Confirmation commande non envoyee (${mailResult.reason}). Apercu: /order-emails/${filename}`
    );
  }

  return { saved: true, sent: mailResult.sent, previewUrl: `/order-emails/${filename}` };
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
  updatedAt: order.updatedAt,
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
    variantId: item.variantId,
    slug: item.productSlug || "",
    name: item.productName,
    image: item.productImage || "/placeholder.svg",
    selectedColor: item.selectedColor || "",
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    originalUnitPrice: item.originalUnitPrice ? Number(item.originalUnitPrice) : Number(item.unitPrice),
    discountPercent: item.discountPercent ? Number(item.discountPercent) : null,
    promotionName: item.promotionName || "",
    total: Number(item.lineTotal),
  })),
  totals: {
    subtotal: Number(order.subtotal),
    shipping: Number(order.shippingFee),
    total: Number(order.total),
  },
  statusHistory: (order.statusHistory || []).map((entry: any) => ({
    id: entry.id,
    previousStatus: entry.previousStatus || "",
    newStatus: entry.newStatus,
    note: entry.note || "",
    createdAt: entry.createdAt,
  })),
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
      variantId: item.variantId ? Number(item.variantId) : null,
      productName: String(item.name),
      productSlug: item.slug || null,
      productImage: item.image || null,
      selectedColor: item.selectedColor || null,
      quantity,
      unitPrice,
      originalUnitPrice: unitPrice,
      discountPercent: null as number | null,
      promotionName: null as string | null,
      lineTotal: unitPrice * quantity,
    };
  });

  let reference = generateReference();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const exists = await prisma.order.findUnique({ where: { reference } });
    if (!exists) break;
    reference = generateReference();
  }

  const activePromotions = await listActivePromotions();

  const order = await prisma.$transaction(async (tx) => {
    const affectedProductIds = new Set<number>();

    const reservedItems = await Promise.all(
      normalizedItems.map(async (item) => {
        if (!item.variantId) {
          if (!item.productId) return item;

          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: {
              id: true,
              price: true,
              brandId: true,
              categories: { select: { categoryId: true } },
            },
          });

          if (!product) return item;

          const promotion = getBestPromotionForProduct(product, activePromotions);
          const originalUnitPrice = Number(product.price) || item.unitPrice;
          const unitPrice = getPromotionPrice(originalUnitPrice, promotion);

          return {
            ...item,
            originalUnitPrice,
            discountPercent: promotion ? Number(promotion.percentage) : null,
            promotionName: promotion?.name || null,
            unitPrice,
            lineTotal: unitPrice * item.quantity,
          };
        }

        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: {
            id: true,
            productId: true,
            price: true,
            stock: true,
            product: {
              select: {
                id: true,
                price: true,
                brandId: true,
                categories: { select: { categoryId: true } },
              },
            },
          },
        });

        if (!variant) {
          throw new Error(`Variante introuvable pour l'article ${item.productName}`);
        }

        if (item.productId && item.productId !== variant.productId) {
          throw new Error(`La variante selectionnee ne correspond pas au produit ${item.productName}`);
        }

        const availableStock = Math.max(0, variant.stock ?? 0);
        if (availableStock < item.quantity) {
          throw new Error(
            `Stock insuffisant pour ${item.productName}. Disponible: ${availableStock}, demande: ${item.quantity}.`
          );
        }

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { decrement: item.quantity } },
        });

        affectedProductIds.add(variant.productId);

        const originalUnitPrice = variant.price !== null && variant.price !== undefined ? Number(variant.price) : Number(variant.product.price) || item.unitPrice;
        const promotion = getBestPromotionForProduct(
          { id: variant.productId, brandId: variant.product.brandId, categories: variant.product.categories },
          activePromotions
        );
        const unitPrice = getPromotionPrice(originalUnitPrice, promotion);
        return {
          ...item,
          productId: variant.productId,
          originalUnitPrice,
          discountPercent: promotion ? Number(promotion.percentage) : null,
          promotionName: promotion?.name || null,
          unitPrice,
          lineTotal: unitPrice * item.quantity,
        };
      })
    );

    for (const productId of affectedProductIds) {
      const result = await tx.productVariant.aggregate({
        where: { productId },
        _sum: { stock: true },
      });

      await tx.product.update({
        where: { id: productId },
        data: { quantity: Math.max(0, result._sum.stock ?? 0) },
      });
    }

    const reservedSubtotal = reservedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const reservedShippingFee = getShippingFee(shippingMethod, reservedSubtotal);
    const reservedTotal = reservedSubtotal + reservedShippingFee;

    return tx.order.create({
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
        subtotal: reservedSubtotal,
        shippingFee: reservedShippingFee,
        total: reservedTotal,
        items: {
          create: reservedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            productSlug: item.productSlug,
            productImage: item.productImage,
            selectedColor: item.selectedColor,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            originalUnitPrice: item.originalUnitPrice ?? item.unitPrice,
            discountPercent: item.discountPercent,
            promotionName: item.promotionName,
            lineTotal: item.lineTotal,
          })),
        },
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: "new",
            note: "Commande créée depuis le checkout",
          },
        },
      },
      include: { items: true, statusHistory: { orderBy: { createdAt: "desc" } } },
    });
  });

  const mappedOrder = mapOrder(order);

  try {
    await sendOrderConfirmation(mappedOrder);
  } catch (error) {
    console.error("Erreur confirmation commande:", error);
  }

  return mappedOrder;
};

export const getOrderByReference = async (reference: string) => {
  const order = await prisma.order.findUnique({
    where: { reference },
    include: { items: true, statusHistory: { orderBy: { createdAt: "desc" } } },
  });
  return order ? mapOrder(order) : null;
};

export const listOrders = async (reference?: string) => {
  const query = String(reference || "").trim();
  const orders = await prisma.order.findMany({
    where: query
      ? {
          reference: { contains: query, mode: "insensitive" },
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: { items: true, statusHistory: { orderBy: { createdAt: "desc" } } },
  });
  return orders.map(mapOrder);
};

export const updateOrderStatus = async (reference: string, status: string, note?: string) => {
  if (!ORDER_STATUSES.has(status)) {
    throw new Error("Statut invalide");
  }
  const existingOrder = await prisma.order.findUnique({
    where: { reference },
    select: {
      id: true,
      status: true,
      items: {
        select: {
          variantId: true,
          quantity: true,
        },
      },
    },
  });

  if (!existingOrder) {
    throw new Error("Commande introuvable");
  }

  if (existingOrder.status !== status) {
    const allowedTargets = ORDER_STATUS_TRANSITIONS[existingOrder.status] || [];
    if (!allowedTargets.includes(status)) {
      const available = allowedTargets.length
        ? allowedTargets.join(", ")
        : "aucun changement possible";
      throw new Error(
        `Transition de statut interdite: ${existingOrder.status} -> ${status}. Statuts autorises: ${available}.`
      );
    }
  }

  const transitionKey = `${existingOrder.status}:${status}`;
  const shouldRestoreStock = existingOrder.status !== "cancelled" && status === "cancelled";

  const order = await prisma.$transaction(async (tx) => {
    if (shouldRestoreStock) {
      const affectedProductIds = new Set<number>();

      for (const item of existingOrder.items) {
        if (!item.variantId || item.quantity <= 0) continue;

        const variant = await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
          select: { productId: true },
        });

        affectedProductIds.add(variant.productId);
      }

      for (const productId of affectedProductIds) {
        const result = await tx.productVariant.aggregate({
          where: { productId },
          _sum: { stock: true },
        });

        await tx.product.update({
          where: { id: productId },
          data: { quantity: Math.max(0, result._sum.stock ?? 0) },
        });
      }
    }

    return tx.order.update({
      where: { reference },
      data: {
        status,
        ...(existingOrder.status !== status
          ? {
              statusHistory: {
                create: {
                  previousStatus: existingOrder.status,
                  newStatus: status,
                  note: String(note || ORDER_STATUS_TRANSITION_NOTES[transitionKey] || "Statut modifie depuis le backoffice").trim(),
                },
              },
            }
          : {}),
      },
      include: { items: true, statusHistory: { orderBy: { createdAt: "desc" } } },
    });
  });

  const mappedOrder = mapOrder(order);

  try {
    await sendOrderConfirmation(mappedOrder);
  } catch (error) {
    console.error("Erreur confirmation commande:", error);
  }

  return mappedOrder;
};
