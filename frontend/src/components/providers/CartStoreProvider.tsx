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

import {
  clearCart as clearPersistedCart,
  readCart,
  writeCart,
  type StoredCart,
} from "../../lib/cartStorage";

type CartStoreState = {
  cart: StoredCart | null;
  hydrated: boolean;
  hydrateCart: () => void;
  replaceCart: (nextCart: StoredCart | null) => void;
  clear: () => void;
};

function createCartStore() {
  return createStore<CartStoreState>()((set, get) => ({
    // Initialize without accessing browser storage during rendering.
    cart: null,
    hydrated: false,

    // Load the persisted cart after the provider mounts.
    hydrateCart: () => {
      if (get().hydrated) return;

      set({
        cart: readCart(),
        hydrated: true,
      });
    },

    // Update the Zustand store and persist the new cart.
    replaceCart: (nextCart) => {
      const normalizedCart =
        nextCart && nextCart.items.length > 0
          ? {
              ...nextCart,
              updatedAt: new Date().toISOString(),
            }
          : null;

      if (normalizedCart) {
        writeCart(normalizedCart);
      } else {
        clearPersistedCart();
      }

      set({ cart: normalizedCart });
    },

    // Clear both persisted and in-memory cart data.
    clear: () => {
      clearPersistedCart();
      set({ cart: null });
    },
  }));
}

type CartStoreApi = ReturnType<typeof createCartStore>;

const CartStoreContext = createContext<CartStoreApi | null>(null);

export function CartStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Create one store per provider instance without reading refs during render.
  const [store] = useState<CartStoreApi>(() => createCartStore());

  // Read localStorage after mounting to avoid SSR hydration mismatches.
  useEffect(() => {
    store.getState().hydrateCart();
  }, [store]);

  return (
    <CartStoreContext.Provider value={store}>
      {children}
    </CartStoreContext.Provider>
  );
}

export function useCartStore<T>(
  selector: (state: CartStoreState) => T,
): T {
  const store = useContext(CartStoreContext);

  if (!store) {
    throw new Error(
      "useCartStore must be used inside CartStoreProvider.",
    );
  }

  return useStore(store, selector);
}