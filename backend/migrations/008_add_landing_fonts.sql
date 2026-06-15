ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS landing_primary_font TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS landing_secondary_font TEXT DEFAULT 'system';
