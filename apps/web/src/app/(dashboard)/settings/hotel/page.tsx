'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
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
  type RunnableHotelCronJob,
  useHotelProfile,
  useRunHotelCronJob,
  useUpdateHotelProfile,
} from '@/hooks/hotel/useHotelProfile';
import { useHotelFeatureAccess } from '@/hooks/hotel/useHotelFeatureAccess';
import { FeatureGate } from '@/components/hotel/FeatureGate';
import { useRealtimeSettings, useUpdateRealtimeSettings } from '@/hooks/useRealtimeSettings';
import { validateImageFile } from '@/utils/image-file';
import { COUNTRY_OPTIONS, getCountryOption } from '@/lib/country-metadata';

const GeofenceMap = dynamic(() => import('@/components/GeofenceMap'), { ssr: false });

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

function SchedulerAutomationCard({
  title,
  description,
  enabled,
  onToggle,
  hourValue,
  minuteValue,
  onHourChange,
  onMinuteChange,
  statusTitle,
  statusDescription,
  health,
  lastRun,
  nextRun,
  timezone,
  lastSuccess,
  lastFailure,
  lastError,
  onRun,
  isRunning,
  runLabel,
  runningLabel,
  extraFields,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  hourValue: string;
  minuteValue: string;
  onHourChange: (value: string) => void;
  onMinuteChange: (value: string) => void;
  statusTitle: string;
  statusDescription: string;
  health: { label: string; className: string };
  lastRun: string;
  nextRun: string;
  timezone: string;
  lastSuccess: string;
  lastFailure: string;
  lastError: string;
  onRun: () => void;
  isRunning: boolean;
  runLabel: string;
  runningLabel: string;
  extraFields?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#1e2536] bg-[#101522] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-base font-semibold text-white">{title}</p>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-3 self-start rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
            enabled
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-[#1e2536] bg-[#0f1117] text-slate-400'
          }`}
        >
          <span>{enabled ? 'Enabled' : 'Disabled'}</span>
          <span
            className={`relative block h-6 w-11 rounded-full transition-colors ${
              enabled ? 'bg-emerald-500/80' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
            Hour
          </label>
          <input
            value={hourValue}
            onChange={(event) => onHourChange(event.target.value)}
            className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
            Minute
          </label>
          <input
            value={minuteValue}
            onChange={(event) => onMinuteChange(event.target.value)}
            className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
          />
        </div>
      </div>

      {extraFields ? <div className="mt-3 grid grid-cols-1 gap-3">{extraFields}</div> : null}

      <div className="mt-4">
        <SchedulerStatusCard
          title={statusTitle}
          description={statusDescription}
          health={health}
          lastRun={lastRun}
          nextRun={nextRun}
          timezone={timezone}
          lastSuccess={lastSuccess}
          lastFailure={lastFailure}
          lastError={lastError}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          className="rounded-lg border border-[#1e2536] bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? runningLabel : runLabel}
        </button>
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
  const { data: featureAccess } = useHotelFeatureAccess();
  const { data: realtimeSettings } = useRealtimeSettings();
  const updateHotel = useUpdateHotelProfile();
  const updateRealtimeSettings = useUpdateRealtimeSettings();
  const runCronJob = useRunHotelCronJob();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [savedSection, setSavedSection] = useState<SettingsTab | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<RunnableHotelCronJob | null>(null);
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
    keycardAuthEnabled: false,
    lockVendor: 'MOCK',
    lockApiKey: '',
    lockApiConfig: '{\n  \n}',
    taxRate: '0',
    description: '',
    latitude: '',
    longitude: '',
    geofenceEnabled: false,
    geofenceRadiusMeters: '150',
    attendancePinRequired: false,
    attendanceKioskEnabled: true,
    attendancePersonalEnabled: true,
    attendanceAutoClockOutEnabled: true,
    attendanceAutoClockOutHour: '0',
    attendanceAutoClockOutMinute: '0',
    attendanceAbsenceScanEnabled: true,
    attendanceAbsenceScanHour: '9',
    attendanceAbsenceScanMinute: '15',
    upcomingArrivalScanEnabled: true,
    upcomingArrivalScanHour: '18',
    upcomingArrivalScanMinute: '0',
    defaultCheckoutHour: '12',
    defaultCheckoutMinute: '0',
    guestCheckoutReminderEnabled: false,
    guestCheckoutReminderLeadDays: '1, 0',
    emailAutoRetryEnabled: false,
    checkoutDueScanEnabled: true,
    checkoutDueScanHour: '11',
    checkoutDueScanMinute: '0',
    overduePaymentScanEnabled: true,
    overduePaymentScanHour: '13',
    overduePaymentScanMinute: '0',
    autoCreateCheckoutHousekeepingTasks: true,
    housekeepingFollowUpEnabled: false,
    housekeepingFollowUpGraceHours: '2',
    housekeepingFollowUpScanEnabled: false,
    housekeepingFollowUpScanHour: '15',
    housekeepingFollowUpScanMinute: '0',
    noShowFollowUpScanEnabled: true,
    noShowFollowUpScanHour: '20',
    noShowFollowUpScanMinute: '0',
    maintenanceEscalationScanEnabled: true,
    maintenanceEscalationScanHour: '16',
    maintenanceEscalationScanMinute: '0',
    dailyDigestScanEnabled: true,
    dailyDigestScanHour: '19',
    dailyDigestScanMinute: '0',
    realtimeDegradationAlertsEnabled: true,
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
      keycardAuthEnabled: Boolean(data.keycardAuthEnabled),
      lockVendor: data.lockVendor ?? 'MOCK',
      lockApiKey: data.lockApiKey ?? '',
      lockApiConfig: data.lockApiConfig
        ? JSON.stringify(data.lockApiConfig, null, 2)
        : '{\n  \n}',
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
      attendanceAutoClockOutEnabled: Boolean(data.attendanceAutoClockOutEnabled ?? true),
      attendanceAutoClockOutHour: String(data.attendanceAutoClockOutHour ?? 0),
      attendanceAutoClockOutMinute: String(data.attendanceAutoClockOutMinute ?? 0),
      attendanceAbsenceScanEnabled: Boolean(data.cronSettings?.attendanceAbsenceScanEnabled ?? true),
      attendanceAbsenceScanHour: String(data.cronSettings?.attendanceAbsenceScanHour ?? 9),
      attendanceAbsenceScanMinute: String(data.cronSettings?.attendanceAbsenceScanMinute ?? 15),
      upcomingArrivalScanEnabled: Boolean(data.cronSettings?.upcomingArrivalScanEnabled ?? true),
      upcomingArrivalScanHour: String(data.cronSettings?.upcomingArrivalScanHour ?? 18),
      upcomingArrivalScanMinute: String(data.cronSettings?.upcomingArrivalScanMinute ?? 0),
      defaultCheckoutHour: String(data.defaultCheckoutHour ?? 12),
      defaultCheckoutMinute: String(data.defaultCheckoutMinute ?? 0),
      guestCheckoutReminderEnabled: Boolean(data.guestCheckoutReminderEnabled ?? false),
      guestCheckoutReminderLeadDays: (data.guestCheckoutReminderLeadDays ?? [1, 0]).join(', '),
      emailAutoRetryEnabled: Boolean(data.emailAutoRetryEnabled ?? false),
      checkoutDueScanEnabled: Boolean(data.cronSettings?.checkoutDueScanEnabled ?? true),
      checkoutDueScanHour: String(data.cronSettings?.checkoutDueScanHour ?? 11),
      checkoutDueScanMinute: String(data.cronSettings?.checkoutDueScanMinute ?? 0),
      overduePaymentScanEnabled: Boolean(data.cronSettings?.overduePaymentScanEnabled ?? true),
      overduePaymentScanHour: String(data.cronSettings?.overduePaymentScanHour ?? 13),
      overduePaymentScanMinute: String(data.cronSettings?.overduePaymentScanMinute ?? 0),
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
      noShowFollowUpScanEnabled: Boolean(data.cronSettings?.noShowFollowUpScanEnabled ?? true),
      noShowFollowUpScanHour: String(data.cronSettings?.noShowFollowUpScanHour ?? 20),
      noShowFollowUpScanMinute: String(data.cronSettings?.noShowFollowUpScanMinute ?? 0),
      maintenanceEscalationScanEnabled: Boolean(
        data.cronSettings?.maintenanceEscalationScanEnabled ?? true,
      ),
      maintenanceEscalationScanHour: String(
        data.cronSettings?.maintenanceEscalationScanHour ?? 16,
      ),
      maintenanceEscalationScanMinute: String(
        data.cronSettings?.maintenanceEscalationScanMinute ?? 0,
      ),
      dailyDigestScanEnabled: Boolean(data.cronSettings?.dailyDigestScanEnabled ?? true),
      dailyDigestScanHour: String(data.cronSettings?.dailyDigestScanHour ?? 19),
      dailyDigestScanMinute: String(data.cronSettings?.dailyDigestScanMinute ?? 0),
    }));
    setLogoPreview(data.logo ?? null);
  }, [data]);

  useEffect(() => {
    if (!realtimeSettings) return;
    setForm((current) => ({
      ...current,
      realtimeDegradationAlertsEnabled: realtimeSettings.alertsEnabled,
    }));
  }, [realtimeSettings]);

  const schedulerTimezone = form.timezone || 'Africa/Lagos';
  const selectedCountry = getCountryOption(form.country || 'Nigeria');
  const availableCurrencies = Array.from(
    new Set([
      ...COUNTRY_OPTIONS.map((country) => country.currency),
      form.currency || selectedCountry.currency,
    ].filter(Boolean)),
  );
  const availableTimezones = Array.from(
    new Set([
      ...COUNTRY_OPTIONS.map((country) => country.timezone),
      form.timezone || selectedCountry.timezone,
    ].filter(Boolean)),
  );
  const keycardGlobalEnabled = featureAccess?.keycardAuth?.globalEnabled === true;

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
  const upcomingArrivalHealth = getSchedulerHealth({
    enabled: form.upcomingArrivalScanEnabled,
    lastSucceededAt: data?.cronSettings?.upcomingArrivalScanLastSucceededAt,
    lastFailedAt: data?.cronSettings?.upcomingArrivalScanLastFailedAt,
  });
  const upcomingArrivalStatus = {
    lastRun: formatSchedulerDate(
      data?.cronSettings?.upcomingArrivalScanLastTriggeredAt,
      schedulerTimezone,
    ),
    lastSuccess: formatSchedulerDate(
      data?.cronSettings?.upcomingArrivalScanLastSucceededAt,
      schedulerTimezone,
    ),
    lastFailure: formatSchedulerDate(
      data?.cronSettings?.upcomingArrivalScanLastFailedAt,
      schedulerTimezone,
    ),
    nextRun: getNextSchedulerRun(
      schedulerTimezone,
      Number(form.upcomingArrivalScanHour || 18),
      Number(form.upcomingArrivalScanMinute || 0),
      form.upcomingArrivalScanEnabled,
    ),
    lastError: data?.cronSettings?.upcomingArrivalScanLastError?.trim() || 'None',
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
  const overduePaymentHealth = getSchedulerHealth({
    enabled: form.overduePaymentScanEnabled,
    lastSucceededAt: data?.cronSettings?.overduePaymentScanLastSucceededAt,
    lastFailedAt: data?.cronSettings?.overduePaymentScanLastFailedAt,
  });
  const overduePaymentStatus = {
    lastRun: formatSchedulerDate(
      data?.cronSettings?.overduePaymentScanLastTriggeredAt,
      schedulerTimezone,
    ),
    lastSuccess: formatSchedulerDate(
      data?.cronSettings?.overduePaymentScanLastSucceededAt,
      schedulerTimezone,
    ),
    lastFailure: formatSchedulerDate(
      data?.cronSettings?.overduePaymentScanLastFailedAt,
      schedulerTimezone,
    ),
    nextRun: getNextSchedulerRun(
      schedulerTimezone,
      Number(form.overduePaymentScanHour || 13),
      Number(form.overduePaymentScanMinute || 0),
      form.overduePaymentScanEnabled,
    ),
    lastError: data?.cronSettings?.overduePaymentScanLastError?.trim() || 'None',
  };
  const noShowFollowUpHealth = getSchedulerHealth({
    enabled: form.noShowFollowUpScanEnabled,
    lastSucceededAt: data?.cronSettings?.noShowFollowUpScanLastSucceededAt,
    lastFailedAt: data?.cronSettings?.noShowFollowUpScanLastFailedAt,
  });
  const noShowFollowUpStatus = {
    lastRun: formatSchedulerDate(
      data?.cronSettings?.noShowFollowUpScanLastTriggeredAt,
      schedulerTimezone,
    ),
    lastSuccess: formatSchedulerDate(
      data?.cronSettings?.noShowFollowUpScanLastSucceededAt,
      schedulerTimezone,
    ),
    lastFailure: formatSchedulerDate(
      data?.cronSettings?.noShowFollowUpScanLastFailedAt,
      schedulerTimezone,
    ),
    nextRun: getNextSchedulerRun(
      schedulerTimezone,
      Number(form.noShowFollowUpScanHour || 20),
      Number(form.noShowFollowUpScanMinute || 0),
      form.noShowFollowUpScanEnabled,
    ),
    lastError: data?.cronSettings?.noShowFollowUpScanLastError?.trim() || 'None',
  };
  const maintenanceEscalationHealth = getSchedulerHealth({
    enabled: form.maintenanceEscalationScanEnabled,
    lastSucceededAt: data?.cronSettings?.maintenanceEscalationScanLastSucceededAt,
    lastFailedAt: data?.cronSettings?.maintenanceEscalationScanLastFailedAt,
  });
  const maintenanceEscalationStatus = {
    lastRun: formatSchedulerDate(
      data?.cronSettings?.maintenanceEscalationScanLastTriggeredAt,
      schedulerTimezone,
    ),
    lastSuccess: formatSchedulerDate(
      data?.cronSettings?.maintenanceEscalationScanLastSucceededAt,
      schedulerTimezone,
    ),
    lastFailure: formatSchedulerDate(
      data?.cronSettings?.maintenanceEscalationScanLastFailedAt,
      schedulerTimezone,
    ),
    nextRun: getNextSchedulerRun(
      schedulerTimezone,
      Number(form.maintenanceEscalationScanHour || 16),
      Number(form.maintenanceEscalationScanMinute || 0),
      form.maintenanceEscalationScanEnabled,
    ),
    lastError: data?.cronSettings?.maintenanceEscalationScanLastError?.trim() || 'None',
  };
  const dailyDigestHealth = getSchedulerHealth({
    enabled: form.dailyDigestScanEnabled,
    lastSucceededAt: data?.cronSettings?.dailyDigestScanLastSucceededAt,
    lastFailedAt: data?.cronSettings?.dailyDigestScanLastFailedAt,
  });
  const dailyDigestStatus = {
    lastRun: formatSchedulerDate(
      data?.cronSettings?.dailyDigestScanLastTriggeredAt,
      schedulerTimezone,
    ),
    lastSuccess: formatSchedulerDate(
      data?.cronSettings?.dailyDigestScanLastSucceededAt,
      schedulerTimezone,
    ),
    lastFailure: formatSchedulerDate(
      data?.cronSettings?.dailyDigestScanLastFailedAt,
      schedulerTimezone,
    ),
    nextRun: getNextSchedulerRun(
      schedulerTimezone,
      Number(form.dailyDigestScanHour || 19),
      Number(form.dailyDigestScanMinute || 0),
      form.dailyDigestScanEnabled,
    ),
    lastError: data?.cronSettings?.dailyDigestScanLastError?.trim() || 'None',
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

  const handleCountryChange = (countryName: string) => {
    const nextCountry = getCountryOption(countryName);
    setForm((current) => ({
      ...current,
      country: nextCountry.name,
      state: nextCountry.states.includes(current.state) ? current.state : nextCountry.states[0] ?? '',
      currency: current.currency && current.currency !== selectedCountry.currency
        ? current.currency
        : nextCountry.currency,
      timezone: current.timezone && current.timezone !== selectedCountry.timezone
        ? current.timezone
        : nextCountry.timezone,
    }));
    setSavedSection(null);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = validateImageFile(file, { label: 'Logo' });
    if (!result.ok) {
      openToast('error', result.message);
      if (logoInputRef.current) logoInputRef.current.value = '';
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
      let parsedLockApiConfig: Record<string, unknown> | undefined;
      if (keycardGlobalEnabled) {
        const raw = form.lockApiConfig.trim();
        if (raw) {
          try {
            parsedLockApiConfig = JSON.parse(raw);
          } catch {
            openToast('error', 'Lock API config must be valid JSON.');
            return;
          }
        }
      }

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
        ...(keycardGlobalEnabled
          ? {
              keycardAuthEnabled: form.keycardAuthEnabled,
              lockVendor: form.lockVendor.trim() || null,
              lockApiKey: form.lockApiKey.trim() || null,
              lockApiConfig: parsedLockApiConfig ?? {},
            }
          : {}),
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
        attendanceAutoClockOutEnabled: form.attendanceAutoClockOutEnabled,
        attendanceAutoClockOutHour: Number(form.attendanceAutoClockOutHour || 0),
        attendanceAutoClockOutMinute: Number(form.attendanceAutoClockOutMinute || 0),
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
        emailAutoRetryEnabled: form.emailAutoRetryEnabled,
        autoCreateCheckoutHousekeepingTasks: form.autoCreateCheckoutHousekeepingTasks,
        housekeepingFollowUpEnabled: form.housekeepingFollowUpEnabled,
        housekeepingFollowUpGraceHours: Number(form.housekeepingFollowUpGraceHours || 2),
        cronSettings: {
          checkoutDueScanEnabled: form.checkoutDueScanEnabled,
          checkoutDueScanHour: Number(form.checkoutDueScanHour || 11),
          checkoutDueScanMinute: Number(form.checkoutDueScanMinute || 0),
          upcomingArrivalScanEnabled: form.upcomingArrivalScanEnabled,
          upcomingArrivalScanHour: Number(form.upcomingArrivalScanHour || 18),
          upcomingArrivalScanMinute: Number(form.upcomingArrivalScanMinute || 0),
          overduePaymentScanEnabled: form.overduePaymentScanEnabled,
          overduePaymentScanHour: Number(form.overduePaymentScanHour || 13),
          overduePaymentScanMinute: Number(form.overduePaymentScanMinute || 0),
          housekeepingFollowUpScanEnabled: form.housekeepingFollowUpScanEnabled,
          housekeepingFollowUpScanHour: Number(form.housekeepingFollowUpScanHour || 15),
          housekeepingFollowUpScanMinute: Number(form.housekeepingFollowUpScanMinute || 0),
          noShowFollowUpScanEnabled: form.noShowFollowUpScanEnabled,
          noShowFollowUpScanHour: Number(form.noShowFollowUpScanHour || 20),
          noShowFollowUpScanMinute: Number(form.noShowFollowUpScanMinute || 0),
          maintenanceEscalationScanEnabled: form.maintenanceEscalationScanEnabled,
          maintenanceEscalationScanHour: Number(form.maintenanceEscalationScanHour || 16),
          maintenanceEscalationScanMinute: Number(form.maintenanceEscalationScanMinute || 0),
          dailyDigestScanEnabled: form.dailyDigestScanEnabled,
          dailyDigestScanHour: Number(form.dailyDigestScanHour || 19),
          dailyDigestScanMinute: Number(form.dailyDigestScanMinute || 0),
        },
      };
    }

    try {
      if (section === 'operations') {
        await Promise.all([
          updateHotel.mutateAsync(payload),
          updateRealtimeSettings.mutateAsync({
            alertsEnabled: form.realtimeDegradationAlertsEnabled,
          }),
        ]);
      } else {
        await updateHotel.mutateAsync(payload);
      }
      setSavedSection(section);
      setTimeout(() => {
        setSavedSection((current) => (current === section ? null : current));
      }, 2500);
    } catch {
      // handled by toast
    }
  };

  const handleRunCronJob = async (job: RunnableHotelCronJob) => {
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
                description="Hotel identity, contact details, location, accounting basics, and lock configuration."
                saved={savedSection === 'profile'}
                saving={isLoading || updateHotel.isPending}
                onSave={() => saveSection('profile')}
              />

              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                        accept="image/png,image/jpeg,image/webp"
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
                      Country
                    </label>
                    <select
                      value={form.country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    >
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      State
                    </label>
                    <select
                      value={form.state}
                      onChange={(e) => set('state', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    >
                      <option value="">Select state or province</option>
                      {selectedCountry.states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Currency
                    </label>
                    <select
                      value={form.currency}
                      onChange={(e) => set('currency', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    >
                      {availableCurrencies.map((currency) => (
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
                      {availableTimezones.map((timezone) => (
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

                <FeatureGate
                  flagKey="keycard_auth"
                  title="Lock Configuration"
                  description="Set the hotel-wide default vendor and credentials. Room-level lock mappings stay on each room record."
                >
                  <div className="mt-5 border-t border-[#1e2536] pt-5 space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-white">Lock Configuration</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Set the hotel-wide default vendor and credentials. Room-level lock mappings stay on each room record.
                        </p>
                      </div>
                      <span
                        className={`inline-flex self-start items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                          form.keycardAuthEnabled
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-600/40 bg-slate-700/30 text-slate-300'
                        }`}
                      >
                        {form.keycardAuthEnabled ? 'Keycard access enabled' : 'Keycard access disabled'}
                      </span>
                    </div>

                    <ToggleRow
                      title="Enable keycard access for this hotel"
                      description="Allows reservation and room surfaces to use the hotel’s lock configuration when the platform rollout is enabled."
                      enabled={form.keycardAuthEnabled}
                      onToggle={() => set('keycardAuthEnabled', !form.keycardAuthEnabled)}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                          Default Lock Vendor
                        </label>
                        <select
                          value={form.lockVendor}
                          onChange={(e) => set('lockVendor', e.target.value)}
                          className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                        >
                          {['MOCK', 'TTLOCK', 'VINGCARD', 'SAFLOK', 'ONITY', 'DORMAKABA', 'CUSTOM'].map((vendor) => (
                            <option key={vendor} value={vendor}>
                              {vendor}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                          Vendor API Key
                        </label>
                        <input
                          type="password"
                          value={form.lockApiKey}
                          onChange={(e) => set('lockApiKey', e.target.value)}
                          placeholder="Optional for MOCK provider"
                          className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                          Vendor API Config JSON
                        </label>
                        <textarea
                          value={form.lockApiConfig}
                          onChange={(e) => set('lockApiConfig', e.target.value)}
                          rows={8}
                          spellCheck={false}
                          className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 font-mono text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Store vendor-specific JSON like site identifiers, endpoints, or environment switches.
                        </p>
                      </div>
                    </div>
                  </div>
                </FeatureGate>
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
                    <ToggleRow
                      title="Auto-close stale previous-day sessions"
                      description="If staff forgot to clock out yesterday, close that open session automatically before the next clock-in."
                      enabled={form.attendanceAutoClockOutEnabled}
                      onToggle={() =>
                        set(
                          'attendanceAutoClockOutEnabled',
                          !form.attendanceAutoClockOutEnabled,
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Auto Clock-out Hour
                    </label>
                    <input
                      value={form.attendanceAutoClockOutHour}
                      onChange={(e) => set('attendanceAutoClockOutHour', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Auto Clock-out Minute
                    </label>
                    <input
                      value={form.attendanceAutoClockOutMinute}
                      onChange={(e) => set('attendanceAutoClockOutMinute', e.target.value)}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
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

                <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-3 text-sm text-slate-400">
                  Stale-session policy:
                  <span className="ml-2 text-slate-200">
                    {form.attendanceAutoClockOutEnabled
                      ? `Auto close open sessions at ${String(form.attendanceAutoClockOutHour || '0').padStart(2, '0')}:${String(form.attendanceAutoClockOutMinute || '0').padStart(2, '0')} hotel time before the next clock-in.`
                      : 'Managers must resolve previous-day open sessions manually.'}
                  </span>
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
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRunCronJob('attendanceAbsenceScan')}
                    disabled={runCronJob.isPending}
                    className="rounded-lg border border-[#1e2536] bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {runningJob === 'attendanceAbsenceScan'
                      ? 'Running absence scan...'
                      : 'Run attendance scan now'}
                  </button>
                </div>

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
                saving={isLoading || updateHotel.isPending || updateRealtimeSettings.isPending}
                onSave={() => saveSection('operations')}
              />

              <div className="space-y-5 rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
                <div className="grid gap-4 xl:grid-cols-2">
                  <ToggleRow
                    title="Hotel-wide realtime degradation alerts"
                    description="Turn off backend degradation emails and in-app system alerts for this hotel if they are filling up mailing and notifications."
                    enabled={form.realtimeDegradationAlertsEnabled}
                    onToggle={() =>
                      set(
                        'realtimeDegradationAlertsEnabled',
                        !form.realtimeDegradationAlertsEnabled,
                      )
                    }
                  />
                  <ToggleRow
                    title="Auto-retry outbound email delivery"
                    description="Retry transient email provider failures automatically. Leave this off if you want staff to decide when to retry."
                    enabled={form.emailAutoRetryEnabled}
                    onToggle={() => set('emailAutoRetryEnabled', !form.emailAutoRetryEnabled)}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
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
                    title="Send housekeeping follow-up alerts"
                    description="Notify housekeeping-capable staff when checkout prep work stays open too long."
                    enabled={form.housekeepingFollowUpEnabled}
                    onToggle={() =>
                      set('housekeepingFollowUpEnabled', !form.housekeepingFollowUpEnabled)
                    }
                  />
                </div>

                <div className="rounded-2xl border border-[#1e2536] bg-[#101522] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-white">Follow-up grace window</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Define how long housekeeping can leave checkout prep open before escalation starts.
                      </p>
                    </div>
                    <div className="w-full md:w-56">
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Grace Hours
                      </label>
                      <input
                        value={form.housekeepingFollowUpGraceHours}
                        onChange={(e) => set('housekeepingFollowUpGraceHours', e.target.value)}
                        className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#1e2536] bg-[#101522] p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-base font-semibold text-white">Automation timing setup</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Each workflow has its own toggle, run time, and health status so operations can tune them independently.
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                      Timezone: {schedulerTimezone}
                    </span>
                  </div>
                </div>

                <SchedulerAutomationCard
                  title="Upcoming arrivals"
                  description="Send a prep summary for reservations arriving on the next hotel-local day."
                  enabled={form.upcomingArrivalScanEnabled}
                  onToggle={() => set('upcomingArrivalScanEnabled', !form.upcomingArrivalScanEnabled)}
                  hourValue={form.upcomingArrivalScanHour}
                  minuteValue={form.upcomingArrivalScanMinute}
                  onHourChange={(value) => set('upcomingArrivalScanHour', value)}
                  onMinuteChange={(value) => set('upcomingArrivalScanMinute', value)}
                  statusTitle="Upcoming arrival status"
                  statusDescription="Daily prep alerts for the next day’s confirmed and pending arrivals."
                  health={upcomingArrivalHealth}
                  lastRun={upcomingArrivalStatus.lastRun}
                  nextRun={upcomingArrivalStatus.nextRun}
                  timezone={schedulerTimezone}
                  lastSuccess={upcomingArrivalStatus.lastSuccess}
                  lastFailure={upcomingArrivalStatus.lastFailure}
                  lastError={upcomingArrivalStatus.lastError}
                  onRun={() => handleRunCronJob('upcomingArrivalScan')}
                  isRunning={runningJob === 'upcomingArrivalScan'}
                  runLabel="Run upcoming arrival scan now"
                  runningLabel="Running upcoming arrival scan..."
                />

                <SchedulerAutomationCard
                  title="Checkout due"
                  description="Alert staff when checked-in reservations are due out today or already overdue."
                  enabled={form.checkoutDueScanEnabled}
                  onToggle={() => set('checkoutDueScanEnabled', !form.checkoutDueScanEnabled)}
                  hourValue={form.checkoutDueScanHour}
                  minuteValue={form.checkoutDueScanMinute}
                  onHourChange={(value) => set('checkoutDueScanHour', value)}
                  onMinuteChange={(value) => set('checkoutDueScanMinute', value)}
                  statusTitle="Checkout scheduler status"
                  statusDescription="Daily summary alerts run in the hotel timezone and target checked-in reservations that are due out or overdue."
                  health={checkoutHealth}
                  lastRun={checkoutStatus.lastRun}
                  nextRun={checkoutStatus.nextRun}
                  timezone={schedulerTimezone}
                  lastSuccess={checkoutStatus.lastSuccess}
                  lastFailure={checkoutStatus.lastFailure}
                  lastError={checkoutStatus.lastError}
                  onRun={() => handleRunCronJob('checkoutDueScan')}
                  isRunning={runningJob === 'checkoutDueScan'}
                  runLabel="Run checkout scan now"
                  runningLabel="Running checkout scan..."
                />

                <SchedulerAutomationCard
                  title="Overdue payments"
                  description="Alert finance-capable staff when checked-out or overdue stays still have an outstanding balance."
                  enabled={form.overduePaymentScanEnabled}
                  onToggle={() => set('overduePaymentScanEnabled', !form.overduePaymentScanEnabled)}
                  hourValue={form.overduePaymentScanHour}
                  minuteValue={form.overduePaymentScanMinute}
                  onHourChange={(value) => set('overduePaymentScanHour', value)}
                  onMinuteChange={(value) => set('overduePaymentScanMinute', value)}
                  statusTitle="Overdue payment status"
                  statusDescription="Daily follow-up alerts for reservations whose checkout date has passed while a balance is still outstanding."
                  health={overduePaymentHealth}
                  lastRun={overduePaymentStatus.lastRun}
                  nextRun={overduePaymentStatus.nextRun}
                  timezone={schedulerTimezone}
                  lastSuccess={overduePaymentStatus.lastSuccess}
                  lastFailure={overduePaymentStatus.lastFailure}
                  lastError={overduePaymentStatus.lastError}
                  onRun={() => handleRunCronJob('overduePaymentScan')}
                  isRunning={runningJob === 'overduePaymentScan'}
                  runLabel="Run overdue payment scan now"
                  runningLabel="Running overdue payment scan..."
                />

                <SchedulerAutomationCard
                  title="Housekeeping follow-up"
                  description="Escalate checkout prep tasks that remain open past the grace window."
                  enabled={form.housekeepingFollowUpScanEnabled}
                  onToggle={() =>
                    set('housekeepingFollowUpScanEnabled', !form.housekeepingFollowUpScanEnabled)
                  }
                  hourValue={form.housekeepingFollowUpScanHour}
                  minuteValue={form.housekeepingFollowUpScanMinute}
                  onHourChange={(value) => set('housekeepingFollowUpScanHour', value)}
                  onMinuteChange={(value) => set('housekeepingFollowUpScanMinute', value)}
                  statusTitle="Housekeeping follow-up status"
                  statusDescription="Daily follow-up alerts for checkout prep tasks still open after the configured grace window."
                  health={housekeepingFollowUpHealth}
                  lastRun={housekeepingFollowUpStatus.lastRun}
                  nextRun={housekeepingFollowUpStatus.nextRun}
                  timezone={schedulerTimezone}
                  lastSuccess={housekeepingFollowUpStatus.lastSuccess}
                  lastFailure={housekeepingFollowUpStatus.lastFailure}
                  lastError={housekeepingFollowUpStatus.lastError}
                  onRun={() => handleRunCronJob('housekeepingFollowUpScan')}
                  isRunning={runningJob === 'housekeepingFollowUpScan'}
                  runLabel="Run housekeeping follow-up now"
                  runningLabel="Running follow-up scan..."
                  extraFields={
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Escalation Trigger
                      </label>
                      <div className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-300">
                        Alerts start after {form.housekeepingFollowUpGraceHours || '0'} grace hour(s).
                      </div>
                    </div>
                  }
                />

                <SchedulerAutomationCard
                  title="No-show follow-up"
                  description="Highlight arrivals that should be checked in, cancelled, or marked as no-show."
                  enabled={form.noShowFollowUpScanEnabled}
                  onToggle={() => set('noShowFollowUpScanEnabled', !form.noShowFollowUpScanEnabled)}
                  hourValue={form.noShowFollowUpScanHour}
                  minuteValue={form.noShowFollowUpScanMinute}
                  onHourChange={(value) => set('noShowFollowUpScanHour', value)}
                  onMinuteChange={(value) => set('noShowFollowUpScanMinute', value)}
                  statusTitle="No-show follow-up status"
                  statusDescription="Daily front-desk follow-up for arrivals that are still pending after their check-in date."
                  health={noShowFollowUpHealth}
                  lastRun={noShowFollowUpStatus.lastRun}
                  nextRun={noShowFollowUpStatus.nextRun}
                  timezone={schedulerTimezone}
                  lastSuccess={noShowFollowUpStatus.lastSuccess}
                  lastFailure={noShowFollowUpStatus.lastFailure}
                  lastError={noShowFollowUpStatus.lastError}
                  onRun={() => handleRunCronJob('noShowFollowUpScan')}
                  isRunning={runningJob === 'noShowFollowUpScan'}
                  runLabel="Run no-show follow-up now"
                  runningLabel="Running no-show follow-up..."
                />

                <SchedulerAutomationCard
                  title="Maintenance escalation"
                  description="Escalate urgent or high-priority maintenance requests that stay unresolved."
                  enabled={form.maintenanceEscalationScanEnabled}
                  onToggle={() =>
                    set(
                      'maintenanceEscalationScanEnabled',
                      !form.maintenanceEscalationScanEnabled,
                    )
                  }
                  hourValue={form.maintenanceEscalationScanHour}
                  minuteValue={form.maintenanceEscalationScanMinute}
                  onHourChange={(value) => set('maintenanceEscalationScanHour', value)}
                  onMinuteChange={(value) => set('maintenanceEscalationScanMinute', value)}
                  statusTitle="Maintenance escalation status"
                  statusDescription="Daily escalation alerts for urgent or high-priority maintenance requests that remain unresolved."
                  health={maintenanceEscalationHealth}
                  lastRun={maintenanceEscalationStatus.lastRun}
                  nextRun={maintenanceEscalationStatus.nextRun}
                  timezone={schedulerTimezone}
                  lastSuccess={maintenanceEscalationStatus.lastSuccess}
                  lastFailure={maintenanceEscalationStatus.lastFailure}
                  lastError={maintenanceEscalationStatus.lastError}
                  onRun={() => handleRunCronJob('maintenanceEscalationScan')}
                  isRunning={runningJob === 'maintenanceEscalationScan'}
                  runLabel="Run maintenance escalation now"
                  runningLabel="Running maintenance escalation..."
                />

                <SchedulerAutomationCard
                  title="Daily digest"
                  description="Send a daily operational summary covering arrivals, departures, payments, and open issues."
                  enabled={form.dailyDigestScanEnabled}
                  onToggle={() => set('dailyDigestScanEnabled', !form.dailyDigestScanEnabled)}
                  hourValue={form.dailyDigestScanHour}
                  minuteValue={form.dailyDigestScanMinute}
                  onHourChange={(value) => set('dailyDigestScanHour', value)}
                  onMinuteChange={(value) => set('dailyDigestScanMinute', value)}
                  statusTitle="Daily digest status"
                  statusDescription="Daily summary alerts for key arrivals, departures, finances, housekeeping, and maintenance signals."
                  health={dailyDigestHealth}
                  lastRun={dailyDigestStatus.lastRun}
                  nextRun={dailyDigestStatus.nextRun}
                  timezone={schedulerTimezone}
                  lastSuccess={dailyDigestStatus.lastSuccess}
                  lastFailure={dailyDigestStatus.lastFailure}
                  lastError={dailyDigestStatus.lastError}
                  onRun={() => handleRunCronJob('dailyDigestScan')}
                  isRunning={runningJob === 'dailyDigestScan'}
                  runLabel="Run daily digest now"
                  runningLabel="Running daily digest..."
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
