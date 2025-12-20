/**
 * Script para testar webhook ASAAS
 * 
 * Este script simula webhooks do ASAAS para testar nossa Edge Function
 * e validar o fluxo completo de conciliação.
 * 
 * Uso:
 * npm run test:webhook -- --tenant-id=123 --event=PAYMENT_CONFIRMED
 * npm run test:webhook -- --tenant-id=123 --event=PAYMENT_RECEIVED --charge-id=cob_123
 * 
 * AIDEV-NOTE: Automatiza testes do webhook sem depender do ASAAS real,
 * permitindo validar todo o fluxo de conciliação em desenvolvimento.
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

interface TestWebhookArgs {
  tenantId: string;
  event: string;
  chargeId?: string;
  customerId?: string;
  subscriptionId?: string;
  value?: number;
  environment?: 'sandbox' | 'production';
  webhookUrl?: string;
  webhookToken?: string;
}

/**
 * Parseia argumentos da linha de comando
 */
function parseArgs(): TestWebhookArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<TestWebhookArgs> = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--tenant-id=')) {
      parsed.tenantId = arg.split('=')[1];
    } else if (arg.startsWith('--event=')) {
      parsed.event = arg.split('=')[1];
    } else if (arg.startsWith('--charge-id=')) {
      parsed.chargeId = arg.split('=')[1];
    } else if (arg.startsWith('--customer-id=')) {
      parsed.customerId = arg.split('=')[1];
    } else if (arg.startsWith('--subscription-id=')) {
      parsed.subscriptionId = arg.split('=')[1];
    } else if (arg.startsWith('--value=')) {
      parsed.value = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--environment=')) {
      parsed.environment = arg.split('=')[1] as 'sandbox' | 'production';
    } else if (arg.startsWith('--webhook-url=')) {
      parsed.webhookUrl = arg.split('=')[1];
    } else if (arg.startsWith('--webhook-token=')) {
      parsed.webhookToken = arg.split('=')[1];
    }
  });
  
  if (!parsed.tenantId || !parsed.event) {
    console.error('❌ Argumentos obrigatórios: --tenant-id e --event');
    console.log('Uso: npm run test:webhook -- --tenant-id=123 --event=PAYMENT_CONFIRMED');
    process.exit(1);
  }
  
  return {
    tenantId: parsed.tenantId!,
    event: parsed.event!,
    chargeId: parsed.chargeId || `cob_test_${Date.now()}`,
    customerId: parsed.customerId || `cus_test_${Date.now()}`,
    subscriptionId: parsed.subscriptionId,
    value: parsed.value || 100.00,
    environment: parsed.environment || 'sandbox',
    webhookUrl: parsed.webhookUrl,
    webhookToken: parsed.webhookToken || 'test_webhook_token_123'
  };
}

/**
 * Gera payload de teste do webhook ASAAS
 */
function generateWebhookPayload(args: TestWebhookArgs) {
  const basePayload = {
    id: args.chargeId,
    dateCreated: new Date().toISOString(),
    customer: args.customerId,
    subscription: args.subscriptionId,
    installment: null,
    paymentLink: null,
    value: args.value,
    netValue: args.value! * 0.965, // Simula taxa ASAAS de 3.5%
    originalValue: null,
    interestValue: null,
    description: `Teste de webhook - ${args.event}`,
    billingType: "CREDIT_CARD",
    canBePaidAfterDueDate: true,
    pixTransaction: null,
    status: getStatusFromEvent(args.event),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
    originalDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentDate: args.event.includes('RECEIVED') || args.event.includes('CONFIRMED') ? new Date().toISOString().split('T')[0] : null,
    clientPaymentDate: args.event.includes('RECEIVED') || args.event.includes('CONFIRMED') ? new Date().toISOString().split('T')[0] : null,
    installmentNumber: null,
    invoiceUrl: `https://sandbox.asaas.com/i/${args.chargeId}`,
    invoiceNumber: `INV-${Date.now()}`,
    externalReference: `REF-${args.tenantId}-${Date.now()}`,
    deleted: false,
    anticipated: false,
    anticipable: false,
    creditDate: null,
    estimatedCreditDate: null,
    transactionReceiptUrl: null,
    nossoNumero: null,
    bankSlipUrl: null,
    lastInvoiceViewedDate: null,
    lastBankSlipViewedDate: null,
    discount: {
      value: 0,
      limitDate: null,
      dueDateLimitDays: 0,
      type: "FIXED"
    },
    fine: {
      value: 0,
      type: "FIXED"
    },
    interest: {
      value: 0,
      type: "PERCENTAGE"
    },
    postalService: false,
    custody: null,
    refunds: null
  };

  return {
    event: args.event,
    payment: basePayload
  };
}

/**
 * Converte evento para status ASAAS
 */
function getStatusFromEvent(event: string): string {
  const eventStatusMap: Record<string, string> = {
    'PAYMENT_CREATED': 'PENDING',
    'PAYMENT_AWAITING_PAYMENT': 'PENDING',
    'PAYMENT_RECEIVED': 'RECEIVED',
    'PAYMENT_CONFIRMED': 'CONFIRMED',
    'PAYMENT_OVERDUE': 'OVERDUE',
    'PAYMENT_DELETED': 'PENDING',
    'PAYMENT_RESTORED': 'PENDING',
    'PAYMENT_UPDATED': 'PENDING',
    'PAYMENT_REFUNDED': 'REFUNDED',
    'PAYMENT_RECEIVED_IN_CASH_UNDONE': 'PENDING',
    'PAYMENT_CHARGEBACK_REQUESTED': 'PENDING',
    'PAYMENT_CHARGEBACK_DISPUTE': 'PENDING',
    'PAYMENT_AWAITING_CHARGEBACK_REVERSAL': 'PENDING',
    'PAYMENT_DUNNING_RECEIVED': 'RECEIVED',
    'PAYMENT_DUNNING_REQUESTED': 'PENDING',
    'PAYMENT_BANK_SLIP_VIEWED': 'PENDING',
    'PAYMENT_CHECKOUT_VIEWED': 'PENDING'
  };
  
  return eventStatusMap[event] || 'PENDING';
}

/**
 * Gera assinatura HMAC SHA-256
 */
function generateHmacSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Obtém URL do webhook
 */
function getWebhookUrl(args: TestWebhookArgs): string {
  if (args.webhookUrl) {
    return args.webhookUrl;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada');
  }
  
  const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
  return `https://${projectId}.supabase.co/functions/v1/asaas-webhook-charges`;
}

/**
 * Envia webhook de teste
 */
async function sendTestWebhook(args: TestWebhookArgs) {
  try {
    console.log('🚀 Enviando webhook de teste...\n');
    
    // Gera payload
    const payload = generateWebhookPayload(args);
    const payloadString = JSON.stringify(payload);
    
    // Gera assinatura
    const signature = generateHmacSignature(payloadString, args.webhookToken!);
    
    // Obtém URL do webhook
    const webhookUrl = getWebhookUrl(args);
    
    console.log('📋 Configurações do teste:');
    console.log(`   Tenant ID: ${args.tenantId}`);
    console.log(`   Evento: ${args.event}`);
    console.log(`   Charge ID: ${args.chargeId}`);
    console.log(`   Customer ID: ${args.customerId}`);
    console.log(`   Valor: R$ ${args.value?.toFixed(2)}`);
    console.log(`   Webhook URL: ${webhookUrl}`);
    console.log(`   Assinatura: ${signature.substring(0, 16)}...`);
    console.log('');
    
    // Envia requisição
    console.log('⏳ Enviando requisição...');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Asaas-Signature': signature,
        'User-Agent': 'Asaas-Webhook-Test/1.0'
      },
      body: payloadString
    });
    
    console.log(`📊 Resposta recebida: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ Webhook processado com sucesso!');
      
      const responseText = await response.text();
      if (responseText) {
        console.log('📄 Resposta:', responseText);
      }
    } else {
      console.log('❌ Erro no processamento do webhook');
      
      const errorText = await response.text();
      if (errorText) {
        console.log('📄 Erro:', errorText);
      }
    }
    
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('   1. Verifique os logs da Edge Function no Supabase');
    console.log('   2. Consulte a tabela conciliation_staging');
    console.log('   3. Teste o modal de conciliação no frontend');
    
  } catch (error) {
    console.error('❌ Erro ao enviar webhook de teste:', error);
    process.exit(1);
  }
}

/**
 * Função principal
 */
async function main() {
  const args = parseArgs();
  await sendTestWebhook(args);
}

// Executa o script
if (require.main === module) {
  main();
}

export { main as testAsaasWebhookScript };