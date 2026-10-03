'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  X,
} from 'lucide-react';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await getUserNotificationsAction();
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch {
      // Session might not be ready yet
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await getUserNotificationsAction();
        if (mounted && res.success && res.data) {
          setNotifications(res.data);
        }
      } catch {
        // Session might not be ready yet
      }
    };

    void load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string, link: string | null) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationReadAction(id);
    if (!link) {
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsReadAction();
    setIsLoading(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EXPIRY':
      case 'WARNING':
      case 'ALERT':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'BOOKING':
        return <Calendar className="h-4 w-4 text-sky-400" />;
      case 'FINANCE':
        return <Receipt className="h-4 w-4 text-purple-400" />;
      case 'ORDER':
        return <ShoppingBag className="h-4 w-4 text-emerald-400" />;
      case 'SUCCESS':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      default:
        return <Info className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-black ring-2 ring-zinc-950 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isLoading}
                  className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-900">
            {notifications.length > 0 ? (
              notifications.map((n) => {
                const content = (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id, n.link)}
                    className={`p-3.5 flex items-start gap-3 hover:bg-zinc-900/60 transition-colors cursor-pointer text-left ${
                      !n.is_read ? 'bg-zinc-900/30' : 'opacity-70'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-white truncate">
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-zinc-500 mt-1 block font-mono">
                        {formatDate(n.created_at)}
                      </span>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setIsOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  content
                );
              })
            ) : (
              <div className="text-center py-8 text-zinc-500 text-xs space-y-1">
                <Bell className="h-6 w-6 text-zinc-600 mx-auto" />
                <p>No notifications yet</p>
                <p className="text-[10px] text-zinc-600">You are all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
