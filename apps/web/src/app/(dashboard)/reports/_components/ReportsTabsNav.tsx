import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TABS } from './reports-shared';

export function ReportsTabsNav() {
  return (
    <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-xl border border-[#1e2536] bg-[#161b27] p-1">
      {TABS.map(({ id, label, icon: Icon }) => (
        <TabsTrigger
          key={id}
          value={id}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-xs font-medium text-slate-400 transition-colors data-[state=active]:border-blue-500/20 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 hover:bg-white/5 hover:!text-white"
        >
          <Icon size={13} />
          {label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
