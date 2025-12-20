// =====================================================
// DIAGNÓSTICO: DADOS ENVIADOS DO FRONTEND PARA EDGE FUNCTION
// Objetivo: Verificar se os dados estão sendo formatados corretamente
// =====================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnosticFrontendData() {
  console.log('🔍 DIAGNÓSTICO: Dados enviados do Frontend para Edge Function');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar uma cobrança real para teste
    console.log('\n1️⃣ Buscando cobrança para teste...');
    const { data: charges, error: chargesError } = await supabase
      .from('charges')
      .select('id, customer_name, customer_phone, amount, due_date, status, tenant_id')
      .limit(1);

    if (chargesError || !charges || charges.length === 0) {
      console.error('❌ Erro ao buscar cobranças:', chargesError);
      return;
    }

    const testCharge = charges[0];
    console.log('✅ Cobrança encontrada:', {
      id: testCharge.id,
      customer_name: testCharge.customer_name,
      customer_phone: testCharge.customer_phone,
      amount: testCharge.amount,
      tenant_id: testCharge.tenant_id
    });

    // 2. Simular dados que o frontend enviaria
    console.log('\n2️⃣ Simulando dados do frontend...');
    
    // Cenário 1: Mensagem com template
    const frontendDataTemplate = {
      chargeIds: [testCharge.id],
      templateId: 'default_charge_reminder',
      sendImmediately: true,
      tenant_id: testCharge.tenant_id
    };

    console.log('📤 Dados com template:', JSON.stringify(frontendDataTemplate, null, 2));

    // Cenário 2: Mensagem customizada
    const frontendDataCustom = {
      chargeIds: [testCharge.id],
      customMessage: 'Olá {cliente.nome}, sua cobrança de {cobranca.valor} vence em {cobranca.vencimento}.',
      sendImmediately: true,
      tenant_id: testCharge.tenant_id
    };

    console.log('📤 Dados com mensagem customizada:', JSON.stringify(frontendDataCustom, null, 2));

    // 3. Testar chamada real para Edge Function
    console.log('\n3️⃣ Testando chamada real para Edge Function...');
    
    try {
      const response = await supabase.functions.invoke('send-bulk-messages', {
        body: frontendDataTemplate
      });

      console.log('📥 Resposta da Edge Function:');
      console.log('Status:', response.error ? 'ERRO' : 'SUCESSO');
      
      if (response.error) {
        console.error('❌ Erro:', response.error);
        console.error('❌ Detalhes:', JSON.stringify(response.error, null, 2));
      } else {
        console.log('✅ Dados:', JSON.stringify(response.data, null, 2));
      }

    } catch (error) {
      console.error('❌ Erro na chamada:', error);
    }

    // 4. Verificar configurações de WhatsApp
    console.log('\n4️⃣ Verificando configurações de WhatsApp...');
    const { data: whatsappConfig, error: configError } = await supabase
      .from('whatsapp_configurations')
      .select('*')
      .eq('tenant_id', testCharge.tenant_id)
      .single();

    if (configError) {
      console.error('❌ Erro ao buscar configuração WhatsApp:', configError);
    } else {
      console.log('✅ Configuração WhatsApp:', {
        instance_name: whatsappConfig.instance_name,
        is_active: whatsappConfig.is_active,
        tenant_id: whatsappConfig.tenant_id
      });
    }

    // 5. Verificar templates disponíveis
    console.log('\n5️⃣ Verificando templates disponíveis...');
    const { data: templates, error: templatesError } = await supabase
      .from('message_templates')
      .select('id, name, message')
      .eq('tenant_id', testCharge.tenant_id)
      .eq('is_active', true);

    if (templatesError) {
      console.error('❌ Erro ao buscar templates:', templatesError);
    } else {
      console.log('✅ Templates disponíveis:', templates.length);
      templates.forEach(template => {
        console.log(`  - ${template.id}: ${template.name}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral no diagnóstico:', error);
  }
}

// Executar diagnóstico
diagnosticFrontendData().then(() => {
  console.log('\n🏁 Diagnóstico concluído');
}).catch(error => {
  console.error('❌ Erro fatal:', error);
});