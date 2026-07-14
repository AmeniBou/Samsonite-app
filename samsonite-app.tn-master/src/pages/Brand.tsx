import { Award, Leaf, ShieldCheck, Sparkles } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const Brand = () => {
  const { language, t } = useLanguage();
  const isEn = language === "en";

  const values = [
    { icon: Sparkles, title: t("brand.value.innovation.title"), desc: t("brand.value.innovation.text") },
    { icon: Leaf, title: t("brand.value.sustainability.title"), desc: t("brand.value.sustainability.text") },
    { icon: Award, title: t("brand.value.design.title"), desc: t("brand.value.design.text") },
  ];

  const proof = isEn
    ? [
        { value: "1910", label: "Brand founded" },
        { value: "Global", label: "Warranty mindset" },
        { value: "Travel", label: "Built for movement" },
      ]
    : [
        { value: "1910", label: "Creation de la marque" },
        { value: "Global", label: "Esprit garantie mondiale" },
        { value: "Voyage", label: "Concu pour bouger" },
      ];

  return (
    <div className="bg-white">
      <section className="relative flex min-h-[520px] items-end overflow-hidden">
        <img src="/assets/home-hero.jpg" alt="Samsonite heritage" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
        <div className="samsonite-container relative z-10 pb-14 text-white">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-white/75">{t("brand.eyebrow")}</p>
          <h1 className="max-w-3xl text-5xl font-black uppercase leading-none tracking-tight md:text-7xl">{t("brand.title")}</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">{t("brand.heroText")}</p>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="samsonite-container grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {proof.map((item) => (
            <div key={item.label} className="py-7 md:px-8">
              <p className="text-3xl font-black">{item.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="samsonite-container grid gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="border border-border bg-[#f7f7f5] p-8">
          <ShieldCheck className="h-9 w-9" />
          <h2 className="mt-5 text-3xl font-black uppercase">{t("brand.historyTitle")}</h2>
          <p className="mt-5 leading-7 text-muted-foreground">{t("brand.historyText1")}</p>
          <p className="mt-4 leading-7 text-muted-foreground">{t("brand.historyText2")}</p>
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

      <section className="border-y border-border bg-[#f7f7f5]">
        <div className="samsonite-container grid gap-12 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">{t("brand.ecoEyebrow")}</p>
            <h2 className="mt-3 text-3xl font-black uppercase">{t("brand.ecoTitle")}</h2>
            <p className="mt-5 leading-7 text-muted-foreground">{t("brand.ecoText")}</p>
            <ul className="mt-6 grid gap-3">
              {[t("brand.ecoPoint1"), t("brand.ecoPoint2"), t("brand.ecoPoint3")].map((point) => (
                <li key={point} className="flex items-center gap-3 text-sm font-bold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Leaf className="h-3.5 w-3.5" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-border bg-white p-8">
            <h3 className="text-xl font-black uppercase">
              {isEn ? "Designed for real journeys" : "Pensee pour les vrais voyages"}
            </h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {isEn
                ? "A reassuring luggage brand is not only about style. It is about durability, spare parts, after-sales guidance and clear information before purchase."
                : "Une marque de bagagerie rassurante ne se limite pas au style. Elle repose sur la durabilite, les pieces, l'accompagnement apres-vente et des informations claires avant achat."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Brand;
