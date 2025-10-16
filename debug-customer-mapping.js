// Script de debug para testar o mapeamento de dados de cliente
// Execute este script no console do navegador para verificar os dados

console.log('🔍 DEBUG - Testando mapeamento de dados de cliente');

// Simular dados da tabela conciliation_staging
const mockStagingData = [
  {
    id: "e87e3382-acf0-4905-850e-cd9e2874d586",
    tenant_id: "8d2888f1-64a5-445f-84f5-2614d5160251",
    origem: "asaas",
    id_externo: "pay_fmfs6n2lleuy79n4",
    customer_name: "Marcia de Lima Aguiar",
    customer_document: "61682501000190",
    valor_cobranca: "299.90",
    valor_pago: "299.90",
    status_externo: "received",
    status_conciliacao: "PENDING"
  }
];

// Função de mapeamento simplificada
function testMapping(item) {
  const mapped = {
    id: item.id,
    customerName: item.customer_name || '',
    customerDocument: item.customer_document || '',
    paidAmount: parseFloat(item.valor_pago) || 0,
    source: item.origem
  };
  
  console.log('📊 Dados originais:', {
    customer_name: item.customer_name,
    customer_document: item.customer_document
  });
  
  console.log('📊 Dados mapeados:', {
    customerName: mapped.customerName,
    customerDocument: mapped.customerDocument
  });
  
  return mapped;
}

// Testar o mapeamento
mockStagingData.forEach((item, index) => {
  console.log(`\n🔍 Testando registro ${index}:`);
  testMapping(item);
});

console.log('\n✅ Teste de mapeamento concluído');