/**
 * Script para executar a sincronização real de charges
 * 
 * Uso:
 *   node scripts/sync-charges-real.js <tenant_id> [--force]
 * 
 * Exemplo:
 *   node scripts/sync-charges-real.js 8d2888f1-64a5-445f-84f5-2614d5160251
 *   node scripts/sync-charges-real.js 8d2888f1-64a5-445f-84f5-2614d5160251 --force
 */

const SUPABASE_URL = "https://wyehpiutzvwplllumgdk.supabase.co";
const FUNCTION_NAME = "sync-charges-from-staging";

// AIDEV-NOTE: Obter tenant_id dos argumentos da linha de comando
const tenantId = process.argv[2];
const forceUpdate = process.argv.includes("--force");

if (!tenantId) {
  console.error("❌ Erro: Tenant ID não fornecido");
  console.log("\nUso:");
  console.log(`  node scripts/sync-charges-real.js <tenant_id> [--force]`);
  console.log("\nExemplo:");
  console.log(`  node scripts/sync-charges-real.js 8d2888f1-64a5-445f-84f5-2614d5160251`);
  process.exit(1);
}

// Validar formato UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(tenantId)) {
  console.error("❌ Erro: Tenant ID inválido (deve ser um UUID)");
  process.exit(1);
}

// AIDEV-NOTE: Obter anon key das variáveis de ambiente
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!anonKey) {
  console.error("❌ Erro: SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente");
  console.log("\nConfigure uma das seguintes variáveis:");
  console.log("  - SUPABASE_ANON_KEY");
  console.log("  - VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const url = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}/${tenantId}`;

console.log("⚠️  ATENÇÃO: Esta operação irá ATUALIZAR dados reais!");
console.log(`📋 Tenant ID: ${tenantId}`);
console.log(`🔗 URL: ${url}`);
console.log(`⚡ Force Update: ${forceUpdate ? "SIM" : "NÃO"}`);
console.log("");

// AIDEV-NOTE: Confirmar antes de executar
const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Deseja continuar? (digite 'sim' para confirmar): ", (answer) => {
  rl.close();
  
  if (answer.toLowerCase() !== "sim") {
    console.log("❌ Operação cancelada pelo usuário");
    process.exit(0);
  }

  console.log("\n🔄 Iniciando sincronização real...");
  console.log("");

  const requestBody = {
    dryRun: false,
    batchSize: 100,
    forceUpdate: forceUpdate
  };

  fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  })
    .then(async (response) => {
      const data = await response.json();
      
      if (!response.ok) {
        console.error("❌ Erro na requisição:");
        console.error(JSON.stringify(data, null, 2));
        process.exit(1);
      }

      console.log("✅ Sincronização concluída com sucesso!");
      console.log("");
      console.log("📊 Resumo:");
      console.log(`   Total de movimentações: ${data.summary?.total || 0}`);
      console.log(`   Processadas: ${data.summary?.processed || 0}`);
      console.log(`   Atualizadas: ${data.summary?.updated || 0}`);
      console.log(`   Ignoradas: ${data.summary?.skipped || 0}`);
      console.log(`   Erros: ${data.summary?.errors || 0}`);
      console.log("");

      if (data.errors && data.errors.length > 0) {
        console.log("⚠️  Erros encontrados:");
        data.errors.slice(0, 10).forEach((error, index) => {
          console.log(`\n   ${index + 1}. ${JSON.stringify(error, null, 6)}`);
        });
        
        if (data.errors.length > 10) {
          console.log(`\n   ... e mais ${data.errors.length - 10} erros`);
        }
      }

      console.log("");
      console.log("✅ Dados atualizados com sucesso!");
    })
    .catch((error) => {
      console.error("❌ Erro ao executar sincronização:", error.message);
      process.exit(1);
    });
});


