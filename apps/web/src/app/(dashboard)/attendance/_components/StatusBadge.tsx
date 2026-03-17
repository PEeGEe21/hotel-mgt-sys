import { AttendanceStatus, STATUS_CONFIG } from '@/lib/attendance-data';

export default function StatusBadge({ status }: { status: AttendanceStatus }) {
  const s = STATUS_CONFIG[status];
  const Icon = s.icon;
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit border ${s.bg} ${s.color} ${s.border}`}
    >
      <Icon size={10} />
      {status}
    </span>
  );
}
