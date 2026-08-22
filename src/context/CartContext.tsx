"use client";

import { createContext, useContext, useReducer } from "react";
import type { Product } from "@/types";

export type CartItem = { product: Product; quantity: number };

type State = { items: CartItem[] };
type Action =
  | { type: "ADD"; product: Product }
  | { type: "REMOVE"; id: string }
  | { type: "UPDATE"; id: string; quantity: number }
  | { type: "CLEAR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD": {
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });

  const add = (product: Product) => dispatch({ type: "ADD", product });
  const remove = (id: string) => dispatch({ type: "REMOVE", id });
  const update = (id: string, quantity: number) =>
    dispatch({ type: "UPDATE", id, quantity });
  const clear = () => dispatch({ type: "CLEAR" });
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
