import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";
import type { CartItem, ProductDisplay } from "@/lib/prestashop/types";

const CART_STORAGE_KEY = "samsonite_cart";

interface CartContextType {
  items: CartItem[];
  addItem: (product: ProductDisplay, quantity?: number, color?: string) => void;
  removeItem: (productId: number, color?: string) => void;
  updateQuantity: (productId: number, quantity: number, color?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: ProductDisplay, quantity = 1, color?: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.selectedColor === color);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.selectedColor === color
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, quantity, selectedColor: color }];
    });
  }, []);

  const removeItem = useCallback((productId: number, color?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.product.id === productId && i.selectedColor === color))
    );
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number, color?: string) => {
    if (quantity <= 0) {
      setItems((prev) =>
        prev.filter((i) => !(i.product.id === productId && i.selectedColor === color))
      );
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId && i.selectedColor === color
          ? { ...i, quantity }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
