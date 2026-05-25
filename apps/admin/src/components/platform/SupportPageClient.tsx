'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthNotice } from '@/components/platform/AuthNotice';
import openToast from '@/components/ToastComponent';
import { PaginationControls } from '@/components/platform/PaginationControls';
import {
  usePlatformHotels,
  usePlatformSupportCases,
  usePlatformSuperAdmins,
} from '@/hooks/usePlatform';
import { PlatformClientError, platformClientFetch } from '@/lib/platform-client';

type CreateSupportCaseForm = {
  hotelId: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  assignedAdminId: string;
};

function priorityTone(priority: string) {
  switch (priority) {
    case 'URGENT':
      return 'bg-rose-100 text-rose-900';
    case 'HIGH':
      return 'bg-amber-100 text-amber-900';
    case 'MEDIUM':
      return 'bg-sky-100 text-sky-900';
    default:
      return 'bg-slate-200 text-slate-700';
  }
}

function statusOptions() {
  return ['', 'OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_ON_HOTEL', 'RESOLVED', 'CLOSED'];
}

function priorityOptions() {
  return ['', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];
}

function formatRequestType(value: string | null | undefined) {
  if (!value) return null;
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function SupportPageClient() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [hotel, setHotel] = useState('');
  const [search, setSearch] = useState('');

  const supportQuery = usePlatformSupportCases(page, 20, {
    status,
    priority,
    search,
    hotelId: hotel || undefined,
  });
  const hotelsQuery = usePlatformHotels(1, 200, { all: true });
  const adminsQuery = usePlatformSuperAdmins();
  const data = supportQuery.data;
  const authMessage =
    supportQuery.error instanceof PlatformClientError ? supportQuery.error.message : null;
  const [createForm, setCreateForm] = useState<CreateSupportCaseForm>({
    hotelId: '',
    category: '',
    priority: 'MEDIUM',
    subject: '',
    description: '',
    assignedAdminId: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      await platformClientFetch('/support', {
        method: 'POST',
        body: JSON.stringify({
          hotelId: createForm.hotelId,
          category: createForm.category,
          priority: createForm.priority,
          subject: createForm.subject,
          description: createForm.description,
          assignedAdminId: createForm.assignedAdminId || null,
        }),
      });
      setCreateForm({
        hotelId: '',
        category: '',
        priority: 'MEDIUM',
        subject: '',
        description: '',
        assignedAdminId: '',
      });
      setCreateSuccess('Support case created.');
      openToast('success', 'Support case created.');
      await supportQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create the support case.';
      setCreateError(message);
      openToast('error', message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-full space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Support</p>
          <h1 className="text-3xl font-semibold tracking-tight">Tenant support inbox</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Cross-tenant support visibility with hotel context, queue state, and case detail
            routing. This first pass focuses on triage visibility before workflow mutations.
          </p>
        </div>

        {authMessage ? <AuthNotice message={authMessage} /> : null}
        {createError ? (
          <AuthNotice title="Support case creation failed" message={createError} />
        ) : null}
        {createSuccess ? <AuthNotice title="Support case created" message={createSuccess} /> : null}

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Open</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {data?.statusCounts.OPEN ?? 0}
            </p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">In progress</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {data?.statusCounts.IN_PROGRESS ?? 0}
            </p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Waiting on hotel</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {data?.statusCounts.WAITING_ON_HOTEL ?? 0}
            </p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Resolved</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {data?.statusCounts.RESOLVED ?? 0}
            </p>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-5">
                <label className="text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Status</span>
                  <select
                    value={status}
                    onChange={(e) => {
                      setPage(1);
                      setStatus(e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                  >
                    {statusOptions().map((value) => (
                      <option key={value || 'all'} value={value}>
                        {value || 'All statuses'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Priority</span>
                  <select
                    value={priority}
                    onChange={(e) => {
                      setPage(1);
                      setPriority(e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                  >
                    {priorityOptions().map((value) => (
                      <option key={value || 'all'} value={value}>
                        {value || 'All priorities'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Hotel</span>
                  <select
                    value={hotel}
                    onChange={(e) => {
                      setPage(1);
                      setHotel(e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                  >
                    <option value="">Select hotel</option>
                    {hotelsQuery.data?.hotels.map((hotel) => (
                      <option key={hotel.id} value={hotel.id}>
                        {hotel.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  <span className="mb-1.5 block font-medium">Search</span>
                  <input
                    value={search}
                    onChange={(e) => {
                      setPage(1);
                      setSearch(e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                    placeholder="Subject, description, hotel..."
                  />
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Case</th>
                      <th className="pb-3 pr-4 font-medium">Hotel</th>
                      <th className="pb-3 pr-4 font-medium">Priority</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Assigned</th>
                      <th className="pb-3 pr-4 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supportQuery.isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-slate-600">
                          Loading support queue...
                        </td>
                      </tr>
                    ) : (data?.cases.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-slate-600">
                          No support cases match this filter.
                        </td>
                      </tr>
                    ) : (
                      data?.cases.map((supportCase) => (
                        <tr key={supportCase.id}>
                          <td className="py-4 pr-4">
                            <Link
                              href={`/support/${supportCase.id}`}
                              className="font-semibold text-slate-900 hover:text-teal-900"
                            >
                              {supportCase.subject}
                            </Link>
                            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                              {supportCase.category}
                              {supportCase.requestType
                                ? ` · ${formatRequestType(supportCase.requestType)}`
                                : ''}
                            </p>
                          </td>
                          <td className="py-4 pr-4 text-slate-600">{supportCase.hotelName}</td>
                          <td className="py-4 pr-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${priorityTone(supportCase.priority)}`}
                            >
                              {supportCase.priority}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-slate-600">{supportCase.status}</td>
                          <td className="py-4 pr-4 text-slate-600">
                            {supportCase.assignedAdminName ?? 'Unassigned'}
                          </td>
                          <td className="py-4 pr-4 text-slate-600">
                            {new Date(supportCase.updatedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={page}
                totalPages={data?.totalPages ?? 1}
                onPageChange={setPage}
              />
            </div>
          </div>

          <form
            onSubmit={handleCreateCase}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">
              Create support case
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Open a case without impersonation
            </h2>
            <div className="mt-5 grid gap-4">
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Hotel</span>
                <select
                  value={createForm.hotelId}
                  onChange={(e) =>
                    setCreateForm((current) => ({ ...current, hotelId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                >
                  <option value="">Select hotel</option>
                  {hotelsQuery.data?.hotels.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Category</span>
                  <input
                    value={createForm.category}
                    onChange={(e) =>
                      setCreateForm((current) => ({ ...current, category: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                    placeholder="Billing, Keycards, POS..."
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Priority</span>
                  <select
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm((current) => ({ ...current, priority: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                  >
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Subject</span>
                <input
                  value={createForm.subject}
                  onChange={(e) =>
                    setCreateForm((current) => ({ ...current, subject: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Assign to</span>
                <select
                  value={createForm.assignedAdminId}
                  onChange={(e) =>
                    setCreateForm((current) => ({ ...current, assignedAdminId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                >
                  <option value="">Unassigned</option>
                  {adminsQuery.data?.superAdmins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Description</span>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((current) => ({ ...current, description: e.target.value }))
                  }
                  rows={6}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="mt-5 rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create support case'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
