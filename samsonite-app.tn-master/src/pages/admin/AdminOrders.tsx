import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Filter,
  CircleHelp,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";

import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import AdminTablePagination from "@/components/admin/AdminTablePagination";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { AdminActiveFilter, adminFilterControlClass, adminFilterLabelClass } from "@/components/admin/AdminFilters";
import { toast } from "@/components/ui/sonner";
import { AppSelect } from "@/components/ui/app-select";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatTnd } from "@/lib/currency";
import {
  listOrders,
  updateOrderStatus,
  type OrderStatus,
  type PaymentMethod,
  type ShippingMethod,
  type StoredOrder,
} from "@/lib/orders";

const statusLabels: Record<OrderStatus, string> = {
  new: "Nouvelle",
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipped: "Expédiée",
  fulfilled: "Livrée",
  delivery_failed: "Échec livraison",
  cancelled: "Annulée",
};

const statusClasses: Record<OrderStatus, string> = {
  new: "border-blue-100 bg-blue-50 text-blue-700",
  confirmed: "border-amber-100 bg-amber-50 text-amber-700",
  preparing: "border-violet-100 bg-violet-50 text-violet-700",
  shipped: "border-cyan-100 bg-cyan-50 text-cyan-700",
  fulfilled: "border-emerald-100 bg-emerald-50 text-emerald-700",
  delivery_failed: "border-orange-100 bg-orange-50 text-orange-700",
  cancelled: "border-red-100 bg-red-50 text-red-700",
};

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["fulfilled", "delivery_failed"],
  delivery_failed: ["shipped", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

const statusActionLabels: Record<OrderStatus, string> = {
  new: "Marquer nouvelle",
  confirmed: "Confirmer",
  preparing: "Préparer",
  shipped: "Expédier",
  fulfilled: "Livrer",
  delivery_failed: "Échec livraison",
  cancelled: "Annuler",
};

const statusConfirmLabels: Record<OrderStatus, string> = {
  new: "Oui, marquer comme nouvelle",
  confirmed: "Oui, confirmer la commande",
  preparing: "Oui, passer en préparation",
  shipped: "Oui, marquer comme expédiée",
  fulfilled: "Oui, marquer comme livrée",
  delivery_failed: "Oui, déclarer l'échec de livraison",
  cancelled: "Oui, annuler définitivement",
};

const statusTransitionDescriptions: Record<string, string> = {
  "new:confirmed": "La commande a été vérifiée. Elle pourra ensuite passer en préparation ou être annulée.",
  "new:cancelled": "La commande sera arrêtée avant confirmation. Elle deviendra finale et ne pourra plus être réactivée.",
  "confirmed:preparing": "La commande entre en préparation. Les articles doivent être regroupés avant expédition.",
  "confirmed:cancelled": "La commande sera annulée avant préparation. Elle deviendra finale.",
  "preparing:shipped": "La commande est prête et remise au livreur ou au client selon le mode de livraison.",
  "preparing:cancelled": "La commande sera annulée pendant la préparation. Vérifie le stock avant de confirmer.",
  "shipped:fulfilled": "La commande sera marquée comme livrée. Ce statut est final et ne peut pas revenir en arrière.",
  "shipped:delivery_failed": "La livraison n'a pas abouti. Tu pourras relancer une expédition ou annuler la commande.",
  "delivery_failed:shipped": "Une nouvelle tentative de livraison sera enregistrée.",
  "delivery_failed:cancelled": "La commande sera annulée après l'échec de livraison. Ce statut est final.",
};

const isFinalOrderStatus = (status: OrderStatus) => statusTransitions[status].length === 0;

const statusGuides: Array<{ status: OrderStatus; description: string }> = [
  {
    status: "new",
    description: "Commande reçue depuis le checkout. Elle doit être vérifiée avant toute préparation.",
  },
  {
    status: "confirmed",
    description: "Commande vérifiée par l'équipe: client, adresse, paiement et disponibilité sont cohérents.",
  },
  {
    status: "preparing",
    description: "Les articles sont en cours de préparation. La commande n'est pas encore remise au livreur.",
  },
  {
    status: "shipped",
    description: "Commande remise au livreur ou prête à être retirée. Elle peut devenir livrée ou passer en échec livraison.",
  },
  {
    status: "delivery_failed",
    description: "La livraison n'a pas abouti. Une nouvelle tentative ou une annulation peuvent être décidées.",
  },
  {
    status: "fulfilled",
    description: "Commande livrée au client. Statut final, aucun retour vers un ancien statut n'est autorisé.",
  },
  {
    status: "cancelled",
    description: "Commande arrêtée. Statut final, la commande ne peut plus être réactivée.",
  },
];

const shippingLabels: Record<ShippingMethod, string> = {
  standard: "Standard",
  express: "Express",
  pickup: "Retrait boutique",
};

const shippingDelays: Record<ShippingMethod, string> = {
  standard: "Livraison estimée sous 2 à 4 jours ouvrables après confirmation.",
  express: "Livraison prioritaire sous 24 à 48h ouvrables après confirmation.",
  pickup: "Retrait possible après confirmation de la disponibilité par notre équipe.",
};

const paymentLabels: Record<PaymentMethod, string> = {
  cash_on_delivery: "Paiement à la livraison",
  bank_transfer: "Virement bancaire",
};

type StatusFilter = "all" | OrderStatus;
type ShippingFilter = "all" | ShippingMethod;
type PaymentFilter = "all" | PaymentMethod;
type SortKey = "dateDesc" | "dateAsc" | "totalDesc" | "totalAsc";

const formatOrderDate = (date: string) =>
  new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));

const htmlEscape = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatDateForPdf = (dateValue: string | null | undefined, fallback: string) => {
  if (!dateValue) return fallback;
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return new Intl.DateTimeFormat("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
};

const formatDisplayDate = (dateValue: string | null | undefined) => {
  if (!dateValue) return "";
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;

  return new Intl.DateTimeFormat("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
};

const getOriginalUnitPrice = (item: StoredOrder["items"][number]) => {
  const originalUnitPrice = Number(item.originalUnitPrice);
  return Number.isFinite(originalUnitPrice) && originalUnitPrice > item.unitPrice ? originalUnitPrice : item.unitPrice;
};

const hasItemPromotion = (item: StoredOrder["items"][number]) => getOriginalUnitPrice(item) > item.unitPrice;

const getOrderPromotionSavings = (order: StoredOrder) =>
  order.items.reduce((total, item) => total + (getOriginalUnitPrice(item) - item.unitPrice) * item.quantity, 0);

const getOrderPromotionNames = (order: StoredOrder) =>
  [...new Set(order.items.filter(hasItemPromotion).map((item) => item.promotionName || (item.discountPercent ? `-${item.discountPercent}%` : "Promotion")))]
    .join(", ");

const AdminOrders = () => {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [shippingFilter, setShippingFilter] = useState<ShippingFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("dateDesc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState<StoredOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingReference, setUpdatingReference] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      setOrders(await listOrders());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les commandes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) => order.status !== "cancelled");
    const today = new Date().toDateString();

    return {
      total: orders.length,
      newOrders: orders.filter((order) => order.status === "new").length,
      confirmed: orders.filter((order) => order.status === "confirmed").length,
      today: orders.filter((order) => new Date(order.createdAt).toDateString() === today).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const customer = `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase();
      const itemNames = order.items.map((item) => item.name).join(" ").toLowerCase();
      const orderDate = new Date(order.createdAt);
      const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
      const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
      const matchesSearch =
        !query ||
        order.id.toLowerCase().includes(query) ||
        customer.includes(query) ||
        order.customer.phone.toLowerCase().includes(query) ||
        order.customer.email.toLowerCase().includes(query) ||
        order.customer.city.toLowerCase().includes(query) ||
        itemNames.includes(query);

      return (
        matchesSearch &&
        (statusFilter === "all" || order.status === statusFilter) &&
        (shippingFilter === "all" || order.shippingMethod === shippingFilter) &&
        (paymentFilter === "all" || order.paymentMethod === paymentFilter) &&
        (!fromDate || orderDate >= fromDate) &&
        (!toDate || orderDate <= toDate)
      );
    });

    return filtered.sort((a, b) => {
      if (sortKey === "dateAsc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === "totalDesc") return b.totals.total - a.totals.total;
      if (sortKey === "totalAsc") return a.totals.total - b.totals.total;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [dateFrom, dateTo, orders, paymentFilter, search, shippingFilter, sortKey, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, pageSize, safePage]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, pageSize, paymentFilter, search, shippingFilter, sortKey, statusFilter]);

  const handleStatusChange = async (id: string, status: OrderStatus, note?: string) => {
    try {
      setUpdatingReference(id);
      const updated = await updateOrderStatus(id, status, note);
      setOrders((previous) => previous.map((order) => (order.id === id ? updated : order)));
      setSelectedOrder((previous) => (previous?.id === id ? updated : previous));
      toast.success(`Le statut de la commande ${id} a été mis à jour : ${statusLabels[status]}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de modifier le statut";
      setError(message);
    } finally {
      setUpdatingReference(null);
    }
  };

  const activeFilterCount = [
    statusFilter !== "all",
    shippingFilter !== "all",
    paymentFilter !== "all",
    dateFrom,
    dateTo,
    sortKey !== "dateDesc",
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0 || Boolean(search.trim());

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setShippingFilter("all");
    setPaymentFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortKey("dateDesc");
    setPage(1);
    loadOrders();
  };


  const buildOrderPrintHtml = (order: StoredOrder) => {
    const promotionSavings = getOrderPromotionSavings(order);
    const subtotalBeforePromotion = order.totals.subtotal + promotionSavings;
    const rows = order.items
      .map(
        (item) => `
          <tr>
            <td>
              <strong>${htmlEscape(item.name)}</strong>
              <small>${htmlEscape([item.selectedColor ? `Couleur: ${item.selectedColor}` : "", item.selectedSize ? `Taille: ${item.selectedSize}` : "", item.sku ? `Réf.: ${item.sku}` : ""].filter(Boolean).join(" · "))}</small>
            </td>
            <td class="center">${item.quantity}</td>
            <td class="right">
              ${hasItemPromotion(item) ? `<small>Prix avant promo : <s>${htmlEscape(formatTnd(getOriginalUnitPrice(item)))}</s></small><small>Promotion appliquée${item.promotionName ? ` (${htmlEscape(item.promotionName)})` : ""}${item.discountPercent ? ` : -${htmlEscape(item.discountPercent)}%` : ""}</small>` : ""}
              ${htmlEscape(formatTnd(item.unitPrice))}
            </td>
            <td class="right">${htmlEscape(formatTnd(item.total))}</td>
          </tr>`
      )
      .join("");

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Commande ${order.id}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; background: #fff; }
    .invoice { width: 190mm; min-height: 270mm; margin: 0 auto; padding: 18mm 14mm; }
    .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #111; padding-bottom: 18px; }
    .brand { font-size: 28px; font-weight: 900; letter-spacing: -1px; }
    .muted { color: #666; }
    .meta { text-align: right; font-size: 12px; line-height: 1.7; }
    h1 { margin: 26px 0 8px; font-size: 24px; text-transform: uppercase; letter-spacing: 0.08em; }
    h2 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 22px 0; }
    .box { border: 1px solid #ddd; padding: 14px; min-height: 118px; font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
    th { background: #f4f4f4; text-align: left; padding: 10px; border-bottom: 1px solid #ccc; text-transform: uppercase; font-size: 11px; }
    td { padding: 12px 10px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    small { display: block; margin-top: 4px; color: #666; line-height: 1.4; }
    .center { text-align: center; }
    .right { text-align: right; }
    .totals { width: 78mm; margin-left: auto; margin-top: 18px; font-size: 13px; }
    .totals div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
    .totals .grand { font-size: 17px; font-weight: 900; border-bottom: 3px solid #111; }
    .footer { margin-top: 34px; border-top: 1px solid #ddd; padding-top: 14px; font-size: 11px; line-height: 1.6; color: #555; }
    .actions { position: fixed; right: 18px; top: 18px; display: flex; gap: 8px; }
    button { border: 1px solid #111; background: #111; color: #fff; padding: 10px 14px; font-weight: 700; cursor: pointer; }
    @media print { @page { size: A4; margin: 0; } .actions { display: none; } .invoice { margin: 0; width: auto; min-height: auto; padding: 16mm 14mm; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Imprimer / PDF</button><button onclick="window.close()">Fermer</button></div>
  <main class="invoice">
  <header class="top">
    <div><div class="brand">Samsonite</div><p class="muted">9, Rue 8601 Zone Industrielle<br />Charguia 1, 2035 Ariana, Tunisie</p></div>
    <div class="meta"><strong>Détails de la commande</strong><br />Référence : ${htmlEscape(order.id)}<br />Date : ${htmlEscape(formatOrderDate(order.createdAt))}<br />Statut : ${htmlEscape(statusLabels[order.status])}</div>
  </header>
  <h1>Récapitulatif de commande</h1>
  <p class="muted">Document généré pour la commande ${htmlEscape(order.id)}.</p>
  <section class="grid">
    <div class="box"><h2>Client</h2><strong>${htmlEscape(order.customer.firstName)} ${htmlEscape(order.customer.lastName)}</strong><br />${htmlEscape(order.customer.email)}<br />${htmlEscape(order.customer.phone)}</div>
    <div class="box"><h2>Adresse de livraison</h2>${htmlEscape(order.customer.address)}<br />${htmlEscape([order.customer.postalCode, order.customer.city].filter(Boolean).join(" "))}<br />Tunisie</div>
  </section>
  <section class="grid">
    <div class="box"><h2>Livraison</h2>${htmlEscape(shippingLabels[order.shippingMethod])}<br />${htmlEscape(shippingDelays[order.shippingMethod])}</div>
    <div class="box"><h2>Paiement</h2>${htmlEscape(paymentLabels[order.paymentMethod])}</div>
  </section>
  <table>
    <thead><tr><th>Articles</th><th class="center">Qté</th><th class="right">Prix unitaire</th><th class="right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    ${promotionSavings > 0 ? `<div><span>Sous-total avant promo</span><span>${formatTnd(subtotalBeforePromotion)}</span></div>
    <div><span>Promotion appliquée</span><span>-${formatTnd(promotionSavings)}</span></div>` : ""}
    <div><span>Sous-total</span><strong>${formatTnd(order.totals.subtotal)}</strong></div>
    <div><span>Livraison</span><strong>${order.totals.shipping === 0 ? "Gratuite" : formatTnd(order.totals.shipping)}</strong></div>
    <div class="grand"><span>Total</span><span>${formatTnd(order.totals.total)}</span></div>
  </div>
  ${order.customer.notes ? `<section class="box" style="min-height: auto; margin-top: 22px;"><h2>Note client</h2>${htmlEscape(order.customer.notes)}</section>` : ""}
  <footer class="footer">Samsonite Tunisie · Appelez-nous: 26 528 103 / 71 809 209 · commercial@samsonite.com.tn<br />Merci pour votre confiance.</footer>
  </main>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
  };

  const printOrder = (order: StoredOrder) => {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Impossible d'ouvrir la fenêtre d'impression. Vérifie le bloqueur de pop-up.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildOrderPrintHtml(order));
    printWindow.document.close();
  };

  const buildOrdersListPrintHtml = () => {
    const rows = filteredOrders
      .map((order) => {
        const promotionSavings = getOrderPromotionSavings(order);
        return `
          <tr>
            <td>${htmlEscape(order.id)}</td>
            <td>${htmlEscape(statusLabels[order.status])}</td>
            <td>${htmlEscape(formatOrderDate(order.createdAt))}</td>
            <td>${htmlEscape(order.customer.firstName)} ${htmlEscape(order.customer.lastName)}<br><small>${htmlEscape(order.customer.phone)}</small></td>
            <td>${htmlEscape(shippingLabels[order.shippingMethod])}</td>
            <td>${htmlEscape(paymentLabels[order.paymentMethod])}</td>
            <td>${order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
            <td>${promotionSavings > 0 ? htmlEscape(getOrderPromotionNames(order)) : "—"}</td>
            <td>${promotionSavings > 0 ? `-${formatTnd(promotionSavings)}` : "—"}</td>
            <td>${formatTnd(order.totals.total)}</td>
          </tr>`;
      })
      .join("");
    const total = filteredOrders.reduce((sum, order) => sum + order.totals.total, 0);
    const periodStart = formatDateForPdf(dateFrom, "Début");
    const periodEnd = formatDateForPdf(dateTo, "Aujourd'hui");
    const hasPeriodFilter = Boolean(dateFrom || dateTo);
    const periodSummary = hasPeriodFilter
      ? `${periodStart} - ${periodEnd}`
      : "Toute la période";
    const periodExplanation = hasPeriodFilter
      ? `Période sélectionnée : commandes du ${periodStart} au ${periodEnd}.`
      : "Période : toutes les commandes enregistrées.";

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Export commandes Samsonite</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 32px; }
    header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 22px; }
    h1 { margin: 0; font-size: 24px; letter-spacing: .04em; text-transform: uppercase; }
    .muted { color: #666; font-size: 12px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
    .summary div { border: 1px solid #ddd; padding: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #ddd; padding: 9px; text-align: left; vertical-align: top; }
    th:last-child, td:last-child { text-align: right; }
    small { color: #666; }
    @media print { body { margin: 14mm; } }
  </style>
</head>
<body>
  <header>
    <h1>Commandes valises Samsonite</h1>
    <p class="muted">Samsonite Tunisie - généré le ${htmlEscape(formatOrderDate(new Date().toISOString()))}</p>
  </header>
  <section class="summary">
    <div><strong>${filteredOrders.length}</strong><br><span class="muted">Commandes affichées</span></div>
    <div><strong>${formatTnd(total)}</strong><br><span class="muted">Total filtré</span></div>
    <div><strong>${htmlEscape(periodSummary)}</strong><br><span class="muted">${htmlEscape(periodExplanation)}</span></div>
  </section>
  <table>
    <thead>
      <tr><th>Référence</th><th>Statut</th><th>Date</th><th>Client</th><th>Livraison</th><th>Paiement</th><th>Articles</th><th>Promotion</th><th>Économie promo</th><th>Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
  };

  const printOrdersList = () => {
    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) {
      setError("Impossible d'ouvrir la fenêtre d'impression. Vérifie le bloqueur de pop-up.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildOrdersListPrintHtml());
    printWindow.document.close();
  };

  const exportOrders = () => {
    const header = [
      "Référence",
      "Date",
      "Statut",
      "Client",
      "Téléphone",
      "Email",
      "Ville",
      "Livraison",
      "Paiement",
      "Articles",
      "Sous-total avant promo",
      "Promotion(s) appliquée(s)",
      "Économie promotions",
      "Sous-total après promo",
      "Frais livraison",
      "Total",
    ];
    const rows = filteredOrders.map((order) => {
      const promotionSavings = getOrderPromotionSavings(order);
      return [
        order.id,
        formatOrderDate(order.createdAt),
        statusLabels[order.status],
        `${order.customer.firstName} ${order.customer.lastName}`,
        order.customer.phone,
        order.customer.email,
        order.customer.city,
        shippingLabels[order.shippingMethod],
        paymentLabels[order.paymentMethod],
        order.items.reduce((sum, item) => sum + item.quantity, 0),
        order.totals.subtotal + promotionSavings,
        getOrderPromotionNames(order),
        promotionSavings,
        order.totals.subtotal,
        order.totals.shipping,
        order.totals.total,
      ];
    });
    const tableRows = [header, ...rows]
      .map(
        (row, rowIndex) =>
          `<tr>${row
            .map((cell) => `<${rowIndex === 0 ? "th" : "td"}>${htmlEscape(cell)}</${rowIndex === 0 ? "th" : "td"}>`)
            .join("")}</tr>`
      )
      .join("");
    const workbook = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #111; color: #fff; font-weight: 700; }
    th, td { border: 1px solid #d9d9d9; padding: 8px; mso-number-format:"\\@"; }
  </style>
</head>
<body>
  <table>${tableRows}</table>
</body>
</html>`;
    const blob = new Blob(["\ufeff", workbook], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `commandes-samsonite-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-950">Commandes</h1>
          <p className="mt-1 text-sm text-gray-500">Suivi des commandes enregistrées depuis le checkout.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderStatusHelpDialog />
          <button
            type="button"
            onClick={exportOrders}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={printOrdersList}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
         
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Total commandes" value={stats.total} />
        <StatCard icon={PackageCheck} label="Nouvelles" value={stats.newOrders} tone="blue" />
        <StatCard icon={Truck} label="A confirmer" value={stats.confirmed} tone="amber" />
        <StatCard icon={CalendarDays} label="Aujourd'hui" value={stats.today} />
      </div>

      <div className="mb-5 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-950 text-white">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-950">Filtres des commandes</h2>
              <p className="text-xs text-gray-500">
                {filteredOrders.length} résultat{filteredOrders.length !== 1 ? "s" : ""} sur {orders.length} commande{orders.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((previous) => !previous)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-gray-950 px-3 text-xs font-bold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-950/20"
              aria-expanded={filtersOpen}
            >
              {filtersOpen ? "Masquer les filtres" : "Afficher les filtres"}
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-950">
                  {activeFilterCount}
                </span>
              )}
              {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-9 items-center justify-center rounded-full border border-gray-200 px-3 text-xs font-bold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-950/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid gap-3">
            <label className={adminFilterLabelClass}>
              Recherche globale
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  aria-label="Rechercher dans les commandes"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Client, téléphone, email, ville ou produit..."
                  className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-3 text-sm font-medium text-gray-900 shadow-sm transition-colors placeholder:font-normal placeholder:text-gray-400 hover:border-gray-400 hover:bg-white focus:border-gray-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-950/10"
                />
              </div>
            </label>
          </div>

          {filtersOpen && (
          <>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className={adminFilterLabelClass}>
              Statut
              <AppSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className={adminFilterControlClass}>
                <option value="all">Tous les statuts</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </AppSelect>
            </label>

            <label className={adminFilterLabelClass}>
              Livraison
              <AppSelect value={shippingFilter} onChange={(event) => setShippingFilter(event.target.value as ShippingFilter)} className={adminFilterControlClass}>
                <option value="all">Toutes les livraisons</option>
                {Object.entries(shippingLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </AppSelect>
            </label>

            <label className={adminFilterLabelClass}>
              Paiement
              <AppSelect value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)} className={adminFilterControlClass}>
                <option value="all">Tous les paiements</option>
                {Object.entries(paymentLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </AppSelect>
            </label>

            <label className={adminFilterLabelClass}>
              Date début
              <DatePickerField
                locale="fr"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className={adminFilterControlClass}
              />
            </label>

            <label className={adminFilterLabelClass}>
              Date fin
              <DatePickerField
                locale="fr"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className={adminFilterControlClass}
              />
            </label>

            <label className={adminFilterLabelClass}>
              Tri
              <AppSelect value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className={adminFilterControlClass}>
                <option value="dateDesc">Plus récentes</option>
                <option value="dateAsc">Plus anciennes</option>
                <option value="totalDesc">Total élevé</option>
                <option value="totalAsc">Total faible</option>
              </AppSelect>
            </label>
          </div>

          </>
          )}
          {(statusFilter !== "all" || shippingFilter !== "all" || paymentFilter !== "all" || dateFrom || dateTo || sortKey !== "dateDesc") && (
          <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
            {statusFilter !== "all" && <AdminActiveFilter label={`Statut : ${statusLabels[statusFilter]}`} onRemove={() => setStatusFilter("all")} />}
            {shippingFilter !== "all" && <AdminActiveFilter label={`Livraison : ${shippingLabels[shippingFilter]}`} onRemove={() => setShippingFilter("all")} />}
            {paymentFilter !== "all" && <AdminActiveFilter label={`Paiement : ${paymentLabels[paymentFilter]}`} onRemove={() => setPaymentFilter("all")} />}
            {dateFrom && <AdminActiveFilter label={`Depuis : ${formatDisplayDate(dateFrom)}`} onRemove={() => setDateFrom("")} />}
            {dateTo && <AdminActiveFilter label={`Jusqu’au : ${formatDisplayDate(dateTo)}`} onRemove={() => setDateTo("")} />}
            {sortKey !== "dateDesc" && <AdminActiveFilter label="Tri personnalisé" onRemove={() => setSortKey("dateDesc")} />}
          </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-gray-300" />
          <p className="font-medium text-gray-700">Chargement des commandes...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <AdminEmptyState
          icon={PackageCheck}
          title={orders.length === 0 ? "Aucune commande enregistrée" : "Aucune commande trouvée"}
          description={orders.length === 0
            ? "Les commandes validées depuis le parcours d’achat apparaîtront ici."
            : "Aucune commande ne correspond à la recherche ou aux filtres sélectionnés."}
          bordered
        />
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Référence</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Livraison</th>
                  <th className="px-4 py-3 font-medium">Articles</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="align-top transition-colors hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-bold text-gray-900">{order.id}</p>
                      <p className="mt-1 text-xs text-gray-500">{paymentLabels[order.paymentMethod]}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{order.customer.firstName} {order.customer.lastName}</p>
                      <p className="mt-1 text-xs text-gray-500">{order.customer.phone}</p>
                      <p className="text-xs text-gray-500">{order.customer.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-bold text-gray-900">{shippingLabels[order.shippingMethod]}</p>
                      <p className="mt-1 max-w-[220px] text-xs text-gray-500">{order.customer.address}, {order.customer.city}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        {order.items.slice(0, 2).map((item) => (
                          <div key={`${order.id}-${item.productId}-${item.selectedColor}`} className="flex gap-2">
                            <img src={item.image} alt="" className="h-10 w-10 rounded bg-white object-contain" />
                            <div>
                              <p className="max-w-[220px] truncate text-xs font-medium">{item.name}</p>
                              <p className="text-xs text-gray-500">{item.quantity} x {formatTnd(item.unitPrice)}</p>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 2 && <p className="text-xs font-semibold text-gray-500">+ {order.items.length - 2} autre(s)</p>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-bold">{formatTnd(order.totals.total)}</td>
                    <td className="px-4 py-4 text-xs text-gray-500">{formatOrderDate(order.createdAt)}</td>
                    <td className="px-4 py-4">
                      <OrderStatusControl
                        order={order}
                        onStatusChange={handleStatusChange}
                        updating={updatingReference === order.id}
                        compact
                      />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button type="button" onClick={() => setSelectedOrder(order)} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-50">
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminTablePagination page={safePage} pageSize={pageSize} totalItems={filteredOrders.length} pageSizeOptions={[5, 10, 20, 50]} onPageChange={setPage} onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); }} />
        </div>
      )}

      {selectedOrder && (
        <OrderDetailPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} onPrint={printOrder} updating={updatingReference === selectedOrder.id} />
      )}
    </div>
  );
};

const OrderStatusControl = ({
  order,
  onStatusChange,
  updating,
  compact = false,
}: {
  order: StoredOrder;
  onStatusChange: (id: string, status: OrderStatus, note?: string) => void;
  updating: boolean;
  compact?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const nextStatuses = statusTransitions[order.status] || [];

  return (
    <div className={compact ? "space-y-2" : "flex flex-wrap items-center justify-end gap-2"}>
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[order.status]}`}>
        {statusLabels[order.status]}
      </span>
      {isFinalOrderStatus(order.status) ? (
        <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          Statut final
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            disabled={updating}
            className="inline-flex items-center justify-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-700 transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            Actions
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {open && <div className={compact ? "flex flex-col gap-1" : "flex flex-wrap gap-2"}>
          {nextStatuses.map((nextStatus) => {
            const transitionKey = `${order.status}:${nextStatus}`;
            const description = statusTransitionDescriptions[transitionKey] || "Ce changement sera enregistré dans l'historique de la commande.";
            const note = description;
            const isDanger = nextStatus === "cancelled" || nextStatus === "delivery_failed";

            return (
              <ConfirmDeleteDialog
                key={nextStatus}
                title={`Passer la commande en ${statusLabels[nextStatus].toLowerCase()} ?`}
                description={`${statusLabels[order.status]} -> ${statusLabels[nextStatus]}. ${description}`}
                confirmLabel={statusConfirmLabels[nextStatus]}
                pendingLabel="Mise à jour..."
                tone={isDanger ? "warning" : "info"}
                disabled={updating}
                onConfirm={() => onStatusChange(order.id, nextStatus, note)}
              >
                {(openDialog) => (
                  <button
                    type="button"
                    onClick={openDialog}
                    disabled={updating}
                    className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      isDanger
                        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "border-gray-200 bg-white text-gray-800 hover:border-black hover:bg-gray-50"
                    }`}
                  >
                    {statusActionLabels[nextStatus]}
                  </button>
                )}
              </ConfirmDeleteDialog>
            );
          })}
          </div>}
        </>
      )}
    </div>
  );
};
const OrderStatusHelpDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold transition-colors hover:border-black hover:bg-gray-50"
      >
        <CircleHelp className="h-4 w-4" />
        Guide statuts
      </button>
    </DialogTrigger>
    <DialogContent className="max-h-[85vh] max-w-3xl overflow-auto rounded-none border-0 p-0 sm:rounded-none">
      <div className="border-b border-gray-200 px-6 py-5">
        <DialogTitle className="text-xl font-black uppercase tracking-tight">Guide des statuts de commande</DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-6 text-gray-500">
          Ce workflow évite les changements incohérents. Une commande livrée ou annulée est finale et ne peut plus revenir en arrière.
        </DialogDescription>
      </div>
      <div className="space-y-3 px-6 py-5">
        {statusGuides.map(({ status, description }) => {
          const nextStatuses = statusTransitions[status];
          return (
            <div key={status} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[status]}`}>
                    {statusLabels[status]}
                  </span>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{description}</p>
                </div>
                {isFinalOrderStatus(status) && (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Statut final
                  </span>
                )}
              </div>
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Actions autorisées</p>
                {nextStatuses.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {nextStatuses.map((nextStatus) => (
                      <span key={nextStatus} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">
                        {statusLabels[nextStatus]}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-medium text-gray-500">Aucun changement possible.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DialogContent>
  </Dialog>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
  tone = "gray",
}: {
  icon: typeof PackageCheck;
  label: string;
  value: string | number;
  tone?: "gray" | "blue" | "amber" | "emerald";
}) => {
  const toneClasses = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-full p-2 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const OrderDetailPanel = ({
  order,
  onClose,
  onStatusChange,
  updating,
  onPrint,
}: {
  order: StoredOrder;
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus, note?: string) => void;
  onPrint: (order: StoredOrder) => void;
  updating: boolean;
}) => {
  const promotionSavings = getOrderPromotionSavings(order);
  const subtotalBeforePromotion = order.totals.subtotal + promotionSavings;

  return (
  <div className="fixed inset-0 z-50 flex justify-end bg-black/35">
    <aside className="h-full w-full max-w-2xl overflow-auto bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white p-6">
        <div>
          <p className="font-mono text-xs font-bold text-gray-500">{order.id}</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">Detail commande</h2>
          <p className="mt-1 text-sm text-gray-500">{formatOrderDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onPrint(order)} className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold transition-colors hover:bg-gray-50">
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
          <button type="button" onClick={onClose} className="rounded-full border border-gray-200 p-2 transition-colors hover:bg-gray-50">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <section className="rounded-lg border border-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900">Statut</h3>
            <OrderStatusControl order={order} onStatusChange={onStatusChange} updating={updating} />
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <InfoLine icon={Truck} label="Livraison" value={shippingLabels[order.shippingMethod]} />
            <InfoLine icon={PackageCheck} label="Paiement" value={paymentLabels[order.paymentMethod]} />
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-4 font-bold text-gray-900">Historique du statut</h3>
          {order.statusHistory && order.statusHistory.length > 0 ? (
            <div className="space-y-3">
              {order.statusHistory.map((entry) => (
                <div key={entry.id} className="relative border-l-2 border-gray-200 pl-4">
                  <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-gray-900" />
                  <p className="text-sm font-bold text-gray-900">
                    {entry.previousStatus ? `${statusLabels[entry.previousStatus as OrderStatus] || entry.previousStatus} -> ` : ""}
                    {statusLabels[entry.newStatus] || entry.newStatus}
                  </p>
                  <p className="text-xs text-gray-500">{formatOrderDate(entry.createdAt)}</p>
                  {entry.note && <p className="mt-1 text-sm text-gray-600">{entry.note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucun historique enregistré pour cette commande.</p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-4 font-bold text-gray-900">Client</h3>
          <div className="space-y-3 text-sm">
            <p className="text-base font-semibold text-gray-900">{order.customer.firstName} {order.customer.lastName}</p>
            <InfoLine icon={Phone} label="Téléphone" value={order.customer.phone} />
            <InfoLine icon={Mail} label="Email" value={order.customer.email} />
            <InfoLine icon={MapPin} label="Adresse" value={`${order.customer.address}, ${order.customer.city}${order.customer.postalCode ? ` ${order.customer.postalCode}` : ""}`} />
            {order.customer.notes && (
              <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                <span className="font-bold text-gray-900">Notes: </span>
                {order.customer.notes}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-4 font-bold text-gray-900">Articles commandes</h3>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={`${item.productId}-${item.slug}-${item.selectedColor}`} className="flex gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <img src={item.image} alt="" className="h-16 w-16 rounded bg-white object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  {item.selectedColor && <p className="text-xs text-gray-500">Couleur: {item.selectedColor}</p>}
                  {hasItemPromotion(item) ? (
                    <div className="mt-1 space-y-1 text-xs">
                      <p className="text-gray-400 line-through">Prix avant promo : {formatTnd(getOriginalUnitPrice(item))}</p>
                      <p className="flex items-center gap-1 font-semibold text-red-600">
                        <BadgePercent className="h-3.5 w-3.5" />
                        Promotion appliquée{item.discountPercent ? ` : -${item.discountPercent}%` : ""}{item.promotionName ? ` · ${item.promotionName}` : ""}
                      </p>
                      <p className="text-gray-600">Prix après promo : {item.quantity} x {formatTnd(item.unitPrice)}</p>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">{item.quantity} x {formatTnd(item.unitPrice)}</p>
                  )}
                </div>
                <p className="font-bold text-gray-900">{formatTnd(item.total)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-4 font-bold text-gray-900">Total</h3>
          <div className="space-y-2 text-sm">
            {promotionSavings > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sous-total avant promo</span>
                  <span className="text-gray-500 line-through">{formatTnd(subtotalBeforePromotion)}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-red-50 px-2 py-1.5 text-red-600">
                  <span className="inline-flex items-center gap-1 font-semibold"><BadgePercent className="h-4 w-4" />Promotion appliquée</span>
                  <span className="font-bold">-{formatTnd(promotionSavings)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Sous-total après promo</span>
              <span>{formatTnd(order.totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Livraison</span>
              <span>{order.totals.shipping === 0 ? "Gratuite" : formatTnd(order.totals.shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatTnd(order.totals.total)}</span>
            </div>
          </div>
        </section>
      </div>
    </aside>
  </div>
  );
};

const InfoLine = ({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) => (
  <div className="flex gap-3">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  </div>
);

export default AdminOrders;
