'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { widgetRegistry } from './widget-registry';
import type { Permission } from '@/lib/permissions';
import { DashboardConfigWidget, DashboardWidgetSize } from '@/types/dashboard';
import { useDashboardFeatureFlags } from '@/hooks/dashboard/useDashboardFeatureFlags';
import { useDashboardConfig } from '@/hooks/dashboard/useDashboardConfig';

function resolveWidgetSize(widget: DashboardConfigWidget): DashboardWidgetSize {
  if (widget.id === 'outstanding_folios') return 'compact';
  return widget.size;
}

function spanClass(size: DashboardWidgetSize) {
  if (size === 'full') return 'lg:col-span-2 xl:col-span-3';
  if (size === 'wide') return 'lg:col-span-2 xl:col-span-2';
  return 'lg:col-span-1 xl:col-span-1';
}

export function DashboardRenderer() {
  const { can, ready } = usePermissions();
  const { data: config, isLoading: configLoading } = useDashboardConfig();
  const { data: featureFlags, isLoading: flagsLoading } = useDashboardFeatureFlags();

  const widgets = (config?.widgets ?? []).filter((widget) => {
    if (!widgetRegistry[widget.id]) return false;
    if (widget.id === 'pending_approvals') return false;
    if (!can(widget.permissionKey as Permission)) return false;
    if (!widget.featureFlag) return true;
    return featureFlags?.flags?.[widget.featureFlag] !== false;
  });

  if (!ready || configLoading || flagsLoading) {
    return <div className="text-sm text-slate-400">Loading dashboard…</div>;
  }

  if (!widgets.length) {
    return (
      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-6 text-sm text-slate-400">
        No dashboard widgets are available for your current role and permissions.
      </div>
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
