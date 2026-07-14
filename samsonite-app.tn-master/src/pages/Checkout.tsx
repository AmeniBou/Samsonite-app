import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, CreditCard, Lock, Mail, MapPin, Phone, Truck } from "lucide-react";

import { useCart } from "@/hooks/useCart";
import { formatTnd } from "@/lib/currency";
import { createStoredOrder, type PaymentMethod, type ShippingMethod } from "@/lib/orders";
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

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const isValidPhone = (phone: string) => /^[+()\s0-9.-]{8,20}$/.test(phone.trim());

const Checkout = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const [form, setForm] = useState<CheckoutFormState>(initialFormState);
  const [submitted, setSubmitted] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [error, setError] = useState("");
  const shippingOptions: Array<{
    value: ShippingMethod;
    label: string;
    description: string;
  }> = [
    { value: "standard", label: t("checkout.shipping.standard"), description: t("checkout.shipping.standardDesc") },
    { value: "express", label: t("checkout.shipping.express"), description: t("checkout.shipping.expressDesc") },
    { value: "pickup", label: t("checkout.shipping.pickup"), description: t("checkout.shipping.pickupDesc") },
  ];
  const paymentOptions: Array<{
    value: PaymentMethod;
    label: string;
    description: string;
  }> = [
    { value: "cash_on_delivery", label: t("checkout.payment.cash"), description: t("checkout.payment.cashDesc") },
    { value: "bank_transfer", label: t("checkout.payment.transfer"), description: t("checkout.payment.transferDesc") },
  ];
  const shippingFee =
    shippingMethod === "pickup" ? 0 : shippingMethod === "express" ? 12 : totalPrice >= 300 ? 0 : 7;
  const orderTotal = totalPrice + shippingFee;
  const emailValid = isValidEmail(form.email);
  const phoneValid = isValidPhone(form.phone);

  const canSubmit = useMemo(
    () =>
      form.firstName.trim() &&
      form.lastName.trim() &&
      form.phone.trim() &&
      phoneValid &&
      form.email.trim() &&
      emailValid &&
      form.address.trim() &&
      form.city.trim(),
    [emailValid, form, phoneValid]
  );

  const updateField = (field: keyof CheckoutFormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || submitted) return;

    setSubmitted(true);
    setError("");
    try {
      const order = await createStoredOrder({
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
        shippingMethod,
        paymentMethod,
      });

      clearCart();
      navigate(`/commande/confirmation/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkout.confirm"));
      setSubmitted(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="samsonite-container py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold">{t("cart.emptyTitle")}</h1>
        <p className="mb-8 text-muted-foreground">
          {t("checkout.addProducts")}
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
          {t("checkout.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">
          {t("checkout.title")}
        </h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_390px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="premium-surface p-6">
            <div className="mb-5 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-sm font-black uppercase tracking-wide">{t("checkout.customer")}</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                placeholder={t("checkout.firstName")}
                className="h-12 border border-border bg-background px-3"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
              />
              <input
                required
                placeholder={t("checkout.lastName")}
                className="h-12 border border-border bg-background px-3"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
              />
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  placeholder={t("checkout.phone")}
                  className={`h-12 w-full border bg-background pl-10 pr-3 ${
                    form.phone && !phoneValid ? "border-red-400" : "border-border"
                  }`}
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
                {form.phone && !phoneValid && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{t("checkout.invalidPhone")}</p>
                )}
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="email"
                  placeholder={t("checkout.email")}
                  className={`h-12 w-full border bg-background pl-10 pr-3 ${
                    form.email && !emailValid ? "border-red-400" : "border-border"
                  }`}
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
                {form.email && !emailValid && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{t("checkout.invalidEmail")}</p>
                )}
              </div>
            </div>
          </section>

          <section className="premium-surface p-6">
            <div className="mb-5 flex items-center gap-3">
              <MapPin className="h-5 w-5" />
              <h2 className="text-sm font-black uppercase tracking-wide">{t("checkout.address")}</h2>
            </div>

            <div className="space-y-4">
              <input
                required
                placeholder={t("checkout.addressPlaceholder")}
                className="h-12 w-full border border-border bg-background px-3"
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  required
                  placeholder={t("checkout.city")}
                  className="h-12 border border-border bg-background px-3"
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                />
                <input
                  placeholder={t("checkout.postalCode")}
                  className="h-12 border border-border bg-background px-3"
                  value={form.postalCode}
                  onChange={(event) => updateField("postalCode", event.target.value)}
                />
              </div>
              <textarea
                placeholder={t("checkout.notes")}
                className="min-h-28 w-full resize-none border border-border bg-background p-3"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />
            </div>
          </section>

          <section className="premium-surface p-6">
            <div className="mb-5 flex items-center gap-3">
              <Truck className="h-5 w-5" />
              <h2 className="text-sm font-black uppercase tracking-wide">{t("checkout.delivery")}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {shippingOptions.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer border p-4 transition-colors ${
                    shippingMethod === option.value ? "border-black bg-black text-white" : "border-border bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={shippingMethod === option.value}
                    onChange={() => setShippingMethod(option.value)}
                  />
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className={`mt-1 block text-xs ${shippingMethod === option.value ? "text-white/75" : "text-muted-foreground"}`}>
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="premium-surface p-6">
            <div className="mb-5 flex items-center gap-3">
              <CreditCard className="h-5 w-5" />
              <h2 className="text-sm font-black uppercase tracking-wide">{t("checkout.payment")}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentOptions.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer border p-4 transition-colors ${
                    paymentMethod === option.value ? "border-black bg-black text-white" : "border-border bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={paymentMethod === option.value}
                    onChange={() => setPaymentMethod(option.value)}
                  />
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className={`mt-1 block text-xs ${paymentMethod === option.value ? "text-white/75" : "text-muted-foreground"}`}>
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {error && (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || submitted}
            className="premium-control flex w-full items-center justify-center gap-2 bg-foreground px-8 py-4 text-sm font-black uppercase tracking-wider text-background disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Lock className="h-4 w-4" />
            {submitted ? t("checkout.confirming") : t("checkout.confirm")}
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
                <span className="text-muted-foreground">{t("cart.items")}</span>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("checkout.payment")}</span>
                <span className="text-right">
                  {paymentOptions.find((option) => option.value === paymentMethod)?.label}
                </span>
              </div>
            </div>
            <div className="flex justify-between border-t border-border pt-4 text-base font-black">
              <span>{t("cart.total")}</span>
              <span>{formatTnd(orderTotal)}</span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {t("checkout.backofficeNote")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
