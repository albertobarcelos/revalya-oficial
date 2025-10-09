// AIDEV-NOTE: Teste com payload real do ASAAS fornecido pelo usuário
const https = require('https');

// AIDEV-NOTE: Configurações do teste
const WEBHOOK_URL = 'https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/asaas-webhook-charges/8d2888f1-64a5-445f-84f5-2614d5160251';
const ASAAS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY';

// AIDEV-NOTE: Payload real do ASAAS fornecido pelo usuário
const realPayload = {
  "id": "evt_071da53af2a9613df04213d0157d6b88&1076980632",
  "event": "PAYMENT_OVERDUE",
  "dateCreated": "2025-10-01 03:01:21",
  "tenant_id": "8d2888f1-64a5-445f-84f5-2614d5160251", // Adicionado tenant_id para resolver erro 400
  "payment": {
    "object": "payment",
    "id": "pay_i7mftv1vtj8a30dw",
    "dateCreated": "2025-08-22",
    "customer": "cus_000114443533",
    "subscription": "sub_6ddpfo6sh940k0te",
    "checkoutSession": null,
    "paymentLink": null,
    "value": 220,
    "netValue": 212.94,
    "originalValue": null,
    "interestValue": null,
    "description": "LICENÇA PDV LEGAL - Valor referente a mensalidade do sistema PDV Legal. Inclui suporte técnico e atualizações. A cobrança será realizada mensalmente",
    "billingType": "CREDIT_CARD",
    "confirmedDate": null,
    "creditCard": {
      "creditCardNumber": null,
      "creditCardBrand": null
    },
    "pixTransaction": null,
    "status": "OVERDUE",
    "dueDate": "2025-09-30",
    "originalDueDate": "2025-09-30",
    "paymentDate": null,
    "clientPaymentDate": null,
    "installmentNumber": null,
    "invoiceUrl": "https://www.asaas.com/i/i7mftv1vtj8a30dw",
    "invoiceNumber": "620976536",
    "externalReference": "c40469e8-4763-4b88-8660-02e16834d7f4",
    "deleted": false,
    "anticipated": false,
    "anticipable": false,
    "creditDate": null,
    "estimatedCreditDate": null,
    "transactionReceiptUrl": null,
    "nossoNumero": null,
    "bankSlipUrl": null,
    "lastInvoiceViewedDate": null,
    "lastBankSlipViewedDate": null,
    "discount": {
      "value": 0,
      "limitDate": null,
      "dueDateLimitDays": 0,
      "type": "FIXED"
    },
    "fine": {
      "value": 0,
      "type": "FIXED"
    },
    "interest": {
      "value": 0,
      "type": "PERCENTAGE"
    },
    "postalService": false,
    "escrow": null,
    "refunds": null
  }
};

async function testRealWebhook() {
  console.log('🎯 TESTE COM PAYLOAD REAL DO ASAAS\n');
  
  console.log('📊 Configuração do teste:');
  console.log('  - URL:', WEBHOOK_URL);
  console.log('  - ASAAS Token:', ASAAS_TOKEN.substring(0, 20) + '...');
  console.log('  - Event:', realPayload.event);
  console.log('  - Payment ID:', realPayload.payment.id);
  console.log('  - Status:', realPayload.payment.status);
  console.log('  - Value:', realPayload.payment.value);
  console.log('  - Customer:', realPayload.payment.customer);
  console.log('  - Payload size:', JSON.stringify(realPayload).length, 'bytes\n');

  const payloadString = JSON.stringify(realPayload);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadString),
      'Authorization': `Bearer ${ASAAS_TOKEN}`,
      'apikey': ASAAS_TOKEN,
      'asaas-access-token': ASAAS_TOKEN,
      'User-Agent': 'ASAAS-Webhook/1.0'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(WEBHOOK_URL, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📈 Resultado:');
        console.log('  - Status:', res.statusCode);
        console.log('  - Status Text:', res.statusMessage);
        
        try {
          const responseData = JSON.parse(data);
          console.log('  - Response:', JSON.stringify(responseData, null, 2));
        } catch (e) {
          console.log('  - Response (raw):', data);
        }
        
        if (res.statusCode === 200) {
          console.log('\n✅ Webhook processado com sucesso!');
        } else {
          console.log('\n❌ Erro no processamento do webhook');
        }
        
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erro na requisição:', error.message);
      reject(error);
    });

    req.write(payloadString);
    req.end();
  });
}

// AIDEV-NOTE: Executar o teste
testRealWebhook().catch(console.error);