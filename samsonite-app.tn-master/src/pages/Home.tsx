import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import BrandLoader from "@/components/BrandLoader";
import ProductCard from "@/components/ProductCard";
import homeHero from "@/assets/home-hero.jpg";

import { HOME_HERO_IMAGE_URL, HOME_LOOK_IMAGE_URL } from "@/config/home";
import {
  fetchDisplayCategories,
  fetchDisplayProducts,
} from "@/lib/prestashop/catalog";
import type { CategoryDisplay, ProductDisplay } from "@/lib/prestashop/types";

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState<ProductDisplay[]>([]);
  const [categoryBlocks, setCategoryBlocks] = useState<CategoryDisplay[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const displayCategoryBlocks = categoryBlocks.slice(0, 4);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [products, categories] = await Promise.all([
          fetchDisplayProducts(),
          fetchDisplayCategories(),
        ]);

        if (!cancelled) {
          setFeaturedProducts(products.slice(0, 8));
          setCategoryBlocks(categories);
          setDataError(null);
        }
      } catch (error) {
        console.error("Unable to load Prestashop data on home page", error);
        if (!cancelled) {
          setDataError(error instanceof Error ? error.message : "Erreur Prestashop");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (dataError) {
    return (
      <Navigate
        to="/erreur"
        replace
        state={{ message: `Erreur de chargement Prestashop: ${dataError}` }}
      />
    );
  }

  if (loading) {
    return (
      <BrandLoader
        imageSrc="/assets/logo-loader.png"
        imageAlt="Chargement"
        spinImage
        hideMessage
        className="min-h-[calc(100vh-180px)] bg-[#f3f3f3]"
      />
    );
  }

  return (
    <div>
      <section className="relative h-[500px] md:h-[650px] flex items-center overflow-hidden border-b border-border">
<img
          src="/assets/home-hero.jpg"
          alt="Campagne Samsonite"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 container mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 max-w-2xl">
            Travel in Style
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-lg">
            Discover the latest Samsonite collections — Magnum Eco, Proxis & more.
          </p>
          <button className="bg-white text-black px-8 py-3 rounded-md font-semibold hover:bg-white/90 transition-colors">
            Shop Now
          </button>
          </div>
      </section>


      <section className="samsonite-container py-12 border-b border-border">
        <h2 className="text-l font-extrabold text-foreground tracking-wider uppercase mb-8">
          Nos recommandations
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="samsonite-container py-12 border-b border-border">
        <h2 className="text-l font-extrabold text-foreground tracking-wider uppercase mb-8">
          Achetez votre look préféré
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayCategoryBlocks.map((cat) => (
            <Link
              key={cat.id}
              to={`/categorie/${cat.slug}`}
              className="group relative aspect-[9/10] overflow-hidden bg-accent"
            >
              <img
                src={cat.image || "/placeholder.svg"}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(event) => {
                  event.currentTarget.src = "/placeholder.svg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-lg font-bold text-primary-foreground">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
        {displayCategoryBlocks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune categorie disponible pour le moment.
          </p>
        )}
      </section>

      <section className="bg-accent border-b border-border">
        <div className="samsonite-container py-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <img
              src={HOME_LOOK_IMAGE_URL}
              alt="Shop the look"
              className="aspect-[4/5] w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = "/home-look.svg";
              }}
            />
            <div className="space-y-6">
              <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground">
                Shop the look
              </p>
              <h2 className="text-3xl md:text-4xl font-display leading-tight">
                Quand l&apos;élégance rencontre la fonctionnalité
              </h2>
              <p className="text-muted-foreground">
                Découvrez nos collections conçues pour les voyageurs exigeants.
                Alliant style et praticité, chaque pièce est pensée pour sublimer vos
                déplacements.
              </p>
              <Link
                to="/categorie/valises"
                className="inline-flex items-center gap-2 text-sm font-bold tracking-wider hover:gap-3 transition-all"
              >
                DÉCOUVRIR <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="samsonite-container py-16 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto border-2 border-foreground rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">✓</span>
            </div>
            <h3 className="text-sm font-bold tracking-wider">GARANTIE MONDIALE</h3>
            <p className="text-sm text-muted-foreground">
              Tous nos produits sont garantis contre les défauts de fabrication.
            </p>
          </div>
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto border-2 border-foreground rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">♻</span>
            </div>
            <h3 className="text-sm font-bold tracking-wider">ECO-RESPONSABLE</h3>
            <p className="text-sm text-muted-foreground">
              Des matériaux recyclés pour un avenir plus durable.
            </p>
          </div>
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto border-2 border-foreground rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">★</span>
            </div>
            <h3 className="text-sm font-bold tracking-wider">PERSONNALISATION</h3>
            <p className="text-sm text-muted-foreground">
              Gravez vos initiales pour un bagage unique.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
