'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, BedDouble, Users, Wifi, Wind, Tv, Coffee,
  UtensilsCrossed, Bath, Eye, ShieldCheck, Pencil, X,
  CalendarCheck, Clock, Wrench, Sparkles, AlertTriangle,
  CheckCircle2, UserCheck, ClipboardList, DollarSign,
  MapPin, ChevronRight, Waves
} from 'lucide-react';
import { rooms, STATUS_CONFIG, TYPE_CONFIG, type RoomStatus } from '@/lib/rooms-data';

// ─── Mock folio / history data ─────────────────────────────────────────────────
const folioItems = [
  { id: 'f1', date: '2026-03-10', description: 'Room charge (1 night)', amount: 380, type: 'charge' },
  { id: 'f2', date: '2026-03-10', description: 'Mini bar — Heineken x2', amount: 12, type: 'charge' },
  { id: 'f3', date: '2026-03-11', description: 'Room Service — Jollof Rice', amount: 28, type: 'charge' },
  { id: 'f4', date: '2026-03-11', description: 'Room charge (1 night)', amount: 380, type: 'charge' },
  { id: 'f5', date: '2026-03-11', description: 'Deposit payment', amount: -400, type: 'payment' },
];

const housekeepingLog = [
  { date: '2026-03-11', time: '09:14', staff: 'Adaeze Okafor', action: 'Full clean + linen change', status: 'Completed' },
  { date: '2026-03-10', time: '09:45', staff: 'Emeka Obi', action: 'Full clean + linen change', status: 'Completed' },
  { date: '2026-03-09', time: '10:02', staff: 'Adaeze Okafor', action: 'Turn-down service', status: 'Completed' },
];

const maintenanceLog = [
  { date: '2026-03-08', description: 'AC filter cleaned', technician: 'Yetunde Aina', status: 'Completed' },
  { date: '2026-02-20', description: 'Showerhead replaced', technician: 'Yetunde Aina', status: 'Completed' },
];

const amenityIcons: Record<string, any> = {
  WiFi: Wifi, AC: Wind, TV: Tv, 'Mini Bar': Coffee,
  Kitchen: UtensilsCrossed, Bathtub: Bath, 'Sea View': Waves,
  Balcony: Eye, Jacuzzi: Waves, Safe: ShieldCheck,
};

const ALL_STATUSES: RoomStatus[] = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'HOUSEKEEPING', 'MAINTENANCE', 'OUT_OF_ORDER'];

// ─── Status change modal ───────────────────────────────────────────────────────
function StatusModal({ current, onClose, onSave }: {
  current: RoomStatus; onClose: () => void; onSave: (s: RoomStatus, note: string) => void;
}) {
  const [selected, setSelected] = useState<RoomStatus>(current);
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Change Room Status</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="space-y-2 mb-4">
          {ALL_STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => setSelected(s)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${selected === s ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {s}
                {selected === s && <CheckCircle2 size={14} className="ml-auto" />}
              </button>
            );
          })}
        </div>
        <div className="mb-4">
          <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Note (optional)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for status change..."
            className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={() => onSave(selected, note)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Update</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab button ────────────────────────────────────────────────────────────────
function Tab({ label, active, icon: Icon, onClick }: { label: string; active: boolean; icon: any; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${active ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
      <Icon size={14} />
      {label}
    </button>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
type ActiveTab = 'overview' | 'folio' | 'housekeeping' | 'maintenance';

export default function RoomDetailPage() {
  const router = useRouter();
  const params = useParams();
  const room = rooms.find(r => r.id === params.id);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [statusModal, setStatusModal] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<RoomStatus>(room?.status ?? 'AVAILABLE');

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <BedDouble size={40} className="text-slate-700" />
        <p className="text-slate-500">Room not found</p>
        <button onClick={() => router.push('/rooms')} className="text-blue-400 text-sm hover:underline">Back to Rooms</button>
      </div>
    );
  }

  const s = STATUS_CONFIG[currentStatus];
  const t = TYPE_CONFIG[room.type];
  const folioTotal = folioItems.reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/rooms')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Room {room.number}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 border ${s.bg} ${s.color} ${s.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {currentStatus}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-2">
              <MapPin size={12} /> Floor {room.floor} · <span className={t.color}>{room.type}</span> · {room.beds}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStatusModal(true)}
            className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all">
            <Pencil size={13} /> Change Status
          </button>
          {currentStatus === 'AVAILABLE' && (
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <CalendarCheck size={14} /> New Booking
            </button>
          )}
          {currentStatus === 'OCCUPIED' && (
            <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <CheckCircle2 size={14} /> Check Out
            </button>
          )}
        </div>
      </div>

      {/* Top info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Base Rate</p>
          <p className="text-2xl font-bold text-white">${room.baseRate}</p>
          <p className="text-xs text-slate-600">per night</p>
        </div>
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Capacity</p>
          <p className="text-2xl font-bold text-white">{room.capacity}</p>
          <p className="text-xs text-slate-600">guests max</p>
        </div>
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Check-in</p>
          <p className="text-lg font-bold text-white">{room.checkIn ?? '—'}</p>
          <p className="text-xs text-slate-600">{room.currentGuest ?? 'Vacant'}</p>
        </div>
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Check-out</p>
          <p className="text-lg font-bold text-white">{room.checkOut ?? '—'}</p>
          <p className="text-xs text-slate-600">{room.checkOut ? `${Math.ceil((new Date(room.checkOut).getTime() - Date.now()) / 86400000)} days left` : '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#161b27] border border-[#1e2536] rounded-xl p-1 w-fit">
        <Tab label="Overview"    active={activeTab === 'overview'}     icon={BedDouble}      onClick={() => setActiveTab('overview')} />
        <Tab label="Folio"       active={activeTab === 'folio'}        icon={DollarSign}     onClick={() => setActiveTab('folio')} />
        <Tab label="Housekeeping" active={activeTab === 'housekeeping'} icon={Sparkles}       onClick={() => setActiveTab('housekeeping')} />
        <Tab label="Maintenance" active={activeTab === 'maintenance'}   icon={Wrench}         onClick={() => setActiveTab('maintenance')} />
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Left col — details */}
          <div className="md:col-span-2 space-y-5">
            {/* Current guest */}
            {room.currentGuest && (
              <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">Current Guest</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-lg font-bold text-white shrink-0">
                    {room.currentGuest.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <button onClick={() => room.guestId && router.push(`/guests/${room.guestId}`)}
                      className="text-base font-bold text-blue-400 hover:text-blue-300 transition-colors">{room.currentGuest}</button>
                    <div className="flex gap-4 mt-1.5">
                      <p className="text-xs text-slate-500 flex items-center gap-1"><CalendarCheck size={11} /> In: {room.checkIn}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1"><Clock size={11} /> Out: {room.checkOut}</p>
                    </div>
                  </div>
                  <button onClick={() => room.guestId && router.push(`/guests/${room.guestId}`)}
                    className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1">
                    View Profile <ChevronRight size={12} />
                  </button>
                </div>
                {room.notes && (
                  <div className="mt-3 pt-3 border-t border-[#1e2536]">
                    <p className="text-xs text-amber-400 flex items-center gap-1.5"><AlertTriangle size={11} /> {room.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Room info */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">Room Details</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { label: 'Room Number', value: room.number },
                  { label: 'Floor', value: `Floor ${room.floor}` },
                  { label: 'Room Type', value: room.type },
                  { label: 'Bed Configuration', value: room.beds },
                  { label: 'Max Capacity', value: `${room.capacity} guests` },
                  { label: 'Base Rate', value: `$${room.baseRate} / night` },
                  { label: 'Last Cleaned', value: room.lastCleaned ?? '—' },
                  { label: 'Housekeeper', value: room.housekeeper ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-600">{label}</p>
                    <p className="text-sm text-slate-200 font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {room.notes && !room.currentGuest && (
                <div className="mt-4 pt-4 border-t border-[#1e2536]">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Notes</p>
                  <p className="text-sm text-amber-400/90 flex items-start gap-2"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{room.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right col — amenities */}
          <div className="space-y-5">
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">Amenities</p>
              <div className="space-y-2">
                {room.amenities.map(a => {
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
            </div>

            {/* Quick actions */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Quick Actions</p>
              <div className="space-y-2">
                {[
                  { label: 'Request Housekeeping', icon: Sparkles, color: 'text-amber-400 hover:bg-amber-500/10' },
                  { label: 'Log Maintenance Issue', icon: Wrench, color: 'text-orange-400 hover:bg-orange-500/10' },
                  { label: 'Assign Housekeeper', icon: UserCheck, color: 'text-blue-400 hover:bg-blue-500/10' },
                  { label: 'View Reservations', icon: ClipboardList, color: 'text-violet-400 hover:bg-violet-500/10' },
                ].map(({ label, icon: Icon, color }) => (
                  <button key={label} className={`w-full flex items-center gap-2.5 text-sm font-medium text-slate-400 ${color} px-3 py-2 rounded-lg transition-colors text-left`}>
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Folio Tab ── */}
      {activeTab === 'folio' && (
        <div className="space-y-4">
          {room.currentGuest ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Current Folio — {room.currentGuest}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{room.checkIn} → {room.checkOut}</p>
                </div>
                <button className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors">+ Add Charge</button>
              </div>
              <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                    <tr>
                      {['Date', 'Description', 'Amount'].map(h => (
                        <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {folioItems.map(f => (
                      <tr key={f.id} className="border-b border-[#1e2536] last:border-0">
                        <td className="px-4 py-3 text-xs text-slate-500">{f.date}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{f.description}</td>
                        <td className={`px-4 py-3 text-sm font-semibold ${f.amount < 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {f.amount < 0 ? `-$${Math.abs(f.amount)}` : `$${f.amount}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 bg-[#0f1117]/40 border-t border-[#1e2536] flex items-center justify-between">
                  <span className="text-sm text-slate-500">Outstanding Balance</span>
                  <span className="text-lg font-bold text-white">${folioTotal}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
              <DollarSign size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No active folio — room is not occupied</p>
            </div>
          )}
        </div>
      )}

      {/* ── Housekeeping Tab ── */}
      {activeTab === 'housekeeping' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Housekeeping Log</p>
            <button className="text-xs bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5">
              <Sparkles size={12} /> Request Cleaning
            </button>
          </div>
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  {['Date', 'Time', 'Staff', 'Action', 'Status'].map(h => (
                    <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {housekeepingLog.map((l, i) => (
                  <tr key={i} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500">{l.date}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{l.time}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{l.staff}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{l.action}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Maintenance Tab ── */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Maintenance History</p>
            <button className="text-xs bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5">
              <Wrench size={12} /> Log Issue
            </button>
          </div>
          {maintenanceLog.length > 0 ? (
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                  <tr>
                    {['Date', 'Description', 'Technician', 'Status'].map(h => (
                      <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {maintenanceLog.map((m, i) => (
                    <tr key={i} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{m.date}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{m.description}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{m.technician}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">{m.status}</span></td>
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

      {/* Status modal */}
      {statusModal && (
        <StatusModal
          current={currentStatus}
          onClose={() => setStatusModal(false)}
          onSave={(s) => { setCurrentStatus(s); setStatusModal(false); }}
        />
      )}
    </div>
  );
}