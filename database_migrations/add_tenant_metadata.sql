-- Add metadata column to tenants table if it doesn't exist
-- This column stores activation codes and other flexible data

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.tenants.metadata IS 'Flexible JSONB storage for activation codes, feature flags, and other tenant-specific data';

-- Example metadata structure:
-- {
--   "activation_code": "ABC12345",
--   "activation_sent_at": "2025-11-19T10:30:00Z",
--   "activation_used": true,
--   "activation_used_at": "2025-11-19T11:00:00Z",
--   "activation_used_by": "admin@company.com"
-- }
