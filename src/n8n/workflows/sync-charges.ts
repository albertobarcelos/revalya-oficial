import { baseWorkflowSettings } from './base-settings';

export const syncChargesWorkflow = {
  name: 'Asaas - Sincronização de Cobranças Existentes',
  ...baseWorkflowSettings,
  nodes: [
    {
      id: 'schedule',
      name: 'Schedule',
      type: 'n8n-nodes-base.scheduleTrigger',
      parameters: {
        interval: [
          {
            field: 'hours',
            value: 6 // Sincroniza a cada 6 horas
          }
        ]
      },
      typeVersion: 1,
      position: [100, 300]
    },
    {
      id: 'asaas-api',
      name: 'Asaas API',
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        url: '={{$env.ASAAS_API_URL}}/payments?limit=100',
        authentication: 'headerAuth',
        headerParameters: {
          'access_token': '={{$env.ASAAS_API_KEY}}'
        },
        options: {}
      },
      typeVersion: 1,
      position: [300, 300]
    },
    {
      id: 'function',
      name: 'Transform Data',
      type: 'n8n-nodes-base.function',
      parameters: {
        functionCode: `
          // AIDEV-NOTE: Transform CORRIGIDO - usando estrutura REAL da tabela charges
          const payments = items[0].json.data;
          
          return payments.map(payment => ({
            asaas_id: payment.id, // Campo correto: asaas_id (não id_asaas)
            customer_id: payment.customer, // Campo correto: customer_id (não id_cliente)
            valor: payment.value,
            data_vencimento: payment.dueDate,
            status: payment.status,
            tipo: 'BOLETO', // Campo obrigatório
            descricao: payment.description || '',
            created_at: new Date(payment.dateCreated).toISOString(),
            updated_at: new Date().toISOString()
          }));
        `
      },
      typeVersion: 1,
      position: [500, 300]
    },
    {
      id: 'supabase',
      name: 'Supabase',
      type: 'n8n-nodes-base.postgres',
      parameters: {
        operation: 'executeQuery',
        query: `
          -- AIDEV-NOTE: Query CORRIGIDA - usando estrutura REAL da tabela charges
          INSERT INTO charges (
            asaas_id, customer_id, valor, data_vencimento, status,
            tipo, descricao, created_at, updated_at
          )
          SELECT 
            d.asaas_id, d.customer_id, d.valor, d.data_vencimento::date, d.status,
            d.tipo, d.descricao,
            d.created_at::timestamp with time zone,
            d.updated_at::timestamp with time zone
          FROM jsonb_array_elements('{{$json}}'::jsonb) AS d
          ON CONFLICT (asaas_id) 
          DO UPDATE SET
            status = EXCLUDED.status,
            valor = EXCLUDED.valor,
            data_vencimento = EXCLUDED.data_vencimento,
            updated_at = EXCLUDED.updated_at;
        `,
        credentials: {
          database: 'supabase',
          host: process.env.SUPABASE_DB_HOST,
          password: process.env.SUPABASE_DB_PASSWORD,
          port: 5432,
          user: process.env.SUPABASE_DB_USER
        }
      },
      typeVersion: 1,
      position: [700, 300]
    }
  ],
  connections: {
    'schedule': {
      main: [['asaas-api']]
    },
    'asaas-api': {
      main: [['function']]
    },
    'function': {
      main: [['supabase']]
    }
  }
};
