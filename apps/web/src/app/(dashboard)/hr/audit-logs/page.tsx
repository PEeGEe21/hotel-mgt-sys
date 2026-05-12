'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, FileText, History, Search } from 'lucide-react';
import TableScroll from '@/components/ui/table-scroll';
import { useDebounce } from '@/hooks/useDebounce';
import { useHrContractAuditLogs } from '@/hooks/hr/useHrContracts';

function titleize(value: string | null | undefined) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ACTION_STYLE: Record<string, string> = {
  CREATED: 'bg-emerald-500/15 text-emerald-300',
  UPDATED: 'bg-sky-500/15 text-sky-300',
  SUBMITTED: 'bg-amber-500/15 text-amber-300',
  APPROVED_STEP: 'bg-blue-500/15 text-blue-300',
  SIGNED: 'bg-cyan-500/15 text-cyan-300',
  REJECTED: 'bg-rose-500/15 text-rose-300',
  TERMINATED: 'bg-red-500/15 text-red-300',
  RENEWED_SOURCE: 'bg-violet-500/15 text-violet-300',
  RENEWED_TARGET: 'bg-fuchsia-500/15 text-fuchsia-300',
  DOCUMENT_UPLOADED: 'bg-cyan-500/15 text-cyan-300',
  DOCUMENT_GENERATED: 'bg-indigo-500/15 text-indigo-300',
};

export default function HrAuditLogsPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('ALL');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 300);

  const auditLogsQuery = useHrContractAuditLogs({
    search: debouncedSearch || undefined,
    action: action === 'ALL' ? undefined : action,
    page,
    limit: 20,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, action]);

  const data = auditLogsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">HR Audit Logs</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Search contract history across approvals, renewals, document activity, and exits.
          </p>
        </div>
        <div className="rounded-xl border border-[#1e2536] bg-[#111622] px-3 py-2 text-xs text-slate-400">
          {data?.total ?? 0} log entries
        </div>
      </div>

      <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#1e2536] bg-[#0f1117] px-3 py-2.5">
              <Search size={14} className="shrink-0 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search contract no, staff name, department, action..."
                className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
              />
            </div>
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none"
            >
              <option value="ALL">All actions</option>
              {(data?.filters.actions ?? []).map((item) => (
                <option key={item} value={item}>
                  {titleize(item)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Link
              href="/hr/contracts"
              className="inline-flex items-center gap-2 rounded-xl border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-600"
            >
              <FileText size={14} />
              Contracts
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1e2536] bg-[#161b27]">
        <TableScroll>
          <table className="w-full min-w-[1080px] text-sm text-left">
            <thead className="border-b border-[#1e2536] bg-[#111622] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Transition</th>
                <th className="px-4 py-3 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => (
                <tr key={log.id} className="border-b border-[#1e2536] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-slate-400">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        ACTION_STYLE[log.action] || 'bg-slate-500/15 text-slate-300'
                      }`}
                    >
                      {log.actionLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{log.contract?.contractNo ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {log.contract?.staffNameSnapshot ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {log.contract?.departmentSnapshot ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {titleize(log.fromStatus)} {'→'} {titleize(log.toStatus)}
                  </td>
                  <td className="px-4 py-3">
                    {log.contractId ? (
                      <Link
                        href={`/hr/contracts`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 transition-colors hover:text-blue-200"
                      >
                        Open contracts
                        <ArrowRight size={12} />
                      </Link>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>

        {auditLogsQuery.isLoading ? (
          <div className="py-12 text-center">
            <History size={28} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-500">Loading HR audit logs...</p>
          </div>
        ) : null}

        {!auditLogsQuery.isLoading && !(data?.logs.length ?? 0) ? (
          <div className="py-12 text-center">
            <History size={28} className="mx-auto mb-2 text-slate-700" />
            <p className="text-sm text-slate-500">No HR audit log entries found</p>
          </div>
        ) : null}

        {data && data.totalPages > 1 ? (
          <div className="flex flex-col gap-3 border-t border-[#1e2536] px-4 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              Page {data.page} of {data.totalPages} · {data.total} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2 text-sm text-slate-300 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((current) => Math.min(data.totalPages, current + 1))}
                disabled={page >= data.totalPages}
                className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2 text-sm text-slate-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
