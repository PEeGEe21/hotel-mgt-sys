
// ─── Add Guest Modal ──────────────────────────────────────────────────────────
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import Select from 'react-select';
import countries from 'country-list';
import { useCreateGuest, type CreateGuestInput } from '@/hooks/useGuests';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import openToast from '@/components/ToastComponent';
import { SELECT_STYLES } from '@/lib/select-styles';
// ─── Constants ────────────────────────────────────────────────────────────────
const COUNTRY_OPTIONS = countries
  .getData()
  .map((c: { code: string; name: string }) => ({ value: c.name, label: c.name }));
const ID_TYPES = ['Passport', "Driver's License", 'National ID', 'Resident Permit', 'Other'];
const STAY_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'short_time', label: 'Short Time' },
];

export default function AddGuestModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const createGuest = useCreateGuest();
  const [form, setForm] = useState<CreateGuestInput>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    nationality: '',
    idType: '',
    idNumber: '',
    dateOfBirth: '',
    address: '',
    notes: '',
    stayType: '',
    isVip: false,
    emailOptIn: false,
  });
  const [error, setError] = useState('');
  const [duplicateGuest, setDuplicateGuest] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const set = (k: keyof CreateGuestInput, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const router = useRouter();

  const handleSave = async () => {
    if (!form.firstName.trim()) return setError('First name is required.');
    if (!form.lastName.trim()) return setError('Last name is required.');
    if (!form.phone.trim()) return setError('Phone number is required.');
    const parsedPhone = parsePhoneNumberFromString(form.phone, 'NG');
    if (!parsedPhone || !parsedPhone.isValid()) return setError('Enter a valid phone number.');
    setError('');
    try {
      await createGuest.mutateAsync({
        ...form,
        phone: parsedPhone.formatInternational(),
        email: form.email || undefined,
        nationality: form.nationality || undefined,
        idType: form.idType || undefined,
        idNumber: form.idNumber || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        address: form.address || undefined,
        stayType: form.stayType || 'full_time',
      });
      onClose();
    } catch (e: any) {
      const data = e?.response?.data;

      if (data?.guestId) {
        setDuplicateGuest({
          id: data.guestId,
          name: data.name,
        });
        setError(`Guest already exists`);
        openToast('error', 'Guest already exists');
      } else {
        setError(data?.message ?? 'Could not save guest.');
        openToast('error', data?.message ?? 'Could not save guest.');
      }
    }
  };

  const inputCls =
    'h-12 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
      {children}
    </label>
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm " />
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="bg-[#161b27] border border-[#1e2536] ring-0 !outline-none rounded-2xl w-full max-w-lg sm:max-w-3xl shadow-2xl overflow-hidden"
      >
        <DialogTitle className="flex items-center justify-between pt-4 pb-2 border-b border-[#1e2536]">
          <div>
            <h2 className="text-base font-bold text-white">New Guest</h2>
            <p className="text-xs text-slate-500 mt-0.5">Create a guest profile</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </DialogTitle>

        <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                placeholder="Chidi"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                placeholder="Okeke"
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
                  const formatted = new AsYouType('NG').input(e.target.value);
                  set('phone', formatted);
                  if (error) setError('');
                }}
                placeholder="+234 802 111 2233"
                className={inputCls}
              />
            </div>
            <div>
              <Label>Email</Label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="guest@email.com"
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
                placeholder="Select ID type…"
                styles={SELECT_STYLES}
              />
            </div>
            <div>
              <Label>ID Number</Label>
              <input
                value={form.idNumber}
                onChange={(e) => set('idNumber', e.target.value)}
                placeholder="A12345678"
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
              placeholder="Home or billing address"
              className={inputCls}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Preferences, allergies, special requests…"
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <button
                type="button"
                onClick={() => set('isVip', !form.isVip)}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${form.isVip ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-[#1e2536] text-slate-600 hover:border-slate-500'}`}
              >
                <Star size={14} className={form.isVip ? 'fill-amber-400' : ''} />
              </button>
              <span className="text-sm text-slate-400">Mark as VIP</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => set('emailOptIn', !form.emailOptIn)}
                className={`w-8 h-5 rounded-full border transition-colors cursor-pointer relative ${form.emailOptIn ? 'bg-blue-600 border-blue-500' : 'bg-[#0f1117] border-[#1e2536]'}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.emailOptIn ? 'left-3' : 'left-0.5'}`}
                />
              </div>
              <span className="text-sm text-slate-400">Send welcome email</span>
              <span className="text-[10px] text-slate-600">(off by default)</span>
            </label>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-3 space-y-2">
              <p>{error}</p>

              {duplicateGuest && (
                <button
                  onClick={() => router.push(`/guests/${duplicateGuest.id}`)}
                  className="text-blue-400 underline text-xs"
                >
                  View existing guest ({duplicateGuest.name})
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 pb-4 pt-4 border-t border-[#1e2536]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white hover:border-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={createGuest.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {createGuest.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Save Guest
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
