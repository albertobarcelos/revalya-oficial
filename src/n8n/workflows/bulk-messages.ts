import { baseWorkflowSettings } from './base-settings';

export const bulkMessagesWorkflow = {
  name: 'Asaas - Envio de Mensagens em Massa',
  ...baseWorkflowSettings,
  nodes: [
    {
      id: 'webhook',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      parameters: {
        path: 'webhook/zap',
        httpMethod: 'POST',
        responseMode: 'lastNode',
        options: {
          allowUnauthorizedCerts: true,
          responseData: 'allEntries'
        }
      },
      typeVersion: 1,
      position: [100, 300]
    },
    {
      id: 'function',
      name: 'Process Messages',
      type: 'n8n-nodes-base.function',
      parameters: {
        functionCode: `
          const { chargeIds, templateId } = items[0].json;
          
          // Fetch charges and template data from Supabase
          const supabaseUrl = $env.SUPABASE_URL;
          const supabaseKey = $env.SUPABASE_SERVICE_ROLE_KEY;
          
          const fetchCharges = async () => {
            const response = await fetch(
              \`\${supabaseUrl}/rest/v1/charges?id=in.(\${chargeIds.join(',')})&select=*,customer:customers(*)\`,
              {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': \`Bearer \${supabaseKey}\`
                }
              }
            );
            return response.json();
          };
          
          const fetchTemplate = async () => {
            const response = await fetch(
              \`\${supabaseUrl}/rest/v1/notification_templates?id=eq.\${templateId}&select=*\`,
              {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': \`Bearer \${supabaseKey}\`
                }
              }
            );
            const templates = await response.json();
            return templates[0];
          };
          
          const [charges, template] = await Promise.all([
            fetchCharges(),
            fetchTemplate()
          ]);
          
          // Process each charge and prepare messages
          return charges.map(charge => ({
            charge_id: charge.id,
            customer_id: charge.customer?.id,
            customer_phone: charge.customer?.phone,
            message: template.message
              .replace('{cliente.nome}', charge.customer?.name || '')
              .replace('{cobranca.valor}', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(charge.valor))
              .replace('{cobranca.vencimento}', new Date(charge.data_vencimento).toLocaleDateString('pt-BR'))
          }));
        `
      },
      typeVersion: 1,
      position: [300, 300]
    },
    {
      id: 'whatsapp',
      name: 'Send WhatsApp Messages',
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        url: 'https://n8n-wh.nexsyn.com.br/webhook/zap',
        method: 'POST',
        authentication: 'headerAuth',
        headerParameters: {
          'Content-Type': 'application/json'
        },
        sendBody: true,
        bodyParameters: {
          'phone': '={{$json.customer_phone}}',
          'message': '={{$json.message}}'
        },
        options: {
          allowUnauthorizedCerts: true
        }
      },
      typeVersion: 1,
      position: [500, 300]
    },
    {
      id: 'supabase',
      name: 'Update Message Status',
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        url: '={{$env.SUPABASE_URL}}/rest/v1/message_logs',
        method: 'POST',
        authentication: 'headerAuth',
        headerParameters: {
          'apikey': '={{$env.SUPABASE_SERVICE_ROLE_KEY}}',
          'Authorization': '=Bearer {{$env.SUPABASE_SERVICE_ROLE_KEY}}',
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        sendBody: true,
        bodyParameters: {
          'charge_id': '={{$json.charge_id}}',
          'customer_id': '={{$json.customer_id}}',
          'message': '={{$json.message}}',
          'status': '={{$json["errorMessage"] ? "failed" : "sent"}}',
          'error_message': '={{$json["errorMessage"]}}',
          'sent_at': '={{$json["errorMessage"] ? null : $now}}'
        }
      },
      typeVersion: 1,
      position: [700, 300]
    }
  ],
  connections: {
    'webhook': {
      main: [['function']]
    },
    'function': {
      main: [['whatsapp']]
    },
    'whatsapp': {
      main: [['supabase']]
    }
  }
};
