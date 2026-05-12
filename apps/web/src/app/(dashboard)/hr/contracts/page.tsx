'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import TableScroll from '@/components/ui/table-scroll';
import { useDepartments } from '@/hooks/useDepartments';
import { useJobTitles } from '@/hooks/useJobTitles';
import { useStaffAll } from '@/hooks/staff/useStaff';
import { useHrContracts, useRunHrContractNotificationsScan } from '@/hooks/hr/useHrContracts';
import { ContractFilter } from '@/types/hr/contracts.type';
import { formatDate, formatMoney, titleizeStatus } from '@/utils/hr/contracts-utils';
import { STATUS_STYLE, TYPE_STYLE } from '@/lib/hr/contracts.lib';
import ManageStaffContractModal from './_components/ManageStaffContractModal';
import StaffContractModal from './_components/StaffContractModal';
import { openHrContractDownload } from '@/hooks/useProxyActions';

function StatusIcon({ status }: { status: string }) {
  if (status === 'ACTIVE') return <CheckCircle2 size={10} />;
  if (status === 'EXPIRING_SOON') return <AlertTriangle size={10} />;
  if (status === 'PENDING_APPROVAL') return <Clock size={10} />;
  if (status === 'AWAITING_SIGNATURE') return <Clock size={10} />;
  return <Clock size={10} />;
}

export default function ContractsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ContractFilter>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState('');

  const { data: departments = [] } = useDepartments();
  const { data: jobTitles = [] } = useJobTitles();
  const { data: staff = [] } = useStaffAll();
  const runNotificationsScan = useRunHrContractNotificationsScan();
  const contractsQuery = useHrContracts({
    search: search || undefined,
    status: filter === 'All' ? undefined : filter,
    limit: 200,
  });

  const contracts = contractsQuery.data?.contracts ?? [];
  const stats = contractsQuery.data?.stats;
  const expiryDays = contractsQuery.data?.settings.contractExpiryWarningDays ?? 60;

  // const downloadContract = (id: string) => {
  //   window.open(`/api/proxy/hr/contracts/${id}/download`, '_blank', 'noopener,noreferrer');
  // };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Employment Contracts</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {stats?.expiringSoon ?? 0} expiring within {expiryDays} days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void runNotificationsScan.mutateAsync()}
              disabled={runNotificationsScan.isPending}
              className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#161b27] px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-[#1b2130] disabled:opacity-60"
            >
              {runNotificationsScan.isPending ? 'Scanning…' : 'Run Notifications Scan'}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> New Contract
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Active',
              count: stats?.active ?? 0,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Expiring Soon',
              count: stats?.expiringSoon ?? 0,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
            {
              label: 'Expired',
              count: stats?.expired ?? 0,
              color: 'text-red-400',
              bg: 'bg-red-500/10 border-red-500/20',
            },
            {
              label: 'Draft',
              count: stats?.draft ?? 0,
              color: 'text-slate-400',
              bg: 'bg-slate-500/10 border-slate-500/20',
            },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-56">
            <Search size={14} className="text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contracts..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(
              [
                'All',
                'ACTIVE',
                'EXPIRING_SOON',
                'EXPIRED',
                'DRAFT',
                'PENDING_APPROVAL',
                'AWAITING_SIGNATURE',
                'REJECTED',
              ] as const
            ).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filter === status
                    ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                    : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'
                }`}
              >
                {status === 'All' ? 'All' : titleizeStatus(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
          <TableScroll>
            <table className="w-full">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  {[
                    'Contract',
                    'Staff Member',
                    'Department',
                    'Type',
                    'Start Date',
                    'End Date',
                    'Salary',
                    'Status',
                    '',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-200">{contract.contractNo}</p>
                      <p className="text-xs text-slate-500">{contract.employeeCodeSnapshot}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-200">
                        {contract.staffNameSnapshot}
                      </p>
                      <p className="text-xs text-slate-500">{contract.positionSnapshot}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                      {contract.departmentSnapshot}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_STYLE[contract.type] || 'bg-slate-500/15 text-slate-300'}`}
                      >
                        {titleizeStatus(contract.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(contract.startDate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(contract.endDate)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-300 whitespace-nowrap">
                      {formatMoney(contract.salary, contract.currency)}/mo
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${STATUS_STYLE[contract.derivedStatus] || 'bg-slate-500/15 text-slate-300'}`}
                      >
                        <StatusIcon status={contract.derivedStatus} />
                        {titleizeStatus(contract.derivedStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelectedContractId(contract.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="View"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => openHrContractDownload(contract.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Download PDF"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>

          {contractsQuery.isLoading ? (
            <div className="py-12 text-center">
              <Loader2 size={28} className="animate-spin text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading contracts…</p>
            </div>
          ) : null}

          {!contractsQuery.isLoading && contracts.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No contracts found</p>
            </div>
          ) : null}
        </div>
      </div>

      <ManageStaffContractModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        departments={departments}
        jobTitles={jobTitles}
        staff={staff}
      />
      <StaffContractModal
        isOpen={!!selectedContractId}
        contractId={selectedContractId}
        onClose={() => setSelectedContractId('')}
        departments={departments}
        jobTitles={jobTitles}
      />
    </>
  );
}
