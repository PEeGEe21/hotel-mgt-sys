// ─── Delete Confirm ───────────────────────────────────────────────────────────
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useDeleteGuest, type ApiGuest } from '@/hooks/useGuests';
import openToast from '@/components/ToastComponent';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';

export default function DeleteConfirm({
  isOpen,
  guest,
  onClose,
}: {
  isOpen: boolean;
  guest: ApiGuest;
  onClose: () => void;
}) {
  const deleteGuest = useDeleteGuest();
  const router = useRouter();
  const [error, setError] = useState('');

  const handleDelete = async () => {
    try {
      await deleteGuest.mutateAsync(guest.id);
      openToast('success', `${guest.firstName} ${guest.lastName} deleted`);
      router.push('/guests');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Could not delete guest.';
      setError(msg);
      openToast('error', msg);
    }
  };

  return createPortal(
    <Dialog
      open={isOpen}
      onOpenChange={() => {
        onClose();
      }}
    >
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent className="bg-[#161b27] border border-[#1e2536] ring-0 !outline-none rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <DialogTitle className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <Trash2 size={18} className="text-red-400" />
        </DialogTitle>
        <div className="text-center">
          <h3 className="text-base font-bold text-white">
            Delete {guest.firstName} {guest.lastName}?
          </h3>
          <p className="text-sm text-slate-500 mt-1">This cannot be undone.</p>
        </div>
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteGuest.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {deleteGuest.isPending && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </DialogContent>
    </Dialog>,
    document.body,
  );
}
