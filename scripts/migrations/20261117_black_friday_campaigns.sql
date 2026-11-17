-- ========================================================
-- MIGRATION: 20261117_black_friday_campaigns.sql
-- Requirement R1: Black Friday Campaign Schema & Policies
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.black_friday_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Black Friday',
    is_active BOOLEAN NOT NULL DEFAULT false,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    restrict_schedule BOOLEAN NOT NULL DEFAULT false,
    restricted_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
    services_config JSONB NOT NULL DEFAULT '[]'::jsonb,
    progressive_discount JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_black_friday_campaigns_org ON public.black_friday_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_black_friday_campaigns_active ON public.black_friday_campaigns(org_id, is_active);

-- Row Level Security (RLS)
ALTER TABLE public.black_friday_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Black Friday Campaigns" ON public.black_friday_campaigns
    FOR SELECT USING (true);

CREATE POLICY "Staff Manage Black Friday Campaigns" ON public.black_friday_campaigns
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.black_friday_campaigns;
  END IF;
END $$;

ALTER TABLE public.black_friday_campaigns REPLICA IDENTITY FULL;
