'use client';

/**
 * usePersistedCart
 *
 * Thin wrapper over usePosStore that exposes only the cart-related
 * state and actions. Used by the POS terminal page.
 *
 * Persists to sessionStorage via Zustand — carts survive page refreshes
 * within the same tab session but clear when the tab is closed.
 * This is intentional: you don't want yesterday's bar orders in the cart
 * when the morning shift opens the terminal.
 */

import { useMemo } from 'react';
import { usePosStore, type CartItem } from '@/store/pos2.store';

export type { CartItem };

export function usePersistedCart() {
  const {
    carts,
    activeTable,
    hydrated,
    setActiveTable,
    addItem: storeAddItem,
    updateQty: storeUpdateQty,
    setNote: storeSetNote,
    clearCart: storeClearCart,
    clearAll,
  } = usePosStore();

  // Items for the currently active table
  const items = useMemo(() => carts[activeTable] ?? [], [carts, activeTable]);

  // Tables that have items in the cart (for highlighting in table selector)
  const tablesWithItems = useMemo(
    () =>
      Object.entries(carts)
        .filter(([, items]) => items.length > 0)
        .map(([table]) => table),
    [carts],
  );

  // Total items across all tables (for badge)
  const totalItems = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  // Bound to active table
  const addItem = (product: {
    id: string;
    name: string;
    price: number;
    unit: string;
    category?: any;
  }) =>
    storeAddItem(activeTable, {
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      unit: product.unit,
      icon: product.category?.icon ?? '🛍️',
    });

  const updateQty = (productId: string, delta: number) =>
    storeUpdateQty(activeTable, productId, delta);

  // Set to exact quantity (0 removes the item)
  const setQty = (productId: string, qty: number) => {
    if (qty <= 0) storeUpdateQty(activeTable, productId, -9999);
    else {
      const current = (carts[activeTable] ?? []).find((i) => i.productId === productId);
      if (current) storeUpdateQty(activeTable, productId, qty - current.qty);
    }
  };

  const setNote = (productId: string, note: string) => storeSetNote(activeTable, productId, note);

  const clearCart = (table?: string) => storeClearCart(table ?? activeTable);

  return {
    // State
    carts,
    items,
    activeTable,
    hydrated,
    tablesWithItems,
    totalItems,

    // Actions
    setActiveTable,
    addItem,
    updateQty,
    setQty,
    setNote,
    clearCart,
    clearAllCarts: clearAll,
  };
}
