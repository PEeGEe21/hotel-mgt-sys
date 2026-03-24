'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Hash,
  Monitor,
  Plus,
  Minus,
  Search,
  ShoppingCart,
  Wallet,
  Building2,
  LayoutGrid,
} from 'lucide-react';

const terminals = [
  { id: 'bar-01', name: 'Bar Terminal 01', location: 'Main Bar' },
  { id: 'bar-02', name: 'Bar Terminal 02', location: 'Rooftop Bar' },
  { id: 'kitchen-01', name: 'Kitchen Terminal 01', location: 'Main Kitchen' },
  { id: 'front-01', name: 'Front Desk POS', location: 'Lobby' },
  { id: 'pool-01', name: 'Pool Service POS', location: 'Pool Deck' },
];

const categories = ['All', 'Beverage', 'Kitchen', 'Retail', 'Room Service'];

const products = [
  { id: 'p1', name: 'Sparkling Water', category: 'Beverage', price: 5, stock: 64, sku: 'BV-101' },
  { id: 'p2', name: 'House Red Wine', category: 'Beverage', price: 12, stock: 18, sku: 'BV-214' },
  { id: 'p3', name: 'Signature Cocktail', category: 'Beverage', price: 14, stock: 22, sku: 'BV-330' },
  { id: 'p4', name: 'Grilled Salmon', category: 'Kitchen', price: 24, stock: 12, sku: 'KT-402' },
  { id: 'p5', name: 'Classic Burger', category: 'Kitchen', price: 18, stock: 16, sku: 'KT-188' },
  { id: 'p6', name: 'Caesar Salad', category: 'Kitchen', price: 14, stock: 9, sku: 'KT-164' },
  { id: 'p7', name: 'Spa Oil Set', category: 'Retail', price: 28, stock: 7, sku: 'RT-221' },
  { id: 'p8', name: 'Travel Kit', category: 'Retail', price: 16, stock: 25, sku: 'RT-118' },
  { id: 'p9', name: 'Room Service Tray Fee', category: 'Room Service', price: 8, stock: 99, sku: 'RS-300' },
];

const paymentMethods = [
  { id: 'cash', label: 'Cash', icon: Wallet },
  { id: 'transfer', label: 'Transfer', icon: Building2 },
  { id: 'credit', label: 'Credit', icon: CreditCard },
];

export default function PosTerminalPage() {
  const [terminalId, setTerminalId] = useState('bar-01');
  const [staffCode, setStaffCode] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Array<{ id: string; qty: number }>>([]);
  const [payment, setPayment] = useState('cash');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = category === 'All' || p.category === category;
      const matchQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase());
      return matchCategory && matchQuery;
    });
  }, [category, query]);

  const cartItems = useMemo(() => {
    return cart.map(entry => ({
      ...products.find(p => p.id === entry.id)!,
      qty: entry.qty,
      total: entry.qty * products.find(p => p.id === entry.id)!.price,
    }));
  }, [cart]);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
    const service = subtotal * 0.05;
    const tax = subtotal * 0.075;
    return {
      subtotal,
      service,
      tax,
      total: subtotal + service + tax,
    };
  }, [cartItems]);

  const addToCart = (id: string) => {
    if (!sessionActive) return;
    setCart(current => {
      const existing = current.find(c => c.id === id);
      if (existing) {
        return current.map(c => (c.id === id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...current, { id, qty: 1 }];
    });
  };

  const adjustQty = (id: string, delta: number) => {
    setCart(current => {
      return current
        .map(c => (c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter(c => c.qty > 0);
    });
  };

  const terminal = terminals.find(t => t.id === terminalId);
  const isReady = staffCode.trim().length >= 3 && terminalId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">POS Terminal</h1>
          <p className="text-slate-500 text-sm mt-0.5">Authenticate staff and start a sales session.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="bg-[#161b27] border border-[#1e2536] px-3 py-2 rounded-lg flex items-center gap-2">
            <Monitor size={12} /> {terminal?.name}
          </span>
          <span
            className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${
              sessionActive
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}
          >
            {sessionActive ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {sessionActive ? 'Session Active' : 'Awaiting Auth'}
          </span>
        </div>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Terminal</p>
            <select
              value={terminalId}
              onChange={e => setTerminalId(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              {terminals.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.location}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Staff Code</p>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={staffCode}
                onChange={e => setStaffCode(e.target.value)}
                placeholder="Enter staff code"
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setSessionActive(true)}
              disabled={!isReady}
              className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isReady
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-white/5 text-slate-500 border border-[#1e2536] cursor-not-allowed'
              }`}
            >
              Start Session
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <LayoutGrid size={14} />
              Select items to add to cart
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search items or SKU"
                  className="bg-[#0f1117] border border-[#1e2536] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product.id)}
                disabled={!sessionActive || product.stock === 0}
                className={`border rounded-xl p-4 text-left transition-all ${
                  !sessionActive || product.stock === 0
                    ? 'bg-[#0f1117] border-[#1e2536] opacity-50 cursor-not-allowed'
                    : 'bg-[#0f1117] border-[#1e2536] hover:border-blue-500/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{product.name}</p>
                  <span className="text-xs text-slate-400">${product.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>{product.sku}</span>
                  <span className={product.stock < 10 ? 'text-amber-400' : 'text-emerald-400'}>
                    {product.stock} left
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <ShoppingCart size={14} /> Cart
            </h2>
            {cartItems.length === 0 ? (
              <p className="text-xs text-slate-500">No items added yet.</p>
            ) : (
              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-xs text-slate-400">
                    <div>
                      <p className="text-sm text-slate-200">{item.name}</p>
                      <p className="text-xs text-slate-500">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adjustQty(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-[#0f1117] border border-[#1e2536] rounded-md hover:border-slate-500"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs text-slate-200">{item.qty}</span>
                      <button
                        onClick={() => adjustQty(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-[#0f1117] border border-[#1e2536] rounded-md hover:border-slate-500"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-3">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Subtotal</span>
              <span className="text-slate-200 font-semibold">${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Service (5%)</span>
              <span className="text-slate-200 font-semibold">${totals.service.toFixed(2)}</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Tax (7.5%)</span>
              <span className="text-slate-200 font-semibold">${totals.tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-[#1e2536] pt-3 text-sm text-white flex items-center justify-between">
              <span>Total</span>
              <span className="font-semibold">${totals.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(method => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPayment(method.id)}
                    className={`border rounded-lg px-2 py-2 text-xs flex flex-col items-center gap-1 transition-colors ${
                      payment === method.id
                        ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                        : 'bg-[#0f1117] border-[#1e2536] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <Icon size={14} />
                    {method.label}
                  </button>
                );
              })}
            </div>
            <button
              disabled={!sessionActive || cartItems.length === 0}
              className={`w-full text-sm font-semibold py-2.5 rounded-lg ${
                sessionActive && cartItems.length > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-white/5 text-slate-500 border border-[#1e2536] cursor-not-allowed'
              }`}
            >
              Record Sale & Create Invoice
            </button>
            <p className="text-[11px] text-slate-500">
              Sales will post to inventory and create invoices once the backend is connected.
            </p>
          </div>

          {!sessionActive && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle size={14} />
              Enter a valid staff code and start session before recording sales.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
