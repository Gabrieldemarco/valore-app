-- backend/migrations/006_add_landing_background_and_hero_height.sql
-- Add landing background color and hero height fields to tenants table

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS landing_background_color TEXT DEFAULT '#0f0808',
ADD COLUMN IF NOT EXISTS landing_hero_height INTEGER DEFAULT 70;
