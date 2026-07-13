import { Link, useParams } from "react-router-dom";
import { CheckCircle2, PackageCheck, Phone } from "lucide-react";

import { formatTnd } from "@/lib/currency";
import { getOrder } from "@/lib/orders";

const OrderConfirmation = () => {
  const { id } = useParams<{ id: string }>();
  const order = id ? getOrder(id) : null;

  if (!order) {
    return (
      <div className="samsonite-container py-20 text-center">
        <h1 className="mb-3 text-2xl font-black">Commande introuvable</h1>
        <p className="mb-8 text-muted-foreground">
          La reference demandee n'existe pas dans ce navigateur.
        </p>
        <Link to="/" className="premium-control inline-block bg-foreground px-8 py-3 text-sm font-bold text-background">
          Retour a l'accueil
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
          Commande confirmee
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">
          Merci pour votre commande
        </h1>
        <p className="mt-3 text-muted-foreground">
          Reference: <span className="font-bold text-foreground">{order.id}</span>
        </p>
      </section>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
        <section className="premium-surface p-6">
          <h2 className="mb-5 text-sm font-black uppercase tracking-wide">Articles commandes</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={`${item.productId}-${item.selectedColor}`} className="flex gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                <img src={item.image} alt={item.name} className="h-20 w-20 bg-white object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold uppercase">{item.name}</p>
                  {item.selectedColor && (
                    <p className="text-sm text-muted-foreground">Couleur: {item.selectedColor}</p>
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

          <div className="premium-surface space-y-4 p-6">
            <div className="flex gap-3">
              <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-semibold">Notre equipe vous contactera pour confirmer la disponibilite.</p>
            </div>
            <div className="flex gap-3">
              <PackageCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-semibold">La livraison sera preparee apres confirmation.</p>
            </div>
          </div>

          <Link
            to="/"
            className="premium-control flex justify-center bg-foreground px-8 py-3 text-sm font-bold uppercase tracking-wide text-background"
          >
            Continuer mes achats
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default OrderConfirmation;
