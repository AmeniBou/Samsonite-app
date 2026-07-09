import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ORDER_NOTIFICATION_EMAIL } from "@/config/order";
import { useCart } from "@/hooks/useCart";
import { formatTnd } from "@/lib/currency";

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
  const { items, totalPrice, totalItems } = useCart();
  const [form, setForm] = useState<CheckoutFormState>(initialFormState);
  const shippingFee = totalPrice >= 300 ? 0 : 7;
  const orderTotal = totalPrice + shippingFee;

  const orderSummary = useMemo(() => {
    return items
      .map((item) => {
        const colorLabel = item.selectedColor ? ` | Couleur: ${item.selectedColor}` : "";
        return `- ${item.product.name}${colorLabel} | Qté: ${item.quantity} | ${formatTnd(
          item.product.price * item.quantity
        )}`;
      })
      .join("\n");
  }, [items]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const subject = `Nouvelle commande web (${totalItems} article${totalItems > 1 ? "s" : ""})`;
    const body = [
      "=== CLIENT ===",
      `Nom: ${form.firstName} ${form.lastName}`.trim(),
      `Téléphone: ${form.phone}`,
      `Email: ${form.email}`,
      `Adresse: ${form.address}`,
      `Ville: ${form.city}`,
      `Code postal: ${form.postalCode || "-"}`,
      "",
      "=== COMMANDE ===",
      orderSummary || "- Aucun article",
      "",
      `Sous-total: ${formatTnd(totalPrice)}`,
      `Livraison: ${shippingFee === 0 ? "Gratuite" : formatTnd(shippingFee)}`,
      `Total: ${formatTnd(orderTotal)}`,
      "",
      "=== NOTES ===",
      form.notes || "-",
    ].join("\n");

    window.location.href = `mailto:${ORDER_NOTIFICATION_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  if (items.length === 0) {
    return (
      <div className="samsonite-container py-16 text-center">
        <h1 className="text-2xl font-bold mb-3">Votre panier est vide</h1>
        <p className="text-muted-foreground mb-8">
          Ajoutez des produits au panier avant de passer la commande.
        </p>
        <Link
          to="/"
          className="inline-block bg-foreground text-background px-8 py-3 text-sm font-bold tracking-wider"
        >
          RETOUR AUX ACHATS
        </Link>
      </div>
    );
  }

  return (
    <div className="samsonite-container py-8">
      <h1 className="text-2xl font-bold tracking-wider mb-8">FINALISER MA COMMANDE</h1>

      <div className="grid lg:grid-cols-3 gap-10">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              required
              placeholder="Prénom"
              className="h-11 px-3 border border-border bg-background"
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
            />
            <input
              required
              placeholder="Nom"
              className="h-11 px-3 border border-border bg-background"
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              required
              placeholder="Téléphone"
              className="h-11 px-3 border border-border bg-background"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <input
              required
              type="email"
              placeholder="Email"
              className="h-11 px-3 border border-border bg-background"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <input
            required
            placeholder="Adresse"
            className="h-11 px-3 border border-border bg-background w-full"
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              required
              placeholder="Ville"
              className="h-11 px-3 border border-border bg-background"
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
            />
            <input
              placeholder="Code postal"
              className="h-11 px-3 border border-border bg-background"
              value={form.postalCode}
              onChange={(event) => setForm((prev) => ({ ...prev, postalCode: event.target.value }))}
            />
          </div>
          <textarea
            placeholder="Notes de commande (optionnel)"
            className="min-h-28 p-3 border border-border bg-background w-full"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <button
            type="submit"
            className="w-full sm:w-auto bg-foreground text-background px-8 py-3 text-sm font-bold tracking-wider hover:bg-foreground/90 transition-colors"
          >
            ENVOYER LA COMMANDE
          </button>
        </form>

        <aside className="lg:col-span-1">
          <div className="bg-accent p-6 space-y-4">
            <h2 className="text-sm font-bold tracking-wider">RÉCAPITULATIF</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Articles</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatTnd(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison</span>
                <span>{shippingFee === 0 ? "Gratuite" : formatTnd(shippingFee)}</span>
              </div>
            </div>
            <div className="border-t border-border pt-4 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatTnd(orderTotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Email de réception de commande:{" "}
              <span className="font-medium text-foreground">{ORDER_NOTIFICATION_EMAIL}</span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
