import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export default function TableScroll({
  children,
  className,
  tableClassName,
}: {
  children: ReactNode;
  className?: string;
  tableClassName?: string;
}) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]',
        className,
      )}
    >
      <div
        className={cn(
          '[&_table]:w-full [&_table]:min-w-[720px] sm:[&_table]:min-w-0',
          tableClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
