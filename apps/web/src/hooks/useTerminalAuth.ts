'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { usePosStore, type TerminalStaff } from '@/store/pos.store';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TerminalInfo = {
  id: string;
  name: string;
  location: string | null;
  device: string;
  status: string;
  terminalGroup: { id: string; name: string } | null;
};

export type TerminalStatus = TerminalInfo & {
  currentStaff: TerminalStaff | null;
  hasSetupCode: boolean;
};

export type SetupCodeResult = {
  terminalId: string;
  terminalName: string;
  setupCode: string;
  expiresIn: string;
  note: string;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

// Called once per device to bind it to a terminal record
export function useAuthenticateTerminal() {
  const { setTerminalId } = usePosStore();
  return useMutation({
    mutationFn: (setupCode: string) =>
      api.post('/pos/terminals/authenticate', { setupCode }).then((r) => r.data),
    onSuccess: (data: { terminal: TerminalInfo }) => {
      setTerminalId(data.terminal.id);
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Invalid setup code'),
  });
}

// Staff PIN login on a registered terminal
export function useStaffPinLogin(terminalId: string) {
  const { setStaffSession } = usePosStore();
  return useMutation({
    mutationFn: ({ employeeCode, pin }: { employeeCode: string; pin: string }) =>
      api
        .post(`/pos/terminals/${terminalId}/staff-login`, { employeeCode, pin })
        .then((r) => r.data),
    onSuccess: (data: { staff: TerminalStaff }) => {
      setStaffSession(data.staff);
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Login failed'),
  });
}

// Staff logout
export function useStaffLogout(terminalId: string) {
  const { clearStaffSession } = usePosStore();
  return useMutation({
    mutationFn: () => api.post(`/pos/terminals/${terminalId}/staff-logout`).then((r) => r.data),
    onSuccess: () => {
      clearStaffSession();
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Logout failed'),
  });
}

// Terminal status — who's logged in, whether setup code exists
export function useTerminalStatus(terminalId: string | null) {
  return useQuery<TerminalStatus>({
    queryKey: ['terminal-status', terminalId],
    queryFn: () => api.get(`/pos/terminals/${terminalId}/status`).then((r) => r.data),
    enabled: !!terminalId,
    refetchInterval: 60_000,
  });
}

// Generate a one-time setup code — manager action from settings page
export function useGenerateSetupCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (terminalId: string) =>
      api
        .post(`/pos/terminals/${terminalId}/setup-code`)
        .then((r) => r.data) as Promise<SetupCodeResult>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-terminals'] });
    },
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Could not generate setup code'),
  });
}
