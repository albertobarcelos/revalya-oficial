/**
 * Script de teste para a edge function send-invite-email
 * 
 * Uso:
 *   deno run --allow-net --allow-env scripts/test-send-invite-email.ts
 * 
 * Ou via Supabase CLI:
 *   npx supabase functions serve send-invite-email --env-file .env.local
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://wyehpiutzvwplllumgdk.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// AIDEV-NOTE: Dados de teste - ajuste conforme necessário
const testData = {
  email: 'teste@exemplo.com', // Email para testar
  token: 'test-token-12345', // Token de teste (não precisa ser válido no banco)
  type: 'tenant', // 'tenant' | 'reseller' | 'user'
  tenantName: 'Tenant de Teste',
  inviterName: 'Admin Teste'
};

async function testSendInviteEmail() {
  console.log('🧪 Testando edge function send-invite-email...\n');
  console.log('📧 Dados de teste:', testData);
  console.log('🔗 URL:', `${SUPABASE_URL}/functions/v1/send-invite-email\n`);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-invite-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log('📊 Status:', response.status);
    console.log('📦 Resposta:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Email enviado com sucesso!');
      console.log('📧 Verifique a caixa de entrada de:', testData.email);
    } else {
      console.log('\n❌ Erro ao enviar email:');
      console.log('   Erro:', result.error);
      if (result.details) {
        console.log('   Detalhes:', result.details);
      }
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

// Executar teste
testSendInviteEmail();

