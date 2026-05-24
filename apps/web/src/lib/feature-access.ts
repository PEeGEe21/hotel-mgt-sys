export const FEATURE_ROUTE_PREFIXES: Record<string, string> = {
  advanced_reports: '/reports',
  module_inventory: '/inventory',
  module_housekeeping: '/housekeeping',
  module_facilities: '/facilities',
  module_mailing: '/mailing',
  keycard_auth: '/settings/hotel/keycards',
};

export const FEATURE_NAV_TARGETS: Record<string, string[]> = {
  advanced_reports: ['/reports'],
  module_inventory: ['/inventory'],
  module_housekeeping: ['/housekeeping'],
  module_facilities: [
    '/facilities/list',
    '/facilities/bookings',
    '/facilities/reservations',
    '/facilities/complaints',
    '/facilities/inspections',
    '/facilities/maintenance',
    '/facilities/requisitions',
    '/facilities/reports',
  ],
  module_mailing: ['/mailing'],
};

export function resolveFeatureForPath(pathname: string) {
  const match = Object.entries(FEATURE_ROUTE_PREFIXES).find(([, prefix]) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match?.[0] ?? null;
}

export function isFeatureEnabledForPath(flags: Record<string, boolean> | undefined, pathname: string) {
  const featureKey = resolveFeatureForPath(pathname);
  if (!featureKey) return true;
  return flags?.[featureKey] !== false;
}
