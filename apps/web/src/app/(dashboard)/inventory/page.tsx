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
  Beer,
  Coffee,
  Utensils,
  Droplets,
  BarChart3,
  RefreshCw,
  Loader2,
  ArrowUpCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import Pagination from '@/components/ui/pagination';
import {
  InventoryItem,
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useGerateItemSku,
  useInventoryList,
  useUpdateInventoryItem,
} from '@/hooks/useInventoryItems';
import { useInventoryCategories } from '@/hooks/useInventoryCategories';
import { useSuppliers } from '@/hooks/useSuppliers';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = string;
type StockItem = InventoryItem;
type MovementType = 'IN' | 'OUT' | 'SALE' | 'WASTE';
type ItemForm = {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const categoryIcon: Record<string, any> = {
  Spirits: Beer,
  Beer: Beer,
  Wine: Beer,
  Cocktails: Coffee,
  'Soft Drinks': Droplets,
  Food: Utensils,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: any = {
    blue: 'from-blue-500/15 to-transparent border-blue-500/20 text-blue-400',
    emerald: 'from-emerald-500/15 to-transparent border-emerald-500/20 text-emerald-400',
    violet: 'from-amber-500/15 to-transparent border-amber-500/20 text-amber-400',
    red: 'from-red-500/15 to-transparent border-red-500/20 text-red-400',
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

// ─── Modals ───────────────────────────────────────────────────────────────────

function AddItemModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  submitLabel,
  categories,
  suppliers,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: ItemForm) => void;
  title: string;
  submitLabel: string;
  categories: string[];
  suppliers: { id: string; name: string }[];
  initial?: Partial<ItemForm>;
}) {
  const generateSku = useGerateItemSku();
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  const [form, setForm] = useState<ItemForm>({
    name: '',
    category: categories.find((c) => c !== 'All') ?? '',
    unit: 'bottle',
    quantity: 0,
    minStock: 5,
    costPrice: 0,
    sellPrice: 0,
    supplier: '',
    sku: '',
    description: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: initial?.name ?? '',
      category: initial?.category ?? categories.find((c) => c !== 'All') ?? '',
      unit: initial?.unit ?? 'bottle',
      quantity: initial?.quantity ?? 0,
      minStock: initial?.minStock ?? 5,
      costPrice: initial?.costPrice ?? 0,
      sellPrice: initial?.sellPrice ?? 0,
      supplier: initial?.supplier ?? '',
      sku: initial?.sku ?? '',
      description: initial?.description ?? '',
    });
  }, [isOpen, initial, categories]);

  const set = (k: keyof ItemForm, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const generateId = async () => {
    try {
      setIsGeneratingSku(true);
      const res = await generateSku.mutateAsync();
      set('sku', res);
      console.log(res, 'response');
      openToast('success', 'SKU generated');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to reset PIN';
      openToast('error', msg);
    } finally {
      setIsGeneratingSku(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
      <DialogContent
        aria-describedby={undefined}
        className="w-full max-w-lg sm:max-w-2xl !rounded-2xl bg-[#161b27] border border-[#1e2536] ring-0 !outline-none p-6 [&>button]:hidden shadow-2xl !mt-0"
      >
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: 'Item Name',
                key: 'name',
                type: 'text',
                col: 2,
                placeholder: 'e.g. Hennessy VS',
              },
              { label: 'Opening Stock', key: 'quantity', type: 'number', col: 1, placeholder: '0' },
              {
                label: 'Min Stock Alert',
                key: 'minStock',
                type: 'number',
                col: 1,
                placeholder: '5',
              },
              {
                label: 'Item Unique ID',
                key: 'sku',
                type: 'text',
                col: 1,
                placeholder: 'Eg. Barcode Number or Supplier Code',
              },
              {
                label: 'Cost Price (₦)',
                key: 'costPrice',
                type: 'number',
                col: 1,
                placeholder: '0.00',
              },
              {
                label: 'Sell Price (₦)',
                key: 'sellPrice',
                type: 'number',
                col: 1,
                placeholder: '0.00',
              },
            ].map(({ label, key, type, col, placeholder }) => (
              <div key={key} className={col == 2 ? 'col-span-2' : ''}>
                <Label
                  htmlFor={key}
                  className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block"
                >
                  {label}
                </Label>
                {key === 'sku' ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={form.sku}
                      onChange={(e) => set('sku', e.target.value)}
                      placeholder={placeholder}
                      className="flex-1 h-12 w-full bg-[#0f1117] border !border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors !appearance-none"
                    />

                    <button
                      type="button"
                      onClick={() => generateId()}
                      className="px-3 h-10 rounded-lg bg-blue-600/20 border-blue-500/30 text-blue-400 text-white text-xs font-semibold"
                    >
                      {isGeneratingSku ? <Loader2 /> : 'Generate'}
                    </button>
                  </div>
                ) : (
                  <Input
                    value={(form as any)[key]}
                    onChange={(e) =>
                      set(
                        key as keyof ItemForm,
                        type === 'number' ? +e.target.value : e.target.value,
                      )
                    }
                    placeholder={placeholder}
                    className="h-12 w-full bg-[#0f1117] border !border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors !appearance-none"
                  />
                )}
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Unit
              </label>
              <select
                value={form.unit}
                onChange={(e) => {
                  set('unit', e.target.value);
                }}
                className="!h-12 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none transition-colors"
              >
                {['bottle', 'set', 'pair', 'piece', 'crate', 'kg', 'g'].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Supplier
              </label>
              <Select onValueChange={(e) => set('supplier', e)} value={form.supplier}>
                <SelectTrigger className="!h-12 w-full text-white !bg-[#0f1117] border border-[#1e2536] rounded-lg shadow-none outline-0 ring-0 focus-visible:outline-none focus-visible:ring-0 focus-within:ring-0 focus:shadow-none focus:ring-0 focus:outline-0 ring-offset-0 focus:ring-offset-0">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent className="bg-[#161b27] border border-[#1e2536] text-white">
                  {suppliers.map((i) => (
                    <SelectItem
                      key={i.id}
                      value={i.name}
                      className="hover:!bg-blue-600/20 cursor-pointer hover:!text-blue-400 text-white data-[state=checked]:bg-blue-600/20 data-[state=checked]:text-blue-400"
                    >
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Description
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Enter item description"
                className="w-full bg-[#0f1117] border !border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors resize-none h-auto min-h-[3rem]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter((c) => c !== 'All')
                  .map((cat) => (
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
          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => form.name && form.uniqueId && form.category && onSubmit(form)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StockMovementModal({
  isOpen,
  item,
  type,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  item: StockItem;
  type: 'IN' | 'OUT' | 'SALE' | 'WASTE';
  onClose: () => void;
  onSubmit: (qty: number, note: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const labels = { IN: 'Restock', OUT: 'Remove Stock', SALE: 'Record Sale', WASTE: 'Record Waste' };
  const colors = {
    IN: 'bg-emerald-600 hover:bg-emerald-500',
    OUT: 'bg-amber-600 hover:bg-amber-500',
    SALE: 'bg-blue-600 hover:bg-blue-500',
    WASTE: 'bg-red-600 hover:bg-red-500',
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
      <DialogContent
        aria-describedby={undefined}
        className="w-full max-w-md sm:max-w-md !rounded-2xl bg-[#161b27] border !border-[#161b27] p-6 [&>button]:hidden shadow-2xl"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-white">{labels[type]}</h2>
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
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Current Stock
            </label>
            <p className="text-2xl font-bold text-white">
              {item.quantity}{' '}
              <span className="text-sm text-slate-500 font-normal">{item.unit}s</span>
            </p>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-12 h-12 rounded-lg bg-[#0f1117] border border-[#1e2536] text-slate-300 hover:text-white transition-colors flex items-center justify-center font-bold"
              >
                -
              </button>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(Math.max(1, +e.target.value))}
                className="h-12 flex-1 bg-[#0f1117] border border-[#1e2536] rounded-lg px-4 py-2 text-center text-white font-bold outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={() => setQty(qty + 1)}
                className="w-12 h-12 rounded-lg bg-[#0f1117] border border-[#1e2536] text-slate-300 hover:text-white transition-colors flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>
          </div>
          {type === 'SALE' && (
            <div className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500">Sale Amount</p>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                &#8358;{(qty * item.sellPrice).toFixed(2)}
              </p>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Table 3, Room 102, expired..."
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
              onClick={() => onSubmit(qty, note)}
              className={`flex-1 ${colors[type]} text-white rounded-lg py-2.5 text-sm font-semibold transition-colors`}
            >
              {labels[type]}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [category, setCategory] = useState<Category>('All');
  const [search, setSearch] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [pageLimit, setPageLimit] = useState('10');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<{ item: StockItem; type: MovementType } | null>(null);

  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem(editingItem?.id ?? '');
  const deleteItem = useDeleteInventoryItem();

  const { data: categoryData = [] } = useInventoryCategories();
  const { data: suppliers = [] } = useSuppliers();

  const categories = useMemo(() => ['All', ...categoryData.map((c) => c.name)], [categoryData]);

  const { data, isLoading } = useInventoryList({
    page,
    limit: Number(pageLimit),
    search: search.trim() || undefined,
    category: category === 'All' ? undefined : category,
  });

  const stock = data?.items ?? [];
  const meta = data?.meta ?? {
    total: 0,
    current_page: page,
    per_page: Number(pageLimit),
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
  const lowStock = stats.lowStockItems ?? [];

  useEffect(() => {
    setPage(1);
  }, [category, search, pageLimit]);

  const recordMovement = (item: StockItem, type: MovementType, qty: number, note: string) => {
    // setStock((s) =>
    //   s.map((i) =>
    //     i.id === item.id
    //       ? {
    //           ...i,
    //           quantity: type === 'IN' ? i.quantity + qty : Math.max(0, i.quantity - qty),
    //         }
    //       : i,
    //   ),
    // );
    setModal(null);
  };


  const tabs = [
    { key: 'stock', label: 'Stock', icon: Package },
    { key: 'sales', label: 'Sales Log', icon: ShoppingCart },
    { key: 'orders', label: 'Purchase Orders', icon: ArrowDownCircle },
    { key: 'reports', label: 'Reports', icon: BarChart3 },
  ] as const;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sales Inventory</h1>
            <p className="text-slate-500 text-sm mt-0.5">Track stock, sales and supplies</p>
          </div>
          <button
            onClick={() => setShowAddItem(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={15} /> Add Item
          </button>
        </div>

        {/* Low Stock Alert Banner */}
        {lowStock.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              <span className="font-semibold">
                {stats.lowStockCount} item{stats.lowStockCount > 1 ? 's' : ''} running low:
              </span>{' '}
              {lowStock.map((i) => i.name).join(', ')}
            </p>
          </div>
        )}

        {/* Stat Cards */}
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
            value={`₦${stats.totalValue.toFixed(0)}`}
            sub="at cost price"
            icon={TrendingUp}
            color="emerald"
          />
          <StatCard
            label="Today's Sales"
            value={`₦${stats.todaySales.toFixed(2)}`}
            sub={`${stats.todayTransactions} transactions`}
            icon={ShoppingCart}
            color="violet"
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

        <Tabs defaultValue="stock" className="space-y-4 flex-col">
          <TabsList className="bg-[#161b27] border border-[#1e2536] rounded-xl p-1 justify-start gap-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <TabsTrigger
                key={key}
                value={key}
                className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 !text-slate-400 hover:!text-slate-200"
              >
                <Icon size={14} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── STOCK TAB ─────────────────────────────────────────────────────── */}
          <TabsContent value="stock" className="space-y-4">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <Select value={pageLimit} onValueChange={setPageLimit}>
                    <SelectTrigger className="max-w-[100px] text-white bg-[#161b27] border border-[#1e2536] rounded-lg shadow-none outline-0 ring-0 focus-visible:outline-none focus-visible:ring-0 focus-within:ring-0 focus:shadow-none focus:ring-0 focus:outline-0 ring-offset-0 focus:ring-offset-0">
                      <SelectValue placeholder="Filter by Limit" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161b27] border border-[#1e2536]">
                      {[5, 10, 15, 20].map((x) => (
                        <SelectItem
                          key={x}
                          value={x.toString()}
                          className="hover:!bg-blue-600/20 cursor-pointer hover:!text-blue-400 text-white data-[state=checked]:bg-blue-600/20 data-[state=checked]:text-blue-400"
                        >
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-48">
                    <Search size={14} className="text-slate-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search items..."
                      className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
                    />
                  </div>

                  <Select
                    value={category}
                    onValueChange={(value) => setCategory(value as Category)}
                  >
                    <SelectTrigger className="max-w-fit text-white bg-[#161b27] border border-[#1e2536] rounded-lg shadow-none outline-0 ring-0 focus-visible:outline-none focus-visible:ring-0 focus-within:ring-0 focus:shadow-none focus:ring-0 focus:outline-0 ring-offset-0 focus:ring-offset-0">
                      <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161b27] border border-[#1e2536]">
                      {categories.map((cat) => (
                        <SelectItem
                          key={cat}
                          value={cat.toString()}
                          className="hover:!bg-blue-600/20 cursor-pointer hover:!text-blue-400 text-white data-[state=checked]:bg-blue-600/20 data-[state=checked]:text-blue-400"
                        >
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stock Table */}
              <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                    <tr>
                      {[
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
                          className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                          Loading inventory...
                        </td>
                      </tr>
                    )}
                    {!isLoading && stock.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                          No inventory items yet.
                        </td>
                      </tr>
                    )}
                    {!isLoading &&
                      stock.map((item) => {
                        const isLow = item.quantity <= item.minStock;
                        const Icon = categoryIcon[item.category] ?? Package;
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-[#1e2536] hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center">
                                  <Icon size={14} className="text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-200">{item.name}</p>
                                  <p className="text-xs text-slate-600">{item.supplier ?? '—'}</p>
                                </div>
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
                                {isLow && <AlertTriangle size={13} className="text-red-400" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">{item.minStock}</td>
                            <td className="px-4 py-3 text-sm text-slate-400">
                              &#8358;{item.costPrice}
                            </td>
                            <td className="px-4 py-3 text-sm text-emerald-400 font-medium">
                              &#8358;{item.sellPrice ?? 0}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setModal({ item, type: 'SALE' })}
                                  title="Record Sale"
                                  className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                                >
                                  <ShoppingCart size={16} />
                                </button>
                                <button
                                  onClick={() => setModal({ item, type: 'IN' })}
                                  title="Restock"
                                  className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                >
                                  <ArrowDownCircle size={16} />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm('Delete this item?')) return;
                                    await deleteItem.mutateAsync(item.id);
                                  }}
                                  title="Remove"
                                  className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                                >
                                  <ArrowUpCircle size={16} />
                                </button>
                                <button
                                  onClick={() => setModal({ item, type: 'WASTE' })}
                                  title="Waste"
                                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <X size={16} />
                                </button>

                                {/* <DropdownMenu>
                                  <DropdownMenuTrigger className="px-2 py-1 text-xs text-slate-400 border border-[#1e2536] rounded-lg hover:text-slate-200">
                                    Actions
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-[#161b27] border border-[#1e2536] text-white">
                                    <DropdownMenuItem
                                      onClick={() => setEditingItem(item)}
                                      className="text-xs hover:!bg-blue-600/20 hover:!text-blue-300 cursor-pointer"
                                    >
                                      Edit item
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        if (!confirm('Delete this item?')) return;
                                        await deleteItem.mutateAsync(item.id);
                                      }}
                                      className="text-xs hover:!bg-red-600/20 hover:!text-red-300 cursor-pointer"
                                    >
                                      Delete item
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu> */}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <Pagination
                  meta={meta}
                  currentPage={page}
                  handlePageChange={(next) => setPage(Math.max(1, next))}
                />
              </div>
            </div>
          </TabsContent>

          {/* ── SALES LOG TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="sales" className="space-y-4">
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-6 text-sm text-slate-500">
              Sales activity tracking will appear here once POS and stock movement logging is
              connected.
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Today&apos;s sales</span>
                <span className="text-emerald-400 font-semibold">
                  ₦{stats.todaySales.toFixed(2)}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* ── PURCHASE ORDERS TAB ───────────────────────────────────────────── */}
          <TabsContent value="orders" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Manage supplier orders and deliveries</p>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  <Plus size={14} /> New Order
                </button>
              </div>
              {/* Low stock suggestions */}
              {lowStock.length > 0 && (
                <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <RefreshCw size={14} className="text-amber-400" /> Suggested Restock
                  </h3>
                  <div className="space-y-2">
                    {lowStock.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b border-[#1e2536] last:border-0"
                      >
                        <div>
                          <p className="text-sm text-slate-200">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            {item.supplier} · Only {item.quantity} left (min: {item.minStock})
                          </p>
                        </div>
                        <button className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors font-medium">
                          Order Now
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Sample orders */}
              <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 text-sm text-slate-500">
                Purchase orders will appear here once supplier ordering is connected.
              </div>
            </div>
          </TabsContent>

          {/* ── REPORTS TAB ───────────────────────────────────────────────────── */}
          <TabsContent value="reports" className="space-y-4">
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-6 text-sm text-slate-500">
              Inventory reports will appear here once stock movement and sales analytics are
              connected.
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <AddItemModal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        title="Add Stock Item"
        submitLabel="Add Item"
        categories={categories}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        onSubmit={async (form) => {
          await createItem.mutateAsync({
            name: form.name,
            sku: form.sku ?? form.uniqueId,
            category: form.category,
            description: form.description,
            unit: form.unit,
            quantity: form.quantity,
            minStock: form.minStock,
            costPrice: form.costPrice,
            sellPrice: form.sellPrice,
            supplier: form.supplier,
          });
          setShowAddItem(false);
        }}
      />
      {editingItem && (
        <AddItemModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          title="Edit Stock Item"
          submitLabel="Save Changes"
          categories={categories}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          initial={{
            name: editingItem.name,
            category: editingItem.category,
            unit: editingItem.unit,
            quantity: editingItem.quantity,
            minStock: editingItem.minStock,
            costPrice: editingItem.costPrice,
            sellPrice: editingItem.sellPrice ?? 0,
            supplier: editingItem.supplier ?? '',
            sku: editingItem.sku ?? editingItem.uniqueId,
            description: editingItem.description ?? '',
          }}
          onSubmit={async (form) => {
            await updateItem.mutateAsync({
              name: form.name,
              sku: form.sku ?? form.uniqueId,
              category: form.category,
              description: form.description,
              unit: form.unit,
              quantity: form.quantity,
              minStock: form.minStock,
              costPrice: form.costPrice,
              sellPrice: form.sellPrice,
              supplier: form.supplier,
            });
            setEditingItem(null);
          }}
        />
      )}

      {modal && (
        <StockMovementModal
          isOpen={!!modal}
          item={modal.item}
          type={modal.type}
          onClose={() => setModal(null)}
          onSubmit={(qty, note) => recordMovement(modal.item, modal.type, qty, note)}
        />
      )}
    </>
  );
}
