-- Migration 020: Add google_id column to users for Google OAuth
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
