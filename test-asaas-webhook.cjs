// AIDEV-NOTE: Script para testar o webhook ASAAS Edge Function
const crypto = require('crypto');

// AIDEV-NOTE: Configurações do webhook
const WEBHOOK_URL = 'https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/asaas-webhook-charges/8d2888f1-64a5-445f-84f5-2614d5160251';
const WEBHOOK_TOKEN = 'webhook_secret_test_123';

// AIDEV-NOTE: Payload REAL enviado pelo Asaas (copiado da requisição real)
const testPayload = {
  "id": "evt_bdaf5c611b55dc82906787d5bfe1e5e2&1076948149",
  "event": "PAYMENT_CHECKOUT_VIEWED",
  "dateCreated": "2025-10-01 01:45:43",
  "payment": {
    "object": "payment",
    "id": "pay_p8yiz9fi2x9o7kv6",
    "dateCreated": "2025-10-01",
    "customer": "cus_000125181151",
    "subscription": "sub_1gjkuywqydjdwz0b",
    "checkoutSession": null,
    "paymentLink": null,
    "value": 950,
    "netValue": 921.11,
    "originalValue": null,
    "interestValue": null,
    "description": "LICENÇA PDV LEGAL - Valor referente a mensalidade do sistema PDV Legal. Inclui suporte técnico e atualizações. A cobrança será realizada mensalmente",
    "billingType": "CREDIT_CARD",
    "confirmedDate": null,
    "creditCard": {
      "creditCardNumber": "0121",
      "creditCardBrand": "VISA"
    },
    "pixTransaction": null,
    "status": "PENDING",
    "dueDate": "2025-11-09",
    "originalDueDate": "2025-11-09",
    "paymentDate": null,
    "clientPaymentDate": null,
    "installmentNumber": null,
    "invoiceUrl": "https://www.asaas.com/i/p8yiz9fi2x9o7kv6",
    "invoiceNumber": "645810486",
    "externalReference": "558225f5-70db-44fe-95d2-830df18526df",
    "deleted": false,
    "anticipated": false,
    "anticipable": false,
    "creditDate": null,
    "estimatedCreditDate": null,
    "transactionReceiptUrl": null,
    "nossoNumero": null,
    "bankSlipUrl": null,
    "lastInvoiceViewedDate": "2025-10-01T04:45:42Z",
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

// AIDEV-NOTE: Função para gerar assinatura HMAC SHA-256
function generateHmacSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

// AIDEV-NOTE: Função principal de teste
async function testAsaasWebhook() {
  try {
    console.log('🚀 Iniciando teste do webhook ASAAS...\n');

    // Converter payload para string
    const payloadString = JSON.stringify(testPayload);
    
    // Gerar assinatura HMAC
    const signature = generateHmacSignature(payloadString, WEBHOOK_TOKEN);
    
    console.log('📊 Detalhes do teste:');
    console.log(`  - URL: ${WEBHOOK_URL}`);
    console.log(`  - Token: ${WEBHOOK_TOKEN}`);
    console.log(`  - Payload size: ${payloadString.length} bytes`);
    console.log(`  - Signature: ${signature}\n`);

    // Fazer requisição
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-signature': signature,
        'Authorization': `Bearer ${WEBHOOK_TOKEN}`
      },
      body: payloadString
    });

    console.log('📈 Resultado do teste:');
    console.log(`  - Status: ${response.status}`);
    console.log(`  - Status Text: ${response.statusText}`);

    const responseText = await response.text();
    console.log(`  - Response: ${responseText}\n`);

    if (response.ok) {
      console.log('✅ Webhook processado com sucesso!');
    } else {
      console.log('❌ Erro no processamento do webhook');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// AIDEV-NOTE: Importar fetch dinamicamente e executar teste
(async () => {
  try {
    const { default: fetch } = await import('node-fetch');
    global.fetch = fetch;
    await testAsaasWebhook();
  } catch (error) {
    console.error('Erro ao importar fetch:', error);
  }
})();