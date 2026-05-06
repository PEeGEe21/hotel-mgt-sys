'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Package,
  Plus,
  Search,
  X,
  Check,
  Loader2,
  Trash2,
  ChevronRight,
  Eye,
  EyeOff,
  AlertCircle,
  ShoppingCart,
  Beaker,
  Wrench,
  Layers,
  Star,
} from 'lucide-react';
import {
  usePosProducts,
  useCreateProduct,
  useUpdateProduct,
  useToggleProduct,
  useDeleteProduct,
  useInventoryItemOptions,
  useProductCategories,
  type ApiProduct,
  type CreateProductInput,
  type ProductType,
  type ProductIngredient,
  type PrepStation,
} from '@/hooks/pos/usePosProducts';
import openToast from '@/components/ToastComponent';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/ui/pagination';
import { usePosProductCategories } from '@/hooks/pos/usePosProductCategories';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

const TYPE_CONFIG: Record<
  ProductType,
  { label: string; color: string; bg: string; icon: any; desc: string }
> = {
  PHYSICAL: {
    label: 'Physical',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10    border-blue-500/20',
    icon: Package,
    desc: 'Has ingredients — deducts from inventory when sold',
  },
  SERVICE: {
    label: 'Service',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10  border-violet-500/20',
    icon: Star,
    desc: 'No inventory — massage, fees, services',
  },
  BUNDLE: {
    label: 'Bundle',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10   border-amber-500/20',
    icon: Layers,
    desc: 'Multiple ingredients — cocktails, meal combos',
  },
};

const PREP_STATION_OPTIONS: { value: PrepStation; label: string; desc: string }[] = [
  { value: 'NONE', label: 'No Station', desc: 'Does not appear on kitchen or bar boards' },
  { value: 'KITCHEN', label: 'Kitchen', desc: 'Routes to the kitchen prep board' },
  { value: 'BAR', label: 'Bar', desc: 'Routes to the bar prep board' },
];

type InventoryTrackingMode = 'RECIPE' | 'DIRECT' | 'NONE';

// ─── Ingredient Row ───────────────────────────────────────────────────────────
function IngredientRow({
  ingredient,
  index,
  onChange,
  onRemove,
}: {
  ingredient: {
    inventoryItemId: string;
    quantity: number;
    unit?: string;
    _name?: string;
    _unit?: string;
  };
  index: number;
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}) {
  const [search, setSearch] = useState(ingredient._name ?? '');
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const { data: options = [] } = useInventoryItemOptions(debouncedSearch || undefined);

  const inputCls =
    'bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-xl p-3">
      {/* Inventory item picker */}
      <div className="flex-1 relative">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange(index, 'inventoryItemId', '');
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search inventory item…"
          className={`${inputCls} w-full`}
        />
        {open && debouncedSearch && options.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#161b27] border border-[#1e2536] rounded-xl shadow-xl z-20 overflow-hidden max-h-40 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSearch(opt.name);
                  setOpen(false);
                  onChange(index, 'inventoryItemId', opt.id);
                  onChange(index, '_name', opt.name);
                  onChange(index, '_unit', opt.unit);
                  if (!ingredient.unit) onChange(index, 'unit', opt.unit);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left border-b border-[#1e2536] last:border-0"
              >
                <div>
                  <p className="text-sm text-slate-200">{opt.name}</p>
                  <p className="text-xs text-slate-500">
                    {opt.category} · {opt.quantity} {opt.unit} in stock
                  </p>
                </div>
                <span className="text-xs text-slate-600 font-mono">{opt.sku}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="w-24">
        <input
          type="number"
          min={0.001}
          step={0.001}
          value={ingredient.quantity}
          onChange={(e) => onChange(index, 'quantity', Number(e.target.value))}
          placeholder="Qty"
          className={`${inputCls} w-full`}
        />
      </div>

      {/* Unit */}
      <div className="w-20">
        <input
          value={ingredient.unit ?? ingredient._unit ?? ''}
          onChange={(e) => onChange(index, 'unit', e.target.value)}
          placeholder="unit"
          className={`${inputCls} w-full`}
        />
      </div>

      <button
        onClick={() => onRemove(index)}
        className="text-slate-600 hover:text-red-400 transition-colors shrink-0 p-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Product Modal ────────────────────────────────────────────────────────────
function ProductModal({ product, onClose }: { product?: ApiProduct | null; onClose: () => void }) {
  const isEditing = !!product;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? '');

  const [form, setForm] = useState({
    name: product?.name ?? '',
    price: product?.price ?? 0,
    categoryId: product?.categoryId ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    unit: product?.unit ?? 'item',
    isAvailable: product?.isAvailable ?? true,
    stock:
      typeof product?.stock === 'number' || product?.stock === null
        ? product?.stock
        : null,
    type: (product?.type ?? 'PHYSICAL') as ProductType,
    prepStation: (product?.prepStation ?? 'NONE') as PrepStation,
  });
  const [trackingMode, setTrackingMode] = useState<InventoryTrackingMode>(
    product?.ingredients?.length
      ? 'RECIPE'
      : product?.stock !== null && product?.stock !== undefined
        ? 'DIRECT'
        : 'NONE',
  );

  const [ingredients, setIngredients] = useState<
    {
      inventoryItemId: string;
      quantity: number;
      unit?: string;
      _name?: string;
      _unit?: string;
    }[]
  >(
    product?.ingredients?.map((ing) => ({
      inventoryItemId: ing.inventoryItemId,
      quantity: Number(ing.quantity),
      unit: ing.unit ?? undefined,
      _name: ing.inventoryItem.name,
      _unit: ing.inventoryItem.unit,
    })) ?? [],
  );

  const [newCategory, setNewCategory] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [mounted, onClose]);

  const { data: categories = [] } = usePosProductCategories();

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const addIngredient = () =>
    setIngredients((prev) => [...prev, { inventoryItemId: '', quantity: 1 }]);
  const removeIngredient = (i: number) =>
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  const updateIngredient = (i: number, field: string, value: any) => {
    setIngredients((prev) =>
      prev.map((ing, idx) => (idx === i ? { ...ing, [field]: value } : ing)),
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Name is required.');
    const normalizedPrice = Number(form.price);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      return setError('Price must be greater than 0.');
    }
    if (!form.categoryId) return setError('Category is required.');
    if (form.type !== 'SERVICE' && trackingMode === 'RECIPE') {
      if (ingredients.length === 0) return setError('Add at least one ingredient from inventory.');
      const incomplete = ingredients.find((i) => !i.inventoryItemId || i.quantity <= 0);
      if (incomplete) return setError('All ingredients must have an inventory item and quantity.');
    }
    if (form.type !== 'SERVICE' && trackingMode === 'DIRECT') {
      const normalizedStock = Number(form.stock);
      if (!Number.isFinite(normalizedStock) || normalizedStock < 0) {
        return setError('Direct stock must be 0 or greater.');
      }
    }
    setError('');

    const payload: CreateProductInput = {
      name: form.name,
      price: normalizedPrice,
      categoryId: form.categoryId,
      type: form.type,
      sku: form.sku || undefined,
      description: form.description || undefined,
      unit: form.unit,
      isAvailable: form.isAvailable,
      stock:
        form.type !== 'SERVICE' && trackingMode === 'DIRECT'
          ? Number(form.stock)
          : undefined,
      prepStation: form.prepStation,
      ingredients:
        form.type !== 'SERVICE' && trackingMode === 'RECIPE'
          ? ingredients.map((i) => ({
              inventoryItemId: i.inventoryItemId,
              quantity: i.quantity,
              unit: i.unit || undefined,
            }))
          : [],
    };

    try {
      if (isEditing) {
        await updateProduct.mutateAsync(payload);
      } else {
        await createProduct.mutateAsync(payload);
      }
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not save product.');
    }
  };

  if (!mounted) return null;

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
      {children}
    </label>
  );

  const isPending = createProduct.isPending || updateProduct.isPending;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#1e2536]">
          <div>
            <h2 className="text-base font-bold text-white">
              {isEditing ? 'Edit Product' : 'New Product'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing ? product!.name : 'Add to your catalogue'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Product type */}
          <div>
            <Label>Product Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TYPE_CONFIG) as [ProductType, any][]).map(([t, cfg]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    set('type', t);
                    if (t === 'SERVICE') {
                      setIngredients([]);
                      setTrackingMode('NONE');
                      set('stock', null);
                    }
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${form.type === t ? `${cfg.bg} ${cfg.color}` : 'bg-[#0f1117] border-[#1e2536] text-slate-500 hover:text-slate-300'}`}
                >
                  <cfg.icon size={16} />
                  <span className="text-xs font-medium">{cfg.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-2">{TYPE_CONFIG[form.type].desc}</p>
          </div>

          {/* Name + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <Label>Product Name *</Label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Heineken"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <Label>Selling Price (₦) *</Label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) =>
                  set('price', e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="1200"
                className={inputCls}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Category *</Label>
              <button
                onClick={() => setShowNewCat((v) => !v)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showNewCat ? 'Pick existing' : '+ New category'}
              </button>
            </div>
            {/* {showNewCat ? (
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Cocktails"
                className={inputCls}
              />
            ) : ( */}
            <select
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className={inputCls}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {/* )} */}
          </div>

          {/* SKU + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SKU (optional)</Label>
              <input
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder="HNK-600"
                className={inputCls}
              />
            </div>
            <div>
              <Label>Unit</Label>
              <input
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
                placeholder="bottle, glass, plate…"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <Label>Prep Station</Label>
            <select
              value={form.prepStation}
              onChange={(e) => set('prepStation', e.target.value as PrepStation)}
              className={inputCls}
            >
              {PREP_STATION_OPTIONS.map((station) => (
                <option key={station.value} value={station.value}>
                  {station.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-600">
              {PREP_STATION_OPTIONS.find((station) => station.value === form.prepStation)?.desc}
            </p>
          </div>

          {form.type !== 'SERVICE' && (
            <div>
              <Label>Inventory Tracking</Label>
              <div className="grid gap-2 md:grid-cols-3">
                {[
                  {
                    value: 'RECIPE',
                    label: 'Recipe',
                    desc: 'Deduct linked ingredients when sold',
                  },
                  {
                    value: 'DIRECT',
                    label: 'Direct Stock',
                    desc: 'Deduct stock directly from this product',
                  },
                  {
                    value: 'NONE',
                    label: 'Untracked',
                    desc: 'Sell without inventory deduction',
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setTrackingMode(option.value as InventoryTrackingMode);
                      if (option.value !== 'RECIPE') setIngredients([]);
                      if (option.value !== 'DIRECT') set('stock', null);
                      if (option.value === 'DIRECT' && (form.stock === null || form.stock === undefined)) {
                        set('stock', 0);
                      }
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      trackingMode === option.value
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                        : 'border-[#1e2536] bg-[#0f1117] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.type !== 'SERVICE' && trackingMode === 'DIRECT' && (
            <div>
              <Label>Opening Stock</Label>
              <input
                type="number"
                min={0}
                value={form.stock ?? ''}
                onChange={(e) => set('stock', e.target.value === '' ? null : Number(e.target.value))}
                placeholder="0"
                className={inputCls}
              />
              <p className="mt-2 text-xs text-slate-600">
                Stock will be deducted directly from this product when sold.
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <Label>Description (optional)</Label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Brief description for menu display…"
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Availability toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('isAvailable', !form.isAvailable)}
              className={`w-9 h-5 rounded-full border transition-colors cursor-pointer relative ${form.isAvailable ? 'bg-emerald-600 border-emerald-500' : 'bg-[#0f1117] border-[#1e2536]'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.isAvailable ? 'left-4' : 'left-0.5'}`}
              />
            </div>
            <span className="text-sm text-slate-400">Available on terminal</span>
          </label>

          {/* ── Ingredients Section ── */}
          {form.type !== 'SERVICE' && trackingMode === 'RECIPE' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                    Ingredients *
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    What gets deducted from inventory when 1 unit is sold
                  </p>
                </div>
                <button
                  onClick={addIngredient}
                  className="flex items-center gap-1.5 text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <Plus size={12} /> Add ingredient
                </button>
              </div>

              {ingredients.length > 0 ? (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_96px_80px_32px] gap-2 px-3">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                      Inventory Item
                    </span>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                      Quantity
                    </span>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                      Unit
                    </span>
                    <span />
                  </div>
                  {ingredients.map((ing, i) => (
                    <IngredientRow
                      key={i}
                      ingredient={ing}
                      index={i}
                      onChange={updateIngredient}
                      onRemove={removeIngredient}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-[#1e2536] rounded-xl p-6 text-center">
                  <Beaker size={20} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-600">No ingredients yet</p>
                  <p className="text-xs text-slate-700 mt-1">
                    Click "Add ingredient" to link this product to inventory
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-5 pt-4 border-t border-[#1e2536]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isEditing ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PosProductsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ApiProduct | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const deleteProduct = useDeleteProduct();
  const toggleProduct = useToggleProduct('');

  const { data, isLoading, isFetching } = usePosProducts({
    search: debouncedSearch || undefined,
    category: category || undefined,
    type: type || undefined,
    page,
    limit: 24,
  });
  const { data: categories } = usePosProductCategories();

  const products = data?.products ?? [];
  //   const categories = data?.categories ?? [];

  const handleToggle = (id: string) => {
    const toggle = useToggleProduct;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Products
              {isFetching && !isLoading && (
                <Loader2 size={14} className="animate-spin text-slate-500" />
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {data?.total ?? '—'} products · {categories?.length} categories
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={15} /> Add Product
          </button>
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: '', label: 'All Types' },
            { value: 'PHYSICAL', label: 'Physical' },
            { value: 'SERVICE', label: 'Services' },
            { value: 'BUNDLE', label: 'Bundles' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setType(opt.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${type === opt.value ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search + category filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search size={14} className="text-slate-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, SKU, category…"
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setCategory('');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!category ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            {categories?.map((c, index) => (
              <button
                key={index}
                onClick={() => {
                  setCategory(c.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${category === c.id ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-slate-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
            <Package size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No products found</p>
            <button
              onClick={() => {
                setEditing(null);
                setShowModal(true);
              }}
              className="mt-4 text-xs text-blue-400 hover:underline"
            >
              Add your first product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
              const tc = TYPE_CONFIG[product.type as ProductType];
              return (
                <div
                  key={product.id}
                  className={`bg-[#161b27] border rounded-xl overflow-hidden transition-all group ${product.isAvailable ? 'border-[#1e2536]' : 'border-[#1e2536] opacity-60'}`}
                >
                  {/* Top */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-white truncate">
                            {product.name}
                          </p>
                          {!product.isAvailable && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500">
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{product?.category?.name}</p>
                        <div className="mt-2">
                          <span className="rounded-full border border-[#2a3349] bg-[#111827] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                            {product.prepStation === 'NONE'
                              ? 'No station'
                              : `${product.prepStation.toLowerCase()} board`}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${tc.bg} ${tc.color} shrink-0`}
                      >
                        {tc.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-white">
                        {fmtMoney(Number(product.price))}
                      </p>
                      <span className="text-xs text-slate-600">per {product.unit}</span>
                    </div>

                    {/* Ingredients summary */}
                    {product.type !== 'SERVICE' && (
                      <div>
                        {product.ingredients.length > 0 ? (
                          <div className="space-y-1">
                            {product.ingredients.slice(0, 2).map((ing) => (
                              <div
                                key={ing.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-slate-500 truncate">
                                  {ing.inventoryItem.name}
                                </span>
                                <span className="text-slate-600 shrink-0 ml-2">
                                  {ing.quantity} {ing.unit ?? ing.inventoryItem.unit}
                                </span>
                              </div>
                            ))}
                            {product.ingredients.length > 2 && (
                              <p className="text-xs text-slate-700">
                                +{product.ingredients.length - 2} more
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
                            <AlertCircle size={11} />
                            <span>No ingredients linked</span>
                          </div>
                        )}
                      </div>
                    )}

                    {product.type === 'SERVICE' && (
                      <p className="text-xs text-slate-600 italic">
                        Service — no inventory deduction
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-[#1e2536] px-4 py-2.5 flex items-center justify-between bg-[#0f1117]/30">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditing(product);
                          setShowModal(true);
                        }}
                        className="text-xs text-slate-500 hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-blue-500/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProduct.mutate(product.id)}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                    <ToggleButton productId={product.id} isAvailable={product.isAvailable} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data?.meta && products.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>

      {showModal && (
        <ProductModal
          product={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

// Separate component to avoid hook-in-callback issue
function ToggleButton({ productId, isAvailable }: { productId: string; isAvailable: boolean }) {
  const toggle = useToggleProduct(productId);
  return (
    <button
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isAvailable ? 'text-emerald-400 hover:text-slate-400' : 'text-slate-500 hover:text-emerald-400'}`}
    >
      {toggle.isPending ? (
        <Loader2 size={11} className="animate-spin" />
      ) : isAvailable ? (
        <Eye size={11} />
      ) : (
        <EyeOff size={11} />
      )}
      {isAvailable ? 'Available' : 'Hidden'}
    </button>
  );
}
