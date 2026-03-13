'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Star, Phone, Mail, MapPin, CreditCard,
  BedDouble, Calendar, DollarSign, Edit2, Trash2,
  CheckCircle2, Clock, AlertTriangle, FileText, MessageSquare
} from 'lucide-react';

type GuestStatus = 'Checked In' | 'Checked Out' | 'Reserved' | 'Never Stayed';

type Guest = {
  id: string; firstName: string; lastName: string; email: string; phone: string;
  nationality: string; idType: string; idNumber: string; isVip: boolean;
  totalStays: number; totalSpent: number; lastStay: string;
  status: GuestStatus; roomNo?: string; notes?: string;
};

// Same data as list page — replace with API call in production
const guests: Guest[] = [
  { id: 'g1', firstName: 'James', lastName: 'Okafor', email: 'james.okafor@email.com', phone: '+234 801 234 5678', nationality: 'Nigerian', idType: 'Passport', idNumber: 'A12345678', isVip: true, totalStays: 12, totalSpent: 4800, lastStay: '2026-03-10', status: 'Checked In', roomNo: '304', notes: 'Prefers high floor. Allergic to feather pillows.' },
  { id: 'g2', firstName: 'Amara', lastName: 'Diallo', email: 'amara.diallo@email.com', phone: '+221 77 456 7890', nationality: 'Senegalese', idType: 'National ID', idNumber: 'SN98765432', isVip: false, totalStays: 3, totalSpent: 950, lastStay: '2026-03-10', status: 'Checked In', roomNo: '112' },
  { id: 'g3', firstName: 'Chen', lastName: 'Wei', email: 'chen.wei@email.com', phone: '+86 138 0013 8000', nationality: 'Chinese', idType: 'Passport', idNumber: 'E87654321', isVip: true, totalStays: 7, totalSpent: 6200, lastStay: '2026-03-09', status: 'Reserved', roomNo: '215' },
  { id: 'g4', firstName: 'Sofia', lastName: 'Martins', email: 'sofia.martins@email.com', phone: '+55 11 9876 5432', nationality: 'Brazilian', idType: 'Passport', idNumber: 'BR1234567', isVip: true, totalStays: 20, totalSpent: 18400, lastStay: '2026-03-10', status: 'Checked In', roomNo: '401' },
  { id: 'g5', firstName: 'David', lastName: 'Mensah', email: 'david.mensah@email.com', phone: '+233 24 555 6789', nationality: 'Ghanaian', idType: 'National ID', idNumber: 'GH44332211', isVip: false, totalStays: 1, totalSpent: 210, lastStay: '2026-02-14', status: 'Checked Out' },
  { id: 'g6', firstName: 'Yuki', lastName: 'Tanaka', email: 'yuki.tanaka@email.com', phone: '+81 90 1234 5678', nationality: 'Japanese', idType: 'Passport', idNumber: 'TK9988776', isVip: false, totalStays: 5, totalSpent: 1800, lastStay: '2026-03-08', status: 'Checked Out' },
  { id: 'g7', firstName: 'Fatima', lastName: 'Al-Hassan', email: 'fatima.alhassan@email.com', phone: '+966 55 999 8888', nationality: 'Saudi', idType: 'Passport', idNumber: 'SA77665544', isVip: true, totalStays: 9, totalSpent: 9100, lastStay: '2026-03-07', status: 'Checked Out' },
  { id: 'g8', firstName: 'Marcus', lastName: 'Johnson', email: 'marcus.j@email.com', phone: '+1 415 222 3344', nationality: 'American', idType: 'Passport', idNumber: 'US55443322', isVip: false, totalStays: 2, totalSpent: 560, lastStay: '2026-03-05', status: 'Checked Out' },
];

const stayHistory = [
  { id: 'r1', roomNo: '304', type: 'Suite', checkIn: '2026-03-08', checkOut: '2026-03-12', nights: 4, amount: 640, status: 'Active' },
  { id: 'r2', roomNo: '215', type: 'Deluxe', checkIn: '2025-12-22', checkOut: '2025-12-27', nights: 5, amount: 550, status: 'Completed' },
  { id: 'r3', roomNo: '104', type: 'Standard', checkIn: '2025-09-10', checkOut: '2025-09-13', nights: 3, amount: 270, status: 'Completed' },
  { id: 'r4', roomNo: '401', type: 'Presidential', checkIn: '2025-06-01', checkOut: '2025-06-05', nights: 4, amount: 1200, status: 'Completed' },
];

const folioItems = [
  { desc: 'Room Charge (Suite 304)', date: 'Mar 08', amount: 640, type: 'Room' },
  { desc: 'Room Service — Dinner', date: 'Mar 09', amount: 45, type: 'F&B' },
  { desc: 'Bar — Johnnie Walker', date: 'Mar 09', amount: 55, type: 'Bar' },
  { desc: 'Laundry Service', date: 'Mar 10', amount: 18, type: 'Service' },
  { desc: 'Minibar Consumption', date: 'Mar 10', amount: 22, type: 'F&B' },
];

const statusStyle: Record<GuestStatus, string> = {
  'Checked In': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Checked Out': 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  'Reserved': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Never Stayed': 'bg-slate-500/10 text-slate-600 border-slate-500/10',
};

const folioTypeStyle: Record<string, string> = {
  Room: 'bg-blue-500/15 text-blue-400',
  'F&B': 'bg-emerald-500/15 text-emerald-400',
  Bar: 'bg-violet-500/15 text-violet-400',
  Service: 'bg-amber-500/15 text-amber-400',
};

export default function GuestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const guest = guests.find(g => g.id === id) ?? guests[0];
  const folioTotal = folioItems.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6 max-w-full">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/guests')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/40 to-violet-500/40 border border-white/10 flex items-center justify-center text-xl font-bold text-white">
              {guest.firstName[0]}{guest.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{guest.firstName} {guest.lastName}</h1>
                {guest.isVip && (
                  <span className="flex items-center gap-1 bg-amber-500/15 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-1 rounded-full font-semibold">
                    <Star size={10} className="fill-amber-400" /> VIP
                  </span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusStyle[guest.status]}`}>{guest.status}</span>
              </div>
              <p className="text-slate-500 text-sm mt-0.5">Guest ID: {guest.id.toUpperCase()} · {guest.nationality}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-blue-500/40 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Edit2 size={14} /> Edit
          </button>
          <button className="flex items-center gap-2 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-5">
          {/* Contact Info */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">Contact Information</h2>
            <div className="space-y-3">
              {[
                { icon: Phone, label: 'Phone', value: guest.phone },
                { icon: Mail, label: 'Email', value: guest.email },
                { icon: MapPin, label: 'Nationality', value: guest.nationality },
                { icon: CreditCard, label: guest.idType, value: guest.idNumber },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
                    <Icon size={13} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">{label}</p>
                    <p className="text-sm text-slate-300">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">Guest Stats</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Stays', value: guest.totalStays, color: 'text-blue-400' },
                { label: 'Total Spent', value: `$${guest.totalSpent.toLocaleString()}`, color: 'text-emerald-400' },
                { label: 'Avg/Stay', value: `$${Math.round(guest.totalSpent / guest.totalStays)}`, color: 'text-violet-400' },
                { label: 'Last Stay', value: guest.lastStay, color: 'text-slate-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0f1117] border border-[#1e2536] rounded-lg p-3">
                  <p className="text-xs text-slate-600 mb-1">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Current Stay */}
          {guest.roomNo && (
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">Current Stay</h2>
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <BedDouble size={20} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-base font-bold text-white">Room {guest.roomNo}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Check-in: Mar 8 · Check-out: Mar 12</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {guest.notes && (
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3 flex items-center gap-2">
                <MessageSquare size={12} /> Notes & Preferences
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed bg-amber-500/5 border border-amber-500/15 rounded-lg p-3">{guest.notes}</p>
            </div>
          )}
        </div>

        {/* Right column — 2 wide */}
        <div className="xl:col-span-2 space-y-5">
          {/* Current Folio */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e2536] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><FileText size={14} className="text-blue-400" /> Current Folio</h2>
              <span className="text-xs text-slate-500">Active charges</span>
            </div>
            <table className="w-full">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/40">
                <tr>
                  {['Description', 'Date', 'Type', 'Amount'].map(h => (
                    <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-2.5 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {folioItems.map((item, i) => (
                  <tr key={i} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-300">{item.desc}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{item.date}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${folioTypeStyle[item.type]}`}>{item.type}</span></td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-200">${item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-[#0f1117]/40 border-t border-[#1e2536] flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Outstanding</span>
              <span className="text-lg font-bold text-white">${folioTotal}</span>
            </div>
          </div>

          {/* Stay History */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e2536] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Calendar size={14} className="text-violet-400" /> Stay History</h2>
              <span className="text-xs text-slate-500">{stayHistory.length} stays</span>
            </div>
            <div className="divide-y divide-[#1e2536]">
              {stayHistory.map(stay => (
                <div key={stay.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
                      <BedDouble size={15} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Room {stay.roomNo} <span className="text-slate-600 font-normal">· {stay.type}</span></p>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Calendar size={10} /> {stay.checkIn} → {stay.checkOut} · {stay.nights} nights
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${stay.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                      {stay.status === 'Active' ? <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Active</span> : stay.status}
                    </span>
                    <p className="text-sm font-bold text-slate-200">${stay.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'New Reservation', icon: BedDouble, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15' },
              { label: 'Add Folio Charge', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15' },
              { label: 'Check Out', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15' },
            ].map(({ label, icon: Icon, color, bg }) => (
              <button key={label} className={`${bg} border rounded-xl p-4 flex flex-col items-center gap-2 transition-colors`}>
                <Icon size={20} className={color} />
                <span className="text-xs text-slate-300 font-medium text-center">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}