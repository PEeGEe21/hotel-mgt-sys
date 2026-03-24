'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────
export type CartItem = {
  productId: string;
  name: string;
  price: number;
  unit: string;
  icon: string;
  qty: number;
  note: string;
};

interface PosState {
  // ── Cart — per table ────────────────────────────────────────────────────────
  carts: Record<string, CartItem[]>; // tableNo → items
  activeTable: string;

  // ── Terminal session ────────────────────────────────────────────────────────
  discount: number; // percentage: 0 | 5 | 10 | 15 | 20
  terminalId: string | null;

  // ── POS management UI — group ordering ─────────────────────────────────────
  groupOrder: string[];

  // ── Hydration flag ──────────────────────────────────────────────────────────
  // Used to prevent rendering until sessionStorage has been read
  hydrated: boolean;

  // ── Cart actions ────────────────────────────────────────────────────────────
  setActiveTable: (table: string) => void;
  addItem: (tableNo: string, item: Omit<CartItem, 'qty' | 'note'>) => void;
  updateQty: (tableNo: string, productId: string, delta: number) => void;
  setNote: (tableNo: string, productId: string, note: string) => void;
  clearCart: (tableNo: string) => void;
  clearAll: () => void;

  // ── Session actions ─────────────────────────────────────────────────────────
  setDiscount: (pct: number) => void;
  setTerminalId: (id: string | null) => void;

  // ── Group order actions (POS config tab) ────────────────────────────────────
  setGroupOrder: (order: string[]) => void;
  moveGroup: (label: string, direction: 'up' | 'down') => void;

  // ── Internal ────────────────────────────────────────────────────────────────
  setHydrated: (v: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      carts: {},
      activeTable: '',
      discount: 0,
      terminalId: null,
      groupOrder: [],
      hydrated: false,

      // ── Cart ──────────────────────────────────────────────────────────────
      setActiveTable: (table) => set({ activeTable: table, discount: 0 }),

      addItem: (tableNo, item) =>
        set((state) => {
          const list = [...(state.carts[tableNo] ?? [])];
          const idx = list.findIndex((i) => i.productId === item.productId);
          if (idx >= 0) {
            list[idx] = { ...list[idx], qty: list[idx].qty + 1 };
          } else {
            list.push({ ...item, qty: 1, note: '' });
          }
          return { carts: { ...state.carts, [tableNo]: list } };
        }),

      updateQty: (tableNo, productId, delta) =>
        set((state) => {
          const list = (state.carts[tableNo] ?? [])
            .map((i) => (i.productId === productId ? { ...i, qty: i.qty + delta } : i))
            .filter((i) => i.qty > 0);
          return { carts: { ...state.carts, [tableNo]: list } };
        }),

      setNote: (tableNo, productId, note) =>
        set((state) => {
          const list = (state.carts[tableNo] ?? []).map((i) =>
            i.productId === productId ? { ...i, note } : i,
          );
          return { carts: { ...state.carts, [tableNo]: list } };
        }),

      clearCart: (tableNo) =>
        set((state) => {
          const { [tableNo]: _, ...rest } = state.carts;
          return { carts: rest, discount: 0 };
        }),

      clearAll: () => set({ carts: {}, activeTable: '', discount: 0 }),

      // ── Session ────────────────────────────────────────────────────────────
      setDiscount: (pct) => set({ discount: pct }),
      setTerminalId: (id) => set({ terminalId: id }),

      // ── Group order ────────────────────────────────────────────────────────
      setGroupOrder: (order) => set({ groupOrder: order }),

      moveGroup: (label, direction) =>
        set((state) => {
          const prev = state.groupOrder;
          const index = prev.indexOf(label);
          if (index === -1) return {};
          const swapIndex = direction === 'up' ? index - 1 : index + 1;
          if (swapIndex < 0 || swapIndex >= prev.length) return {};
          const next = [...prev];
          [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
          return { groupOrder: next };
        }),

      // ── Internal ───────────────────────────────────────────────────────────
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: 'hotel-pos',
      storage: createJSONStorage(() => sessionStorage), // clears on tab close — correct for POS
      partialize: (state) => ({
        carts: state.carts,
        activeTable: state.activeTable,
        discount: state.discount,
        terminalId: state.terminalId,
        groupOrder: state.groupOrder,
        // hydrated is intentionally excluded — always starts false
      }),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated after sessionStorage is read
        state?.setHydrated(true);
      },
    },
  ),
);
