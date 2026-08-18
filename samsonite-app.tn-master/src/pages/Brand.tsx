import { Link } from "react-router-dom";
import { Award, Building2, Globe2, Leaf, Mail, MapPin, Phone, ShieldCheck, Sparkles, Store } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const Brand = () => {
  const { language, t } = useLanguage();
  const isEn = language === "en";

  const values = [
    {
      icon: Sparkles,
      title: t("brand.value.innovation.title"),
      desc: t("brand.value.innovation.text"),
    },
    {
      icon: Leaf,
      title: t("brand.value.sustainability.title"),
      desc: t("brand.value.sustainability.text"),
    },
    {
      icon: Award,
      title: t("brand.value.design.title"),
      desc: t("brand.value.design.text"),
    },
  ];

  const facts = isEn
    ? [
        { value: "1910", label: "Samsonite heritage" },
        { value: "Tunisia", label: "Local presence" },
        { value: "Global", label: "Travel expertise" },
      ]
    : [
        { value: "1910", label: "Heritage Samsonite" },
        { value: "Tunisie", label: "Presence locale" },
        { value: "Global", label: "Expertise voyage" },
      ];

  const companyInfo = isEn
    ? [
        {
          icon: Building2,
          title: "Company",
          lines: ["Samsonite Tunisia", "Luggage, bags and travel accessories"],
        },
        {
          icon: MapPin,
          title: "Address",
          lines: ["9, Rue 8601 Zone Industrielle", "Charguia 1, 2035 Ariana, Tunisia"],
        },
        {
          icon: Phone,
          title: "Phone",
          lines: ["26 528 103", "71 809 209"],
        },
        {
          icon: Mail,
          title: "Customer contact",
          lines: ["For orders, availability and after-sales support", "Use the contact and store pages"],
        },
      ]
    : [
        {
          icon: Building2,
          title: "Société",
          lines: ["Samsonite Tunisie", "Bagages, sacs et accessoires de voyage"],
        },
        {
          icon: MapPin,
          title: "Adresse",
          lines: ["9, Rue 8601 Zone Industrielle", "Charguia 1, 2035 Ariana, Tunisie"],
        },
        {
          icon: Phone,
          title: "Téléphone",
          lines: ["26 528 103", "71 809 209"],
        },
        {
          icon: Mail,
          title: "Contact client",
          lines: ["Pour commandes, disponibilites et service apres-vente", "Utilisez les pages contact et magasins"],
        },
      ];

  const commitments = isEn
    ? [
        "Offer reliable luggage designed for everyday travel and long journeys.",
        "Help customers choose the right suitcase, size, bag or travel accessory.",
        "Provide local support through stores, phone assistance and after-sales guidance.",
        "Maintain clear information about delivery, returns, warranty and product availability.",
      ]
    : [
        "Proposer des bagages fiables pour les voyages quotidiens comme les longs deplacements.",
        "Aider les clients a choisir la bonne valise, taille, sac ou accessoire de voyage.",
        "Assurer un accompagnement local via les boutiques, le telephone et le service apres-vente.",
        "Donner des informations claires sur la livraison, les retours, la garantie et la disponibilite.",
      ];

  return (
    <div className="bg-white">
      <section className="relative flex min-h-[520px] items-end overflow-hidden">
        <img src="/assets/home-hero.jpg" alt="Samsonite Tunisie" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
        <div className="samsonite-container relative z-10 pb-14 text-white">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-white/75">
            {isEn ? "About us" : "A propos"}
          </p>
          <h1 className="max-w-3xl text-5xl font-black uppercase leading-none tracking-tight md:text-7xl">
            {isEn ? "Samsonite Tunisia" : "Samsonite Tunisie"}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
            {isEn
              ? "A local destination for Samsonite luggage, bags and travel accessories, with dedicated support before and after every purchase."
              : "Une adresse locale pour les bagages, sacs et accessoires de voyage Samsonite, avec un accompagnement avant et apres chaque achat."}
          </p>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="samsonite-container grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {facts.map((item) => (
            <div key={item.label} className="py-7 md:px-8">
              <p className="text-3xl font-black">{item.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="samsonite-container grid gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="border border-border bg-[#f7f7f5] p-8">
          <ShieldCheck className="h-9 w-9" />
          <h2 className="mt-5 text-3xl font-black uppercase">
            {isEn ? "Who we are" : "Qui sommes-nous ?"}
          </h2>
          <p className="mt-5 leading-7 text-muted-foreground">
            {isEn
              ? "Samsonite Tunisia supports customers looking for durable, practical and elegant travel solutions. The store experience and online catalogue are built around one objective: helping each customer travel with confidence."
              : "Samsonite Tunisie accompagne les clients a la recherche de solutions de voyage durables, pratiques et elegantes. L'experience boutique et le catalogue en ligne ont un objectif simple : aider chaque client a voyager avec confiance."}
          </p>
          <p className="mt-4 leading-7 text-muted-foreground">
            {isEn
              ? "From hard suitcases to soft luggage, business bags, backpacks and accessories, the selection brings together products designed for mobility, protection and comfort."
              : "Des valises rigides aux bagages souples, sacs business, sacs à dos et accessoires, la sélection rassemble des produits conçus pour la mobilité, la protection et le confort."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {companyInfo.map((item) => (
            <article key={item.title} className="border border-border p-6">
              <item.icon className="h-7 w-7" />
              <h3 className="mt-5 text-lg font-black uppercase">{item.title}</h3>
              <div className="mt-3 space-y-1 text-sm leading-6 text-muted-foreground">
                {item.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-[#f7f7f5]">
        <div className="samsonite-container grid gap-12 py-16 lg:grid-cols-[330px_1fr]">
          <div>
            <Globe2 className="h-8 w-8" />
            <h2 className="mt-4 text-2xl font-black uppercase">
              {isEn ? "Our commitments" : "Nos engagements"}
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {isEn
                ? "A serious ecommerce experience depends on trust, clear information and accessible support."
                : "Une experience ecommerce serieuse repose sur la confiance, des informations claires et un support accessible."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {commitments.map((commitment, index) => (
              <article key={commitment} className="border border-border bg-white p-5">
                <p className="text-xs font-black text-muted-foreground">0{index + 1}</p>
                <p className="mt-3 text-sm font-semibold leading-6">{commitment}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="samsonite-container py-16">
        <div className="mb-8 flex items-center gap-3">
          <Sparkles className="h-7 w-7" />
          <h2 className="text-2xl font-black uppercase">{t("brand.valuesTitle")}</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {values.map((value) => (
            <article key={value.title} className="border border-border p-6">
              <value.icon className="h-7 w-7" />
              <h3 className="mt-5 text-lg font-black uppercase">{value.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{value.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-black text-white">
        <div className="samsonite-container flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <Store className="h-7 w-7" />
            <h2 className="mt-4 text-2xl font-black uppercase">
              {isEn ? "Find a Samsonite store" : "Trouver une boutique Samsonite"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              {isEn
                ? "Visit our stores for product advice, availability, warranty guidance or pickup information."
                : "Rendez-vous en boutique pour un conseil produit, une disponibilite, une garantie ou une information de retrait."}
            </p>
          </div>
          <Link to="/magasins" className="inline-flex justify-center border border-white px-6 py-3 text-sm font-black uppercase tracking-wide">
            {isEn ? "Store addresses" : "Voir les adresses"}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Brand;
