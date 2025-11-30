import React, { useEffect, useState } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Notification } from '../types/notification';
import { notificationService } from '../services/notificationService';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  userId: string;
  userRole: 'clinician' | 'agency_admin' | 'scheduler' | 'super_admin';
  onNavigate?: (url: string) => void;
}

export default function NotificationCenter({ userId, userRole, onNavigate }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribeToNotifications(userId, (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Show toast notification
      toast(notification.title, {
        description: notification.message,
        action: notification.actionUrl ? {
          label: notification.actionLabel || 'View',
          onClick: () => onNavigate?.(notification.actionUrl!),
        } : undefined,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      console.log('🔔 Loading notifications for user:', userId);
      const data = await notificationService.getNotifications(userId);
      console.log('🔔 Loaded notifications:', data);
      setNotifications(data);
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.actionUrl && onNavigate) {
      onNavigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-slate-100 border-slate-300 text-slate-800';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <span className="relative inline-block">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 z-10">
                <Badge
                  className="h-5 min-w-[18px] px-1 bg-red-600 text-white text-xs font-bold border-2 border-white shadow-md flex items-center justify-center"
                  style={{lineHeight: '1'}}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer relative group ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="font-medium text-slate-900">
                          {notification.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${getPriorityColor(notification.priority)}`}
                        >
                          {notification.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
