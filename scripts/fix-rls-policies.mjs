import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const password = 'zSaRQEfVKQmkjTfQ';
const projectRef = 'jyndcpizejiiwemwaauv';
const host = 'aws-0-us-east-1.pooler.supabase.com';

async function fixPolicies() {
  const client = new Client({
    host,
    port: 6543,
    user: `postgres.${projectRef}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log('--- Aplicando Políticas RLS Completas ---');

  await client.query(`
    DO $$ BEGIN
      -- 1. proposal_templates: permitir SELECT público
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Proposal Templates' AND tablename = 'proposal_templates') THEN
        CREATE POLICY "Public Read Proposal Templates" ON public.proposal_templates FOR SELECT USING (true);
      END IF;

      -- 2. availability_templates: permitir SELECT e INSERT/UPDATE públicos
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Availability Templates' AND tablename = 'availability_templates') THEN
        CREATE POLICY "Public Read Availability Templates" ON public.availability_templates FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Manage Availability Templates' AND tablename = 'availability_templates') THEN
        CREATE POLICY "Public Manage Availability Templates" ON public.availability_templates FOR ALL USING (true) WITH CHECK (true);
      END IF;

      -- 3. available_days: permitir SELECT de todos os dias e MANAGE público
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read All Available Days' AND tablename = 'available_days') THEN
        CREATE POLICY "Public Read All Available Days" ON public.available_days FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Manage Available Days' AND tablename = 'available_days') THEN
        CREATE POLICY "Public Manage Available Days" ON public.available_days FOR ALL USING (true) WITH CHECK (true);
      END IF;

      -- 4. proposals: permitir INSERT e UPDATE públicos
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Insert Proposals' AND tablename = 'proposals') THEN
        CREATE POLICY "Public Insert Proposals" ON public.proposals FOR INSERT WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Manage Proposals' AND tablename = 'proposals') THEN
        CREATE POLICY "Public Manage Proposals" ON public.proposals FOR ALL USING (true) WITH CHECK (true);
      END IF;

      -- 5. triage_submissions: permitir UPDATE público (para vincular proposal_id e atualizar status)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Update Submissions' AND tablename = 'triage_submissions') THEN
        CREATE POLICY "Public Update Submissions" ON public.triage_submissions FOR UPDATE USING (true) WITH CHECK (true);
      END IF;

      -- 6. pre_reservations: permitir UPDATE público (para converter em agendamento)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Update Pre Reservations' AND tablename = 'pre_reservations') THEN
        CREATE POLICY "Public Update Pre Reservations" ON public.pre_reservations FOR UPDATE USING (true) WITH CHECK (true);
      END IF;

      -- 7. services & service_steps: permitir gestão completa
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Manage Services' AND tablename = 'services') THEN
        CREATE POLICY "Public Manage Services" ON public.services FOR ALL USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Manage Service Steps' AND tablename = 'service_steps') THEN
        CREATE POLICY "Public Manage Service Steps" ON public.service_steps FOR ALL USING (true) WITH CHECK (true);
      END IF;

      -- 8. triage_forms & triage_questions: permitir gestão completa
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Manage Triage Forms' AND tablename = 'triage_forms') THEN
        CREATE POLICY "Public Manage Triage Forms" ON public.triage_forms FOR ALL USING (true) WITH CHECK (true);
      END IF;
      -- 9. organizations: permitir UPDATE
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Update Organizations' AND tablename = 'organizations') THEN
        CREATE POLICY "Public Update Organizations" ON public.organizations FOR UPDATE USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `);

  await client.query(`
    UPDATE public.organizations
    SET 
      phone = '(11) 99597-5725',
      address = 'Av. Brasília, 996 - Jardim Saltense',
      city = 'Salto',
      state = 'SP',
      tagline = 'O cuidado que acolhe. A beleza que encanta.',
      settings = jsonb_set(
        jsonb_set(settings, '{requireTriageApprovalHours}', '48'),
        '{pixDiscountPercent}', '5'
      ),
      updated_at = NOW()
    WHERE slug = 'gleicyronha' OR id = '11111111-1111-4111-8111-111111111111';
  `);

  console.log('--- Políticas aplicadas e Organização atualizada com sucesso! ---');
  await client.end();
}

fixPolicies().catch(console.error);
