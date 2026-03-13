'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Hotel, Save, Check } from 'lucide-react';

const currencies = ['USD', 'NGN', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];
const timezones = ['Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg', 'Europe/London', 'America/New_York', 'Asia/Dubai'];

export default function HotelProfilePage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: 'Grand Palace Hotel',
    address: '14 Marina Road',
    city: 'Port Harcourt',
    state: 'Rivers State',
    country: 'Nigeria',
    phone: '+234 84 555 0100',
    email: 'info@grandpalacehotel.ng',
    website: 'www.grandpalacehotel.ng',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    checkInTime: '14:00',
    checkOutTime: '12:00',
    taxRate: '7.5',
    description: 'A premier hotel offering world-class hospitality in the heart of Port Harcourt.',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Hotel Profile</h1>
            <p className="text-slate-500 text-sm mt-0.5">Basic hotel information and settings</p>
          </div>
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
          {saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      {/* Hotel identity */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-4">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium flex items-center gap-2"><Hotel size={12} /> Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Hotel Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors resize-none" />
          </div>
          {[
            { label: 'Phone', key: 'phone' },
            { label: 'Email', key: 'email' },
            { label: 'Website', key: 'website' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
              <input value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-4">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium">Location</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Address', key: 'address', col: 2 },
            { label: 'City', key: 'city', col: 1 },
            { label: 'State', key: 'state', col: 1 },
            { label: 'Country', key: 'country', col: 2 },
          ].map(({ label, key, col }) => (
            <div key={key} className={col === 2 ? 'col-span-2' : ''}>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
              <input value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* Operations */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-4">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium">Operations</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Currency</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors">
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Timezone</label>
            <select value={form.timezone} onChange={e => set('timezone', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors">
              {timezones.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Check-in Time</label>
            <input type="time" value={form.checkInTime} onChange={e => set('checkInTime', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Check-out Time</label>
            <input type="time" value={form.checkOutTime} onChange={e => set('checkOutTime', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Tax Rate (%)</label>
            <input type="number" value={form.taxRate} onChange={e => set('taxRate', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}