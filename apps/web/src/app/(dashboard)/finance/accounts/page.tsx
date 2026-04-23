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

const TYPE_BADGE: Record<AccountType, string> = {
  ASSET: 'bg-blue-500/15   text-blue-400',
  LIABILITY: 'bg-amber-500/15  text-amber-400',
  EQUITY: 'bg-violet-500/15 text-violet-400',
  REVENUE: 'bg-emerald-500/15 text-emerald-400',
  EXPENSE: 'bg-red-500/15    text-red-400',
};

const TYPE_CONFIG: Record<AccountType, { color: string; bg: string; border: string }> = {
  ASSET: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  LIABILITY: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  EQUITY: { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  REVENUE: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  EXPENSE: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

function AccountTable({ accounts }: { accounts: Account[] }) {
  return (
    <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Code', 'Account Name', 'Type', 'Debit', 'Credit', 'Balance'].map((h) => (
                <th
                  key={h}
                  className={`text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 ${h === 'Balance' || h === 'Debit' || h === 'Credit' ? 'text-right' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr
                key={acc.id}
                className={`border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors ${!acc.isActive ? 'opacity-40' : ''}`}
              >
                <td className="px-4 py-3 font-mono text-sm text-slate-400">{acc.code}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-200">{acc.name}</p>
                  {acc.description && (
                    <p className="text-xs text-slate-600 mt-0.5">{acc.description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${TYPE_BADGE[acc.type as AccountType]}`}
                  >
                    {acc.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-400">
                  {acc.debit > 0 ? fmtMoney(acc.debit) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-400">
                  {acc.credit > 0 ? fmtMoney(acc.credit) : '—'}
                </td>
                <td
                  className={`px-4 py-3 text-right text-sm font-semibold ${
                    acc.balance > 0
                      ? 'text-emerald-400'
                      : acc.balance < 0
                        ? 'text-red-400'
                        : 'text-slate-600'
                  }`}
                >
                  {acc.balance !== 0 ? fmtMoney(Math.abs(acc.balance)) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Add Account Modal (simple) ───────────────────────────────────────────────
function AddAccountModal({ accounts, onClose }: { accounts: Account[]; onClose: () => void }) {
  // Minimal add account form — for custom accounts
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'REVENUE' as AccountType,
    normalBalance: 'CREDIT' as 'DEBIT' | 'CREDIT',
    description: '',
  });
  const [error, setError] = useState('');

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) return setError('Code and name are required.');
    if (accounts.find((a) => a.code === form.code)) return setError('Account code already exists.');
    setError('');
    try {
      await api.post('/ledger/accounts', form);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not create account');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Add Account</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Code *
              </label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. 4550"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Type *
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as AccountType,
                    normalBalance: ['ASSET', 'EXPENSE'].includes(e.target.value)
                      ? 'DEBIT'
                      : 'CREDIT',
                  }))
                }
                className={inputCls}
              >
                {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Account Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Retail Revenue"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional"
              className={inputCls}
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            Add Account
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function ChartOfAccountsPage() {
  const [typeFilter, setTypeFilter] = useState<AccountType | ''>('');
  const [showModal, setShowModal] = useState(false);
  const { data: accounts = [], isLoading } = useAccounts(typeFilter || undefined);
  const seedCoa = useSeedCoa();

  const grouped = useMemo(() => {
    const map: Record<AccountType, Account[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    accounts.forEach((a) => {
      if (map[a.type]) map[a.type].push(a);
    });
    return map;
  }, [accounts]);

  const types: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Chart of Accounts</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {accounts.length} accounts · Standard hotel COA structure
          </p>
        </div>

        <div className="flex gap-2">
          {accounts.length === 0 && !isLoading && (
            <button
              onClick={() => seedCoa.mutate()}
              disabled={seedCoa.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700/50 border border-[#1e2536] hover:border-slate-500 text-slate-300 text-sm font-medium transition-colors"
            >
              {seedCoa.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              Seed Standard COA
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={14} /> Add Account
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTypeFilter('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                !typeFilter
                  ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                  : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  typeFilter === t
                    ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                    : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-20 text-center bg-[#161b27] border border-dashed border-[#2b3348] rounded-xl">
            <BookOpen size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No accounts yet</p>
            <p className="text-slate-600 text-xs mt-1">
              Click "Seed Standard COA" to set up the hotel chart of accounts
            </p>
          </div>
        ) : typeFilter ? (
          <AccountTable accounts={accounts} />
        ) : (
          <div className="space-y-6">
            {types.map((type) => {
              const items = grouped[type];
              const cfg = TYPE_CONFIG[type];
              const total = items.filter((a) => a.isActive).reduce((s, a) => s + a.balance, 0);

              return (
                items.length > 0 && (
                  <div
                    key={type}
                    className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden"
                  >
                    <div
                      className={`flex items-center justify-between px-5 py-3 border-b border-[#1e2536] ${cfg.bg}`}
                    >
                      <div className="flex items-center gap-2">
                        <Landmark size={14} className={cfg.color} />
                        <span className={`text-sm font-bold ${cfg.color}`}>{type}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}
                        >
                          {items.length}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${cfg.color}`}>
                        {/* ${total.toLocaleString()} */}
                        {fmtMoney(Math.abs(total)).toLocaleString()}
                      </span>
                    </div>
                    <table className="w-full">
                      <tbody>
                        {items.map((a) => (
                          <tr
                            key={a.code}
                            className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 text-xs font-mono text-slate-600 w-16">
                              {a.code}
                            </td>
                            <td className="px-4 py-3">
                              <p
                                className={`text-sm font-medium ${a.isActive ? 'text-slate-200' : 'text-slate-600 line-through'}`}
                              >
                                {a.name}
                              </p>
                              <p className="text-xs text-slate-600">{a.description}</p>
                            </td>
                            {/* <td className="px-4 py-3 text-xs text-slate-500">{a.subtype}</td> */}
                            <td className="px-4 py-3 text-sm font-semibold text-slate-300 text-right whitespace-nowrap">
                              {a.balance !== 0 ? fmtMoney(Math.abs(a.balance)) : '—'}
                            </td>
                            <td className="px-4 py-3 w-8">
                              <ChevronRight size={14} className="text-slate-700" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              );
            })}
            ;
          </div>
        )}

        {showModal && <AddAccountModal accounts={accounts} onClose={() => setShowModal(false)} />}
      </div>
    </div>
  );
}
