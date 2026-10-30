export type StoredCartItem = {
  id: string;
  restaurant_id: string;
  name: string;
  category?: string;
  description?: string | null;
  price: number | string;
  image_url?: string | null;
  quantity: number;
  calories?: number;
  protein_g?: number | string;
  carbs_g?: number | string;
  fat_g?: number | string;
  fiber_g?: number | string;
  serving_size?: string | null;
};

export type StoredCart = {
  restaurantId: string;
  restaurantName: string;
  restaurantIsOpen: boolean;
  items: StoredCartItem[];
  updatedAt: string;
};

const CART_STORAGE_KEY = 'food-marketplace:cart:v1';

export function readCart(): StoredCart | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as StoredCart;
    if (
      !value ||
      typeof value.restaurantId !== 'string' ||
      !Array.isArray(value.items)
    ) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function writeCart(cart: StoredCart): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // The UI can still operate in memory if browser storage is unavailable.
  }
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}

export const PENDING_ORDER_STORAGE_KEY = 'food-marketplace:pending-order:v1';
