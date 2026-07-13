import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Lock, Mail, MapPin, Phone } from "lucide-react";

import { useCart } from "@/hooks/useCart";
import { formatTnd } from "@/lib/currency";
import { createStoredOrder } from "@/lib/orders";
import { useLanguage } from "@/lib/i18n";

interface CheckoutFormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
}

const initialFormState: CheckoutFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  postalCode: "",
  notes: "",
};

const Checkout = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const [form, setForm] = useState<CheckoutFormState>(initialFormState);
  const [submitted, setSubmitted] = useState(false);
  const shippingFee = totalPrice >= 300 ? 0 : 7;
  const orderTotal = totalPrice + shippingFee;

  const canSubmit = useMemo(
    () =>
      form.firstName.trim() &&
      form.lastName.trim() &&
      form.phone.trim() &&
      form.email.trim() &&
      form.address.trim() &&
      form.city.trim(),
    [form]
  );

  const updateField = (field: keyof CheckoutFormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || submitted) return;

    setSubmitted(true);
    const order = createStoredOrder({
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
        notes: form.notes.trim(),
      },
      items,
      subtotal: totalPrice,
      shipping: shippingFee,
    });

    clearCart();
    navigate(`/commande/confirmation/${order.id}`);
  };

  if (items.length === 0) {
    return (
      <div className="samsonite-container py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold">{t("cart.emptyTitle")}</h1>
        <p className="mb-8 text-muted-foreground">
          Ajoutez des produits au panier avant de passer la commande.
        </p>
        <Link
          to="/"
          className="premium-control inline-block bg-foreground px-8 py-3 text-sm font-bold tracking-wider text-background"
        >
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="samsonite-container py-8 lg:py-12">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Paiement a la livraison
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">
          Finaliser ma commande
        </h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_390px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="premium-surface p-6">
            <div className="mb-5 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-sm font-black uppercase tracking-wide">Informations client</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                placeholder="Prenom"
                className="h-12 border border-border bg-background px-3"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
              />
              <input
                required
                placeholder="Nom"
                className="h-12 border border-border bg-background px-3"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
              />
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  placeholder="Telephone"
                  className="h-12 w-full border border-border bg-background pl-10 pr-3"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  className="h-12 w-full border border-border bg-background pl-10 pr-3"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="premium-surface p-6">
            <div className="mb-5 flex items-center gap-3">
              <MapPin className="h-5 w-5" />
              <h2 className="text-sm font-black uppercase tracking-wide">Adresse de livraison</h2>
            </div>

            <div className="space-y-4">
              <input
                required
                placeholder="Adresse"
                className="h-12 w-full border border-border bg-background px-3"
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  required
                  placeholder="Ville"
                  className="h-12 border border-border bg-background px-3"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                />
                <input
                  placeholder="Code postal"
                  className="h-12 border border-border bg-background px-3"
                  value={form.postalCode}
                  onChange={(event) => updateField("postalCode", event.target.value)}
                />
              </div>
              <textarea
                placeholder="Notes de commande (optionnel)"
                className="min-h-28 w-full resize-none border border-border bg-background p-3"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={!canSubmit || submitted}
            className="premium-control flex w-full items-center justify-center gap-2 bg-foreground px-8 py-4 text-sm font-black uppercase tracking-wider text-background disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Lock className="h-4 w-4" />
            Confirmer la commande
          </button>
        </form>

        <aside className="lg:col-span-1">
          <div className="premium-surface sticky top-36 space-y-5 p-6">
            <h2 className="text-sm font-black uppercase tracking-wider">{t("cart.summary")}</h2>
            <div className="max-h-80 space-y-4 overflow-auto pr-1 soft-scrollbar">
              {items.map((item) => (
                <div key={`${item.product.id}-${item.selectedColor}`} className="flex gap-3">
                  <img
                    src={item.product.images[0] || "/placeholder.svg"}
                    alt={item.product.name}
                    className="h-16 w-16 bg-white object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-bold uppercase">{item.product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.quantity} x {formatTnd(item.product.price)}
                    </p>
                    {item.selectedColor && (
                      <p className="text-xs text-muted-foreground">
                        {t("cart.color")}: {item.selectedColor}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Articles</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span>{formatTnd(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.shipping")}</span>
                <span>{shippingFee === 0 ? t("cart.free") : formatTnd(shippingFee)}</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-border pt-4 text-base font-black">
              <span>{t("cart.total")}</span>
              <span>{formatTnd(orderTotal)}</span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Votre commande sera enregistree dans le backoffice et confirmee par telephone.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
