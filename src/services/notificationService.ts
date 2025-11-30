import { supabaseClient } from '../lib/supabase';
import { Notification, NotificationPreferences, NotificationType, NotificationPriority } from '../types/notification';

class NotificationService {
  private listeners: Map<string, Set<(notification: Notification) => void>> = new Map();

  /**
   * Subscribe to real-time notifications for a user
   */
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    this.listeners.get(userId)?.add(callback);

    // Set up Supabase real-time subscription
    const channel = supabaseClient
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const notification = this.mapSupabaseNotification(payload.new);
          this.notifyListeners(userId, notification);
        }
      )
      .subscribe();

    return () => {
      this.listeners.get(userId)?.delete(callback);
      if (this.listeners.get(userId)?.size === 0) {
        this.listeners.delete(userId);
        channel.unsubscribe();
      }
    };
  }

  /**
   * Notify all listeners for a user
   */
  private notifyListeners(userId: string, notification: Notification) {
    const callbacks = this.listeners.get(userId);
    if (callbacks) {
      callbacks.forEach((callback) => callback(notification));
    }
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data?.map(this.mapSupabaseNotification) || [];
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabaseClient
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabaseClient
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabaseClient
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Create a notification
   */
  async createNotification(
    userId: string,
    userRole: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'medium',
    metadata?: any,
    actionUrl?: string,
    actionLabel?: string
  ): Promise<Notification> {
    const notification = {
      user_id: userId,
      user_role: userRole,
      type,
      title,
      message,
      priority,
      read: false,
      metadata: metadata || {},
      action_url: actionUrl,
      action_label: actionLabel,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return this.mapSupabaseNotification(data);
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Return defaults if not found
      return {
        userId,
        emailNotifications: true,
        pushNotifications: true,
        chartReviews: true,
        chartAssignments: true,
        chartUpdates: true,
        patientUpdates: true,
        clinicianUpdates: true,
        systemAlerts: true,
      };
    }

    return {
      userId: data.user_id,
      emailNotifications: data.email_notifications,
      pushNotifications: data.push_notifications,
      chartReviews: data.chart_reviews,
      chartAssignments: data.chart_assignments,
      chartUpdates: data.chart_updates,
      patientUpdates: data.patient_updates,
      clinicianUpdates: data.clinician_updates,
      systemAlerts: data.system_alerts,
    };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: NotificationPreferences): Promise<void> {
    const { error } = await supabaseClient
      .from('notification_preferences')
      .upsert({
        user_id: preferences.userId,
        email_notifications: preferences.emailNotifications,
        push_notifications: preferences.pushNotifications,
        chart_reviews: preferences.chartReviews,
        chart_assignments: preferences.chartAssignments,
        chart_updates: preferences.chartUpdates,
        patient_updates: preferences.patientUpdates,
        clinician_updates: preferences.clinicianUpdates,
        system_alerts: preferences.systemAlerts,
      });

    if (error) throw error;
  }

  /**
   * Helper: Map Supabase notification to app notification
   */
  private mapSupabaseNotification(data: any): Notification {
    return {
      id: data.id,
      type: data.type,
      title: data.title,
      message: data.message,
      priority: data.priority,
      read: data.read,
      createdAt: new Date(data.created_at),
      userId: data.user_id,
      userRole: data.user_role,
      metadata: data.metadata || {},
      actionUrl: data.action_url,
      actionLabel: data.action_label,
    };
  }

  // Role-specific notification creators

  /**
   * Notify clinician about chart review
   */
  async notifyChartReview(
    clinicianId: string,
    chartId: string,
    patientName: string,
    status: 'approved' | 'rejected',
    feedback?: string
  ): Promise<void> {
    const title = status === 'approved' ? '✅ Chart Approved' : '⚠️ Chart Needs Revision';
    const message = status === 'approved' 
      ? `Your chart for ${patientName} has been approved.`
      : `Your chart for ${patientName} requires revisions. ${feedback || ''}`;
    
    await this.createNotification(
      clinicianId,
      'clinician',
      'chart_review',
      title,
      message,
      status === 'rejected' ? 'high' : 'medium',
      { chartId, patientName, status, feedback },
      `/charts/${chartId}`,
      'View Chart'
    );
  }

  /**
   * Notify clinician about new chart assignment
   */
  async notifyChartAssignment(
    clinicianId: string,
    chartId: string,
    patientName: string,
    dueDate?: string
  ): Promise<void> {
    await this.createNotification(
      clinicianId,
      'clinician',
      'chart_assigned',
      '📋 New Chart Assigned',
      `You have been assigned a new chart for ${patientName}${dueDate ? ` (Due: ${dueDate})` : ''}`,
      'medium',
      { chartId, patientName, dueDate },
      `/charts/${chartId}`,
      'Start Chart'
    );
  }

  /**
   * Notify agency admin about chart submission
   */
  async notifyChartSubmission(
    adminId: string,
    chartId: string,
    patientName: string,
    clinicianName: string
  ): Promise<void> {
    await this.createNotification(
      adminId,
      'agency_admin',
      'chart_submitted',
      '📥 New Chart for Review',
      `${clinicianName} submitted a chart for ${patientName}`,
      'medium',
      { chartId, patientName, clinicianName },
      `/admin/charts/${chartId}`,
      'Review Chart'
    );
  }

  /**
   * Notify agency admin about overdue chart
   */
  async notifyOverdueChart(
    adminId: string,
    chartId: string,
    patientName: string,
    clinicianName: string,
    daysOverdue: number
  ): Promise<void> {
    await this.createNotification(
      adminId,
      'agency_admin',
      'chart_overdue',
      '⏰ Overdue Chart Alert',
      `Chart for ${patientName} (assigned to ${clinicianName}) is ${daysOverdue} days overdue`,
      'high',
      { chartId, patientName, clinicianName, daysOverdue },
      `/admin/charts/${chartId}`,
      'View Chart'
    );
  }

  /**
   * Notify scheduler about new patient
   */
  async notifyNewPatient(
    schedulerId: string,
    patientId: string,
    patientName: string
  ): Promise<void> {
    await this.createNotification(
      schedulerId,
      'scheduler',
      'patient_added',
      '👤 New Patient Added',
      `${patientName} has been added to the system`,
      'medium',
      { patientId, patientName },
      `/scheduler/patients/${patientId}`,
      'View Patient'
    );
  }

  /**
   * Notify scheduler about new clinician
   */
  async notifyNewClinician(
    schedulerId: string,
    clinicianId: string,
    clinicianName: string
  ): Promise<void> {
    await this.createNotification(
      schedulerId,
      'scheduler',
      'clinician_added',
      '👨‍⚕️ New Clinician Added',
      `${clinicianName} has joined the team`,
      'medium',
      { clinicianId, clinicianName },
      `/scheduler/clinicians/${clinicianId}`,
      'View Clinician'
    );
  }

  /**
   * Notify about chart update
   */
  async notifyChartUpdate(
    userId: string,
    userRole: string,
    chartId: string,
    patientName: string,
    updateType: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      userRole,
      'chart_updated',
      '📝 Chart Updated',
      `Chart for ${patientName} has been updated: ${updateType}`,
      'low',
      { chartId, patientName, updateType },
      `/charts/${chartId}`,
      'View Chart'
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;
