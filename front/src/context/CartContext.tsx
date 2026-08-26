"use client";

import { createContext, useContext, useEffect, useReducer, useRef } from "react";
import type { Product } from "@/types";

export type CartItem = { product: Product; quantity: number };

type State = { items: CartItem[] };
type Action =
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "ADD"; product: Product }
  | { type: "REMOVE"; id: string }
  | { type: "UPDATE"; id: string; quantity: number }
  | { type: "CLEAR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { items: action.items.filter((item) => item.product.price > 0) };
    case "ADD": {
      if (action.product.price <= 0) return state;
      const found = state.items.find((i) => i.product.id === action.product.id);
      if (found) {
        return {
          items: state.items.map((i) =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { product: action.product, quantity: 1 }] };
    }
    case "REMOVE":
      return { items: state.items.filter((i) => i.product.id !== action.id) };
    case "UPDATE":
      return {
        items: state.items
          .map((i) =>
            i.product.id === action.id ? { ...i, quantity: action.quantity } : i
          )
          .filter((i) => i.quantity > 0),
      };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

type CartCtx = {
  items: CartItem[];
  add: (product: Product) => void;
  remove: (id: string) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
  count: number;
  total: number;
};

const CartContext = createContext<CartCtx | null>(null);
const CART_STORAGE_KEY = "e-kit-cart";

function persist(items: CartItem[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // The cart still works in memory when storage is unavailable.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const stateRef = useRef(state);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!saved) return;
      const items: unknown = JSON.parse(saved);
      if (Array.isArray(items)) {
        const hydrated = { items: (items as CartItem[]).filter((item) => item.product.price > 0) };
        stateRef.current = hydrated;
        dispatch({ type: "HYDRATE", items: hydrated.items });
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  const run = (action: Action) => {
    const next = reducer(stateRef.current, action);
    stateRef.current = next;
    persist(next.items);
    dispatch(action);
  };

  const add = (product: Product) => run({ type: "ADD", product });
  const remove = (id: string) => run({ type: "REMOVE", id });
  const update = (id: string, quantity: number) => run({ type: "UPDATE", id, quantity });
  const clear = () => run({ type: "CLEAR" });
  const count = state.items.reduce((s, i) => s + i.quantity, 0);
  const total = state.items.reduce(
    (s, i) => s + i.product.price * i.quantity,
    0
  );

  return (
    <CartContext.Provider value={{ items: state.items, add, remove, update, clear, count, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
