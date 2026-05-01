'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Table2,
  Plus,
  X,
  Check,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import {
  usePosTables,
  useCreateTable,
  useUpdateTable,
  useToggleTable,
  useDeleteTable,
  useReorderTables,
  useSeedTables,
  type PosTable,
  type CreateTableInput,
} from '@/hooks/pos/usePosTables';
import { useRouter } from 'next/navigation';

// ─── Table Modal ──────────────────────────────────────────────────────────────
function TableModal({
  table,
  sections,
  onClose,
}: {
  table?: PosTable | null;
  sections: string[];
  onClose: () => void;
}) {
  const isEditing = !!table;
  const create = useCreateTable();
  const update = useUpdateTable(table?.id ?? '');
  const [form, setForm] = useState({
    name: table?.name ?? '',
    section: table?.section ?? '',
    capacity: table?.capacity ?? '',
  });
  const [newSection, setNewSection] = useState('');
  const [showNewSection, setShowNewSection] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Name is required.');
    setError('');
    const payload: CreateTableInput = {
      name: form.name.trim(),
      section: showNewSection ? newSection.trim() || undefined : form.section || undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
    };
    try {
      if (isEditing) await update.mutateAsync(payload);
      else await create.mutateAsync(payload);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not save table.');
    }
  };

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1e2536]">
          <h2 className="text-base font-bold text-white">
            {isEditing ? 'Edit Table' : 'Add Table'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Table Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Table 1, Bar Counter, VIP Booth"
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-500 uppercase tracking-wider">Section</label>
              <button
                onClick={() => setShowNewSection((v) => !v)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {showNewSection ? 'Pick existing' : '+ New section'}
              </button>
            </div>
            {showNewSection ? (
              <input
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="e.g. Rooftop, Garden, Lounge"
                className={inputCls}
              />
            ) : (
              <select
                value={form.section}
                onChange={(e) => set('section', e.target.value)}
                className={inputCls}
              >
                <option value="">No section</option>
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Capacity (seats)
            </label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
              placeholder="4"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={create.isPending || update.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {create.isPending || update.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {isEditing ? 'Save' : 'Add Table'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TablesSettingsPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PosTable | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = usePosTables(showInactive);
  const deleteTable = useDeleteTable();
  const reorder = useReorderTables();
  const seedTables = useSeedTables();

  const sections = data?.sections ?? [];
  const allTables = data?.tables ?? [];
  const sectionNames = [...new Set(allTables.map((t) => t.section ?? 'General'))];

  const moveTable = (section: string, index: number, direction: 'up' | 'down') => {
    const sectionTables = [...(sections.find((s) => s.name === section)?.tables ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= sectionTables.length) return;

    const items = [
      { id: sectionTables[index].id, sortOrder: sectionTables[swap].sortOrder },
      { id: sectionTables[swap].id, sortOrder: sectionTables[index].sortOrder },
    ];
    reorder.mutate(items);
  };

  return (
    <>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Tables & Sections</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Configure tables for the POS terminal — {data?.total ?? '—'} total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allTables.length === 0 && !isLoading && (
              <button
                onClick={() => seedTables.mutate()}
                disabled={seedTables.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/50 border border-[#1e2536] hover:border-slate-500 text-slate-300 text-sm font-medium transition-colors"
              >
                {seedTables.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                Seed defaults
              </button>
            )}
            <button
              onClick={() => setShowInactive((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${showInactive ? 'bg-blue-600/15 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
            >
              {showInactive ? <Eye size={13} /> : <EyeOff size={13} />}
              {showInactive ? 'Hiding inactive' : 'Show inactive'}
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> Add Table
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-slate-500" />
          </div>
        ) : allTables.length === 0 ? (
          <div className="py-20 text-center bg-[#161b27] border border-dashed border-[#2b3348] rounded-xl">
            <Table2 size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No tables yet</p>
            <p className="text-slate-600 text-xs mt-1">
              Click "Seed defaults" for a quick start, or add manually
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <div
                key={section.name}
                className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden"
              >
                {/* Section header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2536] bg-[#0f1117]/40">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-slate-500" />
                    <p className="text-sm font-semibold text-white">{section.name}</p>
                    <span className="text-xs text-slate-600">
                      {section.tables.length} table{section.tables.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Tables */}
                <div className="divide-y divide-[#1e2536]">
                  {[...section.tables]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((table, idx) => (
                      <TableRow
                        key={table.id}
                        table={table}
                        index={idx}
                        totalInSection={section.tables.length}
                        onEdit={() => {
                          setEditing(table);
                          setShowModal(true);
                        }}
                        onDelete={() => deleteTable.mutate(table.id)}
                        onMoveUp={() => moveTable(section.name, idx, 'up')}
                        onMoveDown={() => moveTable(section.name, idx, 'down')}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <TableModal
          table={editing}
          sections={sectionNames}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function TableRow({
  table,
  index,
  totalInSection,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  table: PosTable;
  index: number;
  totalInSection: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const toggle = useToggleTable(table.id);
  const openOrders = table._count?.orders ?? 0;

  return (
    <div
      className={`flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${!table.isActive ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-700 hover:text-slate-400 disabled:opacity-20 transition-colors"
          >
            <ArrowUp size={11} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalInSection - 1}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-700 hover:text-slate-400 disabled:opacity-20 transition-colors"
          >
            <ArrowDown size={11} />
          </button>
        </div>

        <div className="w-9 h-9 rounded-xl bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
          <Table2 size={14} className="text-slate-500" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-200">{table.name}</p>
            {!table.isActive && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500">
                Inactive
              </span>
            )}
            {openOrders > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                {openOrders} open order{openOrders !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {table.capacity ? `${table.capacity} seats` : 'No capacity set'}
            {table.section && ` · ${table.section}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => toggle.mutate()}
          disabled={toggle.isPending}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${table.isActive ? 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
        >
          {toggle.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : table.isActive ? (
            <EyeOff size={13} />
          ) : (
            <Eye size={13} />
          )}
        </button>
        <button
          onClick={onDelete}
          disabled={openOrders > 0}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={openOrders > 0 ? 'Cannot delete — has open orders' : 'Delete table'}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
