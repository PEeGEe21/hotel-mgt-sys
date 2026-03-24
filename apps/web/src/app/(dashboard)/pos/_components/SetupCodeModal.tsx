// Drop this component into pos/page.tsx ConfigTab
// Triggered by "Generate Setup Code" button on each terminal card

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Monitor, Loader2, RefreshCw } from 'lucide-react';
import { useGenerateSetupCode, type SetupCodeResult } from '@/hooks/useTerminalAuth';
import openToast from '@/components/ToastComponent';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from '@/components/ui/dialog';

export function SetupCodeModal({
  isOpen,
  terminalId,
  terminalName,
  onClose,
}: {
  isOpen: boolean;
  terminalId: string | undefined;
  terminalName: string;
  onClose: () => void;
}) {
  const [result, setResult] = useState<SetupCodeResult | null>(null);
  const [mounted, setMounted] = useState(true);
  const generate = useGenerateSetupCode();

  // Auto-generate on open
  // useState(() => {
  //   generate
  //     .mutateAsync(terminalId ?? '')
  //     .then(setResult)
  //     .catch(() => {});
  // });

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.setupCode);
    openToast('success', 'Code copied');
  };

  const handleGenerate = () => {
    generate
      .mutateAsync(terminalId ?? '')
      .then(setResult)
      .catch(() => {});
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm " />
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-md ring-0 !outline-none shadow-2xl p-4"
      >
        <DialogHeader className="flex flex-row items-center justify-between px-3 pt-5 pb-4 border-b border-[#1e2536]">
          <div className="flex items-center gap-2">
            <Monitor size={15} className="text-blue-400" />
            <DialogTitle className="text-base font-bold text-white">Setup Code</DialogTitle>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </DialogHeader>

        <div className="px-3 py-6 space-y-5">
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className="text-sm text-slate-400">Terminal</p>
              <p className="text-white font-semibold mt-0.5">{terminalName}</p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f1117] border border-[#1e2536] hover:border-slate-500 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              <RefreshCw size={13} className={generate.isPending ? 'animate-spin' : ''} />
            </button>
          </div>

          {generate.isPending ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 size={20} className="animate-spin text-slate-500" />
            </div>
          ) : result ? (
            <>
              {/* The code */}
              <div className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-5 text-center">
                <p className="text-4xl font-bold text-white tracking-[0.4em] font-mono">
                  {result.setupCode}
                </p>
                <p className="text-xs text-slate-500 mt-2">One-time use · {result.expiresIn}</p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400">
                {result.note}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/15 border border-blue-500/20 hover:bg-blue-600/25 text-blue-400 text-sm font-medium transition-colors"
                >
                  <Copy size={13} /> Copy Code
                </button>
              </div>
            </>
          ) : (
            <></>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
