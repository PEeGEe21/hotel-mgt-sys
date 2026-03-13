'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, Plus, Star, Phone, Mail, MapPin,
  BedDouble, Clock, X, ChevronRight
} from 'lucide-react';

type GuestStatus = 'Checked In' | 'Checked Out' | 'Reserved' | 'Never Stayed';

type Guest = {
  id: string; firstName: string; lastName: string; email: string; phone: string;
  nationality: string; idType: string; idNumber: string; isVip: boolean;
  totalStays: number; totalSpent: number; lastStay: string;
  status: GuestStatus; roomNo?: string; notes?: string;
};

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

export { guests };

const statusStyle: Record<GuestStatus, string> = {
  'Checked In': 'bg-emerald-500/15 text-emerald-400',
  'Checked Out': 'bg-slate-500/15 text-slate-400',
  'Reserved': 'bg-blue-500/15 text-blue-400',
  'Never Stayed': 'bg-slate-500/10 text-slate-600',
};

function AddGuestModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">New Guest</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'First Name', col: 1 }, { label: 'Last Name', col: 1 },
            { label: 'Email', col: 2 }, { label: 'Phone', col: 1 },
            { label: 'Nationality', col: 1 }, { label: 'ID Type', col: 1 }, { label: 'ID Number', col: 1 },
          ].map(({ label, col }) => (
            <div key={label} className={col === 2 ? 'col-span-2' : ''}>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
              <input type="text" placeholder={label} className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Notes</label>
            <textarea rows={2} placeholder="Preferences, allergies, special requests..." className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
          <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Save Guest</button>
        </div>
      </div>
    </div>
  );
}

export default function GuestsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | GuestStatus>('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = guests.filter(g => {
    const matchSearch = `${g.firstName} ${g.lastName} ${g.email} ${g.phone}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || g.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Guests</h1>
          <p className="text-slate-500 text-sm mt-0.5">{guests.length} registered guests</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> New Guest
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Guests', value: guests.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Checked In', value: guests.filter(g => g.status === 'Checked In').length, icon: BedDouble, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Reserved', value: guests.filter(g => g.status === 'Reserved').length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'VIP Guests', value: guests.filter(g => g.isVip).length, icon: Star, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4 flex items-center gap-3`}>
            <Icon size={18} className={color} />
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-56">
          <Search size={14} className="text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or phone..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['All', 'Checked In', 'Reserved', 'Checked Out'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === f ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Guest', 'Contact', 'Nationality', 'Status', 'Stays', 'Total Spent', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(guest => (
              <tr key={guest.id} onClick={() => router.push(`/guests/${guest.id}`)}
                className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {guest.firstName[0]}{guest.lastName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-slate-200">{guest.firstName} {guest.lastName}</p>
                        {guest.isVip && <Star size={11} className="text-amber-400 fill-amber-400" />}
                      </div>
                      {guest.roomNo && <p className="text-xs text-slate-500 flex items-center gap-1"><BedDouble size={10} /> Room {guest.roomNo}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone size={10} className="text-slate-600" />{guest.phone}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5"><Mail size={10} className="text-slate-600" />{guest.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-slate-400 flex items-center gap-1.5"><MapPin size={11} className="text-slate-600" />{guest.nationality}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[guest.status]}`}>{guest.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{guest.totalStays}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-300">${guest.totalSpent.toLocaleString()}</td>
                <td className="px-4 py-3"><ChevronRight size={16} className="text-slate-600" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Users size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No guests found</p>
          </div>
        )}
      </div>

      {showAdd && <AddGuestModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}