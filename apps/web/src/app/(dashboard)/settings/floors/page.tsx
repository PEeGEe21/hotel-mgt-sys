'use client';

import { useState } from 'react';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  BedDouble,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react';
import {
  useFloors,
  useCreateFloor,
  useUpdateFloor,
  useDeleteFloor,
  type ApiFloor,
} from '@/hooks/useFloors';

// ─── Floor Form Modal ─────────────────────────────────────────────────────────
function FloorModal({ floor, onClose }: { floor?: ApiFloor; onClose: () => void }) {
  const isEdit = !!floor;
  const [name, setName] = useState(floor?.name ?? '');
  const [level, setLevel] = useState<number>(floor?.level ?? 1);
  const [description, setDescription] = useState(floor?.description ?? '');
  const [error, setError] = useState('');

  const create = useCreateFloor();
  const update = useUpdateFloor(floor?.id ?? '');
  const busy = create.isPending || update.isPending;

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Name is required.');
    if (level === undefined) return setError('Level is required.');
    setError('');

    try {
      if (isEdit) {
        await update.mutateAsync({
          name: name.trim(),
          level,
          description: description || undefined,
        });
      } else {
        await create.mutateAsync({
          name: name.trim(),
          level,
          description: description || undefined,
        });
      }
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Something went wrong.');
    }
  };

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#1e2536]">
          <div>
            <h2 className="text-base font-bold text-white">
              {isEdit ? 'Edit Floor' : 'Add Floor'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? 'Update floor details' : 'Create a new floor or area'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Floor Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ground Floor, Outside Block A, Rooftop"
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Level{' '}
              <span className="normal-case text-slate-600">
                (used for sorting — negative for basements)
              </span>
            </label>
            <input
              type="number"
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              placeholder="e.g. 1, 2, -1 for basement"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Description <span className="normal-case text-slate-600">(optional)</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Pool-facing rooms, Conference wing"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white hover:border-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isEdit ? 'Save Changes' : 'Add Floor'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ floor, onClose }: { floor: ApiFloor; onClose: () => void }) {
  const deleteFloor = useDeleteFloor();
  const [error, setError] = useState('');

  const handleDelete = async () => {
    try {
      await deleteFloor.mutateAsync(floor.id);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not delete floor.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <Trash2 size={18} className="text-red-400" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-white">Delete "{floor.name}"?</h3>
          <p className="text-sm text-slate-500 mt-1">
            This cannot be undone. All rooms must be moved first.
          </p>
        </div>
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteFloor.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {deleteFloor.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FloorsSettingsPage() {
  const { data: floors = [], isLoading } = useFloors();
  const [showAdd, setShowAdd] = useState(false);
  const [editFloor, setEditFloor] = useState<ApiFloor | null>(null);
  const [deleteFloor, setDeleteFloor] = useState<ApiFloor | null>(null);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Floors & Areas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Define the floors and areas of your property. Rooms are assigned to these.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={15} /> Add Floor
        </button>
      </div>

      {/* List */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        ) : floors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Layers size={28} className="text-slate-700" />
            <p className="text-slate-500 text-sm">No floors yet. Add your first floor.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e2536]">
            {floors.map((floor, i) => (
              <div
                key={floor.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[#1a2035] transition-colors group"
              >
                {/* Level badge */}
                <div className="w-10 h-10 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-400">
                    {floor.level < 0 ? `B${Math.abs(floor.level)}` : `L${floor.level}`}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{floor.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {floor.description && (
                      <span className="text-xs text-slate-500 truncate">{floor.description}</span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <BedDouble size={11} />
                      {floor._count?.rooms ?? 0} room{floor._count?.rooms !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Sort indicator */}
                <div className="flex flex-col gap-0.5 text-slate-700">
                  {i > 0 && <ArrowUp size={12} />}
                  {i < floors.length - 1 && <ArrowDown size={12} />}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditFloor(floor)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteFloor(floor)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600">
        Tip: Use negative levels for basements (e.g. -1). Floors are sorted by level ascending.
      </p>

      {/* Modals */}
      {showAdd && <FloorModal onClose={() => setShowAdd(false)} />}
      {editFloor && <FloorModal floor={editFloor} onClose={() => setEditFloor(null)} />}
      {deleteFloor && <DeleteConfirm floor={deleteFloor} onClose={() => setDeleteFloor(null)} />}
    </div>
  );
}
