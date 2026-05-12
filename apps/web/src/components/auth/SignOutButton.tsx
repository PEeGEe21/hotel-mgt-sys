'use client';

import { useState } from 'react';
import { LogOut, TriangleAlert } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from '@/components/ui/dialog';

type SignOutButtonProps = {
  className?: string;
  compact?: boolean;
  onBeforeOpen?: () => void;
  onAfterConfirm?: () => void;
};

export default function SignOutButton({
  className,
  compact = false,
  onBeforeOpen,
  onAfterConfirm,
}: SignOutButtonProps) {
  const logout = useAuthStore((state) => state.logout);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [open, setOpen] = useState(false);

  const handleConfirm = async () => {
    await logout();
    setOpen(false);
    onAfterConfirm?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onBeforeOpen?.();
          setOpen(true);
        }}
        className={className}
      >
        <LogOut size={compact ? 14 : 16} />
        Sign out
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogOverlay className="bg-black/70 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DialogContent
          showCloseButton={false}
          className="max-w-md rounded-2xl border border-[#1e2536] bg-[#161b27] p-0 text-slate-200"
        >
          <DialogHeader className="border-b border-[#1e2536] px-6 py-5">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
              <TriangleAlert size={18} />
            </div>
            <DialogTitle className="text-lg font-semibold text-white">Confirm sign out</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              Are you sure you want to sign out? Any unsaved work on this device may be lost.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="px-6 py-5 sm:justify-between">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Signing out...' : 'Yes, sign out'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
