import { CheckCircle2, Clock, MapPinned, PackageCheck, ShieldCheck, Truck } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const Shipping = () => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const deliveryFees = isEn
    ? [
        {
          title: "Grand Tunis",
          price: "Free from 350 DT",
          desc: "Delivery fees are offered for eligible orders delivered in Greater Tunis.",
        },
        {
          title: "Outside Grand Tunis",
          price: "10 DT",
          desc: "A fixed delivery fee applies for orders delivered outside Greater Tunis.",
        },
      ]
    : [
        {
          title: "Grand Tunis",
          price: "Gratuite des 350 DT",
          desc: "Les frais de port sont offerts pour les commandes eligibles livrees sur le Grand Tunis.",
        },
        {
          title: "Hors Grand Tunis",
          price: "10 DT",
          desc: "Un forfait de livraison s'applique pour les commandes livrees hors Grand Tunis.",
        },
      ];

  const dispatchRules = isEn
    ? [
        "Orders placed Monday to Friday, excluding public holidays, and confirmed before 17:00 are prepared for dispatch within 48 hours.",
        "Orders placed outside this window are prepared two days after the next opening day.",
        "Delivery time starts from the dispatch date, after payment and team validation.",
      ]
    : [
        "Les commandes passees du lundi au vendredi, hors jours feries, et confirmees avant 17h sont preparees pour une expedition sous 48h.",
        "Les commandes passees en dehors de ce creneau sont preparees deux jours apres la prochaine ouverture.",
        "Le delai de livraison commence a partir de la date d'expedition, apres paiement et validation par notre equipe.",
      ];

  const schedule = isEn
    ? [
        { order: "Saturday after 14:00, weekend and Monday before 08:00", delivery: "Tuesday" },
        { order: "Monday after 08:00 until 17:00", delivery: "Wednesday" },
        { order: "Tuesday after 08:00 until 17:00", delivery: "Thursday" },
        { order: "Wednesday after 08:00 until 17:00", delivery: "Friday" },
        { order: "Thursday after 08:00 until 17:00", delivery: "Saturday" },
        { order: "Friday after 08:00 until Saturday before 14:00", delivery: "Monday" },
      ]
    : [
        { order: "Samedi apres 14h, weekend et lundi avant 8h", delivery: "Mardi" },
        { order: "Lundi apres 8h jusqu'a 17h", delivery: "Mercredi" },
        { order: "Mardi apres 8h jusqu'a 17h", delivery: "Jeudi" },
        { order: "Mercredi apres 8h jusqu'a 17h", delivery: "Vendredi" },
        { order: "Jeudi apres 8h jusqu'a 17h", delivery: "Samedi" },
        { order: "Vendredi apres 8h jusqu'au samedi avant 14h", delivery: "Lundi" },
      ];

  return (
    <div className="bg-white">
      <section className="border-b border-border bg-[#f7f7f5]">
        <div className="samsonite-container grid gap-10 py-14 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
              {isEn ? "Online delivery" : "Livraison en ligne"}
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-5xl">
              {isEn ? "Delivery" : "Livraison"}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
              {isEn
                ? "Samsonite gives special care to the processing, transport and delivery of online luggage orders. Your items are delivered to the address entered during checkout."
                : "Specialise dans la vente en ligne de bagages, Samsonite apporte un soin particulier au traitement, au transport et a la livraison des articles commandes. Vos produits sont livres a l'adresse indiquee lors de la commande."}
            </p>
          </div>

          <div className="border border-border bg-white p-6">
            <ShieldCheck className="h-7 w-7" />
            <h2 className="mt-5 text-xl font-black uppercase">
              {isEn ? "Validated order" : "Commande validee"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isEn
                ? "An order is considered valid once it has been paid and confirmed by the team."
                : "Une commande est consideree comme validee lorsqu'elle est payee et confirmee par notre equipe."}
            </p>
          </div>
        </div>
      </section>

      <section className="samsonite-container py-14">
        <div className="mb-7 flex items-center gap-3">
          <MapPinned className="h-7 w-7" />
          <h2 className="text-2xl font-black uppercase">
            {isEn ? "Delivery fees" : "Frais de livraison"}
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {deliveryFees.map((fee) => (
            <article key={fee.title} className="border border-border p-7">
              <Truck className="h-7 w-7" />
              <h3 className="mt-5 text-xl font-black uppercase">{fee.title}</h3>
              <p className="mt-2 text-3xl font-black">{fee.price}</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{fee.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-[#f7f7f5]">
        <div className="samsonite-container grid gap-10 py-14 lg:grid-cols-[330px_1fr]">
          <div>
            <Clock className="h-8 w-8" />
            <h2 className="mt-4 text-2xl font-black uppercase">
              {isEn ? "Dispatch within 48h" : "Expedition sous 48h"}
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {isEn
                ? "The delivery period starts from the dispatch date, according to order validation and opening days."
                : "Le delai de livraison commence a courir a partir de la date d'expedition, selon la validation de la commande et les jours d'ouverture."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {dispatchRules.map((rule, index) => (
              <div key={rule} className="border border-border bg-white p-5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="mt-4 text-xs font-black text-muted-foreground">0{index + 1}</p>
                <p className="mt-2 text-sm font-semibold leading-6">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="samsonite-container py-14">
        <div className="mb-7 flex items-center gap-3">
          <PackageCheck className="h-7 w-7" />
          <h2 className="text-2xl font-black uppercase">
            {isEn ? "Estimated delivery schedule" : "Tableau estimatif de livraison"}
          </h2>
        </div>

        <div className="overflow-hidden border border-border bg-white">
          <div className="grid grid-cols-[1fr_180px] border-b border-border bg-black px-5 py-4 text-sm font-black uppercase text-white">
            <span>{isEn ? "Order day" : "Jour de commande"}</span>
            <span>{isEn ? "Delivery day" : "Jour de livraison"}</span>
          </div>
          {schedule.map((row) => (
            <div key={row.order} className="grid grid-cols-[1fr_180px] border-b border-border px-5 py-4 text-sm last:border-b-0">
              <span className="font-semibold text-foreground">{row.order}</span>
              <span className="font-black text-foreground">{row.delivery}</span>
            </div>
          ))}
        </div>

        <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">
          {isEn
            ? "These times are indicative and may vary depending on public holidays, delivery area, product availability or order validation."
            : "Ces delais sont indicatifs et peuvent varier selon les jours feries, la zone de livraison, la disponibilite du produit ou la validation de la commande."}
        </p>
      </section>
    </div>
  );
};

export default Shipping;
