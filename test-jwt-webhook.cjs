// Teste do webhook com token de acesso ASAAS
// AIDEV-NOTE: Atualizado para usar asaas-access-token conforme documentação oficial

// Configurações
const WEBHOOK_URL = 'https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/asaas-webhook-charges/8d2888f1-64a5-445f-84f5-2614d5160251';
const WEBHOOK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI5ODI5OCwiZXhwIjoxNzkwODM0Mjk4fQ.XXY36sGBTcKsIAlmpbsQB25-5Gn-gFCLCxsXzG8bdIE';

// Payload de teste
const testPayload = {
  "event": {
    "id": "test_event_123",
    "dateCreated": "2024-01-15",
    "type": "PAYMENT_RECEIVED"
  },
  "payment": {
    "object": "payment",
    "id": "pay_123456789",
    "dateCreated": "2024-01-15",
    "customer": "cus_000005492117",
    "paymentLink": null,
    "value": 100.00,
    "netValue": 94.51,
    "originalValue": null,
    "interestValue": null,
    "description": "Teste de pagamento via webhook",
    "billingType": "PIX",
    "pixTransaction": null,
    "status": "RECEIVED",
    "dueDate": "2024-01-15",
    "originalDueDate": "2024-01-15",
    "paymentDate": "2024-01-15",
    "clientPaymentDate": "2024-01-15",
    "installmentNumber": null,
    "invoiceUrl": "https://www.asaas.com/i/123456789",
    "invoiceNumber": "000000123",
    "externalReference": "REF-123456",
    "deleted": false,
    "anticipated": false,
    "anticipable": true
  }
};

async function testWebhook() {
  console.log('🚀 Testando webhook com JWT válido...\n');
  
  const payloadString = JSON.stringify(testPayload);
  
  console.log('📊 Detalhes do teste:');
  console.log(`  - URL: ${WEBHOOK_URL}`);
  console.log(`  - Token: ${WEBHOOK_TOKEN.substring(0, 20)}...`);
  console.log(`  - Payload size: ${payloadString.length} bytes\n`);
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-access-token': WEBHOOK_TOKEN,
        'User-Agent': 'Asaas-Webhook/1.0'
      },
      body: payloadString
    });
    
    const responseText = await response.text();
    
    console.log('📈 Resultado do teste:');
    console.log(`  - Status: ${response.status}`);
    console.log(`  - Status Text: ${response.statusText}`);
    console.log(`  - Response: ${responseText}\n`);
    
    if (response.ok) {
      console.log('✅ Webhook processado com sucesso!');
    } else {
      console.log('❌ Erro no processamento do webhook');
    }
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
}

testWebhook();