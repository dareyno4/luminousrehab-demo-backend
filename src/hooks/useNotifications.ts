import { useEffect, useState } from 'react';
import { Notification } from '../types/notification';
import { notificationService } from '../services/notificationService';

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribeToNotifications(userId, (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(userId);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
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

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };
}
