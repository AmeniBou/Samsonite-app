import { Clock, MapPinned, PackageCheck, ShieldCheck, Truck } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const Shipping = () => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const methods = isEn
    ? [
        { title: "Standard delivery", price: "7 TND", desc: "Free from 300 TND. Estimated delivery after order confirmation." },
        { title: "Express delivery", price: "12 TND", desc: "Priority preparation for urgent orders, depending on city coverage." },
        { title: "Store pickup", price: "Free", desc: "Pickup after phone confirmation from the team." },
      ]
    : [
        { title: "Livraison standard", price: "7 TND", desc: "Offerte a partir de 300 TND. Delai estime apres confirmation de la commande." },
        { title: "Livraison express", price: "12 TND", desc: "Preparation prioritaire pour les commandes urgentes, selon couverture de la ville." },
        { title: "Retrait boutique", price: "Gratuit", desc: "Retrait apres confirmation telephonique par l'equipe." },
      ];

  const steps = isEn
    ? ["Order received in the back office", "Phone confirmation of availability", "Preparation and handover to delivery", "Customer receives tracking or pickup instructions"]
    : ["Commande recue dans le backoffice", "Confirmation telephonique de disponibilite", "Preparation et remise a la livraison", "Le client recoit les indications de suivi ou de retrait"];

  return (
    <div className="bg-white">
      <section className="border-b border-border bg-[#f7f7f5]">
        <div className="samsonite-container py-14">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
            {isEn ? "Delivery information" : "Informations livraison"}
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-5xl">
            {isEn ? "Clear delivery options" : "Livraison claire et suivie"}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
            {isEn
              ? "Every order is checked before dispatch so the team can confirm availability, delivery address and the most suitable method."
              : "Chaque commande est verifiee avant expedition afin de confirmer la disponibilite, l'adresse et le mode de livraison le plus adapte."}
          </p>
        </div>
      </section>

      <section className="samsonite-container grid gap-10 py-14 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5 md:grid-cols-3">
          {methods.map((method) => (
            <article key={method.title} className="border border-border p-6">
              <Truck className="h-7 w-7" />
              <h2 className="mt-5 text-lg font-black uppercase">{method.title}</h2>
              <p className="mt-2 text-2xl font-black">{method.price}</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{method.desc}</p>
            </article>
          ))}
        </div>

        <aside className="border border-border bg-black p-6 text-white">
          <ShieldCheck className="h-7 w-7" />
          <h2 className="mt-5 text-xl font-black uppercase">
            {isEn ? "Before dispatch" : "Avant expedition"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            {isEn
              ? "The team confirms product availability and customer details before preparing the parcel."
              : "L'equipe confirme la disponibilite du produit et les informations client avant preparation du colis."}
          </p>
        </aside>
      </section>

      <section className="border-y border-border bg-[#f7f7f5]">
        <div className="samsonite-container grid gap-8 py-14 lg:grid-cols-[320px_1fr]">
          <div>
            <Clock className="h-8 w-8" />
            <h2 className="mt-4 text-2xl font-black uppercase">{isEn ? "Order timeline" : "Etapes de commande"}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="border border-border bg-white p-5">
                <p className="text-xs font-black text-muted-foreground">0{index + 1}</p>
                <p className="mt-3 text-sm font-bold leading-6">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="samsonite-container grid gap-5 py-14 md:grid-cols-2">
        <div className="border border-border p-6">
          <MapPinned className="h-7 w-7" />
          <h2 className="mt-4 text-xl font-black uppercase">{isEn ? "Coverage" : "Couverture"}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isEn
              ? "Delivery is available across Tunisia. Some remote areas may require additional confirmation."
              : "La livraison est disponible en Tunisie. Certaines zones eloignees peuvent necessiter une confirmation supplementaire."}
          </p>
        </div>
        <div className="border border-border p-6">
          <PackageCheck className="h-7 w-7" />
          <h2 className="mt-4 text-xl font-black uppercase">{isEn ? "Parcel condition" : "Etat du colis"}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isEn
              ? "Please check the parcel condition upon receipt and contact support quickly if anything looks damaged."
              : "Verifiez l'etat du colis a la reception et contactez rapidement le support si un dommage est visible."}
          </p>
        </div>
      </section>
    </div>
  );
};

export default Shipping;
