import { baseWorkflowSettings } from './base-settings';

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
