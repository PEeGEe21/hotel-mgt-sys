'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, X, Truck, Phone, Mail, MapPin } from 'lucide-react';
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
  type Supplier,
} from '@/hooks/useSuppliers';

const allCategories = ['Spirits', 'Beer', 'Wine', 'Cocktails', 'Soft Drinks', 'Food'];

function SupplierModal({ supplier, onClose, onSave }: {
  supplier?: Supplier;
  onClose: () => void;
  onSave: (s: Omit<Supplier, 'id'>) => void;
}) {
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    contact: supplier?.contact ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    address: supplier?.address ?? '',
    notes: supplier?.notes ?? '',
    categories: supplier?.categories ?? [] as string[],
  });

  const toggleCat = (cat: string) =>
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{supplier ? 'Edit Supplier' : 'New Supplier'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Supplier Name', key: 'name', col: 2, placeholder: 'e.g. Metro Drinks' },
            { label: 'Contact Person', key: 'contact', col: 1, placeholder: 'Name' },
            { label: 'Phone', key: 'phone', col: 1, placeholder: '+234...' },
            { label: 'Email', key: 'email', col: 1, placeholder: 'supplier@email.com' },
            { label: 'Address', key: 'address', col: 1, placeholder: 'City, State' },
            { label: 'Notes', key: 'notes', col: 2, placeholder: 'Delivery schedule, payment terms...' },
          ].map(({ label, key, col, placeholder }) => (
            <div key={key} className={col === 2 ? 'col-span-2' : ''}>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
              <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Supplies</label>
            <div className="flex gap-2 flex-wrap">
              {allCategories.map(cat => (
                <button key={cat} onClick={() => toggleCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.categories.includes(cat)
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'
                  }`}>{cat}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={() => form.name && onSave(form)}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; supplier?: Supplier }>({ open: false });
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier(modal.supplier?.id ?? '');
  const deleteSupplier = useDeleteSupplier();

  const save = async (data: Omit<Supplier, 'id'>) => {
    try {
      if (modal.supplier) {
        await updateSupplier.mutateAsync(data);
      } else {
        await createSupplier.mutateAsync(data);
      }
      setModal({ open: false });
    } catch {
      // handled by toast
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    try {
      await deleteSupplier.mutateAsync(id);
    } catch {
      // handled by toast
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Suppliers</h1>
            <p className="text-slate-500 text-sm mt-0.5">{suppliers.length} suppliers</p>
          </div>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 text-slate-500 text-sm">
            Loading suppliers…
          </div>
        ) : suppliers.length === 0 ? (
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 text-slate-500 text-sm">
            No suppliers yet
          </div>
        ) : (
          suppliers.map(sup => (
            <div key={sup.id} className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Truck size={16} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{sup.name}</p>
                    <p className="text-xs text-slate-500">{sup.contact}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ open: true, supplier: sup })}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => remove(sup.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <p className="text-xs text-slate-500 flex items-center gap-1.5"><Phone size={10} />{sup.phone}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5"><Mail size={10} />{sup.email}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5"><MapPin size={10} />{sup.address}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {sup.categories.map(cat => (
                  <span key={cat} className="text-xs bg-[#0f1117] border border-[#1e2536] text-slate-400 px-2 py-0.5 rounded-md">{cat}</span>
                ))}
              </div>

              {sup.notes && (
                <p className="text-xs text-amber-400/70 mt-2 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">{sup.notes}</p>
              )}
            </div>
          ))
        )}
      </div>

      {modal.open && <SupplierModal supplier={modal.supplier} onClose={() => setModal({ open: false })} onSave={save} />}
    </div>
  );
}
