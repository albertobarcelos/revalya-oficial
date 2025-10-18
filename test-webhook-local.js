// AIDEV-NOTE: Teste local do webhook para validar correção do netValue
// Este teste simula diretamente a função sem passar pela validação JWT

const testPayload = {
  "id": "evt_test_netvalue_fix",
  "event": "PAYMENT_RECEIVED",
  "dateCreated": "2025-01-13 10:00:00",
  "payment": {
    "object": "payment",
    "id": "pay_test_netvalue",
    "dateCreated": "2025-01-13",
    "customer": "cus_000114443533",
    "subscription": "sub_test",
    "value": 220.00,
    "netValue": 212.94, // AIDEV-NOTE: Este é o valor que deve ser salvo em valor_liquido
    "originalValue": 220.00,
    "description": "Teste de correção do netValue",
    "billingType": "CREDIT_CARD",
    "status": "RECEIVED",
    "pixTransaction": null,
    "creditCard": {
      "creditCardNumber": "****1234",
      "creditCardBrand": "VISA"
    },
    "discount": {
      "value": 0,
      "limitDate": null
    },
    "interest": {
      "value": 0
    },
    "fine": {
      "value": 0
    }
  }
};

console.log('🧪 TESTE LOCAL - CORREÇÃO NETVALUE');
console.log('📊 Payload de teste:');
console.log('  - Event:', testPayload.event);
console.log('  - Payment ID:', testPayload.payment.id);
console.log('  - Value:', testPayload.payment.value);
console.log('  - NetValue:', testPayload.payment.netValue);
console.log('  - Status:', testPayload.payment.status);
console.log('\n✅ Payload preparado para teste local');
console.log('💡 Execute: supabase functions serve --env-file .env.local');
console.log('💡 Depois: curl -X POST http://localhost:54321/functions/v1/asaas-webhook-charges/8d2888f1-64a5-445f-84f5-2614d5160251 \\');
console.log('    -H "Content-Type: application/json" \\');
console.log('    -H "asaas-access-token: asaas_webhook_secret_7c8b19f84a1b4a7d9f2e65c34eaf8d90f72b3c1a7d4c8b6e0f15a3c2e9b8d7f4" \\');
console.log('    -d \'' + JSON.stringify(testPayload, null, 2) + '\'');