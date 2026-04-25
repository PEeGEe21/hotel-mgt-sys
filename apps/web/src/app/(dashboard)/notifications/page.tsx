'use client';

import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/ui/pagination';
import { useMarkAllNotificationsAsRead, useMarkNotificationAsRead, useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

function formatFullDate(value: string) {
  return new Date(value).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications({ limit: 20, page });
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Inbox
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">
            System alerts, reservation activity, and stock warnings show up here.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="h-8 rounded-full bg-blue-500/15 px-3 text-blue-200 hover:bg-blue-500/15">
            {unreadCount} unread
          </Badge>
          <Button
            type="button"
            variant="outline"
            onClick={() => markAllAsRead.mutate()}
            disabled={unreadCount === 0 || markAllAsRead.isPending}
            className="border-[#1e2536] bg-[#161b27] text-slate-200 hover:bg-white/5 hover:text-white"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      <Card className="border-[#1e2536] bg-[#161b27] text-white shadow-none">
        <CardHeader className="border-b border-[#1e2536]">
          <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="space-y-4 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-[#0f1117]" />
              ))}
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1e2536] bg-[#0f1117]">
                <Bell className="h-5 w-5 text-slate-500" />
              </div>
              <h2 className="text-base font-semibold text-slate-100">Nothing here yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                New reservation, payment, and low inventory alerts will appear here.
              </p>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="divide-y divide-[#1e2536]">
              {items.map((item) => {
                const unread = !item.readAt;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex flex-col gap-4 px-6 py-5 md:flex-row md:items-start md:justify-between',
                      unread ? 'bg-blue-500/5' : 'bg-transparent',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-100">{item.title}</h3>
                        {unread && (
                          <Badge className="rounded-full bg-blue-500/15 px-2 text-[11px] text-blue-200 hover:bg-blue-500/15">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                        {item.message}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">{formatFullDate(item.createdAt)}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <Badge
                        variant="outline"
                        className="border-[#2a3448] bg-[#0f1117] text-slate-300"
                      >
                        {item.event}
                      </Badge>
                      {unread && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead.mutate(item.id)}
                          disabled={markAsRead.isPending}
                          className="text-slate-300 hover:bg-white/5 hover:text-white"
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        {!isLoading && meta && meta.last_page > 1 && (
          <Pagination meta={meta} currentPage={page} handlePageChange={setPage} />
        )}
      </Card>
    </div>
  );
}
