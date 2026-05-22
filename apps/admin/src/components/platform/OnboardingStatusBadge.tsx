'use client';

type OnboardingStatus = 'PENDING_SETUP' | 'ROOMS_ADDED' | 'STAFF_INVITED' | 'ACTIVE';

const onboardingStatusConfig: Record<
  OnboardingStatus,
  {
    label: string;
    tone: string;
    description: string;
  }
> = {
  PENDING_SETUP: {
    label: 'Pending setup',
    tone: 'bg-slate-200 text-slate-700',
    description: 'No rooms or staff added yet.',
  },
  ROOMS_ADDED: {
    label: 'Rooms added',
    tone: 'bg-sky-100 text-sky-800',
    description: 'Inventory is taking shape, but staffing still needs attention.',
  },
  STAFF_INVITED: {
    label: 'Staff invited',
    tone: 'bg-amber-100 text-amber-800',
    description: 'Admin and staff records exist, but rooms are still missing.',
  },
  ACTIVE: {
    label: 'Active onboarding',
    tone: 'bg-emerald-100 text-emerald-800',
    description: 'Rooms and staff are both present.',
  },
};

export function OnboardingStatusBadge({ status, showDescription = false }: { status: OnboardingStatus; showDescription?: boolean }) {
  const config = onboardingStatusConfig[status];

  return (
    <div className="space-y-1">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${config.tone}`}>
        {config.label}
      </span>
      {showDescription ? <p className="text-xs text-slate-500">{config.description}</p> : null}
    </div>
  );
}
