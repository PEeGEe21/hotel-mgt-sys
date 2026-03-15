'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, CalendarCheck, BedDouble, Users, DollarSign,
  Pencil, X, Check, CheckCircle2, XCircle, LogIn, LogOut,
  AlertCircle, Clock, MapPin, Globe, FileText, Plus,
  ChevronRight, Loader2, AlertTriangle, MessageSquare
} from 'lucide-react';
import {
  reservations,
  STATUS_CONFIG, SOURCE_COLORS,
  type ReservationStatus, type Reservation
} from '@/lib/reservations-data';

// ─── Mock folio for detail ─────────────────────────────────────────────────────
const mockFolio = [
  { id: 'f1', date: '2026-03-10', description: 'Room charge (1 night)', amount: 380, category: 'Room' },
  { id: 'f2', date: '2026-03-10', description: 'Mini bar — drinks', amount: 22, category: 'F&B' },
  { id: 'f3', date: '2026-03-11', description: 'Room Service — Breakfast', amount: 35, category: 'F&B' },
  { id: 'f4', date: '2026-03-11', description: 'Room charge (1 night)', amount: 380, category: 'Room' },
  { id: 'f5', date: '2026-03-11', description: 'Laundry service', amount: 18, category: 'Service' },
  { id: 'f6', date: '2026-03-11', description: 'Deposit payment', amount: -760, category: 'Payment' },
];

const mockTimeline = [
  { date: '2026-03-05 14:22', event: 'Reservation created', user: 'Chidi Nwosu', icon: CalendarCheck, color: 'text-blue-400' },
  { date: '2026-03-06 09:10', event: 'Reservation confirmed', user: 'System', icon: CheckCircle2, color: 'text-emerald-400' },
  { date: '2026-03-10 14:05', event: 'Guest checked in — Room 304', user: 'Ngozi Eze', icon: LogIn, color: 'text-violet-400' },
  { date: '2026-03-11 22:10', event: 'Room service charge added ($35)', user: 'POS', icon: DollarSign, color: 'text-amber-400' },
];

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ReservationStatus }) {
  const s = STATUS_CONFIG[status];
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit border ${s.bg} ${s.color} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />{status}
    </span>
  );
}

// ─── Status action modal ───────────────────────────────────────────────────────
function StatusModal({ current, onClose, onSave }: {
  current: ReservationStatus; onClose: () => void; onSave: (s: ReservationStatus) => void;
}) {
  const [selected, setSelected] = useState<ReservationStatus>(current);
  const [loading, setLoading] = useState(false);
  const all: ReservationStatus[] = ['PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','NO_SHOW'];

  const handleSave = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    setLoading(false);
    onSave(selected);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Update Status</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="space-y-2 mb-5">
          {all.map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => setSelected(s)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${selected === s ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {STATUS_CONFIG[s].label}
                {selected === s && <CheckCircle2 size={14} className="ml-auto" />}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Update
          </button>
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
      <Icon size={14} />{label}
    </button>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
type ActiveTab = 'overview' | 'folio' | 'timeline';

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reservation = reservations.find(r => r.id === params.id);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [statusModal, setStatusModal] = useState(false);
  const [status, setStatus] = useState<ReservationStatus>(reservation?.status ?? 'PENDING');

  if (!reservation) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CalendarCheck size={40} className="text-slate-700" />
        <p className="text-slate-500">Reservation not found</p>
        <button onClick={() => router.push('/reservations')} className="text-blue-400 text-sm hover:underline">Back to Reservations</button>
      </div>
    );
  }

  const s = STATUS_CONFIG[status];
  const balance = reservation.totalAmount - reservation.amountPaid;
  const folioTotal = mockFolio.reduce((sum, f) => sum + f.amount, 0);
  const folioPending = mockFolio.filter(f => f.amount > 0).reduce((s, f) => s + f.amount, 0);

  // Contextual action buttons
  const actionButton = () => {
    if (status === 'CONFIRMED' || status === 'PENDING') return (
      <button onClick={() => setStatus('CHECKED_IN')}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
        <LogIn size={14} /> Check In
      </button>
    );
    if (status === 'CHECKED_IN') return (
      <button onClick={() => setStatus('CHECKED_OUT')}
        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
        <LogOut size={14} /> Check Out
      </button>
    );
    return null;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/reservations')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">{reservation.guestName}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-slate-600">{reservation.id}</span>
              <span>·</span>
              <MapPin size={12} /> Room {reservation.roomNumber}
              <span>·</span>
              <span className={SOURCE_COLORS[reservation.source] ?? 'text-slate-400'}>{reservation.source}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setStatusModal(true)}
            className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all">
            <Pencil size={13} /> Status
          </button>
          {actionButton()}
        </div>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Check-in',  value: reservation.checkIn,  sub: 'Arrival date' },
          { label: 'Check-out', value: reservation.checkOut, sub: `${reservation.nights} nights` },
          { label: 'Total',     value: `$${reservation.totalAmount.toLocaleString()}`, sub: balance > 0 ? `Owes $${balance}` : 'Fully paid' },
          { label: 'Guests',    value: `${reservation.adults + reservation.children}`, sub: `${reservation.adults} adults${reservation.children ? ` + ${reservation.children} children` : ''}` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className={`text-xs mt-0.5 ${label === 'Total' && balance > 0 ? 'text-red-400' : 'text-slate-600'}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#161b27] border border-[#1e2536] rounded-xl p-1 w-fit">
        <Tab label="Overview" active={activeTab === 'overview'} icon={CalendarCheck} onClick={() => setActiveTab('overview')} />
        <Tab label="Folio"    active={activeTab === 'folio'}    icon={DollarSign}    onClick={() => setActiveTab('folio')} />
        <Tab label="Timeline" active={activeTab === 'timeline'} icon={Clock}         onClick={() => setActiveTab('timeline')} />
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-5">
            {/* Guest details */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">Guest Information</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-lg font-bold text-white shrink-0">
                  {reservation.guestName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <button onClick={() => router.push(`/guests/${reservation.guestId}`)}
                    className="text-base font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                    {reservation.guestName} <ChevronRight size={14} />
                  </button>
                  <p className="text-xs text-slate-500">Guest ID: {reservation.guestId}</p>
                </div>
              </div>
            </div>

            {/* Booking details */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">Booking Details</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { label: 'Reservation ID', value: reservation.id },
                  { label: 'Booking Source', value: reservation.source },
                  { label: 'Room Number',    value: `Room ${reservation.roomNumber}` },
                  { label: 'Room Type',      value: reservation.roomType },
                  { label: 'Check-in',       value: reservation.checkIn },
                  { label: 'Check-out',      value: reservation.checkOut },
                  { label: 'Duration',       value: `${reservation.nights} nights` },
                  { label: 'Adults',         value: String(reservation.adults) },
                  { label: 'Children',       value: String(reservation.children) },
                  { label: 'Rate / Night',   value: `$${reservation.ratePerNight}` },
                  { label: 'Total',          value: `$${reservation.totalAmount.toLocaleString()}` },
                  { label: 'Paid',           value: `$${reservation.amountPaid.toLocaleString()}` },
                  { label: 'Balance Due',    value: balance > 0 ? `$${balance}` : 'Settled' },
                  { label: 'Created',        value: reservation.createdAt },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-600">{label}</p>
                    <p className="text-sm text-slate-200 font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {reservation.notes && (
                <div className="mt-4 pt-4 border-t border-[#1e2536] flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-400/90">{reservation.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-5">
            {/* Payment summary */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">Payment</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Total charged</span>
                  <span className="text-sm font-semibold text-slate-200">${reservation.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Amount paid</span>
                  <span className="text-sm font-semibold text-emerald-400">${reservation.amountPaid.toLocaleString()}</span>
                </div>
                <div className="h-px bg-[#1e2536]" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Balance due</span>
                  <span className={`text-base font-bold ${balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {balance > 0 ? `$${balance}` : 'Paid ✓'}
                  </span>
                </div>
              </div>
              {balance > 0 && (
                <button className="mt-4 w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 rounded-lg py-2 text-sm font-semibold transition-colors">
                  + Record Payment
                </button>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">Actions</p>
              <div className="space-y-2">
                {[
                  { label: 'View Room',       icon: BedDouble,     color: 'text-blue-400 hover:bg-blue-500/10',    action: () => router.push(`/rooms/${reservation.roomId}`) },
                  { label: 'View Guest',      icon: Users,         color: 'text-violet-400 hover:bg-violet-500/10', action: () => router.push(`/guests/${reservation.guestId}`) },
                  { label: 'Print Folio',     icon: FileText,      color: 'text-slate-400 hover:bg-white/5',        action: () => {} },
                  { label: 'Send Confirmation', icon: MessageSquare, color: 'text-slate-400 hover:bg-white/5',       action: () => {} },
                  { label: 'Cancel Booking',  icon: XCircle,       color: 'text-red-400 hover:bg-red-500/10',       action: () => setStatus('CANCELLED') },
                ].map(({ label, icon: Icon, color, action }) => (
                  <button key={label} onClick={action}
                    className={`w-full flex items-center gap-2.5 text-sm font-medium text-slate-400 ${color} px-3 py-2 rounded-lg transition-colors text-left`}>
                    <Icon size={14} />{label}
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Guest Folio — {reservation.guestName}</p>
              <p className="text-xs text-slate-500 mt-0.5">Room {reservation.roomNumber} · {reservation.checkIn} → {reservation.checkOut}</p>
            </div>
            <button className="flex items-center gap-1.5 text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors">
              <Plus size={12} /> Add Charge
            </button>
          </div>
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  {['Date','Description','Category','Amount'].map(h => (
                    <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockFolio.map(f => (
                  <tr key={f.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{f.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{f.description}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-[#0f1117] border border-[#1e2536] text-slate-400 px-2 py-0.5 rounded-md">{f.category}</span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold ${f.amount < 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {f.amount < 0 ? `-$${Math.abs(f.amount)}` : `$${f.amount}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-[#0f1117]/40 border-t border-[#1e2536] flex items-center justify-between">
              <div className="flex gap-6 text-xs text-slate-500">
                <span>Charges: <span className="text-slate-300 font-semibold">${folioPending}</span></span>
                <span>Paid: <span className="text-emerald-400 font-semibold">${reservation.amountPaid}</span></span>
              </div>
              <div>
                <span className="text-xs text-slate-500 mr-3">Balance</span>
                <span className={`text-lg font-bold ${folioTotal > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {folioTotal > 0 ? `$${folioTotal}` : 'Settled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Timeline Tab ── */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-white">Activity Timeline</p>
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-3.5 top-4 bottom-4 w-px bg-[#1e2536]" />
              <div className="space-y-6">
                {mockTimeline.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-4 relative">
                      <div className={`w-7 h-7 rounded-full bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0 z-10`}>
                        <Icon size={12} className={item.color} />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm text-slate-200 font-medium">{item.event}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{item.date}</span>
                          <span>·</span>
                          <span>{item.user}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {statusModal && (
        <StatusModal current={status} onClose={() => setStatusModal(false)} onSave={(s) => { setStatus(s); setStatusModal(false); }} />
      )}
    </div>
  );
}