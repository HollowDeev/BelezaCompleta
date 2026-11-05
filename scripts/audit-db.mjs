import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const password = 'zSaRQEfVKQmkjTfQ';
const projectRef = 'jyndcpizejiiwemwaauv';

async function run() {
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${projectRef}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('=== AUDITORIA DO BANCO SUPABASE ===');

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('Tabelas encontradas no schema public:');
  for (const row of tablesRes.rows) {
    const tName = row.table_name;
    try {
      const cRes = await client.query(`SELECT count(*) FROM public."${tName}"`);
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${tName}'
        ORDER BY ordinal_position;
      `);
      console.log(`\nTABELA: ${tName} (${cRes.rows[0].count} registros)`);
      console.log(`  Colunas: ${colsRes.rows.map(c => `${c.column_name} (${c.data_type})`).join(', ')}`);
    } catch (e) {
      console.log(`\nTABELA: ${tName} - Erro ao ler: ${e.message}`);
    }
  }

  // Check constraints
  console.log('\n=== CONSTRAINTS E CHAVES ÚNICAS ===');
  const consRes = await client.query(`
    SELECT conrelid::regclass AS table_name, conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY table_name, contype;
  `);
  for (const c of consRes.rows) {
    console.log(`  - [${c.table_name}] ${c.conname} (${c.contype}): ${c.def}`);
  }

  // Check RLS policies
  console.log('\n=== POLÍTICAS RLS (Row Level Security) ===');
  const polRes = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  for (const pol of polRes.rows) {
    console.log(`  - [${pol.tablename}] "${pol.policyname}" | CMD: ${pol.cmd} | ROLES: ${pol.roles}`);
  }

  await client.end();
}

run().catch(err => {
  console.error('Erro na auditoria:', err);
  process.exit(1);
});
