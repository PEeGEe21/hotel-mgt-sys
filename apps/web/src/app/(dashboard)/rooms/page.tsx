'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BedDouble,
  LayoutGrid,
  List,
  Search,
  Plus,
  Users,
  Wifi,
  Wind,
  Tv,
  Coffee,
  ChevronRight,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import {
  // rooms as seedRooms,
  STATUS_CONFIG,
  TYPE_CONFIG,
  ALL_ROOM_STATUSES,
  ALL_ROOM_TYPES,
  ALL_AMENITIES,
  type RoomStatus,
  type RoomType,
} from '@/lib/rooms-data';
import { useDebounce } from '@/hooks/useDebounce';
import { ApiRoom, useCreateRoom, useRooms } from '@/hooks/room/useRooms';
import { useFloors } from '@/hooks/useFloors';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import TableScroll from '@/components/ui/table-scroll';
import AddRoomModal from './_components/AddRoomModal';

const amenityIcons: Record<string, any> = { WiFi: Wifi, AC: Wind, TV: Tv, 'Mini Bar': Coffee };

// ─── Room Card (grid) ──────────────────────────────────────────────────────────
function RoomCard({ room, onClick }: { room: ApiRoom; onClick: () => void }) {
  const s = STATUS_CONFIG[room.status];
  const t = TYPE_CONFIG[room.type];
  return (
    <button
      onClick={onClick}
      className="bg-[#161b27] border border-[#1e2536] hover:border-slate-600 rounded-xl p-4 text-left transition-all group w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
            {room.number}
          </p>
          <p className={`text-xs font-medium ${t?.color ?? ''}`}>{t?.label ?? ''}</p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1.5 ${s?.bg} ${s?.color} border ${s?.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s?.dot}`} />
          {s?.label}
        </span>
      </div>
      <div className="space-y-1 mb-3">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <BedDouble size={11} className="text-slate-600" />
          {room.beds ?? '—'}
        </p>
        {room.currentGuest && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Users size={11} className="text-blue-500" />
            {room.currentGuest}
          </p>
        )}
        {room.checkOut && <p className="text-xs text-slate-500">Out: {room.checkOut}</p>}
        {room.housekeeper && <p className="text-xs text-amber-400/80">🧹 {room.housekeeper}</p>}
        {room.notes && !room.currentGuest && (
          <p className="text-xs text-slate-600 truncate">{room.notes}</p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {room.amenities.slice(0, 4).map((a) => {
            const Icon = amenityIcons[a];
            return Icon ? <Icon key={a} size={12} className="text-slate-600" /> : null;
          })}
          {room.amenities.length > 4 && (
            <span className="text-[10px] text-slate-600">+{room.amenities.length - 4}</span>
          )}
        </div>
        <span className="text-xs font-bold text-slate-300">
          ${room.baseRate}
          <span className="text-slate-600 font-normal">/n</span>
        </span>
      </div>
    </button>
  );
}

// ─── Room Row (list) ───────────────────────────────────────────────────────────
function RoomRow({ room, onClick }: { room: ApiRoom; onClick: () => void }) {
  const s = STATUS_CONFIG[room.status];
  const t = TYPE_CONFIG[room.type];
  return (
    <tr
      onClick={onClick}
      className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
    >
      <td className="px-4 py-3">
        <p className="text-sm font-bold text-white">{room.number}</p>
        <p className="text-xs text-slate-500">Floor {room?.floor?.name}</p>
      </td>
      <td className="px-4 py-3">
        <p className={`text-sm font-medium ${t?.color ?? ''}`}>{t?.label ?? ''}</p>
        <p className="text-xs text-slate-500">{room.beds}</p>
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit ${s.bg} ${s.color} border ${s.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {room.currentGuest ? (
          <p className="text-sm text-slate-300">{room.currentGuest}</p>
        ) : room.housekeeper ? (
          <p className="text-sm text-amber-400/80">{room.housekeeper}</p>
        ) : (
          <p className="text-sm text-slate-600">—</p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{room.checkIn ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{room.checkOut ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-slate-400">{room.capacity} guests</td>
      <td className="px-4 py-3 text-sm font-medium text-slate-300 whitespace-nowrap">
        ${room.baseRate}
        <span className="text-slate-600 text-xs">/night</span>
      </td>
      <td className="px-4 py-3">
        <ChevronRight size={16} className="text-slate-600" />
      </td>
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
  const [floorFilter, setFloorFilter] = useState<string | 'ALL'>('ALL');
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);
  const createRoom = useCreateRoom();
  const { data: allFloors = [] } = useFloors();

  const { data, isLoading, isError, isFetching } = useRooms({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
    floorId: floorFilter !== 'ALL' ? floorFilter : undefined,
    search: debouncedSearch || undefined,
    page,
    limit: view === 'list' ? 20 : 50, // list paginates tighter
  });

  const rooms = (data?.rooms ?? []) as ApiRoom[];
  const byFloor = allFloors
    .filter((fl) => floorFilter === 'ALL' || fl.id === floorFilter)
    .map((fl) => ({ floor: fl, rooms: rooms.filter((r) => r.floorId === fl.id) }))
    .filter((g) => g.rooms.length > 0);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-slate-500" />
      </div>
    );

  if (isError)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400 text-sm">Failed to load rooms. Check your connection.</p>
      </div>
    );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Rooms</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {rooms.length} rooms · {rooms.filter((r) => r.status === 'AVAILABLE').length}{' '}
              available tonight
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={15} /> Add Room
          </button>
        </div>

        {/* Status strip */}
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          {ALL_ROOM_STATUSES.map((status) => {
            const count = rooms.filter((r) => r.status === status).length;
            const s = STATUS_CONFIG[status];
            const active = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(active ? 'ALL' : status)}
                className={`rounded-xl px-3 py-3 border text-center transition-all ${active ? `${s.bg} ${s.border}` : 'bg-[#161b27] border-[#1e2536] hover:border-slate-600'}`}
              >
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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room or guest..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value === 'ALL' ? 'ALL' : e.target.value)}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="ALL">All Floors</option>
            {allFloors.map((f, key) => (
              <option key={key} value={f.id}>
                {f?.name ? `Floor ${f?.name}` : `Floor ${f?.id}`}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="ALL">All Types</option>
            {ALL_ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_CONFIG[t].label}
              </option>
            ))}
          </select>
          <div className="flex bg-[#161b27] border border-[#1e2536] rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {rooms.length !== (data?.total ?? 0) && (
          <p className="text-xs text-slate-500">
            {rooms.length} of {data?.total ?? 0} rooms shown
          </p>
        )}

        {/* Grid */}
        {view === 'grid' && (
          <div className="space-y-8">
            {byFloor.map(({ floor, rooms: floorRooms }) => (
              <div key={floor.id}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                    Floor {floor?.name}
                  </p>
                  <div className="flex-1 h-px bg-[#1e2536]" />
                  <p className="text-xs text-slate-600">{floorRooms.length} rooms</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {floorRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onClick={() => router.push(`/rooms/${room.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
            {byFloor.length === 0 && (
              <div className="py-16 text-center">
                <BedDouble size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No rooms match your filters</p>
              </div>
            )}
          </div>
        )}

        {/* List */}
        {view === 'list' && (
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
            <TableScroll>
            <table className="w-full">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  {[
                    'Room',
                    'Type',
                    'Status',
                    'Guest / Staff',
                    'Check-in',
                    'Check-out',
                    'Capacity',
                    'Rate',
                    '',
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
                {rooms.map((room) => (
                  <RoomRow
                    key={room.id}
                    room={room}
                    onClick={() => router.push(`/rooms/${room.id}`)}
                  />
                ))}
              </tbody>
            </table>
            </TableScroll>
            {rooms.length === 0 && (
              <div className="py-16 text-center">
                <BedDouble size={32} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No rooms match your filters</p>
              </div>
            )}
            {/* Pagination — list view only */}
            {view === 'list' && data && rooms.length > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  Page {data.page} of {data.totalPages} · {data.total} rooms
                  {isFetching && <span className="ml-2 text-blue-400">Updating…</span>}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[#1e2536] text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[#1e2536] text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AddRoomModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
