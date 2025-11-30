export type NotificationType = 
  | 'chart_review'
  | 'chart_assigned'
  | 'chart_updated'
  | 'chart_submitted'
  | 'chart_approved'
  | 'chart_rejected'
  | 'chart_overdue'
  | 'patient_added'
  | 'patient_updated'
  | 'clinician_added'
  | 'clinician_updated'
  | 'assignment_created'
  | 'assignment_updated'
  | 'message_received'
  | 'system_alert';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  createdAt: Date;
  userId: string;
  userRole: 'clinician' | 'agency_admin' | 'scheduler' | 'super_admin';
  metadata?: {
    chartId?: string;
    patientId?: string;
    clinicianId?: string;
    assignmentId?: string;
    [key: string]: any;
  };
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  chartReviews: boolean;
  chartAssignments: boolean;
  chartUpdates: boolean;
  patientUpdates: boolean;
  clinicianUpdates: boolean;
  systemAlerts: boolean;
}
