import { Link } from "react-router-dom";
import { Minus, Plus, X, ArrowLeft, Lock } from "lucide-react";

import { useCart } from "@/hooks/useCart";
import { formatTnd } from "@/lib/currency";
import { useLanguage } from "@/lib/i18n";

const Cart = () => {
  const { t } = useLanguage();
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const shippingFee = totalPrice >= 300 ? 0 : 7;

  if (items.length === 0) {
    return (
      <div className="samsonite-container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("cart.emptyTitle")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("cart.emptyText")}
        </p>
        <Link
          to="/"
          className="inline-block bg-foreground text-background px-8 py-3 text-sm font-bold tracking-wider hover:bg-foreground/90 transition-colors"
        >
          {t("cart.continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="samsonite-container py-8">
      <h1 className="text-2xl font-bold tracking-wider mb-8">
        {t("cart.title")} ({totalItems})
      </h1>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={`${item.product.id}-${item.selectedColor}`} className="flex gap-4 border-b border-border pb-6 transition-colors hover:bg-accent/35 sm:p-3">
              <Link to={`/produit/${item.product.slug}`} className="h-28 w-28 flex-shrink-0 bg-white">
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-full h-full object-contain"
                />
              </Link>
              <div className="flex-1">
                <div className="flex justify-between">
                  <div>
                    <Link to={`/produit/${item.product.slug}`} className="font-bold text-sm hover:underline">
                      {item.product.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.product.shortDescription}</p>
                    {item.selectedColor && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("cart.color")}: {item.selectedColor}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id, item.selectedColor)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border border-border">
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity - 1, item.selectedColor)
                      }
                      className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-accent"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-10 h-8 flex items-center justify-center text-sm border-x border-border">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1, item.selectedColor)
                      }
                      className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-accent"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="font-bold">{formatTnd(item.product.price * item.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("cart.continue")}
          </Link>
        </div>

        <div className="lg:col-span-1">
          <div className="premium-surface sticky top-36 space-y-4 bg-white p-6">
            <h2 className="text-sm font-bold tracking-wider">{t("cart.summary")}</h2>
            <div className="space-y-2 text-sm">
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
            <div className="border-t border-border pt-4 flex justify-between font-bold">
              <span>{t("cart.total")}</span>
              <span>{formatTnd(totalPrice + shippingFee)}</span>
            </div>
            <Link
              to="/commande"
              className="premium-control flex w-full items-center justify-center gap-2 bg-foreground py-3.5 text-sm font-bold tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              <Lock className="h-4 w-4" />
              {t("cart.checkout")}
            </Link>
            <p className="text-[11px] text-muted-foreground text-center">{t("cart.secure")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
