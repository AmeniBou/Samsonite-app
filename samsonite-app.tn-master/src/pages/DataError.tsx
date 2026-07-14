import { Link, useLocation } from "react-router-dom";

import { HOME_HERO_IMAGE_URL } from "@/config/home";
import { useLanguage } from "@/lib/i18n";

interface ErrorState {
  message?: string;
}

const DataError = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const state = (location.state as ErrorState | null) || null;
  const message = state?.message || t("error.data");

  return (
    <>
      <section className="relative flex h-[500px] items-center overflow-hidden md:h-[650px]">
        <img
          src={HOME_HERO_IMAGE_URL}
          alt="Campagne Samsonite"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.src = "/home-hero.svg";
          }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-foreground/80 to-foreground/10" />
        <div className="samsonite-container relative z-20 text-primary-foreground">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em]">
            {t("error.collection")}
          </p>
          <h1 className="mb-2 text-5xl font-bold leading-tight md:text-7xl">
            <em className="not-italic font-extrabold">SOLID</em> AS A ROCK
          </h1>
          <h2 className="mb-8 text-4xl font-light md:text-6xl">
            REMARKABLY <em className="font-extrabold italic">LIGHT</em>
          </h2>
          <Link
            to="/categorie/valises"
            className="inline-block bg-primary-foreground px-8 py-3.5 text-sm font-bold tracking-wider text-foreground transition-colors hover:bg-primary-foreground/90"
          >
            {t("error.discoverCollection")}
          </Link>
        </div>
      </section>

      <div className="samsonite-container py-20 text-center">
        <h1 className="mb-4 text-3xl font-bold">{t("error.loading")}</h1>
        <p className="mb-8 text-muted-foreground">{message}</p>
        <Link
          to="/"
          className="inline-block bg-foreground px-8 py-3 text-sm font-bold tracking-wider text-background transition-colors hover:bg-foreground/90"
        >
          {t("error.retry")}
        </Link>
      </div>
    </>
  );
};

export default DataError;
