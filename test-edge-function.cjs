// AIDEV-NOTE: Script para testar a Edge Function import-upload do Supabase
const fs = require('fs');
const FormData = require('form-data');

// AIDEV-NOTE: Configurações da Edge Function
const SUPABASE_URL = 'https://wyehpiutzvwplllumgdk.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/import-upload`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY';

// AIDEV-NOTE: Dados de teste (usando IDs reais do banco)
const TEST_TENANT_ID = '8d2888f1-64a5-445f-84f5-2614d5160251'; // Nexsyn Soluções Inteligentes
const TEST_USER_ID = '1f98885d-b3dd-4404-bf3a-63dd2937d1f6'; // alberto.melo@nexsyn.com.br

// AIDEV-NOTE: Criar arquivo CSV de teste
const createTestCSV = () => {
  const csvContent = `nome,email,telefone,empresa
João Silva,joao@email.com,11999999999,Empresa A
Maria Santos,maria@email.com,11888888888,Empresa B
Pedro Costa,pedro@email.com,11777777777,Empresa C
Ana Oliveira,ana@email.com,11666666666,Empresa D
Carlos Lima,carlos@email.com,11555555555,Empresa E`;

  const fileName = 'test-import.csv';
  fs.writeFileSync(fileName, csvContent);
  console.log(`✅ Arquivo CSV criado: ${fileName}`);
  return fileName;
};

// AIDEV-NOTE: Testar a Edge Function
const testEdgeFunction = async () => {
  try {
    console.log('🚀 Iniciando teste da Edge Function import-upload...\n');

    // Importar fetch dinamicamente
    const { default: fetch } = await import('node-fetch');

    // Criar arquivo de teste
    const fileName = createTestCSV();
    
    // Preparar FormData
    const formData = new FormData();
    formData.append('file', fs.createReadStream(fileName));
    formData.append('recordCount', '5');

    console.log('📤 Enviando arquivo para Edge Function...');
    console.log(`URL: ${EDGE_FUNCTION_URL}`);
    console.log(`Tenant ID: ${TEST_TENANT_ID}`);
    console.log(`User ID: ${TEST_USER_ID}\n`);

    // Fazer requisição
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'x-tenant-id': TEST_TENANT_ID,
        'x-user-id': TEST_USER_ID,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log(`📊 Status da resposta: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`📄 Resposta bruta: ${responseText}\n`);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Sucesso!');
      console.log('📋 Dados da resposta:');
      console.log(`   Job ID: ${data.jobId}`);
      console.log(`   Total de registros: ${data.totalRecords}`);
      console.log(`   Registros processados: ${data.processedRecords}`);
      console.log(`   Sucessos: ${data.successCount}`);
      console.log(`   Erros: ${data.errorCount}`);
      console.log(`   Tempo estimado: ${data.estimatedTime}ms`);
    } else {
      console.log('❌ Erro na requisição');
      try {
        const errorData = JSON.parse(responseText);
        console.log(`   Erro: ${errorData.error}`);
      } catch {
        console.log(`   Resposta: ${responseText}`);
      }
    }

    // Limpar arquivo de teste
    fs.unlinkSync(fileName);
    console.log(`🗑️ Arquivo de teste removido: ${fileName}`);

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
};

// AIDEV-NOTE: Executar teste
console.log('⚠️  ATENÇÃO: Configurações do Supabase já estão definidas!');
console.log('⚠️  Execute: npm install form-data node-fetch\n');

if (process.argv.includes('--run')) {
  testEdgeFunction();
} else {
  console.log('Para executar o teste, use: node test-edge-function.cjs --run');
}