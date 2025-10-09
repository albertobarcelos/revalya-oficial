// Script para gerar JWT válido para webhook Asaas
const crypto = require('crypto');

// Chave secreta do Supabase (service role key)
const SUPABASE_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjcwMzE3NCwiZXhwIjoyMDU4Mjc5MTc0fQ.pcvUQvvcBi2YAKVQ3gi_ZN5Yikx3d-4SPQthtQ_7dK4';

// Função para criar JWT
function createJWT(payload, secret) {
  // Header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // Encode header e payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Criar signature
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

// Payload para o JWT
const payload = {
  iss: 'supabase',
  ref: 'wyehpiutzvwplllumgdk',
  role: 'service_role',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 ano
};

// Gerar JWT
const jwt = createJWT(payload, 'your-jwt-secret-key-here');

console.log('🔑 JWT Token gerado:');
console.log(jwt);
console.log('');
console.log('📋 Use este token no webhook do Asaas como Authorization Bearer');
console.log('');

// Teste de validação
console.log('🧪 Testando JWT...');
try {
  const parts = jwt.split('.');
  const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  console.log('✅ JWT válido! Payload:', decodedPayload);
} catch (error) {
  console.log('❌ Erro na validação:', error.message);
}