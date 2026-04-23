import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import type { Facility } from '@/hooks/facility/useFacility';

function Detail({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-slate-200 mt-1">{value === undefined || value === null || value === '' ? '—' : String(value)}</p>
    </div>
  );
}

export default function FacilityDetailsModal({
  facility,
  onClose,
}: {
  facility: Facility | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(facility)} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent
        showCloseButton={false}
        className="bg-[#161b27] border border-[#1e2536] ring-0 !outline-none rounded-2xl w-full max-w-2xl shadow-2xl p-6"
      >
        <DialogTitle className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">{facility?.name ?? 'Facility Details'}</h2>
            <p className="text-xs text-slate-500 mt-1">{facility?.description ?? 'Facility profile and booking rules'}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </DialogTitle>

        {facility && (
          <div className="grid grid-cols-2 gap-5">
            <Detail label="Type" value={facility.type} />
            <Detail label="Status" value={facility.status} />
            <Detail label="Location" value={facility.location} />
            <Detail label="Department" value={facility.department} />
            <Detail label="Manager" value={facility.manager} />
            <Detail label="Capacity" value={facility.capacity} />
            <Detail label="Open Time" value={facility.openTime} />
            <Detail label="Close Time" value={facility.closeTime} />
            <Detail label="Base Rate" value={facility.baseRate ? `₦${facility.baseRate.toLocaleString()}` : null} />
            <Detail label="Rate Unit" value={facility.rateUnit} />
            <Detail label="Requires Approval" value={facility.requiresApproval ? 'Yes' : 'No'} />
            <Detail label="Inspections" value={facility.inspections} />
            <div className="col-span-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Amenities</p>
              <p className="text-sm text-slate-200 mt-1">
                {facility.amenities?.length ? facility.amenities.join(', ') : '—'}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
