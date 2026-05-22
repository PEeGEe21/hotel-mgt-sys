'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';

type ConfirmActionDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'destructive';
  isPending?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmActionDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  isPending = false,
  onClose,
  onConfirm,
}: ConfirmActionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent className="w-full max-w-md rounded-2xl border border-[#1e2536] bg-[#161b27] p-6 shadow-2xl">
        <DialogTitle className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
          </div>
        </DialogTitle>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-[#1e2536] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isPending}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              tone === 'destructive' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type PasswordPromptDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
};

export function PasswordPromptDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Continue',
  isPending = false,
  onClose,
  onConfirm,
}: PasswordPromptDialogProps) {
  const [value, setValue] = useState('');

  const handleClose = () => {
    if (isPending) return;
    setValue('');
    onClose();
  };

  const handleConfirm = async () => {
    await onConfirm(value.trim());
    setValue('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent className="w-full max-w-md rounded-2xl border border-[#1e2536] bg-[#161b27] p-6 shadow-2xl">
        <DialogTitle>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
        </DialogTitle>
        <div className="mt-5 space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-500">Temporary Password</label>
          <input
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Enter a temporary password"
            className="h-12 w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
          />
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-[#1e2536] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isPending || !value.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
