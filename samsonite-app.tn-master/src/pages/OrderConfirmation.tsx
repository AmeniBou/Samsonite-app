import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  Printer,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { formatTnd } from "@/lib/currency";
import { getOrder, type PaymentMethod, type ShippingMethod, type StoredOrder } from "@/lib/orders";
import { useLanguage } from "@/lib/i18n";

const shippingLabels: Record<ShippingMethod, string> = {
  standard: "Livraison standard",
  express: "Livraison express",
  pickup: "Retrait en boutique",
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

const statusLabels: Record<StoredOrder["status"], string> = {
  new: "Commande reçue",
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipped: "Expédiée",
  fulfilled: "Livrée",
  delivery_failed: "Échec livraison",
  cancelled: "Annulée",
};

const formatOrderDate = (date: string) =>
  new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date));

const htmlEscape = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildOrderDetailsHtml = (order: StoredOrder, customerName: string) => {
  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${htmlEscape(item.name)}</strong>
            <small>${htmlEscape([item.selectedColor, item.selectedSize, item.sku ? `Réf: ${item.sku}` : ""].filter(Boolean).join(" · "))}</small>
          </td>
          <td class="center">${item.quantity}</td>
          <td class="right">${htmlEscape(formatTnd(item.unitPrice))}</td>
          <td class="right">${htmlEscape(formatTnd(item.total))}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Détails de commande ${htmlEscape(order.id)}</title>
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
    @media print {
      @page { size: A4; margin: 0; }
      .actions { display: none; }
      .invoice { margin: 0; width: auto; min-height: auto; padding: 16mm 14mm; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Imprimer / PDF</button>
    <button onclick="window.close()">Fermer</button>
  </div>
  <main class="invoice">
    <header class="top">
      <div>
        <div class="brand">Samsonite</div>
        <p class="muted">9, Rue 8601 Zone Industrielle<br />Charguia 1, 2035 Ariana, Tunisie</p>
      </div>
      <div class="meta">
        <strong>Détails de commande</strong><br />
        Référence: ${htmlEscape(order.id)}<br />
        Date: ${htmlEscape(formatOrderDate(order.createdAt))}<br />
        Statut: ${htmlEscape(statusLabels[order.status] || order.status)}
      </div>
    </header>

    <h1>Récapitulatif de commande</h1>
    <p class="muted">Document généré pour la commande ${htmlEscape(order.id)}.</p>

    <section class="grid">
      <div class="box">
        <h2>Client</h2>
        <strong>${htmlEscape(customerName || "Client")}</strong><br />
        ${htmlEscape(order.customer.email)}<br />
        ${htmlEscape(order.customer.phone)}
      </div>
      <div class="box">
        <h2>Adresse de livraison</h2>
        ${htmlEscape(order.customer.address)}<br />
        ${htmlEscape([order.customer.postalCode, order.customer.city].filter(Boolean).join(" "))}<br />
        Tunisie
      </div>
    </section>

    <section class="grid">
      <div class="box">
        <h2>Livraison</h2>
        ${htmlEscape(shippingLabels[order.shippingMethod])}<br />
        ${htmlEscape(shippingDelays[order.shippingMethod])}
      </div>
      <div class="box">
        <h2>Paiement</h2>
        ${htmlEscape(paymentLabels[order.paymentMethod] || order.paymentMethod)}
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>Article</th>
          <th class="center">Qté</th>
          <th class="right">Prix unitaire</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <section class="totals">
      <div><span>Sous-total</span><strong>${htmlEscape(formatTnd(order.totals.subtotal))}</strong></div>
      <div><span>Livraison</span><strong>${order.totals.shipping === 0 ? "Gratuite" : htmlEscape(formatTnd(order.totals.shipping))}</strong></div>
      <div class="grand"><span>Total</span><span>${htmlEscape(formatTnd(order.totals.total))}</span></div>
    </section>

    <footer class="footer">
      Samsonite Tunisie · Appelez-nous: 26 528 103 / 71 809 209 · commercial@samsonite.com.tn<br />
      Ce document présente les détails de votre commande. Notre équipe vous contactera si une confirmation complémentaire est nécessaire.
    </footer>
  </main>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
};

const OrderConfirmation = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Commande reçue | Samsonite Tunisie";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      const found = await getOrder(id);
      if (!cancelled) {
        setOrder(found);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const customerName = useMemo(() => {
    if (!order) return "";
    return [order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ");
  }, [order]);

  if (loading) {
    return (
      <div className="samsonite-container py-20 text-center">
        <p className="text-sm font-semibold text-muted-foreground">{t("order.loading")}</p>
      </div>
    );
  }

  const printOrderDetails = () => {
    if (!order) return;
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildOrderDetailsHtml(order, customerName));
    printWindow.document.close();
  };

  if (!order) {
    return (
      <div className="samsonite-container py-20 text-center">
        <h1 className="mb-3 text-2xl font-black">{t("order.notFound")}</h1>
        <p className="mb-8 text-muted-foreground">{t("order.notFoundText")}</p>
        <Link to="/" className="premium-control inline-block bg-foreground px-8 py-3 text-sm font-bold text-background">
          {t("product.backHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#f7f7f5]">
      <div className="samsonite-container py-8 lg:py-12">
        <section className="border border-border bg-white p-6 shadow-[0_18px_55px_rgba(0,0,0,0.05)] lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                  Commande enregistrée
                </p>
                <h1 className="mt-2 text-2xl font-black uppercase tracking-tight md:text-3xl">
                  Merci, {order.customer.firstName || "votre commande est reçue"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Nous avons bien reçu votre commande. Notre équipe va vérifier les informations et vous contacter si
                  nécessaire avant l'expédition.
                </p>
              </div>
            </div>

            <div className="print:hidden flex flex-col gap-2 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={printOrderDetails}
                className="premium-control inline-flex items-center justify-center gap-2 border border-foreground bg-white px-5 py-3 text-xs font-black uppercase tracking-wide hover:bg-foreground hover:text-background"
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </button>
              <button
                onClick={() => navigate(-1)}
                className="premium-control inline-flex justify-center bg-foreground px-5 py-3 text-xs font-black uppercase tracking-wide text-background"
              >
                Continuer mes achats
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Numéro commande</p>
              <p className="mt-1 text-lg font-black">{order.id}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Date</p>
              <p className="mt-1 text-sm font-semibold">{formatOrderDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Statut</p>
              <p className="mt-1 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">
                {statusLabels[order.status] || order.status}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="mt-1 text-lg font-black">{formatTnd(order.totals.total)}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section>
              <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Résumé de la commande</h2>
              <div className="divide-y divide-border border-y border-border">
                {order.items.map((item) => (
                  <div key={`${item.productId}-${item.variantId || item.selectedColor || item.name}`} className="flex gap-4 py-4">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="h-20 w-20 shrink-0 bg-white object-contain"
                      onError={(event) => {
                        event.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-black uppercase leading-5">{item.name}</p>
                      <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                        {item.selectedColor && <p>{item.selectedColor}</p>}
                        {item.selectedSize && <p>Taille: {item.selectedSize}</p>}
                        {item.sku && <p>Référence: {item.sku}</p>}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Quantité {item.quantity} x {formatTnd(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-right font-black">{formatTnd(item.total)}</p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="border border-border bg-[#fafafa] p-5">
                <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Total commande</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span>{formatTnd(order.totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison</span>
                    <span>{order.totals.shipping === 0 ? "Gratuite" : formatTnd(order.totals.shipping)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-3 text-base font-black">
                    <span>Total</span>
                    <span>{formatTnd(order.totals.total)}</span>
                  </div>
                </div>
              </div>

              <div className="border border-border bg-white p-5">
                <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Informations client</h2>
                <div className="space-y-2 text-sm leading-6">
                  <p className="font-bold">{customerName}</p>
                  <p className="text-muted-foreground">{order.customer.address}</p>
                  <p className="text-muted-foreground">
                    {[order.customer.postalCode, order.customer.city].filter(Boolean).join(" ")}
                  </p>
                  <p className="text-muted-foreground">{order.customer.phone}</p>
                  <p className="break-all text-muted-foreground">{order.customer.email}</p>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="border border-border bg-white p-5">
              <div className="mb-3 flex items-center gap-3">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-black uppercase tracking-wide">Livraison</h3>
              </div>
              <p className="font-bold">{shippingLabels[order.shippingMethod]}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{shippingDelays[order.shippingMethod]}</p>
            </div>

            <div className="border border-border bg-white p-5">
              <div className="mb-3 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-black uppercase tracking-wide">Paiement</h3>
              </div>
              <p className="font-bold">{paymentLabels[order.paymentMethod]}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Votre commande sera traitée selon le mode de paiement sélectionné.
              </p>
            </div>

            <div className="border border-border bg-white p-5">
              <div className="mb-3 flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-black uppercase tracking-wide">Prochaine étape</h3>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Conservez votre numéro de commande. Il permet à notre service client de retrouver rapidement votre dossier.
              </p>
            </div>
          </div>

          <div className="mt-8 border border-border bg-[#f7f7f5] p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Besoin d'aide ?</h2>
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <a href="tel:+21626528103" className="flex items-center gap-3 font-semibold hover:underline">
                <Phone className="h-4 w-4" />
                26 528 103
              </a>
              <a href="tel:+21671809209" className="flex items-center gap-3 font-semibold hover:underline">
                <Phone className="h-4 w-4" />
                71 809 209
              </a>
              <a href="mailto:commercial@samsonite.com.tn" className="flex items-center gap-3 font-semibold hover:underline">
                <Mail className="h-4 w-4" />
                commercial@samsonite.com.tn
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OrderConfirmation;
