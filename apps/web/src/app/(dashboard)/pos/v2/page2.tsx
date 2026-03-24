'use client';

import { useState, useMemo } from 'react';
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
  ChevronDown,
  CheckCircle2,
  Clock,
  Trash2,
  Tag,
  Users,
  Table2,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Category =
  | 'All'
  | 'Spirits'
  | 'Beer'
  | 'Wine'
  | 'Cocktails'
  | 'Soft Drinks'
  | 'Food'
  | 'Shisha';
type PayMethod = 'cash' | 'card' | 'room_charge' | 'transfer';

type Product = {
  id: string;
  name: string;
  category: Exclude<Category, 'All'>;
  price: number;
  unit: string;
  emoji: string;
  available: boolean;
};
type OrderItem = { product: Product; qty: number; note: string };
type TableOrder = { table: string; items: OrderItem[]; openedAt: string };

// ─── Seed products ─────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Heineken',
    category: 'Beer',
    price: 1200,
    unit: 'bottle',
    emoji: '🍺',
    available: true,
  },
  {
    id: 'p2',
    name: 'Guinness',
    category: 'Beer',
    price: 1100,
    unit: 'bottle',
    emoji: '🍺',
    available: true,
  },
  {
    id: 'p3',
    name: 'Star Lager',
    category: 'Beer',
    price: 900,
    unit: 'bottle',
    emoji: '🍺',
    available: true,
  },
  {
    id: 'p4',
    name: 'Trophy Lager',
    category: 'Beer',
    price: 850,
    unit: 'bottle',
    emoji: '🍺',
    available: true,
  },
  {
    id: 'p5',
    name: 'Jameson',
    category: 'Spirits',
    price: 3500,
    unit: '50ml',
    emoji: '🥃',
    available: true,
  },
  {
    id: 'p6',
    name: 'Hennessy VS',
    category: 'Spirits',
    price: 4500,
    unit: '50ml',
    emoji: '🥃',
    available: true,
  },
  {
    id: 'p7',
    name: 'Johnnie Walker',
    category: 'Spirits',
    price: 4000,
    unit: '50ml',
    emoji: '🥃',
    available: true,
  },
  {
    id: 'p8',
    name: 'Ciroc',
    category: 'Spirits',
    price: 3800,
    unit: '50ml',
    emoji: '🥃',
    available: true,
  },
  {
    id: 'p9',
    name: 'House Red',
    category: 'Wine',
    price: 2800,
    unit: 'glass',
    emoji: '🍷',
    available: true,
  },
  {
    id: 'p10',
    name: 'House White',
    category: 'Wine',
    price: 2800,
    unit: 'glass',
    emoji: '🥂',
    available: true,
  },
  {
    id: 'p11',
    name: 'Mojito',
    category: 'Cocktails',
    price: 3200,
    unit: 'glass',
    emoji: '🍹',
    available: true,
  },
  {
    id: 'p12',
    name: 'Gin & Tonic',
    category: 'Cocktails',
    price: 2800,
    unit: 'glass',
    emoji: '🍹',
    available: true,
  },
  {
    id: 'p13',
    name: 'Margarita',
    category: 'Cocktails',
    price: 3000,
    unit: 'glass',
    emoji: '🍹',
    available: true,
  },
  {
    id: 'p14',
    name: 'Coke',
    category: 'Soft Drinks',
    price: 600,
    unit: 'can',
    emoji: '🥤',
    available: true,
  },
  {
    id: 'p15',
    name: 'Fanta',
    category: 'Soft Drinks',
    price: 600,
    unit: 'can',
    emoji: '🥤',
    available: true,
  },
  {
    id: 'p16',
    name: 'Still Water',
    category: 'Soft Drinks',
    price: 400,
    unit: 'bottle',
    emoji: '💧',
    available: true,
  },
  {
    id: 'p17',
    name: 'Club Sandwich',
    category: 'Food',
    price: 4800,
    unit: 'plate',
    emoji: '🥪',
    available: true,
  },
  {
    id: 'p18',
    name: 'Peppered Snail',
    category: 'Food',
    price: 5500,
    unit: 'plate',
    emoji: '🍽️',
    available: true,
  },
  {
    id: 'p19',
    name: 'Suya Platter',
    category: 'Food',
    price: 4200,
    unit: 'plate',
    emoji: '🍖',
    available: true,
  },
  {
    id: 'p20',
    name: 'Peppersoup',
    category: 'Food',
    price: 3800,
    unit: 'bowl',
    emoji: '🍜',
    available: true,
  },
  {
    id: 'p21',
    name: 'Apple Shisha',
    category: 'Shisha',
    price: 8000,
    unit: 'session',
    emoji: '💨',
    available: true,
  },
  {
    id: 'p22',
    name: 'Grape Shisha',
    category: 'Shisha',
    price: 8000,
    unit: 'session',
    emoji: '💨',
    available: true,
  },
  {
    id: 'p23',
    name: 'Double Apple',
    category: 'Shisha',
    price: 9000,
    unit: 'session',
    emoji: '💨',
    available: true,
  },
];

const TABLES = [
  'Bar',
  'T1',
  'T2',
  'T3',
  'T4',
  'T5',
  'T6',
  'T7',
  'T8',
  'Poolside',
  'VIP Lounge',
  'Walkup',
];
const CATEGORIES: Category[] = [
  'All',
  'Beer',
  'Spirits',
  'Wine',
  'Cocktails',
  'Soft Drinks',
  'Food',
  'Shisha',
];

const PAY_METHODS: { id: PayMethod; label: string; icon: any }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card / POS', icon: CreditCard },
  { id: 'room_charge', label: 'Room Charge', icon: Receipt },
  { id: 'transfer', label: 'Transfer', icon: Smartphone },
];

const VAT_RATE = 0.075;

// ─── Completed orders (recent receipts) ───────────────────────────────────────
type CompletedOrder = {
  id: string;
  table: string;
  items: OrderItem[];
  total: number;
  method: PayMethod;
  time: string;
};
const seedReceipts: CompletedOrder[] = [
  {
    id: 'r1',
    table: 'T3',
    items: [
      { product: PRODUCTS[0], qty: 3, note: '' },
      { product: PRODUCTS[16], qty: 1, note: '' },
    ],
    total: 8400,
    method: 'card',
    time: '20:14',
  },
  {
    id: 'r2',
    table: 'VIP Lounge',
    items: [
      { product: PRODUCTS[5], qty: 2, note: '' },
      { product: PRODUCTS[20], qty: 1, note: '' },
    ],
    total: 17000,
    method: 'room_charge',
    time: '19:52',
  },
  {
    id: 'r3',
    table: 'Bar',
    items: [
      { product: PRODUCTS[10], qty: 1, note: '' },
      { product: PRODUCTS[13], qty: 2, note: '' },
    ],
    total: 4400,
    method: 'cash',
    time: '19:33',
  },
];

// ─── Payment modal ─────────────────────────────────────────────────────────────
function PaymentModal({
  total,
  onClose,
  onConfirm,
}: {
  total: number;
  onClose: () => void;
  onConfirm: (m: PayMethod) => void;
}) {
  const [method, setMethod] = useState<PayMethod>('cash');
  const [cash, setCash] = useState('');
  const vat = Math.round(total * VAT_RATE);
  const grand = total + vat;
  const change = method === 'cash' && Number(cash) > grand ? Number(cash) - grand : 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Collect Payment</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="bg-[#0f1117] rounded-xl p-4 mb-5 space-y-2">
          {[
            ['Subtotal', `₦${total.toLocaleString()}`],
            ['VAT (7.5%)', `₦${vat.toLocaleString()}`],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between text-sm">
              <span className="text-slate-500">{l}</span>
              <span className="text-slate-400">{v}</span>
            </div>
          ))}
          <div className="border-t border-[#1e2536] pt-2 flex justify-between">
            <span className="text-base font-bold text-white">Total</span>
            <span className="text-xl font-bold text-emerald-400">₦{grand.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {PAY_METHODS.map(({ id, label, icon: Icon }) => (
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

        {method === 'cash' && (
          <div className="mb-4">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Cash Tendered (₦)
            </label>
            <input
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder={`${grand}`}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
            />
            {change > 0 && (
              <p className="text-xs text-emerald-400 mt-1 font-semibold">
                Change: ₦{change.toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl py-3 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(method)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={15} /> Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function POSPage() {
  const [category, setCategory] = useState<Category>('All');
  const [search, setSearch] = useState('');
  const [activeTable, setActiveTable] = useState<string>('Bar');
  const [tableOrders, setTableOrders] = useState<Record<string, OrderItem[]>>({});
  const [showPay, setShowPay] = useState(false);
  const [receipts, setReceipts] = useState<CompletedOrder[]>(seedReceipts);
  const [view, setView] = useState<'pos' | 'receipts'>('pos');
  const [discount, setDiscount] = useState(0);

  const items = tableOrders[activeTable] ?? [];
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const discountAmt = Math.round((subtotal * discount) / 100);
  const afterDiscount = subtotal - discountAmt;
  const vat = Math.round(afterDiscount * VAT_RATE);
  const total = afterDiscount + vat;

  const filtered = useMemo(
    () =>
      PRODUCTS.filter((p) => {
        const mc = category === 'All' || p.category === category;
        const ms = p.name.toLowerCase().includes(search.toLowerCase());
        return mc && ms && p.available;
      }),
    [category, search],
  );

  const addItem = (product: Product) => {
    setTableOrders((o) => {
      const cur = o[activeTable] ?? [];
      const existing = cur.find((i) => i.product.id === product.id);
      if (existing)
        return {
          ...o,
          [activeTable]: cur.map((i) =>
            i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i,
          ),
        };
      return { ...o, [activeTable]: [...cur, { product, qty: 1, note: '' }] };
    });
  };

  const updateQty = (id: string, delta: number) => {
    setTableOrders((o) => {
      const cur = (o[activeTable] ?? [])
        .map((i) => (i.product.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0);
      return { ...o, [activeTable]: cur };
    });
  };

  const clearOrder = () => setTableOrders((o) => ({ ...o, [activeTable]: [] }));

  const handlePay = (method: PayMethod) => {
    const r: CompletedOrder = {
      id: `r${Date.now()}`,
      table: activeTable,
      items,
      total,
      method,
      time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
    };
    setReceipts((rs) => [r, ...rs]);
    clearOrder();
    setShowPay(false);
    setDiscount(0);
  };

  const tablesWithOrders = Object.keys(tableOrders).filter(
    (t) => (tableOrders[t] ?? []).length > 0,
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#1e2536] bg-[#161b27] shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">POS · Bar</h1>
          <div className="flex bg-[#0f1117] border border-[#1e2536] rounded-lg p-1">
            <button
              onClick={() => setView('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'pos' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <ShoppingCart size={12} /> Order
            </button>
            <button
              onClick={() => setView('receipts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'receipts' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Receipt size={12} /> Receipts
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock size={12} />
          {new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {view === 'pos' && (
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: Products ── */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-[#1e2536]">
            {/* Category + search */}
            <div className="px-4 pt-3 pb-2 space-y-2 shrink-0">
              <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2">
                <Search size={13} className="text-slate-500 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${category === c ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {filtered.map((p) => {
                  const inOrder = (tableOrders[activeTable] ?? []).find(
                    (i) => i.product.id === p.id,
                  );
                  return (
                    <button
                      key={p.id}
                      onClick={() => addItem(p)}
                      className={`relative bg-[#161b27] border rounded-xl p-3 text-left hover:brightness-110 transition-all active:scale-95 ${inOrder ? 'border-blue-500/40 bg-blue-500/5' : 'border-[#1e2536] hover:border-slate-600'}`}
                    >
                      {inOrder && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {inOrder.qty}
                        </span>
                      )}
                      <div className="text-2xl mb-2">{p.emoji}</div>
                      <p className="text-sm font-semibold text-white leading-tight">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.unit}</p>
                      <p className="text-sm font-bold text-blue-400 mt-1">
                        ₦{p.price.toLocaleString()}
                      </p>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="col-span-4 py-12 text-center">
                    <p className="text-slate-600 text-sm">No products found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Order panel ── */}
          <div className="w-72 xl:w-80 flex flex-col overflow-hidden bg-[#0f1117] shrink-0">
            {/* Table selector */}
            <div className="px-4 pt-3 pb-2 border-b border-[#1e2536] shrink-0">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">
                Table / Location
              </p>
              <div className="flex flex-wrap gap-1">
                {TABLES.map((t) => {
                  const hasOrder = (tableOrders[t] ?? []).length > 0;
                  return (
                    <button
                      key={t}
                      onClick={() => setActiveTable(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${activeTable === t ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : hasOrder ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-[#161b27] border-[#1e2536] text-slate-500 hover:text-slate-300'}`}
                    >
                      {t}
                      {hasOrder && activeTable !== t ? ' •' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <ShoppingCart size={24} className="text-slate-700 mb-2" />
                  <p className="text-slate-600 text-sm">No items yet</p>
                  <p className="text-slate-700 text-xs mt-0.5">Tap a product to add</p>
                </div>
              ) : (
                items.map(({ product, qty }) => (
                  <div key={product.id} className="flex items-center gap-2">
                    <span className="text-base">{product.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">₦{product.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(product.id, -1)}
                        className="w-6 h-6 rounded-md bg-[#161b27] border border-[#1e2536] flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
                      >
                        <Minus size={10} className="text-slate-400" />
                      </button>
                      <span className="text-xs font-bold text-white w-5 text-center">{qty}</span>
                      <button
                        onClick={() => updateQty(product.id, 1)}
                        className="w-6 h-6 rounded-md bg-[#161b27] border border-[#1e2536] flex items-center justify-center hover:bg-blue-500/20 hover:border-blue-500/30 transition-colors"
                      >
                        <Plus size={10} className="text-slate-400" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-slate-300 w-16 text-right">
                      ₦{(product.price * qty).toLocaleString()}
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
                    {[0, 5, 10, 15, 20].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDiscount(d)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${discount === d ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-[#161b27] border-[#1e2536] text-slate-600 hover:text-slate-400'}`}
                      >
                        {d}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Totals + charge */}
            <div className="px-4 py-3 border-t border-[#1e2536] space-y-2 shrink-0">
              {items.length > 0 && (
                <>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>₦{subtotal.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Discount ({discount}%)</span>
                        <span>-₦{discountAmt.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>VAT (7.5%)</span>
                      <span>₦{vat.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white text-sm pt-1 border-t border-[#1e2536]">
                      <span>Total</span>
                      <span className="text-emerald-400">₦{total.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={clearOrder}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-[#1e2536] flex items-center justify-center text-slate-500 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setShowPay(true)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard size={14} /> Charge ₦{total.toLocaleString()}
                    </button>
                  </div>
                </>
              )}
              {items.length === 0 && (
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
            <p className="text-sm font-semibold text-white">Recent Orders · Today</p>
            <p className="text-xs text-slate-500">
              {receipts.length} orders · ₦
              {receipts.reduce((s, r) => s + r.total, 0).toLocaleString()} total
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {receipts.map((r) => (
              <div
                key={r.id}
                className="bg-[#161b27] border border-[#1e2536] rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table2 size={14} className="text-slate-500" />
                    <span className="text-sm font-bold text-white">{r.table}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock size={10} />
                      {r.time}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        r.method === 'cash'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : r.method === 'card'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : r.method === 'room_charge'
                              ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}
                    >
                      {PAY_METHODS.find((m) => m.id === r.method)?.label}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  {r.items.map(({ product, qty }) => (
                    <div key={product.id} className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        {product.emoji} {product.name} ×{qty}
                      </span>
                      <span className="text-slate-500">
                        ₦{(product.price * qty).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#1e2536] pt-2 flex justify-between">
                  <span className="text-xs text-slate-500">Total (incl. VAT)</span>
                  <span className="text-sm font-bold text-emerald-400">
                    ₦{r.total.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPay && (
        <PaymentModal
          total={afterDiscount}
          onClose={() => setShowPay(false)}
          onConfirm={handlePay}
        />
      )}
    </div>
  );
}
