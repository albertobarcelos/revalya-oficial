// Teste FINAL do webhook com JWT válido (anon key)
const crypto = require('crypto');

// Configurações
const WEBHOOK_URL = 'https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/asaas-webhook-charges/8d2888f1-64a5-445f-84f5-2614d5160251';
const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY';
const WEBHOOK_TOKEN = 'webhook_secret_test_123';

// Payload de teste
const testPayload = {
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "object": "payment",
    "id": "pay_test_123456",
    "dateCreated": "2024-01-15",
    "customer": "cus_test_789",
    "dueDate": "2024-01-20",
    "value": 100.00,
    "netValue": 95.00,
    "billingType": "PIX",
    "status": "RECEIVED",
    "description": "Teste de webhook",
    "externalReference": "558225f5-70db-44fe-95d2-830df18526df",
    "invoiceUrl": "https://test.com/invoice",
    "invoiceNumber": "INV-001",
    "deleted": false,
    "anticipated": false,
    "anticipable": false
  }
};

// Função para gerar assinatura HMAC
function generateHmacSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return 'sha256=' + hmac.digest('hex');
}

async function testWebhookFinal() {
  console.log('🎯 TESTE FINAL - Webhook com JWT VÁLIDO (Anon Key)\n');
  
  const payloadString = JSON.stringify(testPayload);
  
  console.log('📊 Configuração do teste:');
  console.log(`  - URL: ${WEBHOOK_URL}`);
  console.log(`  - JWT (Anon Key): ${VALID_JWT.substring(0, 50)}...`);
  console.log(`  - ASAAS Token: ${WEBHOOK_TOKEN}`);
  console.log(`  - Payload size: ${payloadString.length} bytes\n`);
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VALID_JWT}`,
        'asaas-access-token': WEBHOOK_TOKEN, // AIDEV-NOTE: Corrigido para usar asaas-access-token conforme documentação
        'User-Agent': 'Asaas-Webhook/1.0',
        'apikey': VALID_JWT // Adicionar apikey também
      },
      body: payloadString
    });
    
    const responseText = await response.text();
    
    console.log('📈 Resultado:');
    console.log(`  - Status: ${response.status}`);
    console.log(`  - Status Text: ${response.statusText}`);
    console.log(`  - Response: ${responseText}\n`);
    
    if (response.ok) {
      console.log('🎉 SUCESSO! Webhook processado corretamente!');
      console.log('✅ Use este JWT no Asaas:');
      console.log(`   ${VALID_JWT}`);
    } else {
      console.log('❌ Ainda com erro. Vamos tentar sem JWT...');
    }
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
}

testWebhookFinal();