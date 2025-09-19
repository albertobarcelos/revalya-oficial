import { baseWorkflowSettings } from './base-settings';

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
        responseMode: 'lastNode',
        options: {
          allowUnauthorizedCerts: true,
          responseData: 'allEntries'
        }
      },
      typeVersion: 1,
      position: [100, 200]
    },
    {
      id: 'function-transform',
      name: 'Transform Customer Data',
      type: 'n8n-nodes-base.function',
      parameters: {
        functionCode: `
          const customer = items[0].json;
          
          // Map Asaas customer data to our schema
          return [{
            json: {
              asaas_id: customer.id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone, // AIDEV-NOTE: Removido fallback para mobilePhone - campo não existe na tabela
              cpf_cnpj: customer.cpfCnpj,
              address: customer.address,
              city: customer.city,
              state: customer.state,
              postal_code: customer.postal_code, // AIDEV-NOTE: Campo correto conforme schema da tabela customers
              notes: customer.observations,
              status: customer.deleted ? 'inactive' : 'active',
              updated_at: new Date().toISOString()
            }
          }];
        `
      },
      typeVersion: 1,
      position: [300, 200]
    },
    {
      id: 'supabase-upsert',
      name: 'Supabase Update',
      type: 'n8n-nodes-base.postgres',
      parameters: {
        operation: 'executeQuery',
        query: `
          INSERT INTO customers (
            asaas_id, name, email, phone, cpf_cnpj,
            address, city, state, postal_code, notes,
            status, updated_at
          )
          VALUES (
            '{{$json["asaas_id"]}}',
            '{{$json["name"]}}',
            '{{$json["email"]}}',
            '{{$json["phone"]}}',
            '{{$json["cpf_cnpj"]}}',
            '{{$json["address"]}}',
            '{{$json["city"]}}',
            '{{$json["state"]}}',
            '{{$json["postal_code"]}}',
            '{{$json["notes"]}}',
            '{{$json["status"]}}',
            '{{$json["updated_at"]}}'
          )
          ON CONFLICT (asaas_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            cpf_cnpj = EXCLUDED.cpf_cnpj,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            postal_code = EXCLUDED.postal_code,
            notes = EXCLUDED.notes,
            status = EXCLUDED.status,
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
      position: [500, 200]
    }
  ],
  connections: {
    'webhook-customers': {
      main: [['function-transform']]
    },
    'function-transform': {
      main: [['supabase-upsert']]
    }
  }
};
