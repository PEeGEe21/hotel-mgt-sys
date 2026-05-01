import type { AppNotification, AppNotificationEvent } from '@/hooks/useNotifications';
import type { NotificationMetadata } from '@/lib/notification-links';

function asString(metadata: NotificationMetadata, key: string) {
  if (!metadata) return null;
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(metadata: NotificationMetadata, key: string) {
  if (!metadata) return null;
  const value = metadata[key];
  return typeof value === 'number' ? value : null;
}

export function getNotificationSeverity(metadata: NotificationMetadata) {
  const severity = asString(metadata, 'severity');
  if (!severity) return null;
  if (['info', 'success', 'warning', 'critical'].includes(severity)) return severity;
  return null;
}

export const NOTIFICATION_EVENT_LABELS: Record<AppNotificationEvent, string> = {
  newReservation: 'Reservation',
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  upcomingArrival: 'Upcoming Arrival',
  checkOutDue: 'Checkout Due',
  paymentOverdue: 'Overdue Payment',
  paymentReceived: 'Payment',
  lowInventory: 'Inventory',
  housekeepingAlert: 'Housekeeping',
  noShowFollowUp: 'No-Show',
  maintenanceAlert: 'Maintenance',
  maintenanceEscalation: 'Maintenance Escalation',
  attendanceAlert: 'Attendance',
  dailyDigest: 'Daily Digest',
  systemAlerts: 'System',
};

export function formatNotificationEventLabel(event: AppNotificationEvent) {
  return NOTIFICATION_EVENT_LABELS[event] ?? event;
}

export function getNotificationContextSummary(item: AppNotification) {
  const metadata = item.metadata;
  const explicitSummary = asString(metadata, 'summary');
  if (explicitSummary) return explicitSummary;

  switch (item.event) {
    case 'newReservation':
    case 'checkIn':
    case 'checkOut':
    case 'upcomingArrival':
      return [asString(metadata, 'reservationNo'), asString(metadata, 'roomNumber')]
        .filter(Boolean)
        .join(' · ');
    case 'paymentReceived':
      return [asString(metadata, 'reservationNo'), asString(metadata, 'method')]
        .filter(Boolean)
        .join(' · ');
    case 'paymentOverdue': {
      const overdueCount = asNumber(metadata, 'overdueCount');
      const totalOutstanding = asNumber(metadata, 'totalOutstanding');
      return [
        overdueCount !== null ? `Folios: ${overdueCount}` : null,
        totalOutstanding !== null ? `Outstanding: ${totalOutstanding.toLocaleString('en-NG')}` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'checkOutDue': {
      const dueToday = asNumber(metadata, 'dueTodayCount');
      const overdue = asNumber(metadata, 'overdueCount');
      return [`Due today: ${dueToday ?? 0}`, `Overdue: ${overdue ?? 0}`].join(' · ');
    }
    case 'housekeepingAlert': {
      const graceHours = asNumber(metadata, 'graceHours');
      return graceHours ? `Follow-up window: ${graceHours}h` : 'Checkout prep follow-up';
    }
    case 'noShowFollowUp': {
      const candidateCount = asNumber(metadata, 'candidateCount');
      return candidateCount !== null ? `Needs review: ${candidateCount}` : 'Arrival follow-up';
    }
    case 'maintenanceAlert':
      return [asString(metadata, 'requestNo'), asString(metadata, 'priority')]
        .filter(Boolean)
        .join(' · ');
    case 'maintenanceEscalation': {
      const escalationCount = asNumber(metadata, 'escalationCount');
      return escalationCount !== null ? `Escalations: ${escalationCount}` : 'Open urgent requests';
    }
    case 'attendanceAlert':
      return [asString(metadata, 'employeeCode'), asString(metadata, 'alertKind')]
        .filter(Boolean)
        .join(' · ');
    case 'dailyDigest':
      return [asString(metadata, 'nextArrivalDate'), asString(metadata, 'summary')]
        .filter(Boolean)
        .join(' · ');
    case 'lowInventory':
      return [asString(metadata, 'sku'), asString(metadata, 'unit')]
        .filter(Boolean)
        .join(' · ');
    default:
      return null;
  }
}

export function getNotificationSecondaryMessage(item: AppNotification) {
  const metadata = item.metadata;

  switch (item.event) {
    case 'paymentReceived': {
      const balance = asNumber(metadata, 'balance');
      return balance !== null ? `Balance remaining: ${balance.toLocaleString('en-NG')}` : null;
    }
    case 'paymentOverdue':
      return asString(metadata, 'alertDate');
    case 'noShowFollowUp':
      return asString(metadata, 'alertDate');
    case 'maintenanceAlert':
      return asString(metadata, 'status');
    case 'maintenanceEscalation':
      return asString(metadata, 'alertDate');
    case 'attendanceAlert':
      return asString(metadata, 'staffName');
    case 'dailyDigest':
      return asString(metadata, 'alertDate');
    case 'lowInventory': {
      const quantity = asNumber(metadata, 'quantity');
      const minStock = asNumber(metadata, 'minStock');
      return quantity !== null && minStock !== null
        ? `Stock ${quantity} / minimum ${minStock}`
        : null;
    }
    default:
      return null;
  }
}

export function hasLinkedEmailDelivery(metadata: NotificationMetadata) {
  return metadata?.hasEmailDelivery === true;
}
