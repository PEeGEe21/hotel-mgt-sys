'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  ArrowRight,
  ChevronLeft,
  Loader2,
  BedDouble,
  Users,
  Search,
  AlertCircle,
  Star,
  Plus,
  UserPlus,
} from 'lucide-react';
import {
  useAvailableRooms,
  useCreateReservation,
  type AvailableRoom,
} from '@/hooks/useReservations';
import { useGuests, useCreateGuest } from '@/hooks/useGuests';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';
import { TYPE_CONFIG } from '@/lib/rooms-data';
import { useDebounce } from '@/hooks/useDebounce';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import { useAppStore } from '@/store/app.store';

const SOURCES = ['DIRECT', 'BOOKING.COM', 'EXPEDIA', 'AIRBNB', 'WALK_IN', 'PHONE', 'OTHER'];

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCheckoutDefault(hour?: number, minute?: number) {
  const h = String(hour ?? 12).padStart(2, '0');
  const m = String(minute ?? 0).padStart(2, '0');
  return `${h}:${m}`;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prefillGuest?: { id: string; firstName: string; lastName: string } | null;
  prefillRoom?: { id: string; number: string } | null;
}

export default function NewReservationModal({ isOpen, onClose, prefillGuest, prefillRoom }: Props) {
  const createReservation = useCreateReservation();
  const createGuest = useCreateGuest();
  const hotel = useAppStore((state) => state.hotel);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    guestId: prefillGuest?.id ?? '',
    roomId: prefillRoom?.id ?? '',
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
    source: 'DIRECT',
    specialRequests: '',
    notes: '',
  });
  const [guestSearch, setGuestSearch] = useState(
    prefillGuest ? `${prefillGuest.firstName} ${prefillGuest.lastName}` : '',
  );
  const [selectedGuest, setSelectedGuest] = useState<any>(prefillGuest ?? null);
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [newGuest, setNewGuest] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    isVip: false,
  });
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError('');
      setForm({
        guestId: prefillGuest?.id ?? '',
        roomId: prefillRoom?.id ?? '',
        checkIn: '',
        checkOut: '',
        adults: 1,
        children: 0,
        source: 'DIRECT',
        specialRequests: '',
        notes: '',
      });
      setGuestSearch(prefillGuest ? `${prefillGuest.firstName} ${prefillGuest.lastName}` : '');
      setSelectedGuest(prefillGuest ?? null);
      setSelectedRoom(null);
      setShowInlineCreate(false);
      setNewGuest({ firstName: '', lastName: '', phone: '', email: '', isVip: false });
      setCreateError('');
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const debouncedGuest = useDebounce(guestSearch, 300);
  const { data: guestData } = useGuests({ search: debouncedGuest || undefined, limit: 6 });
  const guests = guestData?.guests ?? [];

  const availParams =
    form.checkIn && form.checkOut && form.checkOut > form.checkIn
      ? { checkIn: form.checkIn, checkOut: form.checkOut, minGuests: form.adults }
      : null;
  const { data: availRooms = [], isFetching: checkingAvail } = useAvailableRooms(availParams);

  const nights =
    form.checkIn && form.checkOut
      ? Math.max(
          0,
          Math.ceil(
            (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86_400_000,
          ),
        )
      : 0;
  const totalAmount = selectedRoom ? nights * Number(selectedRoom.baseRate) : 0;
  const checkoutDefaultLabel = fmtCheckoutDefault(
    hotel?.defaultCheckoutHour,
    hotel?.defaultCheckoutMinute,
  );

  const canStep2 = !!form.guestId;
  const canStep3 = !!form.roomId && nights > 0;

  const handleCreateGuest = async () => {
    if (!newGuest.firstName.trim()) return setCreateError('First name is required.');
    if (!newGuest.phone.trim()) return setCreateError('Phone is required.');
    const parsed = parsePhoneNumberFromString(newGuest.phone, 'NG');
    if (!parsed?.isValid()) return setCreateError('Enter a valid phone number.');
    setCreateError('');
    try {
      const created = await createGuest.mutateAsync({
        firstName: newGuest.firstName.trim(),
        lastName: newGuest.lastName.trim(),
        phone: parsed.formatInternational(),
        email: newGuest.email || undefined,
        isVip: newGuest.isVip,
      });
      setSelectedGuest(created);
      setGuestSearch(`${created.firstName} ${created.lastName}`);
      setForm((f) => ({ ...f, guestId: created.id }));
      setShowInlineCreate(false);
    } catch (e: any) {
      const data = e?.response?.data;
      // Duplicate guest — offer to select existing
      if (data?.guestId) {
        setCreateError(`Guest already exists: ${data.name}`);
      } else {
        setCreateError(data?.message ?? 'Could not create guest.');
      }
    }
  };

  const handleSubmit = async () => {
    setError('');
    try {
      await createReservation.mutateAsync({
        ...form,
        totalAmount,
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not create reservation.');
    }
  };

  if (!mounted || !isOpen) return null;

  const inputCls =
    'h-12 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
      {children}
    </label>
  );

  const STEPS = [
    { n: 1, label: 'Guest' },
    { n: 2, label: 'Room & Dates' },
    { n: 3, label: 'Confirm' },
  ];

  return createPortal(
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />

      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-xl sm:max-w-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <DialogTitle className="flex items-center justify-between pb-4 border-b border-[#1e2536]">
          <div>
            <h2 className="text-base font-bold text-white">New Reservation</h2>
            <p className="text-xs text-slate-500 mt-0.5">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </DialogTitle>

        {/* Step indicators */}
        <div className="flex pt-2 pb-2 gap-2">
          {STEPS.map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all border ${step > n ? 'bg-emerald-500 border-emerald-500 text-white' : step === n ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[#0f1117] border-[#1e2536] text-slate-500'}`}
              >
                {step > n ? <Check size={12} /> : n}
              </div>
              <span
                className={`text-xs font-medium ${step === n ? 'text-slate-200' : 'text-slate-600'}`}
              >
                {label}
              </span>
              {n < 3 && (
                <div className={`flex-1 h-px ${step > n ? 'bg-emerald-500/40' : 'bg-[#1e2536]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="py-5 space-y-4 min-h-[250px] max-h-[55vh] h-full overflow-y-auto">
          {/* ── Step 1: Guest ── */}
          {step === 1 && (
            <div className="space-y-4 flex flex-col justify-between h-full">
              <div>
                <Label>Search Guest</Label>
                <div className="relative">
                  <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 focus-within:border-blue-500 transition-colors">
                    <Search size={14} className="text-slate-500 shrink-0" />
                    <input
                      value={guestSearch}
                      onChange={(e) => {
                        setGuestSearch(e.target.value);
                        if (form.guestId) setForm((f) => ({ ...f, guestId: '' }));
                        setSelectedGuest(null);
                        setShowInlineCreate(false);
                      }}
                      placeholder="Name, phone or email…"
                      className="bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none flex-1"
                      autoFocus
                    />
                    {selectedGuest && <Check size={14} className="text-emerald-400 shrink-0" />}
                  </div>

                  {/* Results dropdown */}
                  {debouncedGuest && !form.guestId && !showInlineCreate && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#161b27] border border-[#1e2536] rounded-xl shadow-xl z-10 overflow-hidden">
                      {guests.length > 0 ? (
                        <>
                          {guests.map((g) => (
                            <button
                              key={g.id}
                              onClick={() => {
                                setSelectedGuest(g);
                                setGuestSearch(`${g.firstName} ${g.lastName}`);
                                setForm((f) => ({ ...f, guestId: g.id }));
                                setShowInlineCreate(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left border-b border-[#1e2536] last:border-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {g.firstName[0]}
                                {g.lastName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium text-slate-200">
                                    {g.firstName} {g.lastName}
                                  </p>
                                  {g.isVip && (
                                    <Star size={10} className="text-amber-400 fill-amber-400" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">{g.phone}</p>
                              </div>
                            </button>
                          ))}
                          {/* Always offer to create new even when results exist */}
                          <button
                            onClick={() => {
                              const parts = guestSearch.trim().split(' ');
                              setNewGuest((g) => ({
                                ...g,
                                firstName: parts[0] ?? '',
                                lastName: parts.slice(1).join(' ') ?? '',
                              }));
                              setShowInlineCreate(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left text-slate-500 hover:text-slate-300 border-t border-[#1e2536]"
                          >
                            <UserPlus size={14} />
                            <span className="text-xs">Create new guest "{guestSearch}"</span>
                          </button>
                        </>
                      ) : (
                        /* No results */
                        <button
                          onClick={() => {
                            const parts = guestSearch.trim().split(' ');
                            setNewGuest((g) => ({
                              ...g,
                              firstName: parts[0] ?? '',
                              lastName: parts.slice(1).join(' ') ?? '',
                            }));
                            setShowInlineCreate(true);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#0f1117] border border-dashed border-[#1e2536] flex items-center justify-center shrink-0">
                            <Plus size={14} className="text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-400">
                              Create "{guestSearch}"
                            </p>
                            <p className="text-xs text-slate-500">No existing guest found</p>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Inline guest create form ── */}
              {showInlineCreate && !form.guestId && (
                <div className="bg-[#0f1117] border border-blue-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <UserPlus size={13} /> New Guest
                    </p>
                    <button
                      onClick={() => {
                        setShowInlineCreate(false);
                        setCreateError('');
                      }}
                      className="text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                        First Name *
                      </label>
                      <input
                        value={newGuest.firstName}
                        onChange={(e) => setNewGuest((g) => ({ ...g, firstName: e.target.value }))}
                        placeholder="Chidi"
                        className="w-full bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                        Last Name
                      </label>
                      <input
                        value={newGuest.lastName}
                        onChange={(e) => setNewGuest((g) => ({ ...g, lastName: e.target.value }))}
                        placeholder="Okeke"
                        className="w-full bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                        Phone *
                      </label>
                      <input
                        value={newGuest.phone}
                        onChange={(e) => {
                          setNewGuest((g) => ({
                            ...g,
                            phone: new AsYouType('NG').input(e.target.value),
                          }));
                          if (createError) setCreateError('');
                        }}
                        placeholder="+234 802 111 2233"
                        className="w-full bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newGuest.email}
                        onChange={(e) => setNewGuest((g) => ({ ...g, email: e.target.value }))}
                        placeholder="guest@email.com"
                        className="w-full bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setNewGuest((g) => ({ ...g, isVip: !g.isVip }))}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${newGuest.isVip ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-[#1e2536] text-slate-600 hover:border-slate-500'}`}
                      >
                        <Star size={12} className={newGuest.isVip ? 'fill-amber-400' : ''} />
                      </button>
                      <span className="text-xs text-slate-400">VIP</span>
                    </label>
                    <button
                      onClick={handleCreateGuest}
                      disabled={createGuest.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                    >
                      {createGuest.isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                      Create & Select
                    </button>
                  </div>
                  {createError && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {createError}
                    </p>
                  )}
                </div>
              )}

              {/* Selected guest preview */}
              {selectedGuest && (
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {selectedGuest.firstName[0]}
                    {selectedGuest.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {selectedGuest.firstName} {selectedGuest.lastName}
                      </p>
                      {selectedGuest.isVip && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          VIP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{selectedGuest.phone}</p>
                  </div>
                  <Check size={16} className="text-emerald-400 shrink-0" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mt-auto">
                <div>
                  <Label>Adults</Label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.adults}
                    onChange={(e) => setForm((f) => ({ ...f, adults: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Children</Label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={form.children}
                    onChange={(e) => setForm((f) => ({ ...f, children: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Source</Label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                    className={inputCls}
                  >
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Room & Dates ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check-in</Label>
                  <input
                    type="date"
                    value={form.checkIn}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, checkIn: e.target.value, roomId: '' }));
                      setSelectedRoom(null);
                    }}
                    min={new Date().toISOString().slice(0, 10)}
                    className={inputCls + ' [color-scheme:dark]'}
                  />
                </div>
                <div>
                  <Label>Check-out</Label>
                  <input
                    type="date"
                    value={form.checkOut}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, checkOut: e.target.value, roomId: '' }));
                      setSelectedRoom(null);
                    }}
                    min={form.checkIn || new Date().toISOString().slice(0, 10)}
                    className={inputCls + ' [color-scheme:dark]'}
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Checkout time uses the hotel default: {checkoutDefaultLabel}
                    {hotel?.timezone ? ` (${hotel.timezone})` : ''}
                  </p>
                </div>
              </div>

              {/* Room picker */}
              {form.checkIn && form.checkOut && nights > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Available Rooms</Label>
                    {checkingAvail && <Loader2 size={12} className="animate-spin text-slate-500" />}
                  </div>
                  {availRooms.length === 0 && !checkingAvail ? (
                    <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
                      <AlertCircle size={14} />
                      No rooms available for these dates
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {availRooms.map((room) => {
                        const t = TYPE_CONFIG[room.type as keyof typeof TYPE_CONFIG];
                        return (
                          <button
                            key={room.id}
                            onClick={() => {
                              setSelectedRoom(room);
                              setForm((f) => ({ ...f, roomId: room.id }));
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${form.roomId === room.id ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#0f1117] border-[#1e2536] text-slate-300 hover:border-slate-600'}`}
                          >
                            <span className="flex items-center gap-2">
                              <BedDouble
                                size={13}
                                className={
                                  form.roomId === room.id ? 'text-blue-400' : 'text-slate-500'
                                }
                              />
                              <span className="font-semibold">Room {room.number}</span>
                              <span className={`text-xs ${t?.color ?? 'text-slate-500'}`}>
                                {room.type}
                              </span>
                              {room.floor && (
                                <span className="text-xs text-slate-600">{room.floor.name}</span>
                              )}
                              <span className="text-xs text-slate-600 flex items-center gap-0.5">
                                <Users size={10} /> {room.maxGuests}
                              </span>
                            </span>
                            <span className="font-bold text-xs">
                              {fmtMoney(Number(room.baseRate))}
                              <span className="text-slate-500 font-normal">/n</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {nights > 0 && selectedRoom && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-blue-300">
                    {nights} night{nights !== 1 ? 's' : ''} ×{' '}
                    {fmtMoney(Number(selectedRoom.baseRate))}
                  </span>
                  <span className="text-base font-bold text-white">{fmtMoney(totalAmount)}</span>
                </div>
              )}

              <div>
                <Label>Special Requests</Label>
                <input
                  value={form.specialRequests}
                  onChange={(e) => setForm((f) => ({ ...f, specialRequests: e.target.value }))}
                  placeholder="Any special requests…"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-4 space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Reservation Summary
                </p>
                {[
                  {
                    label: 'Guest',
                    value: selectedGuest
                      ? `${selectedGuest.firstName} ${selectedGuest.lastName}`
                      : '—',
                  },
                  {
                    label: 'Room',
                    value: selectedRoom
                      ? `Room ${selectedRoom.number} — ${selectedRoom.type}`
                      : '—',
                  },
                  { label: 'Floor', value: selectedRoom?.floor?.name ?? '—' },
                  { label: 'Check-in', value: form.checkIn },
                  {
                    label: 'Check-out',
                    value: form.checkOut ? `${form.checkOut} · ${checkoutDefaultLabel}` : '—',
                  },
                  { label: 'Duration', value: `${nights} night${nights !== 1 ? 's' : ''}` },
                  {
                    label: 'Guests',
                    value: `${form.adults} adult${form.adults !== 1 ? 's' : ''}${form.children > 0 ? ` + ${form.children} child${form.children !== 1 ? 'ren' : ''}` : ''}`,
                  },
                  { label: 'Source', value: form.source.replace('_', ' ') },
                  { label: 'Total', value: fmtMoney(totalAmount), bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span
                      className={`${bold ? 'text-white font-bold text-base' : 'text-sm text-slate-200 font-medium'}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {form.specialRequests && (
                <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  {form.specialRequests}
                </div>
              )}

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 py-4 border-t border-[#1e2536]">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 px-4 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          {step < 3 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !canStep2 : !canStep3}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              Next <ArrowRight size={14} />
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={createReservation.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              {createReservation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Confirm Reservation
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>,
    document.body,
  );
}
