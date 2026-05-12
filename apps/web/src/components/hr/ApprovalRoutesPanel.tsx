'use client';

import { useMemo, useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import {
  HrContractApprovalRoute,
  useCreateHrContractApprovalRoute,
  useHrContractApprovalRoutes,
  useUpdateHrContractApprovalRoute,
} from '@/hooks/hr/useHrContracts';

type ApprovalRouteFormState = {
  name: string;
  contractType: string;
  isDefault: boolean;
  isActive: boolean;
  steps: Array<{
    stepOrder: number;
    role: string;
    required: boolean;
  }>;
};

const TYPE_OPTIONS = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'PROBATION', label: 'Probation' },
];

const APPROVER_ROLE_OPTIONS = ['MANAGER', 'ADMIN', 'SUPER_ADMIN', 'STAFF'];

function titleize(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildApprovalRouteForm(route?: HrContractApprovalRoute | null): ApprovalRouteFormState {
  return {
    name: route?.name || '',
    contractType: route?.contractType || '',
    isDefault: route?.isDefault ?? false,
    isActive: route?.isActive ?? true,
    steps:
      route?.steps?.length
        ? route.steps.map((step) => ({
            stepOrder: step.stepOrder,
            role: step.role,
            required: step.required,
          }))
        : [
            { stepOrder: 1, role: 'MANAGER', required: true },
            { stepOrder: 2, role: 'ADMIN', required: true },
          ],
  };
}

export default function ApprovalRoutesPanel() {
  const approvalRoutesQuery = useHrContractApprovalRoutes();
  const createApprovalRoute = useCreateHrContractApprovalRoute();
  const [editingRouteId, setEditingRouteId] = useState('');
  const updateApprovalRoute = useUpdateHrContractApprovalRoute(editingRouteId);
  const approvalRoutes = approvalRoutesQuery.data?.routes ?? [];

  const [approvalRouteForm, setApprovalRouteForm] = useState<ApprovalRouteFormState>(
    buildApprovalRouteForm(null),
  );

  const selectedRoute = useMemo(
    () => approvalRoutes.find((route) => route.id === editingRouteId) || null,
    [approvalRoutes, editingRouteId],
  );

  const resetForm = () => {
    setEditingRouteId('');
    setApprovalRouteForm(buildApprovalRouteForm(null));
  };

  const openForEdit = (route: HrContractApprovalRoute) => {
    setEditingRouteId(route.id);
    setApprovalRouteForm(buildApprovalRouteForm(route));
  };

  const handleSave = async () => {
    const payload = {
      name: approvalRouteForm.name,
      contractType: approvalRouteForm.contractType || undefined,
      isDefault: approvalRouteForm.isDefault,
      isActive: approvalRouteForm.isActive,
      steps: approvalRouteForm.steps.map((step, index) => ({
        stepOrder: step.stepOrder || index + 1,
        role: step.role,
        required: step.required,
      })),
    };

    if (editingRouteId) {
      await updateApprovalRoute.mutateAsync(payload);
    } else {
      await createApprovalRoute.mutateAsync(payload);
    }

    resetForm();
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Approval Routes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Contract type route, then hotel default, then system fallback.
            </p>
          </div>
          <button
            onClick={resetForm}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <Plus size={14} />
            New
          </button>
        </div>

        <div className="space-y-3">
          {approvalRoutes.map((route) => (
            <button
              key={route.id}
              onClick={() => openForEdit(route)}
              className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${
                editingRouteId === route.id
                  ? 'border-blue-500/40 bg-blue-600/10'
                  : 'border-[#1e2536] bg-[#0f1117] hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{route.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {route.contractType ? titleize(route.contractType) : 'Hotel Default'} ·{' '}
                    {route.steps.map((step) => titleize(step.role)).join(' -> ')}
                  </p>
                </div>
                {route.isDefault ? (
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                    Default
                  </span>
                ) : null}
              </div>
            </button>
          ))}

          {!approvalRoutes.length ? (
            <div className="rounded-xl border border-dashed border-[#1e2536] px-4 py-10 text-center">
              <Settings2 size={20} className="mx-auto mb-2 text-slate-700" />
              <p className="text-sm text-slate-500">No hotel-specific approval routes yet.</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">
            {selectedRoute ? 'Edit Approval Route' : 'Create Approval Route'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Use this for contract-specific or hotel-default review chains.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Route Name
            </label>
            <input
              value={approvalRouteForm.name}
              onChange={(event) =>
                setApprovalRouteForm((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Contract Type
            </label>
            <select
              value={approvalRouteForm.contractType}
              onChange={(event) =>
                setApprovalRouteForm((current) => ({
                  ...current,
                  contractType: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="">Hotel Default Route</option>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={approvalRouteForm.isDefault}
              onChange={(event) =>
                setApprovalRouteForm((current) => ({
                  ...current,
                  isDefault: event.target.checked,
                }))
              }
            />
            Default Route
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={approvalRouteForm.isActive}
              onChange={(event) =>
                setApprovalRouteForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
            Active
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Approval Steps</h3>
            <button
              onClick={() =>
                setApprovalRouteForm((current) => ({
                  ...current,
                  steps: [
                    ...current.steps,
                    {
                      stepOrder: current.steps.length + 1,
                      role: 'MANAGER',
                      required: true,
                    },
                  ],
                }))
              }
              className="rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              Add Step
            </button>
          </div>

          <div className="space-y-3">
            {approvalRouteForm.steps.map((step, index) => (
              <div
                key={`${step.stepOrder}-${index}`}
                className="grid grid-cols-1 gap-3 rounded-lg border border-[#1e2536] px-3 py-3 md:grid-cols-[100px_1fr_120px_72px]"
              >
                <input
                  type="number"
                  min="1"
                  value={step.stepOrder}
                  onChange={(event) =>
                    setApprovalRouteForm((current) => ({
                      ...current,
                      steps: current.steps.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, stepOrder: Number(event.target.value || item.stepOrder) }
                          : item,
                      ),
                    }))
                  }
                  className="rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                />
                <select
                  value={step.role}
                  onChange={(event) =>
                    setApprovalRouteForm((current) => ({
                      ...current,
                      steps: current.steps.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, role: event.target.value } : item,
                      ),
                    }))
                  }
                  className="rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
                >
                  {APPROVER_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {titleize(role)}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={step.required}
                    onChange={(event) =>
                      setApprovalRouteForm((current) => ({
                        ...current,
                        steps: current.steps.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, required: event.target.checked }
                            : item,
                        ),
                      }))
                    }
                  />
                  Required
                </label>
                <button
                  onClick={() =>
                    setApprovalRouteForm((current) => ({
                      ...current,
                      steps: current.steps.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  disabled={approvalRouteForm.steps.length === 1}
                  className="rounded-lg bg-red-600/15 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-600/25 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={resetForm}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10"
          >
            Reset
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={
              !approvalRouteForm.name.trim() ||
              !approvalRouteForm.steps.length ||
              createApprovalRoute.isPending ||
              updateApprovalRoute.isPending
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
          >
            {createApprovalRoute.isPending || updateApprovalRoute.isPending
              ? 'Saving...'
              : selectedRoute
                ? 'Update Route'
                : 'Create Route'}
          </button>
        </div>
      </div>
    </div>
  );
}
