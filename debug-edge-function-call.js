/**
 * Script de Debug - Edge Function Call
 * 
 * AIDEV-NOTE: Script para diagnosticar problema com body vazio na Edge Function
 * Testa diretamente a chamada supabase.functions.invoke para identificar onde o body está sendo perdido
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunctionCall() {
  console.log('🔍 [DEBUG] Iniciando teste da Edge Function...\n');

  // Dados de teste
  const testPayload = {
    chargeIds: ['test-charge-1', 'test-charge-2'],
    templateId: 'test-template',
    tenant_id: 'test-tenant-123'
  };

  const testHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
    'x-tenant-id': 'test-tenant-123',
    'x-request-id': `test-${Date.now()}`,
    'x-timestamp': new Date().toISOString()
  };

  console.log('📤 [PAYLOAD] Dados sendo enviados:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n📋 [HEADERS] Headers sendo enviados:');
  console.log(JSON.stringify(testHeaders, null, 2));
  console.log('\n');

  try {
    console.log('🚀 [CALL] Chamando Edge Function...');
    
    // Teste 1: Chamada normal
    console.log('📞 Teste 1: Chamada com body e headers');
    const response1 = await supabase.functions.invoke('send-bulk-messages', {
      body: testPayload,
      headers: testHeaders
    });

    console.log('✅ [RESPONSE 1] Status:', response1.error ? 'ERROR' : 'SUCCESS');
    console.log('📊 [RESPONSE 1] Data:', response1.data);
    console.log('❌ [RESPONSE 1] Error:', response1.error);
    console.log('\n');

    // Teste 2: Chamada sem headers customizados
    console.log('📞 Teste 2: Chamada apenas com body (sem headers customizados)');
    const response2 = await supabase.functions.invoke('send-bulk-messages', {
      body: testPayload
    });

    console.log('✅ [RESPONSE 2] Status:', response2.error ? 'ERROR' : 'SUCCESS');
    console.log('📊 [RESPONSE 2] Data:', response2.data);
    console.log('❌ [RESPONSE 2] Error:', response2.error);
    console.log('\n');

    // Teste 3: Chamada com fetch direto para comparação
    console.log('📞 Teste 3: Chamada com fetch direto');
    const fetchResponse = await fetch(`${supabaseUrl}/functions/v1/send-bulk-messages`, {
      method: 'POST',
      headers: testHeaders,
      body: JSON.stringify(testPayload)
    });

    const fetchData = await fetchResponse.text();
    console.log('✅ [FETCH] Status:', fetchResponse.status);
    console.log('📊 [FETCH] Data:', fetchData);
    console.log('📋 [FETCH] Headers:', Object.fromEntries(fetchResponse.headers.entries()));

  } catch (error) {
    console.error('💥 [ERROR] Erro durante o teste:', error);
  }
}

// Executar teste
testEdgeFunctionCall().catch(console.error);