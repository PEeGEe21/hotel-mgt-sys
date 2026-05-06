'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  Search,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Loader2,
  CheckCircle2,
  Clock,
  Trash2,
  Tag,
  Table2,
  ArrowLeft,
  AlertCircle,
  BedDouble,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePosProducts } from '@/hooks/pos/usePosProducts';
import {
  useCreateOrder,
  useDeliverOrder,
  usePayOrder,
  usePayOrderById,
  usePosOrders,
  useUpdateOrderStatus,
  type ApiOrder,
} from '@/hooks/pos/usePosOrders';
import openToast from '@/components/ToastComponent';
import { useDebounce } from '@/hooks/useDebounce';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

type CartItem = {
  productId: string;
  name: string;
  price: number;
  unit: string;
  icon: string;
  qty: number;
  note: string;
};
type PayMethod = 'CASH' | 'CARD' | 'ROOM_CHARGE' | 'TRANSFER';

const PAY_METHODS: { id: PayMethod; label: string; icon: any }[] = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'CARD', label: 'Card / POS', icon: CreditCard },
  { id: 'ROOM_CHARGE', label: 'Room Charge', icon: BedDouble },
  { id: 'TRANSFER', label: 'Transfer', icon: Smartphone },
];

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20];

// ─── Room Charge Modal ────────────────────────────────────────────────────────
function RoomChargeModal({
  total,
  onClose,
  onConfirm,
}: {
  total: number;
  onClose: () => void;
  onConfirm: (reservationId: string, roomNo: string) => void;
}) {
  const [roomNo, setRoomNo] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<{ id: string; reservationNo: string; guest: string } | null>(
    null,
  );
  const [error, setError] = useState('');

  // In real implementation this would search reservations by roomNo
  const handleSearch = async () => {
    if (!roomNo.trim()) return setError('Enter a room number.');
    setSearching(true);
    setError('');
    try {
      // Placeholder — in real use, query GET /reservations?roomNo=&status=CHECKED_IN
      await new Promise((r) => setTimeout(r, 300));
      // For now just allow manual entry
      setFound({ id: 'manual', reservationNo: `Room ${roomNo}`, guest: `Room ${roomNo} Guest` });
      setReservationId('manual');
    } catch {
      setError('No active reservation found for this room.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Charge to Room</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-[#0f1117] rounded-xl p-4 flex justify-between">
            <span className="text-slate-500 text-sm">Charge amount</span>
            <span className="text-emerald-400 font-bold text-base">{fmtMoney(total)}</span>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Room Number
            </label>
            <div className="flex gap-2">
              <input
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. 304"
                autoFocus
                className="flex-1 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {searching ? <Loader2 size={14} className="animate-spin" /> : 'Find'}
              </button>
            </div>
          </div>
          {found && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{found.guest}</p>
                <p className="text-xs text-slate-500">{found.reservationNo}</p>
              </div>
            </div>
          )}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => found && onConfirm(reservationId, roomNo)}
            disabled={!found}
            className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            Charge to Room
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────
function PaymentModal({
  total,
  onClose,
  onConfirm,
  isLoading,
}: {
  total: number;
  onClose: () => void;
  onConfirm: (method: PayMethod, amountTendered?: number) => void;
  isLoading: boolean;
}) {
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [cash, setCash] = useState('');
  const change = method === 'CASH' && Number(cash) >= total ? Number(cash) - total : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Collect Payment</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="bg-[#0f1117] rounded-xl p-4 mb-5">
          <div className="flex justify-between text-xl font-bold">
            <span className="text-white">Total</span>
            <span className="text-emerald-400">{fmtMoney(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {PAY_METHODS.filter((m) => m.id !== 'ROOM_CHARGE').map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMethod(id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${method === id ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {method === 'CASH' && (
          <div className="mb-4 space-y-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider block">
              Cash tendered
            </label>
            <input
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="0"
              autoFocus
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-3 text-lg font-bold text-white outline-none focus:border-emerald-500 transition-colors"
            />
            {change > 0 && (
              <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
                <span className="text-sm text-emerald-400">Change</span>
                <span className="text-lg font-bold text-emerald-400">{fmtMoney(change)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(method, method === 'CASH' && cash ? Number(cash) : undefined)}
            disabled={isLoading || (method === 'CASH' && cash !== '' && Number(cash) < total)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Terminal ────────────────────────────────────────────────────────────
export default function PosTerminalPage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [activeTable, setActiveTable] = useState('BAR');
  const [discount, setDiscount] = useState(0);
  const [view, setView] = useState<'order' | 'receipts'>('order');
  const [showPay, setShowPay] = useState(false);
  const [showRoom, setShowRoom] = useState(false);

  // Cart: tableNo → items
  const [carts, setCarts] = useState<Record<string, CartItem[]>>({});
  const items = carts[activeTable] ?? [];

  // ── Data ───────────────────────────────────────────────────────────────────
  const debouncedSearch = useDebounce(search, 300);
  const { data: productsData, isLoading: productsLoading } = usePosProducts({
    search: debouncedSearch || undefined,
    category: category || undefined,
    isAvailable: 'true',
    limit: 100,
  });
  const { data: ordersData, isLoading: ordersLoading } = usePosOrders({
    status: 'DELIVERED',
    limit: 30,
  });

  const products = productsData?.products ?? [];
  const categories = productsData?.categories ?? [];
  const recentOrders = ordersData?.orders ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createOrder = useCreateOrder();
  const deliverOrder = useDeliverOrder();
  const payOrderById = usePayOrderById();

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const addItem = (product: any) => {
    setCarts((prev) => {
      const list = [...(prev[activeTable] ?? [])];
      const idx = list.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], qty: list[idx].qty + 1 };
      } else {
        list.push({
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          unit: product.unit,
          icon: product.category?.icon ?? '🛍️',
          qty: 1,
          note: '',
        });
      }
      return { ...prev, [activeTable]: list };
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCarts((prev) => {
      const list = (prev[activeTable] ?? [])
        .map((i) => (i.productId === productId ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0);
      return { ...prev, [activeTable]: list };
    });
  };

  const clearCart = () => setCarts((prev) => ({ ...prev, [activeTable]: [] }));

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(subtotal * (discount / 100));
  const taxable = subtotal - discountAmt;
  // Tax comes from hotel settings — using 7.5% as default
  const tax = Math.round(taxable * 0.075);
  const total = taxable + tax;

  // ── Submit order + pay for walk-in ──────────────────────────────────────────
  const handlePay = async (method: PayMethod, amountTendered?: number) => {
    if (items.length === 0) return;
    try {
      const order = await createOrder.mutateAsync({
        type: activeTable === 'WALKUP' ? 'TAKEAWAY' : 'DINE_IN',
        tableNo: activeTable,
        discount: discountAmt,
        items: items.map((i) => ({ productId: i.productId, quantity: i.qty })),
      });

      // 2. Mark as DELIVERED (triggers inventory deduction)
      await deliverOrder.mutateAsync(order.id);

      // 3. Record payment
      const result = await payOrderById.mutateAsync({
        orderId: order.id,
        method,
        amountTendered,
      });

      clearCart();
      setDiscount(0);
      setShowPay(false);

      if (method === 'CASH' && result.change > 0) {
        openToast('success', `Payment received — Change: ${fmtMoney(result.change)}`);
      } else {
        openToast('success', 'Order complete');
      }
    } catch (e: any) {
      openToast('error', e?.response?.data?.message ?? 'Order failed');
    }
  };

  const handleRoomCharge = async (reservationId: string, roomNo: string) => {
    if (items.length === 0) return;
    try {
      await createOrder.mutateAsync({
        type: 'ROOM_SERVICE',
        roomNo,
        reservationId: reservationId === 'manual' ? undefined : reservationId,
        discount: discountAmt,
        items: items.map((i) => ({ productId: i.productId, quantity: i.qty })),
      });
      clearCart();
      setDiscount(0);
      setShowRoom(false);
      openToast('success', `Charged to Room ${roomNo}`);
    } catch (e: any) {
      openToast('error', e?.response?.data?.message ?? 'Room charge failed');
    }
  };

  const tablesWithOrders = Object.entries(carts)
    .filter(([, items]) => items.length > 0)
    .map(([table]) => table);

  const TABLES = ['BAR', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'POOL', 'VIP', 'WALKUP'];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0f1117] overflow-hidden -m-6">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#161b27] border-b border-[#1e2536] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/pos')}
            className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-lg p-1">
            <button
              onClick={() => setView('order')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'order' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <ShoppingCart size={12} className="inline mr-1" /> Order
            </button>
            <button
              onClick={() => setView('receipts')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${view === 'receipts' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Receipt size={12} /> Receipts
              {recentOrders.length > 0 && (
                <span className="bg-slate-700 text-slate-400 rounded-full px-1.5 text-[10px]">
                  {recentOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <Clock size={11} />
          {new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* ── ORDER VIEW ── */}
      {view === 'order' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: products */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search + categories */}
            <div className="px-4 pt-3 pb-2 space-y-2 shrink-0 bg-[#0f1117] border-b border-[#1e2536]">
              <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2">
                <Search size={13} className="text-slate-500 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setCategory('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${!category ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${category === c ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {productsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 size={20} className="animate-spin text-slate-500" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {products.map((p) => {
                    const inCart = items.find((i) => i.productId === p.id);
                    const icon = (p as any).category?.icon ?? '🛍️';
                    return (
                      <button
                        key={p.id}
                        onClick={() => addItem(p)}
                        disabled={!p.isAvailable}
                        className={`relative bg-[#161b27] border rounded-xl p-3 text-left transition-all active:scale-95 ${
                          !p.isAvailable
                            ? 'opacity-40 cursor-not-allowed border-[#1e2536]'
                            : inCart
                              ? 'border-blue-500/40 bg-blue-500/5 hover:brightness-110'
                              : 'border-[#1e2536] hover:border-slate-600 hover:brightness-110'
                        }`}
                      >
                        {inCart && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {inCart.qty}
                          </span>
                        )}
                        <div className="text-2xl mb-2">{icon}</div>
                        <p className="text-sm font-semibold text-white leading-tight line-clamp-2">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.unit}</p>
                        <p className="text-sm font-bold text-blue-400 mt-1.5">
                          {fmtMoney(Number(p.price))}
                        </p>
                      </button>
                    );
                  })}
                  {products.length === 0 && !productsLoading && (
                    <div className="col-span-5 py-16 text-center">
                      <p className="text-slate-600 text-sm">No products found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: order panel */}
          <div className="w-72 xl:w-80 flex flex-col border-l border-[#1e2536] bg-[#0f1117] shrink-0">
            {/* Table selector */}
            <div className="px-4 pt-3 pb-2 border-b border-[#1e2536] shrink-0">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">
                Table / Location
              </p>
              <div className="flex flex-wrap gap-1">
                {TABLES.map((t) => {
                  const hasItems = (carts[t] ?? []).length > 0;
                  return (
                    <button
                      key={t}
                      onClick={() => setActiveTable(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        activeTable === t
                          ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                          : hasItems
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'bg-[#161b27] border-[#1e2536] text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {t}
                      {hasItems && activeTable !== t ? ' •' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <ShoppingCart size={24} className="text-slate-700 mb-2" />
                  <p className="text-slate-600 text-sm">No items</p>
                  <p className="text-slate-700 text-xs mt-0.5">Tap a product to add</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-2 group">
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{fmtMoney(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQty(item.productId, -1)}
                        className="w-6 h-6 rounded-md bg-[#161b27] border border-[#1e2536] flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
                      >
                        <Minus size={9} className="text-slate-400" />
                      </button>
                      <span className="text-xs font-bold text-white w-5 text-center">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.productId, 1)}
                        className="w-6 h-6 rounded-md bg-[#161b27] border border-[#1e2536] flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/30 transition-colors"
                      >
                        <Plus size={9} className="text-slate-400" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-slate-300 w-16 text-right shrink-0">
                      {fmtMoney(item.price * item.qty)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Discount */}
            {items.length > 0 && (
              <div className="px-4 py-2 border-t border-[#1e2536] shrink-0">
                <div className="flex items-center gap-2">
                  <Tag size={12} className="text-slate-500" />
                  <span className="text-xs text-slate-500">Discount</span>
                  <div className="flex gap-1 ml-auto">
                    {DISCOUNT_OPTIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDiscount(d)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                          discount === d
                            ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                            : 'bg-[#161b27] border-[#1e2536] text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        {d}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Totals + actions */}
            <div className="px-4 py-3 border-t border-[#1e2536] space-y-3 shrink-0">
              {items.length > 0 ? (
                <>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>{fmtMoney(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Discount ({discount}%)</span>
                        <span>-{fmtMoney(discountAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>VAT (7.5%)</span>
                      <span>{fmtMoney(tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white text-sm pt-1 border-t border-[#1e2536]">
                      <span>Total</span>
                      <span className="text-emerald-400">{fmtMoney(total)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowRoom(true)}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600/15 border border-violet-500/20 hover:bg-violet-600/25 text-violet-400 text-xs font-semibold transition-colors"
                    >
                      <BedDouble size={13} /> Room
                    </button>
                    <button
                      onClick={clearCart}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-[#1e2536] text-slate-500 text-xs font-medium transition-colors"
                    >
                      <Trash2 size={13} /> Clear
                    </button>
                  </div>

                  <button
                    onClick={() => setShowPay(true)}
                    disabled={createOrder.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-bold transition-colors"
                  >
                    {createOrder.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CreditCard size={14} />
                    )}
                    Charge {fmtMoney(total)}
                  </button>
                </>
              ) : (
                <p className="text-center text-xs text-slate-700 py-2">
                  Add items to start an order
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── RECEIPTS VIEW ── */}
      {view === 'receipts' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Recent Orders</p>
            <p className="text-xs text-slate-500">
              {recentOrders.length} orders ·{' '}
              {fmtMoney(recentOrders.reduce((s, o) => s + Number(o.total), 0))} total
            </p>
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-slate-500" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No orders yet today</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#161b27] border border-[#1e2536] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Table2 size={14} className="text-slate-500" />
                      <span className="text-sm font-bold text-white">
                        {order.tableNo ?? order.roomNo ?? '—'}
                      </span>
                      <span className="text-xs font-mono text-slate-600">{order.orderNo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleTimeString('en-NG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                          order.isPaid
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : order.reservationId
                              ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        }`}
                      >
                        {order.isPaid
                          ? order.paymentMethod
                          : order.reservationId
                            ? 'Room Charge'
                            : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span className="text-slate-400">
                          {item.name} ×{item.quantity}
                        </span>
                        <span className="text-slate-500">{fmtMoney(Number(item.total))}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-slate-700">+{order.items.length - 3} more items</p>
                    )}
                  </div>
                  <div className="border-t border-[#1e2536] pt-2 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-sm font-bold text-white">
                      {fmtMoney(Number(order.total))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showPay && (
        <PaymentModal
          total={total}
          onClose={() => setShowPay(false)}
          onConfirm={handlePay}
          isLoading={createOrder.isPending}
        />
      )}
      {showRoom && (
        <RoomChargeModal
          total={total}
          onClose={() => setShowRoom(false)}
          onConfirm={handleRoomCharge}
        />
      )}
    </div>
  );
}
