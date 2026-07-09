import { Link } from "react-router-dom";
import { Minus, Plus, X, ArrowLeft, Lock } from "lucide-react";

import { useCart } from "@/hooks/useCart";
import { formatTnd } from "@/lib/currency";

const Cart = () => {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const shippingFee = totalPrice >= 300 ? 0 : 7;

  if (items.length === 0) {
    return (
      <div className="samsonite-container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Votre panier est vide</h1>
        <p className="text-muted-foreground mb-8">
          Decouvrez nos collections et ajoutez des produits a votre panier.
        </p>
        <Link
          to="/"
          className="inline-block bg-foreground text-background px-8 py-3 text-sm font-bold tracking-wider hover:bg-foreground/90 transition-colors"
        >
          CONTINUER MES ACHATS
        </Link>
      </div>
    );
  }

  return (
    <div className="samsonite-container py-8">
      <h1 className="text-2xl font-bold tracking-wider mb-8">PANIER ({totalItems})</h1>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={`${item.product.id}-${item.selectedColor}`} className="flex gap-4 border-b border-border pb-6">
              <Link to={`/produit/${item.product.slug}`} className="w-28 h-28 bg-white flex-shrink-0">
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
                      <p className="text-xs text-muted-foreground mt-1">Couleur: {item.selectedColor}</p>
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
                      className="w-8 h-8 flex items-center justify-center hover:bg-accent"
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
                      className="w-8 h-8 flex items-center justify-center hover:bg-accent"
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
            <ArrowLeft className="h-4 w-4" /> Continuer mes achats
          </Link>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-accent p-6 space-y-4">
            <h2 className="text-sm font-bold tracking-wider">RECAPITULATIF</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatTnd(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison</span>
                <span className="text-samsonite-teal font-medium">
                  {shippingFee === 0 ? "Gratuite" : formatTnd(shippingFee)}
                </span>
              </div>
            </div>
            <div className="border-t border-border pt-4 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatTnd(totalPrice + shippingFee)}</span>
            </div>
            <Link
              to="/commande"
              className="w-full bg-foreground text-background py-3.5 text-sm font-bold tracking-wider hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              PASSER LA COMMANDE
            </Link>
            <p className="text-[11px] text-muted-foreground text-center">Paiement securise par SSL</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
