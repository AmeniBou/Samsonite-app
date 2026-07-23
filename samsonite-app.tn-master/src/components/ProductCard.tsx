import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

import type { ProductDisplay } from "@/lib/prestashop/types";
import { useLanguage } from "@/lib/i18n";

interface ProductCardProps {
  product: ProductDisplay;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(price);

const ProductCard = ({ product }: ProductCardProps) => {
  const { t } = useLanguage();
  const image = product.images[0] || "/placeholder.svg";
  const productUrl = `/produit/${product.id}-${product.slug}`;
  const isOutOfStock = !product.stock || product.stock <= 0;
  const visibleColors = product.colors.slice(0, 5);

  return (
    <Link to={productUrl} className="group block">
      <div className="relative aspect-square overflow-hidden bg-white transition-all duration-300 group-hover:shadow-[0_14px_40px_rgba(0,0,0,0.06)]">
        <span
          className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white ${
            isOutOfStock ? "bg-neutral-900" : "bg-emerald-600"
          }`}
        >
          {isOutOfStock ? t("badge.out") : t("badge.available")}
        </span>
        {product.badge && !isOutOfStock && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-cyan-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
            {product.badge}
          </span>
        )}
        <span className="absolute bottom-3 right-3 z-10 flex h-9 w-9 translate-y-2 items-center justify-center bg-black text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-contain p-7 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          onError={(event) => {
            event.currentTarget.src = "/placeholder.svg";
          }}
        />
      </div>

      <div className="mt-4 space-y-2">
        {product.brandName && (
          <span className="inline-flex w-fit rounded-full border border-border bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            {product.brandName}
          </span>
        )}
        <p className="line-clamp-2 text-sm font-black uppercase leading-tight tracking-wide text-foreground">
          {product.name}
        </p>
        {product.shortDescription && (
          <p className="line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
            {product.shortDescription}
          </p>
        )}
        {visibleColors.length > 0 && (
          <div className="flex h-5 items-center gap-1.5">
            {visibleColors.map((color) => (
              <span
                key={`${product.id}-${color.name}`}
                className="h-3.5 w-3.5 rounded-full border border-black/15"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
            {product.colors.length > visibleColors.length && (
              <span className="text-[10px] font-semibold text-muted-foreground">
                +{product.colors.length - visibleColors.length}
              </span>
            )}
          </div>
        )}
        <div className="flex items-end justify-between gap-3 pt-1">
          <p className="text-base font-black text-cyan-600">{formatPrice(product.price)} TND</p>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            {t("product.details")}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
