'use client';

export const IN_APP_NOTIFICATION_SOUND_KEY = 'hotel-os.in-app-notification-sound';

export function isInAppNotificationSoundEnabled() {
  if (typeof window === 'undefined') return true;
  const value = window.localStorage.getItem(IN_APP_NOTIFICATION_SOUND_KEY);
  return value !== 'off';
}

export function setInAppNotificationSoundEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(IN_APP_NOTIFICATION_SOUND_KEY, enabled ? 'on' : 'off');
}
