-- ========================================================
-- SCHEMA SQL: Glaicy Agenda (SaaS Multi-Tenant de Alta Performance)
-- ========================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizações (Salões)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tagline TEXT DEFAULT 'Exclusividade & Alta Performance em Cachos e Iluminados',
    phone VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(20),
    logo_url TEXT,
    theme JSONB DEFAULT '{"primaryColor": "#54352a", "accentColor": "#c59b27"}'::jsonb,
    settings JSONB DEFAULT '{
        "isSharedMode": true,
        "allowSelfRegistration": false,
        "requireTriageApprovalHours": 36,
        "pixDiscountPercent": 5,
        "maxParallelInPause": 1
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Perfis de Usuário (Profissionais, Admin, Clientes)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'professional', -- 'super_admin', 'salon_owner', 'professional', 'client'
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(30),
    specialty TEXT,
    bio TEXT,
    avatar_url TEXT,
    dashboard_mode VARCHAR(30) DEFAULT 'intermediary', -- 'minimalist', 'intermediary', 'advanced'
    commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Serviços Oferecidos
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'mechas',
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    promotional_price NUMERIC(10, 2),
    image_url TEXT,
    requires_triage BOOLEAN DEFAULT FALSE,
    triage_form_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Etapas do Serviço (Multi-etapas: Ativa vs Pausa Química)
CREATE TABLE IF NOT EXISTS public.service_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    step_type VARCHAR(20) NOT NULL, -- 'active' ou 'pause'
    duration_min INT NOT NULL, -- minutos nominais
    max_pause_duration_min INT, -- limite máx de espera na química
    requires_exclusive_attention BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Questionários de Triagem (Anamnese)
CREATE TABLE IF NOT EXISTS public.triage_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    target_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_minutes INT DEFAULT 3,
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Perguntas da Triagem
CREATE TABLE IF NOT EXISTS public.triage_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES public.triage_forms(id) ON DELETE CASCADE,
    question_order INT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    educational_tip TEXT, -- Explicação técnica/educativa
    question_type VARCHAR(50) NOT NULL, -- 'single_choice', 'multiple_choice', 'text', 'photo_upload', 'curl_pattern'
    options_json JSONB,
    allow_multiple BOOLEAN DEFAULT FALSE,
    required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Respostas da Triagem enviadas pelas clientes
CREATE TABLE IF NOT EXISTS public.triage_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.triage_forms(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    client_email VARCHAR(255),
    preferred_date DATE,
    preferred_time_slot VARCHAR(30),
    answers JSONB NOT NULL,
    photos JSONB DEFAULT '{}'::jsonb,
    proposal_id UUID,
    status VARCHAR(30) DEFAULT 'pending_review', -- 'pending_review', 'proposal_sent', 'approved', 'rejected'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 8. Propostas Comerciais Personalizadas
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    triage_submission_id UUID REFERENCES public.triage_submissions(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    client_email VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    project_overview TEXT,
    desired_results JSONB DEFAULT '[]'::jsonb,
    chosen_technique TEXT,
    maintenance_guidance TEXT,
    included_items JSONB DEFAULT '[]'::jsonb,
    differentials JSONB DEFAULT '[]'::jsonb,
    technical_commitment TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_original NUMERIC(10, 2) NOT NULL,
    total_with_discount NUMERIC(10, 2) NOT NULL,
    pix_discount_percent INT DEFAULT 5,
    pix_total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'sent', -- 'draft', 'sent', 'approved', 'rejected'
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- 9. Modelos & Templates de Propostas
CREATE TABLE IF NOT EXISTS public.proposal_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'mechas',
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Agendamentos
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(30) NOT NULL,
    client_email VARCHAR(255),
    date DATE NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    total_duration_min INT NOT NULL,
    status VARCHAR(30) DEFAULT 'confirmed', -- 'pending_proposal', 'proposal_sent', 'confirmed', 'completed', 'cancelled'
    price NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(30),
    payment_status VARCHAR(30) DEFAULT 'pending',
    triage_submission_id UUID REFERENCES public.triage_submissions(id) ON DELETE SET NULL,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
    step_blocks JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Organizações
CREATE POLICY "Public Read Organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Staff Manage Organizations" ON public.organizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Perfis
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (is_active = true);
CREATE POLICY "Staff Manage Profiles" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Serviços & Etapas
CREATE POLICY "Public Read Services" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Staff Manage Services" ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Service Steps" ON public.service_steps FOR SELECT USING (true);
CREATE POLICY "Staff Manage Service Steps" ON public.service_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triagens
CREATE POLICY "Public Read Triage Forms" ON public.triage_forms FOR SELECT USING (true);
CREATE POLICY "Staff Manage Triage Forms" ON public.triage_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public Read Triage Questions" ON public.triage_questions FOR SELECT USING (true);
CREATE POLICY "Staff Manage Triage Questions" ON public.triage_questions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Submissões de Triagem
CREATE POLICY "Public Insert Submissions" ON public.triage_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Submissions" ON public.triage_submissions FOR SELECT USING (true);
CREATE POLICY "Staff Manage Submissions" ON public.triage_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Propostas e Modelos
CREATE POLICY "Public Read Proposals" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Public Update Proposals" ON public.proposals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Staff Manage Proposals" ON public.proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff Manage Templates" ON public.proposal_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Agendamentos
CREATE POLICY "Public Read Appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Public Insert Appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Appointments" ON public.appointments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Staff Manage Appointments" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
