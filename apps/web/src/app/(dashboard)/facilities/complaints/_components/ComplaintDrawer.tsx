import { Drawer, DrawerContent, DrawerHeader, DrawerOverlay, DrawerTitle } from '@/components/ui/drawer';
import { type Complaint } from '@/hooks/facility/useFacilityComplaint';

export default function ComplaintDrawer({
  isOpen,
  onClose,
  complaint,
}: {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
}) {
  if (!complaint) return null;

  return (
    <Drawer open={isOpen} onOpenChange={() => onClose()} direction="right">
      <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
      <DrawerContent className="w-full max-w-xl sm:!max-w-xl bg-[#161b27] border-l border-[#1e2536] h-full flex flex-col">
        <DrawerHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-[#1e2536]">
          <DrawerTitle className="text-base font-bold text-white">Complaint Details</DrawerTitle>
        </DrawerHeader>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs text-slate-500">Complaint</p>
            <p className="text-sm text-slate-200 font-medium">{complaint.title}</p>
            <p className="text-xs text-slate-500 mt-1">{complaint.complaintNo}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Facility</p>
              <p className="text-sm text-slate-200">{complaint.facility?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Reporter</p>
              <p className="text-sm text-slate-200">
                {complaint.reporter ?? '—'}{' '}
                <span className="text-xs text-slate-500">({complaint.reporterType})</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Channel</p>
              <p className="text-sm text-slate-200">{complaint.channel}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Priority</p>
              <p className="text-sm text-slate-200">{complaint.priority}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-sm text-slate-200">{complaint.status}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Category</p>
              <p className="text-sm text-slate-200">{complaint.category}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Description</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">
                {complaint.description}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Created</p>
              <p className="text-sm text-slate-200">
                {complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Maintenance Request</p>
              <p className="text-sm text-slate-200">
                {complaint.maintenanceRequest?.requestNo ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
