'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';
import { Role, Permission } from '@/lib/permissions';

export type RolePermission = {
  role: Role;
  permissions: Permission[];
};

export function useRolePermissions() {
  return useQuery<RolePermission[]>({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data } = await api.get('/permissions/roles');
      return data;
    },
  });
}

export function useUpdateRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roles: RolePermission[]) =>
      api.patch('/permissions/roles', { roles }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
      openToast('success', 'Role permissions updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}
