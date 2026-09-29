import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";
import type { CartItem, ProductDisplay } from "@/lib/prestashop/types";

const CART_STORAGE_KEY = "samsonite_cart";
const WHEEL_REWARD_STORAGE_KEY = "samsonite_wheel_reward";

const getCartItemUnitPrice = (item: CartItem) => {
  const variant = item.product.variants.find((candidate) => candidate.combinationId === item.variantId);
  return variant?.price && variant.price > 0 ? variant.price : item.product.price;
};

type CartSelection = string | {
  color?: string;
  size?: string;
  variantId?: number;
  sku?: string;
  maxStock?: number;
};

export interface WheelReward {
  code: string;
  percentage: number;
  label: string;
  createdAt: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: ProductDisplay, quantity?: number, selection?: CartSelection) => void;
  removeItem: (productId: number, color?: string, variantId?: number) => void;
  updateQuantity: (productId: number, quantity: number, color?: string, variantId?: number) => void;
  clearCart: () => void;
  wheelReward: WheelReward | null;
  applyWheelReward: (reward: WheelReward) => void;
  clearWheelReward: () => void;
  totalItems: number;
  totalPrice: number;
  wheelDiscountAmount: number;
  discountedSubtotal: number;
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
  const [wheelReward, setWheelReward] = useState<WheelReward | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(WHEEL_REWARD_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.code && Number(parsed.percentage) > 0 ? parsed : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (wheelReward) {
      localStorage.setItem(WHEEL_REWARD_STORAGE_KEY, JSON.stringify(wheelReward));
    } else {
      localStorage.removeItem(WHEEL_REWARD_STORAGE_KEY);
    }
  }, [wheelReward]);

  const addItem = useCallback((product: ProductDisplay, quantity = 1, selection?: CartSelection) => {
    const normalized =
      typeof selection === "string"
        ? { color: selection }
        : selection || {};
    setItems((prev) => {
      const existing = prev.find((i) =>
        i.product.id === product.id &&
        (normalized.variantId ? i.variantId === normalized.variantId : i.selectedColor === normalized.color)
      );
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id &&
          (normalized.variantId ? i.variantId === normalized.variantId : i.selectedColor === normalized.color)
            ? { ...i, quantity: Math.min((i.maxStock || Number.POSITIVE_INFINITY), i.quantity + quantity) }
            : i
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: Math.min(normalized.maxStock || Number.POSITIVE_INFINITY, quantity),
          selectedColor: normalized.color,
          selectedSize: normalized.size,
          variantId: normalized.variantId,
          sku: normalized.sku,
          maxStock: normalized.maxStock,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: number, color?: string, variantId?: number) => {
    setItems((prev) =>
      prev.filter((i) => !(i.product.id === productId && (variantId ? i.variantId === variantId : i.selectedColor === color)))
    );
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number, color?: string, variantId?: number) => {
    if (quantity <= 0) {
      setItems((prev) =>
        prev.filter((i) => !(i.product.id === productId && (variantId ? i.variantId === variantId : i.selectedColor === color)))
      );
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId && (variantId ? i.variantId === variantId : i.selectedColor === color)
          ? { ...i, quantity: Math.min(i.maxStock || Number.POSITIVE_INFINITY, quantity) }
          : i
      )
    );
  }, []);

  const clearWheelReward = useCallback(() => setWheelReward(null), []);

  const applyWheelReward = useCallback((reward: WheelReward) => {
    setWheelReward(reward);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setWheelReward(null);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + getCartItemUnitPrice(i) * i.quantity, 0);
  const wheelDiscountAmount = wheelReward ? totalPrice * (wheelReward.percentage / 100) : 0;
  const discountedSubtotal = Math.max(0, totalPrice - wheelDiscountAmount);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        wheelReward,
        applyWheelReward,
        clearWheelReward,
        totalItems,
        totalPrice,
        wheelDiscountAmount,
        discountedSubtotal,
      }}
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
