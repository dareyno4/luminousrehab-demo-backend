-- Migration: Add 'pending_review' to charts status constraint
-- Date: 2025-11-19
-- Description: Adds 'pending_review' status to the charts table to support admin review workflow

-- Drop the existing check constraint
ALTER TABLE charts DROP CONSTRAINT IF EXISTS charts_status_check;

-- Add the updated check constraint with 'pending_review' included
ALTER TABLE charts ADD CONSTRAINT charts_status_check 
  CHECK (status IN ('active', 'verified_ready', 'pending_review', 'delivered_locked', 'needs_reverification', 'archived'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'charts_status_check';
