'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { usePlatformSupportCaseDetail, usePlatformSuperAdmins } from '@/hooks/usePlatform';
import { PlatformClientError, platformClientFetch } from '@/lib/platform-client';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatRequestType(value: string | null | undefined) {
  if (!value) return null;
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function SupportCaseDetailClient({ id }: { id: string }) {
  const detailQuery = usePlatformSupportCaseDetail(id);
  const adminsQuery = usePlatformSuperAdmins();
  const supportCase = detailQuery.data;
  const authMessage = detailQuery.error instanceof PlatformClientError ? detailQuery.error.message : null;
  const [caseError, setCaseError] = useState<string | null>(null);
  const [caseSuccess, setCaseSuccess] = useState<string | null>(null);
  const [isSavingCase, setIsSavingCase] = useState(false);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedAdminId, setAssignedAdminId] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [commentVisibility, setCommentVisibility] = useState('INTERNAL');

  const handleUpdateCase = async () => {
    setIsSavingCase(true);
    setCaseError(null);
    setCaseSuccess(null);
    try {
      await platformClientFetch(`/support/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: status || undefined,
          priority: priority || undefined,
          assignedAdminId: assignedAdminId === '__unset__' ? null : assignedAdminId || undefined,
        }),
      });
      await detailQuery.refetch();
      setCaseSuccess('Support case updated.');
    } catch (error) {
      setCaseError(error instanceof Error ? error.message : 'Could not update the support case.');
    } finally {
      setIsSavingCase(false);
    }
  };

  const handleAddComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingComment(true);
    setCaseError(null);
    setCaseSuccess(null);
    try {
      await platformClientFetch(`/support/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: commentBody,
          visibility: commentVisibility,
        }),
      });
      setCommentBody('');
      setCommentVisibility('INTERNAL');
      await detailQuery.refetch();
      setCaseSuccess('Support note added.');
    } catch (error) {
      setCaseError(error instanceof Error ? error.message : 'Could not add the support note.');
    } finally {
      setIsSavingComment(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-full space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Support case</p>
          <h1 className="text-3xl font-semibold tracking-tight">{supportCase?.subject ?? 'Support detail'}</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Support detail view linking the case thread to hotel health, live entitlements, and current lock posture.
          </p>
        </div>

        {authMessage ? <AuthNotice message={authMessage} /> : null}
        {caseError ? <AuthNotice title="Support update failed" message={caseError} /> : null}
        {caseSuccess ? <AuthNotice title="Support updated" message={caseSuccess} /> : null}

        {detailQuery.isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading support case...</div>
        ) : supportCase ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">{supportCase.category}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">{supportCase.subject}</h2>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <p>{supportCase.status}</p>
                    <p>{supportCase.priority}</p>
                  </div>
                </div>
                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{supportCase.description}</p>
                {supportCase.requestType ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Structured request</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatRequestType(supportCase.requestType)}
                    </p>
                    {supportCase.requestPayload ? (
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-600">
                        {JSON.stringify(supportCase.requestPayload, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>Source: {supportCase.source}</p>
                  <p>Assigned: {supportCase.assignedAdmin?.name ?? 'Unassigned'}</p>
                  <p>Opened: {formatDate(supportCase.createdAt)}</p>
                  <p>Updated: {formatDate(supportCase.updatedAt)}</p>
                  <p>Created by: {supportCase.createdBy?.name ?? 'Unknown'}</p>
                  <p>
                    Hotel:{' '}
                    <Link href={`/hotels/${supportCase.hotelId}`} className="font-semibold text-teal-900">
                      {supportCase.hotel.name}
                    </Link>
                  </p>
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Live context</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Entitlements and health</h2>
                <div className="mt-5 grid gap-3 text-sm text-slate-600">
                  <p>Plan: {supportCase.liveEntitlements.plan?.name ?? 'No assigned plan'}</p>
                  <p>Subscription: {supportCase.liveEntitlements.subscriptionStatus}</p>
                  <p>Hotel health: {supportCase.hotelHealth.label} · {supportCase.hotelHealth.score}</p>
                  <p>Keycard vendor: {supportCase.keycards.hotelLockVendor ?? 'Not configured'}</p>
                  <p>Provider mode: {supportCase.keycards.providerMode}</p>
                </div>
                <div className="mt-5 space-y-2">
                  {supportCase.liveEntitlements.warnings.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No entitlement warnings right now.
                    </p>
                  ) : (
                    supportCase.liveEntitlements.warnings.map((warning) => (
                      <p key={warning} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {warning}
                      </p>
                    ))
                  )}
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Case controls</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Assignment and status</h2>
                <div className="mt-5 grid gap-4">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Status</span>
                    <select
                      value={status || supportCase.status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                    >
                      {['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_ON_HOTEL', 'RESOLVED', 'CLOSED'].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Priority</span>
                    <select
                      value={priority || supportCase.priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                    >
                      {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Assigned admin</span>
                    <select
                      value={assignedAdminId || supportCase.assignedAdmin?.id || '__unset__'}
                      onChange={(e) => setAssignedAdminId(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                    >
                      <option value="__unset__">Unassigned</option>
                      {adminsQuery.data?.superAdmins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleUpdateCase}
                  disabled={isSavingCase}
                  className="mt-5 rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSavingCase ? 'Saving...' : 'Save case controls'}
                </button>
              </article>

              <form onSubmit={handleAddComment} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Internal notes</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Add support comment</h2>
                <div className="mt-5 grid gap-4">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Visibility</span>
                    <select
                      value={commentVisibility}
                      onChange={(e) => setCommentVisibility(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                    >
                      <option value="INTERNAL">INTERNAL</option>
                      <option value="HOTEL_VISIBLE">HOTEL_VISIBLE</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Comment</span>
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      rows={6}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                    />
                  </label>
                </div>
                <button type="submit" disabled={isSavingComment} className="mt-5 rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                  {isSavingComment ? 'Saving...' : 'Add comment'}
                </button>
              </form>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Case events</p>
                <div className="mt-5 space-y-3">
                  {supportCase.events.length === 0 ? (
                    <p className="text-sm text-slate-600">No events recorded yet.</p>
                  ) : (
                    supportCase.events.map((event) => (
                      <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">{event.type}</p>
                        <p className="mt-1 text-sm text-slate-600">{event.actor?.name ?? 'System'} · {formatDate(event.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Comments</p>
                <div className="mt-5 space-y-3">
                  {supportCase.comments.length === 0 ? (
                    <p className="text-sm text-slate-600">No comments recorded yet.</p>
                  ) : (
                    supportCase.comments.map((comment) => (
                      <div key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{comment.author?.name ?? 'Unknown author'}</p>
                          <span className="text-xs uppercase tracking-wide text-slate-500">{comment.visibility}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
                        <p className="mt-2 text-xs text-slate-500">{formatDate(comment.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Hotel lifecycle</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Operational posture</h2>
                <div className="mt-5 grid gap-3 text-sm text-slate-600">
                  <p>Onboarding: {supportCase.hotelLifecycle.onboardingStatus}</p>
                  <p>Suspended: {supportCase.hotelLifecycle.suspendedAt ? formatDate(supportCase.hotelLifecycle.suspendedAt) : 'No'}</p>
                  <p>Suspension reason: {supportCase.hotelLifecycle.suspensionReason ?? 'None'}</p>
                  <p>Soft deleted: {supportCase.hotelLifecycle.deletedAt ? formatDate(supportCase.hotelLifecycle.deletedAt) : 'No'}</p>
                  <p>Purge after: {supportCase.hotelLifecycle.purgeAfterAt ? formatDate(supportCase.hotelLifecycle.purgeAfterAt) : 'Not scheduled'}</p>
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Subscription snapshot</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Commercial context</h2>
                <div className="mt-5 grid gap-3 text-sm text-slate-600">
                  <p>Plan: {supportCase.hotelSubscription?.planName ?? supportCase.liveEntitlements.plan?.name ?? 'No assigned plan'}</p>
                  <p>Status: {supportCase.hotelSubscription?.status ?? supportCase.liveEntitlements.subscriptionStatus}</p>
                  <p>Billing email: {supportCase.hotelSubscription?.billingEmail ?? 'Not set'}</p>
                  <p>Billing contact: {supportCase.hotelSubscription?.billingContactName ?? 'Not set'}</p>
                  <p>Trial ends: {supportCase.hotelSubscription?.trialEndsAt ? formatDate(supportCase.hotelSubscription.trialEndsAt) : 'Not set'}</p>
                  <p>Grace ends: {supportCase.hotelSubscription?.graceEndsAt ? formatDate(supportCase.hotelSubscription.graceEndsAt) : 'Not set'}</p>
                </div>
              </article>
            </section>
          </>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Support case not found.</div>
        )}
      </div>
    </main>
  );
}
