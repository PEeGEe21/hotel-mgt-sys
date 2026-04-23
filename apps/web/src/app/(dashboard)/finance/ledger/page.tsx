'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen,
  BarChart2,
  FileText,
  Scale,
  Plus,
  Loader2,
  CheckCircle2,
  X,
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Sparkles,
  Landmark,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPortal } from 'react-dom';
import {
  useAccounts,
  useDayBook,
  useTrialBalance,
  useProfitAndLoss,
  useSeedCoa,
  usePostManualEntry,
  type Account,
  type AccountType,
} from '@/hooks/finance/useLedger';

// Need to import api for AddAccountModal
import api from '@/lib/api';
import Pagination from '@/components/ui/pagination';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

// ─── Manual Journal Entry Modal ───────────────────────────────────────────────
function ManualEntryModal({ accounts, onClose }: { accounts: Account[]; onClose: () => void }) {
  const postEntry = usePostManualEntry();
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(today());
  const [lines, setLines] = useState([
    { accountCode: '', type: 'DEBIT' as 'DEBIT' | 'CREDIT', amount: 0, description: '' },
    { accountCode: '', type: 'CREDIT' as 'DEBIT' | 'CREDIT', amount: 0, description: '' },
  ]);
  const [error, setError] = useState('');

  const totalDebit = lines.filter((l) => l.type === 'DEBIT').reduce((s, l) => s + l.amount, 0);
  const totalCredit = lines.filter((l) => l.type === 'CREDIT').reduce((s, l) => s + l.amount, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const addLine = () =>
    setLines((l) => [...l, { accountCode: '', type: 'DEBIT', amount: 0, description: '' }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: any) => {
    setLines((l) => l.map((line, idx) => (idx === i ? { ...line, [field]: value } : line)));
  };

  const handlePost = async () => {
    if (!description.trim()) return setError('Description is required.');
    if (!isBalanced)
      return setError(
        `Entry is not balanced. Debits: ${fmtMoney(totalDebit)}, Credits: ${fmtMoney(totalCredit)}`,
      );
    const incomplete = lines.find((l) => !l.accountCode || l.amount <= 0);
    if (incomplete) return setError('All lines must have an account and amount.');
    setError('');
    try {
      await postEntry.mutateAsync({ description, reference: reference || undefined, date, lines });
      onClose();
    } catch {
      /* toast shown by hook */
    }
  };

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#1e2536]">
          <h2 className="text-base font-bold text-white">Manual Journal Entry</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Header fields */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Description *
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Salary payment — March 2026"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Reference (optional)
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Invoice no, payment ref etc"
              className={inputCls}
            />
          </div>

          {/* Lines */}
          <div>
            <div className="grid grid-cols-[1fr_100px_120px_120px_32px] gap-2 px-1 mb-2">
              {['Account', 'Type', 'Amount', 'Description', ''].map((h) => (
                <span key={h} className="text-[10px] text-slate-600 uppercase tracking-wider">
                  {h}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_100px_120px_120px_32px] gap-2 items-center"
                >
                  <select
                    value={line.accountCode}
                    onChange={(e) => updateLine(i, 'accountCode', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select account…</option>
                    {accounts.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        {acc.code} — {acc.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={line.type}
                    onChange={(e) => updateLine(i, 'type', e.target.value)}
                    className={inputCls}
                  >
                    <option value="DEBIT">Debit</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={line.amount}
                    onChange={(e) => updateLine(i, 'amount', Number(e.target.value))}
                    className={inputCls}
                  />
                  <input
                    value={line.description}
                    onChange={(e) => updateLine(i, 'description', e.target.value)}
                    placeholder="Optional"
                    className={inputCls}
                  />
                  <button
                    onClick={() => lines.length > 2 && removeLine(i)}
                    disabled={lines.length <= 2}
                    className="text-slate-700 hover:text-red-400 disabled:opacity-20 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addLine}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
            >
              <Plus size={12} /> Add line
            </button>
          </div>

          {/* Balance check */}
          <div
            className={`flex items-center justify-between rounded-xl px-4 py-3 border text-sm ${
              isBalanced
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10  border-amber-500/20  text-amber-400'
            }`}
          >
            <span>Debits: {fmtMoney(totalDebit)}</span>
            <span>{isBalanced ? '✓ Balanced' : 'Not balanced'}</span>
            <span>Credits: {fmtMoney(totalCredit)}</span>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-5 pt-4 border-t border-[#1e2536]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={postEntry.isPending || !isBalanced}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {postEntry.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Post Entry
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Day Book Tab ─────────────────────────────────────────────────────────────
function DayBookTab() {
  const [date, setDate] = useState(today());
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const { data: accounts = [] } = useAccounts();
  const { data, isLoading } = useDayBook(date, page);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2">
          <CalendarDays size={13} className="text-slate-500" />
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-sm text-slate-300 outline-none [color-scheme:dark]"
          />
        </div>
        {data?.summary && (
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{data.summary.totalEntries} entries</span>
            <span className="text-slate-600">|</span>
            <span>Debits {fmtMoney(data.summary.totalDebits)}</span>
            <span className="text-slate-600">|</span>
            <span>Credits {fmtMoney(data.summary.totalCredits)}</span>
            {Math.abs(data.summary.totalDebits - data.summary.totalCredits) < 0.01 &&
              data.summary.totalEntries > 0 && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Balanced
                </span>
              )}
          </div>
        )}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={14} /> Manual Entry
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={20} className="animate-spin text-slate-500" />
        </div>
      ) : (data?.entries ?? []).length === 0 ? (
        <div className="py-16 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
          <FileText size={28} className="text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No journal entries for {fmtDate(date)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.entries ?? []).map((entry) => (
            <div
              key={entry.id}
              className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden"
            >
              {/* Entry header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1e2536] bg-[#0f1117]/30">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500">{entry.entryNo}</span>
                  <span className="text-sm font-medium text-slate-200">{entry.description}</span>
                  {entry.reference && (
                    <span className="text-xs text-slate-600 bg-[#0f1117] border border-[#1e2536] px-2 py-0.5 rounded">
                      {entry.reference}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {entry.sourceType && (
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                      {entry.sourceType}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {new Date(entry.date).toLocaleTimeString('en-NG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              {/* Lines */}
              <div className="divide-y divide-[#1e2536]">
                {entry.lines.map((line) => (
                  <div key={line.id} className="flex items-center px-5 py-2.5">
                    <div className="w-40 pl-8">
                      {line.type === 'CREDIT' && (
                        <span className="text-xs font-mono text-slate-500 mr-2">Dr.</span>
                      )}
                      {line.type === 'DEBIT' && (
                        <span className="text-xs font-mono text-slate-500">Dr.</span>
                      )}
                    </div>
                    <div
                      className={`flex items-center gap-3 flex-1 ${line.type === 'CREDIT' ? 'pl-8' : ''}`}
                    >
                      <span className="font-mono text-xs text-slate-500 w-12">
                        {line.account.code}
                      </span>
                      <span className="text-sm text-slate-300">{line.account.name}</span>
                      {line.description && (
                        <span className="text-xs text-slate-600">— {line.description}</span>
                      )}
                    </div>
                    <div className="text-right w-36">
                      {line.type === 'DEBIT' ? (
                        <span className="text-sm font-semibold text-slate-200">
                          {fmtMoney(Number(line.amount))}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-slate-400 ml-8">
                          {fmtMoney(Number(line.amount))}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {data?.meta && (
            <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
          )}
        </div>
      )}

      {showModal && <ManualEntryModal accounts={accounts} onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ─── Trial Balance Tab ────────────────────────────────────────────────────────
function TrialBalanceTab() {
  const [asOf, setAsOf] = useState(today());
  const { data, isLoading } = useTrialBalance(asOf);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2">
          <span className="text-xs text-slate-500">As of</span>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="bg-transparent text-sm text-slate-300 outline-none [color-scheme:dark]"
          />
        </div>
        {data && (
          <div
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${
              data.isBalanced
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10    border-red-500/20    text-red-400'
            }`}
          >
            {data.isBalanced ? (
              <>
                <CheckCircle2 size={12} /> Trial Balance is balanced
              </>
            ) : (
              <>
                <AlertCircle size={12} /> Not balanced — check entries
              </>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={20} className="animate-spin text-slate-500" />
        </div>
      ) : data ? (
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  <th className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left">
                    Code
                  </th>
                  <th className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left">
                    Account
                  </th>
                  <th className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-right">
                    Debit
                  </th>
                  <th className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-right">
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{row.code}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">{row.name}</td>
                    <td className="px-4 py-2.5 text-right text-sm text-slate-400">
                      {row.debit > 0 ? fmtMoney(row.debit) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm text-slate-400">
                      {row.credit > 0 ? fmtMoney(row.credit) : '—'}
                    </td>
                  </tr>
                ))}
                {/* Totals */}
                <tr className="border-t-2 border-[#1e2536] bg-[#0f1117]/50">
                  <td className="px-4 py-3 text-xs font-bold text-white" colSpan={2}>
                    TOTALS
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-white">
                    {fmtMoney(data.totalDebits)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-white">
                    {fmtMoney(data.totalCredits)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
          <Scale size={28} className="text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No data — seed the chart of accounts first</p>
        </div>
      )}
    </div>
  );
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────
function ProfitLossTab() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const { data, isLoading } = useProfitAndLoss(from, to);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 w-fit">
        <CalendarDays size={13} className="text-slate-500" />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="bg-transparent text-sm text-slate-300 outline-none [color-scheme:dark]"
        />
        <span className="text-slate-600 text-xs">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="bg-transparent text-sm text-slate-300 outline-none [color-scheme:dark]"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={20} className="animate-spin text-slate-500" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: 'Total Revenue',
                value: fmtMoney(data.revenue.total),
                color: 'text-emerald-400',
              },
              {
                label: 'Total Expenses',
                value: fmtMoney(data.expenses.total),
                color: 'text-red-400',
              },
              {
                label: 'Net Profit',
                value: fmtMoney(Math.abs(data.netProfit)),
                color: data.netProfit >= 0 ? 'text-blue-400' : 'text-red-400',
                sub: `${data.margin}% margin ${data.netProfit < 0 ? '(loss)' : ''}`,
              },
            ].map(({ label, value, color, sub }) => (
              <div
                key={label}
                className="bg-[#161b27] border border-[#1e2536] rounded-xl px-5 py-4"
              >
                <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Revenue */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e2536] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Revenue</h2>
                <span className="text-sm font-bold text-emerald-400">
                  {fmtMoney(data.revenue.total)}
                </span>
              </div>
              <div className="divide-y divide-[#1e2536]">
                {data.revenue.rows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <p className="text-sm text-slate-300">{row.name}</p>
                      <p className="text-xs text-slate-600 font-mono">{row.code}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">
                      {fmtMoney(row.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e2536] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Expenses</h2>
                <span className="text-sm font-bold text-red-400">
                  {fmtMoney(data.expenses.total)}
                </span>
              </div>
              <div className="divide-y divide-[#1e2536]">
                {data.expenses.rows.length === 0 ? (
                  <p className="text-xs text-slate-600 px-5 py-4">No expenses in this period</p>
                ) : (
                  data.expenses.rows.map((row) => (
                    <div key={row.id} className="flex items-center justify-between px-5 py-2.5">
                      <div>
                        <p className="text-sm text-slate-300">{row.name}</p>
                        <p className="text-xs text-slate-600 font-mono">{row.code}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-400">
                        {fmtMoney(row.balance)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="py-16 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
          <BarChart2 size={28} className="text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No data for this period</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LedgerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Ledger</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Chart of accounts, journal entries and financial reports
        </p>
      </div>

      <Tabs defaultValue="daybook" className="flex-col space-y-5">
        <TabsList className="bg-[#161b27] border border-[#1e2536] rounded-xl p-1 justify-start gap-0.5">
          {[
            { value: 'daybook', label: 'Day Book', icon: FileText },
            { value: 'trial', label: 'Trial Balance', icon: Scale },
            { value: 'pnl', label: 'Profit & Loss', icon: BarChart2 },
          ].map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-blue-500/20 text-slate-400 hover:!text-slate-200 rounded-lg text-sm font-medium transition-all"
            >
              <Icon size={13} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="daybook">
          <DayBookTab />
        </TabsContent>
        <TabsContent value="trial">
          <TrialBalanceTab />
        </TabsContent>
        <TabsContent value="pnl">
          <ProfitLossTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
