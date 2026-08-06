import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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
import { formatTnd } from "@/lib/currency";
import { createStoredOrder, type PaymentMethod, type ShippingMethod } from "@/lib/orders";
import type { CartItem, ProductVariant } from "@/lib/prestashop/types";
import { useLanguage } from "@/lib/i18n";

interface CheckoutFormState {
  title: "M" | "Mme";
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
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
  password: "",
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

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const isValidPhone = (phone: string) => /^[+()\s0-9.-]{8,20}$/.test(phone.trim());
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

const Checkout = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { items, totalPrice, totalItems, updateQuantity, removeItem, clearCart } = useCart();
  const [form, setForm] = useState<CheckoutFormState>(initialFormState);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(0);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [error, setError] = useState("");

  const shippingOptions: Array<{ value: ShippingMethod; title: string; description: string; price: string }> = [
    { value: "pickup", title: "Retrait en magasin", description: "Charguia 1", price: "gratuit" },
    { value: "standard", title: "Faites vous livrer", description: "Livraison en Tunisie après confirmation", price: totalPrice >= 300 ? "gratuit" : formatTnd(7) },
    { value: "express", title: "Livraison prioritaire", description: "Sous 24 à 48h ouvrables après confirmation", price: formatTnd(12) },
  ];

  const paymentOptions: Array<{ value: PaymentMethod; title: string; description: string }> = [
    { value: "cash_on_delivery", title: "Payer comptant à la livraison", description: "Paiement à la réception de la commande." },
    { value: "bank_transfer", title: "Payer par virement bancaire", description: "Notre équipe vous communiquera les informations de paiement." },
  ];

  const shippingFee = shippingMethod === "pickup" ? 0 : shippingMethod === "express" ? 12 : totalPrice >= 300 ? 0 : 7;
  const giftWrapFee = form.giftWrap ? 7 : 0;
  const orderTotal = totalPrice + shippingFee + giftWrapFee;
  const emailValid = isValidEmail(form.email);
  const phoneValid = isValidPhone(form.phone);

  const personalValid = Boolean(
    form.firstName.trim() &&
      form.lastName.trim() &&
      form.email.trim() &&
      emailValid &&
      form.phone.trim() &&
      phoneValid &&
      form.privacy
  );
  const addressValid = Boolean(form.address.trim() && form.city.trim());
  const canSubmit = personalValid && addressValid && form.terms;

  const stepStatus = useMemo(
    () => [true, personalValid, addressValid, Boolean(shippingMethod), form.terms],
    [addressValid, form.terms, personalValid, shippingMethod]
  );

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
      setError("Veuillez compléter vos informations personnelles et accepter la confidentialité des données.");
      return;
    }
    if (step === 2 && !addressValid) {
      setError("Veuillez compléter votre adresse de livraison.");
      return;
    }
    setError("");
    goToStep(Math.min(step + 1, 4));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || submitted) {
      setError("Veuillez vérifier les informations obligatoires avant de commander.");
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
          notes: [form.notes.trim(), form.giftWrap ? "Emballage cadeau demandé" : ""].filter(Boolean).join(" | "),
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
    const lineTotal = item.product.price * item.quantity;

    return (
      <div key={`${item.product.id}-${item.variantId || item.selectedColor}`} className={`grid gap-5 border-b border-border py-5 ${compact ? "grid-cols-[72px_minmax(0,1fr)]" : "sm:grid-cols-[150px_minmax(0,1fr)]"}`}>
        <Link to={`/produit/${item.product.slug}`} className={`${compact ? "h-20 w-20" : "h-36 w-36"} bg-white`}>
          <img src={getVariantImage(item, variant)} alt={item.product.name} className="h-full w-full object-contain" />
        </Link>
        <div className="min-w-0">
          <div className="flex gap-4">
            <div className="min-w-0 flex-1">
              <Link to={`/produit/${item.product.slug}`} className="text-base font-black uppercase hover:underline">
                {item.product.name}
              </Link>
              <p className="mt-1 text-lg font-black text-samsonite-teal">{formatTnd(item.product.price)}</p>
              <div className="mt-2 text-sm leading-6 text-foreground/90">
                {item.selectedSize && <p><span className="font-black">Taille:</span> {item.selectedSize}</p>}
                {item.selectedColor && <p><span className="font-black">Couleur:</span> {item.selectedColor}</p>}
                {dimensions && <p><span className="font-black">Dimension:</span> {dimensions}</p>}
                {volume && <p><span className="font-black">Volume:</span> {volume}</p>}
                {weight && <p><span className="font-black">Poids:</span> {weight}</p>}
              </div>
            </div>
            {!compact && (
              <button
                type="button"
                onClick={() => removeItem(item.product.id, item.selectedColor, item.variantId)}
                className="self-start p-2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Supprimer cet article"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>

          {!compact && (
            <div className="mt-5 flex items-center justify-between gap-5">
              <div className="flex h-11 items-center border border-border bg-white">
                <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedColor, item.variantId)} className="flex h-full w-11 items-center justify-center hover:bg-neutral-50">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex h-full w-12 items-center justify-center border-x border-border text-base font-semibold">{item.quantity}</span>
                <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedColor, item.variantId)} className="flex h-full w-11 items-center justify-center hover:bg-neutral-50">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-lg font-black">{formatTnd(lineTotal)}</p>
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

  return (
    <div className="bg-[#f4f4f4] py-8 lg:py-10">
      <div className="samsonite-container max-w-[1180px]">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {["Panier", "Informations", "Adresses", "Livraison", "Paiement"].map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => index <= step || stepStatus[index] ? goToStep(index) : undefined}
              className={`rounded-full border px-3 py-1.5 transition-colors ${
                step === index ? "border-black bg-black text-white" : stepStatus[index] ? "border-border bg-white text-foreground" : "border-border bg-white/60 text-muted-foreground"
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
                <h1 className="mb-5 border-b border-border pb-4 text-3xl font-normal uppercase tracking-tight">Panier</h1>
                <div>{items.map((item) => renderCartItem(item))}</div>
                <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm hover:underline">
                  <ArrowLeft className="h-4 w-4" /> Continuer mes achats
                </Link>
                <div className="mt-8 space-y-4 border-t border-border pt-6 text-lg">
                  <div className="flex justify-between"><span>{totalItems} article{totalItems > 1 ? "s" : ""}</span><span className="font-black">{formatTnd(totalPrice)}</span></div>
                  <div className="flex justify-between"><span>Livraison</span><span className="font-black">{shippingFee === 0 ? "gratuit" : formatTnd(shippingFee)}</span></div>
                  <div className="flex justify-between border-t border-border pt-4 font-black"><span>Total</span><span>{formatTnd(orderTotal)}</span></div>
                </div>
                <button type="button" onClick={() => goToStep(1)} className="premium-control mt-8 flex w-full items-center justify-center bg-[#27b9d2] px-6 py-4 text-sm font-black uppercase tracking-wide text-white hover:bg-[#1ea8bf]">
                  Commander
                </button>
              </section>
            )}

            {step === 1 && (
              <section>
                <StepTitle number={1} title="Informations personnelles" icon={CheckCircle2} />
                <div className="mb-5 flex flex-wrap items-center gap-5 text-sm">
                  <span className="font-black">Titre</span>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={form.title === "M"} onChange={() => updateField("title", "M")} /> M</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" checked={form.title === "Mme"} onChange={() => updateField("title", "Mme")} /> Mme</label>
                </div>
                <div className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
                  <label className="pt-3 text-sm font-black">Prénom</label>
                  <input required className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
                  <label className="pt-3 text-sm font-black">Nom</label>
                  <input required className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
                  <label className="pt-3 text-sm font-black">E-mail</label>
                  <div>
                    <input required type="email" className={`h-11 w-full border bg-[#f8f8f8] px-3 ${form.email && !emailValid ? "border-red-400" : "border-border"}`} value={form.email} onChange={(event) => updateField("email", event.target.value)} />
                    {form.email && !emailValid && <p className="mt-1 text-xs font-semibold text-red-600">Adresse e-mail invalide.</p>}
                  </div>
                  <label className="pt-3 text-sm font-black">Téléphone</label>
                  <div>
                    <input required className={`h-11 w-full border bg-[#f8f8f8] px-3 ${form.phone && !phoneValid ? "border-red-400" : "border-border"}`} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                    {form.phone && !phoneValid && <p className="mt-1 text-xs font-semibold text-red-600">Numéro de téléphone invalide.</p>}
                  </div>
                  <label className="pt-3 text-sm font-black">Mot de passe</label>
                  <input type="password" className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.password} onChange={(event) => updateField("password", event.target.value)} />
                  <label className="pt-3 text-sm font-black">Date de naissance</label>
                  <input placeholder="DD/MM/YYYY" className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} />
                </div>
                <div className="mt-6 space-y-4 text-sm">
                  <label className="flex gap-3"><input type="checkbox" checked={form.newsletter} onChange={(event) => updateField("newsletter", event.target.checked)} /> Recevoir notre newsletter</label>
                  <label className="flex gap-3"><input type="checkbox" checked={form.privacy} onChange={(event) => updateField("privacy", event.target.checked)} /> J'accepte l'utilisation de mes données pour le traitement de ma commande.</label>
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <StepTitle number={2} title="Adresses" icon={MapPin} />
                <p className="mb-5 text-sm leading-6 text-muted-foreground">L'adresse sélectionnée sera utilisée comme adresse personnelle, de facturation et de livraison.</p>
                <div className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
                  <label className="pt-3 text-sm font-black">Alias</label>
                  <input className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.addressAlias} onChange={(event) => updateField("addressAlias", event.target.value)} />
                  <label className="pt-3 text-sm font-black">Société</label>
                  <input className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.company} onChange={(event) => updateField("company", event.target.value)} />
                  <label className="pt-3 text-sm font-black">Numéro de TVA</label>
                  <input className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.taxNumber} onChange={(event) => updateField("taxNumber", event.target.value)} />
                  <label className="pt-3 text-sm font-black">Adresse</label>
                  <input required className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.address} onChange={(event) => updateField("address", event.target.value)} />
                  <label className="pt-3 text-sm font-black">Complément d'adresse</label>
                  <input className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.address2} onChange={(event) => updateField("address2", event.target.value)} />
                  <label className="pt-3 text-sm font-black">Code postal</label>
                  <input className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} />
                  <label className="pt-3 text-sm font-black">Ville</label>
                  <input required className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
                  <label className="pt-3 text-sm font-black">Pays</label>
                  <select className="h-11 border border-border bg-[#f8f8f8] px-3" value={form.country} onChange={(event) => updateField("country", event.target.value)}><option>Tunisie</option></select>
                </div>
                <label className="mt-5 flex gap-3 text-sm"><input type="checkbox" checked={form.sameBilling} onChange={(event) => updateField("sameBilling", event.target.checked)} /> Utiliser aussi cette adresse pour la facturation</label>
              </section>
            )}

            {step === 3 && (
              <section>
                <StepTitle number={3} title="Mode de livraison" icon={Truck} />
                <div className="space-y-3">
                  {shippingOptions.map((option) => (
                    <label key={option.value} className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 border p-4 transition-colors ${shippingMethod === option.value ? "border-[#27b9d2] bg-[#edfafe]" : "border-border bg-white hover:bg-neutral-50"}`}>
                      <input type="radio" checked={shippingMethod === option.value} onChange={() => setShippingMethod(option.value)} />
                      <span><strong>{option.title}</strong><span className="block text-sm text-muted-foreground">{option.description}</span></span>
                      <span className="text-sm font-black">{option.price}</span>
                    </label>
                  ))}
                </div>
                <label className="mt-5 block text-sm font-semibold">Message à propos de votre commande</label>
                <textarea className="mt-2 min-h-20 w-full resize-none border border-border bg-white p-3" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
                <label className="mt-4 flex gap-3 text-sm"><input type="checkbox" checked={form.giftWrap} onChange={(event) => updateField("giftWrap", event.target.checked)} /> Je souhaite que ma commande soit emballée dans un papier cadeau, coût additionnel de 7,000 TND</label>
              </section>
            )}

            {step === 4 && (
              <section>
                <StepTitle number={4} title="Paiement" icon={CreditCard} />
                <div className="space-y-3">
                  {paymentOptions.map((option) => (
                    <label key={option.value} className="flex cursor-pointer gap-3 text-sm">
                      <input type="radio" checked={paymentMethod === option.value} onChange={() => setPaymentMethod(option.value)} />
                      <span><strong>{option.title}</strong><span className="block text-muted-foreground">{option.description}</span></span>
                    </label>
                  ))}
                </div>
                <label className="mt-6 flex gap-3 text-sm"><input type="checkbox" checked={form.terms} onChange={(event) => updateField("terms", event.target.checked)} /> J'ai lu les conditions générales de vente et j'y adhère sans réserve.</label>

                <div className="mt-8 space-y-6">
                  <h3 className="text-lg font-black">Veuillez vérifier votre commande avant validation</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div><p className="font-black">Votre adresse de livraison</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{form.firstName} {form.lastName}<br />{form.address}<br />{form.address2 && <>{form.address2}<br /></>}{form.postalCode} {form.city}<br />Tunisie</p></div>
                    <div><p className="font-black">Votre adresse de facturation</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{form.sameBilling ? "Identique à l'adresse de livraison" : "Adresse de facturation à confirmer"}</p></div>
                  </div>
                  <div className="border border-border p-4"><p className="font-black">Mode de livraison</p><p className="mt-2 text-sm text-muted-foreground">{selectedShipping.title} - {selectedShipping.description}</p></div>
                  <div className="border border-border p-4"><p className="font-black">Articles de la commande</p>{items.map((item) => renderCartItem(item, true))}</div>
                </div>
              </section>
            )}

            {error && <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

            {step > 0 && (
              <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-6">
                <button type="button" onClick={() => goToStep(step - 1)} className="inline-flex items-center gap-2 border border-border px-5 py-3 text-sm font-black uppercase hover:bg-neutral-50">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
                {step < 4 ? (
                  <button type="button" onClick={continueFromStep} className="premium-control bg-[#27b9d2] px-8 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-[#1ea8bf]">
                    Continuer
                  </button>
                ) : (
                  <button type="submit" disabled={!canSubmit || submitted} className="premium-control inline-flex items-center gap-2 bg-black px-8 py-3 text-sm font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50">
                    <Lock className="h-4 w-4" /> {submitted ? "Validation..." : "Commander"}
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="self-start bg-white p-6 shadow-sm lg:sticky lg:top-32">
            <h2 className="mb-5 text-sm font-black uppercase tracking-wider">Résumé</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Articles</span><span>{totalItems}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span>{formatTnd(totalPrice)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Livraison</span><span>{shippingFee === 0 ? "gratuit" : formatTnd(shippingFee)}</span></div>
              {form.giftWrap && <div className="flex justify-between"><span className="text-muted-foreground">Emballage cadeau</span><span>{formatTnd(giftWrapFee)}</span></div>}
              <div className="flex justify-between border-t border-border pt-4 text-lg font-black"><span>Total</span><span>{formatTnd(orderTotal)}</span></div>
            </div>
            {step >= 3 && <p className="mt-5 text-xs leading-5 text-muted-foreground">Livraison: {selectedShipping.title}. Paiement: {selectedPayment.title}.</p>}
            <p className="mt-5 text-xs leading-5 text-muted-foreground">Votre commande sera enregistrée et confirmée par téléphone par notre équipe.</p>
          </aside>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
