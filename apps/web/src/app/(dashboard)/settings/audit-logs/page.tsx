'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck, ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import Pagination from '@/components/ui/pagination';

export default function AuditLogsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      action: action.trim() || undefined,
      page,
      limit,
    }),
    [search, action, page, limit],
  );

  const { data, isLoading } = useAuditLogs(filters);
  const logs = data?.logs ?? [];

  const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Audit Logs</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Security-grade trail of sensitive actions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="text-emerald-400" />
          Admin only
        </div>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-3 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 flex-1">
          <Search size={14} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search action, user, email..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
          />
        </div>
        <input
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
          placeholder="Filter by action (e.g. auth.impersonate)"
          className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 outline-none w-full md:w-72"
        />
        <select
          value={limit}
          onChange={(e) => {
            setPage(1);
            setLimit(Number(e.target.value));
          }}
          className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none w-full md:w-28"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}/page
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[160px_1.2fr_1fr_1fr_1fr_1.2fr] gap-0 border-b border-[#1e2536] px-5 py-3 bg-[#0f1117]/50 text-xs text-slate-500 uppercase tracking-wider font-medium">
          <span>Time</span>
          <span>Action</span>
          <span>Actor</span>
          <span>Target</span>
          <span>IP</span>
          <span>User Agent</span>
        </div>

        {isLoading && (
          <div className="px-5 py-6 text-sm text-slate-500">Loading audit logs...</div>
        )}

        {!isLoading && logs.length === 0 && (
          <div className="px-5 py-6 text-sm text-slate-500">No audit logs yet.</div>
        )}

        {!isLoading &&
          logs.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[160px_1.2fr_1fr_1fr_1fr_1.2fr] items-center px-5 py-4 border-b border-[#1e2536] last:border-0 text-sm"
            >
              <div className="text-slate-400 text-xs">{formatDate(row.createdAt)}</div>
              <div className="text-slate-200 font-medium">{row.action}</div>
              <div>
                <p className="text-slate-200 text-sm">{row.actor.name}</p>
                <p className="text-slate-500 text-xs">{row.actor.email}</p>
              </div>
              <div>
                {row.targetUser ? (
                  <>
                    <p className="text-slate-200 text-sm">{row.targetUser.name}</p>
                    <p className="text-slate-500 text-xs">{row.targetUser.email}</p>
                  </>
                ) : (
                  <span className="text-slate-500 text-xs">—</span>
                )}
              </div>
              <div className="text-slate-400 text-xs">{row.ipAddress ?? '—'}</div>
              <div className="text-slate-500 text-xs line-clamp-2">{row.userAgent ?? '—'}</div>
            </div>
          ))}
      </div>

      {data?.meta && logs.length > 0 && (
        <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
      )}
    </div>
  );
}
