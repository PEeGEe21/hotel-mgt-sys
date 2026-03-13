'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, X, Check, Package } from 'lucide-react';

type Category = { id: string; name: string; description: string; color: string; itemCount: number };

const colorOptions = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-sky-500',
  'bg-red-500',
  'bg-teal-500',
  'bg-indigo-500',
];

const initCategories: Category[] = [
  {
    id: 'c1',
    name: 'Spirits',
    description: 'Whiskey, vodka, gin, rum, brandy',
    color: 'bg-amber-500',
    itemCount: 8,
  },
  {
    id: 'c2',
    name: 'Beer',
    description: 'Lager, stout, ale, cider',
    color: 'bg-orange-500',
    itemCount: 6,
  },
  {
    id: 'c3',
    name: 'Wine',
    description: 'Red, white, rosé, sparkling',
    color: 'bg-red-500',
    itemCount: 5,
  },
  {
    id: 'c4',
    name: 'Cocktails',
    description: 'Mixes, syrups, bitters',
    color: 'bg-pink-500',
    itemCount: 4,
  },
  {
    id: 'c5',
    name: 'Soft Drinks',
    description: 'Juices, sodas, water, energy drinks',
    color: 'bg-sky-500',
    itemCount: 7,
  },
  {
    id: 'c6',
    name: 'Food',
    description: 'Snacks, bar bites, kitchen items',
    color: 'bg-emerald-500',
    itemCount: 6,
  },
];

function CategoryModal({
  cat,
  onClose,
  onSave,
}: {
  cat?: Category;
  onClose: () => void;
  onSave: (d: Omit<Category, 'id' | 'itemCount'>) => void;
}) {
  const [name, setName] = useState(cat?.name ?? '');
  const [description, setDescription] = useState(cat?.description ?? '');
  const [color, setColor] = useState(cat?.color ?? 'bg-blue-500');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{cat ? 'Edit Category' : 'New Category'}</h2>
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
              Category Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cocktails, Food, Tobacco..."
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What items go in this category?"
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg ${c} flex items-center justify-center transition-transform hover:scale-110`}
                >
                  {color === c && <Check size={13} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
          {/* Preview */}
          <div className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-4 py-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
              <Package size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{name || 'Category Name'}</p>
              <p className="text-xs text-slate-500">{description || 'Description'}</p>
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
            onClick={() => name && onSave({ name, description, color })}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initCategories);
  const [modal, setModal] = useState<{ open: boolean; cat?: Category }>({ open: false });

  const save = (data: Omit<Category, 'id' | 'itemCount'>) => {
    if (modal.cat) {
      setCategories((c) => c.map((x) => (x.id === modal.cat!.id ? { ...x, ...data } : x)));
    } else {
      setCategories((c) => [...c, { ...data, id: Date.now().toString(), itemCount: 0 }]);
    }
    setModal({ open: false });
  };

  const remove = (id: string) => setCategories((c) => c.filter((x) => x.id !== id));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Inventory Categories</h1>
            <p className="text-slate-500 text-sm mt-0.5">{categories.length} categories</p>
          </div>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={15} /> New Category
        </button>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <div className="divide-y divide-[#1e2536]">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center shrink-0`}
                >
                  <Package size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{cat.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-white">{cat.itemCount}</p>
                  <p className="text-xs text-slate-500">items</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModal({ open: true, cat })}
                    className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(cat.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal.open && (
        <CategoryModal cat={modal.cat} onClose={() => setModal({ open: false })} onSave={save} />
      )}
    </div>
  );
}
