'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Camera,
  Check,
  ClipboardList,
  Clock3,
  Hotel,
  MapPin,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import openToast from '@/components/ToastComponent';
import {
  useHotelProfile,
  useRunHotelCronJob,
  useUpdateHotelProfile,
} from '@/hooks/hotel/useHotelProfile';

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

type SettingsTab = 'profile' | 'attendance' | 'reservation' | 'operations';

const tabs: Array<{ id: SettingsTab; label: string; icon: any; blurb: string }> = [
  {
    id: 'profile',
    label: 'Profile',
    icon: Building2,
    blurb: 'Branding, contact, address, currency, and timezone',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: ShieldCheck,
    blurb: 'Clock policies, geofence, and absence scheduler',
  },
  {
    id: 'reservation',
    label: 'Reservation',
    icon: Clock3,
    blurb: 'Checkout defaults and guest reminder policy',
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: ClipboardList,
    blurb: 'Checkout scheduler, status, and housekeeping prep',
  },
];

function formatSchedulerDate(value?: string | null, timezone?: string) {
  if (!value) return 'Not yet run';
  return new Date(value).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone || 'Africa/Lagos',
  });
}

function getSchedulerHealth(args: {
  enabled: boolean;
  lastSucceededAt?: string | null;
  lastFailedAt?: string | null;
}) {
  if (!args.enabled) {
    return {
      label: 'Disabled',
      className: 'bg-slate-700/60 text-slate-300',
    };
  }

  const lastSucceededAt = args.lastSucceededAt ? new Date(args.lastSucceededAt).getTime() : 0;
  const lastFailedAt = args.lastFailedAt ? new Date(args.lastFailedAt).getTime() : 0;

  if (lastFailedAt > lastSucceededAt) {
    return {
      label: 'Needs attention',
      className: 'bg-rose-500/15 text-rose-300',
    };
  }

  if (lastSucceededAt > 0) {
    return {
      label: 'Healthy',
      className: 'bg-emerald-500/15 text-emerald-300',
    };
  }

  return {
    label: 'Pending first run',
    className: 'bg-amber-500/15 text-amber-300',
  };
}

function getNextSchedulerRun(
  timezone: string,
  hour: number,
  minute: number,
  enabled: boolean,
) {
  if (!enabled) return 'Disabled';

  const now = new Date();
  const localeString = now.toLocaleString('en-US', { timeZone: timezone });
  const zonedNow = new Date(localeString);
  const next = new Date(zonedNow);
  next.setHours(hour, minute, 0, 0);

  if (next <= zonedNow) {
    next.setDate(next.getDate() + 1);
  }

  return next.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  });
}

function parseReminderLeadDaysInput(value: string) {
  const normalized = [...new Set(
    value
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((part) => Number.isInteger(part) && part >= 0 && part <= 30),
  )].sort((a, b) => b - a);

  return normalized.length ? normalized : [1, 0];
}

function ToggleRow({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5">
      <div>
        <p className="text-sm text-slate-200">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`h-6 w-12 rounded-full transition-colors ${
          enabled ? 'bg-emerald-500/80' : 'bg-slate-700'
        }`}
      >
        <span
          className={`mt-0.5 block h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function SchedulerStatusCard({
  title,
  description,
  health,
  lastRun,
  nextRun,
  timezone,
  lastSuccess,
  lastFailure,
  lastError,
}: {
  title: string;
  description: string;
  health: { label: string; className: string };
  lastRun: string;
  nextRun: string;
  timezone: string;
  lastSuccess: string;
  lastFailure: string;
  lastError: string;
}) {
  return (
    <div className="rounded-lg border border-[#1e2536] bg-[#101522] px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-100">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <span
          className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium ${health.className}`}
        >
          {health.label}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Last Run</p>
          <p className="mt-1 text-sm text-slate-200">{lastRun}</p>
        </div>
        <div className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Next Run</p>
          <p className="mt-1 text-sm text-slate-200">{nextRun}</p>
        </div>
        <div className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Timezone</p>
          <p className="mt-1 text-sm text-slate-200">{timezone}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Last Success</p>
          <p className="mt-1 text-sm text-slate-200">{lastSuccess}</p>
        </div>
        <div className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Last Failure</p>
          <p className="mt-1 text-sm text-slate-200">{lastFailure}</p>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Last Error</p>
        <p className="mt-1 break-words text-sm text-slate-200">{lastError}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  saved,
  saving,
  onSave,
}: {
  title: string;
  description: string;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
          saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'
        } ${saving ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        {saved ? (
          <>
            <Check size={14} /> Saved!
          </>
        ) : (
          <>
            <Save size={14} /> Save Section
          </>
        )}
      </button>
    </div>
  );
}

export default function HotelProfilePage() {
  const router = useRouter();
  const { data, isLoading } = useHotelProfile();
  const updateHotel = useUpdateHotelProfile();
  const runCronJob = useRunHotelCronJob();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [savedSection, setSavedSection] = useState<SettingsTab | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<null | 'checkoutDueScan' | 'housekeepingFollowUpScan'>(
    null,
  );
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    logo: null as string | null,
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
    attendanceAbsenceScanEnabled: true,
    attendanceAbsenceScanHour: '9',
    attendanceAbsenceScanMinute: '15',
    defaultCheckoutHour: '12',
    defaultCheckoutMinute: '0',
    guestCheckoutReminderEnabled: false,
    guestCheckoutReminderLeadDays: '1, 0',
    checkoutDueScanEnabled: true,
    checkoutDueScanHour: '11',
    checkoutDueScanMinute: '0',
    autoCreateCheckoutHousekeepingTasks: true,
    housekeepingFollowUpEnabled: false,
    housekeepingFollowUpGraceHours: '2',
    housekeepingFollowUpScanEnabled: false,
    housekeepingFollowUpScanHour: '15',
    housekeepingFollowUpScanMinute: '0',
  });

  const set = (k: string, v: string | boolean | null) => {
    setSavedSection(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

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
      logo: data.logo ?? null,
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
      attendanceAbsenceScanEnabled: Boolean(data.cronSettings?.attendanceAbsenceScanEnabled ?? true),
      attendanceAbsenceScanHour: String(data.cronSettings?.attendanceAbsenceScanHour ?? 9),
      attendanceAbsenceScanMinute: String(data.cronSettings?.attendanceAbsenceScanMinute ?? 15),
      defaultCheckoutHour: String(data.defaultCheckoutHour ?? 12),
      defaultCheckoutMinute: String(data.defaultCheckoutMinute ?? 0),
      guestCheckoutReminderEnabled: Boolean(data.guestCheckoutReminderEnabled ?? false),
      guestCheckoutReminderLeadDays: (data.guestCheckoutReminderLeadDays ?? [1, 0]).join(', '),
      checkoutDueScanEnabled: Boolean(data.cronSettings?.checkoutDueScanEnabled ?? true),
      checkoutDueScanHour: String(data.cronSettings?.checkoutDueScanHour ?? 11),
      checkoutDueScanMinute: String(data.cronSettings?.checkoutDueScanMinute ?? 0),
      autoCreateCheckoutHousekeepingTasks: Boolean(
        data.autoCreateCheckoutHousekeepingTasks ?? true,
      ),
      housekeepingFollowUpEnabled: Boolean(data.housekeepingFollowUpEnabled ?? false),
      housekeepingFollowUpGraceHours: String(data.housekeepingFollowUpGraceHours ?? 2),
      housekeepingFollowUpScanEnabled: Boolean(
        data.cronSettings?.housekeepingFollowUpScanEnabled ?? false,
      ),
      housekeepingFollowUpScanHour: String(data.cronSettings?.housekeepingFollowUpScanHour ?? 15),
      housekeepingFollowUpScanMinute: String(
        data.cronSettings?.housekeepingFollowUpScanMinute ?? 0,
      ),
    }));
    setLogoPreview(data.logo ?? null);
  }, [data]);

  const schedulerTimezone = form.timezone || 'Africa/Lagos';

  const attendanceHealth = getSchedulerHealth({
    enabled: form.attendanceAbsenceScanEnabled,
    lastSucceededAt: data?.cronSettings?.attendanceAbsenceScanLastSucceededAt,
    lastFailedAt: data?.cronSettings?.attendanceAbsenceScanLastFailedAt,
  });
  const attendanceStatus = {
    lastRun: formatSchedulerDate(
      data?.cronSettings?.attendanceAbsenceScanLastTriggeredAt,
      schedulerTimezone,
    ),
    lastSuccess: formatSchedulerDate(
      data?.cronSettings?.attendanceAbsenceScanLastSucceededAt,
      schedulerTimezone,
    ),
    lastFailure: formatSchedulerDate(
      data?.cronSettings?.attendanceAbsenceScanLastFailedAt,
      schedulerTimezone,
    ),
    nextRun: getNextSchedulerRun(
      schedulerTimezone,
      Number(form.attendanceAbsenceScanHour || 9),
      Number(form.attendanceAbsenceScanMinute || 15),
      form.attendanceAbsenceScanEnabled,
    ),
    lastError: data?.cronSettings?.attendanceAbsenceScanLastError?.trim() || 'None',
  };

  const checkoutHealth = getSchedulerHealth({
    enabled: form.checkoutDueScanEnabled,
    lastSucceededAt: data?.cronSettings?.checkoutDueScanLastSucceededAt,
    lastFailedAt: data?.cronSettings?.checkoutDueScanLastFailedAt,
  });
  const checkoutStatus = {
    lastRun: formatSchedulerDate(
      data?.cronSettings?.checkoutDueScanLastTriggeredAt,
      schedulerTimezone,
    ),
    lastSuccess: formatSchedulerDate(
      data?.cronSettings?.checkoutDueScanLastSucceededAt,
      schedulerTimezone,
    ),
    lastFailure: formatSchedulerDate(
      data?.cronSettings?.checkoutDueScanLastFailedAt,
      schedulerTimezone,
    ),
    nextRun: getNextSchedulerRun(
      schedulerTimezone,
      Number(form.checkoutDueScanHour || 11),
      Number(form.checkoutDueScanMinute || 0),
      form.checkoutDueScanEnabled,
    ),
    lastError: data?.cronSettings?.checkoutDueScanLastError?.trim() || 'None',
  };
  const housekeepingFollowUpHealth = getSchedulerHealth({
    enabled: form.housekeepingFollowUpScanEnabled,
    lastSucceededAt: data?.cronSettings?.housekeepingFollowUpScanLastSucceededAt,
    lastFailedAt: data?.cronSettings?.housekeepingFollowUpScanLastFailedAt,
  });
  const housekeepingFollowUpStatus = {
    lastRun: formatSchedulerDate(
      data?.cronSettings?.housekeepingFollowUpScanLastTriggeredAt,
      schedulerTimezone,
    ),
    lastSuccess: formatSchedulerDate(
      data?.cronSettings?.housekeepingFollowUpScanLastSucceededAt,
      schedulerTimezone,
    ),
    lastFailure: formatSchedulerDate(
      data?.cronSettings?.housekeepingFollowUpScanLastFailedAt,
      schedulerTimezone,
    ),
    nextRun: getNextSchedulerRun(
      schedulerTimezone,
      Number(form.housekeepingFollowUpScanHour || 15),
      Number(form.housekeepingFollowUpScanMinute || 0),
      form.housekeepingFollowUpScanEnabled,
    ),
    lastError: data?.cronSettings?.housekeepingFollowUpScanLastError?.trim() || 'None',
  };

  const hotelInitials = form.name
    .split(' ')
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      openToast('error', 'Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      openToast('error', 'Logo must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      setLogoPreview(value);
      set('logo', value);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    set('logo', null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const saveSection = async (section: SettingsTab) => {
    let payload: Record<string, unknown> = {};

    if (section === 'profile') {
      payload = {
        name: form.name,
        address: form.address,
        city: form.city,
        state: form.state || null,
        country: form.country,
        phone: form.phone,
        email: form.email,
        website: form.website || null,
        logo: form.logo || null,
        currency: form.currency,
        timezone: form.timezone,
        taxRate: Number(form.taxRate || 0),
        description: form.description || null,
      };
    }

    if (section === 'attendance') {
      payload = {
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        geofenceEnabled: form.geofenceEnabled,
        geofenceRadiusMeters: Number(form.geofenceRadiusMeters || 0),
        attendancePinRequired: form.attendancePinRequired,
        attendanceKioskEnabled: form.attendanceKioskEnabled,
        attendancePersonalEnabled: form.attendancePersonalEnabled,
        cronSettings: {
          attendanceAbsenceScanEnabled: form.attendanceAbsenceScanEnabled,
          attendanceAbsenceScanHour: Number(form.attendanceAbsenceScanHour || 9),
          attendanceAbsenceScanMinute: Number(form.attendanceAbsenceScanMinute || 15),
        },
      };
    }

    if (section === 'reservation') {
      payload = {
        defaultCheckoutHour: Number(form.defaultCheckoutHour || 12),
        defaultCheckoutMinute: Number(form.defaultCheckoutMinute || 0),
        guestCheckoutReminderEnabled: form.guestCheckoutReminderEnabled,
        guestCheckoutReminderLeadDays: parseReminderLeadDaysInput(form.guestCheckoutReminderLeadDays),
      };
    }

    if (section === 'operations') {
      payload = {
        autoCreateCheckoutHousekeepingTasks: form.autoCreateCheckoutHousekeepingTasks,
        housekeepingFollowUpEnabled: form.housekeepingFollowUpEnabled,
        housekeepingFollowUpGraceHours: Number(form.housekeepingFollowUpGraceHours || 2),
        cronSettings: {
          checkoutDueScanEnabled: form.checkoutDueScanEnabled,
          checkoutDueScanHour: Number(form.checkoutDueScanHour || 11),
          checkoutDueScanMinute: Number(form.checkoutDueScanMinute || 0),
          housekeepingFollowUpScanEnabled: form.housekeepingFollowUpScanEnabled,
          housekeepingFollowUpScanHour: Number(form.housekeepingFollowUpScanHour || 15),
          housekeepingFollowUpScanMinute: Number(form.housekeepingFollowUpScanMinute || 0),
        },
      };
    }

    try {
      await updateHotel.mutateAsync(payload);
      setSavedSection(section);
      setTimeout(() => {
        setSavedSection((current) => (current === section ? null : current));
      }, 2500);
    } catch {
      // handled by toast
    }
  };

  const handleRunCronJob = async (job: 'checkoutDueScan' | 'housekeepingFollowUpScan') => {
    setRunningJob(job);
    try {
      await runCronJob.mutateAsync(job);
    } finally {
      setRunningJob(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/settings')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2536] bg-[#161b27] text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Hotel Settings</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage hotel details, attendance policies, checkout behavior, and operations.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="relative">
          <div className="rounded-2xl sticky top-0 space-y-2  p-2 bg-[#161b27] border border-[#1e2536]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-xl border px-2 py-3 text-left transition-all ${
                    active
                      ? 'border-blue-500/30 bg-blue-500/10 text-white'
                      : 'border-transparent bg-transparent text-slate-400 hover:border-[#1e2536] hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-start gap-3 w-full">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        active ? 'bg-blue-500/15 text-blue-300' : 'bg-[#0f1117] text-slate-500'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tab.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{tab.blurb}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-6">
          {activeTab === 'profile' && (
            <>
              <SectionHeader
                title="Profile"
                description="Hotel identity, contact details, location, and accounting basics."
                saved={savedSection === 'profile'}
                saving={isLoading || updateHotel.isPending}
                onSave={() => saveSection('profile')}
              />

              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[#1e2536] bg-[#0f1117]">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Hotel logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-slate-400">
                          {hotelInitials || 'H'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleLogoClick}
                          className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10"
                        >
                          <Camera size={14} /> Upload logo
                        </button>
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-white/5 px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/10"
                          >
                            <X size={14} /> Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">PNG or JPG · Max 2MB</p>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Hotel Name
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>

                  {[
                    { label: 'Phone', key: 'phone' },
                    { label: 'Email', key: 'email' },
                    { label: 'Website', key: 'website' },
                    { label: 'Address', key: 'address' },
                    { label: 'City', key: 'city' },
                    { label: 'State', key: 'state' },
                    { label: 'Country', key: 'country' },
                  ].map(({ label, key }) => (
                    <div key={key} className={key === 'address' ? 'md:col-span-2' : ''}>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        {label}
                      </label>
                      <input
                        value={(form as any)[key]}
                        onChange={(e) => set(key, e.target.value)}
                        className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Currency
                    </label>
                    <select
                      value={form.currency}
                      onChange={(e) => set('currency', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    >
                      {currencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Timezone
                    </label>
                    <select
                      value={form.timezone}
                      onChange={(e) => set('timezone', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    >
                      {timezones.map((timezone) => (
                        <option key={timezone} value={timezone}>
                          {timezone}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={form.taxRate}
                      onChange={(e) => set('taxRate', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'attendance' && (
            <>
              <SectionHeader
                title="Attendance"
                description="Clock access rules, geofence controls, and the absence scan scheduler."
                saved={savedSection === 'attendance'}
                saving={isLoading || updateHotel.isPending}
                onSave={() => saveSection('attendance')}
              />

              <div className="space-y-5 rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 space-y-3">
                    <ToggleRow
                      title="Enable kiosk clock"
                      description="Allow shared devices to clock staff in and out."
                      enabled={form.attendanceKioskEnabled}
                      onToggle={() => set('attendanceKioskEnabled', !form.attendanceKioskEnabled)}
                    />
                    <ToggleRow
                      title="Enable personal clock"
                      description="Allow staff to clock in from their own login."
                      enabled={form.attendancePersonalEnabled}
                      onToggle={() =>
                        set('attendancePersonalEnabled', !form.attendancePersonalEnabled)
                      }
                    />
                    <ToggleRow
                      title="Require PIN for clock-in/out"
                      description="Adds a PIN prompt on the staff clock screen."
                      enabled={form.attendancePinRequired}
                      onToggle={() => set('attendancePinRequired', !form.attendancePinRequired)}
                    />
                    <ToggleRow
                      title="Enable location lock"
                      description="Only allow clock-in near the hotel geofence."
                      enabled={form.geofenceEnabled}
                      onToggle={() => set('geofenceEnabled', !form.geofenceEnabled)}
                    />
                    <ToggleRow
                      title="Enable absence scheduler"
                      description="Generate absence alerts from the background scheduler."
                      enabled={form.attendanceAbsenceScanEnabled}
                      onToggle={() =>
                        set('attendanceAbsenceScanEnabled', !form.attendanceAbsenceScanEnabled)
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Absence Check Hour
                    </label>
                    <input
                      value={form.attendanceAbsenceScanHour}
                      onChange={(e) => set('attendanceAbsenceScanHour', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Absence Check Minute
                    </label>
                    <input
                      value={form.attendanceAbsenceScanMinute}
                      onChange={(e) => set('attendanceAbsenceScanMinute', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                </div>

                <SchedulerStatusCard
                  title="Attendance scheduler status"
                  description="Background absence scans use the hotel timezone and the shared queue heartbeat."
                  health={attendanceHealth}
                  lastRun={attendanceStatus.lastRun}
                  nextRun={attendanceStatus.nextRun}
                  timezone={schedulerTimezone}
                  lastSuccess={attendanceStatus.lastSuccess}
                  lastFailure={attendanceStatus.lastFailure}
                  lastError={attendanceStatus.lastError}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Hotel Latitude
                    </label>
                    <input
                      value={form.latitude}
                      onChange={(e) => set('latitude', e.target.value)}
                      placeholder="e.g. 4.8156"
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Hotel Longitude
                    </label>
                    <input
                      value={form.longitude}
                      onChange={(e) => set('longitude', e.target.value)}
                      placeholder="e.g. 7.0498"
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Allowed Radius (meters)
                    </label>
                    <input
                      value={form.geofenceRadiusMeters}
                      onChange={(e) => set('geofenceRadiusMeters', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1e2536] bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10"
                    >
                      <MapPin size={14} /> Use current location
                    </button>
                  </div>
                  <div className="md:col-span-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-widest text-slate-500">
                        Geofence Preview
                      </p>
                      <p className="text-xs text-slate-600">
                        Radius: {form.geofenceRadiusMeters || '0'}m
                      </p>
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
            </>
          )}

          {activeTab === 'reservation' && (
            <>
              <SectionHeader
                title="Reservation"
                description="Guest-facing checkout rules and default checkout timing."
                saved={savedSection === 'reservation'}
                saving={isLoading || updateHotel.isPending}
                onSave={() => saveSection('reservation')}
              />

              <div className="space-y-5 rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Default Checkout Hour
                    </label>
                    <input
                      value={form.defaultCheckoutHour}
                      onChange={(e) => set('defaultCheckoutHour', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Default Checkout Minute
                    </label>
                    <input
                      value={form.defaultCheckoutMinute}
                      onChange={(e) => set('defaultCheckoutMinute', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-[#1e2536] bg-[#101522] px-4 py-3">
                  <p className="text-sm font-medium text-slate-100">Checkout default preview</p>
                  <p className="mt-1 text-sm text-slate-400">
                    New reservation checkout times will default to{' '}
                    <span className="font-medium text-slate-200">
                      {String(form.defaultCheckoutHour || '12').padStart(2, '0')}:
                      {String(form.defaultCheckoutMinute || '0').padStart(2, '0')}
                    </span>{' '}
                    in the hotel timezone.
                  </p>
                </div>

                <ToggleRow
                  title="Send guest-facing checkout reminders"
                  description="Email guests due out today before staff follow-up becomes necessary."
                  enabled={form.guestCheckoutReminderEnabled}
                  onToggle={() =>
                    set('guestCheckoutReminderEnabled', !form.guestCheckoutReminderEnabled)
                  }
                />

                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                    Reminder Lead Days
                  </label>
                  <input
                    value={form.guestCheckoutReminderLeadDays}
                    onChange={(e) => set('guestCheckoutReminderLeadDays', e.target.value)}
                    className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Comma-separated day offsets like `3, 1, 0` for three days before, day before,
                    and same-day reminders.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'operations' && (
            <>
              <SectionHeader
                title="Operations"
                description="Checkout automation, scheduler timing, and housekeeping prep behavior."
                saved={savedSection === 'operations'}
                saving={isLoading || updateHotel.isPending}
                onSave={() => saveSection('operations')}
              />

              <div className="space-y-5 rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
                <ToggleRow
                  title="Enable checkout-due scheduler"
                  description="Alert staff when checked-in reservations are due out today or overdue."
                  enabled={form.checkoutDueScanEnabled}
                  onToggle={() => set('checkoutDueScanEnabled', !form.checkoutDueScanEnabled)}
                />
                <ToggleRow
                  title="Auto-create checkout housekeeping tasks"
                  description="Create unassigned checkout prep tasks so housekeeping can assign and work them later."
                  enabled={form.autoCreateCheckoutHousekeepingTasks}
                  onToggle={() =>
                    set(
                      'autoCreateCheckoutHousekeepingTasks',
                      !form.autoCreateCheckoutHousekeepingTasks,
                    )
                  }
                />
                <ToggleRow
                  title="Enable housekeeping follow-up scheduler"
                  description="Escalate checkout prep tasks that remain open past the grace window."
                  enabled={form.housekeepingFollowUpScanEnabled}
                  onToggle={() =>
                    set('housekeepingFollowUpScanEnabled', !form.housekeepingFollowUpScanEnabled)
                  }
                />
                <ToggleRow
                  title="Send housekeeping follow-up alerts"
                  description="Notify housekeeping-capable staff when checkout prep work stays open too long."
                  enabled={form.housekeepingFollowUpEnabled}
                  onToggle={() =>
                    set('housekeepingFollowUpEnabled', !form.housekeepingFollowUpEnabled)
                  }
                />

                <SchedulerStatusCard
                  title="Checkout scheduler status"
                  description="Daily summary alerts run in the hotel timezone and target checked-in reservations that are due out or overdue."
                  health={checkoutHealth}
                  lastRun={checkoutStatus.lastRun}
                  nextRun={checkoutStatus.nextRun}
                  timezone={schedulerTimezone}
                  lastSuccess={checkoutStatus.lastSuccess}
                  lastFailure={checkoutStatus.lastFailure}
                  lastError={checkoutStatus.lastError}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRunCronJob('checkoutDueScan')}
                    disabled={runCronJob.isPending}
                    className="rounded-lg border border-[#1e2536] bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {runningJob === 'checkoutDueScan' ? 'Running checkout scan...' : 'Run checkout scan now'}
                  </button>
                </div>

                <SchedulerStatusCard
                  title="Housekeeping follow-up status"
                  description="Daily follow-up alerts for checkout prep tasks still open after the configured grace window."
                  health={housekeepingFollowUpHealth}
                  lastRun={housekeepingFollowUpStatus.lastRun}
                  nextRun={housekeepingFollowUpStatus.nextRun}
                  timezone={schedulerTimezone}
                  lastSuccess={housekeepingFollowUpStatus.lastSuccess}
                  lastFailure={housekeepingFollowUpStatus.lastFailure}
                  lastError={housekeepingFollowUpStatus.lastError}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRunCronJob('housekeepingFollowUpScan')}
                    disabled={runCronJob.isPending}
                    className="rounded-lg border border-[#1e2536] bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {runningJob === 'housekeepingFollowUpScan'
                      ? 'Running follow-up scan...'
                      : 'Run housekeeping follow-up now'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Checkout Scan Hour
                    </label>
                    <input
                      value={form.checkoutDueScanHour}
                      onChange={(e) => set('checkoutDueScanHour', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Checkout Scan Minute
                    </label>
                    <input
                      value={form.checkoutDueScanMinute}
                      onChange={(e) => set('checkoutDueScanMinute', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Follow-up Grace Hours
                    </label>
                    <input
                      value={form.housekeepingFollowUpGraceHours}
                      onChange={(e) => set('housekeepingFollowUpGraceHours', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Follow-up Scan Hour
                    </label>
                    <input
                      value={form.housekeepingFollowUpScanHour}
                      onChange={(e) => set('housekeepingFollowUpScanHour', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Follow-up Scan Minute
                    </label>
                    <input
                      value={form.housekeepingFollowUpScanMinute}
                      onChange={(e) => set('housekeepingFollowUpScanMinute', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
