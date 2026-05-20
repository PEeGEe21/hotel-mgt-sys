'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { PlatformClientError, platformClientFetch } from '@/lib/platform-client';
import type { PlatformHotelOnboardingResponse } from '@/lib/platform-types';

type FormState = {
  hotelName: string;
  domain: string;
  address: string;
  city: string;
  state: string;
  country: string;
  hotelPhone: string;
  hotelEmail: string;
  website: string;
  currency: string;
  timezone: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
};

const initialState: FormState = {
  hotelName: '',
  domain: '',
  address: '',
  city: '',
  state: '',
  country: 'Nigeria',
  hotelPhone: '',
  hotelEmail: '',
  website: '',
  currency: 'NGN',
  timezone: 'Africa/Lagos',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminPhone: '',
};

export function NewHotelForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlatformHotelOnboardingResponse | null>(null);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value.trim()]),
      );

      const response = await platformClientFetch<PlatformHotelOnboardingResponse>('/onboarding/hotel', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResult(response);
      setForm(initialState);
    } catch (submissionError) {
      if (submissionError instanceof PlatformClientError) {
        setError(submissionError.message);
      } else {
        setError('Hotel onboarding failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Tenant onboarding</p>
          <h1 className="text-3xl font-semibold tracking-tight">Create hotel tenant</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            This creates a hotel record, seeds a baseline admin department and job title, and provisions the first
            tenant admin account with a temporary password.
          </p>
        </div>

        {error ? <AuthNotice title="Onboarding failed" message={error} /> : null}

        {result ? (
          <section className="rounded-3xl border border-emerald-300 bg-emerald-50 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-900">Tenant created</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{result.hotel.name}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Hotel profile</p>
                <p className="mt-2">{result.hotel.city}, {result.hotel.country}</p>
                <p>{result.hotel.email}</p>
                <p>{result.hotel.phone}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Initial admin credentials</p>
                <p className="mt-2">{result.admin.name}</p>
                <p>{result.admin.email}</p>
                <p>Username: {result.admin.username ?? 'Generated from email'}</p>
                <p>Temporary password: {result.credentials.temporaryPassword}</p>
                <p>Employee code: {result.admin.employeeCode}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Link
                href={`/hotels/${result.hotel.id}`}
                className="inline-flex items-center rounded-full bg-teal-900 px-5 py-3 font-semibold text-white transition hover:bg-teal-700"
              >
                Open hotel detail
              </Link>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Create another hotel
              </button>
            </div>
          </section>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">Hotel details</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Hotel name</span>
                <input required value={form.hotelName} onChange={(e) => updateField('hotelName', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Domain</span>
                <input value={form.domain} onChange={(e) => updateField('domain', e.target.value)} placeholder="optional-subdomain" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                <span className="mb-1.5 block font-medium">Address</span>
                <input required value={form.address} onChange={(e) => updateField('address', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">City</span>
                <input required value={form.city} onChange={(e) => updateField('city', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">State</span>
                <input value={form.state} onChange={(e) => updateField('state', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Country</span>
                <input required value={form.country} onChange={(e) => updateField('country', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Hotel phone</span>
                <input required value={form.hotelPhone} onChange={(e) => updateField('hotelPhone', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Hotel email</span>
                <input required type="email" value={form.hotelEmail} onChange={(e) => updateField('hotelEmail', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Website</span>
                <input value={form.website} onChange={(e) => updateField('website', e.target.value)} placeholder="https://example.com" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Currency</span>
                <input value={form.currency} onChange={(e) => updateField('currency', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 uppercase outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Timezone</span>
                <input value={form.timezone} onChange={(e) => updateField('timezone', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">Initial admin</h2>
            <div className="mt-5 grid gap-4">
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">First name</span>
                <input required value={form.adminFirstName} onChange={(e) => updateField('adminFirstName', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Last name</span>
                <input required value={form.adminLastName} onChange={(e) => updateField('adminLastName', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Admin email</span>
                <input required type="email" value={form.adminEmail} onChange={(e) => updateField('adminEmail', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Admin phone</span>
                <input value={form.adminPhone} onChange={(e) => updateField('adminPhone', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">What this creates</p>
              <p className="mt-2">The tenant gets a hotel record, an Administration department, a Hotel Admin job title, and an initial `ADMIN` account that must change password on first login.</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Creating tenant...' : 'Create hotel tenant'}
              </button>
              <Link
                href="/hotels"
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Back to hotels
              </Link>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
