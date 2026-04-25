'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Mail, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/pagination';
import { useMailing } from '@/hooks/useMailing';

function statusClasses(status: string) {
  if (status === 'SENT') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  if (status === 'FAILED') return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
  return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
}

export default function MailingPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [event, setEvent] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      event: event.trim() || undefined,
      page,
      limit,
    }),
    [search, status, event, page, limit],
  );

  const { data, isLoading } = useMailing(filters);
  const emails = data?.emails ?? [];

  const formatDate = (value: string | null) => {
    if (!value) return '—';
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
            <h1 className="text-2xl font-bold text-white tracking-tight">Mailing</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Delivery history for transactional emails and alert mailouts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Mail size={14} className="text-sky-400" />
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
            placeholder="Search recipient, subject, event..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
          />
        </div>
        <input
          value={event}
          onChange={(e) => {
            setPage(1);
            setEvent(e.target.value);
          }}
          placeholder="Filter by event (e.g. lowInventory)"
          className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 outline-none w-full md:w-72"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none w-full md:w-36"
        >
          <option value="">All statuses</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
          <option value="SKIPPED">Skipped</option>
        </select>
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
        <div className="grid grid-cols-[170px_1fr_1.2fr_140px_140px_170px] gap-0 border-b border-[#1e2536] px-5 py-3 bg-[#0f1117]/50 text-xs text-slate-500 uppercase tracking-wider font-medium">
          <span>Created</span>
          <span>Recipient</span>
          <span>Subject</span>
          <span>Event</span>
          <span>Status</span>
          <span>Sent At</span>
        </div>

        {isLoading && (
          <div className="px-5 py-6 text-sm text-slate-500">Loading email delivery logs...</div>
        )}

        {!isLoading && emails.length === 0 && (
          <div className="px-5 py-6 text-sm text-slate-500">No email delivery logs yet.</div>
        )}

        {!isLoading &&
          emails.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[170px_1fr_1.2fr_140px_140px_170px] items-start px-5 py-4 border-b border-[#1e2536] last:border-0 text-sm gap-4"
            >
              <div className="text-slate-400 text-xs">{formatDate(row.createdAt)}</div>
              <div>
                <p className="text-slate-200 text-sm break-all">{row.recipient}</p>
                <p className="text-slate-500 text-xs break-all">{row.fromEmail}</p>
              </div>
              <div>
                <p className="text-slate-200 font-medium">{row.subject}</p>
                {row.errorMessage && (
                  <p className="text-rose-300 text-xs mt-1 line-clamp-2">{row.errorMessage}</p>
                )}
              </div>
              <div className="text-slate-400 text-xs">{row.event ?? '—'}</div>
              <div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(row.status)}`}
                >
                  {row.status}
                </span>
              </div>
              <div className="text-slate-400 text-xs">{formatDate(row.sentAt)}</div>
            </div>
          ))}
      </div>

      {data?.meta && emails.length > 0 && (
        <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
      )}
    </div>
  );
}
