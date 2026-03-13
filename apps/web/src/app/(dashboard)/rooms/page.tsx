'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BedDouble, LayoutGrid, List, Search, Plus, Users,
  Wifi, Wind, Tv, Coffee, ChevronRight, X, Check
} from 'lucide-react';
import {
  rooms as seedRooms, STATUS_CONFIG, TYPE_CONFIG,
  ALL_ROOM_STATUSES, ALL_ROOM_TYPES, ALL_AMENITIES,
  type RoomStatus, type RoomType, type Room
} from '@/lib/rooms-data';

const amenityIcons: Record<string, any> = { WiFi: Wifi, AC: Wind, TV: Tv, 'Mini Bar': Coffee };

// ─── Add Room Modal ────────────────────────────────────────────────────────────
function AddRoomModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: Room) => void }) {
  const [form, setForm] = useState({
    number: '', floor: 1, type: 'STANDARD' as RoomType,
    beds: '', capacity: 2, baseRate: 150,
    amenities: [] as string[], notes: '',
  });
  const [error, setError] = useState('');

  const toggleAmenity = (a: string) =>
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));

  const handleAdd = () => {
    if (!form.number.trim()) return setError('Room number is required');
    if (!form.beds.trim()) return setError('Bed configuration is required');
    onAdd({
      id: `r${form.number}`, number: form.number, floor: form.floor,
      type: form.type, status: 'AVAILABLE', capacity: form.capacity,
      beds: form.beds, baseRate: form.baseRate, amenities: form.amenities,
      notes: form.notes || undefined, lastCleaned: new Date().toISOString().slice(0, 10),
    });
    onClose();
  };

  const inputCls = "w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors";
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>{children}</div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#1e2536]">
          <div>
            <h2 className="text-base font-bold text-white">Add New Room</h2>
            <p className="text-xs text-slate-500 mt-0.5">Room will be set to Available by default</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Room Number">
              <input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                placeholder="e.g. 501" className={inputCls} />
            </Field>
            <Field label="Floor">
              <input type="number" min={1} value={form.floor} onChange={e => setForm(f => ({ ...f, floor: Number(e.target.value) }))}
                className={inputCls} />
            </Field>
            <Field label="Capacity">
              <input type="number" min={1} max={10} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Room Type">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as RoomType }))} className={inputCls}>
                {ALL_ROOM_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
              </select>
            </Field>
            <Field label="Base Rate ($/night)">
              <input type="number" min={0} value={form.baseRate} onChange={e => setForm(f => ({ ...f, baseRate: Number(e.target.value) }))}
                className={inputCls} />
            </Field>
          </div>

          <Field label="Bed Configuration">
            <input value={form.beds} onChange={e => setForm(f => ({ ...f, beds: e.target.value }))}
              placeholder="e.g. 1 King, 2 Single, 1 Queen + Sofa" className={inputCls} />
          </Field>

          <Field label="Amenities">
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_AMENITIES.map(a => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    form.amenities.includes(a)
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'
                  }`}>
                  {form.amenities.includes(a) && <Check size={10} />}
                  {a}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes (optional)">
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any notes about this room..." className={inputCls} />
          </Field>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Preview */}
        <div className="px-6 py-3 bg-[#0f1117]/60 border-t border-[#1e2536] flex items-center gap-4 text-xs text-slate-500">
          <span className={`font-semibold ${TYPE_CONFIG[form.type].color}`}>{TYPE_CONFIG[form.type].label}</span>
          {form.number && <span>Room {form.number}</span>}
          {form.beds && <span>{form.beds}</span>}
          <span>{form.capacity} guests</span>
          {form.baseRate > 0 && <span className="ml-auto font-bold text-slate-300">${form.baseRate}/night</span>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-[#1e2536]">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={handleAdd} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Add Room</button>
        </div>
      </div>
    </div>
  );
}

// ─── Room Card (grid) ──────────────────────────────────────────────────────────
function RoomCard({ room, onClick }: { room: Room; onClick: () => void }) {
  const s = STATUS_CONFIG[room.status];
  const t = TYPE_CONFIG[room.type];
  return (
    <button onClick={onClick}
      className="bg-[#161b27] border border-[#1e2536] hover:border-slate-600 rounded-xl p-4 text-left transition-all group w-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">{room.number}</p>
          <p className={`text-xs font-medium ${t.color}`}>{t.label}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1.5 ${s.bg} ${s.color} border ${s.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />{s.label}
        </span>
      </div>
      <div className="space-y-1 mb-3">
        <p className="text-xs text-slate-500 flex items-center gap-1.5"><BedDouble size={11} className="text-slate-600" />{room.beds}</p>
        {room.currentGuest && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Users size={11} className="text-blue-500" />{room.currentGuest}</p>}
        {room.checkOut && <p className="text-xs text-slate-500">Out: {room.checkOut}</p>}
        {room.housekeeper && <p className="text-xs text-amber-400/80">🧹 {room.housekeeper}</p>}
        {room.notes && !room.currentGuest && <p className="text-xs text-slate-600 truncate">{room.notes}</p>}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {room.amenities.slice(0, 4).map(a => { const Icon = amenityIcons[a]; return Icon ? <Icon key={a} size={12} className="text-slate-600" /> : null; })}
          {room.amenities.length > 4 && <span className="text-[10px] text-slate-600">+{room.amenities.length - 4}</span>}
        </div>
        <span className="text-xs font-bold text-slate-300">${room.baseRate}<span className="text-slate-600 font-normal">/n</span></span>
      </div>
    </button>
  );
}

// ─── Room Row (list) ───────────────────────────────────────────────────────────
function RoomRow({ room, onClick }: { room: Room; onClick: () => void }) {
  const s = STATUS_CONFIG[room.status];
  const t = TYPE_CONFIG[room.type];
  return (
    <tr onClick={onClick} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer">
      <td className="px-4 py-3"><p className="text-sm font-bold text-white">{room.number}</p><p className="text-xs text-slate-500">Floor {room.floor}</p></td>
      <td className="px-4 py-3"><p className={`text-sm font-medium ${t.color}`}>{t.label}</p><p className="text-xs text-slate-500">{room.beds}</p></td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit ${s.bg} ${s.color} border ${s.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {room.currentGuest ? <p className="text-sm text-slate-300">{room.currentGuest}</p>
          : room.housekeeper ? <p className="text-sm text-amber-400/80">{room.housekeeper}</p>
          : <p className="text-sm text-slate-600">—</p>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{room.checkIn ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{room.checkOut ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-slate-400">{room.capacity} guests</td>
      <td className="px-4 py-3 text-sm font-medium text-slate-300 whitespace-nowrap">${room.baseRate}<span className="text-slate-600 text-xs">/night</span></td>
      <td className="px-4 py-3"><ChevronRight size={16} className="text-slate-600" /></td>
    </tr>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function RoomsPage() {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<RoomType | 'ALL'>('ALL');
  const [floorFilter, setFloorFilter] = useState<number | 'ALL'>('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [rooms, setRooms] = useState<Room[]>(seedRooms);

  const floors = [...new Set(rooms.map(r => r.floor))].sort();

  const filtered = rooms.filter(r => {
    const matchSearch = `${r.number} ${r.type} ${r.currentGuest ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchType = typeFilter === 'ALL' || r.type === typeFilter;
    const matchFloor = floorFilter === 'ALL' || r.floor === floorFilter;
    return matchSearch && matchStatus && matchType && matchFloor;
  });

  const byFloor = floors.map(f => ({ floor: f, rooms: filtered.filter(r => r.floor === f) })).filter(g => g.rooms.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Rooms</h1>
          <p className="text-slate-500 text-sm mt-0.5">{rooms.length} rooms · {rooms.filter(r => r.status === 'AVAILABLE').length} available tonight</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Room
        </button>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {ALL_ROOM_STATUSES.map(status => {
          const count = rooms.filter(r => r.status === status).length;
          const s = STATUS_CONFIG[status];
          const active = statusFilter === status;
          return (
            <button key={status} onClick={() => setStatusFilter(active ? 'ALL' : status)}
              className={`rounded-xl px-3 py-3 border text-center transition-all ${active ? `${s.bg} ${s.border}` : 'bg-[#161b27] border-[#1e2536] hover:border-slate-600'}`}>
              <p className={`text-xl font-bold ${s.color}`}>{count}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search room or guest..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <select value={floorFilter} onChange={e => setFloorFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors">
          <option value="ALL">All Floors</option>
          {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
          className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors">
          <option value="ALL">All Types</option>
          {ALL_ROOM_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
        </select>
        <div className="flex bg-[#161b27] border border-[#1e2536] rounded-lg p-1 gap-0.5">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid size={16} /></button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><List size={16} /></button>
        </div>
      </div>

      {filtered.length !== rooms.length && (
        <p className="text-xs text-slate-500">{filtered.length} of {rooms.length} rooms shown</p>
      )}

      {/* Grid */}
      {view === 'grid' && (
        <div className="space-y-8">
          {byFloor.map(({ floor, rooms: floorRooms }) => (
            <div key={floor}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Floor {floor}</p>
                <div className="flex-1 h-px bg-[#1e2536]" />
                <p className="text-xs text-slate-600">{floorRooms.length} rooms</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {floorRooms.map(room => <RoomCard key={room.id} room={room} onClick={() => router.push(`/rooms/${room.id}`)} />)}
              </div>
            </div>
          ))}
          {byFloor.length === 0 && (
            <div className="py-16 text-center"><BedDouble size={32} className="text-slate-700 mx-auto mb-3" /><p className="text-slate-500 text-sm">No rooms match your filters</p></div>
          )}
        </div>
      )}

      {/* List */}
      {view === 'list' && (
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
              <tr>
                {['Room','Type','Status','Guest / Staff','Check-in','Check-out','Capacity','Rate',''].map(h => (
                  <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(room => <RoomRow key={room.id} room={room} onClick={() => router.push(`/rooms/${room.id}`)} />)}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center"><BedDouble size={32} className="text-slate-700 mx-auto mb-3" /><p className="text-slate-500 text-sm">No rooms match your filters</p></div>
          )}
        </div>
      )}

      {showAdd && <AddRoomModal onClose={() => setShowAdd(false)} onAdd={room => setRooms(r => [...r, room])} />}
    </div>
  );
}