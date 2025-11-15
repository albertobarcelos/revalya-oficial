-- =====================================================
-- MIGRAÇÃO: Corrigir Autenticação do Cron Job (v2)
-- Data: 2025-01-14
-- Descrição: Corrige autenticação do cron job usando ambos apikey e Authorization
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Esta migração corrige o problema de autenticação 401 no cron job
-- Mesmo com verifyJWT: false, o Supabase pode exigir headers de autenticação
-- Vamos usar tanto apikey quanto Authorization com a anon key

-- =====================================================
-- ATUALIZAR FUNÇÃO AUXILIAR PARA CHAMAR EDGE FUNCTION
-- =====================================================

-- AIDEV-NOTE: Atualizar função para usar ambos apikey e Authorization headers
CREATE OR REPLACE FUNCTION call_sync_charges_edge_function()
RETURNS void AS $$
DECLARE
  v_response_id BIGINT;
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDMxNzQsImV4cCI6MjA1ODI3OTE3NH0.j2vPVxP6pP9WyGgKqaI3imNQmkfMBzFTqzBdj2CJhaY';
BEGIN
  -- AIDEV-NOTE: Fazer chamada HTTP para Edge Function usando pg_net
  -- Usar ambos apikey e Authorization headers com anon key
  SELECT net.http_post(
    url := 'https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/sync-charges-from-asaas-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon_key,
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'sync_all_tenants', true
    )
  ) INTO v_response_id;
  
  -- AIDEV-NOTE: Log do request_id para rastreamento
  RAISE NOTICE 'Edge Function chamada com request_id: %', v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION call_sync_charges_edge_function() IS 
'Função auxiliar que chama a Edge Function sync-charges-from-asaas-api via HTTP usando pg_net.
Usa headers apikey e Authorization com anon key para garantir autenticação mesmo com verifyJWT: false.
Usada pelo cron job sync-charges-from-asaas-api-hourly para sincronizar charges automaticamente.';

