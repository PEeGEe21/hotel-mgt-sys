export type DashboardWidgetSize = 'compact' | 'wide' | 'full';

export type DashboardFeatureFlagsResponse = {
  flags: Record<string, boolean>;
};

export type DashboardConfigWidget = {
  id: string;
  title: string;
  permissionKey: string;
  featureFlag: string | null;
  defaultEnabled: boolean;
  defaultSize: DashboardWidgetSize;
  allowedSizes: DashboardWidgetSize[];
  position: number;
  enabled: boolean;
  size: DashboardWidgetSize;
  sizeOverride: DashboardWidgetSize | null;
  config: Record<string, unknown> | null;
};

export type DashboardConfigResponse = {
  role: string;
  widgets: DashboardConfigWidget[];
};
