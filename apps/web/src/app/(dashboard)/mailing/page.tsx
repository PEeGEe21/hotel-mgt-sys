'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Inbox,
  Mail,
  Search,
  Sparkles,
  Link2,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Pagination from '@/components/ui/pagination';
import { useMailing, type EmailDeliveryLog } from '@/hooks/useMailing';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
} from '@/components/ui/drawer';

const EVENT_OPTIONS = [
  'newReservation',
  'paymentReceived',
  'lowInventory',
  'housekeepingAlert',
  'checkIn',
  'checkOut',
  'maintenanceAlert',
  'attendanceAlert',
];

function statusClasses(status: string) {
  if (status === 'SENT') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
  if (status === 'FAILED') return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
  return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
}

function eventLabel(event: string | null) {
  if (!event) return 'Uncategorized';
  return event.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatDate(value: string | null) {
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
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function DeliveryRow({
  row,
  onOpen,
}: {
  row: EmailDeliveryLog;
  onOpen: (row: EmailDeliveryLog) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="grid w-full grid-cols-1 gap-3 border-b border-[#1e2536] px-4 py-4 text-left transition-colors hover:bg-white/[0.02] md:grid-cols-[170px_1fr_1.2fr_120px_130px_170px] md:gap-4 md:px-5 last:border-0"
    >
      <div className="text-xs text-slate-500 md:text-slate-400">{formatDate(row.createdAt)}</div>
      <div>
        <p className="break-all text-sm text-slate-200">{row.recipient}</p>
        <p className="break-all text-xs text-slate-500">{row.fromEmail}</p>
      </div>
      <div>
        <p className="font-medium text-slate-200">{row.subject}</p>
        {/* {row.errorMessage && (
          <p className="mt-1 line-clamp-2 text-xs text-rose-300">{row.errorMessage}</p>
        )} */}
      </div>
      <div className="text-xs text-slate-400">{row.event ?? '—'}</div>
      <div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(row.status)}`}
        >
          {row.status}
        </span>
      </div>
      <div className="text-xs text-slate-400">{formatDate(row.sentAt)}</div>
    </button>
  );
}

export default function MailingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [event, setEvent] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedEmail, setSelectedEmail] = useState<EmailDeliveryLog | null>(null);
  const correlationId = searchParams.get('correlationId')?.trim() || '';

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      event: event.trim() || undefined,
      correlationId: correlationId || undefined,
      page,
      limit,
    }),
    [search, status, event, correlationId, page, limit],
  );

  const { data, isLoading } = useMailing(filters);
  const emails = data?.emails ?? [];

  const groupedEmails = useMemo(() => {
    const groups = new Map<string, EmailDeliveryLog[]>();
    for (const row of emails) {
      const key = row.event ?? 'uncategorized';
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }

    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: eventLabel(key === 'uncategorized' ? null : key),
      items,
      failed: items.filter((item) => item.status === 'FAILED').length,
    }));
  }, [emails]);

  const knownEvents = useMemo(() => {
    const seen = new Set(EVENT_OPTIONS);
    for (const row of emails) {
      if (row.event) seen.add(row.event);
    }
    return Array.from(seen);
  }, [emails]);

  const pageStats = useMemo(() => {
    const sent = emails.filter((row) => row.status === 'SENT').length;
    const failed = emails.filter((row) => row.status === 'FAILED').length;
    const skipped = emails.filter((row) => row.status === 'SKIPPED').length;
    return { sent, failed, skipped };
  }, [emails]);

  const activeFilterCount = [search.trim(), status, event.trim(), correlationId].filter(Boolean).length;

  useEffect(() => {
    if (!correlationId || selectedEmail || emails.length === 0) return;
    setSelectedEmail(emails[0]);
  }, [correlationId, emails, selectedEmail]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [key]: current[key] === undefined ? false : !current[key],
    }));
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setEvent('');
    setPage(1);
    if (correlationId) router.replace('/mailing');
  };

  const prettyMetadata = selectedEmail?.metadata
    ? JSON.stringify(selectedEmail.metadata, null, 2)
    : null;

  return (
    <>
      <div className="max-w-full space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2536] bg-[#161b27] text-slate-400 transition-colors hover:text-slate-200"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Mailing</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Delivery history for transactional emails, alert mailouts, and failure follow-up
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200">
            <Mail size={14} className="text-sky-300" />
            Admin only
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryCard
            label="Results"
            value={String(data?.total ?? 0)}
            sub={`${groupedEmails.length} event group${groupedEmails.length === 1 ? '' : 's'} on this page`}
          />
          <SummaryCard
            label="Failures"
            value={String(pageStats.failed)}
            sub={`${pageStats.sent} sent and ${pageStats.skipped} skipped on this page`}
          />
          <SummaryCard
            label="Filters"
            value={activeFilterCount ? String(activeFilterCount) : '0'}
            sub={activeFilterCount ? 'Active filters shaping this view' : 'No filters applied'}
          />
        </div>

        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex flex-1 items-center gap-3 rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2">
              <Search size={14} className="text-slate-500" />
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search recipient, subject, provider, event..."
                className="flex-1 bg-transparent text-sm text-slate-300 outline-none placeholder:text-slate-600"
              />
            </div>

            <select
              value={event}
              onChange={(e) => {
                setPage(1);
                setEvent(e.target.value);
              }}
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2 text-sm text-slate-300 outline-none xl:w-56"
            >
              <option value="">All events</option>
              {knownEvents.map((option) => (
                <option key={option} value={option}>
                  {eventLabel(option)}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2 text-sm text-slate-300 outline-none xl:w-40"
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
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2 text-sm text-slate-300 outline-none xl:w-28"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {correlationId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200">
                <Link2 size={12} />
                Linked delivery view
              </span>
            )}
            {['FAILED', 'SENT', 'SKIPPED'].map((quickStatus) => {
              const active = status === quickStatus;
              return (
                <button
                  key={quickStatus}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setStatus(active ? '' : quickStatus);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? 'border-sky-400/40 bg-sky-500/10 text-sky-200'
                      : 'border-[#1e2536] bg-[#0f1117] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {quickStatus === 'FAILED' ? 'Only failures' : quickStatus}
                </button>
              );
            })}

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-[#1e2536] px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#1e2536] bg-[#161b27]">
          <div className="hidden grid-cols-[170px_1fr_1.2fr_120px_130px_170px] gap-0 border-b border-[#1e2536] bg-[#0f1117]/50 px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 md:grid">
            <span>Created</span>
            <span>Recipient</span>
            <span>Subject</span>
            <span>Event</span>
            <span>Status</span>
            <span>Sent At</span>
          </div>

          {isLoading && (
            <div className="px-5 py-10 text-sm text-slate-500">Loading email delivery logs...</div>
          )}

          {!isLoading && emails.length === 0 && (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <Inbox size={22} className="text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-300">No email delivery logs found</p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Try widening the filters or trigger a transactional email to populate the viewer.
              </p>
            </div>
          )}

          {!isLoading &&
            groupedEmails.map((group) => {
              const isExpanded = expandedGroups[group.key] ?? true;

              return (
                <div key={group.key} className="border-b border-[#1e2536] last:border-0">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex w-full items-center justify-between gap-3 bg-[#0f1117]/30 px-4 py-3 text-left transition-colors hover:bg-[#0f1117]/50 md:px-5"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-slate-500" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-100">{group.label}</p>
                        <p className="text-xs text-slate-500">
                          {group.items.length} delivery{group.items.length === 1 ? '' : 'ies'}
                          {group.failed > 0 ? ` · ${group.failed} failed` : ''}
                        </p>
                      </div>
                    </div>

                    {group.failed > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300">
                        <AlertCircle size={12} />
                        Needs review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                        <Sparkles size={12} />
                        Healthy
                      </span>
                    )}
                  </button>

                  {isExpanded && (
                    <div>
                      {group.items.map((row) => (
                        <DeliveryRow key={row.id} row={row} onOpen={setSelectedEmail} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {data?.meta && emails.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>

      <Drawer open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)} direction="right">
        <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DrawerContent className="flex h-full w-full max-w-xl flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-xl">
          <DrawerHeader className="border-b border-[#1e2536] px-5 py-4">
            <DrawerTitle className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-bold text-white">Delivery details</p>
                <p className="mt-1 text-xs font-normal text-slate-500">
                  Inspect provider info, errors, and metadata payload
                </p>
              </div>
              {selectedEmail && (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(selectedEmail.status)}`}
                >
                  {selectedEmail.status}
                </span>
              )}
            </DrawerTitle>
          </DrawerHeader>

          {selectedEmail && (
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117]/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Subject</p>
                <p className="mt-2 text-sm font-medium text-slate-100">{selectedEmail.subject}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Recipient', selectedEmail.recipient],
                  ['From', selectedEmail.fromEmail],
                  ['Event', selectedEmail.event ?? '—'],
                  ['Provider', selectedEmail.provider],
                  ['Created', formatDate(selectedEmail.createdAt)],
                  ['Sent at', formatDate(selectedEmail.sentAt)],
                  ['Provider message ID', selectedEmail.providerMessageId ?? '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#1e2536] bg-[#0f1117]/30 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
                    <p className="mt-2 break-all text-sm text-slate-200">{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117]/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Error inspection</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">
                  {selectedEmail.errorMessage ?? 'No provider error was recorded for this delivery.'}
                </p>
              </div>

              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117]/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Metadata</p>
                {prettyMetadata ? (
                  <pre className="mt-3 overflow-x-auto rounded-lg border border-[#1e2536] bg-[#0b0d12] p-3 text-xs text-slate-300">
                    {prettyMetadata}
                  </pre>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No metadata payload was recorded.</p>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
