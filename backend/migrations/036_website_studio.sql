-- Website Studio Migration
-- Creates tables for website configuration and previews

-- tenant_websites table
CREATE TABLE IF NOT EXISTS tenant_websites (
    tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tenant_websites
CREATE INDEX IF NOT EXISTS idx_tenant_websites_status ON tenant_websites(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_tenant_websites_updated_at ON tenant_websites(updated_at);

-- website_previews table
CREATE TABLE IF NOT EXISTS website_previews (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for previews
CREATE INDEX IF NOT EXISTS idx_website_previews_token ON website_previews(token);
CREATE INDEX IF NOT EXISTS idx_website_previews_tenant ON website_previews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_website_previews_expires ON website_previews(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tenant_website_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tenant_websites
DROP TRIGGER IF EXISTS trigger_tenant_websites_updated_at ON tenant_websites;
CREATE TRIGGER trigger_tenant_websites_updated_at
    BEFORE UPDATE ON tenant_websites
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_website_updated_at();

-- RLS Policies (if using Row Level Security)
-- ALTER TABLE tenant_websites ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_websites_tenant_isolation ON tenant_websites
--     USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- ALTER TABLE website_previews ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY website_previews_tenant_isolation ON website_previews
--     USING (tenant_id = current_setting('app.current_tenant_id')::integer);