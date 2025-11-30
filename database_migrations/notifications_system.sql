-- Notifications System Tables
-- This migration creates the necessary tables for the notification system

-- Table: notifications
-- Stores all user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL CHECK (user_role IN ('clinician', 'agency_admin', 'scheduler', 'super_admin')),
  type TEXT NOT NULL CHECK (type IN (
    'chart_review',
    'chart_assigned',
    'chart_updated',
    'chart_submitted',
    'chart_approved',
    'chart_rejected',
    'chart_overdue',
    'patient_added',
    'patient_updated',
    'clinician_added',
    'clinician_updated',
    'assignment_created',
    'assignment_updated',
    'message_received',
    'system_alert'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: notification_preferences
-- Stores user notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  chart_reviews BOOLEAN NOT NULL DEFAULT TRUE,
  chart_assignments BOOLEAN NOT NULL DEFAULT TRUE,
  chart_updates BOOLEAN NOT NULL DEFAULT TRUE,
  patient_updates BOOLEAN NOT NULL DEFAULT TRUE,
  clinician_updates BOOLEAN NOT NULL DEFAULT TRUE,
  system_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON notifications(user_role);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- System can insert notifications for any user (handled by service role)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- RLS Policies for notification_preferences
-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default preferences when a new user is created
CREATE TRIGGER on_auth_user_created_create_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;

-- Comments for documentation
COMMENT ON TABLE notifications IS 'Stores all user notifications for the application';
COMMENT ON TABLE notification_preferences IS 'Stores user preferences for notification delivery';
COMMENT ON COLUMN notifications.user_role IS 'The role of the user receiving the notification (clinician, agency_admin, scheduler, super_admin)';
COMMENT ON COLUMN notifications.type IS 'The type of notification (chart_review, chart_assigned, etc.)';
COMMENT ON COLUMN notifications.priority IS 'The priority level of the notification (low, medium, high, urgent)';
COMMENT ON COLUMN notifications.metadata IS 'Additional data associated with the notification (chart_id, patient_id, etc.)';
COMMENT ON COLUMN notifications.action_url IS 'Optional URL to navigate to when notification is clicked';
COMMENT ON COLUMN notifications.action_label IS 'Optional label for the action button';
