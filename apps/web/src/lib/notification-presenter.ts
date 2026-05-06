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

function formatCount(label: string, value: number | null, plural = `${label}s`) {
  if (value === null) return null;
  return `${value} ${value === 1 ? label : plural}`;
}

function formatMoney(value: number | null) {
  if (value === null) return null;
  return value.toLocaleString('en-NG');
}

export function getNotificationSeverity(metadata: NotificationMetadata) {
  const severity = asString(metadata, 'severity');
  if (!severity) return null;
  if (['info', 'success', 'warning', 'critical'].includes(severity)) return severity;
  return null;
}

function getFallbackSeverity(event: AppNotificationEvent) {
  const map: Partial<Record<AppNotificationEvent, 'info' | 'success' | 'warning' | 'critical'>> = {
    paymentOverdue: 'warning',
    checkOutDue: 'warning',
    housekeepingAlert: 'warning',
    noShowFollowUp: 'warning',
    maintenanceEscalation: 'critical',
    systemAlerts: 'critical',
    paymentReceived: 'success',
    checkIn: 'success',
    lowInventory: 'warning',
  };
  return map[event] ?? null;
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
      return [
        asString(metadata, 'reservationNo'),
        asString(metadata, 'roomNumber'),
        asString(metadata, 'summary'),
      ]
        .filter(Boolean)
        .join(' · ');
    case 'checkIn':
    case 'checkOut':
      return [asString(metadata, 'reservationNo'), asString(metadata, 'roomNumber')]
        .filter(Boolean)
        .join(' · ');
    case 'upcomingArrival': {
      const arrivalCount = asNumber(metadata, 'arrivalCount');
      const unassignedCount = asNumber(metadata, 'unassignedCount');
      return [
        asString(metadata, 'arrivalDate'),
        formatCount('arrival', arrivalCount),
        unassignedCount ? `${unassignedCount} unassigned` : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    case 'paymentReceived':
      return [
        asString(metadata, 'reservationNo'),
        asString(metadata, 'method'),
        formatMoney(asNumber(metadata, 'amount')),
      ]
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
      return [
        asString(metadata, 'requestNo'),
        asString(metadata, 'priority'),
        asString(metadata, 'roomNumber') ?? asString(metadata, 'facilityName'),
      ]
        .filter(Boolean)
        .join(' · ');
    case 'maintenanceEscalation': {
      const escalationCount = asNumber(metadata, 'escalationCount');
      return escalationCount !== null ? `Escalations: ${escalationCount}` : 'Open urgent requests';
    }
    case 'attendanceAlert':
      return [
        asString(metadata, 'employeeCode'),
        asString(metadata, 'alertKind'),
        asString(metadata, 'summary'),
      ]
        .filter(Boolean)
        .join(' · ');
    case 'dailyDigest':
      return [
        asString(metadata, 'nextArrivalDate'),
        formatCount('arrival', asNumber(metadata, 'arrivalsTomorrow')),
        formatCount('departure', asNumber(metadata, 'departuresToday')),
      ]
        .filter(Boolean)
        .join(' · ');
    case 'lowInventory':
      return [asString(metadata, 'sku'), asString(metadata, 'unit')]
        .filter(Boolean)
        .join(' · ');
    case 'systemAlerts':
      return [
        asString(metadata, 'summary'),
        formatMoney(asNumber(metadata, 'totalOutstanding')),
        asString(metadata, 'alertDate'),
      ]
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
    case 'newReservation':
      return [asString(metadata, 'guestName'), asString(metadata, 'roomNumber')]
        .filter(Boolean)
        .join(' · ');
    case 'checkIn':
      return asString(metadata, 'checkedInAt');
    case 'checkOut':
      return asString(metadata, 'checkedOutAt');
    case 'upcomingArrival': {
      const unassignedCount = asNumber(metadata, 'unassignedCount');
      return unassignedCount
        ? `${unassignedCount} arrival${unassignedCount === 1 ? '' : 's'} still need room assignment`
        : asString(metadata, 'alertDate');
    }
    case 'paymentOverdue':
      return asString(metadata, 'alertDate');
    case 'checkOutDue':
      return asString(metadata, 'alertDate');
    case 'housekeepingAlert':
      return formatCount('task', asNumber(metadata, 'tasksCount'));
    case 'noShowFollowUp':
      return asString(metadata, 'alertDate');
    case 'maintenanceAlert':
      return [asString(metadata, 'status'), asString(metadata, 'title')]
        .filter(Boolean)
        .join(' · ');
    case 'maintenanceEscalation':
      return [
        formatCount('request', asNumber(metadata, 'escalationCount')),
        asString(metadata, 'alertDate'),
      ]
        .filter(Boolean)
        .join(' · ');
    case 'attendanceAlert': {
      const alertKind = asString(metadata, 'alertKind');
      if (alertKind === 'late') {
        return [asString(metadata, 'staffName'), asString(metadata, 'method')]
          .filter(Boolean)
          .join(' · ');
      }
      if (alertKind === 'absence') {
        return [asString(metadata, 'staffName'), asString(metadata, 'expectedBy')]
          .filter(Boolean)
          .join(' · ');
      }
      return asString(metadata, 'staffName');
    }
    case 'dailyDigest': {
      const extra = [
        formatCount('severe collection', asNumber(metadata, 'severeCollectionsCount')),
        formatCount('unassigned arrival', asNumber(metadata, 'unassignedArrivalsCount')),
      ]
        .filter(Boolean)
        .join(' · ');
      return extra || asString(metadata, 'alertDate');
    }
    case 'lowInventory': {
      const quantity = asNumber(metadata, 'quantity');
      const minStock = asNumber(metadata, 'minStock');
      return quantity !== null && minStock !== null
        ? `Stock ${quantity} / minimum ${minStock}`
        : null;
    }
    case 'systemAlerts':
      return (
        asString(metadata, 'arrivalDate') ??
        formatCount('severe case', asNumber(metadata, 'severeCount')) ??
        asString(metadata, 'alertDate')
      );
    default:
      return null;
  }
}

export function hasLinkedEmailDelivery(metadata: NotificationMetadata) {
  return metadata?.hasEmailDelivery === true;
}

export function resolveNotificationSeverity(item: AppNotification) {
  return getNotificationSeverity(item.metadata) ?? getFallbackSeverity(item.event);
}
