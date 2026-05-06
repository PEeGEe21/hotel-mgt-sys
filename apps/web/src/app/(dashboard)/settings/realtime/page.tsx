'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  Clock3,
  Radio,
  RefreshCw,
  ShieldAlert,
  Wifi,
  WifiOff,
  Save,
  Loader2,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useRealtimeDiagnostics } from '@/hooks/useRealtimeDiagnostics';
import { useRealtimeDiagnosticsHistory } from '@/hooks/useRealtimeDiagnosticsHistory';
import { useRealtimeSettings, useUpdateRealtimeSettings } from '@/hooks/useRealtimeSettings';

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function connectionTone(connectionState: string, hasError: boolean) {
  if (connectionState === 'connected') {
    return {
      label: 'Connected',
      className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
      icon: Wifi,
    };
  }

  if (connectionState === 'reconnecting' || connectionState === 'connecting') {
    return {
      label: connectionState === 'reconnecting' ? 'Reconnecting' : 'Connecting',
      className: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
      icon: RefreshCw,
    };
  }

  return {
    label: hasError ? 'Disconnected' : 'Idle',
    className: 'border-red-500/20 bg-red-500/10 text-red-300',
    icon: WifiOff,
  };
}

function moduleTone(isStale: boolean, eventCount: number) {
  if (isStale) {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  }
  if (eventCount > 0) {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  }
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function persistedModuleTone(activeDegradation: boolean, isStale: boolean, eventCount: number) {
  if (activeDegradation) {
    return 'border-red-500/20 bg-red-500/10 text-red-300';
  }
  return moduleTone(isStale, eventCount);
}

function summaryTone(health: 'alerting' | 'stale' | 'healthy' | 'waiting') {
  if (health === 'alerting') return 'border-red-500/20 bg-red-500/10 text-red-300';
  if (health === 'stale') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (health === 'healthy') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

export default function RealtimeSettingsPage() {
  const router = useRouter();
  const { ready, isAdmin } = usePermissions();
  const diagnostics = useRealtimeDiagnostics();
  const { data: history, isLoading: historyLoading } = useRealtimeDiagnosticsHistory(50);
  const { data: realtimeSettings, isLoading: settingsLoading } = useRealtimeSettings();
  const updateRealtimeSettings = useUpdateRealtimeSettings();
  const [form, setForm] = useState({
    alertsEnabled: true,
    alertCooldownMinutes: '180',
    retentionDays: '14',
    notifications: '120',
    posOrders: '120',
    prep: '120',
    housekeeping: '120',
    facilities: '120',
    presence: '180',
  });

  useEffect(() => {
    if (!realtimeSettings) return;
    setForm({
      alertsEnabled: realtimeSettings.alertsEnabled,
      alertCooldownMinutes: String(realtimeSettings.alertCooldownMinutes),
      retentionDays: String(realtimeSettings.retentionDays),
      notifications: String(realtimeSettings.staleThresholds.notifications),
      posOrders: String(realtimeSettings.staleThresholds.posOrders),
      prep: String(realtimeSettings.staleThresholds.prep),
      housekeeping: String(realtimeSettings.staleThresholds.housekeeping),
      facilities: String(realtimeSettings.staleThresholds.facilities),
      presence: String(realtimeSettings.staleThresholds.presence),
    });
  }, [realtimeSettings]);

  const summary = useMemo(() => {
    const staleCount = diagnostics.modules.filter((item) => item.isStale).length;
    const activeCount = diagnostics.modules.filter((item) => item.eventCount > 0).length;
    return { staleCount, activeCount };
  }, [diagnostics.modules]);

  const historySummary = useMemo(() => {
    const modules = history?.modules ?? [];
    return {
      staleCount: modules.filter((item) => item.isStale).length,
      activeCount: modules.filter((item) => item.eventCount > 0).length,
      degradedCount: modules.filter((item) => item.activeDegradation).length,
    };
  }, [history?.modules]);

  const connection = connectionTone(diagnostics.connectionState, Boolean(diagnostics.lastError));
  const ConnectionIcon = connection.icon;

  const saveSettings = () => {
    updateRealtimeSettings.mutate({
      alertsEnabled: form.alertsEnabled,
      alertCooldownMinutes: Number(form.alertCooldownMinutes || 180),
      retentionDays: Number(form.retentionDays || 14),
      staleThresholds: {
        notifications: Number(form.notifications || 120),
        posOrders: Number(form.posOrders || 120),
        prep: Number(form.prep || 120),
        housekeeping: Number(form.housekeeping || 120),
        facilities: Number(form.facilities || 120),
        presence: Number(form.presence || 180),
      },
    });
  };

  if (!ready) {
    return (
      <div className="space-y-6 max-w-full">
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-6 text-sm text-slate-400">
          Loading realtime diagnostics...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Realtime Diagnostics</h1>
            <p className="text-slate-500 text-sm mt-0.5">Admin-only operational telemetry</p>
          </div>
        </div>

        <div className="max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-slate-200">
          <ShieldAlert className="mb-3 text-red-300" size={24} />
          <h2 className="text-lg font-bold text-white">Access denied</h2>
          <p className="mt-2 text-sm text-slate-300">
            This page is restricted to admin users because it exposes internal live-update health.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Realtime Diagnostics</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Admin-only visibility into websocket health across operational modules
            </p>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${connection.className}`}
        >
          <ConnectionIcon
            size={13}
            className={diagnostics.connectionState === 'reconnecting' ? 'animate-spin' : ''}
          />
          {connection.label}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">Socket Health</p>
          <p className="mt-2 text-2xl font-bold text-white">{connection.label}</p>
          <p className="mt-1 text-xs text-slate-500">
            Ready at {formatDateTime(diagnostics.lastReadyAt)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">Modules Active</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.activeCount}</p>
          <p className="mt-1 text-xs text-slate-500">
            of {diagnostics.modules.length} tracked modules have seen live traffic
          </p>
        </div>
        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">Stale Modules</p>
          <p className="mt-2 text-2xl font-bold text-white">{summary.staleCount}</p>
          <p className="mt-1 text-xs text-slate-500">
            connected modules quiet for more than two minutes
          </p>
        </div>
        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">Last Error</p>
          <p className="mt-2 text-sm font-semibold text-slate-200">
            {diagnostics.lastError ?? 'None recorded'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(diagnostics.lastErrorAt)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Alert Policy</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Retention, alert cooldown, and module-specific stale thresholds
            </p>
          </div>
          <button
            onClick={saveSettings}
            disabled={settingsLoading || updateRealtimeSettings.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {updateRealtimeSettings.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save policy
          </button>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Alerting</p>
            <button
              onClick={() => setForm((current) => ({ ...current, alertsEnabled: !current.alertsEnabled }))}
              className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${
                form.alertsEnabled
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-500/20 bg-slate-500/10 text-slate-300'
              }`}
            >
              {form.alertsEnabled ? 'Enabled' : 'Disabled'}
            </button>
            <div className="mt-4">
              <p className="text-xs text-slate-500">Cooldown (minutes)</p>
              <input
                value={form.alertCooldownMinutes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, alertCooldownMinutes: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-[#1e2536] bg-[#111722] px-3 py-2 text-sm text-slate-200 outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Retention</p>
            <p className="mt-2 text-sm text-slate-400">
              Old realtime event logs are cleaned up automatically based on this window.
            </p>
            <div className="mt-4">
              <p className="text-xs text-slate-500">Retention (days)</p>
              <input
                value={form.retentionDays}
                onChange={(event) =>
                  setForm((current) => ({ ...current, retentionDays: event.target.value }))
                }
                className="mt-2 w-full rounded-lg border border-[#1e2536] bg-[#111722] px-3 py-2 text-sm text-slate-200 outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Current Policy</p>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <p>Alerts: {history?.settings.alertsEnabled ? 'Enabled' : 'Disabled'}</p>
              <p>Cooldown: {history?.settings.alertCooldownMinutes ?? '—'} minutes</p>
              <p>Retention: {history?.settings.retentionDays ?? '—'} days</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['notifications', 'Notifications'],
            ['posOrders', 'POS Orders'],
            ['prep', 'Prep Board'],
            ['housekeeping', 'Housekeeping'],
            ['facilities', 'Facilities'],
            ['presence', 'Presence'],
          ].map(([key, label]) => (
            <div key={key} className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
              <p className="mt-2 text-xs text-slate-500">Stale threshold (seconds)</p>
              <input
                value={form[key as keyof typeof form] as string}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-lg border border-[#1e2536] bg-[#111722] px-3 py-2 text-sm text-slate-200 outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">System History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Persisted server-side module health for this hotel
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Snapshot {formatDateTime(history?.generatedAt ?? null)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Modules Active</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {historyLoading ? '—' : historySummary.activeCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Hotel-wide persisted activity</p>
          </div>
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Stale Modules</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {historyLoading ? '—' : historySummary.staleCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Using module-specific stale thresholds</p>
          </div>
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Last Server Event</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">
              {formatDateTime(history?.recentEvents?.[0]?.timestamp ?? null)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {history?.recentEvents?.[0]?.summary ?? 'No persisted events yet'}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Active Alerts</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {historyLoading ? '—' : historySummary.degradedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">Modules currently in degraded alert state</p>
          </div>
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Coverage</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {historyLoading ? '—' : history?.modules.length ?? 0}
            </p>
            <p className="mt-1 text-xs text-slate-500">Tracked realtime streams</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Trend Summary</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Seven-day realtime activity and incident trend from persisted history
            </p>
          </div>
          <div className="text-xs text-slate-500">
            24h: {history?.overview.totalEvents24h ?? 0} events
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Events 7d</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {history?.overview.totalEvents7d ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Events 24h</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {history?.overview.totalEvents24h ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Degraded 7d</p>
            <p className="mt-2 text-2xl font-bold text-red-300">
              {history?.overview.degradedEvents7d ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Recovered 7d</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {history?.overview.recoveredEvents7d ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-7">
          {(history?.trend ?? []).map((point) => (
            <div key={point.date} className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">{point.date.slice(5)}</p>
              <p className="mt-2 text-lg font-bold text-white">{point.totalEvents}</p>
              <p className="mt-1 text-xs text-red-300">{point.degradedEvents} degraded</p>
              <p className="text-xs text-emerald-300">{point.recoveredEvents} recovered</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Module Health Summaries</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Short operational rollup by module over the last seven days
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {(history?.moduleHealthSummaries ?? []).map((module) => (
            <div
              key={module.key}
              className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{module.label}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    24h {module.totalEvents24h} events • 7d {module.totalEvents7d} events
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${summaryTone(module.health)}`}
                >
                  {module.health}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-[#1e2536] bg-[#111722] p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Incidents 7d</p>
                  <p className="mt-2 font-semibold text-red-300">{module.degradedEvents7d}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Last degraded {formatDateTime(module.lastDegradedAt)}
                  </p>
                </div>
                <div className="rounded-lg border border-[#1e2536] bg-[#111722] p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Recoveries 7d</p>
                  <p className="mt-2 font-semibold text-emerald-300">{module.recoveredEvents7d}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Last recovered {formatDateTime(module.lastRecoveredAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Module Health</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Last event, activity count, and stale status for each realtime stream
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Connected {formatDateTime(diagnostics.connectedAt)}
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {diagnostics.modules.map((module) => (
            <div
              key={module.key}
              className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Radio size={14} className="text-sky-400" />
                    <h3 className="text-sm font-semibold text-white">{module.label}</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{module.description}</p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${moduleTone(module.isStale, module.eventCount)}`}
                >
                  {module.isStale ? 'Stale' : module.eventCount > 0 ? 'Active' : 'Waiting'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-[#1e2536] bg-[#111722] p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Last Event</p>
                  <p className="mt-2 font-semibold text-slate-100">
                    {formatDateTime(module.lastEventAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {module.lastEventType ?? module.eventName}
                  </p>
                </div>
                <div className="rounded-lg border border-[#1e2536] bg-[#111722] p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Event Count</p>
                  <p className="mt-2 font-semibold text-slate-100">{module.eventCount}</p>
                  <p className="mt-1 text-xs text-slate-500">Current browser session</p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-[#1e2536] bg-[#111722] p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Latest Summary</p>
                <p className="mt-2 text-sm text-slate-300">
                  {module.lastSummary ?? 'No events captured on this page yet.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Persisted Module Health</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Server-side last-seen event state for each tracked module
            </p>
          </div>
          <div className="text-xs text-slate-500">Hotel-wide view</div>
        </div>

        {historyLoading ? (
          <div className="mt-4 text-sm text-slate-500">Loading persisted module health...</div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {(history?.modules ?? []).map((module) => (
              <div
                key={module.key}
                className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Radio size={14} className="text-cyan-400" />
                      <h3 className="text-sm font-semibold text-white">{module.label}</h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{module.description}</p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${persistedModuleTone(module.activeDegradation, module.isStale, module.eventCount)}`}
                  >
                    {module.activeDegradation
                      ? 'Alerting'
                      : module.isStale
                        ? 'Stale'
                        : module.eventCount > 0
                          ? 'Active'
                          : 'Waiting'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-[#1e2536] bg-[#111722] p-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Last Event</p>
                    <p className="mt-2 font-semibold text-slate-100">
                      {formatDateTime(module.lastEventAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {module.lastEventType ?? module.eventName}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#1e2536] bg-[#111722] p-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Event Count</p>
                    <p className="mt-2 font-semibold text-slate-100">{module.eventCount}</p>
                    <p className="mt-1 text-xs text-slate-500">Stored total for this hotel</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-[#1e2536] bg-[#111722] p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Latest Summary</p>
                  <p className="mt-2 text-sm text-slate-300">
                    {module.lastSummary ?? 'No persisted events captured yet.'}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-[#1e2536] bg-[#111722] p-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Degraded Since</p>
                    <p className="mt-2 font-semibold text-slate-100">
                      {formatDateTime(module.degradedSince)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {module.activeDegradation
                        ? 'Backend alert is currently active'
                        : 'No active degradation right now'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#1e2536] bg-[#111722] p-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Last Alerted</p>
                    <p className="mt-2 font-semibold text-slate-100">
                      {formatDateTime(module.lastAlertedAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Last recovered {formatDateTime(module.lastRecoveredAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#1e2536] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Recent Event Feed</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Last 25 realtime events observed in this admin session
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3 size={12} />
            Session-local view
          </div>
        </div>

        {diagnostics.recentEvents.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            Waiting for live events. Keep this page open while using operational screens to watch traffic.
          </div>
        ) : (
          <div className="divide-y divide-[#1e2536]">
            {diagnostics.recentEvents.map((event) => (
              <div
                key={event.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[170px_170px_180px_minmax(0,1fr)]"
              >
                <div className="text-xs text-slate-400">{formatDateTime(event.timestamp)}</div>
                <div className="text-sm font-medium text-slate-200">{event.label}</div>
                <div className="text-xs text-sky-300">{event.type}</div>
                <div className="text-sm text-slate-400">{event.summary}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#1e2536] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Persisted Event History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Server-side recent event trail for this hotel
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3 size={12} />
            Shared across admin sessions
          </div>
        </div>

        {historyLoading ? (
          <div className="px-4 py-6 text-sm text-slate-500">Loading persisted events...</div>
        ) : !history?.recentEvents?.length ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            No persisted realtime events yet for this hotel.
          </div>
        ) : (
          <div className="divide-y divide-[#1e2536]">
            {history.recentEvents.map((event) => (
              <div
                key={event.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[170px_170px_180px_minmax(0,1fr)]"
              >
                <div className="text-xs text-slate-400">{formatDateTime(event.timestamp)}</div>
                <div className="text-sm font-medium text-slate-200">{event.module}</div>
                <div className="text-xs text-cyan-300">{event.type}</div>
                <div className="text-sm text-slate-400">{event.summary}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Activity size={14} className="text-amber-400" />
          Notes
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-400">
          <p>This page reflects events seen by this browser session after the page opens.</p>
          <p>“Stale” means the websocket is connected but a module has been quiet for over two minutes.</p>
          <p>“Alerting” means the backend degradation scanner has flagged the module and notified management with cooldown protection.</p>
          <p>Quiet modules are not always broken; they may simply have no recent traffic.</p>
        </div>
      </div>
    </div>
  );
}
