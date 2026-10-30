/*
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type CartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

type AddableItem = {
  id: string;
  name: string;
  price: number | string;
};

type CartStoreState = {
  items: CartLine[];
  ready: boolean;

  hydrateCart: () => void;
  addItem: (item: AddableItem) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

type CartContextValue = {
  items: CartLine[];
  count: number;
  total: number;
  ready: boolean;
  addItem: (item: AddableItem) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

type CartStoreApi = ReturnType<typeof createCartStore>;

const STORAGE_KEY = "cart";
const EMPTY_CART: CartLine[] = [];

const CartStoreContext = createContext<CartStoreApi | null>(null);

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    typeof item.qty === "number" &&
    Number.isInteger(item.qty) &&
    item.qty > 0
  );
}

function readCartFromStorage(): CartLine[] {
  if (typeof window === "undefined") {
    return EMPTY_CART;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return EMPTY_CART;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return EMPTY_CART;
    }

    return parsed.filter(isCartLine);
  } catch {
    return EMPTY_CART;
  }
}

function createCartStore() {
  return createStore<CartStoreState>()((set, get) => {
    function persistItems(items: CartLine[]) {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(items),
          );
        }
      } catch {
        // Keep in-memory cart functionality if storage is unavailable.
      }

      set({
        items,
        ready: true,
      });
    }

    return {
      items: EMPTY_CART,
      ready: false,

      hydrateCart: () => {
        if (get().ready) {
          return;
        }

        set({
          items: readCartFromStorage(),
          ready: true,
        });
      },

      addItem: (item) => {
        const price = Number(item.price);

        if (!Number.isFinite(price)) {
          return;
        }

        const currentItems = get().items;
        const existingItem = currentItems.find(
          (line) => line.id === item.id,
        );

        const nextItems = existingItem
          ? currentItems.map((line) =>
              line.id === item.id
                ? { ...line, qty: line.qty + 1 }
                : line,
            )
          : [
              ...currentItems,
              {
                id: item.id,
                name: item.name,
                price,
                qty: 1,
              },
            ];

        persistItems(nextItems);
      },

      removeItem: (id) => {
        persistItems(
          get().items.filter((item) => item.id !== id),
        );
      },

      setQty: (id, qty) => {
        if (qty <= 0) {
          persistItems(
            get().items.filter((item) => item.id !== id),
          );
          return;
        }

        persistItems(
          get().items.map((item) =>
            item.id === id ? { ...item, qty } : item,
          ),
        );
      },

      clear: () => {
        persistItems([]);
      },
    };
  });
}

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  // One Zustand store per provider instance.
  const [store] = useState(() => createCartStore());

  // Read localStorage after mounting to avoid hydration mismatches.
  useEffect(() => {
    store.getState().hydrateCart();
  }, [store]);

  return (
    <CartStoreContext.Provider value={store}>
      {children}
    </CartStoreContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const store = useContext(CartStoreContext);

  if (!store) {
    throw new Error(
      "useCart must be used inside <CartProvider>",
    );
  }

  const state = useStore(store, (current) => current);

  const count = state.items.reduce(
    (sum, item) => sum + item.qty,
    0,
  );

  const total = state.items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );

  return {
    items: state.items,
    count,
    total,
    ready: state.ready,
    addItem: state.addItem,
    removeItem: state.removeItem,
    setQty: state.setQty,
    clear: state.clear,
  };
}
  */