import { Link } from "react-router-dom";

import { useLanguage } from "@/lib/i18n";

const Personnalisation = () => {
  const { t } = useLanguage();
  const steps = [
    { step: "01", title: t("personalization.step1.title"), desc: t("personalization.step1.text") },
    { step: "02", title: t("personalization.step2.title"), desc: t("personalization.step2.text") },
    { step: "03", title: t("personalization.step3.title"), desc: t("personalization.step3.text") },
  ];
  const faqs = [
    {
      q: t("personalization.faq1.q"),
      a: t("personalization.faq1.a"),
    },
    {
      q: t("personalization.faq2.q"),
      a: t("personalization.faq2.a"),
    },
    {
      q: t("personalization.faq3.q"),
      a: t("personalization.faq3.a"),
    },
    {
      q: t("personalization.faq4.q"),
      a: t("personalization.faq4.a"),
    },
  ];

  return (
    <div>
      <section className="flex h-[400px] items-center bg-samsonite-navy">
        <div className="samsonite-container text-primary-foreground">
          <p className="mb-4 text-xs uppercase tracking-[0.3em]">{t("personalization.eyebrow")}</p>
          <h1 className="text-4xl font-bold md:text-6xl">{t("personalization.title")}</h1>
          <p className="mt-4 max-w-xl text-lg text-primary-foreground/70">{t("personalization.heroText")}</p>
        </div>
      </section>

      <section className="samsonite-container py-16">
        <h2 className="mb-12 text-center text-2xl font-bold">{t("personalization.how")}</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.step} className="space-y-4 text-center">
              <span className="text-5xl font-bold text-muted-foreground/30">{step.step}</span>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-accent py-16">
        <div className="samsonite-container text-center">
          <h2 className="mb-4 text-2xl font-bold">{t("personalization.ctaTitle")}</h2>
          <p className="mx-auto mb-8 max-w-lg text-muted-foreground">{t("personalization.ctaText")}</p>
          <Link
            to="/categorie/valises"
            className="inline-block bg-foreground px-8 py-3.5 text-sm font-bold tracking-wider text-background transition-colors hover:bg-foreground/90"
          >
            {t("personalization.cta")}
          </Link>
        </div>
      </section>

      <section className="samsonite-container py-16">
        <h2 className="mb-8 text-xl font-bold">{t("personalization.faq")}</h2>
        <div className="max-w-3xl space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="border-b border-border pb-4">
              <h3 className="mb-2 font-semibold">{faq.q}</h3>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Personnalisation;
