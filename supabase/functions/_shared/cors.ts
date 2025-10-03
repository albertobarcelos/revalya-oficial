// =====================================================
// CORS CONFIGURATION
// Descrição: Configurações de CORS para Edge Functions
// Autor: Barcelitos AI Agent
// Data: 2025-01-09
// Atualizado: 2023-05-15 - Adicionado headers para ASAAS webhook
// =====================================================

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-signature, asaas-access-token, x-asaas-access-token, x-webhook-token',
}