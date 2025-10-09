// =====================================================
// CORS CONFIGURATION
// Descrição: Configurações de CORS para Edge Functions
// Autor: Barcelitos AI Agent
// Data: 2025-01-09
// Atualizado: 2023-05-15 - Adicionado headers para ASAAS webhook
// =====================================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-signature, x-tenant-id, x-request-id, x-timestamp, asaas-access-token, x-asaas-access-token, x-webhook-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}