-- Migration: Add site_url to site_config for domain-agnostic BASE_URL resolution
-- Run after generating: npm run db:migrate

ALTER TABLE site_config ADD COLUMN IF NOT EXISTS site_url text;

-- Backfill any existing rows (safe to re-run)
UPDATE site_config SET site_url = COALESCE(site_url, 'https://www.1onlysarkar.shop') WHERE id = 'default';
