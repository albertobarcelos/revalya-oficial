-- Migration: Correção de dados do customer no webhook
-- Data: 2025-01-09
-- Descrição: Esta migration não altera o schema, apenas documenta a correção feita no código

-- AIDEV-NOTE: Esta migration é apenas documental
-- A correção real foi feita no código da Edge Function asaas-webhook-charges
-- Ver: docs/CORRECAO_DADOS_CUSTOMER_WEBHOOK.md

-- Verificar quantos registros não têm dados do customer
DO $$
DECLARE
  v_count_without_data INTEGER;
  v_count_with_data INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count_without_data
  FROM conciliation_staging
  WHERE origem = 'ASAAS'
    AND customer_name IS NULL
    AND asaas_customer_id IS NOT NULL
    AND created_at > NOW() - INTERVAL '30 days';
  
  SELECT COUNT(*) INTO v_count_with_data
  FROM conciliation_staging
  WHERE origem = 'ASAAS'
    AND customer_name IS NOT NULL
    AND created_at > NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'Registros sem dados do customer (últimos 30 dias): %', v_count_without_data;
  RAISE NOTICE 'Registros com dados do customer (últimos 30 dias): %', v_count_with_data;
END $$;

-- AIDEV-NOTE: Para atualizar registros históricos, será necessário criar uma Edge Function
-- ou script que busque dados do customer na API do ASAAS para cada registro sem dados
-- Isso será feito em uma migration futura se necessário

