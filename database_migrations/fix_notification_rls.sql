-- Fix notification INSERT policy to allow authenticated users to create notifications
-- This replaces the service-role-only policy with one that allows users to create notifications

-- Drop the old policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- Create new policy that allows authenticated users to create notifications for themselves
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Optionally, also allow service role to create notifications for any user
-- (This is useful for system-generated notifications)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    -- Either the user is creating their own notification
    auth.uid() = user_id 
    -- Or it's being created by the service role (backend)
    OR auth.role() = 'service_role'
  );
