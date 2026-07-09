import { HOME_HERO_IMAGE_URL } from "@/config/home";
import { Link, useLocation } from "react-router-dom";

interface ErrorState {
  message?: string;
}

const DataError = () => {
  const location = useLocation();
  //const state = (location.state as ErrorState | null) || null;
 // const message = state?.message || "Impossible de charger les données.";
  const message = "Impossible de charger les données. Veuillez réessayer plus tard.";


  return (
     <> 

      <section className="relative h-[500px] md:h-[650px] flex items-center overflow-hidden">
        <img
          src={HOME_HERO_IMAGE_URL}
          alt="Campagne Samsonite"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.src = "/home-hero.svg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 to-foreground/10 z-10" />
        <div className="samsonite-container relative z-20 text-primary-foreground">
          <p className="text-sm tracking-[0.3em] uppercase mb-4 font-semibold">
            Nouvelle collection
          </p>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-2">
            <em className="not-italic font-extrabold">SOLID</em> AS A ROCK
          </h1>
          <h2 className="text-4xl md:text-6xl font-light mb-8">
            REMARKABLY <em className="font-extrabold italic">LIGHT</em>
          </h2>
          <Link
            to="/categorie/valises"
            className="inline-block bg-primary-foreground text-foreground px-8 py-3.5 text-sm font-bold tracking-wider hover:bg-primary-foreground/90 transition-colors"
          >
            DÉCOUVREZ LA COLLECTION
          </Link>
        </div>
      </section>

    <div className="samsonite-container py-20 text-center">
      
      <h1 className="text-3xl font-bold mb-4">Erreur de chargement</h1>
      <p className="text-muted-foreground mb-8">{message}</p>
      <Link
        to="/"
        className="inline-block bg-foreground text-background px-8 py-3 text-sm font-bold tracking-wider hover:bg-foreground/90 transition-colors"
      >
        RÉESSAYER
      </Link>
    </div>
    </>
  );
};

export default DataError;

