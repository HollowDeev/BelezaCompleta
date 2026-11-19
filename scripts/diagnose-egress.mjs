import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log("=== DIAGNOSTICANDO EGRESS DO SUPABASE ===");

  const tables = [
    "triage_submissions",
    "proposals",
    "proposal_templates",
    "appointments",
    "clients",
    "services",
    "triage_forms",
    "profiles",
    "organizations"
  ];

  let totalCombinedPayloadBytes = 0;

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.log(`Table ${table}: Error ${error.message}`);
        continue;
      }

      const jsonStr = JSON.stringify(data || []);
      const bytes = Buffer.byteLength(jsonStr, "utf8");
      totalCombinedPayloadBytes += bytes;
      const count = data ? data.length : 0;
      console.log(`Table: ${table.padEnd(20)} | Rows: ${String(count).padStart(4)} | Size: ${(bytes / 1024).toFixed(2).padStart(8)} KB`);

      // Verifica se há base64 ou URLs do Supabase Storage
      let base64Count = 0;
      let supabaseStorageCount = 0;
      let r2Count = 0;

      if (data) {
        for (const row of data) {
          const rowStr = JSON.stringify(row);
          if (rowStr.includes("data:image/")) base64Count++;
          if (rowStr.includes("supabase.co/storage/v1/object/public")) supabaseStorageCount++;
          if (rowStr.includes(".r2.dev") || rowStr.includes("r2.cloudflarestorage")) r2Count++;
        }
      }

      if (base64Count > 0 || supabaseStorageCount > 0 || r2Count > 0) {
        console.log(`   -> Imagens detectadas: Base64: ${base64Count} linhas | Supabase Storage: ${supabaseStorageCount} linhas | R2: ${r2Count} linhas`);
      }
    } catch (e) {
      console.error(`Error querying ${table}:`, e.message);
    }
  }

  console.log("\n-------------------------------------------");
  console.log(`Tamanho total de 1 ÚNICO refreshAll(): ${(totalCombinedPayloadBytes / 1024).toFixed(2)} KB (${(totalCombinedPayloadBytes / 1024 / 1024).toFixed(3)} MB)`);
  
  const perHour30s = (totalCombinedPayloadBytes * 120) / (1024 * 1024);
  const perDay30s = perHour30s * 24 / 1024;
  console.log(`Se 1 aba do dashboard ficar aberta com polling a cada 30s:`);
  console.log(`   - Por hora: ${perHour30s.toFixed(2)} MB`);
  console.log(`   - Por dia (24h aberta): ${perDay30s.toFixed(2)} GB de Egress!`);
  console.log(`   - Se ficar 8h aberta em 1 dia útil: ${(perHour30s * 8 / 1024).toFixed(2)} GB`);
  console.log("-------------------------------------------\n");
}

diagnose();
