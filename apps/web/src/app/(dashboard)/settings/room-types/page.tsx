'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, X, BedDouble, Check } from 'lucide-react';
import {
  useCreateRoomType,
  useDeleteRoomType,
  useRoomTypes,
  useUpdateRoomType,
  type RoomTypeConfig,
} from '@/hooks/room/useRoomTypes';

const colorOptions = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-sky-500',
];
const allAmenities = [
  'WiFi',
  'AC',
  'TV',
  'Mini Bar',
  'Balcony',
  'Sea View',
  'Jacuzzi',
  'Kitchen',
  'Safe',
  'Bathtub',
];

function RoomTypeModal({
  rt,
  onClose,
  onSave,
}: {
  rt?: RoomTypeConfig;
  onClose: () => void;
  onSave: (d: Omit<RoomTypeConfig, 'id' | 'count'>) => void;
}) {
  const [form, setForm] = useState({
    name: rt?.name ?? '',
    description: rt?.description ?? '',
    baseRate: rt?.baseRate ?? 0,
    capacity: rt?.capacity ?? 2,
    beds: rt?.beds ?? '1 Queen',
    amenities: rt?.amenities ?? ([] as string[]),
    color: rt?.color ?? 'bg-blue-500',
  });

  const toggleAmenity = (a: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">
            {rt ? 'Edit Room Type' : 'New Room Type'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Room Type Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Executive Suite"
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description"
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Base Rate ($/night)
            </label>
            <input
              type="number"
              value={form.baseRate}
              onChange={(e) => setForm((f) => ({ ...f, baseRate: Number(e.target.value) }))}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Max Capacity
            </label>
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Bed Configuration
            </label>
            <input
              value={form.beds}
              onChange={(e) => setForm((f) => ({ ...f, beds: e.target.value }))}
              placeholder="e.g. 1 King + Sofa"
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Amenities
            </label>
            <div className="flex flex-wrap gap-2">
              {allAmenities.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.amenities.includes(a)
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Color
            </label>
            <div className="flex gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-lg ${c} flex items-center justify-center transition-transform hover:scale-110`}
                >
                  {form.color === c && <Check size={13} className="text-white" />}
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
            onClick={() => form.name && onSave(form)}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoomTypesPage() {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; rt?: RoomTypeConfig }>({ open: false });
  const { data: roomTypes = [], isLoading } = useRoomTypes();
  const createRoomType = useCreateRoomType();
  const updateRoomType = useUpdateRoomType(modal.rt?.id ?? '');
  const deleteRoomType = useDeleteRoomType();

  const save = async (data: Omit<RoomTypeConfig, 'id' | 'count'>) => {
    try {
      if (modal.rt) {
        await updateRoomType.mutateAsync(data);
      } else {
        await createRoomType.mutateAsync(data);
      }
      setModal({ open: false });
    } catch {
      // handled by toast
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this room type?')) return;
    try {
      await deleteRoomType.mutateAsync(id);
    } catch {
      // handled by toast
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Room Types</h1>
            <p className="text-slate-500 text-sm mt-0.5">{roomTypes.length} room types defined</p>
          </div>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={15} /> New Room Type
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 text-slate-500 text-sm">
            Loading room types…
          </div>
        ) : roomTypes.length === 0 ? (
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 text-slate-500 text-sm">
            No room types yet
          </div>
        ) : (
          roomTypes.map((rt) => (
            <div
              key={rt.id}
              className="bg-[#161b27] border border-[#1e2536] hover:border-slate-600 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${rt.color} flex items-center justify-center shrink-0`}
                  >
                    <BedDouble size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{rt.name}</p>
                    <p className="text-xs text-slate-500">{rt.description}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setModal({ open: true, rt })}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => remove(rt.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Base Rate', value: `$${rt.baseRate}/night` },
                  { label: 'Capacity', value: `${rt.capacity} guests` },
                  { label: 'Total Rooms', value: rt.count },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-[#0f1117] border border-[#1e2536] rounded-lg p-2 text-center"
                  >
                    <p className="text-xs text-slate-600">{label}</p>
                    <p className="text-sm font-bold text-slate-200 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mb-2">{rt.beds}</p>
              <div className="flex flex-wrap gap-1.5">
                {rt.amenities.map((a) => (
                  <span
                    key={a}
                    className="text-xs bg-[#0f1117] border border-[#1e2536] text-slate-400 px-2 py-0.5 rounded-md"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {modal.open && (
        <RoomTypeModal rt={modal.rt} onClose={() => setModal({ open: false })} onSave={save} />
      )}
    </div>
  );
}
