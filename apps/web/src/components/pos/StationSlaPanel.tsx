'use client';

import Link from 'next/link';
import { ChefHat, Martini, Timer, TriangleAlert, CheckCircle2, ArrowUpRight, Loader2 } from 'lucide-react';
import { usePrepBoard, usePrepRealtime, type PrepBoardResponse, type PrepStation } from '@/hooks/pos/usePrepBoard';

const STATION_META = {
  KITCHEN: {
    label: 'Kitchen',
    icon: ChefHat,
    targetMinutes: 15,
    iconClass: 'text-orange-400',
    chipClass: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    href: '/kitchen',
  },
  BAR: {
    label: 'Bar',
    icon: Martini,
    targetMinutes: 10,
    iconClass: 'text-sky-400',
    chipClass: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    href: '/bar',
  },
} as const;

function getLongestWaitingTicket(data: PrepBoardResponse | undefined) {
  const tickets = data?.tickets ?? [];
  if (!tickets.length) return null;
  return tickets.reduce((oldest, current) =>
    current.ageMinutes > oldest.ageMinutes ? current : oldest,
  );
}

function statusTone(ageMinutes: number, targetMinutes: number) {
  if (ageMinutes > targetMinutes) {
    return {
      label: 'At Risk',
      className: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      icon: TriangleAlert,
    };
  }
  return {
    label: 'Healthy',
    className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    icon: CheckCircle2,
  };
}

function StationCard({ station }: { station: Exclude<PrepStation, 'NONE'> }) {
  const meta = STATION_META[station];
  const { data, isLoading } = usePrepBoard(station);
  const longest = getLongestWaitingTicket(data);
  const tone = statusTone(longest?.ageMinutes ?? 0, meta.targetMinutes);
  const ToneIcon = tone.icon;
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon size={15} className={meta.iconClass} />
            <h3 className="text-sm font-semibold text-white">{meta.label} SLA</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">Target {meta.targetMinutes} min max wait</p>
        </div>
        <Link
          href={meta.href}
          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
        >
          Open
          <ArrowUpRight size={12} />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-28 items-center justify-center text-slate-400">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading...
        </div>
      ) : longest ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.className}`}>
              <ToneIcon size={12} className="mr-1 inline" />
              {tone.label}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.chipClass}`}>
              {data?.summary.totalTickets ?? 0} active tickets
            </span>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Longest Wait</p>
            <p className="mt-1 text-2xl font-bold text-white">{longest.ageMinutes} min</p>
            <p className="mt-1 text-xs text-slate-400">
              {longest.orderNo} · {longest.tableNo ? `Table ${longest.tableNo}` : longest.roomNo ? `Room ${longest.roomNo}` : longest.type}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-[#0f1117] px-2 py-2">
              <p className="text-slate-500">Queued</p>
              <p className="mt-1 font-semibold text-amber-400">{data?.summary.counts.queued ?? 0}</p>
            </div>
            <div className="rounded-lg bg-[#0f1117] px-2 py-2">
              <p className="text-slate-500">Prep</p>
              <p className="mt-1 font-semibold text-sky-400">{data?.summary.counts.inProgress ?? 0}</p>
            </div>
            <div className="rounded-lg bg-[#0f1117] px-2 py-2">
              <p className="text-slate-500">Ready</p>
              <p className="mt-1 font-semibold text-emerald-400">{data?.summary.counts.ready ?? 0}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-[#2a3348] bg-[#0f1117] text-center">
          <Timer size={16} className="mb-2 text-slate-600" />
          <p className="text-sm text-slate-300">No active tickets</p>
          <p className="mt-1 text-xs text-slate-500">This station is clear right now.</p>
        </div>
      )}
    </div>
  );
}

export default function StationSlaPanel() {
  usePrepRealtime('KITCHEN');
  usePrepRealtime('BAR');

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <StationCard station="KITCHEN" />
      <StationCard station="BAR" />
    </div>
  );
}
