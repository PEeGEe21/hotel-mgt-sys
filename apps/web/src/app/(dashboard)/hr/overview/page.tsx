'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileClock,
  RefreshCw,
  TrendingUp,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  useHrContractsOverview,
  useRunHrContractNotificationsScan,
} from '@/hooks/hr/useHrContracts';

const DEPARTMENT_COLORS = [
  '#38bdf8',
  '#34d399',
  '#f59e0b',
  '#a78bfa',
  '#fb7185',
  '#22d3ee',
  '#f97316',
  '#818cf8',
];

function formatMoney(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toISOString().slice(0, 10);
}

function humanizeRole(value: string | null | undefined) {
  if (!value) return 'Approval';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  bg,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-2xl border px-4 py-4`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <Icon size={16} className={tone} />
      </div>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function HrOverviewPage() {
  const overviewQuery = useHrContractsOverview();
  const runNotificationsScan = useRunHrContractNotificationsScan();

  const overview = overviewQuery.data;
  const summary = overview?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">HR Overview</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Live contract reporting for coverage, approvals, renewals, terminations, and salary
            exposure.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-[#1e2536] bg-[#111622] px-3 py-2 text-xs text-slate-400">
            Warning window: {overview?.settings.contractExpiryWarningDays ?? 60} days
          </div>
          <button
            onClick={() => void runNotificationsScan.mutateAsync()}
            disabled={runNotificationsScan.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#161b27] px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-[#1b2130] disabled:opacity-60"
          >
            <RefreshCw size={14} className={runNotificationsScan.isPending ? 'animate-spin' : ''} />
            {runNotificationsScan.isPending ? 'Scanning…' : 'Run Notifications Scan'}
          </button>
        </div>
      </div>

      {overviewQuery.isLoading ? (
        <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-6 text-sm text-slate-400">
          Loading HR reporting overview...
        </div>
      ) : null}

      {overviewQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
          Could not load HR overview right now.
        </div>
      ) : null}

      {overview ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
            <SummaryCard
              label="Total Staff"
              value={summary?.totalStaff.toLocaleString() ?? '0'}
              hint={`${summary?.contractCoveragePct ?? 0}% covered by live contracts`}
              icon={Users}
              tone="text-blue-300"
              bg="border-blue-500/20 bg-blue-500/10"
            />
            <SummaryCard
              label="Live Contracts"
              value={summary?.activeContracts.toLocaleString() ?? '0'}
              hint="Active plus expiring-soon contracts"
              icon={CheckCircle2}
              tone="text-emerald-300"
              bg="border-emerald-500/20 bg-emerald-500/10"
            />
            <SummaryCard
              label="Pending Approval"
              value={summary?.pendingApprovals.toLocaleString() ?? '0'}
              hint={`${summary?.approvalBacklogOver3Days ?? 0} waiting 3+ days`}
              icon={Clock3}
              tone="text-amber-300"
              bg="border-amber-500/20 bg-amber-500/10"
            />
            <SummaryCard
              label="Monthly Commitment"
              value={formatMoney(summary?.monthlyCommitment ?? 0)}
              hint="Current live-contract salary exposure"
              icon={TrendingUp}
              tone="text-fuchsia-300"
              bg="border-fuchsia-500/20 bg-fuchsia-500/10"
            />
            <SummaryCard
              label="Expiring Soon"
              value={summary?.expiringSoon.toLocaleString() ?? '0'}
              hint="Needs renewal or exit planning"
              icon={AlertTriangle}
              tone="text-orange-300"
              bg="border-orange-500/20 bg-orange-500/10"
            />
            <SummaryCard
              label="Renewals 90d"
              value={summary?.renewalsLast90Days.toLocaleString() ?? '0'}
              hint={`${summary?.terminatedLast30Days ?? 0} terminations in last 30 days`}
              icon={BriefcaseBusiness}
              tone="text-cyan-300"
              bg="border-cyan-500/20 bg-cyan-500/10"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Department Coverage</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Staff headcount, live contracts, and current salary exposure by department.
                  </p>
                </div>
                <UserRoundCheck size={16} className="text-blue-300" />
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-3">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={overview.headcountByDepartment}
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={98}
                        paddingAngle={3}
                        dataKey="staffCount"
                        nameKey="department"
                      >
                        {overview.headcountByDepartment.map((row, index) => (
                          <Cell
                            key={row.department}
                            fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#0f1117',
                          border: '1px solid #1e2536',
                          borderRadius: '12px',
                          color: '#e2e8f0',
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                        formatter={(value: number, _name, item: any) => [
                          `${value} staff`,
                          item?.payload?.department ?? 'Department',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {overview.headcountByDepartment.map((row, index) => (
                    <div
                      key={row.department}
                      className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                background: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
                              }}
                            />
                            <p className="truncate text-sm font-semibold text-white">
                              {row.department}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.staffCount} staff · {row.activeContracts} live contracts
                          </p>
                        </div>
                        <p className="text-right text-xs font-medium text-emerald-300">
                          {formatMoney(row.monthlyCommitment)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {!overview.headcountByDepartment.length ? (
                <p className="text-sm text-slate-500">No department coverage data yet.</p>
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-white">Contract Status Mix</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Current lifecycle distribution across all contract records.
                  </p>
                </div>
                <div className="space-y-3">
                  {overview.contractStatusDistribution.map((row) => (
                    <div key={row.status}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-slate-300">{row.label}</span>
                        <span className="font-semibold text-white">{row.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#101827]">
                        <div
                          className="h-2 rounded-full bg-violet-400"
                          style={{ width: `${Math.max(row.sharePct, 8)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-white">Contract Type Mix</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    How current contract records are spread by employment type.
                  </p>
                </div>
                <div className="space-y-3">
                  {overview.contractTypeDistribution.map((row) => (
                    <div key={row.type} className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{row.label}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.count} contracts · {formatMoney(row.monthlyCommitment)}
                          </p>
                        </div>
                        <p className="text-xs font-medium text-cyan-300">{row.sharePct}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Compensation Change Trend</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Last 6 months of contract-linked compensation changes.
                  </p>
                </div>
                <TrendingUp size={16} className="text-fuchsia-300" />
              </div>
              <div className="grid grid-cols-6 gap-3">
                {overview.compensationTrend.map((row) => (
                  <div key={row.month} className="flex min-h-[220px] flex-col justify-end">
                    <div className="mb-3 text-center text-[11px] text-slate-500">
                      {row.changeCount} change{row.changeCount === 1 ? '' : 's'}
                    </div>
                    <div className="relative flex h-40 items-end justify-center rounded-t-2xl bg-[#0f1117] px-2 pb-3 pt-4">
                      <div
                        className="w-full rounded-xl bg-gradient-to-t from-fuchsia-500 to-cyan-400"
                        style={{ height: `${Math.max(row.barPct, row.totalAmount ? 12 : 2)}%` }}
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-xs font-medium text-slate-300">{row.label}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatMoney(row.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Expiring Soon</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Contracts ending within {overview.settings.contractExpiryWarningDays} days.
                    </p>
                  </div>
                  <AlertTriangle size={16} className="text-amber-300" />
                </div>
                <div className="space-y-3">
                  {overview.expiringContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">
                            {contract.staffNameSnapshot}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {contract.contractNo} · {contract.departmentSnapshot} · {contract.positionSnapshot}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-amber-300">
                            {contract.daysToExpiry === 0
                              ? 'Ends today'
                              : `${contract.daysToExpiry ?? 0} day${contract.daysToExpiry === 1 ? '' : 's'}`}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">{formatDate(contract.endDate)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!overview.expiringContracts.length ? (
                    <p className="text-sm text-slate-500">No contracts are close to expiry right now.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Approval Queue</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Contracts waiting on the next approval step.
                    </p>
                  </div>
                  <FileClock size={16} className="text-blue-300" />
                </div>
                <div className="space-y-3">
                  {overview.approvalQueue.map((contract) => (
                    <div
                      key={contract.id}
                      className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">
                            {contract.staffNameSnapshot}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {contract.contractNo} · {contract.departmentSnapshot}
                          </p>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-blue-300">
                            Step {contract.pendingStepOrder ?? '—'} · {humanizeRole(contract.pendingRole)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-amber-300">
                            {contract.pendingDays ?? 0} day{contract.pendingDays === 1 ? '' : 's'}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Submitted {formatDate(contract.submittedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!overview.approvalQueue.length ? (
                    <p className="text-sm text-slate-500">No approvals need attention right now.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white">Recent HR Contract Activity</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Latest contract actions flowing through approvals, renewals, documents, and exits.
                </p>
              </div>
              <div className="space-y-3">
                {overview.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          {activity.actionLabel}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(activity.contractNo ?? 'Contract')} · {activity.staffNameSnapshot ?? 'Staff record'}
                        </p>
                        {activity.fromStatus || activity.toStatus ? (
                          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                            {activity.fromStatus ? activity.fromStatus.replaceAll('_', ' ') : '—'}
                            {' → '}
                            {activity.toStatus ? activity.toStatus.replaceAll('_', ' ') : '—'}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-500">{formatDate(activity.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {!overview.recentActivity.length ? (
                  <p className="text-sm text-slate-500">No recent HR contract activity yet.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white">Approval Performance</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Where approvals are currently sitting and which roles are clearing work.
                </p>
              </div>
              <div className="space-y-3">
                {overview.approvalPerformance.map((row) => (
                  <div
                    key={row.role}
                    className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{row.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.openCount} open · {row.completedStepsLast30Days} completed in last 30 days
                        </p>
                      </div>
                      <p className="text-xs font-medium text-amber-300">
                        {row.averagePendingDays}d avg
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      <span>Backlog</span>
                      <span>{row.backlogCount} over threshold</span>
                    </div>
                  </div>
                ))}
                {!overview.approvalPerformance.length ? (
                  <p className="text-sm text-slate-500">No approval performance data yet.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Department Contract Health</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Teams with the most renewal pressure, approval load, and recent churn.
                  </p>
                </div>
                <Users size={16} className="text-cyan-300" />
              </div>
              <div className="space-y-3">
                {overview.departmentContractHealth.map((row) => (
                  <div
                    key={row.department}
                    className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{row.department}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.liveContracts} live · {row.expiringSoon} expiring soon
                        </p>
                      </div>
                      <p className="text-xs font-medium text-rose-300">
                        {row.terminationsLast90Days} exits / 90d
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-[#111622] px-2 py-2 text-slate-300">
                        {row.pendingApprovals}
                        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                          Pending
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#111622] px-2 py-2 text-slate-300">
                        {row.awaitingSignature}
                        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                          Signature
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#111622] px-2 py-2 text-slate-300">
                        {row.expiringSoon}
                        <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                          Expiring
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {!overview.departmentContractHealth.length ? (
                  <p className="text-sm text-slate-500">No department health data yet.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Document Compliance</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Contracts that are ready to move versus the ones still blocked on paperwork.
                  </p>
                </div>
                <FileClock size={16} className="text-fuchsia-300" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Compliant Live</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-300">
                    {overview.documentCompliance.fullyCompliantLiveContracts}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Missing Docs</p>
                  <p className="mt-2 text-2xl font-bold text-amber-300">
                    {overview.documentCompliance.contractsWithMissingRequiredDocs}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Need PDF</p>
                  <p className="mt-2 text-2xl font-bold text-blue-300">
                    {overview.documentCompliance.contractsMissingGeneratedPdf}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Need Signed Copy</p>
                  <p className="mt-2 text-2xl font-bold text-cyan-300">
                    {overview.documentCompliance.contractsMissingSignedCopy}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {overview.documentCompliance.flaggedContracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          {contract.staffNameSnapshot}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {contract.contractNo} · {contract.departmentSnapshot} · {contract.derivedStatus.replaceAll('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-amber-300">
                      Missing: {contract.missingDocumentLabels.join(', ')}
                    </p>
                  </div>
                ))}
                {!overview.documentCompliance.flaggedContracts.length ? (
                  <p className="text-sm text-slate-500">No document compliance blockers right now.</p>
                ) : null}
              </div>

              <div className="mt-4">
                <Link
                  href="/hr/contracts"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 transition-colors hover:text-blue-200"
                >
                  Open contracts
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
