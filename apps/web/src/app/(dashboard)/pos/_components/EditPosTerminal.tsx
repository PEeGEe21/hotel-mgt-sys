'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  PosTerminal,
  usePosTerminalGroups,
  useUpdatePosTerminal,
} from '@/hooks/pos/usePosTerminals';
import { useAllUserAccounts, useUserAccounts } from '@/hooks/useUserAccounts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

export default function EditPosTerminal({
  isOpen,
  onClose,
  terminal,
}: {
  isOpen: boolean;
  onClose: () => void;
  terminal: PosTerminal | null;
}) {
  console.log(terminal, 'terminal');
  const { data: terminalGroups = [], isLoading: terminalGroupsLoading } = usePosTerminalGroups();
  const [assignForm, setAssignForm] = useState({
    device: terminal?.device,
    status: terminal?.status,
    staffId: terminal?.staffId ?? '',
    terminalGroupId: terminal?.terminalGroupId ?? '',
  });
  const updateTerminal = useUpdatePosTerminal(terminal?.id ?? '');
  const { data: users = [] } = useAllUserAccounts();

  useEffect(() => {
    if (!isOpen) return;
    setAssignForm({
      device: terminal?.device,
      status: terminal?.status,
      staffId: terminal?.staffId ?? '',
      terminalGroupId: terminal?.terminalGroupId ?? '',
    });
  }, [isOpen, terminal?.device, terminal?.status, terminal?.staffId, terminal?.terminalGroupId]);

  const staffOptions = useMemo(
    () =>
      users.filter((u) => u.staffId).map((u) => ({ id: u.staffId as string, name: u.staffName })),
    [users],
  );
  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogOverlay className="bg-black/70 backdrop-blur-sm " />
        <DialogContent
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-md ring-0 !outline-none shadow-2xl"
        >
          <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#1e2536]">
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Manage Assignment
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">Update device, status, or staff.</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={18} />
            </button>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest">Group</label>
              <select
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, terminalGroupId: e.target.value }))
                }
                value={assignForm.terminalGroupId}
                className="h-12 w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                {terminalGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest">Device</label>
              <select
                onChange={(e) => setAssignForm((prev) => ({ ...prev, device: e.target.value }))}
                value={assignForm.device}
                className="h-12 w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                {['Desktop', 'Tablet', 'Mobile'].map((device) => (
                  <option key={device} value={device}>
                    {device}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest">Status</label>
              <select
                onChange={(e) => setAssignForm((prev) => ({ ...prev, status: e.target.value }))}
                value={assignForm.status}
                className="h-12 w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                {['Online', 'Offline'].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest">
                Assigned Staff
              </label>
              <select
                onChange={(e) => setAssignForm((prev) => ({ ...prev, staffId: e.target.value }))}
                value={assignForm.staffId}
                className="h-12 w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="">Unassigned</option>
                {staffOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-4 border-t border-[#1e2536] flex gap-3">
            <button
              onClick={async () => {
                onClose();
              }}
              className="flex-1 bg-white/5 hover:bg-red-500/10 text-red-400 rounded-lg py-2.5 text-sm font-medium transition-colors border border-transparent hover:border-red-500/40"
            >
              Cancel
            </button>
            {/* <button
              onClick={async () => {
                if (!terminal) return;
                if (!confirm('Delete this terminal?')) return;
                await deleteTerminal.mutateAsync(terminal?.id);
                onClose();
              }}
              className="flex-1 bg-white/5 hover:bg-red-500/10 text-red-400 rounded-lg py-2.5 text-sm font-medium transition-colors border border-transparent hover:border-red-500/40"
            >
              Delete
            </button> */}
            <button
              onClick={async () => {
                await updateTerminal.mutateAsync({
                  device: assignForm.device,
                  status: assignForm.status,
                  staffId: assignForm.staffId || null,
                  terminalGroupId: assignForm.terminalGroupId,
                });
                onClose();
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              Save
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
