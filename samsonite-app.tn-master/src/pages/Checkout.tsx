import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  CreditCard,
  Lock,
  Mail,
  MapPin,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";

import { useCart } from "@/hooks/useCart";
import { Info } from "lucide-react";
import { formatTnd } from "@/lib/currency";
import { createStoredOrder, type PaymentMethod, type ShippingMethod } from "@/lib/orders";
import type { CartItem, ProductVariant } from "@/lib/prestashop/types";
import { useLanguage } from "@/lib/i18n";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

interface CheckoutFormState {
  title: "M" | "Mme";
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
  addressAlias: string;
  company: string;
  taxNumber: string;
  address: string;
  address2: string;
  city: string;
  postalCode: string;
  country: string;
  notes: string;
  sameBilling: boolean;
  newsletter: boolean;
  privacy: boolean;
  terms: boolean;
  giftWrap: boolean;
}

const initialFormState: CheckoutFormState = {
  title: "Mme",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  birthDate: "",
  addressAlias: "",
  company: "",
  taxNumber: "",
  address: "",
  address2: "",
  city: "",
  postalCode: "",
  country: "Tunisie",
  notes: "",
  sameBilling: true,
  newsletter: false,
  privacy: false,
  terms: false,
  giftWrap: false,
};

// Shared field styling so every input/select/textarea looks the same:
// white background (not grey, which reads as "disabled"), a visible
// focus ring, and a red border when the field is invalid.
const fieldBaseClass =
  "border border-border bg-white px-3 transition-colors focus:border-black focus:outline-none focus:ring-1 focus:ring-black";
const fieldInvalidClass = (invalid: boolean) => (invalid ? "border-red-400" : "border-border");
const labelClass = "pt-3 text-sm font-medium text-foreground/90";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const isValidPhone = (phone: string) => /^\d{8}$/.test(phone.trim());
const isValidBirthDate = (date: string) => {
  if (!date) return true;
  const parsed = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(parsed.getTime()) && parsed <= today;
};
const normalizeKey = (value?: string) => (value || "").trim().toLowerCase();

const getCartVariant = (item: CartItem): ProductVariant | undefined =>
  item.product.variants?.find((variant) =>
    item.variantId
      ? variant.combinationId === item.variantId
      : normalizeKey(variant.color?.name) === normalizeKey(item.selectedColor) &&
      normalizeKey(variant.size) === normalizeKey(item.selectedSize)
  );

const getVariantDimensions = (variant?: ProductVariant, item?: CartItem) => {
  if (variant?.dimensions) return variant.dimensions;
  const physical = [variant?.height, variant?.width, variant?.depth]
    .map((value) => (value || "").trim())
    .filter(Boolean)
    .join(" x ");
  if (physical) return `${physical} cm`;
  return item?.product.dimensions || "";
};

const getVariantImage = (item: CartItem, variant?: ProductVariant) =>
  variant?.images?.[0] || item.product.images?.[0] || "/placeholder.svg";

const getVariantVolume = (item: CartItem, variant?: ProductVariant) => variant?.volume || item.product.volume || "";
const getVariantWeight = (item: CartItem, variant?: ProductVariant) => variant?.weight || item.product.weight || "";
const getItemPricing = (item: CartItem, variant?: ProductVariant) => {
  const unitPrice = variant?.price && variant.price > 0 ? variant.price : item.product.price;
  const originalUnitPrice = variant?.hasPromotion && variant.originalPrice && variant.originalPrice > unitPrice
    ? variant.originalPrice
    : item.product.hasPromotion && item.product.originalPrice && item.product.originalPrice > unitPrice
      ? item.product.originalPrice
      : unitPrice;
  const discountPercent = variant?.hasPromotion ? variant.discountPercent : item.product.discountPercent;
  return { unitPrice, originalUnitPrice, discount: Math.max(0, originalUnitPrice - unitPrice), discountPercent };
};

const Checkout = () => {
  const navigate = useNavigate();
  const { t, td } = useLanguage();
  const { items, totalPrice, totalItems, updateQuantity, removeItem, clearCart } = useCart();
  const promotionSavings = items.reduce((sum, item) => sum + getItemPricing(item, getCartVariant(item)).discount * item.quantity, 0);
  const totalBeforePromotion = totalPrice + promotionSavings;
  const [form, setForm] = useState<CheckoutFormState>(initialFormState);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(0);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [error, setError] = useState("");

  const shippingOptions: Array<{ value: ShippingMethod; title: string; description: string; price: string }> = [
    { value: "pickup", title: t("checkout.shipping.pickup"), description: "Charguia 1", price: t("cart.free").toLowerCase() },
    { value: "standard", title: t("checkout.shipping.standard"), description: t("checkout.shipping.standardDesc"), price: totalPrice >= 300 ? t("cart.free").toLowerCase() : formatTnd(7) },
    { value: "express", title: t("checkout.shipping.express"), description: t("checkout.shipping.expressDesc"), price: formatTnd(12) },
  ];

  const paymentOptions: Array<{ value: PaymentMethod; title: string; description: string }> = [
    { value: "cash_on_delivery", title: t("checkout.payment.cash"), description: t("checkout.payment.cashDesc") },
  ];

  const shippingFee = shippingMethod === "pickup" ? 0 : shippingMethod === "express" ? 12 : totalPrice >= 300 ? 0 : 7;
  const giftWrapFee = form.giftWrap ? 7 : 0;
  const orderTotal = totalPrice + shippingFee + giftWrapFee;
  const emailValid = isValidEmail(form.email);
  const phoneValid = isValidPhone(form.phone);
  const birthDateValid = isValidBirthDate(form.birthDate);
  const todayIso = new Date().toISOString().slice(0, 10);

  const personalValid = Boolean(
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    emailValid &&
    form.phone.trim() &&
    phoneValid &&
    birthDateValid &&
    form.privacy
  );
  const addressValid = Boolean(form.address.trim() && form.city.trim());
  const canSubmit = personalValid && addressValid && form.terms;

  const stepStatus = useMemo(
    () => [true, personalValid, addressValid, Boolean(shippingMethod), form.terms],
    [addressValid, form.terms, personalValid, shippingMethod]
  );

  const unlockedSteps = useMemo(() => {
    const unlocked = [true];
    for (let i = 1; i < stepStatus.length; i++) {
      unlocked.push(unlocked[i - 1] && stepStatus[i - 1]);
    }
    return unlocked;
  }, [stepStatus]);

  const updateField = <K extends keyof CheckoutFormState>(field: K, value: CheckoutFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const goToStep = (nextStep: number) => {
    setError("");
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const continueFromStep = () => {
    if (step === 1 && !personalValid) {
      setError(t("checkout.personalError"));
      return;
    }
    if (step === 2 && !addressValid) {
      setError(t("checkout.addressError"));
      return;
    }
    setError("");
    goToStep(Math.min(step + 1, 4));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || submitted) {
      setError(t("checkout.requiredError"));
      return;
    }

    setSubmitted(true);
    setError("");
    try {
      const order = await createStoredOrder({
        customer: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: [form.address.trim(), form.address2.trim()].filter(Boolean).join(", "),
          city: form.city.trim(),
          postalCode: form.postalCode.trim(),
          notes: [form.notes.trim(), form.giftWrap ? t("checkout.giftWrapRequested") : ""].filter(Boolean).join(" | "),
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
        <h1 className="mb-3 text-xl font-bold">{t("cart.emptyTitle")}</h1>
        <p className="mb-8 text-muted-foreground">{t("checkout.addProducts")}</p>
        <Link to="/" className="premium-control inline-block bg-foreground px-8 py-3 text-sm font-bold tracking-wider text-background">
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  const selectedShipping = shippingOptions.find((option) => option.value === shippingMethod) || shippingOptions[1];
  const selectedPayment = paymentOptions.find((option) => option.value === paymentMethod) || paymentOptions[0];

  const renderCartItem = (item: CartItem, compact = false) => {
    const variant = getCartVariant(item);
    const dimensions = getVariantDimensions(variant, item);
    const volume = getVariantVolume(item, variant);
    const weight = getVariantWeight(item, variant);
    const sku = item.sku || variant?.sku;
    const pricing = getItemPricing(item, variant);
    const lineTotal = pricing.unitPrice * item.quantity;

    return (
      <div key={`${item.product.id}-${item.variantId || item.selectedColor}`} className={`flex gap-4 border-b border-border transition-colors ${compact ? "py-4" : "pb-6 hover:bg-accent/35 sm:p-3"}`}>
        <Link to={`/produit/${item.product.slug}`} className={`${compact ? "h-16 w-16" : "h-28 w-28"} shrink-0 bg-white`}>
          <img src={getVariantImage(item, variant)} alt={td(item.product.name)} className="h-full w-full object-contain" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link to={`/produit/${item.product.slug}`} className="text-xs font-bold hover:underline">
                {td(item.product.name)}
              </Link>
              <div className="mt-1 space-y-0.5">
                {item.selectedColor && <p className="text-[11px] text-muted-foreground">{t("product.color")}: {td(item.selectedColor)}</p>}
                {item.selectedSize && <p className="text-[11px] text-muted-foreground">{t("product.size")}: {td(item.selectedSize)}</p>}
                {dimensions && <p className="text-[11px] text-muted-foreground">{t("product.dimension")}: {dimensions}</p>}
                {volume && <p className="text-[11px] text-muted-foreground">{t("product.volume")}: {volume}</p>}
                {weight && <p className="text-[11px] text-muted-foreground">{t("product.weight")}: {weight}</p>}
                {sku && <p className="text-[11px] text-muted-foreground">SKU: {sku}</p>}
                {pricing.discount > 0 && <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-700"><BadgePercent className="h-3.5 w-3.5" />{t("cart.promotion")} -{Math.round(pricing.discountPercent || 0)}%</span>}
              </div>
            </div>
            {!compact && (
              <ConfirmDeleteDialog
                title={t("cart.removeTitle")}
                description={t("cart.removeText").replace("{name}", td(item.product.name))}
                onConfirm={() => removeItem(item.product.id, item.selectedColor, item.variantId)}
              >
                {(openDialog) => (
                  <button
                    type="button"
                    onClick={openDialog}
                    className="inline-flex shrink-0 items-center gap-2 self-start border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-red-600 transition-colors hover:border-red-200 hover:bg-red-100"
                    aria-label={t("cart.removeTitle")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("cart.remove")}
                  </button>
                )}
              </ConfirmDeleteDialog>
            )}
          </div>

          {!compact && (
            <div className="mt-4 flex items-center justify-between gap-5">
              <div className="flex items-center border border-border">
                <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedColor, item.variantId)} className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-accent">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="flex h-8 w-10 items-center justify-center border-x border-border text-xs">{item.quantity}</span>
                <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedColor, item.variantId)} className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-accent">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div className="text-right">
                {pricing.discount > 0 && <p className="text-xs text-muted-foreground line-through">{formatTnd(pricing.originalUnitPrice * item.quantity)}</p>}
                <p className={`text-sm font-bold ${pricing.discount > 0 ? "text-red-600" : ""}`}>{formatTnd(lineTotal)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const StepTitle = ({ number, title, icon: Icon }: { number: number; title: string; icon: typeof CheckCircle2 }) => (
    <div className="mb-5 flex items-center gap-3 border-b border-border pb-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white">{number}</span>
      <Icon className="h-5 w-5 text-foreground" />
      <h2 className="text-xl font-normal uppercase tracking-tight">{title}</h2>
    </div>
  );

  // Required-field asterisk goes after the label text now (not before).
  // The two consent checkboxes keep their asterisk in front, inline.
  const RequiredLabel = ({ children, className = labelClass }: { children: string; className?: string }) => (
    <label className={className}>
      {children}
      <span className="ml-1 text-red-600">*</span>
    </label>
  );

  return (
    <div className="bg-[#f4f4f4] py-8 lg:py-10">
      <div className="samsonite-container max-w-[1180px]">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {[t("cart.title"), t("checkout.stepInfo"), t("checkout.stepAddress"), t("checkout.delivery"), t("checkout.payment")].map((label, index) => (
            <button
              key={label}
              type="button"
              disabled={!unlockedSteps[index]}
              onClick={() => unlockedSteps[index] && goToStep(index)}
              className={`rounded-full border px-3 py-1.5 transition-colors ${step === index
                ? "border-black bg-black text-white"
                : unlockedSteps[index]
                  ? "border-border bg-white text-foreground hover:bg-neutral-50"
                  : "cursor-not-allowed border-border bg-white/60 text-muted-foreground"
                }`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="bg-white p-6 shadow-sm md:p-8">
            {step === 0 && (
              <section>
                <h1 className="mb-5 border-b border-border pb-4 text-xl font-normal uppercase tracking-tight">{t("cart.title")}</h1>
                <div>{items.map((item) => renderCartItem(item))}</div>
                <button onClick={() => navigate(-1)} className="mt-6 inline-flex items-center gap-2 text-sm hover:underline">
                  <ArrowLeft className="h-4 w-4" /> {t("cart.continue")}
                </button>
                <div className="mt-8 space-y-2 border-t border-border pt-4 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.items")}</span><span>{totalItems}</span></div>
                  {promotionSavings > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("cart.beforePromotion")}
                        </span>
                        <span>{formatTnd(totalBeforePromotion)}</span>
                      </div>

                      <div className="flex justify-between text-red-600">
                        <span className="inline-flex items-center gap-1">
                          <BadgePercent className="h-3.5 w-3.5" />
                          {t("cart.promotion")}
                        </span>
                        <span className="font-semibold">
                          -{formatTnd(promotionSavings)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("cart.shipping")}</span>
                    <span className="font-medium">
                      {shippingFee === 0 ? (
                        <span className="text-samsonite-teal">{t("cart.free")}</span>
                      ) : (
                        formatTnd(shippingFee)
                      )}
                    </span>
                  </div>                  <div className="flex justify-between border-t border-border pt-4 text-sm font-bold"><span>{t("cart.total")}</span><span>{formatTnd(orderTotal)}</span></div>
                </div>
                <button type="button" onClick={() => goToStep(1)} className="premium-control mt-6 flex w-full items-center justify-center bg-[#27b9d2] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#1ea8bf]">
                  {t("checkout.order")}
                </button>
              </section>
            )}

            {step === 1 && (
              <section>
                <StepTitle number={1} title={t("checkout.personalInfo")} icon={CheckCircle2} />
                <div className="mb-5 flex flex-wrap items-center gap-5 text-sm">
                  <span className="font-medium">{t("checkout.titleField")}</span>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={form.title === "M"} onChange={() => updateField("title", "M")} /> M</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={form.title === "Mme"} onChange={() => updateField("title", "Mme")} /> Mme</label>
                </div>
                <div className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
                  <RequiredLabel>{t("checkout.firstName")}</RequiredLabel>
                  <input required className={`h-11 ${fieldBaseClass}`} value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
                  <RequiredLabel>{t("checkout.lastName")}</RequiredLabel>
                  <input required className={`h-11 ${fieldBaseClass}`} value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
                  <RequiredLabel>E-mail</RequiredLabel>
                  <div>
                    <input required type="email" className={`h-11 w-full ${fieldBaseClass} ${fieldInvalidClass(Boolean(form.email && !emailValid))}`} value={form.email} onChange={(event) => updateField("email", event.target.value)} />
                    {form.email && !emailValid && <p className="mt-1 text-xs font-semibold text-red-600">{t("checkout.invalidEmail")}</p>}
                  </div>
                  <RequiredLabel>{t("checkout.phone")}</RequiredLabel>
                  <div>
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{8}"
                      maxLength={8}
                      placeholder="Ex: 26528103"
                      className={`h-11 w-full ${fieldBaseClass} ${fieldInvalidClass(Boolean(form.phone && !phoneValid))}`}
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, "").slice(0, 8))}
                    />
                    {form.phone && !phoneValid && <p className="mt-1 text-xs font-semibold text-red-600">{t("checkout.invalidPhone8")}</p>}
                  </div>
                  <label className={labelClass}>{t("checkout.birthDate")}</label>
                  <div>
                    <input
                      type="date"
                      max={todayIso}
                      className={`h-11 w-full ${fieldBaseClass} ${fieldInvalidClass(Boolean(form.birthDate && !birthDateValid))}`}
                      value={form.birthDate}
                      onChange={(event) => updateField("birthDate", event.target.value)}
                    />
                    {form.birthDate && !birthDateValid && <p className="mt-1 text-xs font-semibold text-red-600">{t("checkout.invalidBirthDate")}</p>}
                  </div>
                </div>
                <div className="mt-6 space-y-4 text-sm">
                  <label className="flex gap-3"><input type="checkbox" checked={form.newsletter} onChange={(event) => updateField("newsletter", event.target.checked)} /> {t("checkout.newsletter")}</label>
                  <label className="flex gap-3"><input type="checkbox" checked={form.privacy} onChange={(event) => updateField("privacy", event.target.checked)} /> <span><span className="mr-1 text-red-600">*</span>{t("checkout.privacyConsent")}</span></label>
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <StepTitle number={2} title={t("checkout.stepAddress")} icon={MapPin} />
                <p className="mb-5 text-sm leading-6 text-muted-foreground">{t("checkout.addressUse")}</p>
                <div className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
                  <label className={labelClass}>Alias</label>
                  <input className={`h-11 ${fieldBaseClass}`} value={form.addressAlias} onChange={(event) => updateField("addressAlias", event.target.value)} />
                  <label className={labelClass}>{t("checkout.company")}</label>
                  <input className={`h-11 ${fieldBaseClass}`} value={form.company} onChange={(event) => updateField("company", event.target.value)} />
                  <label className={labelClass}>{t("checkout.taxNumber")}</label>
                  <input className={`h-11 ${fieldBaseClass}`} value={form.taxNumber} onChange={(event) => updateField("taxNumber", event.target.value)} />
                  <RequiredLabel>{t("checkout.addressPlaceholder")}</RequiredLabel>
                  <input required className={`h-11 ${fieldBaseClass}`} value={form.address} onChange={(event) => updateField("address", event.target.value)} />
                  <label className={labelClass}>{t("checkout.address2")}</label>
                  <input className={`h-11 ${fieldBaseClass}`} value={form.address2} onChange={(event) => updateField("address2", event.target.value)} />
                  <label className={labelClass}>{t("checkout.postalCode")}</label>
                  <input className={`h-11 ${fieldBaseClass}`} value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} />
                  <RequiredLabel>{t("checkout.city")}</RequiredLabel>
                  <input required className={`h-11 ${fieldBaseClass}`} value={form.city} onChange={(event) => updateField("city", event.target.value)} />
                  <label className={labelClass}>{t("checkout.country")}</label>
                  <select className={`h-11 ${fieldBaseClass}`} value={form.country} onChange={(event) => updateField("country", event.target.value)}><option value="Tunisie">{t("checkout.tunisia")}</option></select>
                </div>
                <label className="mt-5 flex gap-3 text-sm"><input type="checkbox" checked={form.sameBilling} onChange={(event) => updateField("sameBilling", event.target.checked)} /> {t("checkout.sameBilling")}</label>
              </section>
            )}

            {step === 3 && (
              <section>
                <StepTitle number={3} title={t("checkout.delivery")} icon={Truck} />
                <div className="space-y-3">
                  {shippingOptions.map((option) => (
                    <label key={option.value} className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 border p-4 transition-colors ${shippingMethod === option.value ? "border-[#27b9d2] bg-[#edfafe]" : "border-border bg-white hover:bg-neutral-50"}`}>
                      <input type="radio" checked={shippingMethod === option.value} onChange={() => setShippingMethod(option.value)} />
                      <span><strong>{option.title}</strong><span className="block text-sm text-muted-foreground">{option.description}</span></span>
                      <span className="text-sm font-black">{option.price}</span>
                    </label>
                  ))}
                </div>
                <label className="mt-5 block text-sm font-medium">{t("checkout.orderMessage")}</label>
                <textarea className={`mt-2 min-h-20 w-full resize-none p-3 ${fieldBaseClass}`} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
                <label className="mt-4 flex gap-3 text-sm"><input type="checkbox" checked={form.giftWrap} onChange={(event) => updateField("giftWrap", event.target.checked)} /> {t("checkout.giftWrap")}</label>
              </section>
            )}

            {step === 4 && (
              <section>
                <StepTitle number={4} title={t("checkout.payment")} icon={CreditCard} />
                <div className="space-y-3">
                  {paymentOptions.map((option) => (
                    <label key={option.value} className="flex cursor-pointer gap-3 text-sm">
                      <input type="radio" checked={paymentMethod === option.value} onChange={() => setPaymentMethod(option.value)} />
                      <span><strong>{option.title}</strong><span className="block text-muted-foreground">{option.description}</span></span>
                    </label>
                  ))}
                </div>
                <label className="mt-6 flex gap-3 text-sm"><input type="checkbox" checked={form.terms} onChange={(event) => updateField("terms", event.target.checked)} /> <span><span className="mr-1 text-red-600">*</span>{t("checkout.terms")}</span></label>

                <div className="mt-8 space-y-6">
                  <h3 className="text-lg font-black">{t("checkout.reviewOrder")}</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div><p className="font-black">{t("checkout.shippingAddress")}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{form.firstName} {form.lastName}<br />{form.address}<br />{form.address2 && <>{form.address2}<br /></>}{form.postalCode} {form.city}<br />{t("checkout.tunisia")}</p></div>
                    <div><p className="font-black">{t("checkout.billingAddress")}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{form.sameBilling ? t("checkout.sameAsShipping") : t("checkout.billingToConfirm")}</p></div>
                  </div>
                  <div className="border border-border p-4"><p className="font-black">{t("checkout.delivery")}</p><p className="mt-2 text-sm text-muted-foreground">{selectedShipping.title} - {selectedShipping.description}</p></div>
                  <div className="border border-border p-4"><p className="font-black">{t("order.items")}</p>{items.map((item) => renderCartItem(item, true))}</div>
                </div>
              </section>
            )}

            {error && <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

            {step > 0 && (
              <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-6">
                <button type="button" onClick={() => goToStep(step - 1)} className="inline-flex items-center gap-2 border border-border px-5 py-3 text-sm font-black uppercase hover:bg-neutral-50">
                  <ArrowLeft className="h-4 w-4" /> {t("checkout.back")}
                </button>
                {step < 4 ? (
                  <button type="button" onClick={continueFromStep} className="premium-control bg-[#27b9d2] px-8 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-[#1ea8bf]">
                    {t("checkout.continue")}
                  </button>
                ) : (
                  <button type="submit" disabled={!canSubmit || submitted} className="premium-control inline-flex items-center gap-2 bg-black px-8 py-3 text-sm font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50">
                    <Lock className="h-4 w-4" /> {submitted ? t("checkout.validating") : t("checkout.order")}
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="premium-surface self-start space-y-4 bg-white p-6 lg:sticky lg:top-36">
            <h2 className="text-sm font-bold tracking-wider">{t("cart.summary")}</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.items")}</span><span>{totalItems}</span></div>
              {promotionSavings > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("cart.beforePromotion")}
                    </span>
                    <span>{formatTnd(totalBeforePromotion)}</span>
                  </div>

                  <div className="flex justify-between text-red-600">
                    <span className="inline-flex items-center gap-1">
                      <BadgePercent className="h-3.5 w-3.5" />
                      {t("cart.promotion")}
                    </span>

                    <span className="font-semibold">
                      -{formatTnd(promotionSavings)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">{t("cart.subtotal")}</span><span>{formatTnd(totalPrice)}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.shipping")}</span>
                <span className="font-medium">
                  {shippingFee === 0 ? (
                    <span className="text-samsonite-teal">{t("cart.free")}</span>
                  ) : (
                    formatTnd(shippingFee)
                  )}
                </span>
              </div>              {form.giftWrap && <div className="flex justify-between"><span className="text-muted-foreground">{t("checkout.giftWrapShort")}</span><span>{formatTnd(giftWrapFee)}</span></div>}
            </div>
            <div className="flex justify-between border-t border-border pt-4 text-sm font-bold"><span>{t("cart.total")}</span><span>{formatTnd(orderTotal)}</span></div>
            {step >= 3 &&
              <div>
                <p className="text-xs leading-5 text-muted-foreground">{t("cart.shipping")}: {selectedShipping.title}. </p>
                <p className="text-xs leading-5 text-muted-foreground">{t("checkout.payment")}: {selectedPayment.title}.</p>
              </div>}
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-blue-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs leading-5">
                {t("checkout.backofficeNote")}
              </p>
            </div>          </aside>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
