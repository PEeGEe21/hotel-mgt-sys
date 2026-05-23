'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useCancelOrder, type ApiOrder } from '@/hooks/pos/usePosOrders';

export default function CancelPosOrderModal({
  order,
  onClose,
  onSuccess,
}: {
  order: ApiOrder;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const cancelOrder = useCancelOrder(order.id);
  const [reason, setReason] = useState('');

  const contextLabel = order.tableNo
    ? `Table ${order.tableNo}`
    : order.roomNo
      ? `Room ${order.roomNo}`
      : order.posTerminal?.name ?? 'Walk-in order';

  const handleConfirm = async () => {
    await cancelOrder.mutateAsync(reason.trim() || undefined);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#1e2536] bg-[#161b27] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-2xl border border-red-500/20 bg-red-500/10 p-2.5 text-red-300">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Cancel POS Order</h2>
              <p className="mt-1 text-xs text-slate-400">
                {order.orderNo} · {contextLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 transition-colors hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            This will cancel the order and remove it from active POS and prep workflows.
          </div>

          <div className="rounded-xl bg-[#0f1117] p-4">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Status</span>
              <span className="font-semibold text-slate-200">{order.status}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-400">
              <span>Total</span>
              <span className="font-semibold text-white">
                {new Intl.NumberFormat('en-NG', {
                  style: 'currency',
                  currency: 'NGN',
                  maximumFractionDigits: 0,
                }).format(Number(order.total))}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Cancellation Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason for audit trail"
              className="min-h-24 w-full rounded-xl border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-red-500/40"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#1e2536] px-4 py-2.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Keep Order
          </button>
          <button
            onClick={handleConfirm}
            disabled={cancelOrder.isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
          >
            {cancelOrder.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Cancel Order
          </button>
        </div>
      </div>
    </div>
  );
}
