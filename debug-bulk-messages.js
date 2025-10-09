// AIDEV-NOTE: Script para debugar o payload enviado para a Edge Function
// Este script simula exatamente o que o frontend está enviando

const testPayload = {
  chargeIds: ["test-charge-1", "test-charge-2"],
  customMessage: "Teste de mensagem personalizada",
  // REMOVIDO: sendImmediately e tenant_id conforme correção
};

const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
  'x-tenant-id': 'test-tenant-id'
};

console.log('=== PAYLOAD DE TESTE ===');
console.log('Headers:', JSON.stringify(headers, null, 2));
console.log('Body:', JSON.stringify(testPayload, null, 2));

console.log('\n=== VALIDAÇÃO ===');
console.log('chargeIds é array?', Array.isArray(testPayload.chargeIds));
console.log('chargeIds não está vazio?', testPayload.chargeIds.length > 0);
console.log('Tem customMessage ou templateId?', !!(testPayload.customMessage || testPayload.templateId));

// Simular validação da Edge Function
function validatePayload(body) {
  const { chargeIds, templateId, customMessage } = body;
  
  // Validação 1: chargeIds deve ser array não vazio de strings
  if (!Array.isArray(chargeIds) || chargeIds.length === 0) {
    return { valid: false, error: 'chargeIds deve ser um array não vazio' };
  }
  
  if (!chargeIds.every(id => typeof id === 'string' && id.trim().length > 0)) {
    return { valid: false, error: 'Todos os chargeIds devem ser strings válidas' };
  }
  
  // Validação 2: Deve ter templateId OU customMessage
  if (!templateId && !customMessage) {
    return { valid: false, error: 'templateId ou customMessage é obrigatório' };
  }
  
  return { valid: true };
}

const validation = validatePayload(testPayload);
console.log('\n=== RESULTADO DA VALIDAÇÃO ===');
console.log('Válido?', validation.valid);
if (!validation.valid) {
  console.log('Erro:', validation.error);
}