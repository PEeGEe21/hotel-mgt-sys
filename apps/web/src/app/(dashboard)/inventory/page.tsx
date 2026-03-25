'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Plus,
  Search,
  ArrowDownCircle,
  ShoppingCart,
  X,
  BarChart3,
  RefreshCw,
  Loader2,
  ArrowUpCircle,
  Pencil,
  Trash2,
  History,
  Filter,
  CalendarDays,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  InventoryItem,
  StockMovement,
  useInventoryList,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useRecordMovement,
  useInventoryMovements,
  useInventoryValuation,
  useGerateItemSku,
} from '@/hooks/useInventoryItems';
import { useInventoryCategories } from '@/hooks/useInventoryCategories';
import { useSuppliers } from '@/hooks/useSuppliers';
import openToast from '@/components/ToastComponent';
import Pagination from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/useDebounce';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

const MOVEMENT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  IN: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Restock' },
  OUT: { bg: 'bg-amber-500/10  border-amber-500/20', text: 'text-amber-400', label: 'Removed' },
  WASTAGE: { bg: 'bg-red-500/10    border-red-500/20', text: 'text-red-400', label: 'Wastage' },
  ADJUSTMENT: {
    bg: 'bg-blue-500/10   border-blue-500/20',
    text: 'text-blue-400',
    label: 'Adjustment',
  },
  POS_SALE: {
    bg: 'bg-violet-500/10 border-violet-500/20',
    text: 'text-violet-400',
    label: 'POS Sale',
  },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'from-blue-500/15    to-transparent border-blue-500/20    text-blue-400',
    emerald: 'from-emerald-500/15 to-transparent border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/15   to-transparent border-amber-500/20   text-amber-400',
    red: 'from-red-500/15     to-transparent border-red-500/20     text-red-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</p>
          <p className="text-3xl font-bold text-white mt-1.5">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{sub}</p>
        </div>
        <Icon size={20} className="opacity-60" />
      </div>
    </div>
  );
}

// ─── Item Form Modal ──────────────────────────────────────────────────────────
type ItemFormData = {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minStock: number;
  costPrice: number;
  sellPrice: number;
  supplier: string;
  sku: string;
  description: string;
};

function ItemModal({
  item,
  categories,
  suppliers,
  onClose,
}: {
  item?: InventoryItem | null;
  categories: string[];
  suppliers: { id: string; name: string }[];
  onClose: () => void;
}) {
  const isEditing = !!item;
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem(item?.id ?? '');
  const generateSku = useGerateItemSku();
  const [generatingSku, setGeneratingSku] = useState(false);

  const [form, setForm] = useState<ItemFormData>({
    name: item?.name ?? '',
    category: item?.category ?? categories[0] ?? '',
    unit: item?.unit ?? 'bottle',
    quantity: item?.quantity ?? 0,
    minStock: item?.minStock ?? 5,
    costPrice: item?.costPrice ?? 0,
    sellPrice: item?.sellPrice ?? 0,
    supplier: item?.supplier ?? '',
    sku: item?.sku ?? '',
    description: item?.description ?? '',
  });

  const set = (k: keyof ItemFormData, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleGenerateSku = async () => {
    setGeneratingSku(true);
    try {
      const sku = await generateSku.mutateAsync();
      set('sku', sku);
    } catch {
      openToast('error', 'Could not generate SKU');
    } finally {
      setGeneratingSku(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return openToast('error', 'Name is required.');
    if (!form.sku.trim()) return openToast('error', 'Unique ID / SKU is required.');
    if (!form.category.trim()) return openToast('error', 'Category is required.');
    if (!form.unit.trim()) return openToast('error', 'Unit is required.');

    try {
      if (isEditing) {
        await updateItem.mutateAsync(form);
      } else {
        await createItem.mutateAsync(form);
      }
      onClose();
    } catch (e: any) {
      // toast already shown by hook
    }
  };

  const inputCls =
    'h-12 w-full bg-[#0f1117] border !border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';
  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="w-full max-w-2xl sm:max-w-3xl !rounded-2xl bg-[#161b27] border border-[#1e2536] p-6 [&>button]:hidden shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">
            {isEditing ? 'Edit Item' : 'Add Stock Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Name */}
          <div className="col-span-2">
            <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Item Name *
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Hennessy VS"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Opening stock + min stock */}
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Opening Stock
            </Label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => set('quantity', Number(e.target.value))}
              placeholder="0"
              className={inputCls}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Min Stock Alert
            </Label>
            <Input
              type="number"
              value={form.minStock}
              onChange={(e) => set('minStock', Number(e.target.value))}
              placeholder="5"
              className={inputCls}
            />
          </div>

          {/* SKU */}
          <div className="col-span-2">
            <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Unique ID / SKU *
            </Label>
            <div className="flex gap-2">
              <Input
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder="Barcode, supplier code, or generated"
                className={`${inputCls} flex-1`}
              />
              <button
                onClick={handleGenerateSku}
                disabled={generatingSku}
                className="px-4 h-12 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-600/30 transition-colors shrink-0"
              >
                {generatingSku ? <Loader2 size={13} className="animate-spin" /> : 'Generate'}
              </button>
            </div>
          </div>

          {/* Cost + sell price */}
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Cost Price (₦)
            </Label>
            <Input
              type="number"
              value={form.costPrice}
              onChange={(e) => set('costPrice', Number(e.target.value))}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Sell Price (₦)
            </Label>
            <Input
              type="number"
              value={form.sellPrice}
              onChange={(e) => set('sellPrice', Number(e.target.value))}
              placeholder="0.00"
              className={inputCls}
            />
          </div>

          {/* Unit */}
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Unit *
            </Label>
            <select
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
              className="h-12 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none transition-colors"
            >
              {[
                'bottle',
                'can',
                'crate',
                'pack',
                'bag',
                'kg',
                'g',
                'L',
                'ml',
                'piece',
                'set',
                'pair',
                'roll',
              ].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier */}
          <div>
            <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Supplier
            </Label>
            <Select onValueChange={(v) => set('supplier', v)} value={form.supplier}>
              <SelectTrigger className="h-12 w-full text-white bg-[#0f1117] border border-[#1e2536] rounded-lg ring-0 focus:ring-0 focus:outline-none">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent className="bg-[#161b27] border border-[#1e2536] text-white">
                <SelectItem value="none" className="text-slate-500">
                  None
                </SelectItem>
                {suppliers.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.name}
                    className="hover:!bg-blue-600/20 cursor-pointer hover:!text-blue-400 text-white data-[state=checked]:bg-blue-600/20 data-[state=checked]:text-blue-400"
                  >
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="col-span-2">
            <Label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Description
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional notes about this item"
              className="w-full bg-[#0f1117] border !border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors resize-none min-h-[3rem]"
            />
          </div>

          {/* Category pills */}
          <div className="col-span-2">
            <Label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Category *
            </Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => set('category', cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.category === cat
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5 pt-4 border-t border-[#1e2536]">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {isEditing ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Movement Modal ───────────────────────────────────────────────────────────
function MovementModal({
  item,
  type,
  onClose,
}: {
  item: InventoryItem;
  type: 'IN' | 'OUT' | 'WASTAGE' | 'ADJUSTMENT';
  onClose: () => void;
}) {
  const record = useRecordMovement(item.id);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const config = {
    IN: { label: 'Restock', color: 'bg-emerald-600 hover:bg-emerald-500' },
    OUT: { label: 'Remove Stock', color: 'bg-amber-600  hover:bg-amber-500' },
    WASTAGE: { label: 'Record Wastage', color: 'bg-red-600    hover:bg-red-500' },
    ADJUSTMENT: { label: 'Adjust Stock', color: 'bg-blue-600   hover:bg-blue-500' },
  }[type];

  const handleSubmit = async () => {
    try {
      await record.mutateAsync({ type, quantity: qty, note: note || undefined });
      onClose();
    } catch {
      // toast already shown by hook
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
      <DialogContent
        aria-describedby={undefined}
        className="w-full max-w-md !rounded-2xl bg-[#161b27] border border-[#1e2536] p-6 [&>button]:hidden shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{config.label}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Current stock */}
          <div className="bg-[#0f1117] border border-[#1e2536] rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Current Stock</span>
            <span
              className={`text-xl font-bold ${item.quantity <= item.minStock ? 'text-red-400' : 'text-white'}`}
            >
              {item.quantity}{' '}
              <span className="text-sm font-normal text-slate-500">{item.unit}s</span>
            </span>
          </div>

          {/* Quantity stepper */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-12 h-12 rounded-lg bg-[#0f1117] border border-[#1e2536] text-slate-300 hover:text-white transition-colors flex items-center justify-center text-xl font-bold"
              >
                −
              </button>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="h-12 flex-1 bg-[#0f1117] border border-[#1e2536] rounded-lg px-4 text-center text-white text-xl font-bold outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-12 h-12 rounded-lg bg-[#0f1117] border border-[#1e2536] text-slate-300 hover:text-white transition-colors flex items-center justify-center text-xl font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Preview new stock */}
          {type !== 'ADJUSTMENT' && (
            <div
              className={`rounded-xl px-4 py-2.5 text-sm flex items-center justify-between ${
                ['OUT', 'WASTAGE'].includes(type)
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-emerald-500/10 border border-emerald-500/20'
              }`}
            >
              <span className="text-slate-400">New stock level</span>
              <span
                className={`font-bold ${['OUT', 'WASTAGE'].includes(type) ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {['OUT', 'WASTAGE'].includes(type)
                  ? Math.max(0, item.quantity - qty)
                  : item.quantity + qty}{' '}
                {item.unit}s
              </span>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                type === 'IN'
                  ? 'e.g. Received from supplier'
                  : type === 'WASTAGE'
                    ? 'e.g. Expired, damaged'
                    : ''
              }
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={record.isPending}
              className={`flex-1 flex items-center justify-center gap-2 ${config.color} disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors`}
            >
              {record.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {config.label}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [pageLimit, setPageLimit] = useState('10');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [movement, setMovement] = useState<{
    item: InventoryItem;
    type: 'IN' | 'OUT' | 'WASTAGE' | 'ADJUSTMENT';
  } | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  // Movement log filters
  const [movPage, setMovPage] = useState(1);
  const [movType, setMovType] = useState('');
  const [movDateFrom, setMovDateFrom] = useState('');
  const [movDateTo, setMovDateTo] = useState('');

  const { data: categoryData = [] } = useInventoryCategories();
  const { data: suppliers = [] } = useSuppliers();

  const categories = useMemo(() => ['All', ...categoryData.map((c) => c.name)], [categoryData]);

  const { data, isLoading, isFetching } = useInventoryList({
    page,
    limit: Number(pageLimit),
    search: debouncedSearch.trim() || undefined,
    category: category === 'All' ? undefined : category,
  });

  const { data: movData, isLoading: movLoading } = useInventoryMovements({
    type: movType == 'ALL' ? undefined : movType,
    dateFrom: movDateFrom || undefined,
    dateTo: movDateTo || undefined,
    page: movPage,
    limit: 20,
  });

  const { data: valuation, isLoading: valLoading } = useInventoryValuation();

  const deleteItem = useDeleteInventoryItem();

  useEffect(() => {
    setPage(1);
  }, [category, debouncedSearch, pageLimit]);

  const stock = data?.items ?? [];
  const meta = data?.meta ?? {
    total: 0,
    current_page: 1,
    per_page: 10,
    last_page: 1,
    from: 0,
    to: 0,
  };
  const stats = data?.stats ?? {
    totalItems: 0,
    lowStockCount: 0,
    totalValue: 0,
    todaySales: 0,
    todayTransactions: 0,
    lowStockItems: [],
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Inventory
              {isFetching && !isLoading && (
                <Loader2 size={14} className="animate-spin text-slate-500" />
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">Track stock, movements and valuations</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={15} /> Add Item
          </button>
        </div>

        {/* Low stock alert */}
        {stats.lowStockItems.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              <span className="font-semibold">
                {stats.lowStockCount} item{stats.lowStockCount !== 1 ? 's' : ''} running low:
              </span>{' '}
              {stats.lowStockItems.map((i) => i.name).join(', ')}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Items"
            value={stats.totalItems}
            sub={`${stats.lowStockCount} low stock`}
            icon={Package}
            color="blue"
          />
          <StatCard
            label="Stock Value"
            value={fmtMoney(stats.totalValue)}
            sub="at cost price"
            icon={TrendingUp}
            color="emerald"
          />
          <StatCard
            label="Today's Sales"
            value={fmtMoney(stats.todaySales)}
            sub={`${stats.todayTransactions} from POS`}
            icon={ShoppingCart}
            color="amber"
          />
          <StatCard
            label="Low Stock"
            value={stats.lowStockCount}
            sub="need restocking"
            icon={AlertTriangle}
            color={stats.lowStockCount > 0 ? 'red' : 'emerald'}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="stock" className="flex-col space-y-4">
          <TabsList className="bg-[#161b27] border border-[#1e2536] rounded-xl p-1 justify-start gap-1">
            {[
              { key: 'stock', label: 'Stock', icon: Package },
              { key: 'movements', label: 'Movement Log', icon: History },
              { key: 'reports', label: 'Reports', icon: BarChart3 },
            ].map(({ key, label, icon: Icon }) => (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-blue-500/20 text-slate-400 hover:!text-slate-200 rounded-lg text-sm transition-all"
              >
                <Icon size={13} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── STOCK TAB ── */}
          <TabsContent value="stock" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* <Select value={pageLimit} onValueChange={setPageLimit}>
                <SelectTrigger className="w-24 text-white bg-[#161b27] border border-[#1e2536] rounded-lg ring-0 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161b27] border border-[#1e2536]">
                  {[5, 10, 20, 50].map((x) => (
                    <SelectItem
                      key={x}
                      value={String(x)}
                      className="hover:!bg-blue-600/20 cursor-pointer hover:!text-blue-400 text-white data-[state=checked]:bg-blue-600/20 data-[state=checked]:text-blue-400"
                    >
                      {x} per page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select> */}
              <select
                value={pageLimit}
                onChange={(e) => {
                  setPageLimit(e.target.value);
                }}
                className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
              >
                {[5, 10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} per page
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-48">
                <Search size={14} className="text-slate-500 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or SKU…"
                  className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
                />
              </div>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-white bg-[#161b27] border border-[#1e2536] rounded-lg ring-0 focus:ring-0 min-w-36">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-[#161b27] border border-[#1e2536]">
                  {categories.map((cat) => (
                    <SelectItem
                      key={cat}
                      value={cat}
                      className="hover:!bg-blue-600/20 cursor-pointer hover:!text-blue-400 text-white data-[state=checked]:bg-blue-600/20 data-[state=checked]:text-blue-400"
                    >
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                    <tr>
                      {[
                        'S/N',
                        'Item',
                        'Category',
                        'In Stock',
                        'Min Stock',
                        'Cost',
                        'Sell Price',
                        'Actions',
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <Loader2 size={20} className="animate-spin text-slate-500 mx-auto" />
                        </td>
                      </tr>
                    )}
                    {!isLoading && stock.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center">
                          <Package size={28} className="text-slate-700 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">No inventory items yet</p>
                          <button
                            onClick={() => setShowAdd(true)}
                            className="mt-3 text-xs text-blue-400 hover:underline"
                          >
                            Add your first item
                          </button>
                        </td>
                      </tr>
                    )}
                    {!isLoading &&
                      stock.map((item, index) => {
                        const isLow = item.quantity <= item.minStock;
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-slate-200">
                                  {(page - 1) * (data?.meta.per_page ?? Number(pageLimit)) +
                                    index +
                                    1}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-slate-200">{item.name}</p>
                                <p className="text-xs text-slate-600 font-mono">{item.sku}</p>
                                {item.supplier && (
                                  <p className="text-xs text-slate-600">{item.supplier}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs bg-slate-500/15 text-slate-400 px-2.5 py-1 rounded-full">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-bold ${isLow ? 'text-red-400' : 'text-slate-200'}`}
                                >
                                  {item.quantity}
                                </span>
                                <span className="text-xs text-slate-600">{item.unit}s</span>
                                {isLow && <AlertTriangle size={12} className="text-red-400" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">{item.minStock}</td>
                            <td className="px-4 py-3 text-sm text-slate-400">
                              {fmtMoney(item.costPrice)}
                            </td>
                            <td className="px-4 py-3 text-sm text-emerald-400 font-medium">
                              {item.sellPrice ? fmtMoney(item.sellPrice) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setMovement({ item, type: 'IN' })}
                                  title="Restock"
                                  className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                >
                                  <ArrowDownCircle size={15} />
                                </button>
                                <button
                                  onClick={() => setMovement({ item, type: 'OUT' })}
                                  title="Remove"
                                  className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                                >
                                  <ArrowUpCircle size={15} />
                                </button>
                                <button
                                  onClick={() => setMovement({ item, type: 'WASTAGE' })}
                                  title="Wastage"
                                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <X size={15} />
                                </button>
                                <button
                                  onClick={() => setEditing(item)}
                                  title="Edit"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() =>
                                    confirm('Delete this item?') && deleteItem.mutate(item.id)
                                  }
                                  title="Delete"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <Pagination meta={meta} currentPage={page} handlePageChange={setPage} />
            </div>
          </TabsContent>

          {/* ── MOVEMENT LOG TAB ── */}
          <TabsContent value="movements" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={movType} onValueChange={setMovType}>
                <SelectTrigger className="text-white bg-[#161b27] border border-[#1e2536] rounded-lg ring-0 focus:ring-0 min-w-36">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-[#161b27] border border-[#1e2536]">
                  {['ALL', 'IN', 'OUT', 'WASTAGE', 'ADJUSTMENT'].map((t) => (
                    <SelectItem
                      key={t}
                      value={t}
                      className="hover:!bg-blue-600/20 cursor-pointer hover:!text-blue-400 text-white data-[state=checked]:bg-blue-600/20 data-[state=checked]:text-blue-400"
                    >
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2">
                <CalendarDays size={12} className="text-slate-500" />
                <input
                  type="date"
                  value={movDateFrom}
                  onChange={(e) => setMovDateFrom(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 outline-none [color-scheme:dark]"
                />
                <span className="text-slate-600 text-xs">to</span>
                <input
                  type="date"
                  value={movDateTo}
                  onChange={(e) => setMovDateTo(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e2536]">
                <h2 className="text-sm font-semibold text-white">Stock Movement History</h2>
              </div>
              {movLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 size={20} className="animate-spin text-slate-500" />
                </div>
              ) : (movData?.movements ?? []).length === 0 ? (
                <div className="py-12 text-center">
                  <History size={24} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No movements recorded</p>
                </div>
              ) : (
                <div className="divide-y divide-[#1e2536]">
                  {(movData?.movements ?? []).map((m) => {
                    const style =
                      MOVEMENT_STYLE[m.sourceType === 'POS_SALE' ? 'POS_SALE' : m.type] ??
                      MOVEMENT_STYLE.IN;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${style.bg} ${style.text}`}
                          >
                            {style.label}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {m.item?.name ?? '—'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {m.note ?? '—'} · {fmtDate(m.createdAt)} {fmtTime(m.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-bold ${
                              m.type === 'IN'
                                ? 'text-emerald-400'
                                : m.type === 'OUT' || m.type === 'WASTAGE'
                                  ? 'text-red-400'
                                  : 'text-blue-400'
                            }`}
                          >
                            {m.type === 'IN' ? '+' : m.type !== 'ADJUSTMENT' ? '−' : '±'}
                            {m.quantity} {m.item?.unit ?? ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {movData?.meta && (
                <Pagination
                  meta={movData.meta}
                  currentPage={movPage}
                  handlePageChange={setMovPage}
                />
              )}
            </div>
          </TabsContent>

          {/* ── REPORTS TAB ── */}
          <TabsContent value="reports" className="space-y-5">
            {valLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 size={20} className="animate-spin text-slate-500" />
              </div>
            ) : valuation ? (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Total Items',
                      value: valuation.summary.totalItems,
                      color: 'text-white',
                    },
                    {
                      label: 'Cost Value',
                      value: fmtMoney(valuation.summary.totalCost),
                      color: 'text-amber-400',
                    },
                    {
                      label: 'Market Value',
                      value: fmtMoney(valuation.summary.totalValue),
                      color: 'text-emerald-400',
                    },
                    {
                      label: 'Gross Margin',
                      value: `${valuation.summary.grossMargin}%`,
                      color: 'text-blue-400',
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4"
                    >
                      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* By category */}
                <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-4">Valuation by Category</h2>
                  <div className="space-y-3">
                    {Object.entries(valuation.byCategory).map(([cat, data]) => {
                      const pct =
                        valuation.summary.totalValue > 0
                          ? (data.totalValue / valuation.summary.totalValue) * 100
                          : 0;
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 font-medium">{cat}</span>
                              <span className="text-slate-600">{data.items} items</span>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <span className="text-slate-500">
                                Cost {fmtMoney(data.totalCost)}
                              </span>
                              <span className="text-emerald-400 font-medium">
                                {fmtMoney(data.totalValue)}
                              </span>
                              <span className="text-blue-400 w-10">{data.margin}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#0f1117] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Low stock table */}
                {stats.lowStockItems.length > 0 && (
                  <div className="bg-[#161b27] border border-amber-500/20 rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <RefreshCw size={13} className="text-amber-400" /> Suggested Restock
                    </h2>
                    <div className="space-y-2">
                      {stats.lowStockItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-2 border-b border-[#1e2536] last:border-0"
                        >
                          <div>
                            <p className="text-sm text-slate-200">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              {item.supplier ?? 'No supplier'} · Only {item.quantity} left (min:{' '}
                              {item.minStock})
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const fullItem = stock.find((s) => s.id === item.id);
                              if (fullItem) setMovement({ item: fullItem, type: 'IN' });
                            }}
                            className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors font-medium"
                          >
                            Restock Now
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center">
                <BarChart3 size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No inventory data yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Item modal */}
      {(showAdd || editing) && (
        <ItemModal
          item={editing}
          categories={categories.filter((c) => c !== 'All')}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
        />
      )}

      {/* Movement modal */}
      {movement && (
        <MovementModal
          item={movement.item}
          type={movement.type}
          onClose={() => setMovement(null)}
        />
      )}
    </>
  );
}
