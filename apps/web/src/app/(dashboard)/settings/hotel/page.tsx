'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Hotel, Save, Check, MapPin, ShieldCheck } from 'lucide-react';
import { useHotelProfile, useUpdateHotelProfile } from '@/hooks/useHotelProfile';
import dynamic from 'next/dynamic';

const GeofenceMap = dynamic(() => import('@/components/GeofenceMap'), { ssr: false });

const currencies = ['USD', 'NGN', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];
const timezones = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Europe/London',
  'America/New_York',
  'Asia/Dubai',
];

export default function HotelProfilePage() {
  const router = useRouter();
  const { data, isLoading } = useHotelProfile();
  const updateHotel = useUpdateHotelProfile();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    taxRate: '0',
    description: '',
    latitude: '',
    longitude: '',
    geofenceEnabled: false,
    geofenceRadiusMeters: '150',
    attendancePinRequired: false,
    attendanceKioskEnabled: true,
    attendancePersonalEnabled: true,
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!data) return;
    setForm((f) => ({
      ...f,
      name: data.name ?? '',
      address: data.address ?? '',
      city: data.city ?? '',
      state: data.state ?? '',
      country: data.country ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      website: data.website ?? '',
      currency: data.currency ?? 'NGN',
      timezone: data.timezone ?? 'Africa/Lagos',
      taxRate: data.taxRate != null ? String(data.taxRate) : '0',
      description: data.description ?? '',
      latitude: data.latitude != null ? String(data.latitude) : '',
      longitude: data.longitude != null ? String(data.longitude) : '',
      geofenceEnabled: Boolean(data.geofenceEnabled),
      geofenceRadiusMeters:
        data.geofenceRadiusMeters != null ? String(data.geofenceRadiusMeters) : '150',
      attendancePinRequired: Boolean(data.attendancePinRequired),
      attendanceKioskEnabled: Boolean(data.attendanceKioskEnabled ?? true),
      attendancePersonalEnabled: Boolean(data.attendancePersonalEnabled ?? true),
    }));
  }, [data]);

  const handleSave = async () => {
    const payload = {
      name: form.name,
      address: form.address,
      city: form.city,
      state: form.state || null,
      country: form.country,
      phone: form.phone,
      email: form.email,
      website: form.website || null,
      currency: form.currency,
      timezone: form.timezone,
      taxRate: Number(form.taxRate || 0),
      description: form.description || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      geofenceEnabled: form.geofenceEnabled,
      geofenceRadiusMeters: Number(form.geofenceRadiusMeters || 0),
      attendancePinRequired: form.attendancePinRequired,
      attendanceKioskEnabled: form.attendanceKioskEnabled,
      attendancePersonalEnabled: form.attendancePersonalEnabled,
    };
    try {
      await updateHotel.mutateAsync(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // handled by toast
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('latitude', String(pos.coords.latitude));
        set('longitude', String(pos.coords.longitude));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Hotel Profile</h1>
            <p className="text-slate-500 text-sm mt-0.5">Basic hotel information and settings</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isLoading || updateHotel.isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
          } ${isLoading || updateHotel.isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {saved ? (
            <>
              <Check size={14} /> Saved!
            </>
          ) : (
            <>
              <Save size={14} /> Save Changes
            </>
          )}
        </button>
      </div>

      {/* Hotel identity */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-4">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium flex items-center gap-2">
          <Hotel size={12} /> Identity
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Hotel Name
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>
          {[
            { label: 'Phone', key: 'phone' },
            { label: 'Email', key: 'email' },
            { label: 'Website', key: 'website' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                {label}
              </label>
              <input
                value={(form as any)[key]}
                onChange={(e) => set(key, e.target.value)}
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
              />
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
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                {label}
              </label>
              <input
                value={(form as any)[key]}
                onChange={(e) => set(key, e.target.value)}
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Security */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-4">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium flex items-center gap-2">
          <ShieldCheck size={12} /> Attendance Security
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex items-center justify-between bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5">
            <div>
              <p className="text-sm text-slate-200">Enable kiosk clock</p>
              <p className="text-xs text-slate-500">Allow shared devices to clock staff in/out</p>
            </div>
            <button
              onClick={() => set('attendanceKioskEnabled', !form.attendanceKioskEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                form.attendanceKioskEnabled ? 'bg-emerald-500/80' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
                  form.attendanceKioskEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="col-span-2 flex items-center justify-between bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5">
            <div>
              <p className="text-sm text-slate-200">Enable personal clock</p>
              <p className="text-xs text-slate-500">Allow staff to clock in from their login</p>
            </div>
            <button
              onClick={() => set('attendancePersonalEnabled', !form.attendancePersonalEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                form.attendancePersonalEnabled ? 'bg-emerald-500/80' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
                  form.attendancePersonalEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="col-span-2 flex items-center justify-between bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5">
            <div>
              <p className="text-sm text-slate-200">Require PIN for clock-in/out</p>
              <p className="text-xs text-slate-500">Adds a PIN prompt on the staff clock screen</p>
            </div>
            <button
              onClick={() => set('attendancePinRequired', !form.attendancePinRequired)}
              className={`w-12 h-6 rounded-full transition-colors ${
                form.attendancePinRequired ? 'bg-emerald-500/80' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
                  form.attendancePinRequired ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="col-span-2 flex items-center justify-between bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5">
            <div>
              <p className="text-sm text-slate-200">Enable location lock</p>
              <p className="text-xs text-slate-500">Only allow clock-in near the hotel</p>
            </div>
            <button
              onClick={() => set('geofenceEnabled', !form.geofenceEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                form.geofenceEnabled ? 'bg-emerald-500/80' : 'bg-slate-700'
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
                  form.geofenceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Hotel Latitude
            </label>
            <input
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              placeholder="e.g. 4.8156"
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Hotel Longitude
            </label>
            <input
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              placeholder="e.g. 7.0498"
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Allowed Radius (meters)
            </label>
            <input
              value={form.geofenceRadiusMeters}
              onChange={(e) => set('geofenceRadiusMeters', e.target.value)}
              placeholder="150"
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleUseCurrentLocation}
              className="w-full bg-white/5 hover:bg-white/10 border border-[#1e2536] text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <MapPin size={14} /> Use current location
            </button>
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Geofence Preview</p>
              <p className="text-xs text-slate-600">Radius: {form.geofenceRadiusMeters || '0'}m</p>
            </div>
            <GeofenceMap
              enabled={form.geofenceEnabled}
              latitude={form.latitude ? Number(form.latitude) : null}
              longitude={form.longitude ? Number(form.longitude) : null}
              radiusMeters={form.geofenceRadiusMeters ? Number(form.geofenceRadiusMeters) : null}
            />
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-4">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium">Operations</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => set('currency', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Timezone
            </label>
            <select
              value={form.timezone}
              onChange={(e) => set('timezone', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            >
              {timezones.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Tax Rate (%)
            </label>
            <input
              type="number"
              value={form.taxRate}
              onChange={(e) => set('taxRate', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
