import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { CheckCircle2, PackageCheck, Phone } from "lucide-react";

import { formatTnd } from "@/lib/currency";
import { getOrder, type StoredOrder } from "@/lib/orders";
import { useLanguage } from "@/lib/i18n";

const OrderConfirmation = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="samsonite-container py-20 text-center">
        <p className="text-sm font-semibold text-muted-foreground">{t("order.loading")}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="samsonite-container py-20 text-center">
        <h1 className="mb-3 text-2xl font-black">{t("order.notFound")}</h1>
        <p className="mb-8 text-muted-foreground">
          {t("order.notFoundText")}
        </p>
        <Link to="/" className="premium-control inline-block bg-foreground px-8 py-3 text-sm font-bold text-background">
          {t("product.backHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="samsonite-container py-12">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {t("order.received")}
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">
          {t("order.thanks")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {t("order.reference")}: <span className="font-bold text-foreground">{order.id}</span>
        </p>
      </section>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
        <section className="premium-surface p-6">
          <h2 className="mb-5 text-sm font-black uppercase tracking-wide">{t("order.items")}</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={`${item.productId}-${item.selectedColor}`} className="flex gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                <img src={item.image} alt={item.name} className="h-20 w-20 bg-white object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold uppercase">{item.name}</p>
                  {item.selectedColor && (
                    <p className="text-sm text-muted-foreground">{t("cart.color")}: {item.selectedColor}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.quantity} x {formatTnd(item.unitPrice)}
                  </p>
                </div>
                <p className="font-bold">{formatTnd(item.total)}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="premium-surface p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Total</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span>{formatTnd(order.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.shipping")}</span>
                <span>{order.totals.shipping === 0 ? t("cart.free") : formatTnd(order.totals.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("checkout.payment")}</span>
                <span>
                  {order.paymentMethod === "bank_transfer" ? t("checkout.payment.transfer") : t("checkout.payment.cash")}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-black">
                <span>{t("cart.total")}</span>
                <span>{formatTnd(order.totals.total)}</span>
              </div>
            </div>
          </div>

          <div className="premium-surface space-y-4 p-6">
            <div className="flex gap-3">
              <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-semibold">{t("order.nextCall")}</p>
            </div>
            <div className="flex gap-3">
              <PackageCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-semibold">{t("order.nextDelivery")}</p>
            </div>
          </div>

          <Link
            to="/"
            className="premium-control flex justify-center bg-foreground px-8 py-3 text-sm font-bold uppercase tracking-wide text-background"
          >
            {t("cart.continue")}
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default OrderConfirmation;
