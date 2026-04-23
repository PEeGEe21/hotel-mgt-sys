'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  BedDouble,
  Wifi,
  Wind,
  Tv,
  Coffee,
  UtensilsCrossed,
  Bath,
  Eye,
  ShieldCheck,
  Pencil,
  X,
  CalendarCheck,
  Clock,
  Wrench,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  ClipboardList,
  DollarSign,
  MapPin,
  ChevronRight,
  Waves,
  Loader2,
  Users,
  Building2,
  UsersRound,
} from 'lucide-react';
import { STATUS_CONFIG, TYPE_CONFIG, ALL_ROOM_STATUSES, type RoomStatus } from '@/lib/rooms-data';
import { useRoom, useUpdateRoomStatus } from '@/hooks/room/useRooms';
import { useRoomReservations } from '@/hooks/room/useRoomReservations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Types ─────────────────────────────────────────────────────────────────────
type FolioItem = {
  id: string;
  description: string;
  amount: number;
  quantity: number;
  category: string;
  createdAt: string;
};
type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  isVip: boolean;
};
type ResGuest = {
  id: string;
  role: 'PRIMARY' | 'ADDITIONAL' | 'CHILD';
  addedAt: string;
  guest: Guest;
};
type Company = { id: string; name: string; email?: string; contactName?: string };
type GroupBooking = { id: string; groupNo: string; name: string };
type Reservation = {
  id: string;
  reservationNo: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status: string;
  bookingType: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  specialRequests?: string;
  notes?: string;
  guest: Guest; // primary guest
  guests: ResGuest[]; // all guests including primary
  company?: Company | null;
  groupBooking?: GroupBooking | null;
  folioItems: FolioItem[];
};
type HKTask = {
  id: string;
  type: string;
  status: string;
  priority: string;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  staff?: { firstName: string; lastName: string };
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const amenityIcons: Record<string, any> = {
  WiFi: Wifi,
  AC: Wind,
  TV: Tv,
  'Mini Bar': Coffee,
  Kitchen: UtensilsCrossed,
  Bathtub: Bath,
  'Sea View': Waves,
  Balcony: Eye,
  Jacuzzi: Waves,
  Safe: ShieldCheck,
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
function fmtMoney(n: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}
function nightsLeft(checkOut: string) {
  const diff = Math.ceil((new Date(checkOut).getTime() - Date.now()) / 86_400_000);
  return diff > 0 ? `${diff} night${diff !== 1 ? 's' : ''} left` : 'Checking out today';
}
const resStatusClass: Record<string, string> = {
  CONFIRMED: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  CHECKED_IN: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  CHECKED_OUT: 'bg-slate-500/15 text-slate-400 border border-slate-500/25',
  PENDING: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  CANCELLED: 'bg-rose-500/15 text-rose-400 border border-rose-500/25',
  NO_SHOW: 'bg-orange-500/15 text-orange-400 border border-orange-500/25',
};

// ─── Status Modal ──────────────────────────────────────────────────────────────
function StatusModal({
  current,
  onClose,
  onSave,
  saving,
}: {
  current: RoomStatus;
  onClose: () => void;
  onSave: (s: RoomStatus) => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<RoomStatus>(current);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Change Room Status</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2 mb-5">
          {ALL_ROOM_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setSelected(s)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${selected === s ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
                {selected === s && <CheckCircle2 size={14} className="ml-auto" />}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Update
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab ───────────────────────────────────────────────────────────────────────
function Tab({
  label,
  active,
  icon: Icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${active ? 'bg-blue-600/20 text-blue-400 border-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
type ActiveTab = 'overview' | 'folio' | 'housekeeping' | 'maintenance';

export default function RoomDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: room, isLoading, isError } = useRoom(id);
  const [resPage, setResPage] = useState(1);
  const resLimit = 6;
  const { data: resPageData, isLoading: resLoading } = useRoomReservations(id, {
    page: resPage,
    limit: resLimit,
  });
  const updateStatus = useUpdateRoomStatus(id);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [statusModal, setStatusModal] = useState(false);

  // ── Loading / error ──
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-slate-500" />
      </div>
    );
  if (isError || !room)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <BedDouble size={40} className="text-slate-700" />
        <p className="text-slate-500">Room not found</p>
        <button onClick={() => router.back()} className="text-blue-400 text-sm hover:underline">
          Back to Rooms
        </button>
      </div>
    );

  const s = STATUS_CONFIG[room.status as RoomStatus];
  const t = TYPE_CONFIG[room.type as keyof typeof TYPE_CONFIG];
  const activeRes = (room as any).reservations?.[0] as Reservation | undefined;
  const guest = activeRes?.guest; // primary guest
  const allGuests = activeRes?.guests ?? ([] as ResGuest[]); // everyone in the room
  const company = activeRes?.company;
  const groupBooking = activeRes?.groupBooking;
  const folioItems = activeRes?.folioItems ?? [];
  const hkTasks = ((room as any).housekeepingTasks ?? []) as HKTask[];
  const resTotalPages = resPageData?.totalPages ?? 1;
  const maintenance = hkTasks.filter((t) => t.type === 'MAINTENANCE');
  const cleaning = hkTasks.filter((t) => t.type !== 'MAINTENANCE');

  const folioBalance = folioItems.reduce((sum, f) => sum + Number(f.amount), 0);

  const handleStatusSave = async (status: RoomStatus) => {
    await updateStatus.mutateAsync(status);
    setStatusModal(false);
  };

  return (
    <>
      <div className="max-w-full flex w-full gap-4 flex-wrap">
        <div className="space-y-6 flex-[7]">
          {/* Back + header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    Room {room.number}
                  </h1>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 border ${s?.bg} ${s?.color} ${s?.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${s?.dot}`} />
                    {s?.label}
                  </span>
                  {guest?.isVip && (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                      VIP
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-2">
                  <MapPin size={12} />
                  {(room as any).floor?.name ?? '—'} · <span className={t?.color}>{room.type}</span>{' '}
                  · {room.maxGuests} guests max
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusModal(true)}
                className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Pencil size={13} /> Change Status
              </button>
              {room.status === 'AVAILABLE' && (
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  <CalendarCheck size={14} /> New Booking
                </button>
              )}
              {room.status === 'OCCUPIED' && (
                <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  <CheckCircle2 size={14} /> Check Out
                </button>
              )}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Base Rate</p>
              <p className="text-xl font-bold text-white">{fmtMoney(Number(room.baseRate))}</p>
              <p className="text-xs text-slate-600">per night</p>
            </div>
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capacity</p>
              <p className="text-xl font-bold text-white flex items-center gap-1.5">
                <Users size={16} className="text-slate-500" />
                {room.maxGuests}
              </p>
              <p className="text-xs text-slate-600">guests max</p>
            </div>
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Check-in</p>
              <p className="text-base font-bold text-white">
                {activeRes ? fmt(activeRes.checkIn) : '—'}
              </p>
              <p className="text-xs text-slate-600 truncate">
                {allGuests.length > 1
                  ? `${guest?.firstName} ${guest?.lastName} +${allGuests.length - 1}`
                  : guest
                    ? `${guest.firstName} ${guest.lastName}`
                    : 'Vacant'}
              </p>
            </div>
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Check-out</p>
              <p className="text-base font-bold text-white">
                {activeRes ? fmt(activeRes.checkOut) : '—'}
              </p>
              <p className="text-xs text-slate-600">
                {activeRes ? nightsLeft(activeRes.checkOut) : '—'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#161b27] border border-[#1e2536] rounded-xl p-1 w-fit overflow-x-auto">
            <Tab
              label="Overview"
              active={activeTab === 'overview'}
              icon={BedDouble}
              onClick={() => setActiveTab('overview')}
            />
            <Tab
              label="Folio"
              active={activeTab === 'folio'}
              icon={DollarSign}
              onClick={() => setActiveTab('folio')}
            />
            <Tab
              label="Housekeeping"
              active={activeTab === 'housekeeping'}
              icon={Sparkles}
              onClick={() => setActiveTab('housekeeping')}
            />
            <Tab
              label="Maintenance"
              active={activeTab === 'maintenance'}
              icon={Wrench}
              onClick={() => setActiveTab('maintenance')}
            />
          </div>

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-5">
                {/* Active reservation / guest */}
                {activeRes && guest ? (
                  <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                        {activeRes.bookingType === 'COMPANY'
                          ? 'Company Booking'
                          : activeRes.bookingType === 'GROUP'
                            ? 'Group Booking'
                            : activeRes.bookingType === 'FAMILY'
                              ? 'Family Stay'
                              : allGuests.length > 1
                                ? 'Guests'
                                : 'Current Guest'}
                      </p>
                      <div className="flex items-center gap-2">
                        {company && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Building2 size={10} /> {company.name}
                          </span>
                        )}
                        {groupBooking && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            <UsersRound size={10} /> {groupBooking.groupNo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* All guests list */}
                    <div className="space-y-3">
                      {allGuests.length > 0 ? (
                        allGuests.map((rg) => (
                          <div key={rg.id} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                              {rg.guest.firstName[0]}
                              {rg.guest.lastName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white">
                                  {rg.guest.firstName} {rg.guest.lastName}
                                </p>
                                {rg.role === 'PRIMARY' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                                    Primary
                                  </span>
                                )}
                                {rg.role === 'CHILD' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                                    Child
                                  </span>
                                )}
                                {rg.guest.isVip && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    VIP
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">{rg.guest.phone}</p>
                            </div>
                            <button
                              onClick={() => router.push(`/guests/${rg.guest.id}`)}
                              className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        /* fallback to primary guest if ReservationGuest not populated */
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {guest.firstName[0]}
                            {guest.lastName[0]}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white">
                              {guest.firstName} {guest.lastName}
                            </p>
                            <p className="text-xs text-slate-600">{guest.phone}</p>
                          </div>
                          <button
                            onClick={() => router.push(`/guests/${guest.id}`)}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Check-in / out strip */}
                    <div className="flex gap-4 mt-3 pt-3 border-t border-[#1e2536]">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <CalendarCheck size={11} /> {fmt(activeRes.checkIn)}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock size={11} /> {fmt(activeRes.checkOut)}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Users size={11} /> {activeRes.adults} adult
                        {activeRes.adults !== 1 ? 's' : ''}
                        {activeRes.children > 0
                          ? `, ${activeRes.children} child${activeRes.children !== 1 ? 'ren' : ''}`
                          : ''}
                      </p>
                    </div>

                    {/* Company billing contact */}
                    {company?.contactName && (
                      <div className="mt-2 pt-2 border-t border-[#1e2536]">
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Building2 size={11} /> Billing contact: {company.contactName}
                          {company.email && (
                            <span className="text-slate-600">· {company.email}</span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Group name */}
                    {groupBooking && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <UsersRound size={11} /> Group: {groupBooking.name}
                        </p>
                      </div>
                    )}

                    {/* Special requests + notes */}
                    {activeRes.specialRequests && (
                      <div className="mt-2">
                        <p className="text-xs text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle size={11} /> {activeRes.specialRequests}
                        </p>
                      </div>
                    )}
                    {activeRes.notes && (
                      <div className="mt-1">
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <ClipboardList size={11} /> {activeRes.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
                      <BedDouble size={20} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-400">No active guest</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Room is {s?.label.toLowerCase()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Room details */}
                <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
                    Room Details
                  </p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    {[
                      { label: 'Room Number', value: room.number },
                      { label: 'Floor / Area', value: (room as any).floor?.name ?? '—' },
                      { label: 'Type', value: room.type },
                      { label: 'Max Guests', value: `${room.maxGuests} guests` },
                      { label: 'Base Rate', value: fmtMoney(Number(room.baseRate)) },
                      { label: 'Reservation', value: activeRes?.reservationNo ?? '—' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-slate-600">{label}</p>
                        <p className="text-sm text-slate-200 font-medium mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  {room.description && (
                    <div className="mt-4 pt-4 border-t border-[#1e2536]">
                      <p className="text-xs text-slate-600 mb-1">Description</p>
                      <p className="text-sm text-slate-400">{room.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right — amenities + actions */}
              <div className="space-y-5">
                <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
                    Amenities
                  </p>
                  {room.amenities.length > 0 ? (
                    <div className="space-y-2">
                      {room.amenities.map((a: string) => {
                        const Icon = amenityIcons[a] ?? CheckCircle2;
                        return (
                          <div key={a} className="flex items-center gap-2.5 text-sm text-slate-300">
                            <div className="w-7 h-7 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
                              <Icon size={13} className="text-slate-500" />
                            </div>
                            {a}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">No amenities listed</p>
                  )}
                </div>

                <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
                    Quick Actions
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        label: 'Request Housekeeping',
                        icon: Sparkles,
                        color: 'text-amber-400  hover:bg-amber-500/10',
                      },
                      {
                        label: 'Log Maintenance Issue',
                        icon: Wrench,
                        color: 'text-orange-400 hover:bg-orange-500/10',
                      },
                      {
                        label: 'Assign Housekeeper',
                        icon: UserCheck,
                        color: 'text-blue-400   hover:bg-blue-500/10',
                      },
                      {
                        label: 'View Reservations',
                        icon: ClipboardList,
                        color: 'text-violet-400 hover:bg-violet-500/10',
                      },
                    ].map(({ label, icon: Icon, color }) => (
                      <button
                        key={label}
                        className={`w-full flex items-center gap-2.5 text-sm font-medium text-slate-400 ${color} px-3 py-2 rounded-lg transition-colors text-left`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Folio ── */}
          {activeTab === 'folio' && (
            <div className="space-y-4">
              {activeRes && guest ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-2">
                        Active Folio
                        {company ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-normal">
                            <Building2 size={10} /> {company.name}
                          </span>
                        ) : (
                          <span className="font-normal text-slate-400">
                            — {guest.firstName} {guest.lastName}
                          </span>
                        )}
                        {guest.isVip && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            VIP
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activeRes.reservationNo} · {fmt(activeRes.checkIn)} →{' '}
                        {fmt(activeRes.checkOut)}
                      </p>
                    </div>
                    <button className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors">
                      + Add Charge
                    </button>
                  </div>

                  {folioItems.length > 0 ? (
                    <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                          <tr>
                            {['Date', 'Description', 'Category', 'Amount'].map((h) => (
                              <th
                                key={h}
                                className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2536]">
                          {folioItems.map((f) => (
                            <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                                {fmt(f.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-300">{f.description}</td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 uppercase tracking-wider">
                                  {f.category}
                                </span>
                              </td>
                              <td
                                className={`px-4 py-3 text-sm font-semibold ${Number(f.amount) < 0 ? 'text-emerald-400' : 'text-slate-200'}`}
                              >
                                {fmtMoney(Math.abs(Number(f.amount)))}
                                {Number(f.amount) < 0 && (
                                  <span className="text-xs font-normal text-slate-500 ml-1">
                                    (payment)
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-5 py-3 bg-[#0f1117]/40 border-t border-[#1e2536] flex items-center justify-between">
                        <div>
                          <span className="text-sm text-slate-500">Outstanding Balance</span>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Total: {fmtMoney(activeRes.totalAmount)} · Paid:{' '}
                            {fmtMoney(activeRes.paidAmount)}
                          </p>
                        </div>
                        <span
                          className={`text-xl font-bold ${folioBalance > 0 ? 'text-white' : 'text-emerald-400'}`}
                        >
                          {fmtMoney(folioBalance)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
                      <DollarSign size={28} className="text-slate-700 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">No charges yet on this folio</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-16 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
                  <DollarSign size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No active folio — room is not occupied</p>
                </div>
              )}
            </div>
          )}

          {/* ── Housekeeping ── */}
          {activeTab === 'housekeeping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Housekeeping Log</p>
                <button className="text-xs bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5">
                  <Sparkles size={12} /> Request Cleaning
                </button>
              </div>
              {cleaning.length > 0 ? (
                <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                      <tr>
                        {['Date', 'Type', 'Staff', 'Status', 'Priority'].map((h) => (
                          <th
                            key={h}
                            className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2536]">
                      {cleaning.map((t) => (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {fmt(t.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300 capitalize">
                            {t.type.toLowerCase().replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400">
                            {t.staff ? (
                              `${t.staff.firstName} ${t.staff.lastName}`
                            ) : (
                              <span className="text-slate-600">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                                t.status === 'DONE'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : t.status === 'IN_PROGRESS'
                                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                    : t.status === 'SKIPPED'
                                      ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {t.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium ${
                                t.priority === 'URGENT'
                                  ? 'text-red-400'
                                  : t.priority === 'HIGH'
                                    ? 'text-orange-400'
                                    : t.priority === 'LOW'
                                      ? 'text-slate-600'
                                      : 'text-slate-500'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
                  <Sparkles size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No housekeeping tasks for this room</p>
                </div>
              )}
            </div>
          )}

          {/* ── Maintenance ── */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Maintenance History</p>
                <button className="text-xs bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5">
                  <Wrench size={12} /> Log Issue
                </button>
              </div>
              {maintenance.length > 0 ? (
                <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                      <tr>
                        {['Date', 'Description', 'Assigned To', 'Status'].map((h) => (
                          <th
                            key={h}
                            className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2536]">
                      {maintenance.map((t) => (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {fmt(t.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {t.notes ?? 'No description'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400">
                            {t.staff ? (
                              `${t.staff.firstName} ${t.staff.lastName}`
                            ) : (
                              <span className="text-slate-600">Unassigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                                t.status === 'DONE'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : t.status === 'IN_PROGRESS'
                                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                    : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                              }`}
                            >
                              {t.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
                  <Wrench size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No maintenance records for this room</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex-[5]">
          {/* Room bookings */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                Room Bookings
              </p>
              <span className="text-xs text-slate-600">{resPageData?.total ?? 0} total</span>
            </div>
            {resLoading ? (
              <div className="py-8 text-center text-slate-500 text-sm">Loading bookings…</div>
            ) : resPageData?.reservations?.length ? (
              <div className="space-y-3">
                {resPageData.reservations.map((r) => {
                  const companyName = r.company?.name ?? r.groupBooking?.name;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg border border-[#1e2536] bg-[#0f1117]/60"
                    >
                      <div>
                        <p className="text-sm text-slate-200 font-medium">
                          {r.guest.firstName} {r.guest.lastName}
                          {r.guest.isVip && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              VIP
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {r.reservationNo} · {fmt(r.checkIn)} → {fmt(r.checkOut)}
                          {companyName && (
                            <span className="ml-2 text-slate-600">· {companyName}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${resStatusClass[r.status] ?? 'bg-slate-500/15 text-slate-400 border border-slate-500/25'}`}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                        <p className="text-sm text-slate-200 font-semibold mt-1">
                          {fmtMoney(Number(r.totalAmount))}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-600">
                    Page {resPage} of {resTotalPages}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setResPage((p) => Math.max(1, p - 1))}
                      disabled={resPage <= 1}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-slate-200 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setResPage((p) => Math.min(resTotalPages, p + 1))}
                      disabled={resPage >= resTotalPages}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-slate-200 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-sm">
                No bookings yet for this room
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status modal */}
      {statusModal && (
        <StatusModal
          current={room.status as RoomStatus}
          onClose={() => setStatusModal(false)}
          onSave={handleStatusSave}
          saving={updateStatus.isPending}
        />
      )}
    </>
  );
}
