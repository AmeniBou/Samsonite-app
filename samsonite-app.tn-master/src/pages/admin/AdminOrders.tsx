import { useEffect, useMemo, useState } from "react";
import {
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
  confirmed: "ConfirmÃ©e",
  preparing: "En prÃ©paration",
  shipped: "ExpÃ©diÃ©e",
  fulfilled: "LivrÃ©e",
  delivery_failed: "Ã‰chec livraison",
  cancelled: "AnnulÃ©e",
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
  preparing: "PrÃ©parer",
  shipped: "ExpÃ©dier",
  fulfilled: "Livrer",
  delivery_failed: "Ã‰chec livraison",
  cancelled: "Annuler",
};

const statusTransitionDescriptions: Record<string, string> = {
  "new:confirmed": "La commande a Ã©tÃ© vÃ©rifiÃ©e. Elle pourra ensuite passer en prÃ©paration ou Ãªtre annulÃ©e.",
  "new:cancelled": "La commande sera arrÃªtÃ©e avant confirmation. Elle deviendra finale et ne pourra plus Ãªtre rÃ©activÃ©e.",
  "confirmed:preparing": "La commande entre en prÃ©paration. Les articles doivent Ãªtre regroupÃ©s avant expÃ©dition.",
  "confirmed:cancelled": "La commande sera annulÃ©e avant prÃ©paration. Elle deviendra finale.",
  "preparing:shipped": "La commande est prÃªte et remise au livreur ou au client selon le mode de livraison.",
  "preparing:cancelled": "La commande sera annulÃ©e pendant la prÃ©paration. VÃ©rifie le stock avant de confirmer.",
  "shipped:fulfilled": "La commande sera marquÃ©e comme livrÃ©e. Ce statut est final et ne peut pas revenir en arriÃ¨re.",
  "shipped:delivery_failed": "La livraison n'a pas abouti. Tu pourras relancer une expÃ©dition ou annuler la commande.",
  "delivery_failed:shipped": "Une nouvelle tentative de livraison sera enregistrÃ©e.",
  "delivery_failed:cancelled": "La commande sera annulÃ©e aprÃ¨s l'Ã©chec de livraison. Ce statut est final.",
};

const isFinalOrderStatus = (status: OrderStatus) => statusTransitions[status].length === 0;

const statusGuides: Array<{ status: OrderStatus; description: string }> = [
  {
    status: "new",
    description: "Commande reÃ§ue depuis le checkout. Elle doit Ãªtre vÃ©rifiÃ©e avant toute prÃ©paration.",
  },
  {
    status: "confirmed",
    description: "Commande vÃ©rifiÃ©e par l'Ã©quipe: client, adresse, paiement et disponibilitÃ© sont cohÃ©rents.",
  },
  {
    status: "preparing",
    description: "Les articles sont en cours de prÃ©paration. La commande n'est pas encore remise au livreur.",
  },
  {
    status: "shipped",
    description: "Commande remise au livreur ou prÃªte Ã  Ãªtre retirÃ©e. Elle peut devenir livrÃ©e ou passer en Ã©chec livraison.",
  },
  {
    status: "delivery_failed",
    description: "La livraison n'a pas abouti. Une nouvelle tentative ou une annulation peuvent Ãªtre dÃ©cidÃ©es.",
  },
  {
    status: "fulfilled",
    description: "Commande livrÃ©e au client. Statut final, aucun retour vers un ancien statut n'est autorisÃ©.",
  },
  {
    status: "cancelled",
    description: "Commande arrÃªtÃ©e. Statut final, la commande ne peut plus Ãªtre rÃ©activÃ©e.",
  },
];

const shippingLabels: Record<ShippingMethod, string> = {
  standard: "Standard",
  express: "Express",
  pickup: "Retrait boutique",
};

const paymentLabels: Record<PaymentMethod, string> = {
  cash_on_delivery: "Paiement Ã  la livraison",
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
  const paginationStart = filteredOrders.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const paginationEnd = Math.min(filteredOrders.length, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, pageSize, paymentFilter, search, shippingFilter, sortKey, statusFilter]);

  const handleStatusChange = async (id: string, status: OrderStatus, note?: string) => {
    try {
      setUpdatingReference(id);
      const updated = await updateOrderStatus(id, status, note);
      setOrders((previous) => previous.map((order) => (order.id === id ? updated : order)));
      setSelectedOrder((previous) => (previous?.id === id ? updated : previous));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier le statut");
    } finally {
      setUpdatingReference(null);
    }
  };

  const activeFilterCount = [
    search.trim(),
    statusFilter !== "all",
    shippingFilter !== "all",
    paymentFilter !== "all",
    dateFrom,
    dateTo,
    sortKey !== "dateDesc",
  ].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;
  const filterLabelClass = "space-y-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500";
  const filterControlClass =
    "h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm font-medium normal-case text-gray-900 shadow-sm transition-colors hover:border-gray-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10";

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
    const rows = order.items
      .map(
        (item) => `
          <tr>
            <td>${htmlEscape(item.name)}${item.selectedColor ? `<br><small>Couleur: ${htmlEscape(item.selectedColor)}</small>` : ""}</td>
            <td>${item.quantity}</td>
            <td>${formatTnd(item.unitPrice)}</td>
            <td>${formatTnd(item.total)}</td>
          </tr>`
      )
      .join("");

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Commande ${order.id}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 32px; }
    header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111; padding-bottom: 18px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 24px; letter-spacing: .04em; }
    h2 { font-size: 14px; text-transform: uppercase; margin: 26px 0 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
    th:nth-child(n+2), td:nth-child(n+2) { text-align: right; }
    .muted { color: #666; font-size: 12px; }
    .box { border: 1px solid #ddd; padding: 14px; margin-top: 12px; }
    .totals { margin-left: auto; width: 280px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
    .total { border-top: 2px solid #111; margin-top: 6px; padding-top: 10px !important; font-weight: 700; font-size: 16px; }
    @media print { button { display: none; } body { margin: 18mm; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>SAMSONITE TUNISIE</h1>
      <p class="muted">9, Rue 8601 Zone Industrielle, Charguia 1, 2035 Ariana</p>
    </div>
    <div>
      <strong>Commande ${htmlEscape(order.id)}</strong><br />
      <span class="muted">${formatOrderDate(order.createdAt)}</span><br />
      <span class="muted">Statut: ${htmlEscape(statusLabels[order.status])}</span>
    </div>
  </header>
  <section class="box">
    <strong>${htmlEscape(order.customer.firstName)} ${htmlEscape(order.customer.lastName)}</strong><br />
    ${htmlEscape(order.customer.phone)} - ${htmlEscape(order.customer.email)}<br />
    ${htmlEscape(order.customer.address)}, ${htmlEscape(order.customer.city)}${order.customer.postalCode ? ` ${htmlEscape(order.customer.postalCode)}` : ""}
  </section>
  <h2>Articles</h2>
  <table>
    <thead><tr><th>Article</th><th>QtÃ©</th><th>Prix unitaire</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Sous-total</span><span>${formatTnd(order.totals.subtotal)}</span></div>
    <div><span>Livraison</span><span>${order.totals.shipping === 0 ? "Gratuite" : formatTnd(order.totals.shipping)}</span></div>
    <div class="total"><span>Total</span><span>${formatTnd(order.totals.total)}</span></div>
  </div>
  <h2>Livraison et paiement</h2>
  <p>${htmlEscape(shippingLabels[order.shippingMethod])} - ${htmlEscape(paymentLabels[order.paymentMethod])}</p>
  ${order.customer.notes ? `<h2>Notes</h2><p>${htmlEscape(order.customer.notes)}</p>` : ""}
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
  };

  const printOrder = (order: StoredOrder) => {
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      setError("Impossible d ouvrir la fenÃªtre d impression. VÃ©rifie le bloqueur de pop-up.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildOrderPrintHtml(order));
    printWindow.document.close();
  };

  const buildOrdersListPrintHtml = () => {
    const rows = filteredOrders
      .map(
        (order) => `
          <tr>
            <td>${htmlEscape(order.id)}</td>
            <td>${htmlEscape(statusLabels[order.status])}</td>
            <td>${htmlEscape(formatOrderDate(order.createdAt))}</td>
            <td>${htmlEscape(order.customer.firstName)} ${htmlEscape(order.customer.lastName)}<br><small>${htmlEscape(order.customer.phone)}</small></td>
            <td>${htmlEscape(shippingLabels[order.shippingMethod])}</td>
            <td>${htmlEscape(paymentLabels[order.paymentMethod])}</td>
            <td>${order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
            <td>${formatTnd(order.totals.total)}</td>
          </tr>`
      )
      .join("");
    const total = filteredOrders.reduce((sum, order) => sum + order.totals.total, 0);

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
    <h1>Export commandes</h1>
    <p class="muted">Samsonite Tunisie - gÃ©nÃ©rÃ© le ${htmlEscape(formatOrderDate(new Date().toISOString()))}</p>
  </header>
  <section class="summary">
    <div><strong>${filteredOrders.length}</strong><br><span class="muted">Commandes affichÃ©es</span></div>
    <div><strong>${formatTnd(total)}</strong><br><span class="muted">Total filtrÃ©</span></div>
    <div><strong>${htmlEscape(dateFrom || "DÃ©but")} - ${htmlEscape(dateTo || "Aujourd'hui")}</strong><br><span class="muted">PÃ©riode</span></div>
  </section>
  <table>
    <thead>
      <tr><th>RÃ©fÃ©rence</th><th>Statut</th><th>Date</th><th>Client</th><th>Livraison</th><th>Paiement</th><th>Articles</th><th>Total</th></tr>
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
      setError("Impossible d'ouvrir la fenÃªtre d'impression. VÃ©rifie le bloqueur de pop-up.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildOrdersListPrintHtml());
    printWindow.document.close();
  };

  const exportOrders = () => {
    const header = [
      "RÃ©fÃ©rence",
      "Date",
      "Statut",
      "Client",
      "TÃ©lÃ©phone",
      "Email",
      "Ville",
      "Livraison",
      "Paiement",
      "Articles",
      "Sous-total",
      "Frais livraison",
      "Total",
    ];
    const rows = filteredOrders.map((order) => [
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
      order.totals.subtotal,
      order.totals.shipping,
      order.totals.total,
    ]);
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
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="mt-1 text-sm text-gray-500">Suivi des commandes enregistrees depuis le checkout.</p>
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
          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Rafraichir
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Total commandes" value={stats.total} />
        <StatCard icon={PackageCheck} label="Nouvelles" value={stats.newOrders} tone="blue" />
        <StatCard icon={Truck} label="A confirmer" value={stats.confirmed} tone="amber" />
        <StatCard icon={CalendarDays} label="Aujourd'hui" value={stats.today} />
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-5 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-950 text-white">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-950">Filtres commandes</h2>
              <p className="text-xs text-gray-500">
                {filteredOrders.length} resultat{filteredOrders.length > 1 ? "s" : ""} sur {orders.length} commandes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((previous) => !previous)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-gray-950 px-4 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-gray-800"
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
              className="inline-flex h-9 items-center justify-center rounded-full border border-gray-200 px-4 text-xs font-bold uppercase tracking-wide text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reinitialiser
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="p-4">
          <div className="grid gap-3">
            <label className={filterLabelClass}>
              Recherche globale
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Client, telephone, email, ville ou produit..."
                  className="h-10 w-full rounded-md border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm font-medium text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 hover:bg-white focus:border-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className={filterLabelClass}>
              Statut
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className={filterControlClass}>
                <option value="all">Tous les statuts</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className={filterLabelClass}>
              Livraison
              <select value={shippingFilter} onChange={(event) => setShippingFilter(event.target.value as ShippingFilter)} className={filterControlClass}>
                <option value="all">Toutes livraisons</option>
                {Object.entries(shippingLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className={filterLabelClass}>
              Paiement
              <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as PaymentFilter)} className={filterControlClass}>
                <option value="all">Tous paiements</option>
                {Object.entries(paymentLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className={filterLabelClass}>
              Date dÃ©but
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className={filterControlClass}
              />
            </label>

            <label className={filterLabelClass}>
              Date fin
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className={filterControlClass}
              />
            </label>

            <label className={filterLabelClass}>
              Tri
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className={filterControlClass}>
                <option value="dateDesc">Plus recentes</option>
                <option value="dateAsc">Plus anciennes</option>
                <option value="totalDesc">Total eleve</option>
                <option value="totalAsc">Total faible</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2">
            {statusFilter !== "all" && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Statut: {statusLabels[statusFilter]}</span>
            )}
            {shippingFilter !== "all" && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Livraison: {shippingLabels[shippingFilter]}</span>
            )}
            {paymentFilter !== "all" && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Paiement: {paymentLabels[paymentFilter]}</span>
            )}
            {dateFrom && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Depuis: {dateFrom}</span>
            )}
            {dateTo && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Jusqu'au: {dateTo}</span>
            )}
            {sortKey !== "dateDesc" && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">Tri personnalise</span>
            )}
              {!hasActiveFilters && (
                <span className="text-xs font-medium text-gray-400">Aucun filtre actif</span>
              )}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-gray-300" />
          <p className="font-medium text-gray-700">Chargement des commandes...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <PackageCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-700">{orders.length === 0 ? "Aucune commande pour le moment" : "Aucune commande trouvee"}</p>
          <p className="mt-1 text-sm text-gray-500">Les commandes validees depuis le checkout apparaitront ici.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
            <span>{paginationStart}-{paginationEnd} sur {filteredOrders.length} commande(s)</span>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              Par page
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs font-bold text-gray-900"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500">
              Page {safePage} sur {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
                className="rounded-full border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-700 transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                PrÃ©cÃ©dent
              </button>
              {Array.from({ length: totalPages }).slice(0, 7).map((_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`h-9 w-9 rounded-full border text-xs font-bold transition-colors ${safePage === pageNumber ? "border-black bg-black text-white" : "border-gray-200 text-gray-700 hover:border-black"}`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              {totalPages > 7 && <span className="px-1 text-xs font-bold text-gray-400">...</span>}
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage >= totalPages}
                className="rounded-full border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-700 transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
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
            const description = statusTransitionDescriptions[transitionKey] || "Ce changement sera enregistrÃ© dans l'historique de la commande.";
            const note = description;
            const isDanger = nextStatus === "cancelled" || nextStatus === "delivery_failed";

            return (
              <ConfirmDeleteDialog
                key={nextStatus}
                title={`Passer la commande en ${statusLabels[nextStatus].toLowerCase()} ?`}
                description={`${statusLabels[order.status]} -> ${statusLabels[nextStatus]}. ${description}`}
                confirmLabel={statusActionLabels[nextStatus]}
                pendingLabel="Mise Ã  jour..."
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
          Ce workflow Ã©vite les changements incohÃ©rents. Une commande livrÃ©e ou annulÃ©e est finale et ne peut plus revenir en arriÃ¨re.
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
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Actions autorisÃ©es</p>
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
}) => (
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
            <p className="text-sm text-gray-500">Aucun historique enregistrÃ© pour cette commande.</p>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-4 font-bold text-gray-900">Client</h3>
          <div className="space-y-3 text-sm">
            <p className="text-base font-semibold text-gray-900">{order.customer.firstName} {order.customer.lastName}</p>
            <InfoLine icon={Phone} label="Telephone" value={order.customer.phone} />
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
                  <p className="mt-1 text-xs text-gray-500">{item.quantity} x {formatTnd(item.unitPrice)}</p>
                </div>
                <p className="font-bold text-gray-900">{formatTnd(item.total)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 p-4">
          <h3 className="mb-4 font-bold text-gray-900">Total</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Sous-total</span>
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
