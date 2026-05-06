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

export type TerminalStaff = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  position: string;
};

function todaySessionKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

interface PosState {
  // ── Cart — per table ────────────────────────────────────────────────────────
  carts: Record<string, CartItem[]>;
  activeTable: string;

  // ── Terminal session ────────────────────────────────────────────────────────
  terminalId: string | null; // which physical terminal this device is bound to
  terminalDeviceKey: string | null; // server-issued device binding key
  staffSession: TerminalStaff | null; // who is currently operating

  // ── Order config ────────────────────────────────────────────────────────────
  discount: number; // percentage: 0 | 5 | 10 | 15 | 20

  // ── POS management UI ───────────────────────────────────────────────────────
  groupOrder: string[]; // terminal group sort order

  // ── Hydration ────────────────────────────────────────────────────────────────
  hydrated: boolean;
  sessionDate: string;

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
  setTerminalDeviceKey: (key: string | null) => void;
  setStaffSession: (staff: TerminalStaff) => void;
  clearStaffSession: () => void;
  resetTerminal: () => void; // full reset — unbinds device

  // ── Group order ─────────────────────────────────────────────────────────────
  setGroupOrder: (order: string[]) => void;
  moveGroup: (label: string, direction: 'up' | 'down') => void;

  // ── Internal ────────────────────────────────────────────────────────────────
  setHydrated: (v: boolean) => void;
  setSessionDate: (value: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      carts: {},
      activeTable: '',
      terminalId: null,
      terminalDeviceKey: null,
      staffSession: null,
      discount: 0,
      groupOrder: [],
      hydrated: false,
      sessionDate: todaySessionKey(),

      // ── Cart ────────────────────────────────────────────────────────────────
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
        set((state) => ({
          carts: {
            ...state.carts,
            [tableNo]: (state.carts[tableNo] ?? []).map((i) =>
              i.productId === productId ? { ...i, note } : i,
            ),
          },
        })),

      clearCart: (tableNo) =>
        set((state) => {
          const { [tableNo]: _, ...rest } = state.carts;
          return { carts: rest, discount: 0 };
        }),

      clearAll: () => set({ carts: {}, activeTable: '', discount: 0 }),

      // ── Session ─────────────────────────────────────────────────────────────
      setDiscount: (pct) => set({ discount: pct }),
      setTerminalId: (id) => set({ terminalId: id }),
      setTerminalDeviceKey: (key) => set({ terminalDeviceKey: key }),
      setStaffSession: (staff) => set({ staffSession: staff }),
      clearStaffSession: () => set({ staffSession: null }),

      // Full reset — used when manager wants to re-register the device
      resetTerminal: () =>
        set({
          terminalId: null,
          terminalDeviceKey: null,
          staffSession: null,
          carts: {},
          activeTable: '',
          discount: 0,
          sessionDate: todaySessionKey(),
        }),

      // ── Group order ──────────────────────────────────────────────────────────
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

      // ── Internal ─────────────────────────────────────────────────────────────
      setHydrated: (v) => set({ hydrated: v }),
      setSessionDate: (value) => set({ sessionDate: value }),
    }),
    {
      name: 'hotel-pos',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : localStorage,
      ),
      partialize: (state) => ({
        carts: state.carts,
        activeTable: state.activeTable,
        terminalId: state.terminalId,
        terminalDeviceKey: state.terminalDeviceKey,
        staffSession: state.staffSession,
        discount: state.discount,
        groupOrder: state.groupOrder,
        sessionDate: state.sessionDate,
        // hydrated intentionally excluded — always starts false
      }),
      onRehydrateStorage: () => (state) => {
        const today = todaySessionKey();
        if (state && state.sessionDate !== today) {
          state.clearAll();
          state.setSessionDate(today);
        }
        state?.setHydrated(true);
      },
    },
  ),
);
