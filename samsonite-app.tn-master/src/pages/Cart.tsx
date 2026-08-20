import { Link } from "react-router-dom";
import { BadgePercent, Minus, Plus, Trash2, ArrowLeft, Lock } from "lucide-react";

import { useCart } from "@/hooks/useCart";
import { formatTnd } from "@/lib/currency";
import { useLanguage } from "@/lib/i18n";
import type { CartItem, ProductVariant } from "@/lib/prestashop/types";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

const normalizeKey = (value?: string) => (value || "").trim().toLowerCase();

const getCartVariant = (item: CartItem): ProductVariant | undefined =>
  item.product.variants?.find((variant) =>
    item.variantId
      ? variant.combinationId === item.variantId
      : normalizeKey(variant.color?.name) === normalizeKey(item.selectedColor) &&
      normalizeKey(variant.size) === normalizeKey(item.selectedSize)
  );

const getVariantDimensions = (variant: ProductVariant | undefined, item: CartItem) => {
  if (variant?.dimensions) return variant.dimensions;
  const physical = [variant?.height, variant?.width, variant?.depth]
    .map((value) => (value || "").trim())
    .filter(Boolean)
    .join(" x ");
  return physical ? `${physical} cm` : item.product.dimensions || "";
};

const getItemPricing = (item: CartItem, variant?: ProductVariant) => {
  const unitPrice = variant?.price && variant.price > 0 ? variant.price : item.product.price;
  const originalUnitPrice = variant?.hasPromotion && variant.originalPrice && variant.originalPrice > unitPrice
    ? variant.originalPrice
    : item.product.hasPromotion && item.product.originalPrice && item.product.originalPrice > unitPrice
      ? item.product.originalPrice
      : unitPrice;
  const discountPercent = variant?.hasPromotion ? variant.discountPercent : item.product.discountPercent;
  return { unitPrice, originalUnitPrice, discount: Math.max(0, originalUnitPrice - unitPrice), discountPercent };
};

const Cart = () => {
  const { t, td } = useLanguage();
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const promotionSavings = items.reduce((sum, item) => {
    const variant = getCartVariant(item);
    return sum + getItemPricing(item, variant).discount * item.quantity;
  }, 0);
  const totalBeforePromotion = totalPrice + promotionSavings;
  const shippingFee = totalPrice >= 300 ? 0 : 7;

  if (items.length === 0) {
    return (
      <div className="samsonite-container py-20 text-center">
        <h1 className="text-xl font-bold mb-4">{t("cart.emptyTitle")}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          {t("cart.emptyText")}
        </p>
        <Link
          to="/"
          className="inline-block bg-foreground text-background px-8 py-3 text-xs font-bold tracking-wider hover:bg-foreground/90 transition-colors"
        >
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="samsonite-container py-8">
      <h1 className="text-xl font-bold tracking-wider mb-8">
        {t("cart.title")} ({totalItems})
      </h1>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => {
            const variant = getCartVariant(item);
            const dimensions = getVariantDimensions(variant, item);
            const volume = variant?.volume || item.product.volume || "";
            const weight = variant?.weight || item.product.weight || "";
            const pricing = getItemPricing(item, variant);

            return (
              <div key={`${item.product.id}-${item.variantId || item.selectedColor}`} className="flex gap-4 border-b border-border pb-6 transition-colors hover:bg-accent/35 sm:p-3">
                <Link to={`/produit/${item.product.slug}`} className="h-28 w-28 flex-shrink-0 bg-white">
                  <img
                    src={item.product.images[0]}
                    alt={td(item.product.name)}
                    className="w-full h-full object-contain"
                  />
                </Link>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <Link to={`/produit/${item.product.slug}`} className="font-bold text-xs hover:underline">
                        {td(item.product.name)}
                      </Link>
                      <div className="mt-1 space-y-0.5">
                        {item.selectedColor && (
                          <p className="text-[11px] text-muted-foreground">
                            {t("product.color")}: {td(item.selectedColor)}
                          </p>
                        )}
                        {item.selectedSize && (
                          <p className="text-[11px] text-muted-foreground">{t("product.size")}: {td(item.selectedSize)}</p>
                        )}
                        {dimensions && <p className="text-[11px] text-muted-foreground">{t("product.dimension")}: {dimensions}</p>}
                        {volume && <p className="text-[11px] text-muted-foreground">{td("Volume")}: {volume}</p>}
                        {weight && <p className="text-[11px] text-muted-foreground">{td("Poids")}: {weight}</p>}
                        {item.sku && (
                          <p className="text-[11px] text-muted-foreground">SKU: {item.sku}</p>
                        )}
                        {pricing.discount > 0 && <span className="mt-2 inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-700"><BadgePercent className="h-3.5 w-3.5" />{t("cart.promotion")} -{Math.round(pricing.discountPercent || 0)}%</span>}
                      </div>
                    </div>
                    <ConfirmDeleteDialog
                      title={t("cart.removeTitle")}
                      description={t("cart.removeText").replace("{name}", td(item.product.name))}
                      onConfirm={() => removeItem(item.product.id, item.selectedColor, item.variantId)}
                    >
                      {(openDialog) => (
                        <button
                          type="button"
                          onClick={openDialog}
                          className="inline-flex items-center gap-2 self-start border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-red-600 transition-colors hover:border-red-200 hover:bg-red-100"
                          aria-label={t("cart.removeTitle")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("cart.remove")}
                        </button>
                      )}
                    </ConfirmDeleteDialog>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-border">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1, item.selectedColor, item.variantId)
                        }
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-accent"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-10 h-8 flex items-center justify-center text-xs border-x border-border">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1, item.selectedColor, item.variantId)
                        }
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-accent"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      {pricing.discount > 0 && <p className="text-xs text-muted-foreground line-through">{formatTnd(pricing.originalUnitPrice * item.quantity)}</p>}
                      <span className={`font-bold text-sm ${pricing.discount > 0 ? "text-red-600" : ""}`}>{formatTnd(pricing.unitPrice * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("cart.continue")}
          </Link>
        </div>

        <div className="lg:col-span-1">
          <div className="premium-surface sticky top-36 space-y-4 bg-white p-6">
            <h2 className="text-xs font-bold tracking-wider">{t("cart.summary")}</h2>
            <div className="space-y-2 text-xs">
              {promotionSavings > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("cart.beforePromotion")}
                    </span>
                    <span>{formatTnd(totalBeforePromotion)}</span>
                  </div>

                  <div className="flex justify-between text-red-600">
                    <span className="inline-flex items-center gap-1">
                      <BadgePercent className="h-3.5 w-3.5" />
                      {t("cart.promotion")}
                    </span>

                    <span className="font-semibold">
                      -{formatTnd(promotionSavings)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                <span>{formatTnd(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cart.shipping")}</span>
                <span className="text-samsonite-teal font-medium">
                  {shippingFee === 0 ? t("cart.free") : formatTnd(shippingFee)}
                </span>
              </div>
            </div>
            <div className="border-t border-border pt-4 flex justify-between font-bold text-sm">
              <span>{t("cart.total")}</span>
              <span>{formatTnd(totalPrice + shippingFee)}</span>
            </div>
            <Link
              to="/commande"
              className="premium-control flex w-full items-center justify-center gap-2 bg-foreground py-3.5 text-xs font-bold tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              <Lock className="h-4 w-4" />
              {t("cart.checkout")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
