import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// Lê .env.local
const envConfig = fs.readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envConfig.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
}

const password = 'zSaRQEfVKQmkjTfQ';
const projectRef = 'jyndcpizejiiwemwaauv';

const hosts = [
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-sa-east-1.pooler.supabase.com`,
  `db.${projectRef}.supabase.co`
];

async function getConnectedClient() {
  for (const host of hosts) {
    const isPooler = host.includes('pooler');
    const port = isPooler ? 6543 : 5432;
    const user = isPooler ? `postgres.${projectRef}` : 'postgres';
    console.log(`Tentando conectar a ${host}:${port}...`);
    const client = new Client({
      host,
      port,
      user,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      console.log(`Conectado a ${host}!`);
      return client;
    } catch (e) {
      console.log(`Falha em ${host}:`, e.message);
      try { await client.end(); } catch {}
    }
  }
  throw new Error('Não foi possível conectar ao banco Supabase.');
}

async function run() {
  console.log('--- Conectando ao Banco Supabase ---');
  const client = await getConnectedClient();

  console.log('--- Criando tabelas e políticas de disponibilidade & pré-reservas ---');
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS public.available_days (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      start_time VARCHAR(10) NOT NULL DEFAULT '08:30',
      end_time VARCHAR(10) NOT NULL DEFAULT '19:00',
      break_start VARCHAR(10),
      break_end VARCHAR(10),
      is_open BOOLEAN NOT NULL DEFAULT true,
      max_clients INT DEFAULT 8,
      slot_interval_min INT DEFAULT 15,
      custom_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT unique_professional_date UNIQUE (professional_id, date)
    );

    CREATE TABLE IF NOT EXISTS public.pre_reservations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
      client_name VARCHAR(255) NOT NULL,
      client_phone VARCHAR(30) NOT NULL,
      client_email VARCHAR(255),
      requested_date DATE NOT NULL,
      preferred_period VARCHAR(30) NOT NULL DEFAULT 'qualquer',
      preferred_time VARCHAR(10),
      triage_submission_id UUID REFERENCES public.triage_submissions(id) ON DELETE SET NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      converted_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
      admin_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.availability_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      days_config JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_available_days_prof_date ON public.available_days(professional_id, date);
    CREATE INDEX IF NOT EXISTS idx_available_days_org_date ON public.available_days(org_id, date);
    CREATE INDEX IF NOT EXISTS idx_pre_reservations_status ON public.pre_reservations(status, requested_date);
    CREATE INDEX IF NOT EXISTS idx_pre_reservations_org ON public.pre_reservations(org_id, status);

    ALTER TABLE public.available_days ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.pre_reservations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.availability_templates ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read open available days' AND tablename = 'available_days') THEN
        CREATE POLICY "Public read open available days" ON public.available_days FOR SELECT USING (is_open = true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage available days' AND tablename = 'available_days') THEN
        CREATE POLICY "Staff manage available days" ON public.available_days FOR ALL TO authenticated USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public insert pre reservations' AND tablename = 'pre_reservations') THEN
        CREATE POLICY "Public insert pre reservations" ON public.pre_reservations FOR INSERT WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read pre reservations' AND tablename = 'pre_reservations') THEN
        CREATE POLICY "Public read pre reservations" ON public.pre_reservations FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage pre reservations' AND tablename = 'pre_reservations') THEN
        CREATE POLICY "Staff manage pre reservations" ON public.pre_reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage availability templates' AND tablename = 'availability_templates') THEN
        CREATE POLICY "Staff manage availability templates" ON public.availability_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `);

  console.log('--- Migração concluída com sucesso! ---');

  const checkRes = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN ('available_days', 'pre_reservations', 'availability_templates')
    ORDER BY table_name;
  `);
  console.log('Tabelas verificadas:', checkRes.rows.map(r => r.table_name));

  await client.end();
}

run().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
