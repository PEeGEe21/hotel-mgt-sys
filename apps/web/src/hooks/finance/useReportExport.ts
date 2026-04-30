'use client';

import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ExportFormat, Tab } from '@/app/(dashboard)/reports/_components/reports-shared';
import openToast from '@/components/ToastComponent';

type ExportScope = 'tab' | 'full';
type ReportRange = { from?: string; to?: string };

function extractFilename(header: string | undefined, fallback: string) {
  if (!header) return fallback;
  const match = header.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function useReportExport(range: ReportRange) {
  return useMutation({
    mutationFn: async (params: { scope: ExportScope; format: ExportFormat; report?: Tab }) => {
      const response = await api.post(
        '/reports/export',
        {
          scope: params.scope,
          format: params.format,
          report: params.report,
          from: range.from,
          to: range.to,
        },
        {
          responseType: 'blob',
        },
      );

      const filename = extractFilename(
        response.headers['content-disposition'],
        `report.${params.format === 'excel' ? 'xlsx' : 'pdf'}`,
      );

      triggerDownload(response.data, filename);
      return { filename };
    },
    onSuccess: ({ filename }) => {
      openToast('success', `Export downloaded: ${filename}`);
    },
    onError: () => {
      openToast(
        'error',
        'We could not generate that export right now. Please try again in a moment.',
      );
    },
  });
}
