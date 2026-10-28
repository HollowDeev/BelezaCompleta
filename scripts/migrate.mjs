import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const password = 'zSaRQEfVKQmkjTfQ';
const projectRef = 'jyndcpizejiiwemwaauv';

// Possible connection hosts
const hosts = [
  `db.${projectRef}.supabase.co`,
  `aws-0-sa-east-1.pooler.supabase.com`,
  `aws-0-us-east-1.pooler.supabase.com`,
  `aws-0-us-west-1.pooler.supabase.com`,
  `aws-0-eu-central-1.pooler.supabase.com`,
  `aws-0-eu-west-1.pooler.supabase.com`
];

async function tryConnect(host) {
  const isPooler = host.includes('pooler');
  const port = isPooler ? 6543 : 5432;
  const user = isPooler ? `postgres.${projectRef}` : 'postgres';
  
  console.log(`Testing connection to ${host}:${port} with user ${user}...`);
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
    console.log(`SUCCESS! Connected to ${host}`);
    return client;
  } catch (err) {
    console.log(`Failed connecting to ${host}:`, err.message);
    try { await client.end(); } catch (e) {}
    return null;
  }
}

async function run() {
  let connectedClient = null;
  for (const host of hosts) {
    connectedClient = await tryConnect(host);
    if (connectedClient) break;
  }

  if (!connectedClient) {
    console.error('Could not connect to any Supabase host.');
    process.exit(1);
  }

  console.log('Reading src/lib/supabase/schema.sql...');
  const sql = fs.readFileSync('src/lib/supabase/schema.sql', 'utf-8');

  console.log('Executing schema.sql on Supabase PostgreSQL database...');
  await connectedClient.query(sql);
  console.log('Schema migration applied SUCCESSFULLY!');

  const tablesRes = await connectedClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Public tables in database:', tablesRes.rows.map(r => r.table_name));

  await connectedClient.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
