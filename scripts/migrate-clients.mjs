import pg from 'pg';

const { Client } = pg;
const password = 'zSaRQEfVKQmkjTfQ';
const projectRef = 'jyndcpizejiiwemwaauv';
const host = 'aws-0-us-east-1.pooler.supabase.com';
const port = 6543;
const user = `postgres.${projectRef}`;

async function run() {
  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL!");

    const sql = `
      CREATE TABLE IF NOT EXISTS public.salon_clients (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(30) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_visit_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX IF NOT EXISTS idx_salon_clients_phone ON public.salon_clients(phone);

      ALTER TABLE public.salon_clients ENABLE ROW LEVEL SECURITY;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'salon_clients' AND policyname = 'Public Access salon_clients'
        ) THEN
          CREATE POLICY "Public Access salon_clients" ON public.salon_clients FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END
      $$;
    `;

    await client.query(sql);
    console.log("Table salon_clients created or verified successfully!");
    await client.end();
  } catch (err) {
    console.error("Migration error:", err);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
