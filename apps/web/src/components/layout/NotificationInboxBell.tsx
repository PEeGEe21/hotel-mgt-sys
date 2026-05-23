'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  type AppNotification,
} from '@/hooks/useNotifications';
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';
import { usePermissions } from '@/hooks/usePermissions';
import { getNotificationHref, getNotificationMailingHref } from '@/lib/notification-links';
import { cn } from '@/lib/utils';

function formatNotificationTime(value: string) {
  const date = new Date(value);
  const now = Date.now();
  const diffMinutes = Math.max(1, Math.round((now - date.getTime()) / 60_000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
  });
}

function NotificationRow({
  item,
  onOpen,
  onOpenMailing,
  isUpdating,
  canViewMailing,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
  onOpenMailing: (item: AppNotification) => void;
  isUpdating: boolean;
  canViewMailing: boolean;
}) {
  const unread = !item.readAt;
  const primaryHref = getNotificationHref(item.metadata);
  const mailingHref = getNotificationMailingHref(item.metadata, canViewMailing);

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-3 transition-colors',
        unread
          ? 'border-blue-500/20 bg-blue-500/8 hover:bg-blue-500/12'
          : 'border-[#1e2536] bg-[#0f1117] hover:bg-white/5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="min-w-0 flex-1 text-left"
          disabled={isUpdating}
        >
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
            {unread && <span className="h-2 w-2 rounded-full bg-blue-400" />}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{item.message}</p>
          {(primaryHref || mailingHref) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              {primaryHref && <span>Open context</span>}
              {mailingHref && <span>Open mail log</span>}
            </div>
          )}
        </button>
        <span className="shrink-0 text-[11px] text-slate-500">
          {formatNotificationTime(item.createdAt)}
        </span>
      </div>

      {mailingHref && (
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenMailing(item)}
            disabled={isUpdating}
            className="h-8 rounded-lg px-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <Mail className="mr-1 h-3.5 w-3.5" />
            Mail log
          </Button>
        </div>
      )}
    </div>
  );
}

export default function NotificationInboxBell() {
  useNotificationsRealtime();
  const router = useRouter();
  const { can } = usePermissions();

  const { data, isLoading } = useNotifications({ limit: 8 });
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const canViewMailing = can('view:mailing');

  const openNotification = (item: AppNotification) => {
    const href = getNotificationHref(item.metadata);
    if (!item.readAt) markAsRead.mutate(item.id);
    if (href) router.push(href);
  };

  const openNotificationMailing = (item: AppNotification) => {
    const href = getNotificationMailingHref(item.metadata, canViewMailing);
    if (!item.readAt) markAsRead.mutate(item.id);
    if (href) router.push(href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2536] bg-[#0f1117] text-slate-400 transition-colors hover:text-slate-200 outline-none focus-visible:outline-none">
          <Bell size={16} />
          {unreadCount > 0 && (
            <>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
              <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full bg-blue-500 px-1 text-[10px] text-white hover:bg-blue-500">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[calc(100vw-1.5rem)] min-w-0 max-w-[380px] rounded-2xl border border-[#1e2536] bg-[#161b27] p-0 text-white shadow-2xl sm:w-[380px] sm:min-w-[380px]"
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">Notifications</p>
            <p className="text-xs text-slate-500">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={unreadCount === 0 || markAllAsRead.isPending}
            className="h-8 rounded-lg px-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Read all
          </Button>
        </div>
        <DropdownMenuSeparator className="mx-0 bg-[#1e2536]" />

        <ScrollArea className="max-h-[320px] ">
          <div className="space-y-2 py-3 px-3 pb-20">
            {isLoading && (
              <>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-xl border border-[#1e2536] bg-[#0f1117]"
                  />
                ))}
              </>
            )}

            {!isLoading && items.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#263046] bg-[#0f1117] px-4 py-10 text-center">
                <Bell className="mx-auto mb-3 h-5 w-5 text-slate-500" />
                <p className="text-sm font-medium text-slate-200">No notifications yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Reservation, payment, and stock alerts will show up here.
                </p>
              </div>
            )}

            {!isLoading &&
              items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onOpen={openNotification}
                  onOpenMailing={openNotificationMailing}
                  isUpdating={markAsRead.isPending}
                  canViewMailing={canViewMailing}
                />
              ))}
          </div>
        </ScrollArea>

        <DropdownMenuSeparator className="mx-0 bg-[#1e2536]" />
        <div className="px-2 pt-2 bottom-0 absolute w-full z-10">
          <Button
            asChild
            variant="ghost"
            className="bg-[#161b27] h-10 w-full justify-between rounded-xl text-slate-300 hover:bg-[#161b27] z-10 hover:text-white"
          >
            <Link href="/notifications">
              View all notifications
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
