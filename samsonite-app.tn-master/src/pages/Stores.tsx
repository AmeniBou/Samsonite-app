import { ExternalLink, MapPin } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const stores = [
  {
    id: "01",
    district: "Menzah 9",
    city: "Tunis",
    address: "39 Avenue Taher Ben Ammar, Menzah 9, Tunis",
  },
  {
    id: "02",
    district: "Lac",
    city: "Tunis",
    address: "Au Carre du Lac, Tunis",
  },
  {
    id: "03",
    district: "Charguia 1",
    city: "Tunis",
    address: "9 Rue Zi, Charguia 1, Tunis",
  },
  {
    id: "04",
    district: "Mall of Sousse",
    city: "Sousse",
    address: "Mall of Sousse, Km 127 GP1, Sousse",
  },
];

const getMapUrl = (address: string) =>
  `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

const getDirectionsUrl = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

const Stores = () => {
  const { t } = useLanguage();

  return (
    <div>
      <section className="bg-accent py-12">
        <div className="samsonite-container">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {t("stores.eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-wider">{t("stores.title")}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{t("stores.text")}</p>
        </div>
      </section>

      <section className="samsonite-container py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {stores.map((store) => (
            <article
              key={store.id}
              className="group premium-surface overflow-hidden bg-background transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(0,0,0,0.1)]"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {t("stores.store")} {store.id}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold">{store.district}</h2>
                  </div>
                  <span className="inline-flex items-center border border-border px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {store.city}
                  </span>
                </div>

                <div className="mt-5 flex items-start gap-3 text-sm text-foreground/90">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <p>{store.address}</p>
                </div>

                <a
                  href={getDirectionsUrl(store.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="premium-control mt-5 inline-flex items-center gap-2 border border-foreground px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-foreground hover:text-background"
                >
                  {t("stores.directions")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="h-64 border-t border-border bg-accent/40">
                <iframe
                  title={`Carte ${store.district}`}
                  src={getMapUrl(store.address)}
                  className="h-full w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Stores;
