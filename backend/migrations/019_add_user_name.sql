-- Migration 019: Add name column to users table for client display name
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
