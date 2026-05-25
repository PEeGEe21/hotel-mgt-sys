'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TOAST_CONFIGS = {
  success: {
    title: 'Success',
    defaultMessage: 'Action completed successfully.',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
  },
  error: {
    title: 'Error',
    defaultMessage: 'Something went wrong.',
    icon: AlertCircle,
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
  },
  info: {
    title: 'Info',
    defaultMessage: 'Heads up.',
    icon: Info,
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-400',
  },
  warning: {
    title: 'Warning',
    defaultMessage: 'Please review this.',
    icon: TriangleAlert,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
  },
} as const;

type ToastType = keyof typeof TOAST_CONFIGS;

function CustomToast({
  title,
  message,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex min-w-[300px] max-w-[400px] items-center gap-3 p-4">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10',
          iconBg,
        )}
      >
        <Icon className={cn('h-5 w-5', iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-tight text-white">{title}</h3>
        {message ? <p className="mt-1 text-xs leading-tight text-slate-400">{message}</p> : null}
      </div>
    </div>
  );
}

export default function openToast(type: ToastType, customMessage?: string) {
  const config = TOAST_CONFIGS[type];
  const message = customMessage || config.defaultMessage;

  return toast.custom(
    () => (
      <CustomToast
        title={config.title}
        message={message}
        icon={config.icon}
        iconBg={config.iconBg}
        iconColor={config.iconColor}
      />
    ),
    {
      duration: 4000,
      style: {
        background: 'rgba(15, 23, 42, 0.96)',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: '16px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 18px 48px rgba(15, 23, 42, 0.28)',
        padding: 0,
      },
    },
  );
}
