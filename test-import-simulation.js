import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dados de teste simulados
const testCSVData = `nome,email,telefone,cpf,endereco
João Silva,joao@teste.com,11999999999,12345678901,Rua A 123
Maria Santos,maria@teste.com,11888888888,98765432100,Rua B 456
Pedro Oliveira,pedro@teste.com,11777777777,11122233344,Rua C 789`;

async function testImportUpload() {
  try {
    console.log('🧪 Iniciando teste de simulação de importação...');
    
    // Criar arquivo CSV temporário
    const tempFilePath = path.join(__dirname, 'temp-test-import.csv');
    fs.writeFileSync(tempFilePath, testCSVData);
    console.log('✅ Arquivo CSV de teste criado');

    // Preparar FormData
    const form = new FormData();
    form.append('file', fs.createReadStream(tempFilePath));
    form.append('tenantId', '8d2888f1-64a5-445f-84f5-2614d5160251'); // Tenant ID do sistema
    form.append('userId', '1f98885d-b3dd-4404-bf3a-63dd2937d1f6'); // User ID do sistema

    console.log('📤 Enviando requisição para API de upload...');

    // Fazer requisição para API
    const response = await fetch('http://localhost:8081/api/import/upload', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
      }
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers da resposta:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('📊 Resposta bruta:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.log('❌ Erro ao fazer parse do JSON:', parseError.message);
      console.log('📄 Conteúdo da resposta:', responseText);
      return;
    }
    
    console.log('📊 Resposta da API:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Upload realizado com sucesso!');
      console.log(`🆔 Job ID: ${result.jobId}`);
    } else {
      console.log('❌ Erro no upload:');
      console.log(result);
    }

    // Limpar arquivo temporário
    fs.unlinkSync(tempFilePath);
    console.log('🧹 Arquivo temporário removido');

  } catch (error) {
    console.error('💥 Erro durante o teste:', error);
  }
}

// Executar teste
testImportUpload();