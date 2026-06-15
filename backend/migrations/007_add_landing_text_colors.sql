-- backend/migrations/007_add_landing_text_colors.sql
-- Add landing text color fields to tenants table

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS landing_primary_text_color TEXT DEFAULT '#1a1a1a',
ADD COLUMN IF NOT EXISTS landing_secondary_text_color TEXT DEFAULT '#666666';
