import dotenv from 'dotenv';
import axios from 'axios';

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

export default {
  mainWorkflow: {
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
        id: 'asaas-1',
        name: 'Asaas API',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          url: 'https://api.asaas.com/v3/payments',
          authentication: 'headerAuth',
          headerParameters: {
            'access_token': '={{$env.ASAAS_API_KEY}}'
          },
          options: {}
        },
        typeVersion: 1,
        position: [500, 200]
      }
    ],
    connections: {
      'webhook-1': {
        main: [
          [
            {
              node: 'asaas-1',
              type: 'main',
              index: 0
            }
          ]
        ]
      }
    }
  }
};