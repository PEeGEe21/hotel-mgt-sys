'use client';

export function openFinanceInvoicesExport() {
  window.open('/api/proxy/finance/invoices/export', '_blank', 'noopener,noreferrer');
}

export function openFinanceInvoicePrint(id: string) {
  window.open(`/api/proxy/finance/invoices/${id}/print`, 'invoice', 'width=960,height=720');
}

export function openFinancePaymentsExport() {
  window.open('/api/proxy/finance/payments/export', '_blank', 'noopener,noreferrer');
}

export function openHrContractDownload(id: string) {
  window.open(`/api/proxy/hr/contracts/${id}/download`, '_blank', 'noopener,noreferrer');
}

export function openReservationReceipt(reservationId: string, paymentId: string) {
  window.open(
    `/api/proxy/reservations/${reservationId}/payments/${paymentId}/receipt`,
    'receipt',
    'width=420,height=620',
  );
}

export function openReservationReceiptWindow() {
  return window.open('', 'receipt', 'width=420,height=620');
}

export function loadReservationReceiptIntoWindow(
  receiptWindow: Window | null,
  reservationId: string,
  paymentId: string,
) {
  if (!receiptWindow) return;
  receiptWindow.location.href = `/api/proxy/reservations/${reservationId}/payments/${paymentId}/receipt`;
}
