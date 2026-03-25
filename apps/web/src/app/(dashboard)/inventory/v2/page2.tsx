
import { useState } from 'react';
import {
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Plus,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  ShoppingCart,
  FileText,
  X,
  ChevronDown,
  Beer,
  Coffee,
  Utensils,
  Droplets,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'All' | 'Spirits' | 'Beer' | 'Wine' | 'Cocktails' | 'Soft Drinks' | 'Food';
type MovementType = 'IN' | 'OUT' | 'SALE' | 'WASTE';

interface StockItem {
  id: string;
  name: string;
  category: Exclude<Category, 'All'>;
  unit: string;
  quantity: number;
  minStock: number;
  costPrice: number;
  sellPrice: number;
  supplier: string;
  lastRestocked: string;
}

interface Movement {
  id: string;
  itemId: string;
  itemName: string;
  type: MovementType;
  quantity: number;
  note: string;
  time: string;
  amount?: number;
}

interface PurchaseOrder {
  id: string;
  supplier: string;
  items: { name: string; qty: number; cost: number }[];
  status: 'Pending' | 'Delivered';
  date: string;
  total: number;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const seedStock: StockItem[] = [
  {
    id: '1',
    name: 'Johnnie Walker Black',
    category: 'Spirits',
    unit: 'bottle',
    quantity: 8,
    minStock: 5,
    costPrice: 28,
    sellPrice: 55,
    supplier: 'Metro Drinks',
    lastRestocked: '2026-03-01',
  },
  {
    id: '2',
    name: 'Hennessy VS',
    category: 'Spirits',
    unit: 'bottle',
    quantity: 3,
    minStock: 5,
    costPrice: 35,
    sellPrice: 70,
    supplier: 'Metro Drinks',
    lastRestocked: '2026-02-20',
  },
  {
    id: '3',
    name: 'Absolut Vodka',
    category: 'Spirits',
    unit: 'bottle',
    quantity: 12,
    minStock: 4,
    costPrice: 22,
    sellPrice: 45,
    supplier: 'Metro Drinks',
    lastRestocked: '2026-03-05',
  },
  {
    id: '4',
    name: 'Heineken',
    category: 'Beer',
    unit: 'crate (24)',
    quantity: 6,
    minStock: 4,
    costPrice: 18,
    sellPrice: 3.5,
    supplier: 'BrewCo',
    lastRestocked: '2026-03-06',
  },
  {
    id: '5',
    name: 'Guinness',
    category: 'Beer',
    unit: 'crate (24)',
    quantity: 2,
    minStock: 3,
    costPrice: 20,
    sellPrice: 4,
    supplier: 'BrewCo',
    lastRestocked: '2026-02-28',
  },
  {
    id: '6',
    name: 'Trophy Lager',
    category: 'Beer',
    unit: 'crate (24)',
    quantity: 9,
    minStock: 5,
    costPrice: 14,
    sellPrice: 2.5,
    supplier: 'BrewCo',
    lastRestocked: '2026-03-04',
  },
  {
    id: '7',
    name: 'Red Wine (House)',
    category: 'Wine',
    unit: 'bottle',
    quantity: 14,
    minStock: 6,
    costPrice: 12,
    sellPrice: 30,
    supplier: 'Vineyard Plus',
    lastRestocked: '2026-03-01',
  },
  {
    id: '8',
    name: 'Coca-Cola',
    category: 'Soft Drinks',
    unit: 'crate (24)',
    quantity: 7,
    minStock: 5,
    costPrice: 10,
    sellPrice: 2,
    supplier: 'Soft Bev Ltd',
    lastRestocked: '2026-03-07',
  },
  {
    id: '9',
    name: 'Malta',
    category: 'Soft Drinks',
    unit: 'crate (24)',
    quantity: 1,
    minStock: 3,
    costPrice: 9,
    sellPrice: 1.5,
    supplier: 'Soft Bev Ltd',
    lastRestocked: '2026-02-25',
  },
  {
    id: '10',
    name: 'Chicken Wings',
    category: 'Food',
    unit: 'kg',
    quantity: 5,
    minStock: 3,
    costPrice: 8,
    sellPrice: 18,
    supplier: 'Fresh Foods Co',
    lastRestocked: '2026-03-08',
  },
  {
    id: '11',
    name: 'Peanuts (Salted)',
    category: 'Food',
    unit: 'bag (500g)',
    quantity: 20,
    minStock: 10,
    costPrice: 2,
    sellPrice: 5,
    supplier: 'Fresh Foods Co',
    lastRestocked: '2026-03-06',
  },
  {
    id: '12',
    name: 'Chapman Mix',
    category: 'Cocktails',
    unit: 'bottle',
    quantity: 4,
    minStock: 3,
    costPrice: 5,
    sellPrice: 12,
    supplier: 'Metro Drinks',
    lastRestocked: '2026-03-02',
  },
];

const seedMovements: Movement[] = [
  {
    id: 'm1',
    itemId: '1',
    itemName: 'Johnnie Walker Black',
    type: 'SALE',
    quantity: 1,
    note: 'Table 4',
    time: '09:42 AM',
    amount: 55,
  },
  {
    id: 'm2',
    itemId: '4',
    itemName: 'Heineken',
    type: 'SALE',
    quantity: 3,
    note: 'Room 201',
    time: '10:15 AM',
    amount: 10.5,
  },
  {
    id: 'm3',
    itemId: '5',
    itemName: 'Guinness',
    type: 'OUT',
    quantity: 1,
    note: 'Staff consumption',
    time: '11:00 AM',
  },
  {
    id: 'm4',
    itemId: '3',
    itemName: 'Absolut Vodka',
    type: 'IN',
    quantity: 4,
    note: 'Restocked from store',
    time: '11:30 AM',
  },
  {
    id: 'm5',
    itemId: '10',
    itemName: 'Chicken Wings',
    type: 'SALE',
    quantity: 2,
    note: 'Bar order',
    time: '12:45 PM',
    amount: 36,
  },
  {
    id: 'm6',
    itemId: '9',
    itemName: 'Malta',
    type: 'WASTE',
    quantity: 2,
    note: 'Expired',
    time: '01:00 PM',
  },
];

const weeklyData = [
  { day: 'Mon', sales: 420, cost: 180 },
  { day: 'Tue', sales: 380, cost: 160 },
  { day: 'Wed', sales: 510, cost: 210 },
  { day: 'Thu', sales: 640, cost: 260 },
  { day: 'Fri', sales: 890, cost: 350 },
  { day: 'Sat', sales: 1240, cost: 480 },
  { day: 'Sun', sales: 760, cost: 300 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const categoryIcon: Record<Exclude<Category, 'All'>, any> = {
  Spirits: Beer,
  Beer: Beer,
  Wine: Beer,
  Cocktails: Coffee,
  'Soft Drinks': Droplets,
  Food: Utensils,
};

const movementColor: Record<MovementType, string> = {
  IN: 'text-emerald-400',
  OUT: 'text-amber-400',
  SALE: 'text-blue-400',
  WASTE: 'text-red-400',
};
const movementBg: Record<MovementType, string> = {
  IN: 'bg-emerald-500/10 border-emerald-500/20',
  OUT: 'bg-amber-500/10 border-amber-500/20',
  SALE: 'bg-blue-500/10 border-blue-500/20',
  WASTE: 'bg-red-500/10 border-red-500/20',
};

const categories: Category[] = [
  'All',
  'Spirits',
  'Beer',
  'Wine',
  'Cocktails',
  'Soft Drinks',
  'Food',
];

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

function AddItemModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<StockItem, 'id' | 'lastRestocked'>) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    category: 'Spirits' as Exclude<Category, 'All'>,
    unit: 'bottle' as 'set' | 'pair' | 'piece' | 'bottle' | 'crate' | 'kg' | 'g',
    quantity: 0,
    minStock: 5,
    costPrice: 0,
    sellPrice: 0,
    supplier: '',
    uniqueId: '',
    description: '',
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const initSuppliers = [
    {
      id: 'sup1',
      name: 'Metro Drinks',
      email: 'olu@metrodrinks.ng',
    },
    {
      id: 'sup2',
      name: 'BrewCo Nigeria',
      email: 'emeka@brewco.ng',
    },
    {
      id: 'sup3',
      name: 'Soft Bev Ltd',
      email: 'taiwo@softbev.ng',
    },
    {
      id: 'sup4',
      name: 'Fresh Foods Co',
      email: 'chioma@freshfoods.ng',
    },
    {
      id: 'sup5',
      name: 'Vineyard Plus',
      email: 'david@vineyardplus.ng',
    },
  ];
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
      <DialogContent
        aria-describedby={undefined}
        className="w-full max-w-lg sm:max-w-2xl !rounded-2xl bg-[#161b27] border border-[#1e2536] ring-0 !outline-none p-6 [&>button]:hidden shadow-2xl !mt-0"
      >
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">Add Stock Item</h2>
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
              // {
              //   label: 'Unit',
              //   key: 'unit',
              //   type: 'text',
              //   col: 1,
              //   placeholder: 'bottle, crate, kg...',
              // },
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
                key: 'uniqueId',
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
              <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                <Label
                  htmlFor={key}
                  className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block"
                >
                  {label}
                </Label>
                <Input
                  id={key}
                  name={key}
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => set(key, type === 'number' ? +e.target.value : e.target.value)}
                  placeholder={placeholder}
                  className="h-12 w-full bg-[#0f1117] border !border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors !appearance-none"
                  required
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Unit
              </label>
              <Select onValueChange={(e) => set('unit', e)} value={form.unit}>
                <SelectTrigger className="!h-12 w-full text-white !bg-[#0f1117] border border-[#1e2536] rounded-lg shadow-none outline-0 ring-0 focus-visible:outline-none focus-visible:ring-0 focus-within:ring-0 focus:shadow-none focus:ring-0 focus:outline-0 ring-offset-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161b27] border border-[#1e2536] text-white">
                  {['set', 'pair', 'piece', 'bottle', 'crate', 'kg', 'g'].map((i) => (
                    <SelectItem
                      key={i}
                      value={i}
                      className="hover:!bg-blue-600/20 cursor-pointer hover:!text-blue-400 text-white data-[state=checked]:bg-blue-600/20 data-[state=checked]:text-blue-400"
                    >
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Supplier
              </label>
              <Select onValueChange={(e) => set('supplier', e)} value={form.supplier}>
                <SelectTrigger className="!h-12 w-full text-white !bg-[#0f1117] border border-[#1e2536] rounded-lg shadow-none outline-0 ring-0 focus-visible:outline-none focus-visible:ring-0 focus-within:ring-0 focus:shadow-none focus:ring-0 focus:outline-0 ring-offset-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161b27] border border-[#1e2536] text-white">
                  {initSuppliers.map((i) => (
                    <SelectItem
                      key={i.id}
                      value={i.id}
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.category === cat ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
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
              onClick={() => form.name && onSubmit(form)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              Add Item
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [stock, setStock] = useState<StockItem[]>(seedStock);
  const [movements, setMovements] = useState<Movement[]>(seedMovements);
  const [activeTab, setActiveTab] = useState<'stock' | 'sales' | 'orders' | 'reports'>('stock');
  const [category, setCategory] = useState<Category>('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ item: StockItem; type: MovementType } | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [pageLimit, setPageLimit] = useState('10');

  const lowStock = stock.filter((i) => i.quantity <= i.minStock);
  const totalValue = stock.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const todaySales = movements
    .filter((m) => m.type === 'SALE')
    .reduce((s, m) => s + (m.amount || 0), 0);

  const filtered = stock.filter(
    (i) =>
      (category === 'All' || i.category === category) &&
      i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const recordMovement = (item: StockItem, type: MovementType, qty: number, note: string) => {
    setStock((s) =>
      s.map((i) =>
        i.id === item.id
          ? {
              ...i,
              quantity: type === 'IN' ? i.quantity + qty : Math.max(0, i.quantity - qty),
            }
          : i,
      ),
    );
    setMovements((m) => [
      {
        id: Date.now().toString(),
        itemId: item.id,
        itemName: item.name,
        type,
        quantity: qty,
        note,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: type === 'SALE' ? qty * item.sellPrice : undefined,
      },
      ...m,
    ]);
    setModal(null);
  };

  const addItem = (item: Omit<StockItem, 'id' | 'lastRestocked'>) => {
    setStock((s) => [
      ...s,
      { ...item, id: Date.now().toString(), lastRestocked: new Date().toISOString().split('T')[0] },
    ]);
    setShowAddItem(false);
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
                {lowStock.length} item{lowStock.length > 1 ? 's' : ''} running low:
              </span>{' '}
              {lowStock.map((i) => i.name).join(', ')}
            </p>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Items"
            value={stock.length}
            sub={`${lowStock.length} low stock`}
            icon={Package}
            color="blue"
          />
          <StatCard
            label="Stock Value"
            value={`₦${totalValue.toFixed(0)}`}
            sub="at cost price"
            icon={TrendingUp}
            color="emerald"
          />
          <StatCard
            label="Today's Sales"
            value={`₦${todaySales.toFixed(2)}`}
            sub={`${movements.filter((m) => m.type === 'SALE').length} transactions`}
            icon={ShoppingCart}
            color="violet"
          />
          <StatCard
            label="Low Stock"
            value={lowStock.length}
            sub="need restocking"
            icon={AlertTriangle}
            color={lowStock.length > 0 ? 'red' : 'emerald'}
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
                    {filtered.map((item) => {
                      const isLow = item.quantity <= item.minStock;
                      const Icon = categoryIcon[item.category];
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
                                <p className="text-xs text-slate-600">{item.supplier}</p>
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
                            &#8358;{item.sellPrice}
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
                                onClick={() => setModal({ item, type: 'OUT' })}
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
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── SALES LOG TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="sales" className="space-y-4">
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1e2536] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Today's Activity Log</h2>
                <span className="text-xs text-slate-500">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="divide-y divide-[#1e2536]">
                {movements.length === 0 && (
                  <p className="text-center text-slate-600 py-12 text-sm">
                    No activity recorded today
                  </p>
                )}
                {movements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${movementBg[m.type]} ${movementColor[m.type]}`}
                      >
                        {m.type}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{m.itemName}</p>
                        <p className="text-xs text-slate-500">
                          {m.note || '—'} · {m.time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-300">×{m.quantity}</p>
                      {m.amount && (
                        <p className="text-xs text-emerald-400 font-semibold">
                          ${m.amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-[#1e2536] bg-[#0f1117]/30 flex items-center justify-between">
                <span className="text-xs text-slate-500">Total sales today</span>
                <span className="text-sm font-bold text-emerald-400">${todaySales.toFixed(2)}</span>
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
              {[
                {
                  id: 'PO-001',
                  supplier: 'Metro Drinks',
                  date: '2026-03-06',
                  status: 'Delivered',
                  total: 285,
                  items: ['Hennessy VS ×3', 'Absolut Vodka ×6', 'Chapman Mix ×12'],
                },
                {
                  id: 'PO-002',
                  supplier: 'BrewCo',
                  date: '2026-03-04',
                  status: 'Delivered',
                  total: 162,
                  items: ['Heineken ×4 crates', 'Guinness ×3 crates'],
                },
                {
                  id: 'PO-003',
                  supplier: 'Soft Bev Ltd',
                  date: '2026-03-09',
                  status: 'Pending',
                  total: 95,
                  items: ['Malta ×4 crates', 'Coca-Cola ×3 crates'],
                },
              ].map((order) => (
                <div key={order.id} className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white">{order.id}</span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${order.status === 'Delivered' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {order.supplier} · {order.date}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-white">${order.total}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span
                        key={item}
                        className="text-xs bg-[#0f1117] border border-[#1e2536] text-slate-400 px-2.5 py-1 rounded-lg"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── REPORTS TAB ───────────────────────────────────────────────────── */}
          <TabsContent value="reports" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-4">Weekly Sales vs Cost</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
                      <XAxis dataKey="day" stroke="#475569" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          background: '#161b27',
                          border: '1px solid #1e2536',
                          borderRadius: 8,
                        }}
                      />
                      <Bar
                        dataKey="sales"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                        name="Sales (&#8358;)"
                      />
                      <Bar
                        dataKey="cost"
                        fill="#7c3aed"
                        radius={[4, 4, 0, 0]}
                        name="Cost (&#8358;)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-4">Top Selling Items</h2>
                  <div className="space-y-3">
                    {[
                      { name: 'Heineken', sales: 48, revenue: 168, pct: 90 },
                      { name: 'Johnnie Walker Black', sales: 12, revenue: 660, pct: 75 },
                      { name: 'Chicken Wings', sales: 30, revenue: 540, pct: 65 },
                      { name: 'Coca-Cola', sales: 60, revenue: 120, pct: 55 },
                      { name: 'Hennessy VS', sales: 8, revenue: 560, pct: 40 },
                    ].map((item) => (
                      <div key={item.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-slate-300">{item.name}</span>
                          <span className="text-sm text-slate-400">
                            &#8358;{item.revenue} · {item.sales} sold
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#1e2536] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Daily Summary */}
              <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Daily Summary — Today</h2>
                  <button className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 bg-[#0f1117] border border-[#1e2536] px-3 py-1.5 rounded-lg transition-colors">
                    <FileText size={12} /> Export Report
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Gross Sales',
                      value: `&#8358;${todaySales.toFixed(2)}`,
                      color: 'text-emerald-400',
                    },
                    {
                      label: 'Cost of Goods',
                      value: `&#8358;${(todaySales * 0.42).toFixed(2)}`,
                      color: 'text-amber-400',
                    },
                    {
                      label: 'Gross Profit',
                      value: `&#8358;${(todaySales * 0.58).toFixed(2)}`,
                      color: 'text-blue-400',
                    },
                    { label: 'Margin', value: '58%', color: 'text-violet-400' },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-4"
                    >
                      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {modal && (
        <StockMovementModal
          isOpen={!!modal}
          item={modal.item}
          type={modal.type}
          onClose={() => setModal(null)}
          onSubmit={(qty, note) => recordMovement(modal.item, modal.type, qty, note)}
        />
      )}
      <AddItemModal isOpen={showAddItem} onClose={() => setShowAddItem(false)} onSubmit={addItem} />
    </>
  );
}
