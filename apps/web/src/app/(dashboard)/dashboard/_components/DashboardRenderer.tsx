'use client';

import { AlertCircle, LayoutDashboard } from 'lucide-react';
import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { widgetRegistry } from './widget-registry';
import type { Permission } from '@/lib/permissions';
import { DashboardConfigWidget, DashboardWidgetSize } from '@/types/dashboard';
import { useDashboardFeatureFlags } from '@/hooks/dashboard/useDashboardFeatureFlags';
import { useDashboardConfig } from '@/hooks/dashboard/useDashboardConfig';

function resolveWidgetSize(widget: DashboardConfigWidget): DashboardWidgetSize {
  return widget.size;
}

function spanClass(size: DashboardWidgetSize) {
  if (size === 'full') return 'lg:col-span-2 xl:col-span-3';
  if (size === 'wide') return 'lg:col-span-2 xl:col-span-2';
  return 'lg:col-span-1 xl:col-span-1';
}

export function DashboardRenderer() {
  const { can, ready } = usePermissions();
  const {
    data: config,
    isLoading: configLoading,
    isError: configError,
    refetch: refetchConfig,
  } = useDashboardConfig();
  const {
    data: featureFlags,
    isLoading: flagsLoading,
    isError: flagsError,
    refetch: refetchFlags,
  } = useDashboardFeatureFlags();

  const widgets = (config?.widgets ?? []).filter((widget) => {
    if (!widgetRegistry[widget.id]) return false;
    if (widget.id === 'pending_approvals') return false;
    if (!can(widget.permissionKey as Permission)) return false;
    if (!widget.featureFlag) return true;
    return featureFlags?.flags?.[widget.featureFlag] !== false;
  });

  if (!ready || configLoading || flagsLoading) {
    return <DashboardGridSkeleton />;
  }

  if (configError || flagsError) {
    return (
      <DashboardPanel
        icon={<AlertCircle size={18} className="text-rose-400" />}
        title="Dashboard unavailable"
        description="We couldn't load the dashboard configuration right now. Try again in a moment."
        actionLabel="Retry"
        onAction={() => {
          void refetchConfig();
          void refetchFlags();
        }}
      />
    );
  }

  if (!widgets.length) {
    return (
      <DashboardPanel
        icon={<LayoutDashboard size={18} className="text-slate-300" />}
        title="No widgets available"
        description="No dashboard widgets are available for your current role and permissions."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {widgets.map((widget) => (
        <DashboardWidgetSlot key={widget.id} widget={widget} />
      ))}
    </div>
  );
}

function DashboardPanel({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-6">
      <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
        <div className="mb-3 rounded-full border border-[#25304a] bg-[#111623] p-3">{icon}</div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-4 rounded-lg border border-[#2a3650] bg-[#111623] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-[#3b4c72] hover:text-white"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DashboardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[190px] animate-pulse rounded-xl border border-[#1e2536] bg-[#161b27] p-5"
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="h-4 w-32 rounded bg-[#1e2536]" />
            <div className="h-4 w-16 rounded bg-[#1e2536]" />
          </div>
          <div className="space-y-3">
            <div className="h-8 w-24 rounded bg-[#1e2536]" />
            <div className="h-3 w-full rounded bg-[#1e2536]" />
            <div className="h-3 w-5/6 rounded bg-[#1e2536]" />
            <div className="h-3 w-2/3 rounded bg-[#1e2536]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardWidgetSlot({ widget }: { widget: DashboardConfigWidget }) {
  const entry = widgetRegistry[widget.id];
  if (!entry) return null;

  const Component = entry.component;
  const size = resolveWidgetSize(widget);

  return (
    <div className={spanClass(size)}>
      <Component widget={widget} />
    </div>
  );
}
