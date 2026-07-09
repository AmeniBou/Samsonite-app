import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import BrandLoader from "@/components/BrandLoader";
import { fetchDisplayProducts } from "@/lib/prestashop/catalog";
import type { ProductDisplay } from "@/lib/prestashop/types";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const normalizedQuery = query.trim().toLowerCase();
  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const fetchedProducts = await fetchDisplayProducts();
        if (!cancelled) setProducts(fetchedProducts);
      } catch (error) {
        console.error("Unable to load Prestashop search data", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    if (!normalizedQuery) return products;
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.shortDescription.toLowerCase().includes(normalizedQuery) ||
        product.collection.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [normalizedQuery, products]);

  return (
    <div className="samsonite-container py-8">
      <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">
          Accueil
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Recherche</span>
      </nav>

      <h1 className="text-2xl font-bold mb-2">Resultats pour "{query}"</h1>
      <p className="text-muted-foreground mb-8">{results.length} produit(s) trouves</p>

      {loading ? (
        <BrandLoader
          imageSrc="/assets/logo-loader.png"
          imageAlt="Chargement"
          spinImage
          hideMessage
          className="min-h-[calc(100vh-180px)] bg-[#f3f3f3]"
        />
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground mb-4">Aucun resultat trouve.</p>
          <Link to="/" className="text-sm font-bold underline">
            Retour a l accueil
          </Link>
        </div>
      )}
    </div>
  );
};

export default Search;
