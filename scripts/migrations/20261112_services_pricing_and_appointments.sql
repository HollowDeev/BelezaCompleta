-- ========================================================
-- MIGRATION: 20261112_services_pricing_and_appointments.sql
-- Milestone 1: Services Pricing (Fixed/Range) & Composite Appointments
-- ========================================================

-- 1. Services: Price type ('fixed' | 'starting_at') and optional max_price
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) DEFAULT 'fixed';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS max_price NUMERIC(10, 2);
UPDATE public.services SET price_type = 'fixed' WHERE price_type IS NULL;

-- 2. Appointments: Support composite services and uncommitted quotes
ALTER TABLE public.appointments ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_title VARCHAR(255);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS procedures JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_uncommitted_quote BOOLEAN DEFAULT FALSE;

-- 3. Proposals: First-view tracking timestamp
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS first_viewed_at TIMESTAMP WITH TIME ZONE;
