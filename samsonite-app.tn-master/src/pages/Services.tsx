import { Link } from "react-router-dom";
import { ArrowRight, Headphones, MapPin, PackageCheck, RotateCcw, ShieldCheck, Truck, Wrench } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const Services = () => {
  const { language, t } = useLanguage();
  const isEn = language === "en";

  const services = [
    {
      icon: Truck,
      title: isEn ? "Delivery options" : "Options de livraison",
      desc: isEn
        ? "Choose standard delivery, express delivery or store pickup depending on your city and urgency."
        : "Choisissez la livraison standard, express ou le retrait boutique selon votre ville et votre urgence.",
      href: "/livraison",
      details: isEn
        ? ["Free from 300 TND", "Express option available", "Order prepared after confirmation"]
        : ["Offerte des 300 TND", "Option express disponible", "Preparation apres confirmation"],
    },
    {
      icon: RotateCcw,
      title: isEn ? "Returns and exchanges" : "Retours et echanges",
      desc: isEn
        ? "A clear return process for items kept in original condition with their labels and packaging."
        : "Un processus clair pour les articles conserves dans leur etat d'origine avec etiquette et emballage.",
      href: "/retours",
      details: isEn
        ? ["Return request reviewed by support", "Exchange possible depending on stock", "Refund after inspection"]
        : ["Demande analysee par le service client", "Echange selon disponibilite", "Remboursement apres controle"],
    },
    {
      icon: ShieldCheck,
      title: isEn ? "Product warranty" : "Garantie produit",
      desc: isEn
        ? "Samsonite products are designed to last and are covered against manufacturing defects."
        : "Les produits Samsonite sont concus pour durer et couverts contre les defauts de fabrication.",
      href: "/services",
      details: isEn
        ? ["Manufacturing defect support", "Repair or replacement guidance", "Proof of purchase required"]
        : ["Prise en charge des defauts de fabrication", "Orientation reparation ou remplacement", "Preuve d'achat demandee"],
    },
    {
      icon: Wrench,
      title: isEn ? "Repair support" : "Assistance reparation",
      desc: isEn
        ? "Our team can guide you for wheels, handles, locks and zippers depending on the model."
        : "Notre equipe vous oriente pour roues, poignees, cadenas et fermetures selon le modele.",
      href: "/contact-faq",
      details: isEn
        ? ["Model identification", "Spare part guidance", "Repair feasibility check"]
        : ["Identification du modele", "Orientation pieces detachees", "Verification de faisabilite"],
    },
    {
      icon: MapPin,
      title: isEn ? "Stores in Tunisia" : "Boutiques en Tunisie",
      desc: isEn
        ? "Find store addresses, opening guidance and directions before visiting."
        : "Retrouvez les adresses, informations pratiques et itineraires avant votre visite.",
      href: "/magasins",
      details: isEn ? ["Tunis", "Sousse", "Mall of Sousse"] : ["Tunis", "Sousse", "Mall of Sousse"],
    },
    {
      icon: Headphones,
      title: isEn ? "Customer care" : "Service client",
      desc: isEn
        ? "Need help before ordering? Contact us with the product name, size or order reference."
        : "Besoin d'aide avant de commander ? Contactez-nous avec le nom du produit, la taille ou la reference.",
      href: "/contact-faq",
      details: isEn
        ? ["Product advice", "Order follow-up", "After-sales support"]
        : ["Conseil produit", "Suivi commande", "Assistance apres-vente"],
    },
  ];

  const reassurance = isEn
    ? [
        { value: "300 TND", label: "Free delivery threshold" },
        { value: "24-72h", label: "Estimated dispatch after confirmation" },
        { value: "Tunisia", label: "Local stores and support" },
      ]
    : [
        { value: "300 TND", label: "Seuil de livraison offerte" },
        { value: "24-72h", label: "Expedition estimee apres confirmation" },
        { value: "Tunisie", label: "Boutiques et support local" },
      ];

  return (
    <div className="bg-white">
      <section className="border-b border-border bg-[#f7f7f5]">
        <div className="samsonite-container grid gap-10 py-14 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
              {isEn ? "Customer experience" : "Experience client"}
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black uppercase tracking-tight md:text-5xl">
              {t("services.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              {isEn
                ? "Everything you need to order with confidence: delivery, returns, warranty, repairs and direct support from the local team."
                : "Tout ce qu'il faut pour commander avec confiance : livraison, retours, garantie, reparations et accompagnement par l'equipe locale."}
            </p>
          </div>

          <div className="grid grid-cols-3 border border-border bg-white">
            {reassurance.map((item) => (
              <div key={item.label} className="border-r border-border p-5 last:border-r-0">
                <p className="text-xl font-black">{item.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase leading-5 text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="samsonite-container py-14">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <article key={service.title} className="group flex min-h-[300px] flex-col border border-border bg-white p-6 transition-shadow hover:shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                  <service.icon className="h-5 w-5" />
                </div>
                <PackageCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <h2 className="mt-6 text-xl font-black uppercase tracking-tight">{service.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{service.desc}</p>
              <ul className="mt-5 space-y-2">
                {service.details.map((detail) => (
                  <li key={detail} className="flex gap-2 text-sm font-semibold">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              <Link to={service.href} className="mt-auto inline-flex items-center gap-2 pt-7 text-xs font-black uppercase tracking-wider">
                {isEn ? "Learn more" : "En savoir plus"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Services;
