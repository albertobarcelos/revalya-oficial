-- AIDEV-NOTE: Migration para criar trigger que busca dados do cliente ASAAS
-- e popula colunas customer_* na tabela conciliation_staging

-- Habilitar extensão http para fazer requisições HTTP
CREATE EXTENSION IF NOT EXISTS http;

-- Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION process_conciliation_staging_customer_data()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_customer_data JSONB;
    v_response JSONB;
    v_error_message TEXT;
BEGIN
    -- AIDEV-NOTE: Log de início do processamento
    RAISE LOG 'Iniciando processamento de dados do cliente para registro ID: %', NEW.id;
    
    -- Verificar se asaas_customer_id está presente
    IF NEW.asaas_customer_id IS NULL OR NEW.asaas_customer_id = '' THEN
        RAISE LOG 'asaas_customer_id não informado para registro ID: %, pulando processamento', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Obter tenant_id do registro
    v_tenant_id := NEW.tenant_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE WARNING 'tenant_id não informado para registro ID: %, não é possível buscar dados do cliente', NEW.id;
        RETURN NEW;
    END IF;
    
    -- AIDEV-NOTE: Chamar Edge Function para buscar dados do cliente ASAAS
    -- Usar as mesmas variáveis de ambiente que o asaas-webhook
    BEGIN
        SELECT content INTO v_response
        FROM http((
            'POST',
            'https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/fetch-asaas-customer',
            ARRAY[
                http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
                http_header('Content-Type', 'application/json')
            ],
            'application/json',
            json_build_object(
                'customer_id', NEW.asaas_customer_id,
                'tenant_id', v_tenant_id::text
            )::text
        ));
        
        -- Verificar se a resposta foi bem-sucedida
        IF v_response->>'success' = 'true' THEN
            v_customer_data := v_response->'customer_data';
            
            -- AIDEV-NOTE: Atualizar colunas customer_* com os dados obtidos
            NEW.customer_name := COALESCE(v_customer_data->>'customer_name', NEW.customer_name);
            NEW.customer_email := COALESCE(v_customer_data->>'customer_email', NEW.customer_email);
            NEW.customer_document := COALESCE(v_customer_data->>'customer_document', NEW.customer_document);
            NEW.customer_phone := COALESCE(v_customer_data->>'customer_phone', NEW.customer_phone);
            NEW.customer_mobile_phone := COALESCE(v_customer_data->>'customer_mobile_phone', NEW.customer_mobile_phone);
            NEW.customer_address := COALESCE(v_customer_data->>'customer_address', NEW.customer_address);
            NEW.customer_address_number := COALESCE(v_customer_data->>'customer_address_number', NEW.customer_address_number);
            NEW.customer_complement := COALESCE(v_customer_data->>'customer_complement', NEW.customer_complement);
            NEW.customer_province := COALESCE(v_customer_data->>'customer_province', NEW.customer_province);
            NEW.customer_city := COALESCE(v_customer_data->>'customer_city', NEW.customer_city);
            NEW.customer_state := COALESCE(v_customer_data->>'customer_state', NEW.customer_state);
            NEW.customer_postal_code := COALESCE(v_customer_data->>'customer_postal_code', NEW.customer_postal_code);
            NEW.customer_country := COALESCE(v_customer_data->>'customer_country', NEW.customer_country);
            
            RAISE LOG 'Dados do cliente ASAAS atualizados com sucesso para registro ID: %, cliente: %', 
                NEW.id, NEW.customer_name;
        ELSE
            v_error_message := v_response->>'error';
            RAISE WARNING 'Erro ao buscar dados do cliente ASAAS para registro ID: %, erro: %', 
                NEW.id, v_error_message;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- AIDEV-NOTE: Log de erro mas não interrompe o processo
        RAISE WARNING 'Erro ao processar dados do cliente ASAAS para registro ID: %, erro: %', 
            NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AIDEV-NOTE: Comentário da função
COMMENT ON FUNCTION process_conciliation_staging_customer_data() IS 
'Função trigger que busca dados do cliente na API ASAAS e popula colunas customer_* na tabela conciliation_staging';

-- Criar trigger que executa ANTES do INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_conciliation_staging_customer_data ON conciliation_staging;

CREATE TRIGGER trigger_conciliation_staging_customer_data
    BEFORE INSERT OR UPDATE OF asaas_customer_id ON conciliation_staging
    FOR EACH ROW
    WHEN (NEW.asaas_customer_id IS NOT NULL AND NEW.asaas_customer_id != '')
    EXECUTE FUNCTION process_conciliation_staging_customer_data();

-- AIDEV-NOTE: Comentário do trigger
COMMENT ON TRIGGER trigger_conciliation_staging_customer_data ON conciliation_staging IS 
'Trigger que executa antes de INSERT/UPDATE quando asaas_customer_id é informado, buscando dados do cliente na API ASAAS';

-- AIDEV-NOTE: Configurar variáveis necessárias para a função HTTP
-- Estas configurações devem ser definidas no ambiente Supabase
-- ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = 'your-service-role-key';

-- Log de criação
DO $$
BEGIN
    RAISE LOG 'Trigger conciliation_staging_customer_data criado com sucesso';
END $$;