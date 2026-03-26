'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
  BedDouble,
  LogOut,
  User,
  KeyRound,
  Monitor,
  AlertCircle,
  Delete,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePosStore, type TerminalStaff } from '@/store/pos.store';
import { usePersistedCart } from '@/hooks/usePersistedCart';
import { usePosProducts } from '@/hooks/usePosProducts';
import { usePosTables, type PosTable } from '@/hooks/usePosTables';
import {
  useCreateOrder,
  useDeliverOrder,
  usePayOrderById,
  usePosOrders,
} from '@/hooks/usePosOrders';
import {
  useAuthenticateTerminal,
  useStaffPinLogin,
  useStaffLogout,
  useTerminalStatus,
} from '@/hooks/useTerminalAuth';
import openToast from '@/components/ToastComponent';
import { useDebounce } from '@/hooks/useDebounce';
import { usePosProductCategories } from '@/hooks/usePosProductCategories';
import { useAppStore } from '@/store/app.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

type PayMethod = 'CASH' | 'CARD' | 'ROOM_CHARGE' | 'TRANSFER';

const PAY_METHODS: { id: PayMethod; label: string; icon: any }[] = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'CARD', label: 'Card / POS', icon: CreditCard },
  { id: 'ROOM_CHARGE', label: 'Room Charge', icon: BedDouble },
  { id: 'TRANSFER', label: 'Transfer', icon: Smartphone },
];

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20];

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 1 — Terminal Setup
// ─────────────────────────────────────────────────────────────────────────────
function TerminalSetupScreen() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const authenticate = useAuthenticateTerminal();

  const handleSubmit = async () => {
    if (code.trim().length < 4) return setError('Enter the setup code from terminal settings.');
    setError('');
    try {
      await authenticate.mutateAsync(code.trim().toUpperCase());
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Invalid setup code. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Monitor size={28} className="text-blue-400" />
          </div>
        </div>

        <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-7 shadow-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Register This Device</h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Enter the setup code generated in{' '}
              <span className="text-slate-400">POS → Configuration → Terminal Settings</span>
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Setup Code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. BAR4X9"
              maxLength={8}
              autoFocus
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-xl px-4 py-3.5 text-2xl font-bold text-white text-center tracking-[0.3em] placeholder:text-slate-700 placeholder:text-base placeholder:tracking-normal outline-none focus:border-blue-500 transition-colors uppercase"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={authenticate.isPending || code.length < 4}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl py-3.5 text-sm font-bold transition-colors"
          >
            {authenticate.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ChevronRight size={16} />
            )}
            Register Device
          </button>
        </div>

        <p className="text-center text-xs text-slate-700 mt-5">
          Ask your manager to generate a setup code from the POS settings.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2 — Staff PIN Login
// ─────────────────────────────────────────────────────────────────────────────
function StaffPinScreen({ terminalId }: { terminalId: string }) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'code' | 'pin'>('code');
  const [error, setError] = useState('');
  const pinLogin = useStaffPinLogin(terminalId);
  const { resetTerminal } = usePosStore();
  const { data: status } = useTerminalStatus(terminalId);

  // PIN pad digits
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  const handleDigit = (d: string) => {
    if (d === '⌫') {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 6) {
      setPin((p) => p + d);
    }
  };

  const handleLogin = async () => {
    if (!employeeCode.trim()) return setError('Enter your employee code.');
    if (pin.length < 4) return setError('PIN must be at least 4 digits.');
    setError('');
    try {
      await pinLogin.mutateAsync({ employeeCode: employeeCode.trim(), pin });
    } catch (e: any) {
      setPin('');
      setError(e?.response?.data?.message ?? 'Login failed. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        {/* Terminal name */}
        {status && (
          <div className="text-center mb-6">
            <p className="text-xs text-slate-600 uppercase tracking-widest">Terminal</p>
            <p className="text-lg font-bold text-white mt-0.5">{status.name}</p>
            {status.location && <p className="text-xs text-slate-500">{status.location}</p>}
          </div>
        )}

        <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-slate-700/50 border border-[#1e2536] flex items-center justify-center mx-auto mb-3">
              <User size={20} className="text-slate-400" />
            </div>
            <h2 className="text-base font-bold text-white">Staff Login</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your employee code and PIN</p>
          </div>

          {/* Employee code */}
          {step === 'code' ? (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Employee Code
              </label>
              <input
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && employeeCode.trim() && setStep('pin')}
                placeholder="e.g. EMP001"
                autoFocus
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-xl px-4 py-3 text-lg font-bold text-white text-center tracking-widest placeholder:text-slate-700 placeholder:text-sm placeholder:tracking-normal outline-none focus:border-blue-500 transition-colors uppercase"
              />
              <button
                onClick={() => employeeCode.trim() && setStep('pin')}
                disabled={!employeeCode.trim()}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl py-3 text-sm font-bold transition-colors"
              >
                <KeyRound size={14} /> Enter PIN
              </button>
            </div>
          ) : (
            <div>
              {/* Employee code display */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => {
                    setStep('code');
                    setPin('');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft size={11} /> Change
                </button>
                <p className="text-sm font-bold text-slate-200 tracking-widest">{employeeCode}</p>
              </div>

              {/* PIN dots */}
              <div className="flex items-center justify-center gap-3 mb-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all ${
                      i < pin.length ? 'bg-blue-400 scale-110' : 'bg-[#1e2536]'
                    }`}
                  />
                ))}
              </div>

              {/* PIN pad */}
              <div className="grid grid-cols-3 gap-2">
                {digits.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => d && handleDigit(d)}
                    disabled={!d}
                    className={`h-12 rounded-xl text-lg font-bold transition-all active:scale-95 ${
                      !d
                        ? 'invisible'
                        : d === '⌫'
                          ? 'bg-[#0f1117] border border-[#1e2536] text-slate-400 hover:text-red-400 hover:border-red-500/30 text-sm'
                          : 'bg-[#0f1117] border border-[#1e2536] text-white hover:bg-white/[0.06] hover:border-slate-500'
                    }`}
                  >
                    {d === '⌫' ? <Delete size={16} className="mx-auto" /> : d}
                  </button>
                ))}
              </div>

              <button
                onClick={handleLogin}
                disabled={pinLogin.isPending || pin.length < 4}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl py-3 text-sm font-bold transition-colors"
              >
                {pinLogin.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Sign In
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Reset device link — manager action */}
        <button
          onClick={() => {
            if (confirm('Unregister this device? You will need a new setup code.')) {
              resetTerminal();
            }
          }}
          className="w-full mt-4 text-xs text-slate-700 hover:text-slate-500 transition-colors text-center"
        >
          Unregister this device
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Charge Modal
// ─────────────────────────────────────────────────────────────────────────────
function RoomChargeModal({
  total,
  onClose,
  onConfirm,
}: {
  total: number;
  onClose: () => void;
  onConfirm: (roomNo: string) => void;
}) {
  const [roomNo, setRoomNo] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Charge to Room</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-[#0f1117] rounded-xl p-4 flex justify-between">
            <span className="text-slate-500 text-sm">Amount</span>
            <span className="text-emerald-400 font-bold text-base">{fmtMoney(total)}</span>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Room Number
            </label>
            <input
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && roomNo.trim() && onConfirm(roomNo.trim())}
              placeholder="e.g. 304"
              autoFocus
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-3 text-2xl font-bold text-white text-center outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!roomNo.trim()) return setError('Enter a room number.');
              onConfirm(roomNo.trim());
            }}
            className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
          >
            Charge to Room
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Modal
// ─────────────────────────────────────────────────────────────────────────────
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
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
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
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                method === id
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'
              }`}
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
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-3 text-2xl font-bold text-white text-center outline-none focus:border-emerald-500 transition-colors"
            />
            {change > 0 && (
              <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5">
                <span className="text-sm text-emerald-400 font-medium">Change</span>
                <span className="text-xl font-bold text-emerald-400">{fmtMoney(change)}</span>
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
            disabled={isLoading || (method === 'CASH' && !!cash && Number(cash) < total)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3 — Order UI
// ─────────────────────────────────────────────────────────────────────────────
function OrderScreen({ terminalId, staff }: { terminalId: string; staff: TerminalStaff }) {
  const router = useRouter();
  const { hotel } = useAppStore();

  // ── Store ──────────────────────────────────────────────────────────────────
  const {
    items,
    carts,
    activeTable,
    hydrated,
    setActiveTable,
    addItem,
    updateQty,
    clearCart,
    tablesWithItems,
  } = usePersistedCart();

  const { discount, setDiscount } = usePosStore();
  const staffLogout = useStaffLogout(terminalId);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [view, setView] = useState<'order' | 'receipts'>('order');
  const [showPay, setShowPay] = useState(false);
  const [showRoom, setShowRoom] = useState(false);

  // ── Data ───────────────────────────────────────────────────────────────────
  const debouncedSearch = useDebounce(search, 300);

  const { data: productsData, isLoading: productsLoading } = usePosProducts({
    search: debouncedSearch || undefined,
    category: category || undefined,
    isAvailable: 'true',
    limit: 200,
  });
  const { data: categories = [], isLoading: categoriesLoading } = usePosProductCategories();

  const { data: tablesData } = usePosTables();

  const { data: ordersData, isLoading: ordersLoading } = usePosOrders({
    posTerminalId: terminalId,
    status: 'DELIVERED',
    limit: 30,
  });

  const products = productsData?.products ?? [];
  // const categories = productsData?.categories ?? [];
  const tableSections = tablesData?.sections ?? [];
  const recentOrders = ordersData?.orders ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createOrder = useCreateOrder();
  const deliverOrder = useDeliverOrder();
  const payOrderById = usePayOrderById();

  // ── Set initial table ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeTable && tablesData?.tables?.length && hydrated) {
      setActiveTable(tablesData.tables[0].name);
    }
  }, [tablesData, activeTable, hydrated, setActiveTable]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(subtotal * (discount / 100));
  const taxable = subtotal - discountAmt;
  const taxRate = (Number(hotel?.taxRate) || 0) / 100;
  const tax = Math.round(taxable * taxRate);
  // const tax = Math.round(taxable * 0.075);
  const total = taxable + tax;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddItem = (product: any) => {
    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      unit: product.unit,
      category: product.category,
    });
  };

  const handlePay = async (method: PayMethod, amountTendered?: number) => {
    if (!items.length) return;
    try {
      const activeTableObj = tablesData?.tables?.find((t) => t.name === activeTable);
      const isWalkup = activeTableObj?.section === 'Takeaway';

      const order = await createOrder.mutateAsync({
        type: isWalkup ? 'TAKEAWAY' : 'DINE_IN',
        tableNo: activeTable,
        posTerminalId: terminalId,
        staffId: staff.id,
        discount: discountAmt,
        items: items.map((i) => ({ productId: i.productId, quantity: i.qty })),
      });

      await deliverOrder.mutateAsync(order.id);

      const result = await payOrderById.mutateAsync({
        orderId: order.id,
        method,
        amountTendered,
      });

      clearCart();
      setDiscount(0);
      setShowPay(false);

      if (method === 'CASH' && result.change > 0) {
        openToast('success', `Change: ${fmtMoney(result.change)}`);
      } else {
        openToast('success', 'Order complete');
      }
    } catch (e: any) {
      openToast('error', e?.response?.data?.message ?? 'Order failed');
    }
  };

  const handleRoomCharge = async (roomNo: string) => {
    if (!items.length) return;
    try {
      await createOrder.mutateAsync({
        type: 'ROOM_SERVICE',
        roomNo,
        posTerminalId: terminalId,
        staffId: staff.id,
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

  const isBusy = createOrder.isPending || deliverOrder.isPending || payOrderById.isPending;

  return (
    <div className="flex flex-col h-screen bg-[#0f1117] overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b27] border-b border-[#1e2536] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-lg p-1">
            {(['order', 'receipts'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize flex items-center gap-1.5 ${
                  view === v
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {v === 'order' ? <ShoppingCart size={11} /> : <Receipt size={11} />}
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Staff session */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-1.5">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <User size={10} className="text-emerald-400" />
            </div>
            <span className="text-xs text-slate-300 font-medium">
              {staff.firstName} {staff.lastName}
            </span>
          </div>
          <button
            onClick={() => confirm('Log out from this terminal?') && staffLogout.mutate()}
            disabled={staffLogout.isPending}
            className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
            title="Log out"
          >
            {staffLogout.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <LogOut size={13} />
            )}
          </button>
        </div>
      </div>

      {/* ── ORDER VIEW ── */}
      {view === 'order' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: product grid */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search + categories */}
            <div className="px-4 pt-3 pb-2 space-y-2 shrink-0 border-b border-[#1e2536]">
              <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2">
                <Search size={13} className="text-slate-500 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-slate-600 hover:text-slate-400"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setCategory('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                    !category
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                {categoriesLoading ? (
                  <>
                    <Loader2 className="animate-spin" />
                  </>
                ) : (
                  categories.map((c, index) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                        category === c.id
                          ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                          : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Products */}
            <div className="flex-1 overflow-y-auto p-4">
              {productsLoading ? (
                <div className="flex items-center justify-center h-40">
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
                        onClick={() => handleAddItem(p)}
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
                        <div className="text-2xl mb-1.5">{icon}</div>
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
          <div className="w-72 xl:w-80 flex flex-col border-l border-[#1e2536] shrink-0">
            {/* Table selector — grouped by section */}
            <div className="px-4 pt-3 pb-2 border-b border-[#1e2536] shrink-0 max-h-52 overflow-y-auto">
              {tableSections.length > 0 ? (
                tableSections.map((section) => (
                  <div key={section.name} className="mb-3 last:mb-0">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">
                      {section.name}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {section.tables.map((t: PosTable) => {
                        const hasItems = (carts[t.name] ?? []).length > 0;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setActiveTable(t.name)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              activeTable === t.name
                                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                                : hasItems
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                  : 'bg-[#161b27] border-[#1e2536] text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {t.name}
                            {hasItems && activeTable !== t.name && ' •'}
                            {t.capacity ? (
                              <span className="text-[9px] ml-1 opacity-40">{t.capacity}</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-3 text-center">
                  <p className="text-xs text-slate-600">No tables configured</p>
                  <a
                    href="/settings/tables"
                    className="text-xs text-blue-400 hover:underline mt-1 block"
                  >
                    Set up tables →
                  </a>
                </div>
              )}
            </div>

            {/* Order items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <ShoppingCart size={22} className="text-slate-700 mb-2" />
                  <p className="text-slate-600 text-sm">No items</p>
                  <p className="text-slate-700 text-xs mt-0.5">Tap a product to add</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-2">
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
                      onClick={() => clearCart()}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-[#1e2536] text-slate-500 text-xs font-medium transition-colors"
                    >
                      <Trash2 size={13} /> Clear
                    </button>
                  </div>

                  <button
                    onClick={() => setShowPay(true)}
                    disabled={isBusy}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-bold transition-colors"
                  >
                    {isBusy ? (
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
            <p className="text-sm font-semibold text-white">Today's Orders — {staff.firstName}</p>
            <p className="text-xs text-slate-500">{recentOrders.length} orders</p>
          </div>
          {ordersLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={20} className="animate-spin text-slate-500" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No orders yet</p>
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
                      <Table2 size={13} className="text-slate-500" />
                      <span className="text-sm font-bold text-white">
                        {order.tableNo ?? order.roomNo ?? '—'}
                      </span>
                      <span className="text-xs font-mono text-slate-600">{order.orderNo}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        order.isPaid
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : order.reservationId
                            ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}
                    >
                      {order.isPaid ? order.paymentMethod : order.reservationId ? 'Room' : 'Unpaid'}
                    </span>
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
                      <p className="text-xs text-slate-700">+{order.items.length - 3} more</p>
                    )}
                  </div>
                  <div className="border-t border-[#1e2536] pt-2 flex justify-between">
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
          isLoading={isBusy}
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

// ─────────────────────────────────────────────────────────────────────────────
// Root — Gate between the three screens
// ─────────────────────────────────────────────────────────────────────────────
export default function PosTerminalPage() {
  const { terminalId, staffSession, hydrated } = usePosStore();

  console.log(terminalId, staffSession, hydrated);
  // Don't render until sessionStorage has been read
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-600" />
      </div>
    );
  }

  // Screen 1 — device not registered
  if (!terminalId) {
    return <TerminalSetupScreen />;
  }

  // Screen 2 — device registered, no staff logged in
  if (!staffSession) {
    return <StaffPinScreen terminalId={terminalId} />;
  }

  // Screen 3 — fully operational
  return <OrderScreen terminalId={terminalId} staff={staffSession} />;
}
