/**
 * SCRIPT TEMPORÁRIO - Debug de Dados de Importação
 * 
 * Este script analisa a estrutura dos dados de importação
 * para entender melhor os campos de localização disponíveis
 */

// Simulação de dados típicos que podem vir do Asaas ou outras fontes
const sampleImportData = [
  {
    // Dados pessoais
    name: "João Silva",
    email: "joao@email.com",
    cpfCnpj: "12345678901",
    phone: "11999999999",
    
    // Endereço completo
    address: "Rua das Flores, 123",
    addressNumber: "123",
    complement: "Apto 45",
    province: "Centro", // Bairro
    postalCode: "01234567", // CEP
    
    // Localização - AQUI ESTÁ O PROBLEMA!
    city: "3550308", // ID da cidade (São Paulo)
    state: "SP", // Sigla do estado
    cityName: "São Paulo", // Nome da cidade (se disponível)
    stateName: "São Paulo", // Nome do estado (se disponível)
    
    // Outros campos possíveis
    country: "Brasil",
    ibgeCode: "3550308", // Código IBGE da cidade
    
    // Campos financeiros
    personType: "FISICA",
    companyType: null,
    
    // Metadados
    externalReference: "EXT123",
    observations: "Cliente importado"
  },
  {
    name: "Maria Santos",
    email: "maria@email.com",
    cpfCnpj: "98765432100",
    phone: "21888888888",
    
    address: "Av. Copacabana, 456",
    addressNumber: "456",
    complement: "",
    province: "Copacabana",
    postalCode: "22070001",
    
    // Exemplo do Rio de Janeiro
    city: "3304557", // ID da cidade (Rio de Janeiro)
    state: "RJ",
    cityName: "Rio de Janeiro",
    stateName: "Rio de Janeiro",
    
    country: "Brasil",
    ibgeCode: "3304557",
    
    personType: "FISICA",
    companyType: null,
    
    externalReference: "EXT456",
    observations: "Cliente VIP"
  }
];

console.log("=".repeat(80));
console.log("🔍 ANÁLISE DE ESTRUTURA DOS DADOS DE IMPORTAÇÃO");
console.log("=".repeat(80));

// Analisar estrutura dos dados
console.log("\n📊 CAMPOS DISPONÍVEIS:");
const allFields = new Set();
sampleImportData.forEach(record => {
  Object.keys(record).forEach(key => allFields.add(key));
});

const sortedFields = Array.from(allFields).sort();
sortedFields.forEach((field, index) => {
  console.log(`${(index + 1).toString().padStart(2, '0')}. ${field}`);
});

console.log("\n🗺️ CAMPOS DE LOCALIZAÇÃO IDENTIFICADOS:");
const locationFields = sortedFields.filter(field => 
  ['city', 'state', 'cityName', 'stateName', 'postalCode', 'address', 'province', 'country', 'ibgeCode'].includes(field)
);

locationFields.forEach((field, index) => {
  const samples = sampleImportData.map(record => record[field]).filter(Boolean);
  console.log(`${(index + 1).toString().padStart(2, '0')}. ${field.padEnd(15)} → ${samples.join(', ')}`);
});

console.log("\n🎯 ANÁLISE DETALHADA POR REGISTRO:");
sampleImportData.forEach((record, index) => {
  console.log(`\n--- REGISTRO ${index + 1}: ${record.name} ---`);
  console.log(`📍 Localização:`);
  console.log(`   • Estado (sigla): ${record.state}`);
  console.log(`   • Estado (nome):  ${record.stateName || 'N/A'}`);
  console.log(`   • Cidade (ID):    ${record.city}`);
  console.log(`   • Cidade (nome):  ${record.cityName || 'N/A'}`);
  console.log(`   • CEP:            ${record.postalCode}`);
  console.log(`   • Endereço:       ${record.address}, ${record.addressNumber}`);
  console.log(`   • Bairro:         ${record.province}`);
  console.log(`   • IBGE:           ${record.ibgeCode || 'N/A'}`);
});

console.log("\n🔧 MAPEAMENTO SUGERIDO:");
console.log("┌─────────────────┬─────────────────┬─────────────────────────────┐");
console.log("│ Campo Origem    │ Campo Destino   │ Observações                 │");
console.log("├─────────────────┼─────────────────┼─────────────────────────────┤");
console.log("│ state           │ state           │ Sigla do estado (SP, RJ)    │");
console.log("│ stateName       │ stateName       │ Nome completo do estado     │");
console.log("│ city            │ cityId          │ ID numérico da cidade       │");
console.log("│ cityName        │ cityName        │ Nome da cidade resolvido    │");
console.log("│ postalCode      │ postalCode      │ CEP                         │");
console.log("│ address         │ address         │ Logradouro                  │");
console.log("│ addressNumber   │ addressNumber   │ Número                      │");
console.log("│ complement      │ complement      │ Complemento                 │");
console.log("│ province        │ district        │ Bairro                      │");
console.log("└─────────────────┴─────────────────┴─────────────────────────────┘");

console.log("\n⚠️  PROBLEMAS IDENTIFICADOS:");
console.log("1. Campo 'city' contém ID numérico, não nome da cidade");
console.log("2. Precisamos resolver o ID da cidade para obter o nome");
console.log("3. Estado pode vir como sigla (SP) ou nome completo");
console.log("4. Falta mapeamento para campo 'state' no wizard atual");

console.log("\n💡 SOLUÇÕES PROPOSTAS:");
console.log("1. Adicionar campo 'state' no mapeamento do wizard");
console.log("2. Criar função para resolver nomes de estados");
console.log("3. Melhorar resolução de nomes de cidades");
console.log("4. Adicionar validação de CEP para inferir localização");

console.log("\n" + "=".repeat(80));
console.log("✅ Análise concluída! Use estes dados para ajustar o mapeamento.");
console.log("=".repeat(80));