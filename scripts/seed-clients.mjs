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

    const orgId = '11111111-1111-4111-8111-111111111111';
    const initialClients = [
      {
        name: 'Isa Franca',
        phone: '(11) 93342-9586',
        password: '123',
        email: 'isa.franca@email.com',
        notes: 'Cabelo cacheado 3B com histórico de luzes. Muito atenciosa e pontual.',
        last_visit_at: '2026-10-17 14:00:00+00'
      },
      {
        name: 'Débora Santos',
        phone: '(11) 92105-1540',
        password: '123',
        email: 'debora@espacogleicyronha.com.br',
        notes: 'Transformação Shag Hair & Mecha Tom de Mel. Realizou encaixe VIP durante pausa.',
        last_visit_at: '2026-10-17 14:30:00+00'
      },
      {
        name: 'Mariana Silva',
        phone: '(11) 98765-4321',
        password: '123',
        email: 'mariana.silva@email.com',
        notes: 'Cliente VIP. Realiza Iluminado Chocolate a cada 4 meses.',
        last_visit_at: '2026-09-10 11:00:00+00'
      },
      {
        name: 'Camila Rocha',
        phone: '(11) 97654-3210',
        password: '123',
        email: 'camila.rocha@email.com',
        notes: 'Preferência por corte a seco e hidratação profunda. Cabelo ondulado 2C.',
        last_visit_at: '2026-08-25 16:00:00+00'
      }
    ];

    for (const c of initialClients) {
      await client.query(
        `INSERT INTO public.salon_clients (org_id, name, phone, password_hash, email, notes, last_visit_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (phone) DO UPDATE 
         SET name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             email = EXCLUDED.email,
             notes = EXCLUDED.notes,
             last_visit_at = EXCLUDED.last_visit_at`,
        [orgId, c.name, c.phone, c.password, c.email, c.notes, c.last_visit_at]
      );
    }

    console.log("Seeded demo clients successfully into Supabase!");
    await client.end();
  } catch (err) {
    console.error("Seed error:", err);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

run();
