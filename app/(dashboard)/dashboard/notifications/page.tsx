'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getUserNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/actions/notifications';
import type { NotificationItem } from '@/types/shared';
import { formatDate } from '@/lib/utils';
import {
  Bell,
  CheckCheck,
  Calendar,
  AlertTriangle,
  Receipt,
  ShoppingBag,
  Info,
  CheckCircle2,
  ArrowRight,
  Check,
} from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'membership' | 'bookings' | 'commerce' | 'billing'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getUserNotificationsAction()
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setNotifications(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationReadAction(id);
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsReadAction();
    setIsMarkingAll(false);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'membership') return ['EXPIRY', 'WARNING', 'ALERT', 'MEMBERSHIP'].includes(n.type);
    if (filter === 'bookings') return n.type === 'BOOKING';
    if (filter === 'commerce') return ['ORDER', 'SHOP', 'BAR'].includes(n.type);
    if (filter === 'billing') return ['FINANCE', 'INVOICE', 'PAYMENT'].includes(n.type);
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EXPIRY':
      case 'WARNING':
      case 'ALERT':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'BOOKING':
        return <Calendar className="h-5 w-5 text-sky-400" />;
      case 'FINANCE':
      case 'INVOICE':
      case 'PAYMENT':
        return <Receipt className="h-5 w-5 text-purple-400" />;
      case 'ORDER':
      case 'SHOP':
      case 'BAR':
        return <ShoppingBag className="h-5 w-5 text-emerald-400" />;
      case 'SUCCESS':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      default:
        return <Info className="h-5 w-5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Notifications Hub</h1>
            {unreadCount > 0 ? (
              <Badge variant="warning" className="text-xs font-mono">
                {unreadCount} Unread
              </Badge>
            ) : (
              <Badge variant="success" className="text-xs">
                All Read
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time updates regarding court reservations, membership terms, orders, and club notices.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="text-xs border-zinc-700 hover:border-emerald-500 hover:text-emerald-400 gap-1.5 shrink-0"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Mark All as Read</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-zinc-800 gap-1 overflow-x-auto text-xs font-medium pb-px">
        {[
          { key: 'all', label: `All (${notifications.length})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'membership', label: 'Membership' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'commerce', label: 'Shop & Bar' },
          { key: 'billing', label: 'Billing' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-3 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
              filter === tab.key
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-zinc-800 bg-zinc-900/40 p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-zinc-800/60 rounded w-2/3" />
                  <div className="h-2.5 bg-zinc-800/40 rounded w-1/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <Card
              key={n.id}
              className={`border-zinc-800 transition-all ${
                !n.is_read
                  ? 'bg-zinc-900/80 border-emerald-500/30 shadow-md shadow-emerald-950/20'
                  : 'bg-zinc-900/40 opacity-80 hover:opacity-100'
              }`}
            >
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white tracking-tight">{n.title}</span>
                      {!n.is_read && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-semibold text-emerald-400">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-zinc-500 font-mono block pt-1">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(n.id)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 h-8 gap-1 px-2.5"
                    >
                      <Check className="h-3 w-3" />
                      <span>Mark Read</span>
                    </Button>
                  )}
                  {n.link && (
                    <Link href={n.link} onClick={() => handleMarkAsRead(n.id)}>
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-xs h-8 gap-1.5 shadow-sm shadow-emerald-950/40"
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-zinc-800 bg-zinc-900/30 p-12 text-center">
          <div className="max-w-sm mx-auto space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
              <Bell className="h-6 w-6 text-zinc-500" />
            </div>
            <h3 className="text-base font-semibold text-white">No notifications found</h3>
            <p className="text-xs text-zinc-400">
              {filter === 'unread'
                ? "You've read all your notifications. You're completely caught up!"
                : 'There are no notifications matching the selected filter category.'}
            </p>
            {filter !== 'all' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('all')}
                className="text-xs border-zinc-700 mt-2"
              >
                Show All Notifications
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
