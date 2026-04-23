'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { TYPE_CONFIG, ALL_ROOM_TYPES, ALL_AMENITIES, type RoomType } from '@/lib/rooms-data';
import { useFloors } from '@/hooks/useFloors';
import { useCreateRoom } from '@/hooks/room/useRooms';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import openToast from '@/components/ToastComponent';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddRoomModal({ isOpen, onClose }: Props) {
  const { data: floors = [] } = useFloors();
  const createRoom = useCreateRoom();

  const [form, setForm] = useState({
    number: '',
    floorId: '',
    type: 'STANDARD' as RoomType,
    maxGuests: 2,
    baseRate: 150,
    amenities: [] as string[],
    description: '',
  });
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        number: '',
        floorId: '',
        type: 'STANDARD',
        maxGuests: 2,
        baseRate: 150,
        amenities: [],
        description: '',
      });
      setError('');
    }
  }, [isOpen]);

  const toggleAmenity = (a: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  const handleAdd = async () => {
    if (!form.number.trim()) return setError('Room number is required');
    if (!form.floorId) return setError('Please select a floor');
    setError('');
    try {
      await createRoom.mutateAsync(form as any);
      openToast('success', 'Created Successfully');
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Could not create room.';
      setError(msg);
      openToast('error', msg);
    }
  };

  if (!mounted || !isOpen) return null;

  const inputCls =
    'w-full bg-[#0f1117] border !border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
      {children}
    </label>
  );

  return createPortal(
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} data-testid="add-room-modal">
      {/* Backdrop */}
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="bg-[#161b27] border border-[#1e2536] ring-0 !outline-none rounded-2xl w-full max-w-lg sm:max-w-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <DialogTitle className="flex items-center justify-between pt-4 pb-4 border-b border-[#1e2536]">
          <div>
            <h2 className="text-base font-bold text-white">Add New Room</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Room will be set to Available by default
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </DialogTitle>

        {/* Body */}
        <div className="py-4 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Room Number</Label>
              <input
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                placeholder="e.g. 501"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <Label>Floor / Area</Label>
              <select
                value={form.floorId}
                onChange={(e) => setForm((f) => ({ ...f, floorId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Select floor…</option>
                {floors.map((fl) => (
                  <option key={fl.id} value={fl.id}>
                    {fl.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Max Guests</Label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.maxGuests}
                onChange={(e) => setForm((f) => ({ ...f, maxGuests: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Room Type</Label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RoomType }))}
                className={inputCls}
              >
                {ALL_ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_CONFIG[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Base Rate (₦/night)</Label>
              <input
                type="number"
                min={0}
                value={form.baseRate}
                onChange={(e) => setForm((f) => ({ ...f, baseRate: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Corner room with city view"
              className={inputCls}
              rows={3}
            />
          </div>

          <div>
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    form.amenities.includes(a)
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {form.amenities.includes(a) && <Check size={10} />}
                  {a}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Preview strip */}
        <div className="px-2 py-3 bg-[#0f1117]/60 border-t border-[#1e2536] flex items-center gap-4 text-xs text-slate-500">
          <span className={`font-semibold ${TYPE_CONFIG[form.type].color}`}>
            {TYPE_CONFIG[form.type].label}
          </span>
          {form.number && <span>Room {form.number}</span>}
          {form.maxGuests && <span>{form.maxGuests} guests</span>}
          {form.baseRate > 0 && (
            <span className="ml-auto font-bold text-slate-300">
              ₦{form.baseRate.toLocaleString()}/night
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 py-4 border-t border-[#1e2536]">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={createRoom.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            {createRoom.isPending ? 'Adding…' : 'Add Room'}
          </button>
        </div>
      </DialogContent>
    </Dialog>,
    document.body,
  );
}
