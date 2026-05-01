export type NotificationMetadata = Record<string, unknown> | null;

function getString(metadata: NotificationMetadata, key: string) {
  if (!metadata) return null;
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function getBoolean(metadata: NotificationMetadata, key: string) {
  if (!metadata) return false;
  return metadata[key] === true;
}

export function getNotificationHref(metadata: NotificationMetadata) {
  return getString(metadata, 'href');
}

export function getNotificationMailingHref(
  metadata: NotificationMetadata,
  canViewMailing: boolean,
) {
  if (!canViewMailing || !getBoolean(metadata, 'hasEmailDelivery')) return null;
  return getString(metadata, 'mailingHref');
}
