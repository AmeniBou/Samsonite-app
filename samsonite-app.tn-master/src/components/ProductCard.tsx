import { Link } from "react-router-dom";

import type { ProductDisplay } from "@/lib/prestashop/types";

interface ProductCardProps {
  product: ProductDisplay;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(price);

const ProductCard = ({ product }: ProductCardProps) => {
  const image = product.images[0] || "/placeholder.svg";
  const productUrl = `/produit/${product.id}-${product.slug}`;

  return (
    <Link to={productUrl} className="group block">
      <div className="relative aspect-square overflow-hidden bg-white">
        {product.badge && (
          <span className="absolute left-2 top-2 z-10 bg-cyan-500 px-2 py-1 text-[10px] font-bold uppercase text-white">
            {product.badge}
          </span>
        )}
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = "/placeholder.svg";
          }}
        />
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs font-bold uppercase tracking-wide text-foreground line-clamp-2">
          {product.name}
        </p>
        {product.shortDescription && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {product.shortDescription}
          </p>
        )}
        <p className="text-sm font-bold text-cyan-500">
          {formatPrice(product.price)} TND
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;
