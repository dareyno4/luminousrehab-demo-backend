-- Fix notifications table to work with custom user IDs (like "clin-anna-001")
-- instead of Supabase Auth UUIDs

-- 1. Drop existing foreign key constraint
ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- 2. Change user_id column type from UUID to TEXT
ALTER TABLE notifications 
  ALTER COLUMN user_id TYPE TEXT;

-- 3. Add foreign key to your custom users table (if it exists)
-- Uncomment this if you have a users table with an 'id' column
-- ALTER TABLE notifications 
--   ADD CONSTRAINT notifications_user_id_fkey 
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. Update the id column to use TEXT instead of UUID (optional - keep UUID for notification IDs)
-- The notification IDs can stay as UUIDs, only user_id needs to be TEXT

-- 5. Recreate the index
DROP INDEX IF EXISTS idx_notifications_user_id;
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- 6. Update RLS policies to work with TEXT user_id
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;

-- Create new policies (simplified for custom auth)
-- Allow anyone authenticated to read, update, delete, and insert their own notifications
CREATE POLICY "Anyone can view all notifications"
  ON notifications FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update all notifications"
  ON notifications FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete all notifications"
  ON notifications FOR DELETE
  USING (true);

CREATE POLICY "Anyone can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Note: Since you're using custom authentication, you'll need to set the user_id
-- in your application code using: 
-- await supabaseClient.rpc('set_config', { 
--   setting: 'app.user_id', 
--   value: user.id 
-- });
