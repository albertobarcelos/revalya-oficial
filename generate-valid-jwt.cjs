// Gerador de JWT válido para Supabase
const crypto = require('crypto');

// Chave JWT secreta do Supabase (extraída do service role key)
// Esta é a chave que o Supabase usa para validar JWTs
const JWT_SECRET = 'your-jwt-secret-key-here'; // Vamos usar uma chave padrão

// Função para criar JWT válido
function createValidJWT() {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    iss: 'supabase',
    ref: 'wyehpiutzvwplllumgdk',
    role: 'anon', // Usando role anon que é mais seguro para webhooks externos
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 ano
  };

  // Encode header e payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Criar signature usando a chave JWT do Supabase
  const data = `${encodedHeader}.${encodedPayload}`;
  
  // Vamos usar o anon key como base para extrair a chave secreta
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY';
  
  // Extrair a chave secreta do JWT existente (método reverso)
  // Na verdade, vamos usar o anon key diretamente
  return anonKey;
}

// Gerar JWT válido
const validJWT = createValidJWT();

console.log('🔑 JWT Token VÁLIDO para Supabase:');
console.log(validJWT);
console.log('');
console.log('📋 Este é o anon key do seu projeto Supabase');
console.log('✅ Use este token no webhook do Asaas como Authorization Bearer');
console.log('');

// Verificar o payload
try {
  const parts = validJWT.split('.');
  const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  console.log('🔍 Payload do JWT:');
  console.log(JSON.stringify(decodedPayload, null, 2));
} catch (error) {
  console.log('❌ Erro na decodificação:', error.message);
}