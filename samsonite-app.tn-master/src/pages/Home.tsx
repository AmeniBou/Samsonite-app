import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import BrandLoader from "@/components/BrandLoader";
import ProductCard from "@/components/ProductCard";
import { fetchDisplayCategories, fetchDisplayProducts } from "@/lib/prestashop/catalog";
import type { CategoryDisplay, ProductDisplay } from "@/lib/prestashop/types";
import { useLanguage } from "@/lib/i18n";

const homeCategoryImageMap = [
  {
    match: ["valise", "valises", "rigide", "souple"],
    image: "/assets/home-category-valises.png",
  },
  {
    match: ["sac", "sacs", "sac-a-dos", "backpack"],
    image: "/assets/home-category-sacs.png",
  },
  {
    match: ["business", "ordinateur", "pilot", "portefeuille"],
    image: "/assets/home-category-business.png",
  },
  {
    match: ["disney", "enfant", "kids"],
    image: "/assets/home-category-disney.png",
  },
];

const getHomeCategoryImage = (category: CategoryDisplay) => {
  const haystack = `${category.slug} ${category.name}`.toLowerCase();
  return homeCategoryImageMap.find((entry) => entry.match.some((keyword) => haystack.includes(keyword)))?.image || category.image || "/placeholder.svg";
};

const Home = () => {
  const { t } = useLanguage();
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
          setDataError(error instanceof Error ? error.message : t("error.prestashopLoad"));
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
        state={{ message: `${t("error.prestashopLoad")}: ${dataError}` }}
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
      <section className="relative flex h-[500px] items-center overflow-hidden border-b border-border md:h-[650px]">
        <img
          src="/assets/home-hero.jpg"
          alt="Campagne Samsonite"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/45 to-transparent" />
        <div className="container relative z-10 mx-auto px-6">
          <h1 className="mb-4 max-w-2xl text-4xl font-black leading-none tracking-tight text-white md:text-6xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mb-8 max-w-lg text-lg text-white/80 md:text-xl">
            {t("home.heroText")}
          </p>
          <Link
            to="/categorie/valises"
            className="premium-control inline-flex bg-white px-8 py-3 font-bold text-black transition-colors hover:bg-white/90"
          >
            {t("home.shopNow")}
          </Link>
        </div>
      </section>

      <section className="samsonite-container border-b border-border py-12">
        <h2 className="mb-8 text-lg font-extrabold uppercase tracking-wider text-foreground">
          {t("home.recommendations")}
        </h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="samsonite-container border-b border-border py-12">
        <h2 className="mb-8 text-lg font-extrabold uppercase tracking-wider text-foreground">
          {t("home.shopLook")}
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {displayCategoryBlocks.map((cat) => (
            <Link
              key={cat.id}
              to={`/categorie/${cat.slug}`}
              className="group premium-surface relative aspect-[9/10] overflow-hidden bg-accent"
            >
              <img
                src={getHomeCategoryImage(cat)}
                alt={cat.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(event) => {
                  if (event.currentTarget.dataset.fallback !== "category" && cat.image) {
                    event.currentTarget.dataset.fallback = "category";
                    event.currentTarget.src = cat.image;
                    return;
                  }
                  event.currentTarget.src = "/placeholder.svg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-lg font-black uppercase tracking-wide text-primary-foreground">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
        {displayCategoryBlocks.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("home.noCategories")}</p>
        )}
      </section>

      <section className="samsonite-container border-b border-border py-16">
        <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
          <div className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground">
              <span className="text-lg font-bold">✓</span>
            </div>
            <h3 className="text-sm font-bold tracking-wider">{t("home.globalWarranty")}</h3>
            <p className="text-sm text-muted-foreground">{t("home.globalWarrantyText")}</p>
          </div>
          <div className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground">
              <span className="text-lg font-bold">♻</span>
            </div>
            <h3 className="text-sm font-bold tracking-wider">{t("home.eco")}</h3>
            <p className="text-sm text-muted-foreground">{t("home.ecoText")}</p>
          </div>
          <div className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground">
              <span className="text-lg font-bold">★</span>
            </div>
            <h3 className="text-sm font-bold tracking-wider">{t("product.freeShipping")}</h3>
            <p className="text-sm text-muted-foreground">{t("checkout.shipping.standardDesc")}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
