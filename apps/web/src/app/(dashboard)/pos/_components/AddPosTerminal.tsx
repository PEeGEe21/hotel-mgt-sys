'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  PosTerminalGroup,
  useCreatePosTerminal,
  usePosTerminalGroups,
} from '@/hooks/usePosTerminals';
import { useAllUserAccounts, useUserAccounts } from '@/hooks/useUserAccounts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AddPosTerminal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: terminalGroups = [], isLoading: terminalGroupsLoading } = usePosTerminalGroups();
  const { data: users = [] } = useAllUserAccounts();
  const createTerminal = useCreatePosTerminal();

  console.log(users, terminalGroups, 'terminalGroups');
  const [newTerminal, setNewTerminal] = useState({
    name: '',
    location: '',
    terminalGroupId: terminalGroups[0]?.id ?? '',
    device: 'Tablet',
    status: 'Online',
    staffId: '' as string | '',
  });

  const handleAddTerminal = async () => {
    if (!newTerminal.name.trim() || !newTerminal.location.trim()) return;
    await createTerminal.mutateAsync({
      name: newTerminal.name,
      location: newTerminal.location,
      terminalGroupId: newTerminal.terminalGroupId || null,
      device: newTerminal.device,
      status: newTerminal.status,
      staffId: newTerminal.staffId || null,
    });
    setNewTerminal({
      name: '',
      location: '',
      terminalGroupId: terminalGroups[0]?.id ?? '',
      device: 'Tablet',
      status: 'Online',
      staffId: '',
    });
  };

  const handleClose = () => {
    onClose();
    setNewTerminal({
      name: '',
      location: '',
      terminalGroupId: terminalGroups[0]?.id ?? 'Bar',
      device: 'Tablet',
      status: 'Online',
      staffId: '',
    });
  };

  const staffOptions = useMemo(
    () =>
      users?.filter((u) => u.staffId).map((u) => ({ id: u.staffId as string, name: u.staffName })),
    [users],
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm " />
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-md ring-0 !outline-none shadow-2xl"
      >
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#1e2536]">
          <div>
            <DialogTitle className="text-base font-bold text-white">Add Terminal</DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">Create a new terminal assignment.</p>
          </div>
          <button
            onClick={() => handleClose()}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </DialogHeader>
        <div className="py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest">Name</label>
              <input
                value={newTerminal.name}
                onChange={(e) => setNewTerminal((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Terminal name"
                className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest">Location</label>
              <input
                value={newTerminal.location}
                onChange={(e) => setNewTerminal((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Location"
                className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest">Group</label>
              <select
                value={newTerminal.terminalGroupId}
                onChange={(e) =>
                  setNewTerminal((prev) => ({ ...prev, terminalGroupId: e.target.value }))
                }
                className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                {terminalGroups.map((group: PosTerminalGroup) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest">Device</label>
              <select
                value={newTerminal.device}
                onChange={(e) => setNewTerminal((prev) => ({ ...prev, device: e.target.value }))}
                className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                {['Desktop', 'Tablet', 'Mobile'].map((device) => (
                  <option key={device} value={device}>
                    {device}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-widest">Status</label>
              <select
                value={newTerminal.status}
                onChange={(e) => setNewTerminal((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
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
                value={newTerminal.staffId}
                onChange={(e) => setNewTerminal((prev) => ({ ...prev, staffId: e.target.value }))}
                className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
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
        </div>
        <div className="pt-4 border-t border-[#1e2536] flex gap-3">
          <button
            onClick={async () => {
              handleClose();
            }}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddTerminal}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            Add Terminal
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
