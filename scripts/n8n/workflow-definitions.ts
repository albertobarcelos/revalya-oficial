import dotenv from 'dotenv';

dotenv.config();

const baseWorkflowSettings = {
  active: true,
  nodes: [],
  connections: {},
  settings: {
    saveExecutionProgress: true,
    saveManualExecutions: true,
    timezone: "America/Sao_Paulo"
  }
};

export const webhookWorkflow = {
  name: 'Asaas - Webhooks',
  ...baseWorkflowSettings,
  nodes: [
    {
      id: 'webhook-customers',
      name: 'Customers Webhook',
      type: 'n8n-nodes-base.webhook',
      parameters: {
        path: 'webhook/asaas/customers',
        httpMethod: 'POST',
        responseMode: 'lastNode'
      },
      typeVersion: 1,
      position: [100, 200]
    },
    {
      id: 'webhook-payments',
      name: 'Payments Webhook',
      type: 'n8n-nodes-base.webhook',
      parameters: {
        path: 'webhook/asaas/payments',
        httpMethod: 'POST',
        responseMode: 'lastNode'
      },
      typeVersion: 1,
      position: [100, 400]
    },
    {
      id: 'asaas-api',
      name: 'Asaas API',
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        url: '={{$env.ASAAS_API_URL}}',
        authentication: 'headerAuth',
        headerParameters: {
          'access_token': '={{$env.ASAAS_API_KEY}}'
        },
        options: {}
      },
      typeVersion: 1,
      position: [300, 300]
    }
  ],
  connections: {
    'webhook-customers': {
      main: [['asaas-api']]
    },
    'webhook-payments': {
      main: [['asaas-api']]
    }
  }
};

export const chargesWorkflow = {
  name: 'Asaas - Sincronização de Cobranças',
  ...baseWorkflowSettings,
  nodes: [
    {
      id: 'webhook-charges',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      parameters: {
        path: 'webhook/asaas/charges',
        httpMethod: 'POST',
        responseMode: 'lastNode'
      },
      typeVersion: 1,
      position: [100, 300]
    },
    {
      id: 'asaas-charges',
      name: 'Asaas API',
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        url: '={{$env.ASAAS_API_URL}}/payments',
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
      id: 'function-transform',
      name: 'Transform Data',
      type: 'n8n-nodes-base.function',
      parameters: {
        functionCode: `
          const payments = items[0].json.data;
          
          if (!Array.isArray(payments)) {
            console.log('Received data:', items[0].json);
            throw new Error('Expected array of payments');
          }

          return payments.map(payment => ({
            asaas_id: payment.id,
            customer_id: payment.customer,
            amount: payment.value,
            due_date: payment.dueDate,
            status: payment.status === 'PENDING' ? 'pending' : 
                    payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' ? 'paid' :
                    payment.status === 'OVERDUE' ? 'overdue' : 'cancelled',
            description: payment.description || '',
            payment_link: payment.invoiceUrl || '',
            barcode: payment.bankSlipUrl || '',
            pix_code: payment.pixQrCodeUrl || '',
            priority: 'medium',
            attempts: 0,
            paid_at: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
            created_at: new Date(payment.dateCreated).toISOString(),
            updated_at: new Date().toISOString()
          }));
        `
      },
      typeVersion: 1,
      position: [500, 300]
    },
    {
      id: 'supabase-upsert',
      name: 'Supabase',
      type: 'n8n-nodes-base.postgres',
      parameters: {
        operation: 'executeQuery',
        query: `
          INSERT INTO charges (
            asaas_id, customer_id, amount, due_date, status,
            description, payment_link, barcode, pix_code,
            priority, attempts, paid_at, created_at, updated_at
          )
          SELECT 
            d.asaas_id, d.customer_id, d.amount, d.due_date::date, d.status,
            d.description, d.payment_link, d.barcode, d.pix_code,
            d.priority, d.attempts, 
            d.paid_at::timestamp with time zone,
            d.created_at::timestamp with time zone,
            d.updated_at::timestamp with time zone
          FROM jsonb_array_elements('{{$json}}'::jsonb) AS d
          ON CONFLICT (asaas_id) 
          DO UPDATE SET
            status = EXCLUDED.status,
            amount = EXCLUDED.amount,
            due_date = EXCLUDED.due_date,
            payment_link = EXCLUDED.payment_link,
            barcode = EXCLUDED.barcode,
            pix_code = EXCLUDED.pix_code,
            paid_at = EXCLUDED.paid_at,
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
    'webhook-charges': {
      main: [
        [
          {
            node: 'asaas-charges',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'asaas-charges': {
      main: [
        [
          {
            node: 'function-transform',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'function-transform': {
      main: [
        [
          {
            node: 'supabase-upsert',
            type: 'main',
            index: 0
          }
        ]
      ]
    }
  }
};

export const mainWorkflow = {
  name: 'Asaas - Gerenciamento de Cobranças',
  ...baseWorkflowSettings,
  nodes: [
    {
      id: 'webhook-1',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      parameters: {
        path: 'webhook/asaas',
        options: {},
        httpMethod: 'POST',
        responseMode: 'lastNode'
      },
      typeVersion: 1,
      position: [100, 300]
    },
    {
      id: 'switch-1',
      name: 'Switch',
      type: 'n8n-nodes-base.switch',
      parameters: {
        conditions: {
          string: [
            {
              value1: '={{$json.action}}',
              operation: 'equal',
              value2: 'createPayment'
            },
            {
              value1: '={{$json.action}}',
              operation: 'equal',
              value2: 'sendNotification'
            },
            {
              value1: '={{$json.action}}',
              operation: 'equal',
              value2: 'bulkNotifications'
            },
            {
              value1: '={{$json.action}}',
              operation: 'equal',
              value2: 'exportPayments'
            }
          ]
        }
      },
      typeVersion: 1,
      position: [300, 300]
    },
    {
      id: 'asaas-1',
      name: 'Asaas API',
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        url: '={{$env.ASAAS_API_URL}}/payments',
        authentication: 'headerAuth',
        headerParameters: {
          'access_token': '={{$env.ASAAS_API_KEY}}'
        },
        options: {}
      },
      typeVersion: 1,
      position: [500, 200]
    },
    {
      id: 'asaas-2',
      name: 'Asaas Notification',
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        url: '={{$env.ASAAS_API_URL}}/payments/{{$json.paymentId}}/notifications',
        authentication: 'headerAuth',
        headerParameters: {
          'access_token': '={{$env.ASAAS_API_KEY}}'
        },
        options: {}
      },
      typeVersion: 1,
      position: [500, 300]
    },
    {
      id: 'asaas-3',
      name: 'Asaas Bulk Notifications',
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        url: '={{$env.ASAAS_API_URL}}/payments/notifications/bulk',
        authentication: 'headerAuth',
        headerParameters: {
          'access_token': '={{$env.ASAAS_API_KEY}}'
        },
        options: {}
      },
      typeVersion: 1,
      position: [500, 400]
    },
    {
      id: 'asaas-4',
      name: 'Asaas Export',
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        url: '={{$env.ASAAS_API_URL}}/payments/export',
        authentication: 'headerAuth',
        headerParameters: {
          'access_token': '={{$env.ASAAS_API_KEY}}'
        },
        options: {}
      },
      typeVersion: 1,
      position: [500, 500]
    }
  ],
  connections: {
    'webhook-1': {
      main: [
        [
          {
            node: 'switch-1',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'switch-1': {
      main: [
        [
          {
            node: 'asaas-1',
            type: 'main',
            index: 0
          }
        ],
        [
          {
            node: 'asaas-2',
            type: 'main',
            index: 0
          }
        ],
        [
          {
            node: 'asaas-3',
            type: 'main',
            index: 0
          }
        ],
        [
          {
            node: 'asaas-4',
            type: 'main',
            index: 0
          }
        ]
      ]
    }
  }
};
