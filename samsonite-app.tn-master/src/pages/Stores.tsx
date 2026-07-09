import { MapPin } from "lucide-react";

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
    district: "Kal3a Lekbira",
    city: "Sousse",
    address: "Mall of Sousse, Km 127 GP1, Kal3a Lekbira, Sousse",
  },
];

const Stores = () => {
  return (
    <div>
      <section className="bg-accent py-12">
        <div className="samsonite-container">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Nos adresses</p>
          <h1 className="mt-2 text-3xl font-bold tracking-wider">NOS MAGASINS</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Retrouvez nos boutiques en Tunisie et choisissez le point de vente le plus proche de vous.
          </p>
        </div>
      </section>

      <section className="samsonite-container py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {stores.map((store) => (
            <article
              key={store.id}
              className="group border border-border bg-background p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Boutique {store.id}</p>
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
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Stores;

