'use client';

import { useState } from 'react';
import { Star, Loader2, X, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import countries from 'country-list';
import { parsePhoneNumberFromString, AsYouType } from 'libphonenumber-js';
import { useUpdateGuest, type ApiGuest, type CreateGuestInput } from '@/hooks/useGuests';
import openToast from '@/components/ToastComponent';
import { SELECT_STYLES } from '@/lib/select-styles';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const COUNTRY_OPTIONS = countries.getData().map((c: { code: string; name: string }) => ({
  value: c.name,
  label: c.name,
}));
const ID_TYPES = ['Passport', "Driver's License", 'National ID', 'Resident Permit', 'Other'];
const STAY_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'short_time', label: 'Short Time' },
];

// ─── Edit Modal ───────────────────────────────────────────────────────────────
export default function EditGuestModal({
  isOpen,
  guest,
  onClose,
}: {
  isOpen: boolean;
  guest: ApiGuest;
  onClose: () => void;
}) {
  const updateGuest = useUpdateGuest(guest.id);
  const [form, setForm] = useState<Partial<CreateGuestInput>>({
    firstName: guest.firstName,
    lastName: guest.lastName,
    phone: guest.phone,
    email: guest.email ?? '',
    nationality: guest.nationality ?? '',
    idType: guest.idType ?? '',
    idNumber: guest.idNumber ?? '',
    dateOfBirth: guest.dateOfBirth ? guest.dateOfBirth.slice(0, 10) : '',
    address: guest.address ?? '',
    notes: guest.notes ?? '',
    stayType: guest.stayType ?? '',
    isVip: guest.isVip,
  });
  const [error, setError] = useState('');
  const set = (k: keyof CreateGuestInput, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.firstName?.trim()) return setError('First name is required.');
    if (!form.phone?.trim()) return setError('Phone is required.');
    const parsed = parsePhoneNumberFromString(form.phone, 'NG');
    if (!parsed?.isValid()) return setError('Enter a valid phone number.');
    setError('');
    try {
      await updateGuest.mutateAsync({ ...form, phone: parsed.formatInternational() });
      openToast('success', 'Guest updated successfully');
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Could not update guest.';
      setError(msg);
      openToast('error', msg);
    }
  };

  const inputCls =
    'h-12 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
      {children}
    </label>
  );

  return createPortal(
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogOverlay className=" bg-black/70 backdrop-blur-sm" />
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="bg-[#161b27] border border-[#1e2536] ring-0 !outline-none rounded-2xl w-full max-w-lg sm:max-w-3xl shadow-2xl overflow-hidden"
      >
        <DialogTitle className="flex items-center justify-between pt-3 pb-4 border-b border-[#1e2536]">
          <div>
            <h2 className="text-base font-bold text-white">Edit Guest</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {guest.firstName} {guest.lastName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </DialogTitle>

        <div className="py-3 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone *</Label>
              <input
                value={form.phone}
                onChange={(e) => {
                  set('phone', new AsYouType('NG').input(e.target.value));
                  if (error) setError('');
                }}
                className={inputCls}
              />
            </div>
            <div>
              <Label>Email</Label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nationality</Label>
              <Select
                options={COUNTRY_OPTIONS}
                value={
                  form.nationality ? { value: form.nationality, label: form.nationality } : null
                }
                onChange={(opt) => set('nationality', opt?.value ?? '')}
                placeholder="Select country…"
                styles={SELECT_STYLES}
                isSearchable
              />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
                className={inputCls + ' [color-scheme:dark]'}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ID Type</Label>
              <Select
                options={ID_TYPES.map((t) => ({ value: t, label: t }))}
                value={form.idType ? { value: form.idType, label: form.idType } : null}
                onChange={(opt) => set('idType', opt?.value ?? '')}
                placeholder="Select type…"
                styles={SELECT_STYLES}
              />
            </div>
            <div>
              <Label>ID Number</Label>
              <input
                value={form.idNumber}
                onChange={(e) => set('idNumber', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <Label>Stay Type</Label>
            <Select
              options={STAY_TYPES}
              value={STAY_TYPES.find((opt) => opt.value === form.stayType) ?? null}
              onChange={(opt) => set('stayType', opt?.value ?? '')}
              placeholder="Select stay type…"
              styles={SELECT_STYLES}
            />
          </div>
          <div>
            <Label>Address</Label>
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <button
              type="button"
              onClick={() => set('isVip', !form.isVip)}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${form.isVip ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-[#1e2536] text-slate-600 hover:border-slate-500'}`}
            >
              <Star size={14} className={form.isVip ? 'fill-amber-400' : ''} />
            </button>
            <span className="text-sm text-slate-400">VIP Guest</span>
          </label>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 pb-5 pt-4 border-t border-[#1e2536]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateGuest.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {updateGuest.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Save Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>,
    document.body,
  );
}
