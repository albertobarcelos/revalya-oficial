-- =====================================================
-- MIGRAÇÃO: Configurar Cron Job para chamar Edge Function
-- Data: 2025-01-30
-- Descrição: Configura cron job para chamar Edge Function sync-charges-from-asaas-api via HTTP
-- Autor: Barcelitos AI Agent
-- =====================================================

-- AIDEV-NOTE: Esta migração configura o cron job para chamar a Edge Function
-- sync-charges-from-asaas-api automaticamente a cada 1 hora via HTTP usando pg_net

-- =====================================================
-- REMOVER CRON JOB ANTIGO
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-charges-from-asaas-hourly'
  ) THEN
    PERFORM cron.unschedule('sync-charges-from-asaas-hourly');
    RAISE NOTICE 'Cron job sync-charges-from-asaas-hourly removido';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'sync-charges-from-asaas-api-hourly'
  ) THEN
    PERFORM cron.unschedule('sync-charges-from-asaas-api-hourly');
    RAISE NOTICE 'Cron job sync-charges-from-asaas-api-hourly removido (existente)';
  END IF;
END $$;

-- =====================================================
-- CRIAR FUNÇÃO AUXILIAR PARA CHAMAR EDGE FUNCTION
-- =====================================================

-- AIDEV-NOTE: Criar função auxiliar que chama a Edge Function via HTTP
CREATE OR REPLACE FUNCTION call_sync_charges_edge_function()
RETURNS void AS $$
DECLARE
  v_response_id BIGINT;
BEGIN
  -- AIDEV-NOTE: Fazer chamada HTTP para Edge Function usando pg_net
  -- Service role key será obtido via variável de ambiente do Supabase
  SELECT net.http_post(
    url := 'https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/sync-charges-from-asaas-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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
-- CONFIGURAR CRON JOB
-- =====================================================

-- AIDEV-NOTE: Criar cron job que chama a função auxiliar
-- Usar SELECT diretamente (não dentro de DO $$)
SELECT cron.schedule(
  'sync-charges-from-asaas-api-hourly',
  '0 * * * *',  -- A cada 1 hora (minuto 0 de cada hora)
  $$
  SELECT call_sync_charges_edge_function();
  $$
);

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION call_sync_charges_edge_function() IS 
'Função auxiliar que chama a Edge Function sync-charges-from-asaas-api via HTTP usando pg_net.
Usada pelo cron job sync-charges-from-asaas-api-hourly para sincronizar charges automaticamente.';

COMMENT ON FUNCTION sync_charges_from_asaas_all_tenants() IS 
'Identifica charges do ASAAS que precisam sincronização para todos os tenants ativos.
O cron job sync-charges-from-asaas-api-hourly chama automaticamente a Edge Function 
sync-charges-from-asaas-api para buscar dados da API e atualizar as charges.';
