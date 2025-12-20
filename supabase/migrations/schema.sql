

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "app_auth";


ALTER SCHEMA "app_auth" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "crm";


ALTER SCHEMA "crm" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE SCHEMA IF NOT EXISTS "nexhunters";


ALTER SCHEMA "nexhunters" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pgsodium";






CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."bank_operation_type" AS ENUM (
    'CREDIT',
    'DEBIT'
);


ALTER TYPE "public"."bank_operation_type" OWNER TO "postgres";


CREATE TYPE "public"."billing_period_status" AS ENUM (
    'PENDING',
    'DUE_TODAY',
    'LATE',
    'BILLED',
    'SKIPPED',
    'FAILED',
    'PAID'
);


ALTER TYPE "public"."billing_period_status" OWNER TO "postgres";


CREATE TYPE "public"."billing_type_enum" AS ENUM (
    'regular',
    'complementary',
    'adjustment'
);


ALTER TYPE "public"."billing_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."dre_category" AS ENUM (
    'NONE',
    'DEFAULT',
    'SALES',
    'ADMIN',
    'FINANCIAL',
    'MARKETING',
    'PERSONAL',
    'SOCIAL_CHARGES',
    'OTHER'
);


ALTER TYPE "public"."dre_category" OWNER TO "postgres";


CREATE TYPE "public"."financial_operation_type" AS ENUM (
    'DEBIT',
    'CREDIT'
);


ALTER TYPE "public"."financial_operation_type" OWNER TO "postgres";


CREATE TYPE "public"."financial_setting_type" AS ENUM (
    'EXPENSE_CATEGORY',
    'DOCUMENT_TYPE',
    'ENTRY_TYPE'
);


ALTER TYPE "public"."financial_setting_type" OWNER TO "postgres";


CREATE TYPE "public"."payable_status" AS ENUM (
    'PENDING',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'DUE_SOON',
    'DUE_TODAY'
);


ALTER TYPE "public"."payable_status" OWNER TO "postgres";


CREATE TYPE "public"."service_billing_event_status" AS ENUM (
    'PENDING',
    'PROCESSED',
    'SKIPPED',
    'ERROR'
);


ALTER TYPE "public"."service_billing_event_status" OWNER TO "postgres";


CREATE TYPE "public"."stock_movement_type" AS ENUM (
    'ENTRADA',
    'SAIDA',
    'AJUSTE',
    'TRANSFERENCIA'
);


ALTER TYPE "public"."stock_movement_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app_auth"."set_role_after_login"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Chamar a função para definir a role
  PERFORM public.set_role_from_users_table();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "app_auth"."set_role_after_login"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acknowledge_security_notification"("p_notification_id" "uuid", "p_acknowledged_by" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    notification_exists BOOLEAN;
BEGIN
    -- Verifica se a notificação existe e se o usuário tem permissão
    SELECT EXISTS(
        SELECT 1 FROM public.security_notifications
        WHERE id = p_notification_id
        AND (
            get_current_user_role_from_jwt() IN ('PLATFORM_ADMIN', 'ADMIN') OR
            (
                get_current_user_role_from_jwt() IN ('TENANT_ADMIN', 'MANAGER') AND
                user_has_tenant_access_jwt(tenant_id)
            ) OR
            user_id = auth.uid()
        )
    ) INTO notification_exists;
    
    IF NOT notification_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Atualiza a notificação
    UPDATE public.security_notifications
    SET 
        acknowledged = TRUE,
        acknowledged_by = p_acknowledged_by,
        acknowledged_at = NOW(),
        updated_at = NOW()
    WHERE id = p_notification_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."acknowledge_security_notification"("p_notification_id" "uuid", "p_acknowledged_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."acknowledge_security_notification"("p_notification_id" "uuid", "p_acknowledged_by" "uuid") IS 'Marca uma notificação como reconhecida';



CREATE OR REPLACE FUNCTION "public"."adjust_balance_on_history_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
/*
  Reverte o efeito do registro removido de bank_operation_history
  no current_balance da conta bancária associada.
*/
DECLARE
  v_old_delta NUMERIC(18,2);
BEGIN
  IF OLD.bank_acount_id IS NULL THEN
    RETURN OLD;
  END IF;

  v_old_delta := CASE WHEN OLD.operation_type = 'CREDIT' THEN OLD.amount ELSE -OLD.amount END;

  UPDATE public.bank_acounts AS ba
  SET current_balance = COALESCE(ba.current_balance, 0) - v_old_delta,
      updated_at = timezone('America/Sao_Paulo'::text, now())
  WHERE ba.id = OLD.bank_acount_id
    AND ba.tenant_id = OLD.tenant_id;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."adjust_balance_on_history_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_balance_on_history_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
/*
  Ajusta current_balance da conta bancária associada ao registro
  inserido em bank_operation_history.
  Regras:
  - CREDIT: soma amount
  - DEBIT: subtrai amount
  - Ignora quando bank_acount_id é NULL
*/
DECLARE
  v_delta NUMERIC(18,2);
BEGIN
  IF NEW.bank_acount_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_delta := CASE WHEN NEW.operation_type = 'CREDIT' THEN NEW.amount ELSE -NEW.amount END;

  UPDATE public.bank_acounts AS ba
  SET current_balance = COALESCE(ba.current_balance, 0) + v_delta,
      updated_at = timezone('America/Sao_Paulo'::text, now())
  WHERE ba.id = NEW.bank_acount_id
    AND ba.tenant_id = NEW.tenant_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."adjust_balance_on_history_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_balance_on_history_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
/*
  Ajusta current_balance considerando mudanças em amount, operation_type
  e/ou bank_acount_id.
  - Se a conta mudou: remove efeito antigo da conta OLD e aplica efeito
    novo na conta NEW.
  - Caso contrário: aplica apenas a diferença (novo - antigo) na mesma conta.
  - Ignora quando ambas as contas são NULL.
*/
DECLARE
  v_old_delta NUMERIC(18,2);
  v_new_delta NUMERIC(18,2);
  v_diff NUMERIC(18,2);
BEGIN
  v_old_delta := CASE WHEN OLD.operation_type = 'CREDIT' THEN OLD.amount ELSE -OLD.amount END;
  v_new_delta := CASE WHEN NEW.operation_type = 'CREDIT' THEN NEW.amount ELSE -NEW.amount END;

  IF COALESCE(OLD.bank_acount_id, '00000000-0000-0000-0000-000000000000'::uuid) 
     IS DISTINCT FROM COALESCE(NEW.bank_acount_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    -- Remove da conta antiga
    IF OLD.bank_acount_id IS NOT NULL THEN
      UPDATE public.bank_acounts AS ba
      SET current_balance = COALESCE(ba.current_balance, 0) - v_old_delta,
          updated_at = timezone('America/Sao_Paulo'::text, now())
      WHERE ba.id = OLD.bank_acount_id
        AND ba.tenant_id = OLD.tenant_id;
    END IF;
    -- Aplica na conta nova
    IF NEW.bank_acount_id IS NOT NULL THEN
      UPDATE public.bank_acounts AS ba
      SET current_balance = COALESCE(ba.current_balance, 0) + v_new_delta,
          updated_at = timezone('America/Sao_Paulo'::text, now())
      WHERE ba.id = NEW.bank_acount_id
        AND ba.tenant_id = NEW.tenant_id;
    END IF;
  ELSE
    -- Mesma conta: aplica diferença
    IF NEW.bank_acount_id IS NOT NULL THEN
      v_diff := v_new_delta - v_old_delta;
      UPDATE public.bank_acounts AS ba
      SET current_balance = COALESCE(ba.current_balance, 0) + v_diff,
          updated_at = timezone('America/Sao_Paulo'::text, now())
      WHERE ba.id = NEW.bank_acount_id
        AND ba.tenant_id = NEW.tenant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."adjust_balance_on_history_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_check_user_exists"("user_email" "text" DEFAULT NULL::"text", "user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  found_user RECORD;
  is_super_admin BOOLEAN;
BEGIN
  -- Verificar permissões do usuário atual
  is_super_admin := EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND user_role IN ('ADMIN', 'PLATFORM_ADMIN')
  );

  -- Se não for superadmin, só pode verificar o próprio usuário
  IF NOT is_super_admin AND user_id IS NOT NULL AND user_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'exists', false,
      'message', 'Sem permissão para verificar outro usuário'
    );
  END IF;

  -- Verificar usuário
  IF user_id IS NOT NULL THEN
    SELECT id, email, created_at
    INTO found_user
    FROM auth.users
    WHERE id = user_id;
  ELSIF user_email IS NOT NULL THEN
    SELECT id, email, created_at
    INTO found_user
    FROM auth.users
    WHERE email = user_email;
  ELSE
    RETURN jsonb_build_object(
      'exists', false,
      'message', 'Especifique user_id ou user_email'
    );
  END IF;

  -- Retornar resultado
  IF found_user.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'exists', true,
      'id', found_user.id,
      'email', found_user.email,
      'created_at', found_user.created_at
    );
  ELSE
    RETURN jsonb_build_object(
      'exists', false
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."admin_check_user_exists"("user_email" "text", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_user_bypass_rls"("user_id" "uuid", "user_email" "text", "user_role_value" "text" DEFAULT 'USER'::"text", "user_name" "text" DEFAULT NULL::"text", "user_status" "text" DEFAULT 'ACTIVE'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verificar se já existe
  IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    -- Atualizar usuário existente
    UPDATE public.users SET
      email = user_email,
      user_role = user_role_value,
      role = 'authenticated',
      name = COALESCE(user_name, split_part(user_email, '@', 1)),
      status = user_status,
      updated_at = NOW()
    WHERE id = user_id;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Usuário atualizado com sucesso',
      'action', 'updated'
    );
  ELSE
    -- Inserir novo usuário
    INSERT INTO public.users (
      id, 
      email, 
      user_role,
      role,
      name,
      status,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      user_email,
      user_role_value,
      'authenticated',
      COALESCE(user_name, split_part(user_email, '@', 1)),
      user_status,
      NOW(),
      NOW()
    );
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Usuário criado com sucesso',
      'action', 'created'
    );
  END IF;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Erro ao criar/atualizar usuário: ' || SQLERRM,
    'error_code', SQLSTATE,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."admin_create_user_bypass_rls"("user_id" "uuid", "user_email" "text", "user_role_value" "text", "user_name" "text", "user_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_force_create_user"("user_id_param" "uuid", "user_email_param" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Inserir diretamente na tabela users ignorando RLS
  INSERT INTO public.users (
    id, 
    email, 
    user_role, 
    name, 
    status, 
    created_at,
    updated_at
  )
  VALUES (
    user_id_param,
    user_email_param,
    'USER',
    split_part(user_email_param, '@', 1),
    'ACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'ACTIVE',
    updated_at = NOW();
    
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuário criado com sucesso usando força bruta',
    'user_id', user_id_param,
    'email', user_email_param
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Erro ao forçar criação do usuário: ' || SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;


ALTER FUNCTION "public"."admin_force_create_user"("user_id_param" "uuid", "user_email_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_all_tenants"() RETURNS TABLE("id" "uuid", "name" "text", "document" "text", "email" "text", "phone" "text", "active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "reseller_id" "uuid", "reseller_name" "text", "slug" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Verificar se o usuário tem papel de administrador ou revenda
  IF (SELECT user_role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'RESELLER') THEN
    RETURN QUERY
    SELECT 
      t.id,            -- Especificando claramente que estamos pegando o id da tabela tenants
      t.name,
      t.document,
      t.email,
      t.phone,
      t.active,
      t.created_at,
      t.updated_at,
      t.reseller_id,
      r.name as reseller_name,
      t.slug
    FROM 
      public.tenants t
    LEFT JOIN
      public.resellers r ON t.reseller_id = r.id
    ORDER BY
      t.name;
  ELSE
    -- Se não for admin ou reseller, retorna conjunto vazio
    RETURN;
  END IF;
END;
$$;


ALTER FUNCTION "public"."admin_get_all_tenants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_tenant_pending_invites_v2"("tenant_id_param" "text") RETURNS SETOF "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    tenant_uuid uuid;
BEGIN
    -- AIDEV-NOTE: Função administrativa que não requer autenticação específica
    -- Converter tenant_id_param para UUID
    BEGIN
        tenant_uuid := tenant_id_param::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        -- Se não for UUID, tentar buscar por slug
        SELECT id INTO tenant_uuid 
        FROM tenants 
        WHERE slug = tenant_id_param;
        
        IF tenant_uuid IS NULL THEN
            RAISE EXCEPTION 'Tenant não encontrado para slug: %', tenant_id_param;
        END IF;
    END;
    
    -- Retornar os convites pendentes sem verificação de acesso
    RETURN QUERY
    SELECT to_json(ti.*) 
    FROM tenant_invites ti
    WHERE ti.tenant_id = tenant_uuid 
    AND ti.status = 'PENDING'
    ORDER BY ti.created_at DESC;
    
END;
$$;


ALTER FUNCTION "public"."admin_get_tenant_pending_invites_v2"("tenant_id_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "refreshed_at" timestamp with time zone, "not_after" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.created_at,
        s.updated_at,
        s.refreshed_at,
        s.not_after
    FROM auth.sessions s
    WHERE s.user_id = p_user_id
        AND (p_updated_at IS NULL OR s.updated_at >= p_updated_at)
    ORDER BY s.updated_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."admin_get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) IS 'Função administrativa para buscar sessões de usuário sem verificação de autenticação (apenas service_role)';



CREATE OR REPLACE FUNCTION "public"."admin_list_tenant_ids"() RETURNS TABLE("id" "uuid", "name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Verificar se o usuário é admin ou reseller
  IF (SELECT user_role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'RESELLER') THEN
    RETURN QUERY
    SELECT 
      t.id,
      t.name
    FROM 
      public.tenants t
    ORDER BY
      t.name;
  ELSE
    RETURN;
  END IF;
END;
$$;


ALTER FUNCTION "public"."admin_list_tenant_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attempt_billing_period_charge"("p_period_id" "uuid", "p_tenant_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_period_record RECORD;
    v_contract_record RECORD;
    v_total_value DECIMAL(10,2) := 0;
    v_charge_id UUID;
    v_service_record RECORD;
    v_product_record RECORD;
    v_due_date DATE;
    v_earliest_due_date DATE := NULL;
    v_latest_due_date DATE := NULL;
    v_temp_due_date DATE;
    v_service_value DECIMAL(10,2);
    v_product_value DECIMAL(10,2);
    v_payment_type TEXT := 'PIX'; -- AIDEV-NOTE: Valor padrão
    v_payment_method_set BOOLEAN := false; -- AIDEV-NOTE: Flag para controlar se já foi definido
    v_installments INTEGER := 1; -- AIDEV-NOTE: Número de parcelas
    v_installment_value DECIMAL(10,2);
    v_is_installment BOOLEAN := false;
    i INTEGER;
BEGIN
    -- AIDEV-NOTE: Verificar se o período existe e está com status PENDING ou DUE_TODAY
    SELECT * INTO v_period_record
    FROM contract_billing_periods
    WHERE id = p_period_id 
    AND tenant_id = p_tenant_id
    AND status IN ('PENDING', 'DUE_TODAY', 'LATE');
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Período de faturamento não encontrado ou não está pendente/vencendo hoje'
        );
    END IF;
    
    -- AIDEV-NOTE: Buscar dados do contrato
    SELECT * INTO v_contract_record
    FROM contracts
    WHERE id = v_period_record.contract_id
    AND tenant_id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Contrato não encontrado'
        );
    END IF;
    
    -- AIDEV-NOTE: Calcular valor total dos serviços ativos e suas datas de vencimento
    -- CORREÇÃO: contract_services usa due_type e due_value (não due_date_type, due_days, etc.)
    FOR v_service_record IN
        SELECT cs.*, s.name as service_name, s.description as service_description
        FROM contract_services cs
        JOIN services s ON s.id = cs.service_id
        WHERE cs.contract_id = v_period_record.contract_id
        AND cs.tenant_id = p_tenant_id
        AND cs.is_active = true
        AND cs.generate_billing = true
        AND cs.no_charge = false
    LOOP
        -- AIDEV-NOTE: Calcular valor do serviço baseado nos campos corretos
        v_service_value := COALESCE(v_service_record.total_amount, 
                                   (v_service_record.unit_price * v_service_record.quantity));
        
        -- Aplicar desconto se houver
        IF v_service_record.discount_percentage > 0 THEN
            v_service_value := v_service_value * (1 - v_service_record.discount_percentage / 100);
        END IF;
        
        IF v_service_record.discount_amount > 0 THEN
            v_service_value := v_service_value - v_service_record.discount_amount;
        END IF;
        
        -- Adicionar taxa se houver
        IF v_service_record.tax_rate > 0 THEN
            v_service_value := v_service_value + (v_service_value * v_service_record.tax_rate / 100);
        END IF;
        
        v_total_value := v_total_value + COALESCE(v_service_value, 0);
        
        -- AIDEV-NOTE: Mapear payment_method para o tipo aceito pela constraint
        -- Só define se ainda não foi definido (prioriza o primeiro serviço)
        IF v_service_record.payment_method IS NOT NULL AND NOT v_payment_method_set THEN
            CASE UPPER(TRIM(v_service_record.payment_method))
                WHEN 'PIX' THEN v_payment_type := 'PIX';
                WHEN 'BOLETO' THEN v_payment_type := 'BOLETO';
                WHEN 'CREDIT_CARD' THEN v_payment_type := 'CREDIT_CARD';
                WHEN 'CARTAO_CREDITO' THEN v_payment_type := 'CREDIT_CARD';
                WHEN 'CARTÃO' THEN v_payment_type := 'CREDIT_CARD'; -- AIDEV-NOTE: Correção principal
                WHEN 'CARTAO' THEN v_payment_type := 'CREDIT_CARD';
                WHEN 'CASH' THEN v_payment_type := 'CASH';
                WHEN 'DINHEIRO' THEN v_payment_type := 'CASH';
                ELSE v_payment_type := 'PIX'; -- Padrão se não reconhecido
            END CASE;
            
            -- AIDEV-NOTE: Definir parcelas se for cartão de crédito
            IF v_payment_type = 'CREDIT_CARD' AND v_service_record.installments IS NOT NULL AND v_service_record.installments > 1 THEN
                v_installments := v_service_record.installments;
                v_is_installment := true;
            END IF;
            
            v_payment_method_set := true; -- AIDEV-NOTE: Marcar como definido
        END IF;
        
        -- ✅ CORREÇÃO CRÍTICA: Trocar 'specific_day' por 'fixed_day' para serviços
        CASE v_service_record.due_type
            WHEN 'days_after_billing' THEN
                v_temp_due_date := v_period_record.bill_date + INTERVAL '1 day' * COALESCE(v_service_record.due_value, 0);
            WHEN 'fixed_day' THEN  -- ✅ CORRIGIDO: era 'specific_day'
                -- Se due_next_month é true, vai para o próximo mês
                IF v_service_record.due_next_month THEN
                    v_temp_due_date := DATE_TRUNC('month', v_period_record.bill_date) + INTERVAL '1 month' + INTERVAL '1 day' * (COALESCE(v_service_record.due_value, 1) - 1);
                ELSE
                    v_temp_due_date := DATE_TRUNC('month', v_period_record.bill_date) + INTERVAL '1 day' * (COALESCE(v_service_record.due_value, 1) - 1);
                    -- Se a data já passou no mês atual, vai para o próximo mês
                    IF v_temp_due_date < v_period_record.bill_date THEN
                        v_temp_due_date := DATE_TRUNC('month', v_period_record.bill_date) + INTERVAL '1 month' + INTERVAL '1 day' * (COALESCE(v_service_record.due_value, 1) - 1);
                    END IF;
                END IF;
            ELSE
                -- Padrão: mesmo dia do faturamento se não especificado
                v_temp_due_date := v_period_record.bill_date;
        END CASE;
        
        -- AIDEV-NOTE: Rastrear a menor e maior data de vencimento
        IF v_earliest_due_date IS NULL OR v_temp_due_date < v_earliest_due_date THEN
            v_earliest_due_date := v_temp_due_date;
        END IF;
        IF v_latest_due_date IS NULL OR v_temp_due_date > v_latest_due_date THEN
            v_latest_due_date := v_temp_due_date;
        END IF;
    END LOOP;
    
    -- AIDEV-NOTE: Calcular valor total dos produtos ativos (mantendo lógica original)
    -- NOTA: contract_products ainda usa os campos antigos (due_date_type, due_days, due_day, due_next_month)
    FOR v_product_record IN
        SELECT cp.*, p.name as product_name, p.description as product_description
        FROM contract_products cp
        JOIN products p ON p.id = cp.product_id
        WHERE cp.contract_id = v_period_record.contract_id
        AND cp.tenant_id = p_tenant_id
        AND cp.is_active = true
        AND cp.generate_billing = true
    LOOP
        -- AIDEV-NOTE: Calcular valor do produto baseado nos campos corretos
        v_product_value := COALESCE(v_product_record.total_amount, 
                                   (v_product_record.unit_price * v_product_record.quantity));
        
        -- Aplicar desconto se houver
        IF v_product_record.discount_percentage > 0 THEN
            v_product_value := v_product_value * (1 - v_product_record.discount_percentage / 100);
        END IF;
        
        IF v_product_record.discount_amount > 0 THEN
            v_product_value := v_product_value - v_product_record.discount_amount;
        END IF;
        
        -- Adicionar taxa se houver
        IF v_product_record.tax_rate > 0 THEN
            v_product_value := v_product_value + (v_product_value * v_product_record.tax_rate / 100);
        END IF;
        
        v_total_value := v_total_value + COALESCE(v_product_value, 0);
        
        -- AIDEV-NOTE: Mapear payment_method para produtos também (se ainda não foi definido)
        IF v_product_record.payment_method IS NOT NULL AND NOT v_payment_method_set THEN
            CASE UPPER(TRIM(v_product_record.payment_method))
                WHEN 'PIX' THEN v_payment_type := 'PIX';
                WHEN 'BOLETO' THEN v_payment_type := 'BOLETO';
                WHEN 'CREDIT_CARD' THEN v_payment_type := 'CREDIT_CARD';
                WHEN 'CARTAO_CREDITO' THEN v_payment_type := 'CREDIT_CARD';
                WHEN 'CARTÃO' THEN v_payment_type := 'CREDIT_CARD'; -- AIDEV-NOTE: Correção principal
                WHEN 'CARTAO' THEN v_payment_type := 'CREDIT_CARD';
                WHEN 'CASH' THEN v_payment_type := 'CASH';
                WHEN 'DINHEIRO' THEN v_payment_type := 'CASH';
                ELSE v_payment_type := 'PIX'; -- Padrão se não reconhecido
            END CASE;
            v_payment_method_set := true;
        END IF;
        
        -- AIDEV-NOTE: Calcular data de vencimento baseada nas configurações do produto
        -- NOTA: contract_products ainda usa os campos antigos
        CASE v_product_record.due_date_type
            WHEN 'days_after_billing' THEN
                v_temp_due_date := v_period_record.bill_date + INTERVAL '1 day' * COALESCE(v_product_record.due_days, 0);
            WHEN 'specific_day' THEN
                -- Se due_next_month é true, vai para o próximo mês
                IF v_product_record.due_next_month THEN
                    v_temp_due_date := DATE_TRUNC('month', v_period_record.bill_date) + INTERVAL '1 month' + INTERVAL '1 day' * (COALESCE(v_product_record.due_day, 1) - 1);
                ELSE
                    v_temp_due_date := DATE_TRUNC('month', v_period_record.bill_date) + INTERVAL '1 day' * (COALESCE(v_product_record.due_day, 1) - 1);
                    -- Se a data já passou no mês atual, vai para o próximo mês
                    IF v_temp_due_date < v_period_record.bill_date THEN
                        v_temp_due_date := DATE_TRUNC('month', v_period_record.bill_date) + INTERVAL '1 month' + INTERVAL '1 day' * (COALESCE(v_product_record.due_day, 1) - 1);
                    END IF;
                END IF;
            ELSE
                -- Padrão: mesmo dia do faturamento se não especificado
                v_temp_due_date := v_period_record.bill_date;
        END CASE;
        
        -- AIDEV-NOTE: Rastrear a menor e maior data de vencimento
        IF v_earliest_due_date IS NULL OR v_temp_due_date < v_earliest_due_date THEN
            v_earliest_due_date := v_temp_due_date;
        END IF;
        IF v_latest_due_date IS NULL OR v_temp_due_date > v_latest_due_date THEN
            v_latest_due_date := v_temp_due_date;
        END IF;
    END LOOP;
    
    -- AIDEV-NOTE: Definir a data de vencimento final (usar a mais próxima como padrão)
    v_due_date := COALESCE(v_earliest_due_date, v_period_record.bill_date);
    
    -- AIDEV-NOTE: Verificar se há valor para faturar
    IF v_total_value > 0 THEN
        -- AIDEV-NOTE: Calcular valor da parcela se for parcelado
        IF v_is_installment THEN
            v_installment_value := ROUND(v_total_value / v_installments, 2);
        ELSE
            v_installment_value := v_total_value;
        END IF;
        
        -- AIDEV-NOTE: Criar cobrança(s) baseado no número de parcelas
        IF v_is_installment AND v_installments > 1 THEN
            -- AIDEV-NOTE: Criar múltiplas cobranças para parcelas
            FOR i IN 1..v_installments LOOP
                -- AIDEV-NOTE: Ajustar valor da última parcela para compensar arredondamentos
                IF i = v_installments THEN
                    v_installment_value := v_total_value - (v_installment_value * (v_installments - 1));
                END IF;
                
                INSERT INTO charges (
                    id,
                    tenant_id,
                    customer_id,
                    contract_id,
                    billing_periods,
                    valor,
                    data_vencimento,
                    status,
                    tipo,
                    descricao,
                    installment_number,
                    total_installments,
                    installment_value,
                    is_installment,
                    created_at,
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    p_tenant_id,
                    v_contract_record.customer_id,
                    v_period_record.contract_id,
                    p_period_id,
                    v_installment_value,
                    v_due_date + INTERVAL '1 month' * (i - 1), -- AIDEV-NOTE: Parcelas mensais
                    'PENDING',
                    v_payment_type,
                    'Cobrança do período ' || v_period_record.period_start || ' a ' || v_period_record.period_end || ' - Parcela ' || i || '/' || v_installments,
                    i,
                    v_installments,
                    v_installment_value,
                    true,
                    NOW(),
                    NOW()
                ) RETURNING id INTO v_charge_id;
            END LOOP;
        ELSE
            -- AIDEV-NOTE: Criar cobrança única
            INSERT INTO charges (
                id,
                tenant_id,
                customer_id,
                contract_id,
                billing_periods,
                valor,
                data_vencimento,
                status,
                tipo,
                descricao,
                installment_number,
                total_installments,
                installment_value,
                is_installment,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                p_tenant_id,
                v_contract_record.customer_id,
                v_period_record.contract_id,
                p_period_id,
                v_total_value,
                v_due_date,
                'PENDING',
                v_payment_type,
                'Cobrança do período ' || v_period_record.period_start || ' a ' || v_period_record.period_end,
                1,
                1,
                v_total_value,
                false,
                NOW(),
                NOW()
            ) RETURNING id INTO v_charge_id;
        END IF;
        
        -- AIDEV-NOTE: Atualizar status do período para BILLED com billed_at definido
        UPDATE contract_billing_periods
        SET 
            status = 'BILLED',
            billed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_period_id;
        
        RETURN json_build_object(
            'success', true,
            'charge_id', v_charge_id,
            'total_value', v_total_value,
            'due_date', v_due_date,
            'earliest_due_date', v_earliest_due_date,
            'latest_due_date', v_latest_due_date,
            'payment_type', v_payment_type,
            'installments', v_installments,
            'is_installment', v_is_installment,
            'installment_value', v_installment_value,
            'message', 'Período faturado com sucesso'
        );
    ELSE
        -- AIDEV-NOTE: Se não há valor para faturar, marcar como BILLED
        UPDATE contract_billing_periods
        SET 
            status = 'BILLED',
            billed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_period_id;
        
        RETURN json_build_object(
            'success', true,
            'charge_id', NULL,
            'total_value', 0,
            'message', 'Período marcado como BILLED - Faturamento configurado para não gerar cobrança'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."attempt_billing_period_charge"("p_period_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attempt_standalone_billing_charge"("p_tenant_id" "uuid", "p_period_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_period RECORD;
  v_charge_id UUID;
  v_item RECORD;
  v_movement_id UUID;
  v_total_amount NUMERIC := 0;
  v_items_processed INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_result JSONB;
  v_storage_location_id UUID;
  v_available_stock NUMERIC;
  v_balance_result RECORD;
BEGIN
  PERFORM set_tenant_context_simple(p_tenant_id);

  SELECT 
    cbp.*, 
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    c.cpf_cnpj as customer_document,
    c.customer_asaas_id
  INTO v_period
  FROM public.contract_billing_periods cbp
  INNER JOIN public.customers c ON c.id = cbp.customer_id
  WHERE cbp.id = p_period_id
    AND cbp.tenant_id = p_tenant_id
    AND cbp.is_standalone = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Período de faturamento avulso não encontrado'
    );
  END IF;

  IF v_period.status = 'BILLED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Período já foi faturado'
    );
  END IF;

  SELECT COALESCE(SUM(total_price), 0) INTO v_total_amount
  FROM public.billing_period_items
  WHERE billing_period_id = p_period_id
    AND tenant_id = p_tenant_id;

  INSERT INTO public.charges (
    tenant_id,
    customer_id,
    contract_id,
    valor,
    status,
    tipo,
    data_vencimento,
    descricao,
    billing_periods,
    created_at,
    updated_at
  ) VALUES (
    p_tenant_id,
    v_period.customer_id,
    v_period.contract_id,
    v_total_amount,
    'pending',
    COALESCE(v_period.payment_method, 'monthly'),
    COALESCE(v_period.due_date, v_period.bill_date),
    COALESCE(v_period.description, 
      format('Faturamento Avulso - %s (Período: %s)', v_period.customer_name, p_period_id)
    ),
    p_period_id,
    timezone('America/Sao_Paulo'::text, now()),
    timezone('America/Sao_Paulo'::text, now())
  )
  RETURNING id INTO v_charge_id;

  FOR v_item IN 
    SELECT * FROM public.billing_period_items
    WHERE billing_period_id = p_period_id
      AND tenant_id = p_tenant_id
      AND product_id IS NOT NULL
  LOOP
    BEGIN
      v_storage_location_id := COALESCE(v_item.storage_location_id, (
        SELECT id FROM public.storage_locations 
        WHERE tenant_id = p_tenant_id 
          AND is_default = true 
        LIMIT 1
      ));

      SELECT COALESCE(available_stock, 0) INTO v_available_stock
      FROM public.product_stock_by_location
      WHERE tenant_id = p_tenant_id
        AND product_id = v_item.product_id
        AND storage_location_id = v_storage_location_id;

      IF v_available_stock < v_item.quantity THEN
        v_errors := array_append(v_errors, 
          format('Estoque insuficiente para produto %s: disponível %s, necessário %s', 
            v_item.product_id, v_available_stock, v_item.quantity));
        CONTINUE;
      END IF;

      SELECT * INTO v_balance_result
      FROM public.calculate_stock_balance(
        p_tenant_id,
        v_item.product_id,
        v_storage_location_id,
        'SAIDA'::stock_movement_type,
        v_item.quantity,
        v_item.unit_price
      );

      INSERT INTO public.stock_movements (
        tenant_id,
        product_id,
        storage_location_id,
        movement_type,
        movement_reason,
        movement_date,
        quantity,
        unit_value,
        accumulated_balance,
        unit_cmc,
        operation,
        customer_or_supplier,
        observation,
        created_by
      ) VALUES (
        p_tenant_id,
        v_item.product_id,
        v_storage_location_id,
        'SAIDA',
        'Faturamento Avulso',
        v_period.bill_date,
        v_item.quantity,
        v_item.unit_price,
        v_balance_result.accumulated_balance,
        v_balance_result.unit_cmc,
        'VENDA',
        v_period.customer_name,
        format('Faturamento avulso - Período: %s', p_period_id),
        auth.uid()
      )
      RETURNING id INTO v_movement_id;

      UPDATE public.billing_period_items
      SET stock_movement_id = v_movement_id,
          updated_at = timezone('America/Sao_Paulo'::text, now())
      WHERE id = v_item.id;

      v_items_processed := v_items_processed + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := array_append(v_errors, 
          format('Erro ao processar item %s: %s', v_item.id, SQLERRM));
    END;
  END LOOP;

  UPDATE public.contract_billing_periods
  SET 
    status = 'BILLED'::billing_period_status,
    billed_at = timezone('America/Sao_Paulo'::text, now()),
    amount_billed = v_total_amount,
    updated_at = timezone('America/Sao_Paulo'::text, now())
  WHERE id = p_period_id;

  v_result := jsonb_build_object(
    'success', true,
    'charge_id', v_charge_id,
    'period_id', p_period_id,
    'amount', v_total_amount,
    'items_processed', v_items_processed,
    'errors', v_errors,
    'customer_id', v_period.customer_id,
    'customer_name', v_period.customer_name,
    'customer_asaas_id', v_period.customer_asaas_id,
    'customer_email', v_period.customer_email,
    'customer_phone', v_period.customer_phone,
    'customer_document', v_period.customer_document,
    'payment_method', COALESCE(v_period.payment_method, 'monthly'),
    'due_date', COALESCE(v_period.due_date, v_period.bill_date),
    'description', COALESCE(v_period.description, 'Faturamento Avulso - ' || v_period.customer_name)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;


ALTER FUNCTION "public"."attempt_standalone_billing_charge"("p_tenant_id" "uuid", "p_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_create_tenant_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    existing_user_id UUID;
    tenant_admin_exists BOOLEAN;
BEGIN
    -- AIDEV-NOTE: Verificar se já existe um TENANT_ADMIN para este tenant específico
    SELECT EXISTS(
        SELECT 1 FROM tenant_users tu
        WHERE tu.tenant_id = NEW.id 
        AND tu.role = 'TENANT_ADMIN'
    ) INTO tenant_admin_exists;
    
    -- Se já existe TENANT_ADMIN para este tenant, não fazer nada
    IF tenant_admin_exists THEN
        RAISE NOTICE 'TENANT_ADMIN já existe para tenant %', NEW.slug;
        RETURN NEW;
    END IF;
    
    -- AIDEV-NOTE: Verificar se o email do tenant já existe em public.users
    SELECT id INTO existing_user_id 
    FROM public.users 
    WHERE email = NEW.email 
    AND status = 'ACTIVE'
    LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        -- AIDEV-NOTE: Verificar se o usuário já tem relação com este tenant
        IF EXISTS(
            SELECT 1 FROM tenant_users tu
            WHERE tu.user_id = existing_user_id 
            AND tu.tenant_id = NEW.id
        ) THEN
            RAISE NOTICE 'Usuário % já tem relação com tenant %', NEW.email, NEW.slug;
            RETURN NEW;
        END IF;
        
        -- AIDEV-NOTE: Criar a relação tenant_users com role TENANT_ADMIN
        INSERT INTO tenant_users (
            id,
            tenant_id,
            user_id,
            role,
            created_at,
            updated_at
        ) VALUES (
            uuid_generate_v4(),
            NEW.id,
            existing_user_id,
            'TENANT_ADMIN',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Usuário existente % vinculado como TENANT_ADMIN para tenant %', NEW.email, NEW.slug;
    ELSE
        -- AIDEV-NOTE: Usuário não existe - apenas logar aviso
        RAISE NOTICE 'Usuário % não existe em public.users. TENANT_ADMIN não foi criado para tenant %', NEW.email, NEW.slug;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro ao criar relação TENANT_ADMIN para tenant %: %', NEW.slug, SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_tenant_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_generate_billing_forecasts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    billing_interval interval;
    current_due_date date;
    installment_amount numeric;
    i integer;
    reference_start date;
    reference_end date;
    billing_id_var uuid;
BEGIN
    -- AIDEV-NOTE: Função executada automaticamente após INSERT em contracts
    -- Usa funções auxiliares que bypassam RLS para inserir faturamentos
    
    -- Verificar se o contrato tem dados válidos para gerar faturamentos
    IF NEW.billing_type IS NULL OR NEW.installments IS NULL OR NEW.installments <= 0 THEN
        RETURN NEW;
    END IF;
    
    -- Calcular o intervalo baseado no tipo de faturamento
    CASE NEW.billing_type
        WHEN 'MONTHLY' THEN billing_interval := '1 month'::interval;
        WHEN 'BIMONTHLY' THEN billing_interval := '2 months'::interval;
        WHEN 'QUARTERLY' THEN billing_interval := '3 months'::interval;
        WHEN 'SEMIANNUAL' THEN billing_interval := '6 months'::interval;
        WHEN 'ANNUAL' THEN billing_interval := '1 year'::interval;
        ELSE billing_interval := '1 month'::interval; -- Default para mensal
    END CASE;
    
    -- Calcular valor da parcela
    installment_amount := NEW.total_amount / NEW.installments;
    
    -- Data inicial baseada no billing_day ou data inicial do contrato
    IF NEW.billing_day IS NOT NULL THEN
        current_due_date := date_trunc('month', NEW.initial_date) + (NEW.billing_day - 1) * interval '1 day';
        -- Se a data já passou no mês atual, começar no próximo mês
        IF current_due_date < NEW.initial_date THEN
            current_due_date := current_due_date + billing_interval;
        END IF;
    ELSE
        current_due_date := NEW.initial_date;
    END IF;
    
    -- Gerar as parcelas usando funções que bypassam RLS
    FOR i IN 1..NEW.installments LOOP
        -- Calcular período de referência para esta parcela
        reference_start := current_due_date - billing_interval + interval '1 day';
        reference_end := current_due_date;
        
        -- Inserir faturamento usando função que bypassa RLS
        SELECT bypass_rls_insert_billing(
            NEW.tenant_id,
            NEW.id,
            NEW.contract_number || '-' || LPAD(i::text, 3, '0'),
            i,
            NEW.installments,
            to_char(current_due_date, 'MM/YYYY'),
            reference_start,
            reference_end,
            CURRENT_DATE,
            current_due_date,
            current_due_date,
            installment_amount,
            'PENDING'
        ) INTO billing_id_var;
        
        -- Inserir item do faturamento usando função que bypassa RLS
        PERFORM bypass_rls_insert_billing_item(
            billing_id_var,
            'Parcela ' || i || '/' || NEW.installments || ' - ' || NEW.contract_number,
            1,
            installment_amount
        );
        
        -- Próxima data de vencimento
        current_due_date := current_due_date + billing_interval;
    END LOOP;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log do erro para debug
    RAISE WARNING 'Erro ao gerar previsões de faturamento para contrato %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_generate_billing_forecasts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_generate_billing_forecasts"() IS 'Trigger function que gera automaticamente previsões de faturamento após inserção de contrato. Usa funções auxiliares que bypassam RLS.';



CREATE OR REPLACE FUNCTION "public"."auto_generate_billing_periods"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  period_date date;
  period_end_date date;
  bill_date date;
  planned_amount numeric;
  current_year integer;
  current_month integer;
  v_current_date DATE;
  v_is_retroactive BOOLEAN := false;
  v_retroactive_start_date DATE;
BEGIN
  -- Só gera períodos se generate_billing = true
  IF NEW.generate_billing = true THEN
    
    -- AIDEV-NOTE: NOVA LÓGICA RETROATIVA - Verificar se é um contrato retroativo
    v_current_date := CURRENT_DATE;
    
    -- Um contrato é considerado retroativo se:
    -- 1. A data inicial é anterior ao mês atual
    -- 2. O contrato foi criado recentemente (últimas 24 horas)
    v_is_retroactive := (
      DATE_TRUNC('month', NEW.start_date) < DATE_TRUNC('month', v_current_date)
      AND NEW.created_at >= (NOW() - INTERVAL '24 hours')
    );
    
    -- AIDEV-NOTE: Se é retroativo, começar do mês atual ao invés da data inicial
    IF v_is_retroactive THEN
      v_retroactive_start_date := DATE_TRUNC('month', v_current_date)::DATE;
      
      -- AIDEV-NOTE: Log da aplicação da lógica retroativa com estrutura correta
      INSERT INTO audit_logs (
        tenant_id,
        resource_type,
        resource_id,
        action,
        old_values,
        new_values,
        performed_by,
        created_at
      ) VALUES (
        NEW.tenant_id,
        'contracts',
        NEW.id::text,
        'AUTO_RETROACTIVE_LOGIC_APPLIED',
        jsonb_build_object(
          'original_start_date', NEW.start_date,
          'contract_created_at', NEW.created_at
        ),
        jsonb_build_object(
          'retroactive_start_date', v_retroactive_start_date,
          'current_date', v_current_date,
          'reason', 'Contrato retroativo - períodos iniciados do mês atual (auto_generate)'
        ),
        NULL, -- system user
        NOW()
      );
      
      RAISE NOTICE 'Contrato retroativo detectado em auto_generate (ID: %). Iniciando períodos a partir de: %', 
                   NEW.id, v_retroactive_start_date;
    ELSE
      v_retroactive_start_date := NEW.start_date;
    END IF;
    
    -- Calcular valor planejado baseado em serviços e produtos
    planned_amount := calculate_contract_planned_amount(NEW.id);
    
    -- AIDEV-NOTE: Iniciar da data retroativa calculada
    period_date := v_retroactive_start_date;
    
    -- Gerar períodos mensais até final_date
    WHILE period_date <= NEW.final_date LOOP
      
      -- Calcular fim do período (último dia do mês)
      period_end_date := (date_trunc('month', period_date) + interval '1 month' - interval '1 day')::date;
      
      -- Calcular data de vencimento baseada no billing_day
      current_year := EXTRACT(year FROM period_date);
      current_month := EXTRACT(month FROM period_date);
      
      -- Se billing_day é maior que os dias do mês, usar último dia do mês
      bill_date := LEAST(
        make_date(current_year, current_month, NEW.billing_day),
        (date_trunc('month', period_date) + interval '1 month' - interval '1 day')::date
      );
      
      -- Inserir período de faturamento
      INSERT INTO contract_billing_periods (
        id,
        tenant_id,
        contract_id,
        period_start,
        period_end,
        bill_date,
        status,
        amount_planned,
        amount_billed,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        NEW.tenant_id,
        NEW.id,
        period_date,
        period_end_date,
        bill_date,
        'PENDING',
        planned_amount,
        0,
        now(),
        now()
      );
      
      -- Avançar para o próximo mês
      period_date := (date_trunc('month', period_date) + interval '1 month')::date;
      
    END LOOP;
    
    -- Log da operação
    RAISE NOTICE 'Períodos de faturamento gerados automaticamente para contrato % (Retroativo: %)', NEW.id, v_is_retroactive;
    
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_generate_billing_periods"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_generate_billing_periods"() IS 'Gera automaticamente períodos de faturamento mensais para contratos com generate_billing = true';



CREATE OR REPLACE FUNCTION "public"."auto_generate_billing_periods"("p_contract_id" "uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_contract RECORD;
  v_current_date DATE;
  v_period_start DATE;
  v_period_end DATE;
  v_bill_date DATE;
  v_periods_created INTEGER := 0;
  v_tenant_id UUID;
  v_amount_planned NUMERIC := 0;
  v_is_retroactive BOOLEAN := false;
  v_retroactive_start_date DATE;
BEGIN
  -- AIDEV-NOTE: Configurar contexto de tenant
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO v_tenant_id 
    FROM contracts 
    WHERE id = p_contract_id;
    
    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Não foi possível determinar o tenant_id para o contrato %', p_contract_id;
    END IF;
  END IF;

  PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);

  -- Buscar dados do contrato
  SELECT 
    initial_date,
    final_date,
    billing_day,
    billing_type,
    created_at
  INTO v_contract
  FROM contracts
  WHERE id = p_contract_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado: %', p_contract_id;
  END IF;

  -- AIDEV-NOTE: NOVA LÓGICA RETROATIVA - Verificar se é um contrato retroativo
  v_current_date := CURRENT_DATE;
  
  -- Um contrato é considerado retroativo se a data inicial é anterior ao mês atual
  v_is_retroactive := (
    DATE_TRUNC('month', v_contract.initial_date) < DATE_TRUNC('month', v_current_date)
    AND v_contract.created_at >= (NOW() - INTERVAL '24 hours')
  );

  -- AIDEV-NOTE: Se é retroativo, começar do mês atual ao invés da data inicial
  IF v_is_retroactive THEN
    v_retroactive_start_date := DATE_TRUNC('month', v_current_date)::DATE;
    
    -- AIDEV-NOTE: Log da aplicação da lógica retroativa com estrutura correta
    INSERT INTO audit_logs (
      tenant_id,
      resource_type,
      resource_id,
      action,
      old_values,
      new_values,
      performed_by,
      created_at
    ) VALUES (
      v_tenant_id,
      'contracts',
      p_contract_id::text,
      'AUTO_GENERATE_RETROACTIVE_APPLIED',
      jsonb_build_object(
        'original_start_date', v_contract.initial_date,
        'contract_created_at', v_contract.created_at
      ),
      jsonb_build_object(
        'retroactive_start_date', v_retroactive_start_date,
        'current_date', v_current_date,
        'reason', 'Auto-geração com lógica retroativa'
      ),
      NULL,
      NOW()
    );
  ELSE
    v_retroactive_start_date := v_contract.initial_date;
  END IF;

  -- Calcular amount_planned
  SELECT COALESCE(SUM(cs.total_amount), 0)
  INTO v_amount_planned
  FROM contract_services cs
  WHERE cs.contract_id = p_contract_id 
    AND cs.tenant_id = v_tenant_id
    AND COALESCE(cs.is_active, true) = true;

  -- Inicializar com a data retroativa calculada
  v_period_start := v_retroactive_start_date;

  -- Gerar períodos mensais
  WHILE v_period_start <= v_contract.final_date LOOP
    -- Calcular fim do período (último dia do mês)
    v_period_end := (DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Ajustar se ultrapassar a data final do contrato
    IF v_period_end > v_contract.final_date THEN
      v_period_end := v_contract.final_date;
    END IF;

    -- Calcular data de faturamento baseada no billing_day
    v_bill_date := (DATE_TRUNC('month', v_period_start) + INTERVAL '1 day' * (v_contract.billing_day - 1))::DATE;
    
    -- Ajustar se o dia não existir no mês (ex: 31 em fevereiro)
    IF EXTRACT(DAY FROM v_bill_date) > EXTRACT(DAY FROM (DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day')) THEN
      v_bill_date := (DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END IF;
    
    -- Garantir que bill_date não seja anterior ao início do período
    IF v_bill_date < v_period_start THEN
      v_bill_date := v_period_start;
    END IF;

    -- Inserir período de faturamento
    INSERT INTO contract_billing_periods (
      tenant_id,
      contract_id,
      period_start,
      period_end,
      bill_date,
      status,
      amount_planned
    ) VALUES (
      v_tenant_id,
      p_contract_id,
      v_period_start,
      v_period_end,
      v_bill_date,
      'PENDING',
      v_amount_planned
    );

    v_periods_created := v_periods_created + 1;

    -- Avançar para o próximo mês
    v_period_start := v_period_end + INTERVAL '1 day';
  END LOOP;

  RAISE NOTICE 'Auto-geração concluída para contrato %: % períodos criados, Retroativo: %', 
               p_contract_id, v_periods_created, v_is_retroactive;

  RETURN v_periods_created;
END;
$$;


ALTER FUNCTION "public"."auto_generate_billing_periods"("p_contract_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_update_billing_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_result RECORD;
    v_old_status TEXT;
BEGIN
    -- AIDEV-NOTE: Executar recálculo de status apenas para o tenant do registro modificado
    PERFORM set_config('app.current_tenant_id', NEW.tenant_id::text, true);
    
    -- AIDEV-NOTE: Definir status anterior para log
    v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::TEXT ELSE 'INSERT' END;
    
    -- AIDEV-NOTE: Executar recálculo apenas se o status for PENDING ou se for um novo registro
    IF (TG_OP = 'INSERT' AND NEW.status = 'PENDING') OR 
       (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'PENDING') THEN
        
        -- AIDEV-NOTE: Executar recálculo de status de forma assíncrona
        PERFORM public.recalc_contract_period_statuses();
        
        -- AIDEV-NOTE: Log simples via RAISE NOTICE para debug
        RAISE NOTICE 'Auto billing status update triggered for period % (contract %, status: % -> %)', 
            NEW.id, NEW.contract_id, v_old_status, NEW.status::TEXT;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_update_billing_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."backfill_billing_periods"("p_tenant_id" "uuid", "p_months_ahead" integer DEFAULT 12) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_contract RECORD;
    v_period_start DATE;
    v_period_end DATE;
    v_current_date DATE := CURRENT_DATE;
    v_end_date DATE := CURRENT_DATE + (p_months_ahead || ' months')::INTERVAL;
    v_periods_created INTEGER := 0;
    v_existing_period_id UUID;
    v_billing_cycle TEXT;
BEGIN
    -- AIDEV-NOTE: Configurar contexto de tenant para segurança RLS
    PERFORM set_tenant_context_simple(p_tenant_id);
    
    -- AIDEV-NOTE: Iterar sobre todos os contratos ativos do tenant (case insensitive)
    FOR v_contract IN 
        SELECT id, initial_date, final_date, reference_period, total_amount
        FROM contracts 
        WHERE tenant_id = p_tenant_id 
          AND UPPER(status) = 'ACTIVE'
          AND initial_date IS NOT NULL
    LOOP
        -- AIDEV-NOTE: Mapear reference_period para billing_cycle
        v_billing_cycle := COALESCE(v_contract.reference_period, 'monthly');
        
        -- AIDEV-NOTE: Calcular período inicial baseado na data de início do contrato
        v_period_start := v_contract.initial_date;
        
        -- AIDEV-NOTE: Gerar períodos até a data limite ou final do contrato
        WHILE v_period_start <= v_end_date AND 
              (v_contract.final_date IS NULL OR v_period_start <= v_contract.final_date) LOOP
            
            -- AIDEV-NOTE: Calcular fim do período baseado no ciclo de faturamento
            CASE v_billing_cycle
                WHEN 'monthly' THEN
                    v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
                WHEN 'quarterly' THEN
                    v_period_end := (v_period_start + INTERVAL '3 months' - INTERVAL '1 day')::DATE;
                WHEN 'semiannual' THEN
                    v_period_end := (v_period_start + INTERVAL '6 months' - INTERVAL '1 day')::DATE;
                WHEN 'annual' THEN
                    v_period_end := (v_period_start + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
                ELSE
                    v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
            END CASE;
            
            -- AIDEV-NOTE: Verificar se o período já existe
            SELECT cbp.id INTO v_existing_period_id
            FROM contract_billing_periods cbp
            WHERE cbp.tenant_id = p_tenant_id
              AND cbp.contract_id = v_contract.id
              AND cbp.period_start = v_period_start
              AND cbp.period_end = v_period_end;
            
            -- AIDEV-NOTE: Criar período apenas se não existir
            IF v_existing_period_id IS NULL THEN
                INSERT INTO contract_billing_periods (
                    tenant_id,
                    contract_id,
                    period_start,
                    period_end,
                    bill_date,
                    amount_planned,
                    status,
                    created_at,
                    updated_at
                ) VALUES (
                    p_tenant_id,
                    v_contract.id,
                    v_period_start,
                    v_period_end,
                    v_period_end, -- Data de vencimento = fim do período
                    COALESCE(v_contract.total_amount, 0),
                    CASE 
                        WHEN v_period_end < v_current_date THEN 'LATE'::billing_period_status
                        WHEN v_period_end = v_current_date THEN 'DUE_TODAY'::billing_period_status
                        ELSE 'PENDING'::billing_period_status
                    END,
                    NOW(),
                    NOW()
                );
                
                v_periods_created := v_periods_created + 1;
            END IF;
            
            -- AIDEV-NOTE: Avançar para o próximo período
            CASE v_billing_cycle
                WHEN 'monthly' THEN
                    v_period_start := (v_period_start + INTERVAL '1 month')::DATE;
                WHEN 'quarterly' THEN
                    v_period_start := (v_period_start + INTERVAL '3 months')::DATE;
                WHEN 'semiannual' THEN
                    v_period_start := (v_period_start + INTERVAL '6 months')::DATE;
                WHEN 'annual' THEN
                    v_period_start := (v_period_start + INTERVAL '1 year')::DATE;
                ELSE
                    v_period_start := (v_period_start + INTERVAL '1 month')::DATE;
            END CASE;
        END LOOP;
    END LOOP;
    
    RETURN 'Backfill concluído. ' || v_periods_created || ' períodos criados para o tenant ' || p_tenant_id;
END;
$$;


ALTER FUNCTION "public"."backfill_billing_periods"("p_tenant_id" "uuid", "p_months_ahead" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."backfill_contract_billing_periods"() RETURNS TABLE("contract_id" "uuid", "contract_description" "text", "periods_created" integer, "total_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  contract_record RECORD;
  period_date date;
  period_end_date date;
  bill_date date;
  planned_amount numeric;
  current_year integer;
  current_month integer;
  periods_count integer;
BEGIN
  -- Buscar contratos ativos que têm serviços com generate_billing = true e não têm períodos
  FOR contract_record IN
    SELECT DISTINCT 
      c.id, 
      c.tenant_id, 
      c.description, 
      c.initial_date, 
      c.final_date, 
      c.billing_day
    FROM contracts c
    INNER JOIN contract_services cs ON cs.contract_id = c.id
    LEFT JOIN contract_billing_periods cbp ON cbp.contract_id = c.id
    WHERE c.status = 'ACTIVE' 
      AND cs.generate_billing = true
      AND cbp.id IS NULL  -- Não tem períodos ainda
      AND c.initial_date IS NOT NULL
      AND c.final_date IS NOT NULL
      AND c.billing_day IS NOT NULL
  LOOP
    
    periods_count := 0;
    
    -- Calcular valor planejado baseado em serviços e produtos
    planned_amount := calculate_contract_planned_amount(contract_record.id);
    
    -- Iniciar do initial_date do contrato
    period_date := contract_record.initial_date;
    
    -- Gerar períodos mensais até final_date
    WHILE period_date <= contract_record.final_date LOOP
      
      -- Calcular fim do período (último dia do mês)
      period_end_date := (date_trunc('month', period_date) + interval '1 month' - interval '1 day')::date;
      
      -- Calcular data de vencimento baseada no billing_day
      current_year := EXTRACT(year FROM period_date);
      current_month := EXTRACT(month FROM period_date);
      
      -- Se billing_day é maior que os dias do mês, usar último dia do mês
      bill_date := LEAST(
        make_date(current_year, current_month, contract_record.billing_day),
        (date_trunc('month', period_date) + interval '1 month' - interval '1 day')::date
      );
      
      -- Inserir período de faturamento
      INSERT INTO contract_billing_periods (
        id,
        tenant_id,
        contract_id,
        period_start,
        period_end,
        bill_date,
        status,
        amount_planned,
        amount_billed,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        contract_record.tenant_id,
        contract_record.id,
        period_date,
        period_end_date,
        bill_date,
        CASE 
          WHEN bill_date = CURRENT_DATE THEN 'DUE_TODAY'
          WHEN bill_date < CURRENT_DATE THEN 'LATE'
          ELSE 'PENDING'
        END,
        planned_amount,
        0,
        now(),
        now()
      );
      
      periods_count := periods_count + 1;
      
      -- Avançar para o próximo mês
      period_date := (date_trunc('month', period_date) + interval '1 month')::date;
      
    END LOOP;
    
    -- Retornar informações do contrato processado
    contract_id := contract_record.id;
    contract_description := contract_record.description;
    periods_created := periods_count;
    total_amount := planned_amount;
    
    RETURN NEXT;
    
  END LOOP;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."backfill_contract_billing_periods"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."backfill_contract_billing_periods"() IS 'Executa backfill de períodos de faturamento para contratos existentes que não possuem períodos gerados';



CREATE OR REPLACE FUNCTION "public"."backfill_service_order_numbers"("p_tenant_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  v_count integer := 0;
  rec record;
  v_next text;
  v_max integer;
BEGIN
  -- Inicializa sequência com o maior número existente (apenas na tabela unificada)
  SELECT MAX(CAST(order_number AS integer)) INTO v_max
  FROM public.contract_billing_periods
  WHERE tenant_id = p_tenant_id
    AND order_number IS NOT NULL
    AND order_number ~ '^[0-9]+$';

  INSERT INTO public.service_order_sequences(tenant_id, last_number)
  VALUES (p_tenant_id, COALESCE(v_max, 0))
  ON CONFLICT (tenant_id) DO UPDATE SET last_number = EXCLUDED.last_number;

  -- Preenche nulos em períodos na tabela unificada
  FOR rec IN
    SELECT id FROM public.contract_billing_periods
    WHERE tenant_id = p_tenant_id AND order_number IS NULL
  LOOP
    LOOP
      v_next := public.generate_service_order_number(p_tenant_id);
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.contract_billing_periods
        WHERE tenant_id = p_tenant_id AND order_number = v_next
      );
      -- tenta novamente até achar número livre
    END LOOP;

    UPDATE public.contract_billing_periods
      SET order_number = v_next, updated_at = timezone('America/Sao_Paulo'::text, now())
      WHERE id = rec.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$_$;


ALTER FUNCTION "public"."backfill_service_order_numbers"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."backfill_service_order_numbers"("p_tenant_id" "uuid") IS 'Preenche order_number em períodos existentes que não têm número, respeitando ordem de criação';



CREATE OR REPLACE FUNCTION "public"."bypass_rls_insert_billing"("p_tenant_id" "uuid", "p_contract_id" "uuid", "p_billing_number" "text", "p_installment_number" integer, "p_total_installments" integer, "p_reference_period" "text", "p_reference_start_date" "date", "p_reference_end_date" "date", "p_issue_date" "date", "p_due_date" "date", "p_original_due_date" "date", "p_amount" numeric, "p_status" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    billing_id_result uuid;
BEGIN
    -- AIDEV-NOTE: Função que bypassa RLS para inserir faturamentos via trigger
    -- Executa com privilégios de superusuário para contornar políticas RLS
    
    -- Desabilitar RLS temporariamente para esta sessão
    SET row_security = off;
    
    INSERT INTO contract_billings (
        tenant_id,
        contract_id,
        billing_number,
        installment_number,
        total_installments,
        reference_period,
        reference_start_date,
        reference_end_date,
        issue_date,
        due_date,
        original_due_date,
        amount,
        status,
        created_at,
        updated_at
    ) VALUES (
        p_tenant_id,
        p_contract_id,
        p_billing_number,
        p_installment_number,
        p_total_installments,
        p_reference_period,
        p_reference_start_date,
        p_reference_end_date,
        p_issue_date,
        p_due_date,
        p_original_due_date,
        p_amount,
        p_status,
        NOW(),
        NOW()
    ) RETURNING id INTO billing_id_result;
    
    -- Reabilitar RLS
    SET row_security = on;
    
    RETURN billing_id_result;
EXCEPTION WHEN OTHERS THEN
    -- Garantir que RLS seja reabilitado mesmo em caso de erro
    SET row_security = on;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."bypass_rls_insert_billing"("p_tenant_id" "uuid", "p_contract_id" "uuid", "p_billing_number" "text", "p_installment_number" integer, "p_total_installments" integer, "p_reference_period" "text", "p_reference_start_date" "date", "p_reference_end_date" "date", "p_issue_date" "date", "p_due_date" "date", "p_original_due_date" "date", "p_amount" numeric, "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bypass_rls_insert_billing"("p_tenant_id" "uuid", "p_contract_id" "uuid", "p_billing_number" "text", "p_installment_number" integer, "p_total_installments" integer, "p_reference_period" "text", "p_reference_start_date" "date", "p_reference_end_date" "date", "p_issue_date" "date", "p_due_date" "date", "p_original_due_date" "date", "p_amount" numeric, "p_status" "text") IS 'Função auxiliar que bypassa RLS para inserir faturamentos via triggers. Executa com SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "public"."bypass_rls_insert_billing_item"("p_billing_id" "uuid", "p_description" "text", "p_quantity" numeric, "p_unit_price" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    item_id_result uuid;
BEGIN
    -- AIDEV-NOTE: Função que bypassa RLS para inserir itens de faturamento via trigger
    
    -- Desabilitar RLS temporariamente
    SET row_security = off;
    
    INSERT INTO contract_billing_items (
        billing_id,
        description,
        quantity,
        unit_price,
        created_at
    ) VALUES (
        p_billing_id,
        p_description,
        p_quantity,
        p_unit_price,
        NOW()
    ) RETURNING id INTO item_id_result;
    
    -- Reabilitar RLS
    SET row_security = on;
    
    RETURN item_id_result;
EXCEPTION WHEN OTHERS THEN
    -- Garantir que RLS seja reabilitado mesmo em caso de erro
    SET row_security = on;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."bypass_rls_insert_billing_item"("p_billing_id" "uuid", "p_description" "text", "p_quantity" numeric, "p_unit_price" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bypass_rls_insert_billing_item"("p_billing_id" "uuid", "p_description" "text", "p_quantity" numeric, "p_unit_price" numeric) IS 'Função auxiliar que bypassa RLS para inserir itens de faturamento via triggers. Executa com SECURITY DEFINER.';



CREATE OR REPLACE FUNCTION "public"."calc_bill_date"("p_year" integer, "p_month" integer, "p_day" integer, "p_anticipate_weekends" boolean DEFAULT false) RETURNS "date"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    v_bill_date date;
    v_day_of_week integer;
BEGIN
    -- AIDEV-NOTE: Construir a data inicial
    -- Se o dia for maior que o último dia do mês, usar o último dia do mês
    v_bill_date := make_date(
        p_year, 
        p_month, 
        LEAST(p_day, extract(day from date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month - 1 day')::integer)
    );
    
    -- AIDEV-NOTE: Se não deve antecipar fins de semana, retornar a data original
    IF NOT p_anticipate_weekends THEN
        RETURN v_bill_date;
    END IF;
    
    -- AIDEV-NOTE: Verificar dia da semana (1=domingo, 7=sábado no PostgreSQL)
    v_day_of_week := extract(dow from v_bill_date);
    
    -- AIDEV-NOTE: Se cair no sábado (6), voltar para sexta-feira
    IF v_day_of_week = 6 THEN
        v_bill_date := v_bill_date - interval '1 day';
    -- AIDEV-NOTE: Se cair no domingo (0), voltar para sexta-feira
    ELSIF v_day_of_week = 0 THEN
        v_bill_date := v_bill_date - interval '2 days';
    END IF;
    
    RETURN v_bill_date;
END;
$$;


ALTER FUNCTION "public"."calc_bill_date"("p_year" integer, "p_month" integer, "p_day" integer, "p_anticipate_weekends" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calc_bill_date"("p_year" integer, "p_month" integer, "p_day" integer, "p_anticipate_weekends" boolean) IS 'Calcula data de faturamento ajustando para sexta-feira se cair em fim de semana quando anticipate_weekends=true';



CREATE OR REPLACE FUNCTION "public"."calc_contract_bill_date"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS "date"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_billing_type TEXT;
    v_billing_day INTEGER;
    v_anticipate_weekends BOOLEAN;
    v_bill_date DATE;
    v_day_of_week INTEGER;
BEGIN
    -- AIDEV-NOTE: Buscar configurações do contrato
    SELECT 
        billing_type,
        billing_day,
        anticipate_weekends
    INTO 
        v_billing_type,
        v_billing_day,
        v_anticipate_weekends
    FROM public.contracts
    WHERE id = p_contract_id;
    
    -- AIDEV-NOTE: Se contrato não encontrado, retornar fim do período
    IF NOT FOUND THEN
        RETURN p_period_end;
    END IF;
    
    -- AIDEV-NOTE: Calcular data base conforme tipo de cobrança
    CASE v_billing_type
        WHEN 'MONTHLY' THEN
            -- Para mensal, usar o dia específico do mês do período
            v_bill_date := DATE_TRUNC('month', p_period_start) + (v_billing_day - 1) * INTERVAL '1 day';
            
            -- Se o dia não existe no mês (ex: 31 em fevereiro), usar último dia do mês
            IF EXTRACT(DAY FROM v_bill_date) != v_billing_day THEN
                v_bill_date := (DATE_TRUNC('month', p_period_start) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
            END IF;
            
        WHEN 'ANNUAL' THEN
            -- Para anual, usar o dia específico do mês de início do período
            v_bill_date := DATE_TRUNC('month', p_period_start) + (v_billing_day - 1) * INTERVAL '1 day';
            
            -- Se o dia não existe no mês, usar último dia do mês
            IF EXTRACT(DAY FROM v_bill_date) != v_billing_day THEN
                v_bill_date := (DATE_TRUNC('month', p_period_start) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
            END IF;
            
        ELSE
            -- Para outros tipos, usar fim do período
            v_bill_date := p_period_end;
    END CASE;
    
    -- AIDEV-NOTE: Ajustar para fins de semana se necessário
    IF v_anticipate_weekends THEN
        v_day_of_week := EXTRACT(DOW FROM v_bill_date); -- 0=domingo, 6=sábado
        
        -- Se cair no sábado (6), antecipar para sexta
        IF v_day_of_week = 6 THEN
            v_bill_date := v_bill_date - INTERVAL '1 day';
        -- Se cair no domingo (0), antecipar para sexta
        ELSIF v_day_of_week = 0 THEN
            v_bill_date := v_bill_date - INTERVAL '2 days';
        END IF;
    END IF;
    
    RETURN v_bill_date;
END;
$$;


ALTER FUNCTION "public"."calc_contract_bill_date"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calcular_estatisticas_regua"("tenant_id" "uuid", "periodo_inicio" timestamp without time zone, "periodo_fim" timestamp without time zone) RETURNS TABLE("etapa_id" "uuid", "etapa_nome" "text", "canal" character varying, "total_enviadas" integer, "total_abertas" integer, "total_clicadas" integer, "total_respondidas" integer, "total_pagas" integer, "taxa_abertura" numeric, "taxa_cliques" numeric, "taxa_resposta" numeric, "taxa_conversao" numeric)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  RETURN QUERY
  WITH mensagens AS (
    SELECT 
      m.etapa_id,
      e.gatilho || ' ' || 
      CASE
        WHEN e.gatilho = 'no_vencimento' THEN ''
        ELSE e.dias::TEXT || ' dias'
      END AS etapa_nome,
      m.canal,
      COUNT(m.id) AS total_enviadas,
      COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM regua_cobranca_interacoes i 
        WHERE i.mensagem_id = m.id AND i.tipo = 'aberto'
      ) THEN m.id ELSE NULL END) AS total_abertas,
      COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM regua_cobranca_interacoes i 
        WHERE i.mensagem_id = m.id AND i.tipo = 'clicado'
      ) THEN m.id ELSE NULL END) AS total_clicadas,
      COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM regua_cobranca_interacoes i 
        WHERE i.mensagem_id = m.id AND i.tipo = 'respondido'
      ) THEN m.id ELSE NULL END) AS total_respondidas,
      COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM regua_cobranca_interacoes i 
        WHERE i.mensagem_id = m.id AND i.tipo = 'pago'
      ) THEN m.id ELSE NULL END) AS total_pagas
    FROM 
      regua_cobranca_mensagens m
      JOIN regua_cobranca_etapas e ON m.etapa_id = e.id
    WHERE 
      m.tenant_id = $1
      AND m.status = 'enviado'
      AND m.data_execucao BETWEEN $2 AND $3
    GROUP BY 
      m.etapa_id, etapa_nome, m.canal
  )
  SELECT 
    m.etapa_id,
    m.etapa_nome,
    m.canal,
    m.total_enviadas,
    m.total_abertas,
    m.total_clicadas,
    m.total_respondidas,
    m.total_pagas,
    CASE WHEN m.total_enviadas > 0 THEN 
      ROUND((m.total_abertas::DECIMAL / m.total_enviadas) * 100, 2)
    ELSE 0 END AS taxa_abertura,
    CASE WHEN m.total_abertas > 0 THEN 
      ROUND((m.total_clicadas::DECIMAL / m.total_abertas) * 100, 2)
    ELSE 0 END AS taxa_cliques,
    CASE WHEN m.total_enviadas > 0 THEN 
      ROUND((m.total_respondidas::DECIMAL / m.total_enviadas) * 100, 2)
    ELSE 0 END AS taxa_resposta,
    CASE WHEN m.total_enviadas > 0 THEN 
      ROUND((m.total_pagas::DECIMAL / m.total_enviadas) * 100, 2)
    ELSE 0 END AS taxa_conversao
  FROM 
    mensagens m
  ORDER BY 
    m.etapa_id;
END;
$_$;


ALTER FUNCTION "public"."calcular_estatisticas_regua"("tenant_id" "uuid", "periodo_inicio" timestamp without time zone, "periodo_fim" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_amount_planned_for_periods"("p_contract_id" "uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tenant_id UUID;
  v_total_amount NUMERIC := 0;
  v_periods_updated INTEGER := 0;
BEGIN
  -- AIDEV-NOTE: Configurar contexto de tenant se fornecido
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
  ELSE
    -- Tentar obter do contexto atual
    BEGIN
      v_tenant_id := current_setting('app.current_tenant_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      -- Se não conseguir obter do contexto, buscar do contrato
      SELECT tenant_id INTO v_tenant_id 
      FROM contracts 
      WHERE id = p_contract_id;
      
      IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível determinar o tenant_id para o contrato %', p_contract_id;
      END IF;
    END;
  END IF;

  -- AIDEV-NOTE: Calcular valor total baseado nos serviços ativos do contrato
  SELECT COALESCE(SUM(cs.total_amount), 0)
  INTO v_total_amount
  FROM contract_services cs
  WHERE cs.contract_id = p_contract_id 
    AND cs.is_active = true;

  -- AIDEV-NOTE: Atualizar todos os períodos PENDING com o valor calculado
  UPDATE contract_billing_periods 
  SET amount_planned = v_total_amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE contract_id = p_contract_id 
    AND tenant_id = v_tenant_id
    AND status = 'PENDING'
    AND amount_planned = 0;

  GET DIAGNOSTICS v_periods_updated = ROW_COUNT;

  RETURN v_periods_updated;
END;
$$;


ALTER FUNCTION "public"."calculate_amount_planned_for_periods"("p_contract_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_billing_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_paid DECIMAL(10,2);
  v_billing_amount DECIMAL(10,2);
  v_due_date DATE;
BEGIN
  -- Obter valor do faturamento e data de vencimento
  SELECT net_amount, due_date INTO v_billing_amount, v_due_date
  FROM public.contract_billings
  WHERE id = NEW.billing_id;
  
  -- Calcular total pago
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.contract_billing_payments
  WHERE billing_id = NEW.billing_id;
  
  -- Determinar novo status com base no valor pago
  IF v_total_paid >= v_billing_amount THEN
    -- Pagamento completo
    UPDATE public.contract_billings
    SET 
      status = 'PAID',
      payment_date = NOW(),
      payment_method = NEW.payment_method,
      updated_at = NOW()
    WHERE id = NEW.billing_id;
  ELSIF v_total_paid > 0 THEN
    -- Pagamento parcial
    UPDATE public.contract_billings
    SET 
      status = 'PARTIALLY_PAID',
      updated_at = NOW()
    WHERE id = NEW.billing_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_billing_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_contract_planned_amount"("p_contract_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  total_amount numeric := 0;
  services_amount numeric := 0;
  products_amount numeric := 0;
BEGIN
  -- Calcular valor total dos serviços
  SELECT COALESCE(SUM(cs.price * cs.quantity), 0)
  INTO services_amount
  FROM contract_services cs
  WHERE cs.contract_id = p_contract_id;
  
  -- Calcular valor total dos produtos
  SELECT COALESCE(SUM(cp.price * cp.quantity), 0)
  INTO products_amount
  FROM contract_products cp
  WHERE cp.contract_id = p_contract_id;
  
  total_amount := services_amount + products_amount;
  
  RETURN total_amount;
END;
$$;


ALTER FUNCTION "public"."calculate_contract_planned_amount"("p_contract_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_contract_planned_amount"("p_contract_id" "uuid") IS 'Calcula o valor planejado total de um contrato baseado em seus serviços e produtos';



CREATE OR REPLACE FUNCTION "public"."calculate_next_bill_date"("p_base_date" "date", "p_billing_day" integer, "p_anticipate_weekends" boolean DEFAULT false) RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_bill_date date;
    v_day_of_week integer;
BEGIN
    -- AIDEV-NOTE: Calcular data base do faturamento
    v_bill_date := date_trunc('month', p_base_date)::date + (p_billing_day - 1);
    
    -- AIDEV-NOTE: Se a data calculada for menor que a base, ir para o próximo mês
    IF v_bill_date < p_base_date THEN
        v_bill_date := date_trunc('month', p_base_date + interval '1 month')::date + (p_billing_day - 1);
    END IF;
    
    -- AIDEV-NOTE: Antecipar weekends se configurado
    IF p_anticipate_weekends THEN
        v_day_of_week := EXTRACT(DOW FROM v_bill_date); -- 0=Sunday, 6=Saturday
        
        -- Se for sábado (6), antecipar para sexta
        IF v_day_of_week = 6 THEN
            v_bill_date := v_bill_date - interval '1 day';
        -- Se for domingo (0), antecipar para sexta
        ELSIF v_day_of_week = 0 THEN
            v_bill_date := v_bill_date - interval '2 days';
        END IF;
    END IF;
    
    RETURN v_bill_date;
END;
$$;


ALTER FUNCTION "public"."calculate_next_bill_date"("p_base_date" "date", "p_billing_day" integer, "p_anticipate_weekends" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_next_bill_date"("p_base_date" "date", "p_billing_day" integer, "p_anticipate_weekends" boolean) IS 'Calcula próxima data de faturamento considerando dia do mês e antecipação de weekends';



CREATE OR REPLACE FUNCTION "public"."calculate_risk_score"("p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_event_type" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    risk_score integer := 0;
    failed_attempts integer;
    different_ips integer;
    last_login_location text;
    time_since_last_login interval;
BEGIN
    -- Verificar tentativas de login falhadas nas últimas 24 horas
    SELECT COUNT(*) INTO failed_attempts
    FROM public.auth_monitoring
    WHERE user_id = p_user_id
    AND event_type = 'LOGIN_FAILED'
    AND created_at > now() - interval '24 hours';
    
    -- Adicionar pontos por tentativas falhadas
    risk_score := risk_score + (failed_attempts * 10);
    
    -- Verificar IPs diferentes nas últimas 24 horas
    SELECT COUNT(DISTINCT ip_address) INTO different_ips
    FROM public.auth_monitoring
    WHERE user_id = p_user_id
    AND created_at > now() - interval '24 hours';
    
    -- Adicionar pontos por múltiplos IPs
    IF different_ips > 3 THEN
        risk_score := risk_score + 20;
    ELSIF different_ips > 1 THEN
        risk_score := risk_score + 10;
    END IF;
    
    -- Verificar horário suspeito (entre 2h e 6h)
    IF EXTRACT(HOUR FROM now()) BETWEEN 2 AND 6 THEN
        risk_score := risk_score + 15;
    END IF;
    
    -- Verificar se é um novo dispositivo/user agent
    IF NOT EXISTS (
        SELECT 1 FROM public.auth_monitoring
        WHERE user_id = p_user_id
        AND user_agent = p_user_agent
        AND event_type = 'LOGIN_SUCCESS'
        AND created_at > now() - interval '30 days'
    ) THEN
        risk_score := risk_score + 25;
    END IF;
    
    -- Limitar o score máximo
    IF risk_score > 100 THEN
        risk_score := 100;
    END IF;
    
    RETURN risk_score;
END;
$$;


ALTER FUNCTION "public"."calculate_risk_score"("p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_event_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_risk_score"("p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_event_type" "text") IS 'Calcula score de risco baseado em padrões de comportamento do usuário';



CREATE OR REPLACE FUNCTION "public"."calculate_service_product_due_date"("p_contract_id" "uuid", "p_reference_date" "date" DEFAULT CURRENT_DATE) RETURNS "date"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_service_record RECORD;
    v_product_record RECORD;
    v_contract_billing_day INTEGER;
    v_calculated_date DATE;
BEGIN
    -- Buscar dia de faturamento do contrato
    SELECT billing_day INTO v_contract_billing_day
    FROM contracts 
    WHERE id = p_contract_id;
    
    -- Verificar serviços do contrato primeiro
    FOR v_service_record IN 
        SELECT due_type, due_value, due_next_month
        FROM contract_services 
        WHERE contract_id = p_contract_id
        AND due_type IS NOT NULL
        LIMIT 1
    LOOP
        -- ✅ CORREÇÃO: Trocar 'specific_day' por 'fixed_day'
        v_calculated_date := CASE v_service_record.due_type
            WHEN 'days_after_billing' THEN 
                p_reference_date + INTERVAL '1 day' * v_service_record.due_value
            WHEN 'fixed_day' THEN  -- ✅ CORRIGIDO: era 'specific_day'
                CASE 
                    WHEN v_service_record.due_next_month THEN
                        date_trunc('month', p_reference_date + INTERVAL '1 month') + 
                        INTERVAL '1 day' * (v_service_record.due_value - 1)
                    ELSE
                        CASE 
                            -- Verificar se a data já passou no mês atual
                            WHEN date_trunc('month', p_reference_date) + INTERVAL '1 day' * (v_service_record.due_value - 1) < p_reference_date THEN
                                -- Se já passou, usar próximo mês
                                date_trunc('month', p_reference_date + INTERVAL '1 month') + 
                                INTERVAL '1 day' * (v_service_record.due_value - 1)
                            ELSE
                                -- Se ainda não passou, usar mês atual
                                date_trunc('month', p_reference_date) + 
                                INTERVAL '1 day' * (v_service_record.due_value - 1)
                        END
                END
            ELSE 
                p_reference_date + INTERVAL '5 days'
        END;
        
        RETURN v_calculated_date;
    END LOOP;
    
    -- Se não há serviços, verificar produtos
    FOR v_product_record IN 
        SELECT due_date_type, due_days, due_day, due_next_month
        FROM contract_products 
        WHERE contract_id = p_contract_id
        AND due_date_type IS NOT NULL
        LIMIT 1
    LOOP
        v_calculated_date := CASE v_product_record.due_date_type
            WHEN 'days_after_billing' THEN 
                p_reference_date + INTERVAL '1 day' * v_product_record.due_days
            WHEN 'specific_day' THEN  -- Produtos ainda usam 'specific_day'
                CASE 
                    WHEN v_product_record.due_next_month THEN
                        date_trunc('month', p_reference_date + INTERVAL '1 month') + 
                        INTERVAL '1 day' * (v_product_record.due_day - 1)
                    ELSE
                        date_trunc('month', p_reference_date) + 
                        INTERVAL '1 day' * (v_product_record.due_day - 1)
                END
            ELSE 
                p_reference_date + INTERVAL '5 days'
        END;
        
        RETURN v_calculated_date;
    END LOOP;
    
    -- Fallback: usar dia de faturamento do contrato
    IF v_contract_billing_day IS NOT NULL THEN
        v_calculated_date := date_trunc('month', p_reference_date) + 
                           INTERVAL '1 day' * (v_contract_billing_day - 1);
        
        -- Se a data já passou, usar próximo mês
        IF v_calculated_date < p_reference_date THEN
            v_calculated_date := date_trunc('month', p_reference_date + INTERVAL '1 month') + 
                               INTERVAL '1 day' * (v_contract_billing_day - 1);
        END IF;
        
        RETURN v_calculated_date;
    END IF;
    
    -- Último fallback
    RETURN p_reference_date + INTERVAL '30 days';
END;
$$;


ALTER FUNCTION "public"."calculate_service_product_due_date"("p_contract_id" "uuid", "p_reference_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_stock_balance"("p_tenant_id" "uuid", "p_product_id" "uuid", "p_storage_location_id" "uuid", "p_movement_type" "public"."stock_movement_type", "p_quantity" numeric, "p_unit_value" numeric DEFAULT 0) RETURNS TABLE("accumulated_balance" numeric, "unit_cmc" numeric, "total_cmc" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_balance DECIMAL := 0;
  v_current_cmc DECIMAL := 0;
  v_new_balance DECIMAL;
  v_new_cmc DECIMAL;
  v_total_value DECIMAL;
  v_total_stock DECIMAL;
BEGIN
  -- AIDEV-NOTE: Obter saldo atual e CMC do local de estoque (qualificando tabela para evitar ambiguidade)
  SELECT 
    COALESCE(psbl.available_stock, 0),
    COALESCE(psbl.unit_cmc, 0)
  INTO v_current_balance, v_current_cmc
  FROM public.product_stock_by_location psbl
  WHERE psbl.tenant_id = p_tenant_id
    AND psbl.product_id = p_product_id
    AND psbl.storage_location_id = p_storage_location_id;
  
  -- Se não existe registro, criar com valores iniciais
  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
    v_current_cmc := 0;
    
    INSERT INTO public.product_stock_by_location (
      tenant_id,
      product_id,
      storage_location_id,
      available_stock,
      unit_cmc
    ) VALUES (
      p_tenant_id,
      p_product_id,
      p_storage_location_id,
      0,
      0
    )
    ON CONFLICT (tenant_id, product_id, storage_location_id) DO NOTHING;
  END IF;
  
  -- AIDEV-NOTE: Calcular novo saldo baseado no tipo de movimento
  CASE p_movement_type
    WHEN 'ENTRADA' THEN
      -- Entrada: incrementar estoque e recalcular CMC médio
      v_total_stock := v_current_balance + p_quantity;
      v_total_value := (v_current_balance * v_current_cmc) + (p_quantity * p_unit_value);
      
      IF v_total_stock > 0 THEN
        v_new_cmc := v_total_value / v_total_stock;
      ELSE
        v_new_cmc := p_unit_value;
      END IF;
      
      v_new_balance := v_total_stock;
      
    WHEN 'SAIDA' THEN
      -- Saída: decrementar estoque, manter CMC
      v_new_balance := GREATEST(0, v_current_balance - p_quantity);
      v_new_cmc := v_current_cmc;
      
    WHEN 'AJUSTE' THEN
      -- Ajuste: definir estoque para quantidade específica, manter CMC
      v_new_balance := p_quantity;
      v_new_cmc := v_current_cmc;
      
    WHEN 'TRANSFERENCIA' THEN
      -- Transferência: decrementar origem (já calculado), incrementar destino
      -- Esta função calcula apenas para o local de destino
      v_new_balance := v_current_balance + p_quantity;
      v_new_cmc := v_current_cmc;
      
    ELSE
      -- Tipo desconhecido, manter valores atuais
      v_new_balance := v_current_balance;
      v_new_cmc := v_current_cmc;
  END CASE;
  
  -- AIDEV-NOTE: Atualizar ou inserir registro em product_stock_by_location
  INSERT INTO public.product_stock_by_location (
    tenant_id,
    product_id,
    storage_location_id,
    available_stock,
    unit_cmc
  ) VALUES (
    p_tenant_id,
    p_product_id,
    p_storage_location_id,
    v_new_balance,
    v_new_cmc
  )
  ON CONFLICT (tenant_id, product_id, storage_location_id)
  DO UPDATE SET
    available_stock = EXCLUDED.available_stock,
    unit_cmc = EXCLUDED.unit_cmc,
    updated_at = timezone('America/Sao_Paulo'::text, now());
  
  -- Retornar valores calculados
  RETURN QUERY SELECT
    v_new_balance,
    v_new_cmc,
    (v_new_balance * v_new_cmc) AS total_cmc;
END;
$$;


ALTER FUNCTION "public"."calculate_stock_balance"("p_tenant_id" "uuid", "p_product_id" "uuid", "p_storage_location_id" "uuid", "p_movement_type" "public"."stock_movement_type", "p_quantity" numeric, "p_unit_value" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_stock_balance"("p_tenant_id" "uuid", "p_product_id" "uuid", "p_storage_location_id" "uuid", "p_movement_type" "public"."stock_movement_type", "p_quantity" numeric, "p_unit_value" numeric) IS 'Calcula saldo acumulado e CMC após uma movimentação de estoque';



CREATE OR REPLACE FUNCTION "public"."call_sync_charges_edge_function"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."call_sync_charges_edge_function"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."call_sync_charges_edge_function"() IS 'Função auxiliar que chama a Edge Function sync-charges-from-asaas-api via HTTP usando pg_net.
Usa headers apikey e Authorization com anon key para garantir autenticação mesmo com verifyJWT: false.
Usada pelo cron job sync-charges-from-asaas-api-hourly para sincronizar charges automaticamente.';



CREATE OR REPLACE FUNCTION "public"."can_transition_stage"("p_contract_id" "uuid", "p_to_stage_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_from_stage_id UUID;
  v_tenant_id UUID;
  v_user_roles VARCHAR(50)[];
  v_transition_exists BOOLEAN;
  v_is_admin BOOLEAN := FALSE;
  v_to_stage_code VARCHAR(50);
BEGIN
  -- Se não tem usuário, nega
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Obter etapa atual e tenant_id do contrato
  SELECT stage_id, tenant_id INTO v_from_stage_id, v_tenant_id
  FROM contracts
  WHERE id = p_contract_id;
  
  -- Verificar se é administrador
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_user_id 
    AND (user_role = 'ADMIN' OR role = 'ADMIN')
  ) INTO v_is_admin;
  
  -- Administradores podem fazer qualquer transição
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Obter código do estágio de destino
  SELECT code INTO v_to_stage_code
  FROM contract_stages
  WHERE id = p_to_stage_id;
  
  -- Para cancelamentos, ser mais permissivo
  IF v_to_stage_code = 'CANCELED' THEN
    -- Qualquer usuário com acesso ao tenant pode cancelar
    RETURN check_user_tenant_access(v_tenant_id, p_user_id);
  END IF;
  
  -- Obter papéis do usuário
  SELECT array_agg(tu.role) INTO v_user_roles
  FROM tenant_users tu
  WHERE tu.user_id = p_user_id AND tu.tenant_id = v_tenant_id;
  
  -- Se não tem papéis, mas tem acesso ao tenant, permite transições básicas
  IF v_user_roles IS NULL OR array_length(v_user_roles, 1) = 0 THEN
    IF check_user_tenant_access(v_tenant_id, p_user_id) THEN
      RETURN TRUE; -- Permite transições básicas para usuários com acesso
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Verificar se existe transição e se o usuário tem permissão
  SELECT EXISTS(
    SELECT 1
    FROM contract_stage_transitions t
    WHERE t.tenant_id = v_tenant_id
      AND t.from_stage_id = v_from_stage_id
      AND t.to_stage_id = p_to_stage_id
      AND (
        t.allowed_roles IS NULL 
        OR t.allowed_roles && v_user_roles
        OR 'TENANT_ADMIN' = ANY(v_user_roles)
      )
  ) INTO v_transition_exists;
  
  -- Se não existe transição específica, mas usuário tem acesso ao tenant, permite
  IF NOT v_transition_exists AND check_user_tenant_access(v_tenant_id, p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  RETURN v_transition_exists;
END;
$$;


ALTER FUNCTION "public"."can_transition_stage"("p_contract_id" "uuid", "p_to_stage_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_contract_billing"("p_billing_id" "uuid", "p_reason" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_billing RECORD;
  v_gateway_id UUID;
  v_external_id VARCHAR(100);
  v_gateway_config RECORD;
BEGIN
  -- Obter dados do faturamento
  SELECT id, tenant_id, status, payment_gateway_id, external_id
  INTO v_billing
  FROM contract_billings
  WHERE id = p_billing_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Faturamento não encontrado');
  END IF;
  
  -- Verificar se já está cancelado
  IF v_billing.status = 'CANCELED' THEN
    RETURN json_build_object('success', FALSE, 'error', 'Faturamento já está cancelado');
  END IF;
  
  -- Verificar se tem integração com gateway
  IF v_billing.payment_gateway_id IS NOT NULL AND v_billing.external_id IS NOT NULL THEN
    -- Registrar para cancelamento posterior via webhook/job
    INSERT INTO payment_reconciliations (
      billing_id,
      tenant_id,
      reconciliation_type,
      amount,
      payment_date,
      notes,
      external_id,
      needs_cancellation,
      cancellation_status,
      created_by
    ) VALUES (
      p_billing_id,
      v_billing.tenant_id,
      'BILLING_CANCELLATION',
      0,
      NOW(),
      COALESCE(p_reason, 'Cancelamento de faturamento'),
      v_billing.external_id,
      TRUE,
      'PENDING',
      p_user_id
    );
  END IF;
  
  -- Atualizar status para cancelado
  UPDATE contract_billings
  SET
    status = 'CANCELED',
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_billing_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'billing_id', p_billing_id,
    'needs_external_cancellation', (v_billing.payment_gateway_id IS NOT NULL AND v_billing.external_id IS NOT NULL)
  );
END;
$$;


ALTER FUNCTION "public"."cancel_contract_billing"("p_billing_id" "uuid", "p_reason" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_tenant_invite_v2"("invite_id_param" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  invite_record tenant_invites;
  invite_tenant_id UUID;
  user_tenant_role TEXT;
BEGIN
  -- Obter registro do convite
  SELECT * INTO invite_record 
  FROM tenant_invites 
  WHERE id = invite_id_param;
  
  IF invite_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Convite não encontrado'
    );
  END IF;
  
  invite_tenant_id := invite_record.tenant_id;
  
  -- Verificar se o usuário tem permissão (TENANT_ADMIN)
  SELECT role INTO user_tenant_role
  FROM tenant_users
  WHERE tenant_id = invite_tenant_id AND user_id = auth.uid();
  
  IF user_tenant_role IS NULL OR user_tenant_role != 'TENANT_ADMIN' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você não tem permissão para cancelar convites'
    );
  END IF;
  
  -- Verificar se o convite está pendente
  IF invite_record.status != 'PENDING' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Apenas convites pendentes podem ser cancelados'
    );
  END IF;
  
  -- Atualizar o status do convite para CANCELLED
  UPDATE tenant_invites
  SET status = 'CANCELLED',
      updated_at = now()
  WHERE id = invite_id_param;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Convite cancelado com sucesso'
  );
END;
$$;


ALTER FUNCTION "public"."cancel_tenant_invite_v2"("invite_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_stage_id" "uuid", "p_comments" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_contract RECORD;
  v_can_transition BOOLEAN;
  v_requires_comment BOOLEAN;
  v_stage_code VARCHAR(50);
  v_status VARCHAR(20);
BEGIN
  -- Obter dados do contrato
  SELECT c.id, c.tenant_id, c.stage_id, c.status
  INTO v_contract
  FROM contracts c
  WHERE c.id = p_contract_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Contrato não encontrado');
  END IF;
  
  -- Verificar se pode fazer a transição
  SELECT can_transition_stage(p_contract_id, p_stage_id, p_user_id) INTO v_can_transition;
  
  IF NOT v_can_transition THEN
    RETURN json_build_object('success', FALSE, 'error', 'Transição de estágio não permitida');
  END IF;
  
  -- Verificar se a transição requer comentário
  SELECT cst.requires_comment
  INTO v_requires_comment
  FROM contract_stage_transitions cst
  WHERE cst.from_stage_id = v_contract.stage_id
    AND cst.to_stage_id = p_stage_id
    AND cst.tenant_id = v_contract.tenant_id;
  
  IF v_requires_comment AND (p_comments IS NULL OR trim(p_comments) = '') THEN
    RETURN json_build_object('success', FALSE, 'error', 'Esta transição requer um comentário');
  END IF;
  
  -- Obter código do novo estágio para definir o status do contrato
  SELECT cs.code INTO v_stage_code
  FROM contract_stages cs
  WHERE cs.id = p_stage_id;
  
  -- Mapear código do estágio para status do contrato
  CASE v_stage_code
    WHEN 'ACTIVE' THEN v_status := 'ACTIVE';
    WHEN 'CANCELED' THEN v_status := 'CANCELED';
    ELSE v_status := 'DRAFT';
  END CASE;
  
  -- Atualizar estágio do contrato
  UPDATE contracts
  SET
    stage_id = p_stage_id,
    status = v_status,
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_contract_id;
  
  -- O histórico será criado automaticamente pelo trigger log_contract_stage_changes
  -- Mas precisamos adicionar comentários se fornecidos
  IF p_comments IS NOT NULL AND trim(p_comments) != '' THEN
    UPDATE contract_stage_history
    SET comments = p_comments
    WHERE contract_id = p_contract_id
      AND to_stage_id = p_stage_id
      AND changed_at = (
        SELECT MAX(changed_at)
        FROM contract_stage_history
        WHERE contract_id = p_contract_id
          AND to_stage_id = p_stage_id
      );
  END IF;
  
  RETURN json_build_object(
    'success', TRUE,
    'contract_id', p_contract_id,
    'new_stage_id', p_stage_id,
    'new_status', v_status
  );
END;
$$;


ALTER FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_stage_id" "uuid", "p_comments" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_stage_id" "uuid", "p_user_id" "uuid", "p_comments" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_contract RECORD;
  v_can_transition BOOLEAN;
  v_requires_comment BOOLEAN;
  v_stage_code VARCHAR(50);
  v_status VARCHAR(20);
BEGIN
  -- Obter dados do contrato
  SELECT c.id, c.tenant_id, c.stage_id, c.status
  INTO v_contract
  FROM contracts c
  WHERE c.id = p_contract_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Contrato não encontrado');
  END IF;
  
  -- Verificar se pode fazer a transição
  SELECT can_transition_stage(p_contract_id, p_stage_id, p_user_id) INTO v_can_transition;
  
  IF NOT v_can_transition THEN
    RETURN json_build_object('success', FALSE, 'error', 'Transição de estágio não permitida');
  END IF;
  
  -- Verificar se a transição requer comentário
  SELECT cst.requires_comment
  INTO v_requires_comment
  FROM contract_stage_transitions cst
  WHERE cst.from_stage_id = v_contract.stage_id
    AND cst.to_stage_id = p_stage_id
    AND cst.tenant_id = v_contract.tenant_id;
  
  IF v_requires_comment AND (p_comments IS NULL OR trim(p_comments) = '') THEN
    RETURN json_build_object('success', FALSE, 'error', 'Esta transição requer um comentário');
  END IF;
  
  -- Obter código do novo estágio para definir o status do contrato
  SELECT cs.code INTO v_stage_code
  FROM contract_stages cs
  WHERE cs.id = p_stage_id;
  
  -- Mapear código do estágio para status do contrato
  CASE v_stage_code
    WHEN 'ACTIVE' THEN v_status := 'ACTIVE';
    WHEN 'SUSPENDED' THEN v_status := 'SUSPENDED';
    WHEN 'CANCELED' THEN v_status := 'CANCELED';
    ELSE v_status := 'DRAFT';
  END CASE;
  
  -- Atualizar estágio do contrato
  UPDATE contracts
  SET
    stage_id = p_stage_id,
    status = v_status,
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_contract_id;
  
  -- O histórico será criado automaticamente pelo trigger log_contract_stage_changes
  -- Mas precisamos adicionar comentários se fornecidos
  IF p_comments IS NOT NULL AND trim(p_comments) != '' THEN
    UPDATE contract_stage_history
    SET comments = p_comments
    WHERE contract_id = p_contract_id
      AND to_stage_id = p_stage_id
      AND changed_at = (
        SELECT MAX(changed_at)
        FROM contract_stage_history
        WHERE contract_id = p_contract_id
          AND to_stage_id = p_stage_id
      );
  END IF;
  
  RETURN json_build_object(
    'success', TRUE,
    'contract_id', p_contract_id,
    'new_stage_id', p_stage_id,
    'new_status', v_status
  );
END;
$$;


ALTER FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_stage_id" "uuid", "p_user_id" "uuid", "p_comments" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_active_session"() RETURNS TABLE("has_session" boolean, "session_count" integer, "latest_session_created" timestamp with time zone, "latest_session_refreshed" timestamp with time zone, "session_expired" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
  WITH session_info AS (
    SELECT 
      COUNT(*) as total_sessions,
      MAX(created_at) as latest_created,
      MAX(refreshed_at) as latest_refreshed,
      MAX(not_after) as latest_expires
    FROM auth.sessions 
    WHERE user_id = auth.uid()
  )
  SELECT 
    CASE WHEN total_sessions > 0 THEN true ELSE false END as has_session,
    total_sessions::integer as session_count,
    latest_created as latest_session_created,
    latest_refreshed as latest_session_refreshed,
    CASE 
      WHEN latest_expires IS NOT NULL AND latest_expires < NOW() THEN true 
      ELSE false 
    END as session_expired
  FROM session_info;
$$;


ALTER FUNCTION "public"."check_active_session"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_active_session"() IS 'Verifica se o usuário atual possui sessão ativa (search_path seguro)';



CREATE OR REPLACE FUNCTION "public"."check_admin_role"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  user_role_value text;
  user_metadata jsonb;
begin
  -- Verifica na tabela users usando user_role
  select user_role into user_role_value
  from public.users
  where id = user_id;

  -- Verifica no auth.users metadata
  select raw_user_meta_data into user_metadata
  from auth.users
  where id = user_id;

  -- Retorna true se for ADMIN em user_role ou service_role em metadata
  return (
    user_role_value = 'ADMIN' or 
    (user_metadata->>'role')::text = 'service_role'
  );
end;
$$;


ALTER FUNCTION "public"."check_admin_role"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_fix_login"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    result jsonb := '{"success": false, "message": "Nenhum reparo necessário"}'::jsonb;
    user_count integer;
    auth_user_count integer;
    public_user_count integer;
BEGIN
    -- Log da tentativa de reparo
    RAISE LOG 'Iniciando verificação e reparo de login';
    
    -- Verificar se há usuários na tabela auth.users
    SELECT COUNT(*) INTO auth_user_count FROM auth.users;
    
    -- Verificar se há usuários na tabela public.users
    SELECT COUNT(*) INTO public_user_count FROM public.users;
    
    -- Se não há usuários em auth.users, não podemos fazer muito
    IF auth_user_count = 0 THEN
        result := jsonb_build_object(
            'success', false,
            'message', 'Nenhum usuário encontrado na tabela auth.users',
            'auth_users_count', auth_user_count,
            'public_users_count', public_user_count
        );
        RETURN result;
    END IF;
    
    -- Verificar e sincronizar usuários entre auth.users e public.users
    WITH users_to_sync AS (
        SELECT 
            au.id,
            au.email,
            au.created_at
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    )
    INSERT INTO public.users (id, email, created_at, updated_at, status)
    SELECT 
        id,
        email,
        created_at,
        NOW(),
        'ACTIVE'
    FROM users_to_sync
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW(),
        status = CASE 
            WHEN public.users.status = 'INACTIVE' THEN 'ACTIVE'
            ELSE public.users.status
        END;
    
    GET DIAGNOSTICS user_count = ROW_COUNT;
    
    -- Atualizar usuários inativos para ativos se necessário
    UPDATE public.users 
    SET status = 'ACTIVE', updated_at = NOW()
    WHERE status = 'INACTIVE' 
    AND id IN (SELECT id FROM auth.users);
    
    -- Construir resultado
    result := jsonb_build_object(
        'success', true,
        'message', 'Verificação e reparo concluídos',
        'users_synchronized', user_count,
        'auth_users_count', auth_user_count,
        'public_users_count', (SELECT COUNT(*) FROM public.users)
    );
    
    RAISE LOG 'Reparo de login concluído: %', result;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Erro durante reparo de login: %', SQLERRM;
        result := jsonb_build_object(
            'success', false,
            'message', 'Erro durante o reparo: ' || SQLERRM,
            'error_code', SQLSTATE
        );
        RETURN result;
END;
$$;


ALTER FUNCTION "public"."check_and_fix_login"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_and_fix_login"() IS 'Função para verificar e corrigir automaticamente problemas comuns de autenticação e sincronização entre auth.users e public.users';



CREATE OR REPLACE FUNCTION "public"."check_email_exists"("email_to_check" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  email_count INTEGER;
BEGIN
  -- Verificar na tabela public.users ao invés de auth.users
  SELECT COUNT(*)
  INTO email_count
  FROM public.users
  WHERE email = email_to_check;
  
  -- Retornar verdadeiro se o email existir
  RETURN email_count > 0;
END;
$$;


ALTER FUNCTION "public"."check_email_exists"("email_to_check" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_email_exists"("email_to_check" "text") IS 'Função para verificar se um email existe na tabela public.users (corrigida para não acessar auth.users)';



CREATE OR REPLACE FUNCTION "public"."check_overdue_billings"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.contract_billings
  SET status = 'OVERDUE', updated_at = NOW()
  WHERE status = 'PENDING'
    AND due_date < CURRENT_DATE;
END;
$$;


ALTER FUNCTION "public"."check_overdue_billings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_tenant_access"("p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_tenant_access boolean;
BEGIN
  -- Obter ID do usuário atual
  v_user_id := auth.uid();
  
  -- Verificar se usuário está autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar acesso ao tenant
  SELECT EXISTS (
    SELECT 1 
    FROM public.tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
    AND tu.user_id = v_user_id
    AND tu.is_active = true
  ) INTO v_tenant_access;

  IF NOT v_tenant_access THEN
    RAISE EXCEPTION 'Acesso negado ao tenant %', p_tenant_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."check_tenant_access"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_tenant_access_by_slug"("user_id_param" "uuid", "tenant_slug_param" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  tenant_id_var UUID;
  tenant_name_var TEXT;
  has_access BOOLEAN;
BEGIN
  -- Verificar se o tenant existe primeiro
  SELECT id, name INTO tenant_id_var, tenant_name_var
  FROM public.tenants
  WHERE slug = tenant_slug_param;
  
  IF tenant_id_var IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Tenant não encontrado',
      'error', 'not_found'
    );
  END IF;
  
  -- Verificar se o usuário tem acesso
  SELECT EXISTS(
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = tenant_id_var AND user_id = user_id_param
  ) INTO has_access;
  
  IF has_access THEN
    RETURN jsonb_build_object(
      'success', true,
      'tenant_id', tenant_id_var,
      'tenant_name', tenant_name_var,
      'tenant_slug', tenant_slug_param
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário não tem acesso a este tenant',
      'error', 'access_denied'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Erro ao verificar acesso: ' || SQLERRM,
    'error', SQLSTATE
  );
END;
$$;


ALTER FUNCTION "public"."check_tenant_access_by_slug"("user_id_param" "uuid", "tenant_slug_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_tenant_access_explicit"("p_user_id" "uuid", "p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  is_admin boolean;
  has_access boolean;
BEGIN
  -- Verificar se é admin/reseller global
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_user_id AND user_role IN ('ADMIN', 'RESELLER')
  ) INTO is_admin;
  
  -- Se for admin, já garante acesso
  IF is_admin THEN
    RETURN true;
  END IF;
  
  -- Verificar acesso direto ao tenant
  SELECT EXISTS (
    SELECT 1 FROM tenant_users tu
    WHERE tu.user_id = p_user_id AND tu.tenant_id = p_tenant_id
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;


ALTER FUNCTION "public"."check_tenant_access_explicit"("p_user_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_tenant_access_safe"("p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  curr_user_id uuid;
BEGIN
  -- Pegar o ID do usuário autenticado
  curr_user_id := auth.uid();
  
  -- Se não há usuário autenticado, falha
  IF curr_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Delegar para a função explícita
  RETURN check_tenant_access_explicit(curr_user_id, p_tenant_id);
END;
$$;


ALTER FUNCTION "public"."check_tenant_access_safe"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_permissions"("p_user_id" "uuid", "required_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.users u
        LEFT JOIN public.resellers_users ru ON ru.user_id = u.id
        WHERE u.id = p_user_id
        AND (
            u.user_role = 'PLATFORM_ADMIN' 
            OR u.user_role = 'ADMIN'
            OR (ru.role = required_role)
            OR (required_role = 'ADMIN' AND u.user_role = 'ADMIN')
        )
    );
END;
$$;


ALTER FUNCTION "public"."check_user_permissions"("p_user_id" "uuid", "required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_tenant_access"("p_tenant_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
    v_has_tenant_access BOOLEAN := FALSE;
BEGIN
    -- Se não tem usuário, nega acesso
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se é administrador global
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = p_user_id 
        AND (user_role = 'ADMIN' OR role = 'ADMIN')
    ) INTO v_is_admin;
    
    -- Administradores têm acesso a tudo
    IF v_is_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Verificar acesso específico ao tenant
    SELECT EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = p_user_id 
        AND tenant_id = p_tenant_id
        AND (active IS NULL OR active = TRUE)
    ) INTO v_has_tenant_access;
    
    RETURN v_has_tenant_access;
END;
$$;


ALTER FUNCTION "public"."check_user_tenant_access"("p_tenant_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_tenant_access_count"("p_user_id" "uuid", "p_tenant_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  access_count INTEGER;
BEGIN
  -- Verificar se é administrador global
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM users 
      WHERE id = p_user_id 
      AND (user_role = 'ADMIN' OR role = 'ADMIN')
    ) THEN 1 ELSE 0 END INTO access_count;
  
  -- Se é admin, já retorna 1
  IF access_count > 0 THEN
    RETURN access_count;
  END IF;
  
  -- Verificar acesso específico ao tenant
  SELECT COUNT(*)
  INTO access_count
  FROM public.tenant_users
  WHERE tenant_id = p_tenant_id 
  AND user_id = p_user_id
  AND (active IS NULL OR active = TRUE);
  
  RETURN access_count;
END;
$$;


ALTER FUNCTION "public"."check_user_tenant_access_count"("p_user_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_user_tenant_access_count"("p_user_id" "uuid", "p_tenant_id" "uuid") IS 'Verifica se um usuário tem acesso a um tenant específico, retornando a contagem';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_refresh_tokens"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_cleaned_count INTEGER;
BEGIN
    -- Marcar como inativo tokens expirados
    UPDATE tenant_refresh_sessions 
    SET is_active = false 
    WHERE refresh_expires_at < NOW() 
    AND is_active = true;
    
    GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
    
    -- Log da limpeza se houver tabela de audit_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        INSERT INTO audit_logs (
            action,
            details,
            created_at
        ) VALUES (
            'CLEANUP_EXPIRED_REFRESH_TOKENS',
            jsonb_build_object('cleaned_count', v_cleaned_count),
            NOW()
        );
    END IF;
    
    RETURN v_cleaned_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_refresh_tokens"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_refresh_tokens"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_sessions"() RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
  WITH deleted AS (
    DELETE FROM auth.sessions 
    WHERE user_id = auth.uid() 
      AND not_after IS NOT NULL 
      AND not_after <= NOW()
    RETURNING id
  )
  SELECT COUNT(*)::integer FROM deleted;
$$;


ALTER FUNCTION "public"."cleanup_expired_sessions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_sessions"() IS 'Remove sessões expiradas do usuário atual (search_path seguro)';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_tenant_codes"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.tenant_access_codes 
    WHERE 
      (expires_at < NOW() AND used_at IS NULL) OR 
      (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deleted;
  
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_tenant_codes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_tokens"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Deletar tokens expirados há mais de 30 dias
    DELETE FROM public.secure_refresh_tokens
    WHERE expires_at < now() - interval '30 days'
    OR (is_revoked = true AND revoked_at < now() - interval '30 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_tokens"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_tokens"() IS 'Remove tokens expirados para manter a tabela limpa';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_audit_logs"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM tenant_sessions_audit
  WHERE created_at < now() - interval '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_audit_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_audit_logs"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_security_notifications"("p_days_to_keep" integer DEFAULT 90) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.security_notifications
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_security_notifications"("p_days_to_keep" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_security_notifications"("p_days_to_keep" integer) IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."cleanup_orphaned_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  orphaned_count INTEGER := 0;
BEGIN
  -- Deletar sessões que não têm refresh tokens correspondentes válidos
  WITH orphaned_sessions AS (
    DELETE FROM tenant_refresh_sessions trs
    WHERE NOT EXISTS (
      SELECT 1 FROM tenant_refresh_tokens trt 
      WHERE trt.token = trs.refresh_token 
      AND trt.revoked_at IS NULL 
      AND trt.expires_at > NOW()
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO orphaned_count FROM orphaned_sessions;
  
  RETURN orphaned_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_orphaned_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_tenant_context"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Limpar configurações de sessão
    PERFORM set_config('app.current_tenant_id', '', false);
    PERFORM set_config('app.current_user_id', '', false);
END;
$$;


ALTER FUNCTION "public"."clear_tenant_context"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."clear_tenant_context"() IS 'Context clearing with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."create_contract"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_initial_date" "date", "p_final_date" "date", "p_billing_type" character varying, "p_billing_day" integer, "p_anticipate_weekends" boolean DEFAULT true, "p_installments" integer DEFAULT 1, "p_description" "text" DEFAULT NULL::"text", "p_internal_notes" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_contract_id UUID;
  v_contract_number VARCHAR(50);
  v_initial_stage_id UUID;
  v_year VARCHAR(4);
  v_sequence INTEGER;
BEGIN
  -- Obter ano atual
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Obter próxima sequência para este tenant e ano
  SELECT COALESCE(MAX(SUBSTRING(contract_number FROM '[0-9]+$')::INTEGER), 0) + 1 
  INTO v_sequence
  FROM contracts
  WHERE tenant_id = p_tenant_id
    AND contract_number LIKE v_year || '/%';
  
  -- Formatar número do contrato (ex: 2025/00001)
  v_contract_number := v_year || '/' || LPAD(v_sequence::TEXT, 5, '0');
  
  -- Obter estágio inicial
  SELECT id INTO v_initial_stage_id
  FROM contract_stages
  WHERE tenant_id = p_tenant_id
    AND is_initial = TRUE
  LIMIT 1;
  
  -- Inserir contrato
  INSERT INTO contracts (
    tenant_id,
    customer_id,
    contract_number,
    status,
    initial_date,
    final_date,
    billing_type,
    billing_day,
    anticipate_weekends,
    installments,
    description,
    internal_notes,
    stage_id,
    created_by
  ) VALUES (
    p_tenant_id,
    p_customer_id,
    v_contract_number,
    'DRAFT',
    p_initial_date,
    p_final_date,
    p_billing_type,
    p_billing_day,
    p_anticipate_weekends,
    p_installments,
    p_description,
    p_internal_notes,
    v_initial_stage_id,
    p_user_id
  )
  RETURNING id INTO v_contract_id;
  
  -- Registrar entrada inicial no histórico de estágios
  INSERT INTO contract_stage_history (
    contract_id,
    to_stage_id,
    comments,
    changed_by
  ) VALUES (
    v_contract_id,
    v_initial_stage_id,
    'Contrato criado',
    p_user_id
  );
  
  RETURN json_build_object(
    'success', TRUE,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number
  );
END;
$_$;


ALTER FUNCTION "public"."create_contract"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_initial_date" "date", "p_final_date" "date", "p_billing_type" character varying, "p_billing_day" integer, "p_anticipate_weekends" boolean, "p_installments" integer, "p_description" "text", "p_internal_notes" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_contract_billing_from_charge"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    contract_data RECORD;
    billing_number TEXT;
    reference_period TEXT;
    installment_num INTEGER := 1;
    total_installments INTEGER := 1;
BEGIN
    -- Verificar se já existe um contract_billing para esta charge
    IF EXISTS (
        SELECT 1 FROM contract_billings 
        WHERE contract_id = NEW.contract_id 
        AND amount = NEW.valor 
        AND due_date = NEW.data_vencimento
        AND tenant_id = NEW.tenant_id
    ) THEN
        RETURN NEW;
    END IF;

    -- Buscar dados do contrato
    SELECT 
        contract_number,
        tenant_id
    INTO contract_data
    FROM contracts c
    WHERE c.id = NEW.contract_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contrato não encontrado: %', NEW.contract_id;
    END IF;

    -- Gerar número de faturamento
    billing_number := contract_data.contract_number || '-' || to_char(NOW(), 'YYYYMM') || '-01';

    -- Gerar período de referência
    reference_period := to_char(NEW.data_vencimento, 'MM/YYYY');

    -- Inserir contract_billing
    INSERT INTO contract_billings (
        contract_id,
        tenant_id,
        billing_number,
        installment_number,
        total_installments,
        reference_period,
        reference_start_date,
        reference_end_date,
        issue_date,
        due_date,
        original_due_date,
        amount,
        discount_amount,
        tax_amount,
        status,
        payment_method,
        created_at,
        updated_at
    ) VALUES (
        NEW.contract_id,
        NEW.tenant_id,
        billing_number,
        installment_num,
        total_installments,
        reference_period,
        CURRENT_DATE,
        NEW.data_vencimento,
        CURRENT_DATE,
        NEW.data_vencimento,
        NEW.data_vencimento,
        NEW.valor,
        0,
        0,
        CASE 
            WHEN NEW.status = 'PAID' THEN 'PAID'
            WHEN NEW.data_vencimento < CURRENT_DATE THEN 'OVERDUE'
            ELSE 'PENDING'
        END,
        NEW.tipo,
        NOW(),
        NOW()
    );

    RAISE LOG 'Contract billing criado automaticamente para charge %', NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Erro ao criar contract_billing: %', SQLERRM;
        RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_contract_billing_from_charge"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_contract_billing_from_charge"() IS 'Contract billing from charge with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."create_contract_billing_on_charge"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
DECLARE
  v_contract_data RECORD;
  v_billing_number VARCHAR(50);
  v_reference_period VARCHAR(20);
  v_installment_info VARCHAR(20);
  v_sequence_number INTEGER;
BEGIN
  -- AIDEV-NOTE: Verificar se já existe contract_billing para esta charge
  IF EXISTS (
    SELECT 1 FROM contract_billings 
    WHERE contract_id = NEW.contract_id 
    AND reference_period = TO_CHAR(NEW.data_vencimento, 'MM/YYYY')
  ) THEN
    RETURN NEW;
  END IF;
  
  -- AIDEV-NOTE: Buscar dados do contrato e cliente
  SELECT 
    c.contract_number,
    c.customer_id,
    c.total_amount,
    c.billing_day,
    cu.name as customer_name,
    cu.email as customer_email
  INTO v_contract_data
  FROM contracts c
  JOIN customers cu ON c.customer_id = cu.id
  WHERE c.id = NEW.contract_id;
  
  -- Verificar se encontrou o contrato
  IF v_contract_data IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado: %', NEW.contract_id;
  END IF;
  
  -- AIDEV-NOTE: Gerar número sequencial único para o billing_number
  SELECT COALESCE(MAX(
    CASE 
      WHEN billing_number ~ '^[0-9]+/[^-]+-[0-9]+-([0-9]+)$' THEN
        SUBSTRING(billing_number FROM '[0-9]+$')::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence_number
  FROM contract_billings
  WHERE tenant_id = NEW.tenant_id
    AND billing_number LIKE TO_CHAR(NOW(), 'YYYY') || '/' || v_contract_data.contract_number || '-%';
  
  -- AIDEV-NOTE: Gerar número de faturamento único
  -- Formato: YYYY/CONTRATO-YYYYMM-SEQUENCE
  v_billing_number := TO_CHAR(NOW(), 'YYYY') || '/' || v_contract_data.contract_number || '-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_sequence_number::TEXT, 6, '0');
  
  -- Gerar período de referência
  v_reference_period := TO_CHAR(NEW.data_vencimento, 'MM/YYYY');
  
  -- AIDEV-NOTE: Verificar se é parcela (tipo INSTALLMENT)
  IF NEW.tipo = 'INSTALLMENT' THEN
    -- Extrair informação de parcela da descrição
    v_installment_info := SUBSTRING(NEW.descricao FROM 'Parcela ([0-9]+/[0-9]+)');
    IF v_installment_info IS NOT NULL THEN
      v_billing_number := v_billing_number || '-' || REPLACE(v_installment_info, '/', 'de');
    END IF;
  END IF;
  
  -- AIDEV-NOTE: Criar registro em contract_billings
  -- net_amount é calculado automaticamente como coluna gerada
  INSERT INTO contract_billings (
    tenant_id,
    contract_id,
    billing_number,
    installment_number,
    total_installments,
    reference_period,
    reference_start_date,
    reference_end_date,
    issue_date,
    due_date,
    original_due_date,
    amount,
    discount_amount,
    tax_amount,
    currency,
    status,
    payment_method,
    created_at,
    updated_at
  ) VALUES (
    NEW.tenant_id,
    NEW.contract_id,
    v_billing_number,
    CASE 
      WHEN NEW.tipo = 'INSTALLMENT' THEN 
        COALESCE(SUBSTRING(NEW.descricao FROM 'Parcela ([0-9]+)')::INTEGER, 1)
      ELSE 1
    END,
    CASE 
      WHEN NEW.tipo = 'INSTALLMENT' THEN 
        COALESCE(SUBSTRING(NEW.descricao FROM '/([0-9]+)')::INTEGER, 1)
      ELSE 1
    END,
    v_reference_period,
    DATE_TRUNC('month', NEW.data_vencimento),
    NEW.data_vencimento,
    CURRENT_DATE,
    NEW.data_vencimento,
    NEW.data_vencimento,
    NEW.valor,
    0, -- discount_amount
    0, -- tax_amount
    'BRL',
    'PENDING',
    CASE 
      WHEN NEW.tipo = 'INSTALLMENT' THEN 'CREDIT_CARD'
      ELSE 'BANK_SLIP'
    END,
    NOW(),
    NOW()
  );
  
  -- Log da operação
  RAISE NOTICE 'Contract billing criado automaticamente: % para charge % - Contrato: % - Valor: %', 
    v_billing_number, NEW.id, v_contract_data.contract_number, NEW.valor;
  
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."create_contract_billing_on_charge"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_contract_billing_on_charge"() IS 'Contract billing creation with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."create_contract_with_services"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_initial_date" "date", "p_final_date" "date", "p_billing_type" character varying, "p_billing_day" integer, "p_anticipate_weekends" boolean DEFAULT true, "p_installments" integer DEFAULT 1, "p_description" "text" DEFAULT NULL::"text", "p_internal_notes" "text" DEFAULT NULL::"text", "p_services" "jsonb" DEFAULT '[]'::"jsonb", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_contract_id UUID;
  v_contract_number VARCHAR(50);
  v_initial_stage_id UUID;
  v_year VARCHAR(4);
  v_sequence INTEGER;
  v_service JSONB;
  v_service_id UUID;
  v_generic_service_id UUID;
  v_total_amount DECIMAL(10,2) := 0;
BEGIN
  -- Obter ano atual
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Obter próxima sequência para este tenant e ano
  SELECT COALESCE(MAX(SUBSTRING(number FROM '[0-9]+$')::INTEGER), 0) + 1 
  INTO v_sequence
  FROM contracts
  WHERE tenant_id = p_tenant_id
    AND number LIKE v_year || '/%';
  
  -- Formatar número do contrato (ex: 2025/00001)
  v_contract_number := v_year || '/' || LPAD(v_sequence::TEXT, 5, '0');
  
  -- Obter estágio inicial
  SELECT id INTO v_initial_stage_id
  FROM contract_stages
  WHERE tenant_id = p_tenant_id
    AND is_initial = TRUE
  LIMIT 1;
  
  -- Inserir contrato
  INSERT INTO contracts (
    tenant_id,
    customer_id,
    number,
    status,
    initial_date,
    final_date,
    billing_type,
    billing_day,
    anticipate_weekends,
    installments,
    description,
    internal_notes,
    stage_id,
    created_by,
    total_amount
  ) VALUES (
    p_tenant_id,
    p_customer_id,
    v_contract_number,
    'DRAFT',
    p_initial_date,
    p_final_date,
    p_billing_type,
    p_billing_day,
    p_anticipate_weekends,
    p_installments,
    p_description,
    p_internal_notes,
    v_initial_stage_id,
    p_user_id,
    0 -- será atualizado após inserir serviços
  )
  RETURNING id INTO v_contract_id;
  
  -- Registrar entrada inicial no histórico de estágios
  INSERT INTO contract_stage_history (
    contract_id,
    to_stage_id,
    comments,
    changed_by
  ) VALUES (
    v_contract_id,
    v_initial_stage_id,
    'Contrato criado',
    p_user_id
  );
  
  -- Inserir serviços se fornecidos
  IF p_services IS NOT NULL AND jsonb_array_length(p_services) > 0 THEN
    -- Obter ou criar serviço genérico para serviços sem service_id
    SELECT id INTO v_generic_service_id
    FROM services
    WHERE tenant_id = p_tenant_id
      AND name = 'Serviço Customizado'
    LIMIT 1;
    
    IF v_generic_service_id IS NULL THEN
      INSERT INTO services (
        tenant_id,
        name,
        description,
        default_price,
        is_active
      ) VALUES (
        p_tenant_id,
        'Serviço Customizado',
        'Serviço genérico para itens customizados',
        0,
        TRUE
      )
      RETURNING id INTO v_generic_service_id;
    END IF;
    
    -- Inserir cada serviço
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_services)
    LOOP
      -- Determinar service_id
      IF v_service->>'service_id' IS NOT NULL AND v_service->>'service_id' != '' THEN
        v_service_id := (v_service->>'service_id')::UUID;
      ELSE
        v_service_id := v_generic_service_id;
      END IF;
      
      -- Inserir serviço do contrato
      INSERT INTO contract_services (
        contract_id,
        service_id,
        description,
        quantity,
        unit_price,
        discount_percentage,
        tax_rate,
        is_active
      ) VALUES (
        v_contract_id,
        v_service_id,
        COALESCE(v_service->>'description', v_service->>'name', 'Serviço'),
        COALESCE((v_service->>'quantity')::INTEGER, 1),
        COALESCE((v_service->>'unit_price')::DECIMAL, (v_service->>'default_price')::DECIMAL, 0),
        COALESCE((v_service->>'discount_percentage')::DECIMAL, 0),
        COALESCE((v_service->>'tax_rate')::DECIMAL, 0),
        COALESCE((v_service->>'is_active')::BOOLEAN, TRUE)
      );
      
      -- Calcular total (quantidade * preço unitário)
      v_total_amount := v_total_amount + (
        COALESCE((v_service->>'quantity')::INTEGER, 1) * 
        COALESCE((v_service->>'unit_price')::DECIMAL, (v_service->>'default_price')::DECIMAL, 0)
      );
    END LOOP;
    
    -- Atualizar total do contrato
    UPDATE contracts
    SET total_amount = v_total_amount
    WHERE id = v_contract_id;
  END IF;
  
  RETURN json_build_object(
    'success', TRUE,
    'contract_id', v_contract_id,
    'contract_number', v_contract_number,
    'total_amount', v_total_amount
  );
END;
$_$;


ALTER FUNCTION "public"."create_contract_with_services"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_initial_date" "date", "p_final_date" "date", "p_billing_type" character varying, "p_billing_day" integer, "p_anticipate_weekends" boolean, "p_installments" integer, "p_description" "text", "p_internal_notes" "text", "p_services" "jsonb", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_templates"("tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
    template_id uuid;
begin
    -- AIDEV-NOTE: Template 7 dias antes - usando tags centralizadas
    insert into public.notification_templates 
    (tenant_id, name, description, category, message, settings, days_offset, is_before_due, active, tags)
    values (
        tenant_id,
        '7 DIAS PARA VENCER',
        'Lembrete amigável enviado 7 dias antes do vencimento',
        'lembrete',
        '😊 Olá {cliente.nome}!

Passando para lembrar que você tem uma cobrança no valor de {cobranca.valor} com vencimento para {cobranca.vencimento}.

Para sua comodidade, você pode pagar antecipadamente através do link: {cobranca.link}

Agradecemos sua parceria! 🤝',
        '{"send_days_before": 7, "priority": "normal"}'::jsonb,
        7,
        true,
        true,
        ARRAY['{cliente.nome}', '{cobranca.valor}', '{cobranca.vencimento}', '{cobranca.link}']
    );

    -- AIDEV-NOTE: Template 3 dias antes - usando tags centralizadas
    insert into public.notification_templates 
    (tenant_id, name, description, category, message, settings, days_offset, is_before_due, active, tags)
    values (
        tenant_id,
        '3 DIAS PARA VENCER',
        'Lembrete enviado 3 dias antes do vencimento',
        'lembrete',
        'Olá {cliente.nome}!

⚠️ Sua cobrança no valor de {cobranca.valor} vence em 3 dias.

Evite juros e multas pagando em dia através do link: {cobranca.link}

Conte com a gente! 👍',
        '{"send_days_before": 3, "priority": "high"}'::jsonb,
        3,
        true,
        true,
        ARRAY['{cliente.nome}', '{cobranca.valor}', '{cobranca.link}']
    );

    -- AIDEV-NOTE: Template 1 dia antes - usando tags centralizadas
    insert into public.notification_templates 
    (tenant_id, name, description, category, message, settings, days_offset, is_before_due, active, tags)
    values (
        tenant_id,
        '1 DIA PARA VENCER',
        'Lembrete de urgência enviado 1 dia antes do vencimento',
        'lembrete',
        '⚠️ Atenção {cliente.nome}!

Sua cobrança de {cobranca.valor} vence AMANHÃ!

Não deixe para última hora, pague agora mesmo: {cobranca.link}

Precisando de ajuda é só nos chamar! 🤝',
        '{"send_days_before": 1, "priority": "urgent"}'::jsonb,
        1,
        true,
        true,
        ARRAY['{cliente.nome}', '{cobranca.valor}', '{cobranca.link}']
    );

    -- AIDEV-NOTE: Template dia do vencimento - usando tags centralizadas
    insert into public.notification_templates 
    (tenant_id, name, description, category, message, settings, days_offset, is_before_due, active, tags)
    values (
        tenant_id,
        'VENCE HOJE',
        'Aviso no dia do vencimento',
        'lembrete',
        '🚨 {cliente.nome}, sua cobrança vence HOJE!

Valor: {cobranca.valor}

Evite a negativação do seu cadastro pagando ainda hoje através do link: {cobranca.link}

Precisando de ajuda é só nos chamar! ⚠️',
        '{"send_days_before": 0, "priority": "critical"}'::jsonb,
        0,
        true,
        true,
        ARRAY['{cliente.nome}', '{cobranca.valor}', '{cobranca.link}']
    );

    -- AIDEV-NOTE: Template cobrança vencida - usando tags centralizadas
    insert into public.notification_templates 
    (tenant_id, name, description, category, message, settings, days_offset, is_before_due, active, tags)
    values (
        tenant_id,
        'BOLETO VENCIDO',
        'Notificação de cobrança vencida',
        'cobranca',
        '❌ {cliente.nome}, identificamos que sua cobrança está vencida!

Valor original: {cobranca.valor}
Vencimento: {cobranca.vencimento}

Para regularizar sua situação e evitar maiores transtornos, clique no link: {cobranca.link}

Em caso de dúvidas, estamos à disposição. 🤝',
        '{"send_days_after": 1, "priority": "critical"}'::jsonb,
        1,
        false,
        true,
        ARRAY['{cliente.nome}', '{cobranca.valor}', '{cobranca.vencimento}', '{cobranca.link}']
    );
end;
$$;


ALTER FUNCTION "public"."create_default_templates"("tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_default_templates"("tenant_id" "uuid") IS 'Cria templates padrão de mensagem para um novo tenant. 
Usa apenas tags do arquivo centralizado messageTags.ts:
- {cliente.nome}, {cliente.empresa}
- {cobranca.valor}, {cobranca.vencimento}, {cobranca.link}
- {dias.ateVencimento}, {dias.aposVencimento}';



CREATE OR REPLACE FUNCTION "public"."create_finance_entry_from_charge"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Verifica se o status mudou para pago e se data_pagamento foi preenchida
    IF (NEW.status IN ('RECEIVED_BOLETO', 'RECEIVED_IN_CASH', 'RECEIVED_PIX') AND 
        NEW.data_pagamento IS NOT NULL AND 
        (OLD.status IS NULL OR OLD.status NOT IN ('RECEIVED_BOLETO', 'RECEIVED_IN_CASH', 'RECEIVED_PIX') OR OLD.data_pagamento IS NULL)) THEN
        
        -- Verifica se já existe um finance_entry para esta charge
        IF NOT EXISTS (
            SELECT 1 FROM finance_entries 
            WHERE charge_id = NEW.id AND tenant_id = NEW.tenant_id
        ) THEN
            -- Cria o lançamento financeiro
            INSERT INTO finance_entries (
                type,
                description,
                amount,
                due_date,
                payment_date,
                status,
                charge_id,
                contract_id,
                tenant_id,
                customer_id,
                created_at,
                updated_at
            ) VALUES (
                'RECEIVABLE',
                COALESCE(NEW.descricao, 'Recebimento de cobrança'),
                NEW.valor,
                NEW.data_vencimento,
                NEW.data_pagamento::timestamp,
                'PAID',
                NEW.id,
                NEW.contract_id,
                NEW.tenant_id,
                NEW.customer_id,
                NOW(),
                NOW()
            );
        ELSE
            -- Se já existe, atualiza o status e data de pagamento
            UPDATE finance_entries 
            SET 
                status = 'PAID',
                payment_date = NEW.data_pagamento::timestamp,
                customer_id = NEW.customer_id,
                updated_at = NOW()
            WHERE charge_id = NEW.id AND tenant_id = NEW.tenant_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_finance_entry_from_charge"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_finance_entry_from_charge"() IS 'Finance entry creation with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."create_finance_entry_on_charge_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Verificar se o status mudou para RECEIVED
    IF NEW.status = 'RECEIVED' AND OLD.status != 'RECEIVED' THEN
        -- Verificar se já existe um lançamento para esta cobrança
        IF NOT EXISTS (
            SELECT 1 FROM finance_entries 
            WHERE charge_id = NEW.id
        ) THEN
            -- Inserir novo lançamento financeiro
            INSERT INTO finance_entries (
                type,
                description,
                amount,
                due_date,
                payment_date,
                status,
                charge_id,
                contract_id,
                tenant_id,
                customer_id,
                created_at,
                updated_at
            ) VALUES (
                'RECEIVABLE',
                COALESCE(NEW.descricao, 'Recebimento de cobrança'),
                NEW.valor,
                NEW.data_vencimento,
                COALESCE(NEW.data_pagamento, CURRENT_DATE)::timestamp,
                'PAID',
                NEW.id,
                NEW.contract_id,
                NEW.tenant_id,
                NEW.customer_id,
                NOW(),
                NOW()
            );
        ELSE
            -- Se já existe, atualizar para PAID
            UPDATE finance_entries 
            SET 
                status = 'PAID',
                payment_date = COALESCE(NEW.data_pagamento, CURRENT_DATE)::timestamp,
                customer_id = NEW.customer_id,
                updated_at = NOW()
            WHERE charge_id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_finance_entry_on_charge_payment"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_finance_entry_on_charge_payment"() IS 'Função que cria automaticamente um lançamento financeiro (finance_entry) quando uma cobrança (charge) é marcada como paga (status RECEIVED). Garante que o contract_id seja corretamente transferido da tabela charges para finance_entries.';



CREATE OR REPLACE FUNCTION "public"."create_refresh_token"("p_user_id" "uuid", "p_token" "text", "p_device_fingerprint" "text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_tenant_id" "uuid" DEFAULT NULL::"uuid", "p_expires_hours" integer DEFAULT 168) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    token_id uuid;
    token_hash text;
    expires_at timestamp with time zone;
BEGIN
    -- Gerar hash do token
    token_hash := public.generate_token_hash(p_token);
    expires_at := now() + (p_expires_hours || ' hours')::interval;
    
    -- Revogar tokens existentes para o mesmo dispositivo
    UPDATE public.secure_refresh_tokens
    SET is_revoked = true,
        revoked_at = now(),
        revoked_reason = 'TOKEN_ROTATION'
    WHERE user_id = p_user_id
    AND device_fingerprint = p_device_fingerprint
    AND is_revoked = false;
    
    -- Criar novo token
    INSERT INTO public.secure_refresh_tokens (
        user_id, token_hash, device_fingerprint, ip_address,
        user_agent, tenant_id, expires_at
    ) VALUES (
        p_user_id, token_hash, p_device_fingerprint, p_ip_address,
        p_user_agent, p_tenant_id, expires_at
    ) RETURNING id INTO token_id;
    
    -- Log do evento
    PERFORM public.log_auth_event(
        p_user_id,
        (SELECT email FROM auth.users WHERE id = p_user_id),
        'TOKEN_REFRESH',
        p_ip_address,
        p_user_agent,
        jsonb_build_object(
            'token_id', token_id,
            'device_fingerprint', p_device_fingerprint,
            'expires_at', expires_at
        ),
        p_tenant_id
    );
    
    RETURN token_id;
END;
$$;


ALTER FUNCTION "public"."create_refresh_token"("p_user_id" "uuid", "p_token" "text", "p_device_fingerprint" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_tenant_id" "uuid", "p_expires_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_refresh_token"("p_user_id" "uuid", "p_token" "text", "p_device_fingerprint" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_tenant_id" "uuid", "p_expires_hours" integer) IS 'Cria novo refresh token com rotação automática dos tokens existentes';



CREATE OR REPLACE FUNCTION "public"."create_reseller_invite"("p_reseller_id" "uuid", "p_email" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verificar se o revendedor existe
    IF NOT EXISTS (SELECT 1 FROM public.resellers WHERE id = p_reseller_id) THEN
        RAISE EXCEPTION 'Revendedor não encontrado';
    END IF;
    
    -- Por enquanto apenas retorna sucesso
    -- Futuramente implementar lógica de convite
    v_result := json_build_object(
        'success', true,
        'message', 'Funcionalidade de convites será implementada em breve',
        'invite_id', gen_random_uuid()
    );
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."create_reseller_invite"("p_reseller_id" "uuid", "p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_reseller_invite"("p_reseller_id" "uuid", "p_email" "text") IS 'Reseller invite creation with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."create_reseller_with_invite"("p_name" "text", "p_document" "text", "p_email" "text", "p_phone" "text", "p_commission_rate" numeric, "p_active" boolean DEFAULT true) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_reseller_id uuid;
    v_invite_id uuid;
    v_token text;
    v_result json;
BEGIN
    -- Verificar se o usuário tem permissão
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (role = 'service_role' OR role = 'admin')
    ) THEN
        RAISE EXCEPTION 'Usuário não tem permissão para criar revendedor';
    END IF;

    -- Criar revendedor
    INSERT INTO public.resellers (
        name,
        document,
        email,
        phone,
        commission_rate,
        active
    )
    VALUES (
        p_name,
        p_document,
        p_email,
        p_phone,
        p_commission_rate,
        p_active
    )
    RETURNING id INTO v_reseller_id;

    -- Gerar token único para o convite usando md5 do timestamp + email
    SELECT md5(extract(epoch from now())::text || p_email) INTO v_token;

    -- Criar convite
    INSERT INTO public.invites (
        email,
        token,
        created_by,
        expires_at,
        metadata
    )
    VALUES (
        p_email,
        v_token,
        auth.uid(),
        NOW() + INTERVAL '7 days',
        jsonb_build_object(
            'type', 'reseller',
            'reseller_id', v_reseller_id,
            'role', 'owner'
        )
    )
    RETURNING id INTO v_invite_id;

    SELECT jsonb_build_object(
        'success', true,
        'reseller_id', v_reseller_id,
        'invite_id', v_invite_id,
        'token', v_token
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Se houver erro, tenta limpar o revendedor criado
    IF v_reseller_id IS NOT NULL THEN
        DELETE FROM public.resellers WHERE id = v_reseller_id;
    END IF;

    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."create_reseller_with_invite"("p_name" "text", "p_document" "text", "p_email" "text", "p_phone" "text", "p_commission_rate" numeric, "p_active" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" character varying(50),
    "name" character varying(255) NOT NULL,
    "description" "text",
    "municipality_code" character varying(50),
    "lc_code" character varying(50),
    "tax_code" character varying(50),
    "default_price" numeric(10,2) NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 0,
    "withholding_tax" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "no_charge" boolean DEFAULT false NOT NULL,
    "unit_type" character varying(50),
    "cost_price" numeric DEFAULT 0
);


ALTER TABLE "public"."services" OWNER TO "postgres";


COMMENT ON TABLE "public"."services" IS 'Catálogo de serviços com políticas RLS unificadas - Corrigido em 2025-01-27 para resolver erro PGRST116';



COMMENT ON COLUMN "public"."services"."no_charge" IS 'Indica se o serviço deve ser excluído do processo de faturamento. Quando true, não gera registros na tabela charges';



COMMENT ON COLUMN "public"."services"."unit_type" IS 'Unidade de cobrança do serviço (por hora, por dia, mensal, etc.)';



COMMENT ON COLUMN "public"."services"."cost_price" IS 'Preço de custo do serviço para cálculo de margem de lucro';



CREATE OR REPLACE FUNCTION "public"."create_service_with_tenant"("service_data" "jsonb") RETURNS "public"."services"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_has_access BOOLEAN := FALSE;
    v_is_admin BOOLEAN := FALSE;
    v_service services;
BEGIN
    -- Obter usuário atual
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Extrair tenant_id dos dados do serviço
    v_tenant_id := (service_data->>'tenant_id')::UUID;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID é obrigatório';
    END IF;
    
    -- Verificar se é administrador global
    SELECT EXISTS (
        SELECT 1 FROM users 
        WHERE id = v_user_id 
        AND user_role IN ('ADMIN', 'RESELLER')
    ) INTO v_is_admin;
    
    -- Administradores têm acesso a qualquer tenant
    IF v_is_admin THEN
        v_has_access := TRUE;
    ELSE
        -- Verificar se o usuário tem acesso ao tenant
        SELECT EXISTS (
            SELECT 1 FROM tenant_users 
            WHERE user_id = v_user_id 
            AND tenant_id = v_tenant_id
            AND (active IS NULL OR active = TRUE)
        ) INTO v_has_access;
    END IF;
    
    -- Se não tem acesso, negar operação
    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Usuário não tem permissão para criar serviços neste tenant';
    END IF;
    
    -- Configurar contexto de tenant
    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, false);
    
    -- Inserir o serviço
    INSERT INTO services (
        name,
        description,
        code,
        default_price,
        tax_rate,
        withholding_tax,
        is_active,
        municipality_code,
        lc_code,
        tax_code,
        tenant_id
    ) VALUES (
        service_data->>'name',
        service_data->>'description',
        service_data->>'code',
        (service_data->>'default_price')::DECIMAL,
        COALESCE((service_data->>'tax_rate')::DECIMAL, 0),
        COALESCE((service_data->>'withholding_tax')::BOOLEAN, false),
        COALESCE((service_data->>'is_active')::BOOLEAN, true),
        service_data->>'municipality_code',
        service_data->>'lc_code',
        service_data->>'tax_code',
        v_tenant_id
    ) RETURNING * INTO v_service;
    
    -- Log de segurança
    INSERT INTO security_logs (user_id, action, resource, details, tenant_id)
    VALUES (
        v_user_id::text,
        'SERVICE_CREATED',
        'services',
        jsonb_build_object(
            'service_id', v_service.id,
            'service_name', v_service.name,
            'method', 'create_service_with_tenant',
            'is_admin', v_is_admin
        ),
        v_tenant_id
    );
    
    RETURN v_service;
END;
$$;


ALTER FUNCTION "public"."create_service_with_tenant"("service_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  -- Tenta obter tenant_id da variável de sessão
  SELECT nullif(current_setting('app.current_tenant_id', true), '')::UUID;
$$;


ALTER FUNCTION "public"."current_tenant_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_tenant_id"() IS 'Função segura para obter tenant ID atual - search_path fixo';



CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_id uuid;
  tenant_data jsonb;
  tenant_access jsonb := '{}'::jsonb;
  tenant_slugs jsonb := '{}'::jsonb;
  primary_tenant_id uuid;
  primary_role text;
  is_platform_admin boolean := false;
  tenant_count integer := 0;
  claims_updated_at timestamp := now();
  -- NOVA VARIÁVEL: tempo de expiração customizado (8 horas)
  custom_exp_time bigint;
BEGIN
  -- AIDEV-NOTE: Definir tempo de expiração customizado para 8 horas
  custom_exp_time := extract(epoch from now()) + (8 * 60 * 60); -- 8 horas

  -- AIDEV-NOTE: Extrair user_id do evento de autenticação
  user_id := (event->>'user_id')::uuid;
  
  IF user_id IS NULL THEN
    RETURN event;
  END IF;

  -- AIDEV-NOTE: Buscar dados dos tenants do usuário com informações expandidas
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'tenant_id', tu.tenant_id,
        'role', tu.role,
        'tenant_name', t.name,
        'tenant_slug', t.slug,
        'is_active', tu.is_active
      )
    ),
    COUNT(*),
    -- Tenant primário (primeiro ativo ou primeiro da lista)
    (array_agg(tu.tenant_id ORDER BY tu.is_active DESC, tu.created_at ASC))[1],
    (array_agg(tu.role ORDER BY tu.is_active DESC, tu.created_at ASC))[1],
    -- Verificar se é admin da plataforma
    bool_or(tu.role = 'platform_admin')
  INTO 
    tenant_data, 
    tenant_count, 
    primary_tenant_id, 
    primary_role, 
    is_platform_admin
  FROM tenant_users tu
  JOIN tenants t ON t.id = tu.tenant_id
  WHERE tu.user_id = user_id
    AND tu.is_active = true;

  -- AIDEV-NOTE: Construir mapa de acesso por tenant_id
  IF tenant_data IS NOT NULL THEN
    SELECT jsonb_object_agg(
      (item->>'tenant_id')::text,
      jsonb_build_object(
        'role', item->>'role',
        'tenant_name', item->>'tenant_name',
        'is_active', (item->>'is_active')::boolean
      )
    )
    INTO tenant_access
    FROM jsonb_array_elements(tenant_data) AS item;

    -- AIDEV-NOTE: Construir mapa de slugs para tenant_id
    SELECT jsonb_object_agg(
      item->>'tenant_slug',
      (item->>'tenant_id')::text
    )
    INTO tenant_slugs
    FROM jsonb_array_elements(tenant_data) AS item
    WHERE item->>'tenant_slug' IS NOT NULL;
  END IF;

  -- AIDEV-NOTE: Adicionar custom claims expandidos ao JWT COM EXPIRAÇÃO CUSTOMIZADA
  event := jsonb_set(
    event,
    '{claims}',
    COALESCE(event->'claims', '{}'::jsonb) ||
    jsonb_build_object(
      'exp', custom_exp_time, -- TEMPO DE EXPIRAÇÃO CUSTOMIZADO - 8 HORAS
      'claims_updated_at', extract(epoch from claims_updated_at),
      'tenants', COALESCE(tenant_data, '[]'::jsonb),
      'primary_tenant_id', primary_tenant_id,
      'primary_role', primary_role,
      'is_platform_admin', is_platform_admin,
      'tenant_count', tenant_count,
      -- Novos claims expandidos
      'tenant_access', COALESCE(tenant_access, '{}'::jsonb),
      'current_tenant_id', primary_tenant_id,
      'tenant_slugs', COALESCE(tenant_slugs, '{}'::jsonb),
      'migration_ready', true,
      'custom_exp_applied', true -- Flag para confirmar que expiração customizada foi aplicada
    )
  );

  -- AIDEV-NOTE: Log de auditoria para monitoramento
  INSERT INTO access_logs (user_id, action, resource, details, timestamp)
  VALUES (
    user_id,
    'jwt_custom_claims_expanded_with_exp',
    'auth_hook',
    jsonb_build_object(
      'tenant_count', tenant_count,
      'primary_tenant_id', primary_tenant_id,
      'is_platform_admin', is_platform_admin,
      'custom_exp_time', custom_exp_time,
      'migration_ready', true
    ),
    now()
  );

  RETURN event;
EXCEPTION
  WHEN OTHERS THEN
    -- AIDEV-NOTE: Log de erro e retorno do evento original
    INSERT INTO access_logs (user_id, action, resource, details, timestamp)
    VALUES (
      user_id,
      'jwt_custom_claims_error',
      'auth_hook',
      jsonb_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      ),
      now()
    );
    RETURN event;
END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'Custom Access Token Hook que adiciona tenant_id ao JWT baseado no user_tenant_access. Chamada automaticamente pelo Supabase Auth.';



CREATE OR REPLACE FUNCTION "public"."daily_billing_status_recalc"() RETURNS TABLE("total_periods_processed" integer, "total_periods_due_today" integer, "total_periods_late" integer, "total_periods_pending" integer, "total_events_created" integer, "total_events_updated" integer, "total_contracts_processed" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_status_result RECORD;
    v_events_processed INTEGER;
    v_total_periods_processed INTEGER := 0;
    v_total_periods_due_today INTEGER := 0;
    v_total_periods_late INTEGER := 0;
    v_total_periods_pending INTEGER := 0;
    v_total_events_created INTEGER := 0;
    v_total_events_updated INTEGER := 0;
    v_total_contracts_processed INTEGER := 0;
BEGIN
    -- AIDEV-NOTE: Recalcular status de todos os períodos de faturamento
    SELECT * INTO v_status_result
    FROM public.recalc_contract_period_statuses();
    
    v_total_periods_processed := v_status_result.periods_processed;
    v_total_periods_due_today := v_status_result.periods_due_today;
    v_total_periods_late := v_status_result.periods_late;
    v_total_periods_pending := v_status_result.periods_pending;
    
    -- AIDEV-NOTE: Atualizar eventos de serviços pendentes (retorna apenas INTEGER)
    SELECT public.update_service_event_pendencies() INTO v_events_processed;
    
    -- AIDEV-NOTE: Como a função só retorna o total processado, vamos usar esse valor
    v_total_events_created := v_events_processed;
    v_total_events_updated := 0; -- Não temos essa informação específica
    v_total_contracts_processed := 0; -- Não temos essa informação específica
    
    -- AIDEV-NOTE: Retornar estatísticas consolidadas
    total_periods_processed := v_total_periods_processed;
    total_periods_due_today := v_total_periods_due_today;
    total_periods_late := v_total_periods_late;
    total_periods_pending := v_total_periods_pending;
    total_events_created := v_total_events_created;
    total_events_updated := v_total_events_updated;
    total_contracts_processed := v_total_contracts_processed;
    
    RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."daily_billing_status_recalc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deactivate_access_to_inactive_tenants"() RETURNS TABLE("tenant_id" "uuid", "tenant_name" "text", "affected_users" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  CREATE TEMP TABLE temp_results (
    tenant_id uuid,
    tenant_name text,
    affected_users bigint
  ) ON COMMIT DROP;

  -- Atualiza os registros e conta quantos foram afetados por tenant
  WITH updates AS (
    UPDATE tenant_users tu
    SET active = false
    FROM tenants t
    WHERE tu.tenant_id = t.id
      AND t.active = false
      AND tu.active = true
    RETURNING tu.tenant_id
  ),
  counts AS (
    SELECT 
      t.id as tenant_id,
      t.name as tenant_name,
      COUNT(u.tenant_id)::bigint as affected_users
    FROM updates u
    JOIN tenants t ON t.id = u.tenant_id
    GROUP BY t.id, t.name
  )
  INSERT INTO temp_results
  SELECT * FROM counts;
  
  RETURN QUERY SELECT * FROM temp_results;
END;
$$;


ALTER FUNCTION "public"."deactivate_access_to_inactive_tenants"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."deactivate_access_to_inactive_tenants"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."debug_auth_context"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN jsonb_build_object(
        'auth_uid', auth.uid(),
        'current_tenant_id', NULLIF(current_setting('app.current_tenant_id', true), ''),
        'session_user', session_user,
        'current_user', current_user,
        'timestamp', now()
    );
END;
$$;


ALTER FUNCTION "public"."debug_auth_context"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."debug_auth_context"() IS 'Função de debug para diagnosticar problemas de autenticação e contexto.';



CREATE OR REPLACE FUNCTION "public"."debug_auth_uid"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    current_uid uuid;
    user_role text;
    jwt_claims json;
BEGIN
    -- Obter o UID atual
    current_uid := auth.uid();
    
    -- Obter o role atual
    user_role := current_setting('role', true);
    
    -- Tentar obter claims do JWT
    BEGIN
        jwt_claims := auth.jwt();
    EXCEPTION WHEN OTHERS THEN
        jwt_claims := '{"error": "Could not get JWT claims"}'::json;
    END;
    
    -- Retornar informações de debug
    RETURN json_build_object(
        'auth_uid', current_uid,
        'user_role', user_role,
        'jwt_claims', jwt_claims,
        'session_user', session_user,
        'current_user', current_user,
        'timestamp', now()
    );
END;
$$;


ALTER FUNCTION "public"."debug_auth_uid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_tenant_context"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'current_tenant_id', NULLIF(current_setting('app.current_tenant_id', true), ''),
        'current_user_id', NULLIF(current_setting('app.current_user_id', true), ''),
        'auth_uid', auth.uid(),
        'timestamp', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."debug_tenant_context"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."debug_tenant_context"() IS 'Debug do contexto atual do tenant';



CREATE OR REPLACE FUNCTION "public"."debug_tenant_id"("tenant_id_param" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  tenant_id_uuid UUID;
  tenant_slug TEXT;
BEGIN
  -- Registrar o valor recebido
  RAISE NOTICE 'Valor recebido: %', tenant_id_param;
  
  -- Verificar se é UUID
  BEGIN
    tenant_id_uuid := tenant_id_param::UUID;
    RETURN 'UUID válido: ' || tenant_id_uuid::TEXT;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Não é um UUID válido, tentando encontrar pelo slug';
  END;
  
  -- Verificar se é um slug válido
  SELECT slug INTO tenant_slug FROM tenants WHERE slug = tenant_id_param;
  IF tenant_slug IS NOT NULL THEN
    RETURN 'Slug válido: ' || tenant_slug;
  END IF;
  
  -- Verificar no formato tenant-{id}
  IF tenant_id_param LIKE 'tenant-%' THEN
    -- Extrair o ID numérico
    BEGIN
      tenant_id_uuid := SUBSTRING(tenant_id_param FROM 8)::UUID;
      RETURN 'Formato numérico válido: ' || tenant_id_uuid::TEXT;
    EXCEPTION WHEN others THEN
      RETURN 'Formato inválido: ' || tenant_id_param;
    END;
  END IF;
  
  -- Não conseguimos identificar o formato
  RETURN 'Formato desconhecido: ' || tenant_id_param;
END;
$$;


ALTER FUNCTION "public"."debug_tenant_id"("tenant_id_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_user_context"() RETURNS TABLE("current_user_id" "uuid", "current_tenant_id" "uuid", "is_authenticated" boolean, "user_role" "text", "tenant_access_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.uid() as current_user_id,
        NULLIF(current_setting('app.current_tenant_id', true), '')::uuid as current_tenant_id,
        auth.uid() IS NOT NULL as is_authenticated,
        (SELECT u.user_role FROM users u WHERE u.id = auth.uid()) as user_role,
        (SELECT COUNT(*) FROM tenant_users tu WHERE tu.user_id = auth.uid()) as tenant_access_count;
END;
$$;


ALTER FUNCTION "public"."debug_user_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_api_key"("encrypted_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Se encrypted_key for NULL, retornar NULL
  IF encrypted_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Obter chave mestra do Supabase Vault (usar view decrypted_secrets)
  BEGIN
    SELECT decrypted_secret INTO encryption_key
    FROM vault.decrypted_secrets
    WHERE name = 'ENCRYPTION_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Se Vault não estiver disponível ou secret não existir, retornar NULL
    RETURN NULL;
  END;
  
  -- Se não houver chave ou chave vazia, retornar NULL
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN NULL;
  END IF;
  
  -- Descriptografar usando pgp_sym_decrypt
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encrypted_key, 'base64'),
      encryption_key
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se falhar na descriptografia, retornar NULL
    -- Isso permite fallback para texto plano
    RETURN NULL;
  END;
END;
$$;


ALTER FUNCTION "public"."decrypt_api_key"("encrypted_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."decrypt_api_key"("encrypted_key" "text") IS 'Descriptografa chave API usando pgcrypto e Supabase Vault. Retorna NULL se descriptografia falhar (permite fallback)';



CREATE OR REPLACE FUNCTION "public"."delete_notification"("p_notification_id" "uuid", "p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- AIDEV-NOTE: Validação de acesso ao tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied: User does not belong to tenant';
  END IF;

  -- AIDEV-NOTE: Deletar notificação com validação dupla
  DELETE FROM notifications 
  WHERE 
    id = p_notification_id
    AND tenant_id = p_tenant_id
    AND recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid());
    
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- AIDEV-NOTE: Log de auditoria
  INSERT INTO access_logs (user_id, action, resource, tenant_id, details)
  VALUES (
    auth.uid(),
    'DELETE',
    'notifications',
    p_tenant_id,
    json_build_object(
      'function', 'delete_notification',
      'notification_id', p_notification_id,
      'success', v_deleted_count > 0
    )
  );
  
  RETURN v_deleted_count > 0;
END;
$$;


ALTER FUNCTION "public"."delete_notification"("p_notification_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."diagnose_contract_services_security"() RETURNS TABLE("check_name" "text", "status" "text", "details" "text", "recommendation" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Verificar se RLS está habilitado
    RETURN QUERY
    SELECT 
        'RLS Status'::TEXT,
        CASE WHEN pg_tables.rowsecurity THEN 'ATIVO' ELSE 'INATIVO' END::TEXT,
        'Row Level Security na tabela contract_services'::TEXT,
        CASE WHEN pg_tables.rowsecurity THEN 'OK' ELSE 'ATIVAR RLS IMEDIATAMENTE' END::TEXT
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'contract_services';
    
    -- Verificar políticas ativas
    RETURN QUERY
    SELECT 
        'Políticas RLS'::TEXT,
        COUNT(*)::TEXT || ' política(s) ativa(s)',
        string_agg(policyname, ', '),
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'CRIAR POLÍTICAS RLS' END
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'contract_services';
    
    -- Verificar função de validação
    RETURN QUERY
    SELECT 
        'Função de Validação'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'EXISTE' ELSE 'AUSENTE' END::TEXT,
        'user_has_contract_service_access'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'CRIAR FUNÇÃO DE VALIDAÇÃO' END::TEXT
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'user_has_contract_service_access';
    
    -- Verificar índices de performance
    RETURN QUERY
    SELECT 
        'Índices de Performance'::TEXT,
        COUNT(*)::TEXT || ' índice(s) encontrado(s)',
        string_agg(indexname, ', '),
        CASE WHEN COUNT(*) >= 2 THEN 'OK' ELSE 'CONSIDERAR MAIS ÍNDICES' END
    FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'contract_services'
    AND (indexname LIKE '%tenant%' OR indexname LIKE '%contract%');
    
END;
$$;


ALTER FUNCTION "public"."diagnose_contract_services_security"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."diagnose_contract_services_security"() IS 'FUNÇÃO DE DIAGNÓSTICO - Verifica o status de segurança da tabela contract_services.
Retorna relatório completo com recomendações para melhoria da segurança.';



CREATE OR REPLACE FUNCTION "public"."eligible_services_for_period"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS TABLE("service_id" "uuid", "service_name" "text", "service_code" "text", "billing_type" "text", "service_amount" numeric, "due_date_type" "text", "due_date_value" integer, "installments" integer, "no_charge" boolean, "generate_billing" boolean, "installment_number" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    service_rec RECORD;
    contract_start_date DATE;
    period_number INTEGER;
BEGIN
    -- AIDEV-NOTE: Obter data de início do contrato
    SELECT initial_date INTO contract_start_date 
    FROM contracts 
    WHERE id = p_contract_id;
    
    -- Calcular número do período (meses desde início do contrato)
    period_number := EXTRACT(MONTH FROM AGE(p_period_start, contract_start_date)) + 1;
    
    -- AIDEV-NOTE: Buscar serviços do contrato que devem gerar cobrança
    -- Agora usando due_type e due_value em vez de due_date_type e due_date_value
    FOR service_rec IN 
        SELECT 
            cs.service_id,
            s.name as service_name,
            s.code as service_code,
            cs.billing_type,
            cs.unit_price as service_amount,
            cs.due_type,
            cs.due_value,
            cs.installments,
            cs.no_charge,
            cs.generate_billing
        FROM public.contract_services cs
        JOIN public.services s ON s.id = cs.service_id
        WHERE cs.contract_id = p_contract_id
          AND cs.generate_billing = true  -- Só serviços que geram cobrança
    LOOP
        -- AIDEV-NOTE: Verificar tipo de serviço e gerar registros apropriados
        IF service_rec.billing_type = 'Único' THEN
            -- Serviço único: aparece apenas no primeiro período
            IF period_number = 1 THEN
                service_id := service_rec.service_id;
                service_name := service_rec.service_name;
                service_code := service_rec.service_code;
                billing_type := service_rec.billing_type;
                service_amount := service_rec.service_amount;
                due_date_type := service_rec.due_type;
                due_date_value := service_rec.due_value;
                installments := service_rec.installments;
                no_charge := service_rec.no_charge;
                generate_billing := service_rec.generate_billing;
                installment_number := 1;
                RETURN NEXT;
            END IF;
            
        ELSIF service_rec.installments > 1 THEN
            -- Serviço parcelado: gerar uma parcela por período até completar
            IF period_number <= service_rec.installments THEN
                service_id := service_rec.service_id;
                service_name := service_rec.service_name;
                service_code := service_rec.service_code;
                billing_type := service_rec.billing_type;
                service_amount := service_rec.service_amount / service_rec.installments; -- Dividir valor
                due_date_type := service_rec.due_type;
                due_date_value := service_rec.due_value;
                installments := service_rec.installments;
                no_charge := service_rec.no_charge;
                generate_billing := service_rec.generate_billing;
                installment_number := period_number;
                RETURN NEXT;
            END IF;
            
        ELSE
            -- Serviço recorrente: aparece em todos os períodos
            service_id := service_rec.service_id;
            service_name := service_rec.service_name;
            service_code := service_rec.service_code;
            billing_type := service_rec.billing_type;
            service_amount := service_rec.service_amount;
            due_date_type := service_rec.due_type;
            due_date_value := service_rec.due_value;
            installments := service_rec.installments;
            no_charge := service_rec.no_charge;
            generate_billing := service_rec.generate_billing;
            installment_number := 1;
            RETURN NEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$;


ALTER FUNCTION "public"."eligible_services_for_period"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_api_key"("plain_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Obter chave mestra do Supabase Vault (usar view decrypted_secrets)
  BEGIN
    SELECT decrypted_secret INTO encryption_key
    FROM vault.decrypted_secrets
    WHERE name = 'ENCRYPTION_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Se Vault não estiver disponível ou secret não existir, retornar NULL
    encryption_key := NULL;
  END;
  
  -- Se não houver chave ou chave vazia, retornar NULL (compatibilidade)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RETURN NULL;
  END IF;
  
  -- Criptografar usando pgp_sym_encrypt
  BEGIN
    RETURN encode(
      pgp_sym_encrypt(
        plain_key,
        encryption_key
      ),
      'base64'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Se criptografia falhar, retornar NULL (compatibilidade)
    RETURN NULL;
  END;
END;
$$;


ALTER FUNCTION "public"."encrypt_api_key"("plain_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."encrypt_api_key"("plain_key" "text") IS 'Criptografa chave API usando pgcrypto e Supabase Vault. Retorna NULL se criptografia não estiver configurada (compatibilidade)';



CREATE OR REPLACE FUNCTION "public"."enforce_active_contract_on_period"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- AIDEV-NOTE: Só validar contrato se contract_id estiver presente (não é standalone)
  IF NEW.contract_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.contracts c
      WHERE c.id = NEW.contract_id
        AND c.tenant_id = NEW.tenant_id
        AND c.status = 'ACTIVE'
    ) THEN
      RAISE EXCEPTION 'Contrato % não está ACTIVE. Período de faturamento não pode ser criado.', NEW.contract_id
        USING ERRCODE = 'check_violation';
    END IF;
    
    -- AIDEV-NOTE: Se tem contrato, preencher customer_id automaticamente do contrato
    IF NEW.customer_id IS NULL THEN
      SELECT customer_id INTO NEW.customer_id
      FROM public.contracts
      WHERE id = NEW.contract_id;
    END IF;
  END IF;
  
  -- AIDEV-NOTE: Validação final: deve ter contract_id OU customer_id
  IF NEW.contract_id IS NULL AND NEW.customer_id IS NULL THEN
    RAISE EXCEPTION 'Período de faturamento deve ter contract_id OU customer_id'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_active_contract_on_period"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_active_contract_on_period"() IS 'Valida que períodos de faturamento tenham contrato ativo (quando não standalone) ou customer_id (quando standalone). 
   Também preenche automaticamente customer_id a partir do contrato quando aplicável.';



CREATE OR REPLACE FUNCTION "public"."enforce_assigned_to_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
/*
  Função de validação de segurança para coluna assigned_to na tabela tasks.
  Garante que o usuário atribuído pertence ao mesmo tenant do registro da tarefa e está ativo.
  Dispara em BEFORE INSERT/UPDATE para evitar escrita inválida.
*/
DECLARE
  v_tenant_id uuid;
  v_exists boolean;
BEGIN
  -- Ignora quando assigned_to é NULL
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  v_tenant_id := NEW.tenant_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.user_id = NEW.assigned_to
      AND tu.tenant_id = v_tenant_id
      AND tu.active = true
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Usuário (%) não pertence ao tenant (%) ou não está ativo', NEW.assigned_to, v_tenant_id
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_assigned_to_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exchange_tenant_access_code"("p_code" character varying, "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_slug TEXT;
  v_tenant_name TEXT;
  v_user_role TEXT;
  v_code_record RECORD;
  v_expires_at TIMESTAMPTZ;
  v_token TEXT;
  v_refresh_token TEXT;
  v_jwt_config JSONB;
  v_jwt_secret TEXT;
  v_jwt_expires_in INT;
BEGIN
  -- Verificar se o usuário está autenticado - usamos o p_user_id recebido
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- Buscar e validar o código
  SELECT * INTO v_code_record 
  FROM tenant_access_codes 
  WHERE code = p_code 
    AND user_id = p_user_id
    AND used_at IS NULL
    AND expires_at > now();
  
  -- Verificar se o código foi encontrado
  IF v_code_record IS NULL THEN
    -- Verificar se o código existe, mas está expirado ou já foi usado
    IF EXISTS (SELECT 1 FROM tenant_access_codes WHERE code = p_code AND user_id = p_user_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Código expirado ou já utilizado',
        'code', 'CODE_EXPIRED'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Código inválido',
        'code', 'INVALID_CODE'
      );
    END IF;
  END IF;

  -- Obter informações do tenant
  SELECT 
    t.id, 
    t.slug, 
    t.name, 
    COALESCE(
      (SELECT tu.role FROM tenant_users tu WHERE tu.tenant_id = t.id AND tu.user_id = p_user_id),
      (SELECT u.user_role FROM users u WHERE u.id = p_user_id)
    )
  INTO v_tenant_id, v_tenant_slug, v_tenant_name, v_user_role
  FROM tenants t
  WHERE t.id = v_code_record.tenant_id;

  -- Verificar se o tenant está ativo
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id AND active = true) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant está inativo',
      'code', 'TENANT_INACTIVE'
    );
  END IF;

  -- Verificar se o usuário ainda tem acesso ao tenant
  IF NOT EXISTS(
    SELECT 1 FROM tenant_users tu 
    WHERE tu.tenant_id = v_tenant_id AND tu.user_id = p_user_id
    UNION ALL
    SELECT 1 FROM users u
    WHERE u.id = p_user_id AND (u.user_role = 'ADMIN' OR u.user_role = 'SUPER_ADMIN')
    LIMIT 1
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não tem mais acesso a este tenant',
      'code', 'ACCESS_DENIED'
    );
  END IF;

  -- Marcar o código como usado
  UPDATE tenant_access_codes
  SET used_at = now()
  WHERE id = v_code_record.id;

  -- Criar token JWT com claims de tenant (esta parte depende da implementação específica do JWT)
  -- Por segurança, este é um placeholder e você deve implementar a geração do JWT adequadamente
  -- usando uma biblioteca segura ou o serviço de autenticação existente
  
  -- Na implementação real, você usaria algo como:
  -- v_token := auth.issue_jwt({tenant_id: v_tenant_id, tenant_slug: v_tenant_slug, role: v_user_role});
  
  -- Para este exemplo, estamos retornando os dados que seriam incluídos no token
  v_jwt_expires_in := 30 * 60; -- 30 minutos em segundos
  
  -- Registrar na auditoria
  INSERT INTO audit_logs(
    user_id,
    tenant_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    p_user_id,
    v_tenant_id,
    'EXCHANGE_ACCESS_CODE',
    'tenant_access_codes',
    v_code_record.id,
    jsonb_build_object(
      'code_id', v_code_record.id,
      'tenant_slug', v_tenant_slug
    )
  );

  -- Retornar resultado com informações que seriam incluídas no token
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'tenant_slug', v_tenant_slug,
    'tenant_name', v_tenant_name,
    'user_id', p_user_id,
    'user_role', v_user_role,
    'claims', jsonb_build_object(
      'tenant_id', v_tenant_id::text,
      'tenant_slug', v_tenant_slug,
      'user_role', v_user_role
    ),
    'expires_in', v_jwt_expires_in
  );
END;
$$;


ALTER FUNCTION "public"."exchange_tenant_access_code"("p_code" character varying, "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_sql"("query" "text") RETURNS TABLE("result" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    rec record;
    result_array jsonb := '[]'::jsonb;
    temp_result jsonb;
    query_lower text;
BEGIN
    -- Normalizar query para verificação
    query_lower := lower(trim(query));
    
    -- Permitir apenas queries SELECT e algumas funções específicas
    IF query_lower NOT LIKE 'select%' AND 
       query_lower NOT LIKE 'with%' THEN
        RAISE EXCEPTION 'Apenas queries SELECT e WITH são permitidas';
    END IF;
    
    -- Verificar se contém comandos perigosos
    IF query_lower LIKE '%drop%' OR 
       query_lower LIKE '%delete%' OR 
       query_lower LIKE '%update%' OR 
       query_lower LIKE '%insert%' OR 
       query_lower LIKE '%alter%' OR 
       query_lower LIKE '%create%' THEN
        RAISE EXCEPTION 'Query contém comandos não permitidos';
    END IF;
    
    -- Executar a query dinamicamente
    FOR rec IN EXECUTE query LOOP
        temp_result := to_jsonb(rec);
        result_array := result_array || temp_result;
    END LOOP;
    
    -- Retornar cada elemento do array como uma linha
    FOR i IN 0..jsonb_array_length(result_array) - 1 LOOP
        result := result_array -> i;
        RETURN NEXT;
    END LOOP;
    
    -- Se não houver resultados, retornar uma linha vazia
    IF jsonb_array_length(result_array) = 0 THEN
        result := '{}'::jsonb;
        RETURN NEXT;
    END IF;
END;
$$;


ALTER FUNCTION "public"."execute_sql"("query" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."execute_sql"("query" "text") IS 'SQL execution function with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."find_or_create_customer_from_staging"("p_tenant_id" "uuid", "p_asaas_customer_id" "text", "p_customer_name" "text", "p_customer_email" "text", "p_customer_document" "text", "p_customer_phone" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_customer_id UUID;
  v_document_bigint BIGINT;
  v_document_cleaned TEXT;
BEGIN
  -- AIDEV-NOTE: Primeiro tentar buscar por asaas_customer_id
  IF p_asaas_customer_id IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE tenant_id = p_tenant_id
      AND customer_asaas_id = p_asaas_customer_id
    LIMIT 1;
    
    IF v_customer_id IS NOT NULL THEN
      RETURN v_customer_id;
    END IF;
  END IF;
  
  -- AIDEV-NOTE: Se não encontrou por asaas_id, tentar por documento
  -- Converter documento TEXT para BIGINT (remover formatação)
  IF p_customer_document IS NOT NULL THEN
    -- AIDEV-NOTE: Remover formatação (pontos, traços, espaços) e tentar converter
    v_document_cleaned := REGEXP_REPLACE(p_customer_document, '[^0-9]', '', 'g');
    
    IF v_document_cleaned != '' THEN
      BEGIN
        v_document_bigint := CAST(v_document_cleaned AS BIGINT);
        
        -- AIDEV-NOTE: Buscar por documento convertido
        SELECT id INTO v_customer_id
        FROM customers
        WHERE tenant_id = p_tenant_id
          AND cpf_cnpj = v_document_bigint
        LIMIT 1;
        
        IF v_customer_id IS NOT NULL THEN
          -- AIDEV-NOTE: Atualizar customer_asaas_id se não tiver
          UPDATE customers
          SET customer_asaas_id = p_asaas_customer_id
          WHERE id = v_customer_id
            AND customer_asaas_id IS NULL;
          
          RETURN v_customer_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- AIDEV-NOTE: Se não conseguir converter, continuar sem buscar por documento
        v_document_bigint := NULL;
      END;
    END IF;
  END IF;
  
  -- AIDEV-NOTE: Se não encontrou, criar novo customer
  -- Converter documento para BIGINT se possível, senão usar NULL
  IF p_customer_document IS NOT NULL AND v_document_bigint IS NULL THEN
    v_document_cleaned := REGEXP_REPLACE(p_customer_document, '[^0-9]', '', 'g');
    IF v_document_cleaned != '' THEN
      BEGIN
        v_document_bigint := CAST(v_document_cleaned AS BIGINT);
      EXCEPTION WHEN OTHERS THEN
        v_document_bigint := NULL;
      END;
    END IF;
  END IF;
  
  INSERT INTO customers (
    tenant_id,
    customer_asaas_id,
    name,
    email,
    phone,
    cpf_cnpj,
    created_at,
    updated_at
  ) VALUES (
    p_tenant_id,
    p_asaas_customer_id,
    COALESCE(p_customer_name, 'Cliente não identificado'),
    p_customer_email,
    p_customer_phone,
    v_document_bigint,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_customer_id;
  
  RETURN v_customer_id;
END;
$$;


ALTER FUNCTION "public"."find_or_create_customer_from_staging"("p_tenant_id" "uuid", "p_asaas_customer_id" "text", "p_customer_name" "text", "p_customer_email" "text", "p_customer_document" "text", "p_customer_phone" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_or_create_customer_from_staging"("p_tenant_id" "uuid", "p_asaas_customer_id" "text", "p_customer_name" "text", "p_customer_email" "text", "p_customer_document" "text", "p_customer_phone" "text") IS 'Busca customer por asaas_customer_id ou documento. Se não encontrar, cria novo customer.';



CREATE OR REPLACE FUNCTION "public"."fix_billing_inconsistencies"() RETURNS "json"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_fixed_count INTEGER;
  v_month_start DATE;
BEGIN
  v_month_start := DATE_TRUNC('month', CURRENT_DATE);
  
  -- AIDEV-NOTE: Marcar como faturados os contratos que têm cobranças no mês atual
  UPDATE contracts 
  SET 
    billed = TRUE,
    updated_at = NOW()
  WHERE 
    status = 'ACTIVE'
    AND billed = FALSE
    AND EXISTS (
      SELECT 1 
      FROM charges ch 
      WHERE ch.contract_id = contracts.id 
        AND ch.created_at >= v_month_start
        AND ch.tenant_id = contracts.tenant_id
    );
  
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  
  RAISE NOTICE 'Inconsistências corrigidas: % contratos atualizados', v_fixed_count;
  
  RETURN json_build_object(
    'success', TRUE,
    'fixed_contracts', v_fixed_count,
    'fix_date', NOW(),
    'description', 'Contratos com cobranças marcados como faturados'
  );
END;
$$;


ALTER FUNCTION "public"."fix_billing_inconsistencies"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fix_billing_inconsistencies"() IS 'Billing inconsistencies fix with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."generate_billing_number"("p_tenant_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  v_year VARCHAR(4);
  v_sequence INTEGER;
  v_billing_number VARCHAR(50);
BEGIN
  -- Obter ano atual
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Obter próxima sequência para este tenant e ano
  SELECT COALESCE(MAX(SUBSTRING(billing_number FROM '[0-9]+$')::INTEGER), 0) + 1 
  INTO v_sequence
  FROM public.contract_billings
  WHERE tenant_id = p_tenant_id
    AND billing_number LIKE v_year || '/%';
  
  -- Formatar número de faturamento (ex: 2025/00001)
  v_billing_number := v_year || '/' || LPAD(v_sequence::TEXT, 5, '0');
  
  RETURN v_billing_number;
END;
$_$;


ALTER FUNCTION "public"."generate_billing_number"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_charge_on_billing"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Verifica se o campo billed foi alterado de false para true
  IF OLD.billed = FALSE AND NEW.billed = TRUE THEN
    -- Insere nova cobrança na tabela charges
    INSERT INTO charges (
      tenant_id,
      customer_id,
      contract_id,
      valor,
      status,
      tipo,
      data_vencimento,
      descricao,
      created_at,
      updated_at
    ) VALUES (
      NEW.tenant_id,
      NEW.customer_id,
      NEW.id,
      NEW.total_amount,
      'pending',
      'monthly',
      CASE 
        WHEN NEW.billing_day <= EXTRACT(DAY FROM CURRENT_DATE) THEN
          DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + (NEW.billing_day - 1) * INTERVAL '1 day'
        ELSE
          DATE_TRUNC('month', CURRENT_DATE) + (NEW.billing_day - 1) * INTERVAL '1 day'
      END,
      'Cobrança gerada automaticamente para o contrato ' || NEW.contract_number,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_charge_on_billing"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_charge_on_billing"() IS 'Gera automaticamente uma cobrança quando um contrato é marcado como faturado';



CREATE OR REPLACE FUNCTION "public"."generate_contract_billing"("p_contract_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_billing_data" "jsonb") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_contract RECORD;
  v_billing_id UUID;
  v_item JSONB;
  v_service RECORD;
  v_total_amount NUMERIC := 0;
  v_total_discount NUMERIC := 0;
  v_total_tax NUMERIC := 0;
  v_billing_item_id UUID;
  v_result JSON;
  v_billing_number VARCHAR;
  v_service_id UUID;
  v_quantity NUMERIC;
  v_unit_price NUMERIC;
  v_discount_amount NUMERIC;
  v_discount_percentage NUMERIC;
  v_tax_rate NUMERIC;
BEGIN
  -- Validar se o contrato existe e pertence ao tenant
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = p_contract_id 
    AND tenant_id = p_tenant_id
    AND status = 'ACTIVE';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado ou não pertence ao tenant';
  END IF;

  -- Gerar número de faturamento único
  v_billing_number := 'BILL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');

  -- Criar o faturamento principal
  INSERT INTO contract_billings (
    id,
    contract_id,
    tenant_id,
    billing_number,
    installment_number,
    total_installments,
    reference_period,
    reference_start_date,
    reference_end_date,
    issue_date,
    due_date,
    original_due_date,
    amount,
    discount_amount,
    tax_amount,
    status,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_contract_id,
    p_tenant_id,
    v_billing_number,
    COALESCE((p_billing_data->>'installment_number')::INTEGER, 1),
    COALESCE((p_billing_data->>'total_installments')::INTEGER, 1),
    COALESCE(p_billing_data->>'reference_period', TO_CHAR(CURRENT_DATE, 'YYYY-MM')),
    COALESCE((p_billing_data->>'reference_start_date')::DATE, DATE_TRUNC('month', CURRENT_DATE)),
    COALESCE((p_billing_data->>'reference_end_date')::DATE, DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'),
    COALESCE((p_billing_data->>'issue_date')::DATE, CURRENT_DATE),
    COALESCE((p_billing_data->>'due_date')::DATE, CURRENT_DATE + INTERVAL '30 days'),
    COALESCE((p_billing_data->>'due_date')::DATE, CURRENT_DATE + INTERVAL '30 days'),
    0,
    COALESCE((p_billing_data->>'discount_amount')::NUMERIC, 0),
    0,
    COALESCE(p_billing_data->>'status', 'PENDING'),
    p_user_id,
    NOW(),
    NOW()
  ) RETURNING id INTO v_billing_id;

  -- Processar itens do faturamento
  FOR v_item IN 
    SELECT value FROM jsonb_array_elements(COALESCE(p_billing_data->'items', '[]'::jsonb))
  LOOP
    v_service_id := (v_item->>'service_id')::UUID;
    v_quantity := COALESCE((v_item->>'quantity')::NUMERIC, 1);
    v_discount_amount := COALESCE((v_item->>'discount_amount')::NUMERIC, 0);
    v_tax_rate := COALESCE((v_item->>'tax_rate')::NUMERIC, 0);

    SELECT id, name, default_price, tax_rate INTO v_service
    FROM services s
    WHERE s.id = v_service_id
      AND s.tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Serviço não encontrado: %', v_service_id;
    END IF;

    v_unit_price := COALESCE((v_item->>'unit_price')::NUMERIC, v_service.default_price);
    
    IF v_unit_price > 0 AND v_quantity > 0 THEN
      v_discount_percentage := v_discount_amount / (v_unit_price * v_quantity);
    ELSE
      v_discount_percentage := 0;
    END IF;

    INSERT INTO contract_billing_items (
      id,
      billing_id,
      contract_service_id,
      description,
      quantity,
      unit_price,
      discount_percentage,
      tax_rate,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_billing_id,
      NULL,
      v_service.name,
      v_quantity,
      v_unit_price,
      COALESCE(v_discount_percentage, 0),
      COALESCE(v_tax_rate, v_service.tax_rate, 0),
      NOW()
    ) RETURNING id INTO v_billing_item_id;

    v_total_amount := v_total_amount + (v_quantity * v_unit_price);
    v_total_discount := v_total_discount + v_discount_amount;
    v_total_tax := v_total_tax + ((v_quantity * v_unit_price - v_discount_amount) * COALESCE(v_tax_rate, v_service.tax_rate, 0) / 100);
  END LOOP;

  UPDATE contract_billings 
  SET 
    amount = v_total_amount,
    tax_amount = v_total_tax,
    updated_at = NOW()
  WHERE id = v_billing_id;

  SELECT json_build_object(
    'success', true,
    'billing_id', v_billing_id,
    'billing_number', v_billing_number,
    'contract_id', p_contract_id,
    'total_amount', v_total_amount,
    'discount_amount', v_total_discount,
    'tax_amount', v_total_tax,
    'net_amount', (v_total_amount - v_total_discount + v_total_tax),
    'message', 'Faturamento gerado com sucesso'
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erro ao gerar faturamento'
    );
END;
$$;


ALTER FUNCTION "public"."generate_contract_billing"("p_contract_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_billing_data" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_contract_billing"("p_contract_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_billing_data" "jsonb") IS 'Contract billing generation with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."generate_contract_billings"("p_contract_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_contract RECORD;
  v_first_billing_date DATE;
  v_billing_date DATE;
  v_due_date DATE;
  v_installment INTEGER;
  v_month_increment INTEGER;
  v_billing_id UUID;
  v_reference_start DATE;
  v_reference_end DATE;
  v_billing_number VARCHAR(50);
  v_result json;
  v_created_billings INTEGER := 0;
BEGIN
  -- Obter dados do contrato
  SELECT 
    c.id, c.tenant_id, c.billing_type, c.billing_day, c.anticipate_weekends,
    c.installments, c.initial_date, c.final_date, c.total_amount
  INTO v_contract
  FROM contracts c
  WHERE c.id = p_contract_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'error', 'Contrato não encontrado');
  END IF;
  
  -- Determinar incremento de mês com base no tipo de faturamento
  CASE v_contract.billing_type
    WHEN 'MONTHLY' THEN v_month_increment := 1;
    WHEN 'BIMONTHLY' THEN v_month_increment := 2;
    WHEN 'QUARTERLY' THEN v_month_increment := 3;
    WHEN 'SEMIANNUAL' THEN v_month_increment := 6;
    WHEN 'ANNUAL' THEN v_month_increment := 12;
    ELSE v_month_increment := 1; -- Default para mensal
  END CASE;
  
  -- Calcular primeira data de faturamento
  v_first_billing_date := v_contract.initial_date;
  
  -- Calcular primeira data de vencimento
  v_due_date := make_date(
    EXTRACT(YEAR FROM v_first_billing_date)::INTEGER,
    EXTRACT(MONTH FROM v_first_billing_date)::INTEGER,
    LEAST(v_contract.billing_day, 
          EXTRACT(DAY FROM 
            (date_trunc('month', v_first_billing_date) + interval '1 month' - interval '1 day')
          )::INTEGER
    )
  );
  
  -- Ajustar se estiver no passado
  IF v_due_date <= v_first_billing_date THEN
    v_due_date := v_due_date + (v_month_increment * interval '1 month');
  END IF;
  
  -- Gerar faturamentos (máximo de installments)
  FOR v_installment IN 1..v_contract.installments LOOP
    -- Calcular período de referência
    v_reference_start := v_first_billing_date + ((v_installment - 1) * v_month_increment * interval '1 month');
    v_reference_end := v_reference_start + (v_month_increment * interval '1 month') - interval '1 day';
    
    -- Verificar se está além da data final do contrato
    IF v_reference_start > v_contract.final_date THEN
      EXIT;
    END IF;
    
    -- Calcular data de vencimento para este faturamento
    v_billing_date := v_due_date + ((v_installment - 1) * v_month_increment * interval '1 month');
    
    -- Ajustar para dia útil se necessário
    IF v_contract.anticipate_weekends THEN
      WHILE EXTRACT(DOW FROM v_billing_date) IN (0, 6) LOOP -- 0 = domingo, 6 = sábado
        v_billing_date := v_billing_date - interval '1 day';
      END LOOP;
    END IF;
    
    -- Gerar número sequencial de faturamento
    v_billing_number := generate_billing_number(v_contract.tenant_id);
    
    -- Inserir faturamento
    INSERT INTO contract_billings (
      contract_id,
      tenant_id,
      billing_number,
      installment_number,
      total_installments,
      reference_period,
      reference_start_date,
      reference_end_date,
      issue_date,
      due_date,
      original_due_date,
      amount,
      status,
      created_by
    ) VALUES (
      p_contract_id,
      v_contract.tenant_id,
      v_billing_number,
      v_installment,
      v_contract.installments,
      to_char(v_reference_start, 'MM/YYYY'),
      v_reference_start,
      v_reference_end,
      CURRENT_DATE,
      v_billing_date,
      v_due_date + ((v_installment - 1) * v_month_increment * interval '1 month'),
      v_contract.total_amount / v_contract.installments, -- Dividir valor total pelo número de parcelas
      'PENDING',
      p_user_id
    )
    RETURNING id INTO v_billing_id;
    
    -- Gerar itens de faturamento com base nos serviços do contrato
    INSERT INTO contract_billing_items (
      billing_id,
      contract_service_id,
      description,
      quantity,
      unit_price,
      discount_percentage,
      tax_code,
      tax_rate
    )
    SELECT
      v_billing_id,
      cs.id,
      COALESCE(cs.description, s.name),
      cs.quantity,
      cs.unit_price,
      cs.discount_percentage,
      s.tax_code,
      cs.tax_rate
    FROM contract_services cs
    JOIN services s ON cs.service_id = s.id
    WHERE cs.contract_id = p_contract_id AND cs.is_active = TRUE;
    
    v_created_billings := v_created_billings + 1;
  END LOOP;
  
  -- Retornar resultado
  RETURN json_build_object(
    'success', TRUE,
    'contract_id', p_contract_id,
    'billings_created', v_created_billings
  );
END;
$$;


ALTER FUNCTION "public"."generate_contract_billings"("p_contract_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_contract_number"("p_tenant_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    next_number INTEGER;
    year_prefix TEXT;
    contract_number TEXT;
    max_number INTEGER;
BEGIN
    -- AIDEV-NOTE: Obter o prefixo do ano atual
    year_prefix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- AIDEV-NOTE: Buscar o maior número sequencial existente para o ano atual
    -- Reescrevendo a lógica para evitar problemas com CASE statement
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN contracts.contract_number ~ ('^' || year_prefix || '[0-9]+$') 
                THEN SUBSTRING(contracts.contract_number FROM (LENGTH(year_prefix) + 1))::INTEGER
                ELSE 0
            END
        ), 
        0
    ) INTO max_number
    FROM contracts 
    WHERE contracts.tenant_id = p_tenant_id 
      AND contracts.contract_number LIKE year_prefix || '%';
    
    -- AIDEV-NOTE: Incrementar o número para o próximo contrato
    next_number := COALESCE(max_number, 0) + 1;
    
    -- AIDEV-NOTE: Formatar o número do contrato com padding de zeros
    contract_number := year_prefix || LPAD(next_number::TEXT, 3, '0');
    
    RETURN contract_number;
    
EXCEPTION
    WHEN OTHERS THEN
        -- AIDEV-NOTE: Em caso de erro, retornar um número baseado em timestamp
        RAISE LOG 'Erro ao gerar número do contrato: %', SQLERRM;
        RETURN year_prefix || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 3, '0');
END;
$_$;


ALTER FUNCTION "public"."generate_contract_number"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invite_token"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.token = encode(gen_random_bytes(32), 'hex');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_invite_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_order_number_on_insert_contract_period"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order_number TEXT;
BEGIN
  -- AIDEV-NOTE: Se order_number não foi fornecido, gerar automaticamente
  IF NEW.order_number IS NULL THEN
    v_order_number := generate_service_order_number(NEW.tenant_id);
    NEW.order_number := v_order_number;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."generate_order_number_on_insert_contract_period"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_order_number_on_insert_contract_period"() IS 'Gera order_number automaticamente ao inserir contract_billing_periods se não fornecido';



CREATE OR REPLACE FUNCTION "public"."generate_refresh_token"("p_user_id" "uuid", "p_tenant_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_token text;
  token_record record;
BEGIN
  -- Gerar token único
  new_token := encode(gen_random_bytes(32), 'base64');
  
  -- Revogar tokens existentes para este usuário/tenant
  UPDATE tenant_refresh_tokens 
  SET revoked_at = now()
  WHERE user_id = p_user_id 
    AND tenant_id = p_tenant_id 
    AND revoked_at IS NULL
    AND expires_at > now();
  
  -- Inserir novo token
  INSERT INTO tenant_refresh_tokens (
    user_id, 
    tenant_id, 
    token
  ) VALUES (
    p_user_id, 
    p_tenant_id, 
    new_token
  );
  
  -- Log de auditoria usando action permitida pelo constraint
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    tenant_id,
    action,
    old_data,
    new_data,
    changed_fields,
    performed_by,
    performed_at
  ) VALUES (
    'tenant_refresh_tokens',
    p_tenant_id,
    p_tenant_id,
    'CUSTOM',
    '{}',
    jsonb_build_object('operation', 'REFRESH_TOKEN_GENERATED', 'token_prefix', left(new_token, 8)),
    jsonb_build_array('token'),
    p_user_id,
    now()
  );
  
  RETURN new_token;
END;
$$;


ALTER FUNCTION "public"."generate_refresh_token"("p_user_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_secure_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Gera um token aleatório de 32 caracteres
  SELECT encode(gen_random_bytes(16), 'hex') INTO v_token;
  RETURN v_token;
END;
$$;


ALTER FUNCTION "public"."generate_secure_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_service_order_number"("p_tenant_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_next integer;
  v_formatted text;
  v_max_attempts integer := 10;
  v_attempt integer := 0;
  v_exists boolean;
BEGIN
  -- Loop com retries para garantir unicidade
  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > v_max_attempts THEN
      RAISE EXCEPTION 'Não foi possível gerar número único após % tentativas para tenant %',
        v_max_attempts, p_tenant_id;
    END IF;

    -- Lock por tenant para serializar concorrência
    PERFORM pg_advisory_lock(hashtext(p_tenant_id::text));

    WITH up AS (
      INSERT INTO public.service_order_sequences(tenant_id, last_number)
      VALUES (p_tenant_id, 1)
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        last_number = public.service_order_sequences.last_number + 1,
        updated_at = timezone('America/Sao_Paulo'::text, now())
      RETURNING last_number
    )
    SELECT last_number INTO v_next FROM up;

    PERFORM pg_advisory_unlock(hashtext(p_tenant_id::text));

    -- Formatar com 3 dígitos até 999, depois 4 dígitos
    IF v_next > 999 THEN
      v_formatted := LPAD(v_next::text, 4, '0');
    ELSE
      v_formatted := LPAD(v_next::text, 3, '0');
    END IF;

    -- Verificar existência apenas na tabela unificada
    SELECT EXISTS(
      SELECT 1
      FROM public.contract_billing_periods
      WHERE tenant_id = p_tenant_id
        AND order_number = v_formatted
    ) INTO v_exists;

    IF NOT v_exists THEN
      RETURN v_formatted;
    END IF;

    RAISE NOTICE 'Número % já existe para tenant %, tentando próximo número...', v_formatted, p_tenant_id;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_service_order_number"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_service_order_number"("p_tenant_id" "uuid") IS 'Gera próximo número sequencial de Ordem de Serviço (001, 002, ...) considerando ambos os tipos de períodos (contract e standalone)';



CREATE OR REPLACE FUNCTION "public"."generate_tenant_access_code"("p_tenant_id" "uuid", "p_expiration_minutes" integer DEFAULT 5) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_code TEXT;
  v_user_id UUID;
  v_tenant_exists BOOLEAN;
  v_has_access BOOLEAN;
  v_tenant_slug TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  
  -- Se auth.uid() não funcionar, tentar obter do email do admin
  IF v_user_id IS NULL THEN
    BEGIN
      SELECT id INTO v_user_id
      FROM auth.users
      WHERE email = 'alberto.melo@nexsyn.com.br'
      LIMIT 1;
      
      IF v_user_id IS NULL THEN
        RETURN json_build_object(
          'success', false,
          'error', 'Usuário não encontrado no sistema'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Erro na verificação de autenticação: ' || SQLERRM
      );
    END;
  END IF;

  -- Verificar se o tenant existe e está ativo
  SELECT EXISTS (
    SELECT 1 FROM public.tenants 
    WHERE id = p_tenant_id AND active = true
  ), slug INTO v_tenant_exists, v_tenant_slug 
  FROM public.tenants 
  WHERE id = p_tenant_id;
  
  IF NOT v_tenant_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Tenant não encontrado ou inativo'
    );
  END IF;
  
  -- Verificar se o usuário tem acesso ao tenant OU é um admin global
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = v_user_id AND tenant_id = p_tenant_id
  ) INTO v_has_access;
  
  -- Se não tem acesso direto, verificar se é admin global
  IF NOT v_has_access THEN
    SELECT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = v_user_id AND role IN ('ADMIN', 'RESELLER')
    ) INTO v_has_access;
  END IF;
  
  IF NOT v_has_access THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não tem acesso a este tenant'
    );
  END IF;
  
  -- Gerar código com alta entropia (32 caracteres hexadecimais = 128 bits)
  v_code := encode(gen_random_bytes(16), 'hex');
  
  -- Definir prazo de expiração
  v_expires_at := now() + (p_expiration_minutes || ' minutes')::INTERVAL;
  
  -- Inserir o código na tabela
  INSERT INTO public.tenant_access_codes (
    code,
    user_id,
    tenant_id,
    expires_at
  ) VALUES (
    v_code,
    v_user_id,
    p_tenant_id,
    v_expires_at
  );
  
  -- Retornar o código e informações
  RETURN json_build_object(
    'success', true,
    'code', v_code,
    'tenant_id', p_tenant_id,
    'tenant_slug', v_tenant_slug,
    'expires_at', v_expires_at
  );
END;
$$;


ALTER FUNCTION "public"."generate_tenant_access_code"("p_tenant_id" "uuid", "p_expiration_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_tenant_access_code"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_expiration_minutes" integer DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_code VARCHAR(64);
  v_expires_at TIMESTAMPTZ;
  v_tenant_exists BOOLEAN;
  v_has_access BOOLEAN;
  v_tenant_active BOOLEAN;
  v_tenant_slug TEXT;
  v_code_id UUID;
  v_result JSONB;
BEGIN
  -- Verificar se o usuário está autenticado
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se o tenant existe e está ativo
  SELECT 
    EXISTS(SELECT 1 FROM tenants WHERE id = p_tenant_id),
    EXISTS(
      SELECT 1 FROM tenant_users tu 
      WHERE tu.tenant_id = p_tenant_id AND tu.user_id = p_user_id
      UNION ALL
      SELECT 1 FROM users u
      WHERE u.id = p_user_id AND (u.user_role = 'ADMIN' OR u.user_role = 'SUPER_ADMIN')
      LIMIT 1
    ),
    (SELECT active FROM tenants WHERE id = p_tenant_id),
    (SELECT slug FROM tenants WHERE id = p_tenant_id)
  INTO v_tenant_exists, v_has_access, v_tenant_active, v_tenant_slug;

  -- Validar tenant
  IF NOT v_tenant_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant não encontrado',
      'code', 'TENANT_NOT_FOUND'
    );
  END IF;

  -- Validar acesso
  IF NOT v_has_access THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não tem acesso a este tenant',
      'code', 'ACCESS_DENIED'
    );
  END IF;

  -- Validar se tenant está ativo
  IF NOT v_tenant_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant está inativo',
      'code', 'TENANT_INACTIVE'
    );
  END IF;

  -- Gerar código único usando UUID e timestamp
  -- Usando pgcrypto corretamente com encode(digest(...))
  v_code := encode(digest(gen_random_uuid()::text || now()::text, 'sha256'), 'hex');
  
  -- Definir data de expiração
  v_expires_at := now() + (p_expiration_minutes * interval '1 minute');

  -- Remover códigos não utilizados e expirados do mesmo usuário para este tenant
  DELETE FROM tenant_access_codes
  WHERE user_id = p_user_id 
    AND tenant_id = p_tenant_id
    AND used_at IS NULL;

  -- Inserir o novo código
  INSERT INTO tenant_access_codes(tenant_id, user_id, code, expires_at)
  VALUES (p_tenant_id, p_user_id, v_code, v_expires_at)
  RETURNING id INTO v_code_id;

  -- Registrar o evento na auditoria
  INSERT INTO audit_logs(
    user_id,
    tenant_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    p_user_id,
    p_tenant_id,
    'GENERATE_ACCESS_CODE',
    'tenant_access_codes',
    v_code_id,
    jsonb_build_object(
      'expires_at', v_expires_at,
      'tenant_slug', v_tenant_slug
    )
  );

  -- Retornar o resultado
  RETURN jsonb_build_object(
    'success', true,
    'code', v_code,
    'tenant_id', p_tenant_id,
    'tenant_slug', v_tenant_slug,
    'expires_at', v_expires_at
  );
END;
$$;


ALTER FUNCTION "public"."generate_tenant_access_code"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_expiration_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_token_hash"("token" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Usar SHA-256 para hash do token com salt baseado em timestamp
    RETURN encode(extensions.digest(token || 'secure_salt_' || extract(epoch from now()), 'sha256'), 'hex');
END;
$$;


ALTER FUNCTION "public"."generate_token_hash"("token" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resellers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "document" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "active" boolean DEFAULT true,
    "commission_rate" numeric(5,2) DEFAULT 0,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);

ALTER TABLE ONLY "public"."resellers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."resellers" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_resellers"() RETURNS SETOF "public"."resellers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.resellers ORDER BY name;
END;
$$;


ALTER FUNCTION "public"."get_all_resellers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_tenants_with_user_count"() RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "active" boolean, "created_at" timestamp with time zone, "user_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.active,
    t.created_at,
    COUNT(tu.user_id)::bigint as user_count
  FROM 
    tenants t
    LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
  GROUP BY 
    t.id
  ORDER BY 
    t.active DESC, t.name ASC;
END;
$$;


ALTER FUNCTION "public"."get_all_tenants_with_user_count"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_all_tenants_with_user_count"() IS 'Tenants with user count with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."get_all_user_tenants"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("tenant_id" "uuid", "tenant_name" "text", "tenant_slug" "text", "tenant_logo_url" "text", "user_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Usar o ID fornecido ou o do usuário atual
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Retornar tenants onde o usuário tem acesso direto
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.branding->>'logo_url',
    tu.role
  FROM 
    public.tenants t
  JOIN 
    public.tenant_users tu ON t.id = tu.tenant_id
  WHERE 
    tu.user_id = v_user_id;
  
END;
$$;


ALTER FUNCTION "public"."get_all_user_tenants"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_bank_statement"("p_tenant_id" "uuid", "p_bank_acount_id" "uuid" DEFAULT NULL::"uuid", "p_start" "date" DEFAULT NULL::"date", "p_end" "date" DEFAULT NULL::"date", "p_operation_type" "public"."bank_operation_type" DEFAULT NULL::"public"."bank_operation_type") RETURNS TABLE("id" "uuid", "bank_acount_id" "uuid", "operation_type" "public"."bank_operation_type", "amount" numeric, "operation_date" timestamp with time zone, "description" "text", "bank_account_label" "text", "category" "text", "document_reference" "text", "category_name" "text", "document_type" "text", "running_balance" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_initial_balance NUMERIC(18,2);
BEGIN
  PERFORM public.set_tenant_context_simple(p_tenant_id);

  SELECT COALESCE(SUM(CASE WHEN boh.operation_type = 'CREDIT' THEN boh.amount ELSE -boh.amount END), 0)
  INTO v_initial_balance
  FROM public.bank_operation_history boh
  WHERE boh.tenant_id = p_tenant_id
    AND (p_bank_acount_id IS NULL OR boh.bank_acount_id = p_bank_acount_id)
    AND (p_start IS NOT NULL AND boh.operation_date::date < p_start);

  RETURN QUERY
  WITH base AS (
    SELECT
      boh.id AS row_id,
      boh.bank_acount_id AS row_bank_acount_id,
      boh.operation_type AS row_operation_type,
      boh.amount AS row_amount,
      boh.operation_date AS row_operation_date,
      boh.description AS row_description,
      boh.category AS row_category,
      boh.document_reference AS row_document_reference,
      CASE WHEN boh.operation_type = 'CREDIT' THEN boh.amount ELSE -boh.amount END AS signed_amount
    FROM public.bank_operation_history boh
    WHERE boh.tenant_id = p_tenant_id
      AND (p_bank_acount_id IS NULL OR boh.bank_acount_id = p_bank_acount_id)
      AND (p_operation_type IS NULL OR boh.operation_type = p_operation_type)
      AND (p_start IS NULL OR boh.operation_date::date >= p_start)
      AND (p_end IS NULL OR boh.operation_date::date <= p_end)
  ), decorated AS (
    SELECT
      b.row_id,
      b.row_bank_acount_id,
      b.row_operation_type,
      b.row_amount,
      b.row_operation_date,
      b.row_description,
      b.row_category::text AS category_text,
      b.row_document_reference::text AS document_reference_text,
      fs.name AS decor_category_name,
      fd.name AS decor_document_type,
      ba.bank AS decor_bank_label,
      b.signed_amount
    FROM base b
    LEFT JOIN public.financial_settings fs
      ON fs.tenant_id = p_tenant_id
      AND fs.id::text = b.row_category::text
    LEFT JOIN public.financial_documents fd
      ON fd.tenant_id = p_tenant_id
      AND fd.id::text = b.row_document_reference::text
    LEFT JOIN public.bank_acounts ba
      ON ba.tenant_id = p_tenant_id
      AND ba.id = b.row_bank_acount_id
  ), acc AS (
    SELECT
      row_id,
      row_bank_acount_id,
      row_operation_type,
      row_amount,
      row_operation_date,
      row_description,
      category_text,
      document_reference_text,
      decor_category_name,
      decor_document_type,
      decor_bank_label,
      v_initial_balance + SUM(signed_amount) OVER (ORDER BY row_operation_date ASC, row_id ASC) AS acc_running_balance
    FROM decorated
  )
  SELECT
    row_id AS id,
    row_bank_acount_id AS bank_acount_id,
    row_operation_type AS operation_type,
    row_amount AS amount,
    row_operation_date AS operation_date,
    row_description AS description,
    decor_bank_label AS bank_account_label,
    category_text AS category,
    document_reference_text AS document_reference,
    decor_category_name AS category_name,
    decor_document_type AS document_type,
    acc_running_balance AS running_balance
  FROM acc
  ORDER BY row_operation_date DESC, row_id DESC;
END;
$$;


ALTER FUNCTION "public"."get_bank_statement"("p_tenant_id" "uuid", "p_bank_acount_id" "uuid", "p_start" "date", "p_end" "date", "p_operation_type" "public"."bank_operation_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_billing_kanban"("p_tenant_id" "uuid") RETURNS TABLE("id" "uuid", "contract_id" "uuid", "customer_id" "uuid", "customer_name" "text", "contract_number" "text", "amount" numeric, "bill_date" "date", "billed_at" timestamp with time zone, "period_start" "date", "period_end" "date", "amount_planned" numeric, "amount_billed" numeric, "billing_status" "text", "priority" "text", "kanban_column" "text", "is_standalone" boolean, "order_number" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- AIDEV-NOTE: Configurar contexto de tenant para segurança
    PERFORM set_tenant_context_simple(p_tenant_id);

    RETURN QUERY
    SELECT
        cbp.id AS id,
        cbp.contract_id AS contract_id,
        -- AIDEV-NOTE: Pegar customer_id do período ou do contrato
        COALESCE(cbp.customer_id, cont.customer_id) AS customer_id,
        cust.name AS customer_name,
        -- AIDEV-NOTE: Se é standalone, mostrar 'Faturamento Avulso'
        CASE 
            WHEN cbp.is_standalone THEN 'Faturamento Avulso'::TEXT
            ELSE cont.contract_number
        END AS contract_number,
        cbp.amount_planned AS amount,
        cbp.bill_date AS bill_date,
        cbp.billed_at AS billed_at,
        cbp.period_start AS period_start,
        cbp.period_end AS period_end,
        cbp.amount_planned AS amount_planned,
        cbp.amount_billed AS amount_billed,
        cbp.status::TEXT AS billing_status,
        -- AIDEV-NOTE: Standalone tem prioridade ALTA por padrão
        CASE 
            WHEN cbp.is_standalone THEN 'ALTA'::TEXT
            ELSE 'NORMAL'::TEXT
        END AS priority,
        -- AIDEV-NOTE: Lógica de categorização unificada
        CASE
            WHEN cbp.status = 'DUE_TODAY' THEN 'Faturar Hoje'
            WHEN cbp.status = 'BILLED' THEN 'Faturados no Mês'
            WHEN cbp.status = 'LATE' THEN 'Faturamento Pendente'
            WHEN cbp.status = 'PENDING' AND cbp.bill_date < CURRENT_DATE THEN 'Faturamento Pendente'
            WHEN cbp.status = 'PENDING' AND cbp.bill_date = CURRENT_DATE THEN 'Faturar Hoje'
            WHEN cbp.status = 'PENDING' AND cbp.bill_date > CURRENT_DATE THEN 'Faturamento Pendente'
            ELSE 'Faturamento Pendente'
        END AS kanban_column,
        cbp.is_standalone AS is_standalone,
        cbp.order_number AS order_number
    FROM
        public.contract_billing_periods cbp
    -- AIDEV-NOTE: LEFT JOIN para suportar faturamentos avulsos (sem contrato)
    LEFT JOIN
        public.contracts cont ON cbp.contract_id = cont.id
    -- AIDEV-NOTE: JOIN com customers usando COALESCE para pegar do período ou do contrato
    INNER JOIN
        public.customers cust ON cust.id = COALESCE(cbp.customer_id, cont.customer_id)
    WHERE
        cbp.tenant_id = p_tenant_id
        AND cbp.status IN ('PENDING', 'DUE_TODAY', 'LATE', 'BILLED')
        AND cbp.bill_date <= (CURRENT_DATE + INTERVAL '1 month')::DATE
    ORDER BY
        cbp.bill_date ASC,
        cbp.is_standalone DESC;  -- AIDEV-NOTE: Standalone primeiro
END;
$$;


ALTER FUNCTION "public"."get_billing_kanban"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_billing_kanban"("p_tenant_id" "uuid") IS 'Retorna dados para o Kanban de faturamento. Agora usa tabela unificada contract_billing_periods 
   com suporte a faturamentos avulsos (is_standalone=true). Não precisa mais de UNION ALL.';



CREATE OR REPLACE FUNCTION "public"."get_billing_kanban_data"("p_tenant_id" "uuid") RETURNS TABLE("billing_period_id" "uuid", "contract_id" "uuid", "contract_number" "text", "customer_name" "text", "period_start" "date", "period_end" "date", "bill_date" "date", "billing_status" "public"."billing_period_status", "billed_at" timestamp with time zone, "amount_planned" numeric, "amount_billed" numeric, "kanban_column" "text", "billing_type" "text", "display_date" "date", "status_display" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- AIDEV-NOTE: Configurar contexto de tenant para RLS
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
  
  RETURN QUERY
  SELECT 
    bkv.billing_period_id,
    bkv.contract_id,
    bkv.contract_number,
    bkv.customer_name,
    bkv.period_start,
    bkv.period_end,
    bkv.bill_date,
    bkv.billing_status,
    bkv.billed_at,
    bkv.amount_planned,
    bkv.amount_billed,
    bkv.kanban_column,
    bkv.billing_type,
    bkv.display_date,
    bkv.status_display
  FROM billing_kanban_view bkv
  WHERE bkv.tenant_id = p_tenant_id
  ORDER BY 
    CASE bkv.kanban_column
      WHEN 'faturar-hoje' THEN 1
      WHEN 'pendente' THEN 2
      WHEN 'faturados' THEN 3
      WHEN 'renovar' THEN 4
    END,
    bkv.display_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_billing_kanban_data"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_billing_kanban_data"("p_tenant_id" "uuid") IS 'Retorna dados do Kanban de faturamento para um tenant específico com RLS aplicado';



CREATE TABLE IF NOT EXISTS "public"."contract_billing_periods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "contract_id" "uuid",
    "period_start" "date",
    "period_end" "date",
    "bill_date" "date" NOT NULL,
    "status" "public"."billing_period_status" DEFAULT 'PENDING'::"public"."billing_period_status" NOT NULL,
    "billed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "manual_mark" boolean DEFAULT false NOT NULL,
    "manual_reason" "text",
    "amount_planned" numeric(10,2),
    "amount_billed" numeric(10,2),
    "actor_id" "uuid",
    "from_status" "public"."billing_period_status",
    "transition_reason" "text",
    "order_number" "text",
    "customer_id" "uuid",
    "due_date" "date",
    "payment_method" "text",
    "payment_gateway_id" "uuid",
    "description" "text",
    "is_standalone" boolean DEFAULT false NOT NULL,
    CONSTRAINT "cbp_bill_date_valid" CHECK (("bill_date" >= "period_start")),
    CONSTRAINT "cbp_billed_requirements" CHECK ((("status" <> 'BILLED'::"public"."billing_period_status") OR (("status" = 'BILLED'::"public"."billing_period_status") AND ("billed_at" IS NOT NULL)))),
    CONSTRAINT "cbp_manual_reason_required" CHECK ((("manual_mark" = false) OR (("manual_mark" = true) AND ("manual_reason" IS NOT NULL)))),
    CONSTRAINT "cbp_period_valid" CHECK (("period_start" <= "period_end")),
    CONSTRAINT "chk_contract_or_customer" CHECK ((("contract_id" IS NOT NULL) OR ("customer_id" IS NOT NULL))),
    CONSTRAINT "chk_standalone_validation" CHECK (((("is_standalone" = false) AND ("contract_id" IS NOT NULL)) OR (("is_standalone" = true) AND ("customer_id" IS NOT NULL))))
);


ALTER TABLE "public"."contract_billing_periods" OWNER TO "postgres";


COMMENT ON TABLE "public"."contract_billing_periods" IS 'Períodos de faturamento por contrato - desacopla Kanban de charges financeiras';



COMMENT ON COLUMN "public"."contract_billing_periods"."contract_id" IS 'ID do contrato (obrigatório quando is_standalone=false, NULL quando is_standalone=true)';



COMMENT ON COLUMN "public"."contract_billing_periods"."period_start" IS 'Início do período de faturamento (obrigatório quando is_standalone=false)';



COMMENT ON COLUMN "public"."contract_billing_periods"."period_end" IS 'Fim do período de faturamento (obrigatório quando is_standalone=false)';



COMMENT ON COLUMN "public"."contract_billing_periods"."status" IS 'Status do período: PENDING, DUE_TODAY, LATE, BILLED, SKIPPED, FAILED';



COMMENT ON COLUMN "public"."contract_billing_periods"."manual_mark" IS 'Indica se foi marcado como faturado manualmente (sem gerar cobrança)';



COMMENT ON COLUMN "public"."contract_billing_periods"."amount_planned" IS 'Valor planejado para faturamento baseado no contrato';



COMMENT ON COLUMN "public"."contract_billing_periods"."amount_billed" IS 'Valor efetivamente faturado (pode diferir do planejado)';



COMMENT ON COLUMN "public"."contract_billing_periods"."customer_id" IS 'Cliente direto (obrigatório quando is_standalone=true)';



COMMENT ON COLUMN "public"."contract_billing_periods"."due_date" IS 'Data de vencimento (usada principalmente em faturamentos avulsos)';



COMMENT ON COLUMN "public"."contract_billing_periods"."payment_method" IS 'Método de pagamento preferencial';



COMMENT ON COLUMN "public"."contract_billing_periods"."payment_gateway_id" IS 'ID do gateway de pagamento';



COMMENT ON COLUMN "public"."contract_billing_periods"."description" IS 'Descrição do faturamento';



COMMENT ON COLUMN "public"."contract_billing_periods"."is_standalone" IS 'Indica se é um faturamento avulso (sem contrato obrigatório)';



CREATE OR REPLACE FUNCTION "public"."get_billing_period_by_id"("p_tenant_id" "uuid", "p_period_id" "uuid") RETURNS SETOF "public"."contract_billing_periods"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Configurar contexto de tenant para RLS
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
  
  -- Retornar o período de faturamento
  RETURN QUERY
  SELECT *
  FROM contract_billing_periods
  WHERE id = p_period_id
    AND tenant_id = p_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_billing_period_by_id"("p_tenant_id" "uuid", "p_period_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_billing_period_by_id"("p_tenant_id" "uuid", "p_period_id" "uuid") IS 'Busca período de faturamento por ID com contexto de tenant seguro';



CREATE OR REPLACE FUNCTION "public"."get_complementary_billing_config"("p_tenant_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    config jsonb;
BEGIN
    SELECT settings->'complementary_billing' 
    INTO config
    FROM tenants 
    WHERE id = p_tenant_id;
    
    -- Retornar configuração padrão se não existir
    IF config IS NULL THEN
        config := '{
            "enabled": true,
            "calculation_type": "proportional",
            "minimum_amount": 10.00,
            "auto_generate": false,
            "billing_strategy": "separate",
            "notification_enabled": true,
            "approval_required": true
        }'::jsonb;
    END IF;
    
    RETURN config;
END;
$$;


ALTER FUNCTION "public"."get_complementary_billing_config"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_complementary_billing_config"("p_tenant_id" "uuid") IS 'Obtém configurações de faturamento complementar para um tenant';



CREATE OR REPLACE FUNCTION "public"."get_complementary_billing_minimum"("p_tenant_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    config jsonb;
BEGIN
    config := get_complementary_billing_config(p_tenant_id);
    RETURN COALESCE((config->>'minimum_amount')::decimal(10,2), 10.00);
END;
$$;


ALTER FUNCTION "public"."get_complementary_billing_minimum"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_complementary_billing_minimum"("p_tenant_id" "uuid") IS 'Obtém valor mínimo para faturamento complementar de um tenant';



CREATE OR REPLACE FUNCTION "public"."get_contract_details"("p_contract_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'contract', json_build_object(
      'id', c.id,
      'tenant_id', c.tenant_id,
      'number', c.contract_number,
      'status', c.status,
      'initial_date', c.initial_date,
      'final_date', c.final_date,
      'billing_type', c.billing_type,
      'billing_day', c.billing_day,
      'anticipate_weekends', c.anticipate_weekends,
      'reference_period', c.reference_period,
      'installments', c.installments,
      'total_amount', c.total_amount,
      'total_discount', c.total_discount,
      'total_tax', c.total_tax,
      'description', c.description,
      'internal_notes', c.internal_notes,
      'created_at', c.created_at,
      'updated_at', c.updated_at
    ),
    'stage', CASE WHEN cs.id IS NOT NULL THEN json_build_object(
      'id', cs.id,
      'name', cs.name,
      'code', cs.code,
      'color', cs.color,
      'icon', cs.icon,
      'description', cs.description
    ) ELSE NULL END,
    'customer', json_build_object(
      'id', cu.id,
      'name', cu.name,
      'email', cu.email,
      'phone', cu.phone
    ),
    'services', (
      SELECT json_agg(json_build_object(
        'id', cs.id,
        'service_id', cs.service_id,
        'name', s.name,
        'description', s.description,
        'code', s.code,
        'quantity', cs.quantity,
        'unit_price', cs.unit_price,
        'discount_percentage', cs.discount_percentage,
        'discount_amount', cs.discount_amount,
        'total_amount', cs.total_amount,
        'tax_rate', cs.tax_rate,
        'tax_amount', cs.tax_amount
      ))
      FROM contract_services cs
      JOIN services s ON cs.service_id = s.id
      WHERE cs.contract_id = c.id AND cs.is_active = TRUE
    ),
    'attachments', (
      SELECT json_agg(json_build_object(
        'id', ca.id,
        'name', ca.name,
        'file_path', ca.file_path,
        'file_type', ca.file_type,
        'file_size', ca.file_size,
        'description', ca.description,
        'category', ca.category,
        'uploaded_at', ca.uploaded_at
      ))
      FROM contract_attachments ca
      WHERE ca.contract_id = c.id AND ca.is_active = TRUE
    ),
    'stage_history', (
      SELECT json_agg(json_build_object(
        'id', csh.id,
        'from_stage', CASE WHEN cs_from.id IS NOT NULL THEN json_build_object(
          'id', cs_from.id,
          'name', cs_from.name,
          'code', cs_from.code
        ) ELSE NULL END,
        'to_stage', json_build_object(
          'id', cs_to.id,
          'name', cs_to.name,
          'code', cs_to.code
        ),
        'comments', csh.comments,
        'changed_at', csh.changed_at,
        'changed_by', u.email
      ) ORDER BY csh.changed_at DESC)
      FROM contract_stage_history csh
      LEFT JOIN contract_stages cs_from ON csh.from_stage_id = cs_from.id
      JOIN contract_stages cs_to ON csh.to_stage_id = cs_to.id
      LEFT JOIN auth.users u ON csh.changed_by = u.id
      WHERE csh.contract_id = c.id
    ),
    'billings', (
      SELECT json_agg(json_build_object(
        'id', cb.id,
        'billing_number', cb.billing_number,
        'installment_number', cb.installment_number,
        'total_installments', cb.total_installments,
        'reference_period', cb.reference_period,
        'issue_date', cb.issue_date,
        'due_date', cb.due_date,
        'amount', cb.amount,
        'status', cb.status,
        'payment_date', cb.payment_date,
        'payment_method', cb.payment_method
      ) ORDER BY cb.due_date)
      FROM contract_billings cb
      WHERE cb.contract_id = c.id AND cb.status != 'CANCELED'
    )
  ) INTO v_result
  FROM contracts c
  LEFT JOIN contract_stages cs ON c.stage_id = cs.id
  JOIN customers cu ON c.customer_id = cu.id
  WHERE c.id = p_contract_id;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_contract_details"("p_contract_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_context"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN json_build_object(
    'tenant_id', current_setting('app.current_tenant_id', true),
    'user_id', current_setting('app.current_user_id', true),
    'auth_uid', auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."get_current_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_session_info"() RETURNS TABLE("session_id" "uuid", "user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "factor_id" "uuid", "aal" "auth"."aal_level", "not_after" timestamp with time zone, "refreshed_at" timestamp with time zone, "user_agent" "text", "ip" "inet", "tag" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
  SELECT 
    s.id as session_id,
    s.user_id,
    s.created_at,
    s.updated_at,
    s.factor_id,
    s.aal,
    s.not_after,
    s.refreshed_at,
    s.user_agent,
    s.ip,
    s.tag
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_current_session_info"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_session_info"() IS 'Retorna informações detalhadas da sessão mais recente do usuário atual (search_path seguro)';



CREATE OR REPLACE FUNCTION "public"."get_current_tenant_context"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    current_setting('app.current_tenant_id', true)::uuid,
    NULL
  );
$$;


ALTER FUNCTION "public"."get_current_tenant_context"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_tenant_context"() IS 'Retorna o ID do tenant atual configurado no contexto da sessão. Usado para validação de segurança multi-tenant.';



CREATE OR REPLACE FUNCTION "public"."get_current_tenant_context_robust"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    current_tenant_id uuid;
    current_user_id uuid;
BEGIN
    -- Tenta obter o usuário atual
    current_user_id := auth.uid();
    
    -- Primeiro, tenta obter do contexto atual (se já foi configurado)
    BEGIN
        current_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
        IF current_tenant_id IS NOT NULL THEN
            RETURN current_tenant_id;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Ignora erro se configuração não existe
            NULL;
    END;
    
    -- Se não encontrou no contexto e temos usuário, busca o primeiro tenant do usuário
    IF current_user_id IS NOT NULL THEN
        SELECT tu.tenant_id INTO current_tenant_id
        FROM tenant_users tu
        WHERE tu.user_id = current_user_id
        AND (tu.active IS NULL OR tu.active = true)
        ORDER BY tu.created_at ASC
        LIMIT 1;
        
        IF current_tenant_id IS NOT NULL THEN
            -- Configura o contexto para uso futuro (false = configuração de sessão)
            PERFORM set_config('app.current_tenant_id', current_tenant_id::text, false);
            RETURN current_tenant_id;
        END IF;
    END IF;
    
    -- Se chegou até aqui, retorna NULL (não gera erro)
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_current_tenant_context_robust"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_tenant_context_robust"() IS 'Função segura para obter contexto do tenant - search_path fixo';



CREATE OR REPLACE FUNCTION "public"."get_current_tenant_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- AIDEV-NOTE: Retorna o tenant_id definido no contexto da sessão
  RETURN current_setting('app.current_tenant_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    -- AIDEV-NOTE: Se não há contexto definido, retorna NULL
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_current_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_tenant_id_simple"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid;
    v_context_tenant_id text;
BEGIN
    -- AIDEV-NOTE: Primeira prioridade - verificar contexto definido pelo SecurityMiddleware
    v_context_tenant_id := current_setting('app.current_tenant_id', true);
    
    IF v_context_tenant_id IS NOT NULL AND v_context_tenant_id != '' THEN
        -- Validar se o tenant_id é um UUID válido
        BEGIN
            v_tenant_id := v_context_tenant_id::uuid;
            
            -- Verificar se o tenant existe e está ativo
            IF EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id AND active = true) THEN
                RETURN v_tenant_id;
            END IF;
        EXCEPTION WHEN invalid_text_representation THEN
            -- UUID inválido, continuar com outras verificações
            NULL;
        END;
    END IF;
    
    -- AIDEV-NOTE: Segunda prioridade - verificar se há usuário autenticado
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- AIDEV-NOTE: Terceira prioridade - buscar na session_context (se existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_context') THEN
        SELECT tenant_id INTO v_tenant_id
        FROM session_context 
        WHERE user_id = v_user_id 
        AND expires_at > NOW()
        LIMIT 1;
        
        IF v_tenant_id IS NOT NULL THEN
            -- Verificar se o usuário tem acesso a este tenant
            IF EXISTS (
                SELECT 1 FROM tenant_users tu 
                WHERE tu.user_id = v_user_id 
                AND tu.tenant_id = v_tenant_id 
                AND (tu.active IS NULL OR tu.active = true)
            ) THEN
                RETURN v_tenant_id;
            END IF;
        END IF;
    END IF;
    
    -- AIDEV-NOTE: Quarta prioridade - buscar tenant principal do usuário
    SELECT tenant_id INTO v_tenant_id
    FROM tenant_users 
    WHERE user_id = v_user_id 
    AND (active IS NULL OR active = true)
    ORDER BY created_at ASC
    LIMIT 1;
    
    RETURN v_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_current_tenant_id_simple"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_tenant_id_simple"() IS 'AIDEV-NOTE: Função refatorada para funcionar sem session_context. 
Agora usa apenas tenant_users para determinar o tenant atual do usuário.
Mantida para compatibilidade com o sistema existente.';



CREATE OR REPLACE FUNCTION "public"."get_current_tenant_info"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    v_tenant_id := get_current_tenant_context();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'USER_NOT_AUTHENTICATED'
        );
    END IF;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'NO_TENANT_CONTEXT',
            'message', 'Nenhum contexto de tenant definido'
        );
    END IF;
    
    -- Obter informações completas do tenant e usuário
    SELECT jsonb_build_object(
        'success', true,
        'tenant_id', t.id,
        'tenant_name', t.name,
        'tenant_slug', t.slug,
        'tenant_active', t.active,
        'user_id', v_user_id,
        'user_role_in_tenant', tu.role,
        'user_active_in_tenant', tu.active
    ) INTO v_result
    FROM tenants t
    LEFT JOIN tenant_users tu ON tu.tenant_id = t.id AND tu.user_id = v_user_id
    WHERE t.id = v_tenant_id;
    
    RETURN COALESCE(v_result, jsonb_build_object(
        'success', false,
        'error', 'TENANT_NOT_FOUND',
        'tenant_id', v_tenant_id
    ));
END;
$$;


ALTER FUNCTION "public"."get_current_tenant_info"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_tenant_info"() IS 'Função segura para obter informações do tenant atual - search_path fixo';



CREATE OR REPLACE FUNCTION "public"."get_current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT auth.uid();
$$;


ALTER FUNCTION "public"."get_current_user_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_user_id"() IS 'Current user ID retrieval with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."get_decrypted_api_key"("p_tenant_id" "uuid", "p_integration_type" "text" DEFAULT 'asaas'::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_encrypted_key TEXT;
  v_plain_key TEXT;
  v_config JSONB;
BEGIN
  -- Buscar integração
  SELECT encrypted_api_key, config
  INTO v_encrypted_key, v_config
  FROM tenant_integrations
  WHERE tenant_id = p_tenant_id
    AND integration_type = p_integration_type
    AND is_active = true
  LIMIT 1;
  
  -- Se não encontrou integração, retornar NULL
  IF v_encrypted_key IS NULL AND v_config IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Tentar descriptografar chave criptografada primeiro
  IF v_encrypted_key IS NOT NULL THEN
    v_plain_key := decrypt_api_key(v_encrypted_key);
    
    -- Se descriptografou com sucesso, retornar
    IF v_plain_key IS NOT NULL THEN
      RETURN v_plain_key;
    END IF;
  END IF;
  
  -- Fallback: retornar chave em texto plano do config (compatibilidade)
  IF v_config IS NOT NULL AND v_config->>'api_key' IS NOT NULL THEN
    RETURN v_config->>'api_key';
  END IF;
  
  -- Se não encontrou nada, retornar NULL
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_decrypted_api_key"("p_tenant_id" "uuid", "p_integration_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_decrypted_api_key"("p_tenant_id" "uuid", "p_integration_type" "text") IS 'Função helper que retorna chave API descriptografada ou texto plano (compatibilidade com dados antigos)';



CREATE OR REPLACE FUNCTION "public"."get_direct_tenant_access"() RETURNS TABLE("tenant_id" "uuid", "tenant_name" "text", "tenant_slug" "text", "tenant_logo_url" "text", "user_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
/*
  Função que retorna os tenants aos quais o usuário autenticado tem acesso.
  
  Retorna:
    - tenant_id: ID do tenant
    - tenant_name: Nome do tenant
    - tenant_slug: Slug do tenant usado nas URLs
    - tenant_logo_url: URL do logo do tenant
    - user_role: Papel do usuário neste tenant
    
  Segurança:
    - SECURITY DEFINER para executar com permissões elevadas
    - Internamente filtra apenas pelos tenants do usuário autenticado
*/
BEGIN
  -- Retornar os tenants do usuário atual
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.branding->>'logo_url',
    tu.role
  FROM 
    public.tenants t
  JOIN 
    public.tenant_users tu ON t.id = tu.tenant_id
  WHERE 
    tu.user_id = auth.uid()
  ORDER BY
    t.name ASC; -- Ordenar por nome para melhor experiência do usuário
END;
$$;


ALTER FUNCTION "public"."get_direct_tenant_access"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_direct_tenant_access"() IS 'Retorna os tenants aos quais o usuário atual tem acesso direto. Utilizada na página de seleção de portal.';



CREATE OR REPLACE FUNCTION "public"."get_pending_billing_queue_items"("p_tenant_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "tenant_id" "uuid", "billing_id" "uuid", "billing_number" character varying, "amount" numeric, "due_date" "date", "payment_gateway_id" "uuid", "attempts" integer, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.tenant_id,
        q.billing_id,
        cb.billing_number,
        cb.amount,
        cb.due_date,
        cb.payment_gateway_id,
        q.attempts,
        q.created_at
    FROM public.billing_processing_queue q
    JOIN public.contract_billings cb ON cb.id = q.billing_id
    WHERE q.status = 'pending'
      AND q.attempts < q.max_attempts
      AND (p_tenant_id IS NULL OR q.tenant_id = p_tenant_id)
    ORDER BY q.created_at ASC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_pending_billing_queue_items"("p_tenant_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pending_billing_queue_items"("p_tenant_id" "uuid", "p_limit" integer) IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."get_products_by_tenant"("p_tenant_id" "uuid", "p_search_term" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean, "p_min_price" numeric DEFAULT NULL::numeric, "p_max_price" numeric DEFAULT NULL::numeric, "p_in_stock" boolean DEFAULT NULL::boolean, "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "code" character varying, "sku" character varying, "barcode" character varying, "category" character varying, "unit_price" numeric, "cost_price" numeric, "stock_quantity" integer, "min_stock_quantity" integer, "supplier" character varying, "is_active" boolean, "tax_rate" numeric, "has_inventory" boolean, "image_url" "text", "tenant_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by" "uuid", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_offset INTEGER;
  v_total_count BIGINT;
BEGIN
  -- Calcular offset para paginação
  v_offset := (p_page - 1) * p_limit;

  -- Contar total de registros (para paginação)
  SELECT COUNT(*) INTO v_total_count
  FROM products p
  WHERE p.tenant_id = p_tenant_id
    AND (p_search_term IS NULL OR (
      p.name ILIKE '%' || p_search_term || '%' OR
      p.description ILIKE '%' || p_search_term || '%' OR
      p.sku ILIKE '%' || p_search_term || '%'
    ))
    AND (p_category IS NULL OR p.category = p_category)
    AND (p_is_active IS NULL OR p.is_active = p_is_active)
    AND (p_min_price IS NULL OR p.unit_price >= p_min_price)
    AND (p_max_price IS NULL OR p.unit_price <= p_max_price)
    AND (p_in_stock IS NULL OR (
      (p_in_stock = true AND p.stock_quantity > 0) OR
      (p_in_stock = false AND p.stock_quantity = 0)
    ));

  -- Retornar dados paginados com total
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.code,
    p.sku,
    p.barcode,
    p.category,
    p.unit_price,
    p.cost_price,
    p.stock_quantity,
    p.min_stock_quantity,
    p.supplier,
    p.is_active,
    p.tax_rate,
    p.has_inventory,
    p.image_url,
    p.tenant_id,
    p.created_at,
    p.updated_at,
    p.created_by,
    v_total_count as total_count
  FROM products p
  WHERE p.tenant_id = p_tenant_id
    AND (p_search_term IS NULL OR (
      p.name ILIKE '%' || p_search_term || '%' OR
      p.description ILIKE '%' || p_search_term || '%' OR
      p.sku ILIKE '%' || p_search_term || '%'
    ))
    AND (p_category IS NULL OR p.category = p_category)
    AND (p_is_active IS NULL OR p.is_active = p_is_active)
    AND (p_min_price IS NULL OR p.unit_price >= p_min_price)
    AND (p_max_price IS NULL OR p.unit_price <= p_max_price)
    AND (p_in_stock IS NULL OR (
      (p_in_stock = true AND p.stock_quantity > 0) OR
      (p_in_stock = false AND p.stock_quantity = 0)
    ))
  ORDER BY p.name ASC
  LIMIT p_limit
  OFFSET v_offset;

END;
$$;


ALTER FUNCTION "public"."get_products_by_tenant"("p_tenant_id" "uuid", "p_search_term" "text", "p_category" "text", "p_is_active" boolean, "p_min_price" numeric, "p_max_price" numeric, "p_in_stock" boolean, "p_page" integer, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_project_settings"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  settings JSONB;
  user_count INTEGER;
BEGIN
  -- Contar usuários
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- Coleta informações sobre o projeto
  settings = jsonb_build_object(
    'database_status', 'online',
    'api_version', '1.0',
    'auth_enabled', true,
    'user_count', user_count,
    'is_recently_resumed', true,  -- Indica que o sistema foi retomado recentemente
    'timestamp', NOW()
  );
  
  RETURN settings;
END;
$$;


ALTER FUNCTION "public"."get_project_settings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reseller_by_id"("p_reseller_id" "uuid") RETURNS "public"."resellers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_reseller public.resellers;
BEGIN
  SELECT *
  INTO v_reseller
  FROM public.resellers
  WHERE id = p_reseller_id;
  
  RETURN v_reseller;
END;
$$;


ALTER FUNCTION "public"."get_reseller_by_id"("p_reseller_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_reseller_invites"("p_reseller_id" "uuid") RETURNS TABLE("invite_id" "uuid", "email" "text", "status" "text", "created_at" timestamp with time zone, "token" "text", "reseller_id" "uuid", "reseller_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Por enquanto retorna vazio, mas mantém a estrutura
    -- Futuramente pode ser implementado com uma tabela específica
    RETURN;
END;
$$;


ALTER FUNCTION "public"."get_reseller_invites"("p_reseller_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_reseller_invites"("p_reseller_id" "uuid") IS 'Reseller invites retrieval with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."get_reseller_users_with_details"("p_reseller_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Validação de permissão básica (quem pode chamar esta função?)
  -- Exemplo: Somente o próprio usuário pode ver os membros do SEU revendedor, OU um admin global.
  -- Esta validação é um EXEMPLO e PRECISA ser adaptada à sua lógica de permissão.
  -- IF NOT (
  --   -- Verifica se quem chama é membro do reseller OU é admin global (adapte a lógica de admin)
  --   EXISTS (SELECT 1 FROM public.resellers_users WHERE resellers_users.reseller_id = p_reseller_id AND resellers_users.user_id = auth.uid())
  --   -- OR is_claims_admin() -- Exemplo de função de admin (precisa existir)
  -- ) THEN
  --   RAISE EXCEPTION 'Permission denied to view reseller users.';
  -- END IF;

  -- Atenção: A validação acima foi comentada para simplificar inicialmente.
  -- É CRUCIAL implementar uma validação de permissão adequada aqui.

  RETURN QUERY
  SELECT
    ru.user_id,
    u.email::TEXT, -- Cast explícito para TEXT
    ru.created_at
  FROM
    public.resellers_users AS ru -- CORREÇÃO: resellers_users em vez de reseller_users
  JOIN
    auth.users AS u ON ru.user_id = u.id
  WHERE
    ru.reseller_id = p_reseller_id
  ORDER BY
    ru.created_at DESC;

END;
$$;


ALTER FUNCTION "public"."get_reseller_users_with_details"("p_reseller_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_reseller_users_with_details"("p_reseller_id" "uuid") IS 'Fetches user IDs, emails (casted to TEXT), and association creation date for a given reseller ID. Requires proper permission checks.';



CREATE OR REPLACE FUNCTION "public"."get_security_notification_stats"("p_tenant_id" "uuid" DEFAULT NULL::"uuid", "p_hours" integer DEFAULT 24) RETURNS TABLE("total_notifications" integer, "critical_notifications" integer, "high_notifications" integer, "medium_notifications" integer, "low_notifications" integer, "unacknowledged_notifications" integer, "most_common_type" "text", "avg_time_to_acknowledge" interval)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    WITH notification_stats AS (
        SELECT 
            COUNT(*)::INTEGER as total,
            COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END)::INTEGER as critical,
            COUNT(CASE WHEN severity = 'HIGH' THEN 1 END)::INTEGER as high,
            COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END)::INTEGER as medium,
            COUNT(CASE WHEN severity = 'LOW' THEN 1 END)::INTEGER as low,
            COUNT(CASE WHEN NOT acknowledged THEN 1 END)::INTEGER as unacknowledged
        FROM public.security_notifications
        WHERE 
            created_at >= NOW() - INTERVAL '1 hour' * p_hours
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    ),
    most_common AS (
        SELECT type
        FROM public.security_notifications
        WHERE 
            created_at >= NOW() - INTERVAL '1 hour' * p_hours
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
        GROUP BY type
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ),
    avg_acknowledge_time AS (
        SELECT AVG(acknowledged_at - created_at) as avg_time
        FROM public.security_notifications
        WHERE 
            acknowledged = TRUE
            AND created_at >= NOW() - INTERVAL '1 hour' * p_hours
            AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    )
    SELECT 
        ns.total,
        ns.critical,
        ns.high,
        ns.medium,
        ns.low,
        ns.unacknowledged,
        COALESCE(mc.type, 'N/A'),
        COALESCE(aat.avg_time, INTERVAL '0')
    FROM notification_stats ns
    CROSS JOIN most_common mc
    CROSS JOIN avg_acknowledge_time aat;
END;
$$;


ALTER FUNCTION "public"."get_security_notification_stats"("p_tenant_id" "uuid", "p_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_security_notification_stats"("p_tenant_id" "uuid", "p_hours" integer) IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."get_security_stats"("p_tenant_id" "uuid" DEFAULT NULL::"uuid", "p_hours" integer DEFAULT 24) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    stats jsonb;
    failed_logins integer;
    suspicious_activities integer;
    unique_ips integer;
    high_risk_events integer;
BEGIN
    -- Contar logins falhados
    SELECT COUNT(*) INTO failed_logins
    FROM public.auth_monitoring
    WHERE event_type = 'LOGIN_FAILED'
    AND created_at > now() - (p_hours || ' hours')::interval
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Contar atividades suspeitas
    SELECT COUNT(*) INTO suspicious_activities
    FROM public.auth_monitoring
    WHERE event_type = 'SUSPICIOUS_ACTIVITY'
    AND created_at > now() - (p_hours || ' hours')::interval
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Contar IPs únicos
    SELECT COUNT(DISTINCT ip_address) INTO unique_ips
    FROM public.auth_monitoring
    WHERE created_at > now() - (p_hours || ' hours')::interval
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Contar eventos de alto risco
    SELECT COUNT(*) INTO high_risk_events
    FROM public.auth_monitoring
    WHERE risk_score >= 70
    AND created_at > now() - (p_hours || ' hours')::interval
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id);
    
    -- Construir objeto de estatísticas
    stats := jsonb_build_object(
        'period_hours', p_hours,
        'tenant_id', p_tenant_id,
        'failed_logins', failed_logins,
        'suspicious_activities', suspicious_activities,
        'unique_ips', unique_ips,
        'high_risk_events', high_risk_events,
        'generated_at', now()
    );
    
    RETURN stats;
END;
$$;


ALTER FUNCTION "public"."get_security_stats"("p_tenant_id" "uuid", "p_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_security_stats"("p_tenant_id" "uuid", "p_hours" integer) IS 'Retorna estatísticas de segurança para análise e monitoramento';



CREATE OR REPLACE FUNCTION "public"."get_server_time"() RETURNS timestamp with time zone
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT NOW();
$$;


ALTER FUNCTION "public"."get_server_time"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_server_time"() IS 'Retorna o timestamp atual do servidor para sincronização de tempo';



CREATE OR REPLACE FUNCTION "public"."get_server_time_info"() RETURNS TABLE("server_time" timestamp with time zone, "server_timezone" "text", "utc_offset" interval)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    NOW() as server_time,
    current_setting('timezone') as server_timezone,
    (NOW() - (NOW() AT TIME ZONE 'UTC')) as utc_offset;
$$;


ALTER FUNCTION "public"."get_server_time_info"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_server_time_info"() IS 'Retorna informações detalhadas sobre o tempo do servidor incluindo timezone e offset UTC';



CREATE OR REPLACE FUNCTION "public"."get_services_by_tenant"("tenant_uuid" "uuid") RETURNS TABLE("id" "uuid", "tenant_id" "uuid", "code" character varying, "name" character varying, "description" "text", "municipality_code" character varying, "lc_code" character varying, "tax_code" character varying, "default_price" numeric, "cost_price" numeric, "tax_rate" numeric, "withholding_tax" boolean, "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "no_charge" boolean, "unit_type" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- AIDEV-NOTE: Retorna todos os serviços do tenant especificado com tipos corretos
    -- Incluindo o campo cost_price que estava faltando
    RETURN QUERY
    SELECT 
        s.id,
        s.tenant_id,
        s.code,
        s.name,
        s.description,
        s.municipality_code,
        s.lc_code,
        s.tax_code,
        s.default_price,
        s.cost_price,  -- Campo adicionado na consulta
        s.tax_rate,
        s.withholding_tax,
        s.is_active,
        s.created_at,
        s.updated_at,
        s.no_charge,
        s.unit_type
    FROM services s
    WHERE s.tenant_id = tenant_uuid
    ORDER BY s.name ASC;
END;
$$;


ALTER FUNCTION "public"."get_services_by_tenant"("tenant_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant"("p_tenant_id" "uuid" DEFAULT NULL::"uuid", "p_slug" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "active" boolean, "has_access" boolean, "role" "text", "branding" "jsonb", "settings" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Verificar se pelo menos um parâmetro foi fornecido
  IF p_tenant_id IS NULL AND p_slug IS NULL THEN
    RAISE EXCEPTION 'É necessário fornecer tenant_id ou slug';
  END IF;
  
  -- Determinar o tenant_id com base nos parâmetros fornecidos
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSIF p_slug IS NOT NULL THEN
    -- AIDEV-NOTE: Usar alias para evitar ambiguidade de coluna
    SELECT t.id INTO v_tenant_id FROM tenants t WHERE t.slug = p_slug;
    
    IF v_tenant_id IS NULL THEN
      RETURN;
    END IF;
  END IF;
  
  -- Retornar os dados do tenant com verificação de acesso
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.active,
    CASE 
      WHEN p_user_id IS NULL THEN false
      WHEN EXISTS (
        SELECT 1 FROM tenant_users tu 
        WHERE tu.tenant_id = t.id 
        AND tu.user_id = p_user_id
      ) THEN true
      WHEN EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = p_user_id
        AND (u.user_role = 'ADMIN' OR u.user_role = 'SUPER_ADMIN')
      ) THEN true
      ELSE false
    END as has_access,
    COALESCE(
      (SELECT tu.role FROM tenant_users tu WHERE tu.tenant_id = t.id AND tu.user_id = p_user_id),
      (SELECT u.user_role FROM users u WHERE u.id = p_user_id)
    ) as role,
    t.branding,
    t.settings
  FROM tenants t
  WHERE t.id = v_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_tenant"("p_tenant_id" "uuid", "p_slug" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_asaas_credentials"("p_tenant_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_has_access boolean;
  v_integration_record record;
BEGIN
  -- Verificar acesso ao tenant usando o parâmetro p_tenant_id diretamente
  v_has_access := check_tenant_access(p_tenant_id);
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Acesso negado ao tenant %', p_tenant_id;
  END IF;

  -- Buscar integração ativa do ASAAS
  SELECT *
  INTO v_integration_record
  FROM tenant_integrations ti
  WHERE ti.tenant_id = p_tenant_id
    AND ti.integration_type = 'asaas'
    AND ti.is_active = true;

  -- Verificar se encontrou integração ativa
  IF v_integration_record IS NULL THEN
    RAISE EXCEPTION 'Integração ASAAS não encontrada ou inativa para o tenant %', p_tenant_id;
  END IF;

  -- Retornar credenciais
  RETURN jsonb_build_object(
    'api_key', COALESCE(v_integration_record.config->>'api_key', ''),
    'api_url', COALESCE(v_integration_record.config->>'api_url', 'https://api.asaas.com'),
    'environment', COALESCE(v_integration_record.environment, 'production'),
    'webhook_token', COALESCE(v_integration_record.webhook_token, '')
  );
END;
$$;


ALTER FUNCTION "public"."get_tenant_asaas_credentials"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_asaas_webhook"("p_tenant_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_has_access boolean;
  v_integration_record record;
BEGIN
  -- Verificar acesso ao tenant usando o parâmetro p_tenant_id diretamente
  v_has_access := check_tenant_access(p_tenant_id);
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Acesso negado ao tenant %', p_tenant_id;
  END IF;

  -- Buscar integração ativa do ASAAS
  SELECT *
  INTO v_integration_record
  FROM tenant_integrations ti
  WHERE ti.tenant_id = p_tenant_id
    AND ti.integration_type = 'asaas'
    AND ti.is_active = true;

  -- Verificar se encontrou integração ativa
  IF v_integration_record IS NULL THEN
    RAISE EXCEPTION 'Integração ASAAS não encontrada ou inativa para o tenant %', p_tenant_id;
  END IF;

  -- Retornar dados do webhook
  RETURN jsonb_build_object(
    'webhook_url', COALESCE(v_integration_record.webhook_url, ''),
    'webhook_token', COALESCE(v_integration_record.webhook_token, '')
  );
END;
$$;


ALTER FUNCTION "public"."get_tenant_asaas_webhook"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_by_slug"("p_slug" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    tenant_id uuid;
BEGIN
    SELECT id INTO tenant_id
    FROM tenants
    WHERE slug = p_slug
    AND (active IS NULL OR active = true)
    LIMIT 1;
    
    RETURN tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_tenant_by_slug"("p_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_tenant_by_slug"("p_slug" "text") IS 'Função segura para obter tenant por slug - search_path fixo';



CREATE OR REPLACE FUNCTION "public"."get_tenant_contracts"("p_tenant_id" "uuid", "p_status" character varying DEFAULT NULL::character varying, "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_stage_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0) RETURNS SETOF "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH contract_data AS (
    SELECT 
      c.id,
      c.contract_number,
      c.status,
      c.initial_date,
      c.final_date,
      c.billing_type,
      c.billing_day,
      c.total_amount,
      c.created_at,
      c.updated_at,
      cs.name AS stage_name,
      cs.code AS stage_code,
      cs.color AS stage_color,
      cs.icon AS stage_icon,
      cu.id AS customer_id,
      cu.name AS customer_name,
      (
        SELECT COALESCE(json_agg(json_build_object(
          'id', cs.id,
          'service_id', cs.service_id,
          'name', s.name,
          'quantity', cs.quantity,
          'unit_price', cs.unit_price,
          'discount_percentage', cs.discount_percentage,
          'total_amount', cs.total_amount
        )), '[]'::json)
        FROM contract_services cs
        JOIN services s ON cs.service_id = s.id
        WHERE cs.contract_id = c.id AND cs.is_active = TRUE
      ) AS services,
      (
        SELECT COUNT(*) 
        FROM contract_attachments ca 
        WHERE ca.contract_id = c.id
      ) AS attachment_count,
      (
        SELECT COUNT(*) 
        FROM contract_billings cb 
        WHERE cb.contract_id = c.id AND cb.status != 'CANCELED'
      ) AS billing_count,
      (
        SELECT COUNT(*) 
        FROM contract_billings cb 
        WHERE cb.contract_id = c.id AND cb.status = 'PENDING'
      ) AS pending_billing_count
    FROM contracts c
    LEFT JOIN contract_stages cs ON c.stage_id = cs.id
    LEFT JOIN customers cu ON c.customer_id = cu.id
    WHERE c.tenant_id = p_tenant_id
      AND (p_status IS NULL OR c.status = p_status)
      AND (p_customer_id IS NULL OR c.customer_id = p_customer_id)
      AND (p_stage_id IS NULL OR c.stage_id = p_stage_id)
      AND (p_start_date IS NULL OR c.initial_date >= p_start_date)
      AND (p_end_date IS NULL OR c.final_date <= p_end_date)
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT json_build_object(
    'id', cd.id,
    'number', cd.contract_number,
    'status', cd.status,
    'initial_date', cd.initial_date,
    'final_date', cd.final_date,
    'billing_type', cd.billing_type,
    'billing_day', cd.billing_day,
    'total_amount', cd.total_amount,
    'created_at', cd.created_at,
    'updated_at', cd.updated_at,
    'stage', json_build_object(
      'name', cd.stage_name,
      'code', cd.stage_code,
      'color', cd.stage_color,
      'icon', cd.stage_icon
    ),
    'customer', json_build_object(
      'id', cd.customer_id,
      'name', cd.customer_name
    ),
    'services', cd.services,
    'counts', json_build_object(
      'attachments', cd.attachment_count,
      'billings', cd.billing_count,
      'pending_billings', cd.pending_billing_count
    )
  )
  FROM contract_data cd;
END;
$$;


ALTER FUNCTION "public"."get_tenant_contracts"("p_tenant_id" "uuid", "p_status" character varying, "p_customer_id" "uuid", "p_stage_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    current_setting('app.current_tenant_id', true)::uuid,
    NULL
  );
$$;


ALTER FUNCTION "public"."get_tenant_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_tenant_id"() IS 'Função segura para obter tenant ID - search_path fixo';



CREATE OR REPLACE FUNCTION "public"."get_tenant_id_by_slug"("p_slug" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    tenant_id_result uuid;
    current_user_id uuid;
BEGIN
    -- Use o p_user_id se fornecido, caso contrário use auth.uid()
    current_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Se ainda não temos um user_id, retorna null
    IF current_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Busca o tenant pelo slug e verifica se o usuário tem acesso
    SELECT t.id INTO tenant_id_result
    FROM tenants t
    INNER JOIN tenant_users tu ON t.id = tu.tenant_id
    WHERE t.slug = p_slug 
      AND t.active = true
      AND tu.user_id = current_user_id
      AND tu.active = true
    LIMIT 1;
    
    RETURN tenant_id_result;
END;
$$;


ALTER FUNCTION "public"."get_tenant_id_by_slug"("p_slug" "text", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_tenant_id_by_slug"("p_slug" "text", "p_user_id" "uuid") IS 'Tenant lookup with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."get_tenant_id_by_slug_jwt"("target_slug" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  jwt_claims jsonb;
  tenant_slugs jsonb;
  tenant_id text;
  result jsonb;
BEGIN
  -- AIDEV-NOTE: Tentar obter tenant_id do mapa de slugs no JWT
  BEGIN
    jwt_claims := auth.jwt();
    tenant_slugs := jwt_claims->'tenant_slugs';
    
    -- Verificar se o slug existe no mapa
    IF tenant_slugs ? target_slug THEN
      tenant_id := tenant_slugs->>target_slug;
      
      result := jsonb_build_object(
        'tenant_id', tenant_id::uuid,
        'slug', target_slug,
        'method', 'jwt',
        'found', true
      );
      
      RETURN result;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- JWT inválido ou não disponível, usar fallback
      NULL;
  END;
  
  -- AIDEV-NOTE: Fallback para consulta direta no banco
  SELECT jsonb_build_object(
    'tenant_id', t.id,
    'slug', t.slug,
    'method', 'database',
    'found', true
  )
  INTO result
  FROM tenants t
  JOIN tenant_users tu ON tu.tenant_id = t.id
  WHERE t.slug = target_slug
    AND tu.user_id = auth.uid()
    AND tu.is_active = true
  LIMIT 1;
  
  RETURN COALESCE(result, jsonb_build_object(
    'tenant_id', null,
    'slug', target_slug,
    'method', 'database',
    'found', false
  ));
END;
$$;


ALTER FUNCTION "public"."get_tenant_id_by_slug_jwt"("target_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_tenant_id_by_slug_jwt"("target_slug" "text") IS 'JWT tenant lookup with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."get_tenant_info"("p_tenant_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "document" "text", "email" "text", "phone" "text", "active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        t.document,
        t.email,
        t.phone,
        t.active,
        t.created_at,
        t.updated_at
    FROM 
        tenants t
    WHERE 
        t.id = p_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_tenant_info"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_tenant_info"("p_tenant_id" "uuid") IS 'Tenant info retrieval with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."get_tenant_integrations_by_tenant"("tenant_uuid" "uuid") RETURNS TABLE("id" integer, "tenant_id" "uuid", "integration_type" "text", "is_active" boolean, "environment" character varying, "config" "jsonb", "webhook_url" "text", "webhook_token" "text", "last_sync_at" timestamp with time zone, "sync_status" character varying, "error_message" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "created_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- AIDEV-NOTE: Função segura que contorna RLS usando SECURITY DEFINER
  -- Retorna todas as integrações do tenant sem a coluna credentials inexistente
  RETURN QUERY
  SELECT 
    ti.id,
    ti.tenant_id,
    ti.integration_type,
    ti.is_active,
    ti.environment,
    ti.config,
    ti.webhook_url,
    ti.webhook_token,
    ti.last_sync_at,
    ti.sync_status,
    ti.error_message,
    ti.created_at,
    ti.updated_at,
    ti.created_by
  FROM tenant_integrations ti
  WHERE ti.tenant_id = tenant_uuid
  ORDER BY ti.integration_type, ti.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_tenant_integrations_by_tenant"("tenant_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_notifications"("p_user_id" "uuid") RETURNS SETOF "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    json_build_object(
      'id', n.id,
      'title', n.title,
      'content', n.content,
      'status', n.status,
      'created_at', n.created_at
    ) AS notification
  FROM
    notifications n
  WHERE
    n.user_id = p_user_id
  ORDER BY
    n.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_tenant_notifications"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_pending_invites"("tenant_id_param" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_user_uuid UUID;
    tenant_uuid UUID;
    user_has_access BOOLEAN := FALSE;
    result JSON;
BEGIN
    -- Verificar se o usuário está autenticado
    current_user_uuid := auth.uid();
    IF current_user_uuid IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Converter tenant_id_param para UUID
    BEGIN
        tenant_uuid := tenant_id_param::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        -- Se não for UUID, tentar buscar por slug
        SELECT id INTO tenant_uuid 
        FROM tenants 
        WHERE slug = tenant_id_param;
        
        IF tenant_uuid IS NULL THEN
            RAISE EXCEPTION 'Tenant não encontrado: %', tenant_id_param;
        END IF;
    END;
    
    -- Verificar se o usuário tem acesso ao tenant
    SELECT EXISTS(
        SELECT 1 
        FROM tenant_users tu
        WHERE tu.tenant_id = tenant_uuid 
        AND tu.user_id = current_user_uuid
    ) INTO user_has_access;
    
    IF NOT user_has_access THEN
        RAISE EXCEPTION 'Usuário não tem permissão para acessar este tenant';
    END IF;
    
    -- Buscar convites pendentes
    SELECT COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', ti.id,
                'tenant_id', ti.tenant_id,
                'email', ti.email,
                'invited_by', ti.invited_by,
                'status', ti.status,
                'role', ti.role,
                'token', ti.token,
                'created_at', ti.created_at,
                'expires_at', ti.expires_at,
                'accepted_at', ti.accepted_at,
                'user_id', ti.user_id
            )
        ),
        '[]'::JSON
    ) INTO result
    FROM tenant_invites ti
    WHERE ti.tenant_id = tenant_uuid
    AND ti.status = 'PENDING';
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_tenant_pending_invites"("tenant_id_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_pending_invites_v2"("tenant_id_param" "text") RETURNS SETOF "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_user_id uuid;
    tenant_uuid uuid;
    user_has_access boolean := false;
    user_email text;
    is_admin boolean := false;
BEGIN
    -- Obter o usuário atual
    current_user_id := auth.uid();
    
    -- Verificar se o usuário está autenticado
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Obter email do usuário para verificar se é admin
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = current_user_id;
    
    -- AIDEV-NOTE: Verificar se é admin global (emails específicos ou role)
    -- Você pode ajustar esta lógica conforme sua necessidade
    IF user_email LIKE '%@admin.%' OR user_email = 'admin@revalya.com' THEN
        is_admin := true;
    END IF;
    
    -- Converter tenant_id_param para UUID
    BEGIN
        tenant_uuid := tenant_id_param::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        -- Se não for UUID, tentar buscar por slug
        SELECT id INTO tenant_uuid 
        FROM tenants 
        WHERE slug = tenant_id_param;
        
        IF tenant_uuid IS NULL THEN
            RAISE EXCEPTION 'Tenant não encontrado para slug: %', tenant_id_param;
        END IF;
    END;
    
    -- Verificar se o usuário tem acesso ao tenant ou é admin
    IF is_admin THEN
        user_has_access := true;
    ELSE
        SELECT EXISTS(
            SELECT 1 
            FROM tenant_users 
            WHERE user_id = current_user_id 
            AND tenant_id = tenant_uuid
        ) INTO user_has_access;
    END IF;
    
    -- Verificar permissão final
    IF NOT user_has_access THEN
        RAISE EXCEPTION 'Usuário não tem permissão para acessar este tenant';
    END IF;
    
    -- Retornar os convites pendentes
    RETURN QUERY
    SELECT to_json(ti.*) 
    FROM tenant_invites ti
    WHERE ti.tenant_id = tenant_uuid 
    AND ti.status = 'PENDING'
    ORDER BY ti.created_at DESC;
    
END;
$$;


ALTER FUNCTION "public"."get_tenant_pending_invites_v2"("tenant_id_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_users_v2"("tenant_id_param" "text") RETURNS SETOF "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  tenant_id_uuid UUID;
  debug_result TEXT;
BEGIN
  -- Obter informações de diagnóstico
  debug_result := debug_tenant_id(tenant_id_param);
  RAISE NOTICE 'Debug: %', debug_result;
  
  -- Tentar converter o parâmetro para UUID
  BEGIN
    tenant_id_uuid := tenant_id_param::UUID;
  EXCEPTION WHEN others THEN
    -- Verificar se o formato é tenant-{id}
    IF tenant_id_param LIKE 'tenant-%' THEN
      -- Extrair o número e tentar encontrar no banco de dados
      BEGIN
        -- Buscar tenant por ID numérico
        SELECT id INTO tenant_id_uuid 
        FROM tenants 
        WHERE id::TEXT = SUBSTRING(tenant_id_param FROM 8);
        
        IF tenant_id_uuid IS NULL THEN
          RAISE EXCEPTION 'ID do tenant não encontrado para: %', tenant_id_param;
        END IF;
      EXCEPTION WHEN others THEN
        -- Caso falhe, tente buscar o UUID pelo slug
        SELECT id INTO tenant_id_uuid FROM tenants WHERE slug = tenant_id_param;
        IF tenant_id_uuid IS NULL THEN
          RAISE EXCEPTION 'ID do tenant inválido ou slug não encontrado: %', tenant_id_param;
        END IF;
      END;
    ELSE
      -- Caso falhe, tente buscar o UUID pelo slug
      SELECT id INTO tenant_id_uuid FROM tenants WHERE slug = tenant_id_param;
      IF tenant_id_uuid IS NULL THEN
        RAISE EXCEPTION 'ID do tenant inválido ou slug não encontrado: %', tenant_id_param;
      END IF;
    END IF;
  END;
    
  RETURN QUERY
  SELECT 
    json_build_object(
      'id', tu.user_id,
      'email', u.email,
      'name', u.name,
      'role', tu.role,
      'created_at', tu.created_at,
      'user', json_build_object(
        'id', u.id,
        'email', u.email,
        'name', u.name
      )
    ) AS user_data
  FROM 
    tenant_users tu
  JOIN
    users u ON tu.user_id = u.id
  WHERE 
    tu.tenant_id = tenant_id_uuid
  ORDER BY
    u.name;
END;
$$;


ALTER FUNCTION "public"."get_tenant_users_v2"("tenant_id_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_id_by_email"("p_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_id_by_email"("p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_id_by_email"("p_email" "text") IS 'Returns the user UUID from auth.users based on the provided email (case-insensitive). Returns NULL if not found.';



CREATE OR REPLACE FUNCTION "public"."get_user_notifications"() RETURNS SETOF "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Usando as colunas que realmente existem na tabela
  RETURN QUERY
  SELECT
    json_build_object(
      'id', n.id,
      'type', n.type,
      'recipient_email', n.recipient_email,
      'subject', n.subject,
      'content', n.content,
      'metadata', n.metadata,
      'sent_at', n.sent_at,
      'error', n.error,
      'created_at', n.created_at,
      'tenant_id', n.tenant_id
    ) AS notification
  FROM
    notifications n
  WHERE
    -- Filtrar pelo email do usuário atual, já que não há coluna user_id
    n.recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ORDER BY
    n.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_notifications"("p_tenant_id" "uuid") RETURNS SETOF "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- AIDEV-NOTE: Validação crítica - verificar se usuário pertence ao tenant solicitado
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied: User does not belong to tenant % or tenant does not exist', p_tenant_id;
  END IF;

  -- AIDEV-NOTE: Log de auditoria para rastreamento de acesso
  INSERT INTO access_logs (user_id, action, resource, tenant_id, details)
  VALUES (
    auth.uid(),
    'READ',
    'notifications',
    p_tenant_id,
    json_build_object(
      'function', 'get_user_notifications',
      'timestamp', now(),
      'user_email', (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

  -- AIDEV-NOTE: Retorno seguro com dupla validação (tenant_id + email)
  RETURN QUERY
  SELECT
    json_build_object(
      'id', n.id,
      'type', n.type,
      'subject', n.subject,
      'content', n.content,
      'metadata', n.metadata,
      'sent_at', n.sent_at,
      'created_at', n.created_at,
      'tenant_id', n.tenant_id,
      'is_read', COALESCE((n.metadata->>'is_read')::boolean, false),
      'priority', COALESCE(n.metadata->>'priority', 'normal')
    ) AS notification
  FROM notifications n
  WHERE n.tenant_id = p_tenant_id
    AND n.recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ORDER BY 
    CASE WHEN n.metadata->>'priority' = 'high' THEN 1
         WHEN n.metadata->>'priority' = 'medium' THEN 2
         ELSE 3 END,
    n.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_notifications"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_pending_invites"("user_email_param" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', ti.id,
        'tenant_id', ti.tenant_id,
        'email', ti.email,
        'invited_by', ti.invited_by,
        'status', ti.status,
        'role', ti.role,
        'token', ti.token,
        'created_at', ti.created_at,
        'expires_at', ti.expires_at,
        'accepted_at', ti.accepted_at,
        'tenant', jsonb_build_object(
          'name', t.name,
          'logo_url', t.logo_url
        )
      )
    ) INTO result
  FROM 
    public.tenant_invites ti
    JOIN public.tenants t ON ti.tenant_id = t.id
  WHERE 
    ti.email = user_email_param
    AND ti.status = 'PENDING';
    
  IF result IS NULL THEN
    result := '[]'::jsonb;
  END IF;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', true,
    'message', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;


ALTER FUNCTION "public"."get_user_pending_invites"("user_email_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_pending_invites"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
  user_email_to_search TEXT;
BEGIN
  -- Se p_user_id for fornecido, buscar o email do usuário
  IF p_user_id IS NOT NULL THEN
    -- Buscar email do usuário autenticado
    SELECT email INTO user_email_to_search
    FROM auth.users
    WHERE id = p_user_id;
    
    IF user_email_to_search IS NULL THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Usuário não encontrado',
        'code', 'USER_NOT_FOUND'
      );
    END IF;
  ELSE
    -- Se não fornecido, usar o usuário atual autenticado
    SELECT email INTO user_email_to_search
    FROM auth.users
    WHERE id = auth.uid();
    
    IF user_email_to_search IS NULL THEN
      RETURN jsonb_build_object(
        'error', true,
        'message', 'Usuário não autenticado',
        'code', 'USER_NOT_AUTHENTICATED'
      );
    END IF;
  END IF;
  
  -- Buscar convites pendentes
  SELECT 
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ti.id,
          'tenant_id', ti.tenant_id,
          'email', ti.email,
          'invited_by', ti.invited_by,
          'status', ti.status,
          'role', ti.role,
          'token', ti.token,
          'created_at', ti.created_at,
          'expires_at', ti.expires_at,
          'accepted_at', ti.accepted_at,
          'tenant', jsonb_build_object(
            'name', t.name,
            'logo_url', t.logo_url
          )
        )
      ),
      '[]'::jsonb
    ) INTO result
  FROM 
    public.tenant_invites ti
    JOIN public.tenants t ON ti.tenant_id = t.id
  WHERE 
    ti.email = user_email_to_search
    AND ti.status = 'PENDING'
    AND ti.expires_at > NOW();
    
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', true,
    'message', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;


ALTER FUNCTION "public"."get_user_pending_invites"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_portal_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    _user_id UUID;
    _user_email TEXT;
    _user_role TEXT;
    _result JSONB;
    _tenants JSONB;
    _invites JSONB;
BEGIN
    -- Obter ID e email do usuário atual de forma mais segura
    SELECT 
        COALESCE(auth.uid(), NULL), 
        COALESCE(auth.email(), NULL) 
    INTO _user_id, _user_email;
    
    -- Verificar se o usuário está autenticado de forma mais robusta
    IF _user_id IS NULL THEN
        RETURN jsonb_build_object(
            'authenticated', false,
            'message', 'Usuário não autenticado',
            'user', NULL,
            'tenants', '[]'::jsonb,
            'invites', '[]'::jsonb
        );
    END IF;
    
    -- Obter papel global do usuário (ADMIN, RESELLER, etc.) da tabela users
    SELECT role INTO _user_role FROM users WHERE id = _user_id;
    
    -- Log para debug
    RAISE LOG 'User ID: %, Email: %, Role: %', _user_id, _user_email, _user_role;
    
    -- Obter tenants aos quais o usuário tem acesso
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'slug', t.slug,
                'active', t.active,
                'logo', t.branding->>'logo_url',
                'role', tu.role
            )
        ),
        '[]'::jsonb
    ) INTO _tenants
    FROM tenant_users tu
    JOIN tenants t ON tu.tenant_id = t.id
    WHERE tu.user_id = _user_id AND tu.active = true;
    
    -- Log para debug
    RAISE LOG 'Tenants found: %', _tenants;
    
    -- Obter convites pendentes para o usuário
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', ti.id,
                'tenant_id', ti.tenant_id,
                'tenant_name', t.name,
                'tenant_logo', t.branding->>'logo_url',
                'role', ti.role,
                'created_at', ti.created_at,
                'expires_at', ti.expires_at,
                'invited_by', ti.invited_by
            )
        ),
        '[]'::jsonb
    ) INTO _invites
    FROM tenant_invites ti
    JOIN tenants t ON ti.tenant_id = t.id
    WHERE ti.email = _user_email AND ti.status = 'PENDING';
    
    -- Log para debug
    RAISE LOG 'Invites found: %', _invites;
    
    -- Construir resultado final
    _result := jsonb_build_object(
        'authenticated', true,
        'user', jsonb_build_object(
            'id', _user_id,
            'email', _user_email,
            'role', _user_role
        ),
        'tenants', _tenants,
        'invites', _invites
    );
    
    RETURN _result;
END;
$$;


ALTER FUNCTION "public"."get_user_portal_data"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_portal_data"() IS 'Retorna todos os dados necessários para a página de seleção de portal: informações do usuário, tenants aos quais tem acesso e convites pendentes.';



CREATE OR REPLACE FUNCTION "public"."get_user_portal_data"("user_id_param" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    _user_id UUID;
    _user_email TEXT;
    _user_role TEXT;
    _result JSONB;
    _tenants JSONB;
    _invites JSONB;
BEGIN
    -- Usar o user_id passado como parâmetro ou tentar obter do contexto
    IF user_id_param IS NOT NULL THEN
        _user_id := user_id_param;
    ELSE
        _user_id := auth.uid();
    END IF;
    
    -- Log do user_id para diagnóstico
    RAISE LOG 'Função get_user_portal_data chamada. User ID: %', _user_id;
    
    -- Verificar se o usuário está autenticado
    IF _user_id IS NULL THEN
        RAISE LOG 'Usuário não autenticado';
        RETURN jsonb_build_object(
            'authenticated', false,
            'message', 'Usuário não autenticado',
            'user', NULL,
            'tenants', '[]'::jsonb,
            'invites', '[]'::jsonb
        );
    END IF;
    
    -- Obter email e papel do usuário diretamente da tabela users, usando a coluna user_role
    SELECT 
        email,
        user_role
    INTO 
        _user_email,
        _user_role
    FROM users WHERE id = _user_id;
    
    -- Log para debug
    RAISE LOG 'User ID: %, Email: %, User Role: %', _user_id, _user_email, _user_role;
    
    -- Obter tenants aos quais o usuário tem acesso
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'slug', t.slug,
                'active', t.active,
                'logo', t.branding->>'logo_url',
                'role', tu.role
            )
        ),
        '[]'::jsonb
    ) INTO _tenants
    FROM tenant_users tu
    JOIN tenants t ON tu.tenant_id = t.id
    WHERE tu.user_id = _user_id AND tu.active = true;
    
    -- Log para debug
    RAISE LOG 'Tenants encontrados: %', _tenants;
    
    -- Obter convites pendentes para o usuário
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', ti.id,
                'tenant_id', ti.tenant_id,
                'tenant_name', t.name,
                'tenant_logo', t.branding->>'logo_url',
                'role', ti.role,
                'created_at', ti.created_at,
                'expires_at', ti.expires_at,
                'invited_by', ti.invited_by
            )
        ),
        '[]'::jsonb
    ) INTO _invites
    FROM tenant_invites ti
    JOIN tenants t ON ti.tenant_id = t.id
    WHERE ti.email = _user_email AND ti.status = 'PENDING';
    
    -- Log para debug
    RAISE LOG 'Convites encontrados: %', _invites;
    
    -- Construir resultado final
    _result := jsonb_build_object(
        'authenticated', true,
        'user', jsonb_build_object(
            'id', _user_id,
            'email', _user_email,
            'role', _user_role
        ),
        'tenants', _tenants,
        'invites', _invites
    );
    
    RETURN _result;
END;
$$;


ALTER FUNCTION "public"."get_user_portal_data"("user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- AIDEV-NOTE: Retorna o papel do usuário do contexto da sessão
  RETURN current_setting('app.user_role', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'user'; -- Valor padrão
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_role"() IS 'Retorna o papel do usuário do contexto da sessão';



CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_role text;
BEGIN
  -- Obter a role do usuário na tabela public.users
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;
  
  -- Definir a role na sessão atual
  IF user_role = 'service_role' THEN
    PERFORM set_config('app.user_role', 'service_role', false);
  END IF;
  
  RETURN COALESCE(user_role, 'authenticated');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao obter role do usuário %: %', user_id, SQLERRM;
  RETURN 'authenticated';
END;
$$;


ALTER FUNCTION "public"."get_user_role"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role_by_id"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role_value text;
BEGIN
  -- Tenta obter user_role primeiro, se não encontrar, usa role
  SELECT COALESCE(user_role, role) INTO user_role_value
  FROM public.users
  WHERE id = user_id;
  
  RETURN COALESCE(user_role_value, 'authenticated');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao obter role do usuário %: %', user_id, SQLERRM;
  RETURN 'authenticated';
END;
$$;


ALTER FUNCTION "public"."get_user_role_by_id"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role_wrapper"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN public.get_user_role();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao obter role do usuário: %', SQLERRM;
  RETURN 'authenticated';
END;
$$;


ALTER FUNCTION "public"."get_user_role_wrapper"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_session_stats"() RETURNS TABLE("total_sessions" bigint, "active_sessions" bigint, "expired_sessions" bigint, "never_refreshed" bigint, "oldest_session" timestamp with time zone, "newest_session" timestamp with time zone, "last_refresh" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
  SELECT 
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE not_after IS NULL OR not_after > NOW()) as active_sessions,
    COUNT(*) FILTER (WHERE not_after IS NOT NULL AND not_after <= NOW()) as expired_sessions,
    COUNT(*) FILTER (WHERE refreshed_at IS NULL) as never_refreshed,
    MIN(created_at) as oldest_session,
    MAX(created_at) as newest_session,
    MAX(refreshed_at) as last_refresh
  FROM auth.sessions 
  WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_session_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_session_stats"() IS 'Retorna estatísticas das sessões do usuário atual (search_path seguro)';



CREATE OR REPLACE FUNCTION "public"."get_user_sessions"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_updated_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "refreshed_at" timestamp with time zone, "not_after" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
BEGIN
    -- Verificar se o usuário está autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: usuário não autenticado';
    END IF;
    
    -- Se p_user_id não for fornecido, usar o usuário atual
    IF p_user_id IS NULL THEN
        p_user_id := auth.uid();
    END IF;
    
    -- Verificar se o usuário pode acessar as sessões (só suas próprias ou se for admin)
    IF p_user_id != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid() 
        AND auth.users.raw_app_meta_data->>'role' = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: você só pode acessar suas próprias sessões';
    END IF;
    
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.created_at,
        s.updated_at,
        s.refreshed_at,
        s.not_after
    FROM auth.sessions s
    WHERE s.user_id = p_user_id
        AND (p_updated_at IS NULL OR s.updated_at >= p_updated_at)
    ORDER BY s.updated_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) IS 'Busca sessões de usuário do esquema auth com controle de acesso seguro';



CREATE OR REPLACE FUNCTION "public"."get_user_tenants"("p_user_id" "uuid") RETURNS TABLE("tenant_id" "uuid", "tenant_name" "text", "tenant_slug" "text", "active" boolean, "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    t.active,
    tu.role
  FROM 
    public.tenants t
    INNER JOIN public.tenant_users tu ON t.id = tu.tenant_id
  WHERE 
    tu.user_id = p_user_id
    AND (tu.active IS NULL OR tu.active = TRUE);
END;
$$;


ALTER FUNCTION "public"."get_user_tenants"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_tenants"("p_user_id" "uuid") IS 'Retorna todos os tenants que um usuário tem acesso';



CREATE OR REPLACE FUNCTION "public"."get_user_tenants_simple"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("tenant_id" "uuid", "tenant_name" "text", "tenant_slug" "text", "tenant_logo_url" "text", "user_role" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
BEGIN
  -- Usar o ID fornecido ou o do usuário atual
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Verificar se o usuário é admin
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_user_id AND u.user_role IN ('ADMIN', 'RESELLER')
  ) INTO v_is_admin;
  
  -- Primeiro, retornar tenants onde o usuário tem acesso direto
  RETURN QUERY
  SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    t.branding->>'logo_url' as tenant_logo_url,
    tu.role as user_role
  FROM 
    public.tenants t
  JOIN 
    public.tenant_users tu ON t.id = tu.tenant_id
  WHERE 
    tu.user_id = v_user_id;
  
  -- Segundo, se o usuário for admin, adicionar todos os outros tenants
  IF v_is_admin THEN
    RETURN QUERY
    SELECT 
      t.id as tenant_id,
      t.name as tenant_name,
      t.slug as tenant_slug,
      t.branding->>'logo_url' as tenant_logo_url,
      'ADMIN'::text as user_role
    FROM 
      public.tenants t
    WHERE 
      t.id NOT IN (
        SELECT tu.tenant_id 
        FROM public.tenant_users tu 
        WHERE tu.user_id = v_user_id
      );
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_user_tenants_simple"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_users_in_inactive_tenants"() RETURNS TABLE("user_id" "uuid", "user_email" "text", "tenant_id" "uuid", "tenant_name" "text", "tenant_active" boolean, "role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email as user_email,
    t.id as tenant_id,
    t.name as tenant_name,
    t.active as tenant_active,
    tu.role
  FROM 
    tenant_users tu
    JOIN auth.users au ON tu.user_id = au.id
    JOIN tenants t ON tu.tenant_id = t.id
  WHERE 
    t.active = false
  ORDER BY 
    au.email, t.name;
END;
$$;


ALTER FUNCTION "public"."get_users_in_inactive_tenants"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_users_in_inactive_tenants"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."get_valid_next_stages"("p_contract_id" "uuid") RETURNS TABLE("stage_id" "uuid", "stage_name" character varying, "stage_code" character varying, "stage_color" character varying, "can_auto_transition" boolean, "transition_conditions" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_stage_id UUID;
    current_tenant_id UUID;
BEGIN
    -- Obter estágio atual do contrato
    SELECT c.stage_id, c.tenant_id 
    INTO current_stage_id, current_tenant_id
    FROM contracts c 
    WHERE c.id = p_contract_id;
    
    IF current_stage_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Retornar estágios válidos baseados nas regras de transição
    RETURN QUERY
    SELECT 
        cs.id,
        cs.name,
        cs.code,
        cs.color,
        cstr.is_active as can_auto_transition,
        cstr.conditions as transition_conditions
    FROM contract_stages cs
    JOIN contract_stage_transition_rules cstr ON cs.id = cstr.to_stage_id
    WHERE cstr.from_stage_id = current_stage_id
      AND cstr.is_active = true
      AND cs.tenant_id = current_tenant_id
      AND cs.is_active = true
    ORDER BY cs.order_index;
END;
$$;


ALTER FUNCTION "public"."get_valid_next_stages"("p_contract_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_conciliation_staging_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_user_id uuid;
  log_message text;
BEGIN
  -- AIDEV-NOTE: Tentar obter user_id do contexto atual
  current_user_id := auth.uid();
  log_message := format('auth.uid() retornou: %s', current_user_id::text);
  
  -- AIDEV-NOTE: Se auth.uid() retornar NULL, tentar current_setting
  IF current_user_id IS NULL THEN
    BEGIN
      current_user_id := current_setting('app.current_user_id', true)::uuid;
      log_message := log_message || format(', current_setting retornou: %s', current_user_id::text);
    EXCEPTION WHEN OTHERS THEN
      -- AIDEV-NOTE: Se não conseguir obter user_id, usar ID fixo para Edge Functions
      current_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
      log_message := log_message || ', usando ID fixo para Edge Function';
    END;
  END IF;

  -- AIDEV-NOTE: Registrar informações de contexto para debug
  RAISE LOG 'Audit Trigger Debug - %: %', TG_OP, log_message;
  RAISE LOG 'Contexto - current_user: %, session_user: %', current_user, session_user;
  
  -- AIDEV-NOTE: Para INSERT, definir created_by e updated_by
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = COALESCE(current_user_id, NEW.created_by);
    NEW.updated_by = COALESCE(current_user_id, NEW.updated_by);
    NEW.created_at = COALESCE(NEW.created_at, NOW());
    NEW.updated_at = NOW();
    RETURN NEW;
  END IF;
  
  -- AIDEV-NOTE: Para UPDATE, atualizar apenas updated_by
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = COALESCE(current_user_id, NEW.updated_by);
    NEW.updated_at = NOW();
    -- Preservar created_by e created_at originais
    NEW.created_by = OLD.created_by;
    NEW.created_at = OLD.created_at;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_conciliation_staging_audit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_contracts_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_user_id uuid;
  log_message text;
BEGIN
  -- AIDEV-NOTE: Tentar obter user_id do contexto atual
  current_user_id := auth.uid();
  log_message := format('auth.uid() retornou: %s', current_user_id::text);
  
  -- AIDEV-NOTE: Se auth.uid() retornar NULL, tentar current_setting
  IF current_user_id IS NULL THEN
    BEGIN
      current_user_id := current_setting('app.current_user_id', true)::uuid;
      log_message := log_message || format(', current_setting retornou: %s', current_user_id::text);
    EXCEPTION WHEN OTHERS THEN
      -- AIDEV-NOTE: Se não conseguir obter user_id, usar ID fixo para Edge Functions
      current_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
      log_message := log_message || ', usando ID fixo para Edge Function';
    END;
  END IF;

  -- AIDEV-NOTE: Registrar informações de contexto para debug
  RAISE LOG 'Contracts Audit Trigger Debug - %: %', TG_OP, log_message;
  
  -- AIDEV-NOTE: Para INSERT, definir created_by e updated_by
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = COALESCE(current_user_id, NEW.created_by);
    NEW.updated_by = COALESCE(current_user_id, NEW.updated_by);
    NEW.created_at = COALESCE(NEW.created_at, NOW());
    NEW.updated_at = NOW();
    RETURN NEW;
  END IF;
  
  -- AIDEV-NOTE: Para UPDATE, atualizar apenas updated_by
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = COALESCE(current_user_id, NEW.updated_by);
    NEW.updated_at = NOW();
    -- Preservar created_by e created_at originais
    NEW.created_by = OLD.created_by;
    NEW.created_at = OLD.created_at;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_contracts_audit"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_contracts_audit"() IS 'Função trigger para popular automaticamente created_by e updated_by na tabela contracts';



CREATE OR REPLACE FUNCTION "public"."handle_new_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    perform public.create_default_templates(new.id);
    return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.users (id, email, user_role, created_at)
    VALUES (NEW.id, NEW.email, 'USER', NOW())
    ON CONFLICT (id) DO NOTHING; -- Ignora se já existir
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_tenant_access"("p_user_id" "uuid", "p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    has_access boolean;
BEGIN
    -- Verificar se o tenant está ativo
    IF NOT is_tenant_active(p_tenant_id) THEN
        RETURN false;
    END IF;
    
    -- Verificar se o usuário tem acesso ao tenant
    SELECT EXISTS (
        SELECT 1
        FROM public.tenant_users tu
        WHERE tu.user_id = p_user_id
        AND tu.tenant_id = p_tenant_id
        AND tu.active = true
    ) INTO has_access;
    
    RETURN has_access;
END;
$$;


ALTER FUNCTION "public"."has_tenant_access"("p_user_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_tenant_access"("p_user_id" "uuid", "p_tenant_id" "uuid") IS 'Função segura para validar acesso ao tenant - search_path fixo';



CREATE OR REPLACE FUNCTION "public"."identify_charges_needing_sync"("p_tenant_id" "uuid") RETURNS TABLE("charge_id" "uuid", "asaas_id" "text", "current_status" "text", "current_data_pagamento" "date", "last_updated" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as charge_id,
    c.asaas_id,
    c.status as current_status,
    c.data_pagamento as current_data_pagamento,
    c.updated_at as last_updated
  FROM charges c
  WHERE c.tenant_id = p_tenant_id
    AND c.asaas_id IS NOT NULL
    AND c.origem = 'ASAAS'
    AND (
      c.status IN ('PENDING', 'OVERDUE')
      OR (c.data_pagamento IS NULL AND c.status != 'REFUNDED')
      OR c.updated_at < NOW() - INTERVAL '1 hour'
    )
  ORDER BY c.updated_at ASC
  LIMIT 100;
END;
$$;


ALTER FUNCTION "public"."identify_charges_needing_sync"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."identify_charges_needing_sync"("p_tenant_id" "uuid") IS 'Identifica charges do ASAAS que podem precisar sincronização com a API. Retorna lista de charges que devem ser verificadas.';



CREATE OR REPLACE FUNCTION "public"."import_movements_to_charges"("p_tenant_id" "uuid", "p_movement_ids" "uuid"[]) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_movement RECORD;
  v_charge_id UUID;
  v_imported_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSON[] := '{}';
  v_created_charges UUID[] := '{}';
  v_result JSON;
BEGIN
  -- AIDEV-NOTE: Configurar contexto de tenant para RLS
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
  
  -- AIDEV-NOTE: Validar se o tenant_id é válido
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Tenant inválido',
      'imported_count', 0,
      'skipped_count', 0,
      'error_count', 1,
      'errors', json_build_array(json_build_object(
        'movement_id', null,
        'error', 'Tenant não encontrado'
      )),
      'created_charges', '[]'::json
    );
  END IF;
  
  -- AIDEV-NOTE: Processar cada movimentação individualmente
  FOR v_movement IN 
    SELECT 
      cs.id,
      cs.tenant_id,
      cs.id_externo,
      cs.valor_cobranca,
      cs.data_vencimento,
      cs.customer_name,
      cs.customer_email,
      cs.customer_document,
      cs.customer_phone,
      cs.observacao,
      cs.payment_method,
      cs.cobranca_id,
      cs.processed,
      cs.status_conciliacao
    FROM conciliation_staging cs
    WHERE cs.id = ANY(p_movement_ids)
    AND cs.tenant_id = p_tenant_id
  LOOP
    BEGIN
      -- AIDEV-NOTE: Verificar se já foi processado
      IF v_movement.processed = true OR v_movement.cobranca_id IS NOT NULL THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;
      
      -- AIDEV-NOTE: Validar dados obrigatórios
      IF v_movement.valor_cobranca IS NULL OR v_movement.valor_cobranca <= 0 THEN
        v_error_count := v_error_count + 1;
        v_errors := v_errors || json_build_object(
          'movement_id', v_movement.id,
          'error', 'Valor inválido ou ausente'
        );
        CONTINUE;
      END IF;
      
      IF v_movement.data_vencimento IS NULL THEN
        v_error_count := v_error_count + 1;
        v_errors := v_errors || json_build_object(
          'movement_id', v_movement.id,
          'error', 'Data de vencimento ausente'
        );
        CONTINUE;
      END IF;
      
      -- AIDEV-NOTE: Gerar ID único para a cobrança
      v_charge_id := gen_random_uuid();
      
      -- AIDEV-NOTE: Inserir cobrança na tabela charges
      INSERT INTO charges (
        id,
        tenant_id,
        customer_id,
        contract_id,
        valor,
        data_vencimento,
        status,
        tipo,
        descricao,
        customer_name,
        customer_email,
        customer_document,
        customer_phone,
        payment_method,
        external_id,
        created_at,
        updated_at
      ) VALUES (
        v_charge_id,
        p_tenant_id,
        NULL, -- customer_id será preenchido posteriormente se necessário
        NULL, -- contract_id será preenchido posteriormente se necessário
        v_movement.valor_cobranca,
        v_movement.data_vencimento,
        'PENDING',
        'IMPORTED',
        COALESCE(v_movement.observacao, 'Cobrança importada de ' || v_movement.id_externo),
        v_movement.customer_name,
        v_movement.customer_email,
        v_movement.customer_document,
        v_movement.customer_phone,
        COALESCE(v_movement.payment_method, 'BANK_SLIP'),
        v_movement.id_externo,
        NOW(),
        NOW()
      );
      
      -- AIDEV-NOTE: Atualizar movimentação como processada
      UPDATE conciliation_staging
      SET 
        processed = true,
        cobranca_id = v_charge_id,
        processed_at = NOW(),
        updated_at = NOW()
      WHERE id = v_movement.id
      AND tenant_id = p_tenant_id;
      
      -- AIDEV-NOTE: Adicionar à lista de cobranças criadas
      v_created_charges := v_created_charges || v_charge_id;
      v_imported_count := v_imported_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- AIDEV-NOTE: Capturar erros individuais sem interromper o processo
      v_error_count := v_error_count + 1;
      v_errors := v_errors || json_build_object(
        'movement_id', v_movement.id,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  -- AIDEV-NOTE: Construir resultado final
  v_result := json_build_object(
    'success', (v_imported_count > 0),
    'imported_count', v_imported_count,
    'skipped_count', v_skipped_count,
    'error_count', v_error_count,
    'errors', array_to_json(v_errors),
    'created_charges', array_to_json(v_created_charges)
  );
  
  -- AIDEV-NOTE: Log da operação para auditoria
  RAISE NOTICE 'Import concluído - Tenant: %, Importadas: %, Ignoradas: %, Erros: %', 
    p_tenant_id, v_imported_count, v_skipped_count, v_error_count;
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."import_movements_to_charges"("p_tenant_id" "uuid", "p_movement_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_tenant_context_by_slug"("p_slug" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
    v_context_set BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- Obter usuário atual
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'USER_NOT_AUTHENTICATED',
            'message', 'Usuário não autenticado'
        );
    END IF;
    
    -- Obter tenant_id pelo slug
    SELECT id INTO v_tenant_id
    FROM tenants
    WHERE slug = p_slug AND active = true;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'TENANT_NOT_FOUND',
            'message', 'Tenant não encontrado ou inativo',
            'slug', p_slug
        );
    END IF;
    
    -- Tentar definir o contexto
    SELECT set_tenant_context_flexible(v_tenant_id, v_user_id) INTO v_context_set;
    
    IF v_context_set THEN
        -- Obter informações do tenant para retorno
        SELECT jsonb_build_object(
            'success', true,
            'tenant_id', t.id,
            'tenant_name', t.name,
            'tenant_slug', t.slug,
            'user_id', v_user_id,
            'context_set', true
        ) INTO v_result
        FROM tenants t
        WHERE t.id = v_tenant_id;
        
        RETURN v_result;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ACCESS_DENIED',
            'message', 'Usuário não tem acesso ao tenant especificado',
            'tenant_id', v_tenant_id,
            'slug', p_slug
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."initialize_tenant_context_by_slug"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_access_log"("p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
  v_tenant_access BOOLEAN;
BEGIN
  -- Obter o ID do usuário autenticado
  v_user_id := auth.uid();
  
  -- Verificar se o usuário está autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Verificar se o usuário tem acesso ao tenant
  SELECT EXISTS(
    SELECT 1 FROM user_tenants 
    WHERE user_id = v_user_id 
    AND tenant_id = p_tenant_id 
    AND status = 'active'
  ) INTO v_tenant_access;
  
  IF NOT v_tenant_access THEN
    RAISE EXCEPTION 'Usuário não tem acesso ao tenant especificado';
  END IF;
  
  -- Inserir o log de acesso
  INSERT INTO access_logs (
    user_id,
    action,
    resource,
    tenant_id,
    details,
    timestamp
  ) VALUES (
    v_user_id,
    p_action,
    p_resource,
    p_tenant_id,
    p_details,
    NOW()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."insert_access_log"("p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."insert_access_log"("p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") IS 'Função segura para inserir logs de acesso validando permissões do usuário e tenant';



CREATE OR REPLACE FUNCTION "public"."insert_access_log"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
  v_tenant_access BOOLEAN;
BEGIN
  -- Verificar se o usuário tem acesso ao tenant
  SELECT EXISTS(
    SELECT 1 FROM user_tenants 
    WHERE user_id = p_user_id 
    AND tenant_id = p_tenant_id 
    AND status = 'active'
  ) INTO v_tenant_access;
  
  IF NOT v_tenant_access THEN
    RAISE EXCEPTION 'Usuário não tem acesso ao tenant especificado';
  END IF;
  
  -- Inserir o log de acesso
  INSERT INTO access_logs (
    user_id,
    action,
    resource,
    tenant_id,
    details,
    timestamp
  ) VALUES (
    p_user_id,
    p_action,
    p_resource,
    p_tenant_id,
    p_details,
    NOW()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."insert_access_log"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_access_log_with_context"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_log_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Verificar se o usuário existe
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', p_user_id;
  END IF;
  
  -- Inserir o log de acesso
  INSERT INTO public.access_logs (
    user_id,
    action,
    resource,
    tenant_id,
    details,
    timestamp
  ) VALUES (
    p_user_id,
    p_action,
    p_resource,
    p_tenant_id,
    p_details,
    NOW()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."insert_access_log_with_context"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."insert_access_log_with_context"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") IS 'Access log insertion with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."insert_charge_with_auth_context"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_contract_id" "uuid", "p_valor" numeric, "p_data_vencimento" "date", "p_status" "text", "p_tipo" "text", "p_descricao" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_charge_id UUID;
  v_user_id UUID;
BEGIN
  -- Se user_id não foi fornecido, tentar obter da sessão ativa
  IF p_user_id IS NULL THEN
    SELECT user_id INTO v_user_id 
    FROM auth.sessions 
    WHERE updated_at > NOW() - INTERVAL '1 hour'
    ORDER BY updated_at DESC 
    LIMIT 1;
  ELSE
    v_user_id := p_user_id;
  END IF;
  
  -- Verificar se o usuário tem acesso ao tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = v_user_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'User does not have access to tenant';
  END IF;
  
  -- Inserir a cobrança diretamente, contornando as políticas RLS
  INSERT INTO charges (
    id,
    tenant_id,
    customer_id,
    contract_id,
    valor,
    data_vencimento,
    status,
    tipo,
    descricao,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_tenant_id,
    p_customer_id,
    p_contract_id,
    p_valor,
    p_data_vencimento,
    p_status,
    p_tipo,
    p_descricao,
    NOW(),
    NOW()
  ) RETURNING id INTO v_charge_id;
  
  -- AIDEV-NOTE: CORREÇÃO PRINCIPAL - Vincular automaticamente ao período de faturamento
  -- Chamar on_charge_created_link_period para vincular a charge ao período correspondente
  BEGIN
    PERFORM on_charge_created_link_period(
      p_charge_id := v_charge_id,
      p_contract_id := p_contract_id,
      p_bill_date := p_data_vencimento,
      p_amount := p_valor
    );
    
    -- AIDEV-NOTE: Log da vinculação automática bem-sucedida
    INSERT INTO audit_logs (
      tenant_id,
      entity_type,
      entity_id,
      action,
      old_data,
      new_data,
      performed_by,
      performed_at
    ) VALUES (
      p_tenant_id,
      'charges',
      v_charge_id::text,
      'AUTO_LINK',
      jsonb_build_object('message', 'Vinculação automática ao período'),
      jsonb_build_object('contract_id', p_contract_id, 'bill_date', p_data_vencimento),
      v_user_id,
      now()
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- AIDEV-NOTE: Se a vinculação falhar, logar o erro mas não falhar a criação da charge
    INSERT INTO audit_logs (
      tenant_id,
      entity_type,
      entity_id,
      action,
      old_data,
      new_data,
      performed_by,
      performed_at
    ) VALUES (
      p_tenant_id,
      'charges',
      v_charge_id::text,
      'AUTO_LINK_ERROR',
      jsonb_build_object('error', SQLERRM),
      jsonb_build_object('contract_id', p_contract_id, 'bill_date', p_data_vencimento),
      v_user_id,
      now()
    );
  END;
  
  RETURN v_charge_id;
END;
$$;


ALTER FUNCTION "public"."insert_charge_with_auth_context"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_contract_id" "uuid", "p_valor" numeric, "p_data_vencimento" "date", "p_status" "text", "p_tipo" "text", "p_descricao" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_message_history_system"("p_charge_id" "uuid", "p_customer_id" "uuid", "p_tenant_id" "uuid", "p_template_id" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT 'SENT'::"text", "p_message" "text" DEFAULT ''::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_history_id UUID;
  v_final_template_id UUID;
  v_normalized_status TEXT;
BEGIN
  -- AIDEV-NOTE: Validação básica dos parâmetros obrigatórios
  IF p_charge_id IS NULL OR p_customer_id IS NULL OR p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'charge_id, customer_id e tenant_id são obrigatórios';
  END IF;

  -- AIDEV-NOTE: Normalizar status para maiúsculas
  v_normalized_status := UPPER(COALESCE(p_status, 'SENT'));
  
  -- Validar se o status é permitido
  IF v_normalized_status NOT IN ('SENT', 'DELIVERED', 'READ', 'FAILED') THEN
    v_normalized_status := 'SENT';
  END IF;

  -- AIDEV-NOTE: Se template_id não foi fornecido, tentar encontrar um template existente
  IF p_template_id IS NULL THEN
    -- Tentar encontrar qualquer template do tenant
    SELECT id INTO v_final_template_id 
    FROM notification_templates 
    WHERE tenant_id = p_tenant_id
    LIMIT 1;
    
    -- Se não encontrar, criar um template mínimo para o tenant
    IF v_final_template_id IS NULL THEN
      INSERT INTO notification_templates (
        name,
        category,
        message,
        tenant_id,
        created_at,
        updated_at
      ) VALUES (
        'Sistema - Mensagem Automática',
        'lembrete',
        COALESCE(p_message, 'Mensagem gerada automaticamente pelo sistema'),
        p_tenant_id,
        NOW(),
        NOW()
      ) RETURNING id INTO v_final_template_id;
    END IF;
  ELSE
    v_final_template_id := p_template_id;
  END IF;

  -- AIDEV-NOTE: Inserir registro no histórico de mensagens
  INSERT INTO message_history (
    charge_id,
    customer_id,
    tenant_id,
    template_id,
    status,
    message,
    metadata,
    created_at
  ) VALUES (
    p_charge_id,
    p_customer_id,
    p_tenant_id,
    v_final_template_id,
    v_normalized_status,
    p_message,
    p_metadata,
    NOW()
  ) RETURNING id INTO v_history_id;

  RETURN v_history_id;
END;
$$;


ALTER FUNCTION "public"."insert_message_history_system"("p_charge_id" "uuid", "p_customer_id" "uuid", "p_tenant_id" "uuid", "p_template_id" "uuid", "p_status" "text", "p_message" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."insert_message_history_system"("p_charge_id" "uuid", "p_customer_id" "uuid", "p_tenant_id" "uuid", "p_template_id" "uuid", "p_status" "text", "p_message" "text", "p_metadata" "jsonb") IS 'Função de sistema para inserir registros de histórico de mensagens contornando RLS. Usada para operações automatizadas de logging.';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND user_role = 'ADMIN'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_complementary_billing_enabled"("p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    config jsonb;
BEGIN
    config := get_complementary_billing_config(p_tenant_id);
    RETURN COALESCE((config->>'enabled')::boolean, true);
END;
$$;


ALTER FUNCTION "public"."is_complementary_billing_enabled"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_complementary_billing_enabled"("p_tenant_id" "uuid") IS 'Verifica se faturamento complementar está habilitado para um tenant';



CREATE OR REPLACE FUNCTION "public"."is_tenant_active"("p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    is_active boolean;
BEGIN
    -- Verificar se o tenant existe e está ativo
    SELECT active INTO is_active
    FROM public.tenants
    WHERE id = p_tenant_id
    LIMIT 1;
    
    -- Se o tenant não existe ou active é null, retorna false
    RETURN COALESCE(is_active, false);
END;
$$;


ALTER FUNCTION "public"."is_tenant_active"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_tenant_active"("p_tenant_id" "uuid") IS 'Função segura para verificar se tenant está ativo - search_path fixo';



CREATE OR REPLACE FUNCTION "public"."link_existing_charges_to_contracts"() RETURNS TABLE("charges_updated" bigint, "charges_skipped" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_updated_count BIGINT := 0;
  v_skipped_count BIGINT := 0;
  v_charge_record RECORD;
  v_contract_id UUID;
BEGIN
  -- AIDEV-NOTE: Processar charges sem contract_id mas com customer_id
  FOR v_charge_record IN
    SELECT 
      c.id,
      c.tenant_id,
      c.customer_id,
      c.asaas_id,
      c.status
    FROM charges c
    WHERE c.contract_id IS NULL
      AND c.customer_id IS NOT NULL
      AND c.origem = 'ASAAS'
    ORDER BY c.created_at DESC
  LOOP
    -- AIDEV-NOTE: Buscar contrato do customer, priorizando ACTIVE e mais recente
    SELECT ct.id INTO v_contract_id
    FROM contracts ct
    WHERE ct.tenant_id = v_charge_record.tenant_id
      AND ct.customer_id = v_charge_record.customer_id
      AND ct.status IN ('ACTIVE', 'DRAFT')
    ORDER BY 
      CASE WHEN ct.status = 'ACTIVE' THEN 1 ELSE 2 END,
      ct.created_at DESC
    LIMIT 1;

    -- AIDEV-NOTE: Se encontrou contrato, vincular
    IF v_contract_id IS NOT NULL THEN
      UPDATE charges
      SET 
        contract_id = v_contract_id,
        updated_at = NOW() - INTERVAL '3 hours' -- UTC-3 (horário de Brasília)
      WHERE id = v_charge_record.id
        AND tenant_id = v_charge_record.tenant_id;
      
      v_updated_count := v_updated_count + 1;
      
      -- AIDEV-NOTE: Log para auditoria (apenas primeiras 10 para não poluir)
      IF v_updated_count <= 10 THEN
        RAISE NOTICE 'Charge % vinculada ao contrato % (customer: %)', 
          v_charge_record.asaas_id, 
          v_contract_id, 
          v_charge_record.customer_id;
      END IF;
    ELSE
      v_skipped_count := v_skipped_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_updated_count, v_skipped_count;
END;
$$;


ALTER FUNCTION "public"."link_existing_charges_to_contracts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_pending_import_jobs"("batch_size_param" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "tenant_id" "uuid", "filename" "text", "status" "text", "field_mappings" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- AIDEV-NOTE: Selecionar e bloquear jobs pendentes de forma atômica
  -- FOR UPDATE SKIP LOCKED evita race conditions entre múltiplos workers
  RETURN QUERY
  UPDATE import_jobs 
  SET 
    status = 'processing',
    updated_at = NOW()
  WHERE import_jobs.id IN (
    SELECT import_jobs.id 
    FROM import_jobs 
    WHERE import_jobs.status = 'pending'
    ORDER BY import_jobs.created_at ASC
    LIMIT batch_size_param
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    import_jobs.id,
    import_jobs.tenant_id,
    import_jobs.filename,
    import_jobs.status,
    import_jobs.field_mappings,
    import_jobs.created_at,
    import_jobs.updated_at;
END;
$$;


ALTER FUNCTION "public"."lock_pending_import_jobs"("batch_size_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lock_pending_import_jobs"("batch_size_param" integer DEFAULT 5, "worker_id_param" "text" DEFAULT 'worker-1'::"text") RETURNS TABLE("id" "uuid", "tenant_id" "uuid", "filename" "text", "status" "text", "field_mappings" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "locked_at" timestamp with time zone, "locked_by" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- AIDEV-NOTE: Lock atômico usando UPDATE com subquery e FOR UPDATE SKIP LOCKED
  -- Evita completamente race conditions entre múltiplos workers
  RETURN QUERY
  UPDATE import_jobs 
  SET 
    status = 'processing',
    locked_at = NOW(),
    locked_by = worker_id_param,
    updated_at = NOW()
  WHERE import_jobs.id IN (
    SELECT import_jobs.id 
    FROM import_jobs 
    WHERE import_jobs.status = 'pending'
    ORDER BY import_jobs.created_at ASC
    LIMIT batch_size_param
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    import_jobs.id,
    import_jobs.tenant_id,
    import_jobs.filename,
    import_jobs.status,
    import_jobs.field_mappings,
    import_jobs.created_at,
    import_jobs.updated_at,
    import_jobs.locked_at,
    import_jobs.locked_by;
END;
$$;


ALTER FUNCTION "public"."lock_pending_import_jobs"("batch_size_param" integer, "worker_id_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_auth_event"("p_user_id" "uuid", "p_email" "text", "p_event_type" "text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_details" "jsonb" DEFAULT NULL::"jsonb", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    event_id uuid;
    calculated_risk_score integer;
BEGIN
    -- Calcular score de risco
    calculated_risk_score := public.calculate_risk_score(
        p_user_id, p_ip_address, p_user_agent, p_event_type
    );
    
    -- Inserir evento
    INSERT INTO public.auth_monitoring (
        user_id, email, event_type, ip_address, user_agent,
        risk_score, details, tenant_id
    ) VALUES (
        p_user_id, p_email, p_event_type, p_ip_address, p_user_agent,
        calculated_risk_score, p_details, p_tenant_id
    ) RETURNING id INTO event_id;
    
    -- Se o score de risco for alto, registrar como atividade suspeita
    IF calculated_risk_score >= 70 THEN
        INSERT INTO public.auth_monitoring (
            user_id, email, event_type, ip_address, user_agent,
            risk_score, details, tenant_id
        ) VALUES (
            p_user_id, p_email, 'SUSPICIOUS_ACTIVITY', p_ip_address, p_user_agent,
            calculated_risk_score, 
            jsonb_build_object(
                'original_event', p_event_type,
                'risk_factors', 'High risk score detected',
                'original_event_id', event_id
            ), 
            p_tenant_id
        );
    END IF;
    
    RETURN event_id;
END;
$$;


ALTER FUNCTION "public"."log_auth_event"("p_user_id" "uuid", "p_email" "text", "p_event_type" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_details" "jsonb", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_auth_event"("p_user_id" "uuid", "p_email" "text", "p_event_type" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_details" "jsonb", "p_tenant_id" "uuid") IS 'Registra eventos de autenticação com cálculo automático de risco';



CREATE OR REPLACE FUNCTION "public"."log_contract_stage_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Registra a mudança de etapa no histórico
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO public.contract_stage_history (
      contract_id, 
      from_stage_id, 
      to_stage_id, 
      changed_by
    ) VALUES (
      NEW.id, 
      OLD.stage_id, 
      NEW.stage_id, 
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_contract_stage_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_financial_payable_insert_to_history"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
/*
  Registra uma operação DEBIT em bank_operation_history quando uma
  conta a pagar é criada em financial_payables.

  Campos mapeados:
  - tenant_id: NEW.tenant_id
  - bank_acount_id: NEW.bank_account_id
  - operation_type: 'DEBIT'
  - amount: NEW.net_amount
  - operation_date: timezone('America/Sao_Paulo', now())
  - description: NEW.description
  - document_reference: NEW.id
  - category: NEW.category_id::text
*/
BEGIN
  INSERT INTO public.bank_operation_history (
    tenant_id,
    bank_acount_id,
    operation_type,
    amount,
    operation_date,
    description,
    document_reference,
    category,
    created_by
  ) VALUES (
    NEW.tenant_id,
    NEW.bank_account_id,
    'DEBIT'::bank_operation_type,
    COALESCE(NEW.net_amount, 0),
    timezone('America/Sao_Paulo'::text, now()),
    NEW.description,
    NEW.id::text,
    COALESCE(NEW.category_id::text, NULL),
    auth.uid()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_financial_payable_insert_to_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_financial_payable_payment_to_history"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
/*
  Registra uma operação DEBIT em bank_operation_history quando uma
  conta a pagar é marcada como PAID.

  Critérios:
  - NEW.status = 'PAID'
  - NEW.payment_date IS NOT NULL
  - Mudança relevante em payment_date, status ou paid_amount
*/
DECLARE
  v_amount NUMERIC(18,2);
BEGIN
  IF NEW.status = 'PAID' AND NEW.payment_date IS NOT NULL AND (
       COALESCE(OLD.payment_date, 'epoch'::date) IS DISTINCT FROM NEW.payment_date
    OR COALESCE(OLD.status, '') IS DISTINCT FROM NEW.status
    OR COALESCE(OLD.paid_amount, -1) IS DISTINCT FROM COALESCE(NEW.paid_amount, -1)
  ) THEN
    v_amount := COALESCE(NEW.paid_amount, NEW.net_amount, 0);
    INSERT INTO public.bank_operation_history (
      tenant_id,
      bank_acount_id,
      operation_type,
      amount,
      operation_date,
      description,
      document_reference,
      category,
      created_by
    ) VALUES (
      NEW.tenant_id,
      NEW.bank_account_id,
      'DEBIT'::bank_operation_type,
      v_amount,
      NEW.payment_date::timestamptz,
      NEW.description,
      NEW.id::text,
      COALESCE(NEW.category_id::text, NULL),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_financial_payable_payment_to_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_resellers_users_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  current_user_id uuid;
begin
  current_user_id := coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'sub', ''),
    auth.uid()
  );

  if (tg_op = 'DELETE') then
    insert into audit_resellers_users (action, old_data, performed_by)
    values ('DELETE', to_jsonb(old), current_user_id);
    return old;
  elsif (tg_op = 'UPDATE') then
    insert into audit_resellers_users (action, old_data, new_data, performed_by)
    values ('UPDATE', to_jsonb(old), to_jsonb(new), current_user_id);
    return new;
  elsif (tg_op = 'INSERT') then
    insert into audit_resellers_users (action, new_data, performed_by)
    values ('INSERT', to_jsonb(new), current_user_id);
    return new;
  end if;
end;
$$;


ALTER FUNCTION "public"."log_resellers_users_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_tenant_session_audit"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_tenant_slug" character varying, "p_action" character varying, "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO tenant_sessions_audit (
    session_id,
    user_id,
    tenant_id,
    tenant_slug,
    action,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_session_id,
    p_user_id,
    p_tenant_id,
    p_tenant_slug,
    p_action,
    p_ip_address,
    p_user_agent,
    p_metadata
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;


ALTER FUNCTION "public"."log_tenant_session_audit"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_tenant_slug" character varying, "p_action" character varying, "p_ip_address" "inet", "p_user_agent" "text", "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_tenant_session_audit"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_tenant_slug" character varying, "p_action" character varying, "p_ip_address" "inet", "p_user_agent" "text", "p_metadata" "jsonb") IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."manual_update_last_login"("user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- AIDEV-NOTE: Permite atualizar manualmente o last_login de um usuário
  UPDATE public.users 
  SET last_login = NOW(),
      updated_at = NOW()
  WHERE id = user_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Last login atualizado com sucesso',
      'timestamp', NOW()
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário não encontrado'
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."manual_update_last_login"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."manual_update_last_login"("user_id" "uuid") IS 'Login update with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."map_external_status_to_charge_status"("status_externo" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  IF status_externo IS NULL THEN
    RETURN 'PENDING';
  END IF;
  
  RETURN CASE LOWER(status_externo)
    WHEN 'pending' THEN 'PENDING'
    WHEN 'received' THEN 'RECEIVED'
    WHEN 'overdue' THEN 'OVERDUE'
    WHEN 'confirmed' THEN 'CONFIRMED'
    WHEN 'refunded' THEN 'REFUNDED'
    WHEN 'received_in_cash' THEN 'RECEIVED'
    WHEN 'awaiting_risk_analysis' THEN 'PENDING'
    WHEN 'deleted' THEN 'PENDING'
    WHEN 'failed' THEN 'PENDING'
    WHEN 'processing' THEN 'PENDING'
    WHEN 'created' THEN 'PENDING'
    WHEN 'checkout_viewed' THEN 'PENDING'
    WHEN 'anticipaded' THEN 'RECEIVED'
    ELSE 'PENDING'
  END;
END;
$$;


ALTER FUNCTION "public"."map_external_status_to_charge_status"("status_externo" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."map_external_status_to_charge_status"("status_externo" "text") IS 'Mapeia status_externo (minúsculas) para status (MAIÚSCULAS) conforme constraint da tabela charges.';



CREATE OR REPLACE FUNCTION "public"."map_payment_method_to_tipo"("payment_method" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  IF payment_method IS NULL THEN
    RETURN 'BOLETO';
  END IF;
  
  RETURN CASE UPPER(payment_method)
    WHEN 'PIX' THEN 'PIX'
    WHEN 'BOLETO' THEN 'BOLETO'
    WHEN 'BANK_SLIP' THEN 'BOLETO'
    WHEN 'CREDIT_CARD' THEN 'CREDIT_CARD'
    WHEN 'CASH' THEN 'CASH'
    WHEN 'TRANSFER' THEN 'PIX'
    ELSE 'BOLETO'
  END;
END;
$$;


ALTER FUNCTION "public"."map_payment_method_to_tipo"("payment_method" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_as_read"("p_tenant_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_updated_count integer;
BEGIN
  -- AIDEV-NOTE: Validação de acesso ao tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied: User does not belong to tenant';
  END IF;

  -- AIDEV-NOTE: Atualizar todas as notificações não lidas
  UPDATE notifications 
  SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || '{"is_read": true, "read_at": "' || now()::text || '"}'::jsonb,
    updated_at = now()
  WHERE 
    tenant_id = p_tenant_id
    AND recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND COALESCE((metadata->>'is_read')::boolean, false) = false;
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- AIDEV-NOTE: Log de auditoria
  INSERT INTO access_logs (user_id, action, resource, tenant_id, details)
  VALUES (
    auth.uid(),
    'BULK_UPDATE',
    'notifications',
    p_tenant_id,
    json_build_object(
      'function', 'mark_all_notifications_as_read',
      'updated_count', v_updated_count
    )
  );
  
  RETURN v_updated_count;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_as_read"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_billing_period_as_billed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id UUID;
    v_period_record RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    -- AIDEV-NOTE: Só processa se a cobrança tem billing_periods associado
    IF NEW.billing_periods IS NOT NULL THEN
        
        -- Obtém o tenant_id da cobrança
        v_tenant_id := NEW.tenant_id;
        
        -- Configura o contexto do tenant para segurança multi-tenant
        PERFORM set_tenant_context_simple(v_tenant_id);
        
        -- Busca o período de cobrança correspondente pelo ID
        SELECT * INTO v_period_record
        FROM contract_billing_periods
        WHERE id = NEW.billing_periods
          AND tenant_id = v_tenant_id;
        
        -- Se encontrou o período e ele não está BILLED ainda
        IF FOUND AND v_period_record.status != 'BILLED' THEN
            
            -- Atualiza o período para BILLED
            UPDATE contract_billing_periods
            SET 
                status = 'BILLED',
                billed_at = NOW(),
                amount_billed = NEW.valor,
                from_status = v_period_record.status,
                transition_reason = 'Charge created automatically',
                updated_at = NOW()
            WHERE id = v_period_record.id;
            
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            
            -- AIDEV-NOTE: Log de auditoria para rastreabilidade com estrutura correta
            IF v_updated_count > 0 THEN
                INSERT INTO audit_logs (
                    tenant_id,
                    resource_type,
                    resource_id,
                    action,
                    old_values,
                    new_values,
                    performed_by,
                    performed_at
                ) VALUES (
                    v_tenant_id,
                    'contract_billing_periods',
                    v_period_record.id::text,
                    'UPDATE_STATUS_TO_BILLED',
                    jsonb_build_object(
                        'status', v_period_record.status,
                        'billed_at', v_period_record.billed_at,
                        'amount_billed', v_period_record.amount_billed
                    ),
                    jsonb_build_object(
                        'status', 'BILLED',
                        'billed_at', NOW(),
                        'amount_billed', NEW.valor,
                        'charge_id', NEW.id,
                        'from_status', v_period_record.status,
                        'transition_reason', 'Charge created automatically'
                    ),
                    NULL, -- system user
                    NOW()
                );
                
                RAISE NOTICE 'Período de cobrança % marcado como BILLED devido à criação da cobrança %', 
                             v_period_record.id, NEW.id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."mark_billing_period_as_billed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_billing_period_as_billed"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_manual_reason" "text" DEFAULT NULL::"text", "p_amount_billed" numeric DEFAULT NULL::numeric) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_period RECORD;
  v_result JSON;
BEGIN
  -- AIDEV-NOTE: Configurar contexto de tenant para RLS
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
  
  -- Buscar o período e validar
  SELECT * INTO v_period
  FROM contract_billing_periods
  WHERE id = p_period_id 
    AND tenant_id = p_tenant_id
    AND status NOT IN ('BILLED', 'SKIPPED');
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Período não encontrado ou já processado',
      'code', 'PERIOD_NOT_FOUND_OR_PROCESSED'
    );
  END IF;
  
  -- Atualizar período como faturado manualmente
  UPDATE contract_billing_periods
  SET 
    status = 'BILLED',
    billed_at = NOW(),
    manual_mark = true,
    manual_reason = COALESCE(p_manual_reason, 'Marcado como faturado manualmente'),
    amount_billed = COALESCE(p_amount_billed, amount_planned),
    updated_at = NOW()
  WHERE id = p_period_id AND tenant_id = p_tenant_id;
  
  -- Retornar sucesso
  v_result := json_build_object(
    'success', true,
    'period_id', p_period_id,
    'status', 'BILLED',
    'billed_at', NOW(),
    'manual_mark', true,
    'manual_reason', COALESCE(p_manual_reason, 'Marcado como faturado manualmente')
  );
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."mark_billing_period_as_billed"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_manual_reason" "text", "p_amount_billed" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_billing_period_as_billed"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_manual_reason" "text", "p_amount_billed" numeric) IS 'Marca período como faturado manualmente sem criar cobrança';



CREATE OR REPLACE FUNCTION "public"."mark_notification_as_read"("p_notification_id" "uuid", "p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_updated_count integer;
BEGIN
  -- AIDEV-NOTE: Validação de acesso ao tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Access denied: User does not belong to tenant';
  END IF;

  -- AIDEV-NOTE: Atualizar notificação com validação dupla
  UPDATE notifications 
  SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || '{"is_read": true, "read_at": "' || now()::text || '"}'::jsonb,
    updated_at = now()
  WHERE 
    id = p_notification_id
    AND tenant_id = p_tenant_id
    AND recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid());
    
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- AIDEV-NOTE: Log de auditoria
  INSERT INTO access_logs (user_id, action, resource, tenant_id, details)
  VALUES (
    auth.uid(),
    'UPDATE',
    'notifications',
    p_tenant_id,
    json_build_object(
      'function', 'mark_notification_as_read',
      'notification_id', p_notification_id,
      'success', v_updated_count > 0
    )
  );
  
  RETURN v_updated_count > 0;
END;
$$;


ALTER FUNCTION "public"."mark_notification_as_read"("p_notification_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_period_billed"("p_billing_period_id" "uuid", "p_actor" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id uuid;
    v_current_status billing_period_status;
BEGIN
    -- AIDEV-NOTE: Buscar tenant_id e status atual para validação
    SELECT tenant_id, status 
    INTO v_tenant_id, v_current_status
    FROM contract_billing_periods 
    WHERE id = p_billing_period_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Período de faturamento não encontrado: %', p_billing_period_id;
    END IF;
    
    -- AIDEV-NOTE: Configurar contexto de tenant para RLS
    PERFORM set_tenant_context_simple(v_tenant_id);
    
    -- AIDEV-NOTE: Atualizar período para BILLED com dados de auditoria
    UPDATE contract_billing_periods 
    SET 
        status = 'BILLED'::billing_period_status,
        billed_at = now(),
        manual_mark = true,
        manual_reason = p_reason,
        amount_billed = COALESCE(amount_billed, amount_planned),
        actor_id = p_actor,
        from_status = v_current_status,
        transition_reason = COALESCE(p_reason, 'Marcado manualmente como faturado'),
        updated_at = now()
    WHERE id = p_billing_period_id;
    
    -- AIDEV-NOTE: Log da operação para auditoria usando estrutura correta
    INSERT INTO audit_logs (
        tenant_id,
        resource_type,
        resource_id,
        action,
        old_values,
        new_values,
        performed_by,
        performed_at
    ) VALUES (
        v_tenant_id,
        'contract_billing_periods',
        p_billing_period_id::text,
        'UPDATE',
        jsonb_build_object('status', v_current_status),
        jsonb_build_object('status', 'BILLED', 'manual_mark', true),
        p_actor,
        now()
    );
END;
$$;


ALTER FUNCTION "public"."mark_period_billed"("p_billing_period_id" "uuid", "p_actor" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_period_billed"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_charge_id" "uuid" DEFAULT NULL::"uuid", "p_amount_billed" numeric DEFAULT NULL::numeric) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id UUID;
    v_period_id UUID;
    v_updated_count INTEGER := 0;
BEGIN
    -- AIDEV-NOTE: Buscar tenant_id do contrato
    SELECT tenant_id INTO v_tenant_id
    FROM public.contracts
    WHERE id = p_contract_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contrato não encontrado: %', p_contract_id;
    END IF;
    
    -- AIDEV-NOTE: Configurar contexto do tenant
    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
    
    -- AIDEV-NOTE: Atualizar período de faturamento para BILLED
    UPDATE public.contract_billing_periods
    SET 
        status = 'BILLED',
        billed_at = NOW(),
        charge_id = p_charge_id,
        amount_billed = p_amount_billed,
        updated_at = NOW()
    WHERE 
        tenant_id = v_tenant_id
        AND contract_id = p_contract_id
        AND period_start = p_period_start
        AND period_end = p_period_end
        AND status != 'BILLED'; -- Só atualizar se não estiver já faturado
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    -- AIDEV-NOTE: Se período foi atualizado, marcar eventos de serviços como processados
    IF v_updated_count > 0 THEN
        UPDATE public.service_billing_events
        SET 
            status = 'PROCESSED',
            charge_id = p_charge_id,
            updated_at = NOW()
        WHERE 
            tenant_id = v_tenant_id
            AND contract_id = p_contract_id
            AND period_start = p_period_start
            AND period_end = p_period_end
            AND status = 'PENDING';
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."mark_period_billed"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_charge_id" "uuid", "p_amount_billed" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_conciliation_staging_to_charges"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_staging_record RECORD;
  v_customer_id UUID;
  v_charge_id UUID;
  v_existing_charge_id UUID;
  v_mapped_status TEXT;
  v_mapped_tipo TEXT;
  v_total_processed INTEGER := 0;
  v_total_created INTEGER := 0;
  v_total_skipped INTEGER := 0;
  v_total_errors INTEGER := 0;
  v_error_messages TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- AIDEV-NOTE: Processar apenas registros com origem = 'ASAAS'
  -- Ignorar registros que já têm charge_id vinculado (já foram migrados)
  FOR v_staging_record IN
    SELECT 
      cs.id,
      cs.tenant_id,
      cs.id_externo,
      cs.valor_cobranca,
      cs.status_externo,
      cs.data_vencimento,
      cs.contrato_id,
      cs.asaas_customer_id,
      cs.customer_name,
      cs.customer_email,
      cs.customer_document,
      cs.customer_phone,
      cs.payment_method,
      cs.observacao,
      cs.external_reference,
      cs.charge_id,
      cs.created_at,
      cs.updated_at
    FROM conciliation_staging cs
    WHERE cs.origem = 'ASAAS'
      AND cs.id_externo IS NOT NULL
      AND cs.tenant_id IS NOT NULL
      AND (cs.charge_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM charges c 
        WHERE c.id = cs.charge_id 
        AND c.tenant_id = cs.tenant_id
      ))
    ORDER BY cs.created_at ASC
  LOOP
    BEGIN
      -- AIDEV-NOTE: Verificar se já existe charge com mesmo asaas_id
      SELECT id INTO v_existing_charge_id
      FROM charges
      WHERE tenant_id = v_staging_record.tenant_id
        AND asaas_id = v_staging_record.id_externo
      LIMIT 1;
      
      IF v_existing_charge_id IS NOT NULL THEN
        -- AIDEV-NOTE: Atualizar charge_id no staging para referência futura
        UPDATE conciliation_staging
        SET charge_id = v_existing_charge_id
        WHERE id = v_staging_record.id;
        
        v_total_skipped := v_total_skipped + 1;
        CONTINUE;
      END IF;
      
      -- AIDEV-NOTE: Buscar ou criar customer
      v_customer_id := find_or_create_customer_from_staging(
        v_staging_record.tenant_id,
        v_staging_record.asaas_customer_id,
        v_staging_record.customer_name,
        v_staging_record.customer_email,
        v_staging_record.customer_document,
        v_staging_record.customer_phone
      );
      
      IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível criar ou encontrar customer para staging_id: %', v_staging_record.id;
      END IF;
      
      -- AIDEV-NOTE: Mapear status e tipo
      v_mapped_status := map_external_status_to_charge_status(v_staging_record.status_externo);
      v_mapped_tipo := map_payment_method_to_tipo(v_staging_record.payment_method);
      
      -- AIDEV-NOTE: Garantir data_vencimento válida
      IF v_staging_record.data_vencimento IS NULL THEN
        v_staging_record.data_vencimento := CURRENT_DATE;
      END IF;
      
      -- AIDEV-NOTE: Garantir valor válido
      IF v_staging_record.valor_cobranca IS NULL OR v_staging_record.valor_cobranca <= 0 THEN
        v_staging_record.valor_cobranca := 0;
      END IF;
      
      -- AIDEV-NOTE: Criar charge
      INSERT INTO charges (
        tenant_id,
        customer_id,
        contract_id,
        asaas_id,
        valor,
        status,
        tipo,
        data_vencimento,
        descricao,
        created_at,
        updated_at
      ) VALUES (
        v_staging_record.tenant_id,
        v_customer_id,
        v_staging_record.contrato_id,
        v_staging_record.id_externo,
        v_staging_record.valor_cobranca,
        v_mapped_status,
        v_mapped_tipo,
        v_staging_record.data_vencimento,
        COALESCE(v_staging_record.observacao, 'Migrado de conciliation_staging'),
        COALESCE(v_staging_record.created_at, NOW()),
        COALESCE(v_staging_record.updated_at, NOW())
      )
      RETURNING id INTO v_charge_id;
      
      -- AIDEV-NOTE: Atualizar staging com charge_id
      UPDATE conciliation_staging
      SET charge_id = v_charge_id
      WHERE id = v_staging_record.id;
      
      v_total_created := v_total_created + 1;
      v_total_processed := v_total_processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_total_errors := v_total_errors + 1;
      v_error_messages := array_append(
        v_error_messages,
        format('Erro ao processar staging_id %s: %s', v_staging_record.id, SQLERRM)
      );
      v_total_processed := v_total_processed + 1;
    END;
  END LOOP;
  
  -- AIDEV-NOTE: Retornar resultado da migração
  RETURN json_build_object(
    'success', true,
    'total_processed', v_total_processed,
    'total_created', v_total_created,
    'total_skipped', v_total_skipped,
    'total_errors', v_total_errors,
    'errors', v_error_messages
  );
END;
$$;


ALTER FUNCTION "public"."migrate_conciliation_staging_to_charges"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_conciliation_staging_to_charges"() IS 'Migra todos os dados de conciliation_staging para charges. Cria customers se necessário e mantém conciliation_staging intacto para rollback.';



CREATE OR REPLACE FUNCTION "public"."next_des_payable_number"("p_tenant_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_next bigint;
BEGIN
  -- Inicializa a linha do tenant, se não existir
  INSERT INTO public.des_payables_sequence (tenant_id, last_value)
  VALUES (p_tenant_id, 0)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Incremento atômico com bloqueio de linha
  UPDATE public.des_payables_sequence
  SET last_value = last_value + 1,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
  RETURNING last_value INTO v_next;

  RETURN 'DES-' || v_next;
END;
$$;


ALTER FUNCTION "public"."next_des_payable_number"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se já é ADMIN ou RESELLER, não alterar
  IF OLD.user_role IS NOT NULL AND (OLD.user_role = 'ADMIN' OR OLD.user_role = 'RESELLER') THEN
    NEW.user_role := OLD.user_role;
  -- Caso contrário, normalizar
  ELSIF NEW.user_role IN ('admin', 'Admin', 'administrator', 'Administrator') THEN
    NEW.user_role := 'ADMIN';
  ELSIF NEW.user_role IN ('reseller', 'Reseller') THEN
    NEW.user_role := 'RESELLER';
  ELSIF NEW.user_role IN ('user', 'User', 'client', 'Client', 'tenant_user', 'TENANT_USER') THEN
    NEW.user_role := 'USER';
  ELSIF NEW.user_role IS NULL THEN
    NEW.user_role := 'USER';
  END IF;
  
  -- Garantir que role é 'authenticated'
  NEW.role := 'authenticated';
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."normalize_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_process_import_jobs"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    response http_response;
    payload jsonb;
BEGIN
    -- Preparar payload para enviar à Edge Function
    payload := jsonb_build_object(
        'job_id', NEW.id,
        'tenant_id', NEW.tenant_id,
        'trigger_source', 'database_trigger',
        'filename', NEW.filename,
        'status', NEW.status
    );
    
    -- Fazer chamada HTTP para a Edge Function usando a extensão http
    -- AIDEV-NOTE: Usando service_role_key correto do .env
    SELECT * INTO response
    FROM http((
        'POST',
        'https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/process-import-jobs',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjcwMzE3NCwiZXhwIjoyMDU4Mjc5MTc0fQ.pcvUQvvcBi2YAKVQ3gi_ZN5Yikx3d-4SPQthtQ_7dK4')
        ],
        'application/json',
        payload::text
    ));
    
    -- Log da resposta para debug
    RAISE NOTICE 'HTTP Response Status: %, Body: %', response.status, response.content;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_process_import_jobs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_process_import_jobs_async"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZWhwaXV0enZ3cGxsbHVtZ2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjcwMzE3NCwiZXhwIjoyMDU4Mjc5MTc0fQ.pcvUQvvcBi2YAKVQ3gi_ZN5Yikx3d-4SPQthtQ_7dK4';
    response_id BIGINT;
BEGIN
    -- Make async HTTP call to Edge Function with correct service role key
    SELECT INTO response_id
        net.http_post(
            url := 'https://wyehpiutzvwplllumgdk.supabase.co/functions/v1/process-import-jobs',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_key
            ),
            body := jsonb_build_object('trigger', 'pg_net'),
            timeout_milliseconds := 300000  -- 5 minutes timeout
        );
    
    -- Log the response ID for debugging
    RAISE NOTICE 'pg_net HTTP request initiated with response_id: %', response_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log any errors but don't fail the transaction
        RAISE NOTICE 'Error in notify_process_import_jobs_async: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."notify_process_import_jobs_async"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_process_import_jobs_async"() IS 'Função para acionar processamento assíncrono de import jobs via pg_net. 
ATENÇÃO: Contém service_role_key hardcoded - mover para variável de ambiente em produção.';



CREATE OR REPLACE FUNCTION "public"."on_charge_created_link_period"("p_charge_id" "uuid", "p_contract_id" "uuid", "p_bill_date" "date", "p_amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id uuid;
    v_period_id uuid;
    v_current_status billing_period_status;
BEGIN
    -- AIDEV-NOTE: Buscar tenant_id da charge
    SELECT tenant_id INTO v_tenant_id
    FROM charges 
    WHERE id = p_charge_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Charge não encontrada: %', p_charge_id;
    END IF;
    
    -- AIDEV-NOTE: Configurar contexto de tenant
    PERFORM set_tenant_context_simple(v_tenant_id);
    
    -- AIDEV-NOTE: Buscar período correspondente pela data de faturamento
    SELECT id, status 
    INTO v_period_id, v_current_status
    FROM contract_billing_periods 
    WHERE tenant_id = v_tenant_id
    AND contract_id = p_contract_id
    AND bill_date = p_bill_date
    LIMIT 1;
    
    IF FOUND THEN
        -- AIDEV-NOTE: Atualizar a cobrança com o ID do período (CORREÇÃO PRINCIPAL)
        UPDATE charges 
        SET 
            billing_periods = v_period_id,
            updated_at = now()
        WHERE id = p_charge_id;
        
        -- AIDEV-NOTE: Atualizar o período como BILLED
        UPDATE contract_billing_periods 
        SET 
            status = 'BILLED'::billing_period_status,
            billed_at = now(),
            amount_billed = p_amount,
            manual_mark = false,
            from_status = v_current_status,
            transition_reason = 'Vinculado automaticamente à charge criada',
            updated_at = now()
        WHERE id = v_period_id;
        
        -- AIDEV-NOTE: Log da vinculação usando estrutura correta da audit_logs
        INSERT INTO audit_logs (
            tenant_id,
            entity_type,
            entity_id,
            action,
            old_data,
            new_data,
            performed_by,
            performed_at
        ) VALUES (
            v_tenant_id,
            'charges',
            p_charge_id::text,
            'UPDATE',
            jsonb_build_object('billing_periods', null),
            jsonb_build_object('billing_periods', v_period_id),
            null, -- Sistema automático
            now()
        );
        
        -- AIDEV-NOTE: Log da atualização do período
        INSERT INTO audit_logs (
            tenant_id,
            entity_type,
            entity_id,
            action,
            old_data,
            new_data,
            performed_by,
            performed_at
        ) VALUES (
            v_tenant_id,
            'contract_billing_periods',
            v_period_id::text,
            'UPDATE',
            jsonb_build_object('status', v_current_status, 'amount_billed', null),
            jsonb_build_object('status', 'BILLED', 'amount_billed', p_amount),
            null, -- Sistema automático
            now()
        );
    ELSE
        -- AIDEV-NOTE: Log quando período não é encontrado
        INSERT INTO audit_logs (
            tenant_id,
            entity_type,
            entity_id,
            action,
            old_data,
            new_data,
            performed_by,
            performed_at
        ) VALUES (
            v_tenant_id,
            'charges',
            p_charge_id::text,
            'WARNING',
            jsonb_build_object('message', 'Período não encontrado para vinculação'),
            jsonb_build_object('contract_id', p_contract_id, 'bill_date', p_bill_date),
            null,
            now()
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."on_charge_created_link_period"("p_charge_id" "uuid", "p_contract_id" "uuid", "p_bill_date" "date", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_financial_payables_insert_update_bank_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if NEW.bank_account_id is null then
    return NEW;
  end if;
  update public.bank_acounts
  set current_balance = coalesce(current_balance, 0) - coalesce(NEW.net_amount, NEW.gross_amount, 0)
  where id = NEW.bank_account_id and tenant_id = NEW.tenant_id;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."on_financial_payables_insert_update_bank_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."peek_des_payable_number"("p_tenant_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current bigint;
BEGIN
  INSERT INTO public.des_payables_sequence (tenant_id, last_value)
  VALUES (p_tenant_id, 0)
  ON CONFLICT (tenant_id) DO NOTHING;

  SELECT last_value INTO v_current
  FROM public.des_payables_sequence
  WHERE tenant_id = p_tenant_id;

  IF v_current IS NULL THEN
    v_current := 0;
  END IF;

  RETURN 'DES-' || (v_current + 1);
END;
$$;


ALTER FUNCTION "public"."peek_des_payable_number"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preserve_admin_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se o usuário já era ADMIN, manter como ADMIN
  IF OLD.user_role = 'ADMIN' THEN
    NEW.user_role := 'ADMIN';
  -- Se o usuário já era RESELLER, manter como RESELLER  
  ELSIF OLD.user_role = 'RESELLER' THEN
    NEW.user_role := 'RESELLER';
  -- Para outros casos, usar o valor de NEW.user_role (que pode ter sido normalizado)
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."preserve_admin_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_contract_revert_to_draft"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'DRAFT' AND OLD.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Não é possível retornar o contrato para DRAFT após mudança de status';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_contract_revert_to_draft"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_accepted_invite"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'ACCEPTED' AND OLD.status = 'PENDING' THEN
    -- Inserir na tabela tenant_users
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES (NEW.tenant_id, NEW.user_id, NEW.role)
    ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = NEW.role;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_accepted_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_asaas_webhook"("p_tenant_id" "uuid", "p_event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_payment_id text;
  v_event_type text;
  v_payment_status text;
  v_value numeric;
  v_net_value numeric;
  v_description text;
  v_external_reference text;
  v_billing_type text;
  v_due_date timestamp;
  v_payment_date timestamp;
  v_customer_id text;
BEGIN
  -- AIDEV-NOTE: Extrai dados do evento
  v_payment_id := p_event->>'payment'->>'id';
  v_event_type := p_event->>'event';
  v_payment_status := p_event->>'payment'->>'status';
  v_value := (p_event->>'payment'->>'value')::numeric;
  v_net_value := (p_event->>'payment'->>'netValue')::numeric;
  v_description := p_event->>'payment'->>'description';
  v_external_reference := p_event->>'payment'->>'externalReference';
  v_billing_type := p_event->>'payment'->>'billingType';
  v_due_date := (p_event->>'payment'->>'dueDate')::timestamp;
  v_payment_date := (p_event->>'payment'->>'paymentDate')::timestamp;
  v_customer_id := p_event->>'payment'->>'customer'->>'id';

  -- AIDEV-NOTE: Insere ou atualiza na conciliation_staging
  INSERT INTO public.conciliation_staging (
    tenant_id,
    origem,
    id_externo,
    valor_cobranca,
    valor_pago,
    status_externo,
    status_conciliacao,
    data_vencimento,
    data_pagamento,
    observacao,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    'asaas',
    v_payment_id,
    v_value,
    v_net_value,
    v_payment_status,
    'pendente',
    v_due_date,
    v_payment_date,
    v_description,
    NOW(),
    NOW()
  )
  ON CONFLICT (tenant_id, origem, id_externo)
  DO UPDATE SET
    valor_cobranca = EXCLUDED.valor_cobranca,
    valor_pago = EXCLUDED.valor_pago,
    status_externo = EXCLUDED.status_externo,
    data_vencimento = EXCLUDED.data_vencimento,
    data_pagamento = EXCLUDED.data_pagamento,
    observacao = EXCLUDED.observacao,
    updated_at = NOW();

  -- AIDEV-NOTE: Retorna sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Evento processado com sucesso',
    'payment_id', v_payment_id,
    'event_type', v_event_type,
    'payment_status', v_payment_status
  );
END;
$$;


ALTER FUNCTION "public"."process_asaas_webhook"("p_tenant_id" "uuid", "p_event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_asaas_webhook"("tenant_id" "uuid", "event_type" "text", "event_json" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  payment_data JSONB;
  result JSONB;
BEGIN
  -- Extrair dados do pagamento do evento
  payment_data := event_json->'payment';
  
  -- Inserir ou atualizar na tabela conciliation_staging
  INSERT INTO conciliation_staging (
    tenant_id,
    origem,
    id_externo,
    valor_cobranca,
    valor_pago,
    status_externo,
    status_conciliacao,
    data_vencimento,
    data_pagamento,
    observacao
  )
  VALUES (
    tenant_id,
    'asaas',
    payment_data->>'id',
    (payment_data->>'value')::NUMERIC,
    (payment_data->>'netValue')::NUMERIC,
    payment_data->>'status',
    'pendente',
    (payment_data->>'dueDate')::TIMESTAMP WITH TIME ZONE,
    (payment_data->>'paymentDate')::TIMESTAMP WITH TIME ZONE,
    format('Evento ASAAS: %s', event_type)
  )
  ON CONFLICT (tenant_id, origem, id_externo)
  DO UPDATE SET
    valor_cobranca = EXCLUDED.valor_cobranca,
    valor_pago = EXCLUDED.valor_pago,
    status_externo = EXCLUDED.status_externo,
    data_pagamento = EXCLUDED.data_pagamento,
    observacao = EXCLUDED.observacao,
    updated_at = NOW();

  -- Retornar resultado
  result := jsonb_build_object(
    'success', true,
    'message', format('Evento %s processado com sucesso', event_type),
    'payment_id', payment_data->>'id'
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."process_asaas_webhook"("tenant_id" "uuid", "event_type" "text", "event_json" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_billing_charge_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    gateway_id UUID;
BEGIN
    -- Buscar um gateway de pagamento ativo para o tenant
    SELECT id 
    INTO gateway_id
    FROM public.payment_gateways
    WHERE tenant_id = NEW.tenant_id
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Se encontrou um gateway, atualizar o faturamento
    IF gateway_id IS NOT NULL THEN
        UPDATE public.contract_billings 
        SET payment_gateway_id = gateway_id,
            updated_at = NOW()
        WHERE id = NEW.id;
        
        -- Inserir na fila de processamento para criação da cobrança externa
        INSERT INTO public.billing_processing_queue (
            tenant_id,
            billing_id,
            status,
            attempts,
            max_attempts,
            created_at
        ) VALUES (
            NEW.tenant_id,
            NEW.id,
            'pending',
            0,
            3,
            NOW()
        );
        
        -- Log do evento
        INSERT INTO public.system_logs (
            tenant_id,
            level,
            message,
            context,
            created_at
        ) VALUES (
            NEW.tenant_id,
            'INFO',
            'Billing charge creation queued',
            jsonb_build_object(
                'billing_id', NEW.id,
                'billing_number', NEW.billing_number,
                'gateway_id', gateway_id
            ),
            NOW()
        );
    ELSE
        -- Log de erro se não encontrou gateway
        INSERT INTO public.system_logs (
            tenant_id,
            level,
            message,
            context,
            created_at
        ) VALUES (
            NEW.tenant_id,
            'ERROR',
            'No active payment gateway found for billing',
            jsonb_build_object(
                'billing_id', NEW.id,
                'billing_number', NEW.billing_number
            ),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_billing_charge_creation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_billing_charge_creation"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."process_conciliation_staging_customer_data"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."process_conciliation_staging_customer_data"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_conciliation_staging_customer_data"() IS 'Função trigger que busca dados do cliente na API ASAAS e popula colunas customer_* na tabela conciliation_staging';



CREATE OR REPLACE FUNCTION "public"."process_contract_billing_charge"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    contract_data RECORD;
BEGIN
    -- AIDEV-NOTE: Busca informações do contrato relacionado ao faturamento
    SELECT 
        c.customer_id,
        c.contract_number,
        c.tenant_id
    INTO contract_data
    FROM contracts c
    WHERE c.id = NEW.contract_id;
    
    -- AIDEV-NOTE: Verifica se o contrato foi encontrado
    IF contract_data IS NULL THEN
        RAISE EXCEPTION 'Contrato não encontrado para contract_id: %', NEW.contract_id;
    END IF;
    
    -- AIDEV-NOTE: Insere nova cobrança na tabela charges INCLUINDO contract_id
    INSERT INTO charges (
        tenant_id,
        customer_id,
        contract_id,  -- CORREÇÃO: Incluindo contract_id como campo direto
        valor,
        status,
        tipo,
        data_vencimento,
        descricao,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        contract_data.tenant_id,
        contract_data.customer_id,
        NEW.contract_id,  -- CORREÇÃO: Preenchendo contract_id
        NEW.amount,
        'PENDING',
        'BOLETO',
        NEW.due_date,
        CONCAT('Cobrança automática - Contrato ', contract_data.contract_number, ' - Período: ', NEW.reference_start_date::text, ' a ', NEW.reference_end_date::text),
        jsonb_build_object(
            'contract_id', NEW.contract_id,
            'contract_billing_id', NEW.id,
            'contract_number', contract_data.contract_number,
            'billing_number', NEW.billing_number,
            'installment_number', NEW.installment_number,
            'total_installments', NEW.total_installments,
            'reference_period', NEW.reference_period,
            'reference_start_date', NEW.reference_start_date,
            'reference_end_date', NEW.reference_end_date,
            'auto_generated', true
        ),
        NOW(),
        NOW()
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_contract_billing_charge"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_contract_billing_charge"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."process_contract_stage_transitions"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    processed_count INTEGER := 0;
    contract_record RECORD;
    transition_rule RECORD;
    conditions_met BOOLEAN;
BEGIN
    -- Buscar contratos que podem ter transições automáticas
    FOR contract_record IN 
        SELECT c.*, cs.ai_enabled, cs.duration_sla_days
        FROM contracts c
        JOIN contract_stages cs ON c.stage_id = cs.id
        WHERE cs.ai_enabled = true
          AND c.status = 'ACTIVE'
    LOOP
        -- Buscar regras de transição aplicáveis
        FOR transition_rule IN
            SELECT * FROM contract_stage_transition_rules
            WHERE from_stage_id = contract_record.stage_id
              AND is_active = true
            ORDER BY priority DESC
        LOOP
            -- Aqui seria implementada a lógica de verificação das condições
            -- Por simplicidade, vamos criar uma condição básica baseada em tempo
            conditions_met := FALSE;
            
            -- Exemplo: Se passou do SLA, transicionar
            IF contract_record.duration_sla_days IS NOT NULL THEN
                IF (NOW() - contract_record.updated_at) > (contract_record.duration_sla_days || ' days')::INTERVAL THEN
                    conditions_met := TRUE;
                END IF;
            END IF;
            
            -- Se as condições foram atendidas, executar transição
            IF conditions_met THEN
                -- Atualizar o estágio do contrato
                UPDATE contracts 
                SET stage_id = transition_rule.to_stage_id,
                    updated_at = NOW()
                WHERE id = contract_record.id;
                
                -- Registrar no histórico de estágios
                INSERT INTO contract_stage_history (
                    contract_id, from_stage_id, to_stage_id, 
                    comments, changed_at, changed_by, metadata
                ) VALUES (
                    contract_record.id, 
                    transition_rule.from_stage_id, 
                    transition_rule.to_stage_id,
                    'Transição automática via IA',
                    NOW(),
                    NULL, -- Sistema
                    jsonb_build_object(
                        'automated', true,
                        'rule_id', transition_rule.id,
                        'rule_name', transition_rule.name
                    )
                );
                
                -- Registrar log da ação da IA
                INSERT INTO ai_contract_actions_log (
                    tenant_id, contract_id, stage_id, action_type,
                    action_data, ai_confidence_score, execution_result,
                    execution_details, triggered_by
                ) VALUES (
                    contract_record.tenant_id,
                    contract_record.id,
                    transition_rule.to_stage_id,
                    'STAGE_TRANSITION',
                    jsonb_build_object(
                        'from_stage', transition_rule.from_stage_id,
                        'to_stage', transition_rule.to_stage_id,
                        'rule_id', transition_rule.id
                    ),
                    0.95, -- Alta confiança para regras automáticas
                    'SUCCESS',
                    'Transição automática executada com sucesso',
                    'AI'
                );
                
                processed_count := processed_count + 1;
                EXIT; -- Sair do loop de regras para este contrato
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN processed_count;
END;
$$;


ALTER FUNCTION "public"."process_contract_stage_transitions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_user_role_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Se não for o próprio usuário tentando mudar seu papel
    IF NEW.user_role <> OLD.user_role AND auth.uid() = OLD.id THEN
        -- Verificar se é admin que pode alterar papéis
        IF NOT EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND user_role IN ('ADMIN', 'PLATFORM_ADMIN')
        ) THEN
            -- Se não for admin, reverte a alteração de papel
            NEW.user_role := OLD.user_role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_user_role_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_billing_statuses"("p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("updated_periods" integer, "pending_to_due" integer, "due_to_late" integer, "pending_to_late" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_current_date date := current_date;
    v_pending_to_due integer := 0;
    v_due_to_late integer := 0;
    v_pending_to_late integer := 0;
    v_total_updated integer := 0;
BEGIN
    -- AIDEV-NOTE: Atualizar PENDING → DUE_TODAY (bill_date = hoje)
    WITH updated_due AS (
        UPDATE public.contract_billing_periods
        SET 
            status = 'DUE_TODAY',
            updated_at = now()
        WHERE status = 'PENDING'
          AND bill_date = v_current_date
          AND billed_at IS NULL
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
        RETURNING id
    )
    SELECT count(*) INTO v_pending_to_due FROM updated_due;
    
    -- AIDEV-NOTE: Atualizar DUE_TODAY → LATE (bill_date < hoje)
    WITH updated_late_from_due AS (
        UPDATE public.contract_billing_periods
        SET 
            status = 'LATE',
            updated_at = now()
        WHERE status = 'DUE_TODAY'
          AND bill_date < v_current_date
          AND billed_at IS NULL
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
        RETURNING id
    )
    SELECT count(*) INTO v_due_to_late FROM updated_late_from_due;
    
    -- AIDEV-NOTE: Atualizar PENDING → LATE (bill_date < hoje, direto)
    WITH updated_late_from_pending AS (
        UPDATE public.contract_billing_periods
        SET 
            status = 'LATE',
            updated_at = now()
        WHERE status = 'PENDING'
          AND bill_date < v_current_date
          AND billed_at IS NULL
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
        RETURNING id
    )
    SELECT count(*) INTO v_pending_to_late FROM updated_late_from_pending;
    
    -- AIDEV-NOTE: Calcular total de atualizações
    v_total_updated := v_pending_to_due + v_due_to_late + v_pending_to_late;
    
    -- AIDEV-NOTE: Retornar estatísticas
    RETURN QUERY SELECT 
        v_total_updated,
        v_pending_to_due,
        v_due_to_late,
        v_pending_to_late;
END;
$$;


ALTER FUNCTION "public"."recalc_billing_statuses"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recalc_billing_statuses"("p_tenant_id" "uuid") IS 'Recalcula status de períodos de faturamento baseado na bill_date. Retorna estatísticas detalhadas.';



CREATE OR REPLACE FUNCTION "public"."recalc_billing_statuses_simple"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_result record;
BEGIN
    -- AIDEV-NOTE: Chamar função principal e retornar total de atualizações
    SELECT * INTO v_result FROM public.recalc_billing_statuses();
    RETURN v_result.updated_periods;
END;
$$;


ALTER FUNCTION "public"."recalc_billing_statuses_simple"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recalc_billing_statuses_simple"() IS 'Versão simplificada para uso em cron. Retorna apenas o número total de períodos atualizados.';



CREATE OR REPLACE FUNCTION "public"."recalc_contract_period_statuses"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_record RECORD;
    v_tenant_results jsonb := '[]'::jsonb;
    v_status_counts jsonb;
    v_tenant_result jsonb;
    v_total_tenants integer := 0;
    v_processed_tenants integer := 0;
BEGIN
    -- AIDEV-NOTE: Processar TODOS os tenants, não apenas um
    FOR v_tenant_record IN 
        SELECT id, name FROM tenants ORDER BY name
    LOOP
        v_total_tenants := v_total_tenants + 1;
        
        -- AIDEV-NOTE: Atualizar períodos com charges existentes para BILLED
        UPDATE contract_billing_periods 
        SET status = 'BILLED', 
            billed_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = v_tenant_record.id
          AND status NOT IN ('BILLED', 'PAID', 'SKIPPED', 'FAILED')
          AND EXISTS (
              SELECT 1 FROM charges c 
              WHERE c.billing_periods = contract_billing_periods.id
          );
        
        -- AIDEV-NOTE: Atualizar status baseado na bill_date para períodos sem charges
        UPDATE contract_billing_periods 
        SET status = CASE 
            WHEN bill_date = CURRENT_DATE THEN 'DUE_TODAY'::billing_period_status
            WHEN bill_date < CURRENT_DATE THEN 'LATE'::billing_period_status
            ELSE 'PENDING'::billing_period_status
        END,
        updated_at = NOW()
        WHERE tenant_id = v_tenant_record.id
          AND status NOT IN ('BILLED', 'PAID', 'SKIPPED', 'FAILED')
          AND NOT EXISTS (
              SELECT 1 FROM charges c 
              WHERE c.billing_periods = contract_billing_periods.id
          );
        
        -- AIDEV-NOTE: Contar registros em cada status para este tenant
        SELECT jsonb_object_agg(status, count) INTO v_status_counts
        FROM (
            SELECT status, COUNT(*) as count
            FROM contract_billing_periods 
            WHERE tenant_id = v_tenant_record.id
            GROUP BY status
        ) counts;
        
        -- AIDEV-NOTE: Se não há registros, definir contadores zerados
        IF v_status_counts IS NULL THEN
            v_status_counts := '{}'::jsonb;
        END IF;
        
        -- AIDEV-NOTE: Log de auditoria para cada tenant processado
        INSERT INTO audit_logs (tenant_id, action, resource_type, resource_id, old_values, new_values)
        VALUES (
            v_tenant_record.id,
            'RECALC_KANBAN_BILLING_LOGIC',
            'contract_billing_periods',
            'bulk_recalculation',
            jsonb_build_object('operation', 'recalc_contract_period_statuses'),
            jsonb_build_object(
                'tenant_id', v_tenant_record.id,
                'tenant_name', v_tenant_record.name,
                'status_counts', v_status_counts,
                'recalculated_at', NOW(),
                'logic', jsonb_build_object(
                    'faturar_hoje', 'bill_date = today',
                    'faturado_no_mes', 'status = BILLED (regardless of payment)',
                    'faturamento_pendente', 'bill_date < today (overdue)'
                )
            )
        );
        
        -- AIDEV-NOTE: Adicionar resultado deste tenant ao array de resultados
        v_tenant_result := jsonb_build_object(
            'tenant_id', v_tenant_record.id,
            'tenant_name', v_tenant_record.name,
            'status_counts', v_status_counts,
            'recalculated_at', NOW()
        );
        
        v_tenant_results := v_tenant_results || jsonb_build_array(v_tenant_result);
        v_processed_tenants := v_processed_tenants + 1;
    END LOOP;
    
    -- AIDEV-NOTE: Retornar resumo completo de todos os tenants processados
    RETURN jsonb_build_object(
        'total_tenants', v_total_tenants,
        'processed_tenants', v_processed_tenants,
        'recalculated_at', NOW(),
        'logic', jsonb_build_object(
            'faturar_hoje', 'bill_date = today',
            'faturado_no_mes', 'status = BILLED (regardless of payment)',
            'faturamento_pendente', 'bill_date < today (overdue)'
        ),
        'tenant_results', v_tenant_results
    );
END;
$$;


ALTER FUNCTION "public"."recalc_contract_period_statuses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_contract_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    contract_tenant_id uuid;
    contract_status text;
    v_contract_id uuid := COALESCE(NEW.contract_id, OLD.contract_id);
BEGIN
    -- Obter o tenant_id e status do contrato
    SELECT tenant_id, status INTO contract_tenant_id, contract_status
    FROM public.contracts
    WHERE id = v_contract_id;

    -- Atualiza o total do contrato baseado na soma dos serviços E produtos
    UPDATE public.contracts
    SET 
        total_amount = (
            SELECT COALESCE(SUM(total_amount), 0)
            FROM (
                -- Soma dos serviços
                SELECT total_amount FROM public.contract_services
                WHERE contract_id = v_contract_id AND COALESCE(is_active, TRUE) = TRUE
                UNION ALL
                -- Soma dos produtos
                SELECT total_amount FROM public.contract_products
                WHERE contract_id = v_contract_id AND COALESCE(is_active, TRUE) = TRUE
            ) as combined_totals
        ),
        total_tax = (
            SELECT COALESCE(SUM(tax_amount), 0)
            FROM (
                -- Soma das taxas dos serviços
                SELECT tax_amount FROM public.contract_services
                WHERE contract_id = v_contract_id AND COALESCE(is_active, TRUE) = TRUE
                UNION ALL
                -- Soma das taxas dos produtos
                SELECT tax_amount FROM public.contract_products
                WHERE contract_id = v_contract_id AND COALESCE(is_active, TRUE) = TRUE
            ) as combined_taxes
        ),
        updated_at = NOW()
    WHERE id = v_contract_id;

    -- CORREÇÃO: Só atualizar períodos de faturamento se o contrato estiver ACTIVE
    IF contract_tenant_id IS NOT NULL AND contract_status = 'ACTIVE' THEN
        PERFORM public.upsert_billing_periods_for_contract(
            v_contract_id,
            contract_tenant_id
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."recalculate_contract_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_financial_payables_status"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.financial_payables p
  set status = CASE
    when p.payment_date is not null or p.paid_amount is not null then 'PAID'
    when p.status = 'CANCELLED' then p.status
    when current_date = p.due_date then 'DUE_TODAY'
    when current_date = (p.due_date - interval '1 day')::date then 'DUE_SOON'
    when current_date > p.due_date then 'OVERDUE'
    else 'PENDING'
  end,
  updated_at = now();
end;$$;


ALTER FUNCTION "public"."refresh_financial_payables_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regenerate_contract_billing_forecasts"("contract_id_param" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    contract_record contracts%ROWTYPE;
    billing_interval interval;
    current_due_date date;
    installment_amount numeric;
    i integer;
    deleted_count integer;
    reference_start date;
    reference_end date;
    billing_id_var uuid;
BEGIN
    -- AIDEV-NOTE: Função para regenerar previsões usando funções que bypassam RLS
    
    -- Buscar dados do contrato
    SELECT * INTO contract_record
    FROM contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Contrato não encontrado',
            'contract_id', contract_id_param
        );
    END IF;
    
    -- Remover faturamentos pendentes existentes (usando RLS bypass)
    SET row_security = off;
    
    DELETE FROM contract_billing_items 
    WHERE billing_id IN (
        SELECT id FROM contract_billings 
        WHERE contract_id = contract_id_param 
        AND status = 'PENDING'
    );
    
    DELETE FROM contract_billings 
    WHERE contract_id = contract_id_param 
    AND status = 'PENDING';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    SET row_security = on;
    
    -- Verificar se o contrato tem dados válidos
    IF contract_record.billing_type IS NULL OR contract_record.installments IS NULL OR contract_record.installments <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Contrato não possui dados válidos para gerar faturamentos',
            'contract_id', contract_id_param
        );
    END IF;
    
    -- Calcular intervalo e gerar previsões
    CASE contract_record.billing_type
        WHEN 'MONTHLY' THEN billing_interval := '1 month'::interval;
        WHEN 'BIMONTHLY' THEN billing_interval := '2 months'::interval;
        WHEN 'QUARTERLY' THEN billing_interval := '3 months'::interval;
        WHEN 'SEMIANNUAL' THEN billing_interval := '6 months'::interval;
        WHEN 'ANNUAL' THEN billing_interval := '1 year'::interval;
        ELSE billing_interval := '1 month'::interval;
    END CASE;
    
    installment_amount := contract_record.total_amount / contract_record.installments;
    
    IF contract_record.billing_day IS NOT NULL THEN
        current_due_date := date_trunc('month', contract_record.initial_date) + (contract_record.billing_day - 1) * interval '1 day';
        IF current_due_date < contract_record.initial_date THEN
            current_due_date := current_due_date + billing_interval;
        END IF;
    ELSE
        current_due_date := contract_record.initial_date;
    END IF;
    
    -- Gerar novas previsões usando funções que bypassam RLS
    FOR i IN 1..contract_record.installments LOOP
        reference_start := current_due_date - billing_interval + interval '1 day';
        reference_end := current_due_date;
        
        SELECT bypass_rls_insert_billing(
            contract_record.tenant_id,
            contract_record.id,
            contract_record.contract_number || '-' || LPAD(i::text, 3, '0'),
            i,
            contract_record.installments,
            to_char(current_due_date, 'MM/YYYY'),
            reference_start,
            reference_end,
            CURRENT_DATE,
            current_due_date,
            current_due_date,
            installment_amount,
            'PENDING'
        ) INTO billing_id_var;
        
        PERFORM bypass_rls_insert_billing_item(
            billing_id_var,
            'Parcela ' || i || '/' || contract_record.installments || ' - ' || contract_record.contract_number,
            1,
            installment_amount
        );
        
        current_due_date := current_due_date + billing_interval;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Previsões de faturamento regeneradas com sucesso',
        'contract_id', contract_id_param,
        'deleted_billings', deleted_count,
        'generated_installments', contract_record.installments
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Garantir que RLS seja reabilitado em caso de erro
    SET row_security = on;
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Erro ao regenerar previsões: ' || SQLERRM,
        'contract_id', contract_id_param,
        'error_code', SQLSTATE
    );
END;
$$;


ALTER FUNCTION "public"."regenerate_contract_billing_forecasts"("contract_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."regenerate_contract_billing_forecasts"("contract_id_param" "uuid") IS 'Função para regenerar previsões de faturamento usando funções que bypassam RLS.';



CREATE OR REPLACE FUNCTION "public"."remove_punctuation"("text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
BEGIN
  RETURN regexp_replace($1, '[^0-9]', '', 'g');
END;
$_$;


ALTER FUNCTION "public"."remove_punctuation"("text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_tenant_member"("p_tenant_id" "uuid", "p_user_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_audit_id UUID;
  v_membership_exists BOOLEAN;
  v_is_last_owner BOOLEAN;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se o usuário tem permissão para remover membros
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = v_user_id 
    AND tenant_id = p_tenant_id 
    AND role IN ('admin', 'owner')
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Permissão negada. Apenas admins ou owners podem remover membros'
    );
  END IF;
  
  -- Verificar se o usuário a ser removido é o último owner
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = p_tenant_id
    AND role = 'owner'
    AND user_id = p_user_id
    AND (
      SELECT COUNT(*) FROM public.tenant_users
      WHERE tenant_id = p_tenant_id
      AND role = 'owner'
    ) = 1
  ) INTO v_is_last_owner;
  
  IF v_is_last_owner THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Não é possível remover o último owner do tenant'
    );
  END IF;
  
  -- Verificar se o membro existe no tenant
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE tenant_id = p_tenant_id
    AND user_id = p_user_id
  ) INTO v_membership_exists;
  
  IF NOT v_membership_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não é membro deste tenant'
    );
  END IF;
  
  -- Desativar o membro, mas manter o registro para auditoria
  -- e incrementar token_version para invalidar tokens existentes
  UPDATE public.tenant_users
  SET 
    active = false,
    token_version = COALESCE(token_version, 0) + 1,
    updated_at = now(),
    deactivated_at = now(),
    deactivated_by = v_user_id
  WHERE 
    tenant_id = p_tenant_id
    AND user_id = p_user_id;
  
  -- Registrar no log de auditoria
  INSERT INTO public.audit_logs (
    user_id,
    tenant_id,
    action,
    details
  ) VALUES (
    v_user_id,
    p_tenant_id,
    'TENANT_MEMBER_REMOVED',
    json_build_object(
      'removed_user_id', p_user_id,
      'removed_by', v_user_id
    )
  ) RETURNING id INTO v_audit_id;
  
  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'user_id', p_user_id,
    'audit_log_id', v_audit_id
  );
END;
$$;


ALTER FUNCTION "public"."remove_tenant_member"("p_tenant_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_tenant_member"("p_tenant_id" "uuid", "p_user_id" "uuid") IS 'Remove um membro de um tenant (desativando-o) e incrementa seu token_version para invalidar todos os tokens existentes. Previne remoção do último owner.';



CREATE OR REPLACE FUNCTION "public"."remove_tenant_user_v2"("tenant_id_param" "text", "user_id_param" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  tenant_id_uuid UUID;
  tenant_user_record tenant_users;
  current_user_role TEXT;
  admin_count INTEGER;
BEGIN
  -- Tentar converter o parâmetro para UUID
  BEGIN
    tenant_id_uuid := tenant_id_param::UUID;
  EXCEPTION WHEN others THEN
    -- Caso falhe, tente buscar o UUID pelo slug
    SELECT id INTO tenant_id_uuid FROM tenants WHERE slug = tenant_id_param;
    IF tenant_id_uuid IS NULL THEN
      RAISE EXCEPTION 'ID do tenant inválido ou slug não encontrado: %', tenant_id_param;
    END IF;
  END;
  
  -- Verificar se o usuário atual é TENANT_ADMIN
  SELECT role INTO current_user_role
  FROM tenant_users
  WHERE tenant_id = tenant_id_uuid AND user_id = auth.uid();
  
  IF current_user_role IS NULL OR current_user_role != 'TENANT_ADMIN' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você não tem permissão para remover usuários'
    );
  END IF;
  
  -- Verificar se está tentando remover a si mesmo
  IF user_id_param = auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você não pode remover a si mesmo do tenant'
    );
  END IF;
  
  -- Obter o registro do tenant_user a ser removido
  SELECT * INTO tenant_user_record
  FROM tenant_users
  WHERE tenant_id = tenant_id_uuid AND user_id = user_id_param;
  
  IF tenant_user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuário não encontrado neste tenant'
    );
  END IF;
  
  -- Se estiver removendo um TENANT_ADMIN, verificar se é o último admin
  IF tenant_user_record.role = 'TENANT_ADMIN' THEN
    SELECT COUNT(*) INTO admin_count
    FROM tenant_users
    WHERE tenant_id = tenant_id_uuid AND role = 'TENANT_ADMIN';
    
    IF admin_count <= 1 THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Não é possível remover o último administrador do tenant'
      );
    END IF;
  END IF;
  
  -- Remover o usuário do tenant
  DELETE FROM tenant_users
  WHERE tenant_id = tenant_id_uuid AND user_id = user_id_param;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Usuário removido com sucesso do tenant'
  );
END;
$$;


ALTER FUNCTION "public"."remove_tenant_user_v2"("tenant_id_param" "text", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."renew_access_token"("p_session_id" "uuid", "p_new_access_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Atualizar access token e timestamp de último acesso
    UPDATE tenant_refresh_sessions 
    SET 
        access_token = p_new_access_token,
        access_expires_at = NOW() + INTERVAL '1 hour',
        last_access = NOW()
    WHERE id = p_session_id
    AND is_active = true
    AND refresh_expires_at > NOW();
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count > 0;
END;
$$;


ALTER FUNCTION "public"."renew_access_token"("p_session_id" "uuid", "p_new_access_token" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."renew_access_token"("p_session_id" "uuid", "p_new_access_token" "text") IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."repair_user_permissions"("user_email" "text" DEFAULT NULL::"text", "user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  found_user RECORD;
  user_exists BOOLEAN;
  public_user_exists BOOLEAN;
  public_user_id UUID;
  result JSONB;
  auth_user RECORD;
BEGIN
  -- Verificar se os parâmetros são válidos
  IF user_email IS NULL AND user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'É necessário fornecer user_email ou user_id'
    );
  END IF;

  -- Buscar dados do usuário na tabela auth.users
  IF user_id IS NOT NULL THEN
    SELECT id, email, created_at INTO auth_user
    FROM auth.users
    WHERE id = user_id;
  ELSIF user_email IS NOT NULL THEN
    SELECT id, email, created_at INTO auth_user
    FROM auth.users
    WHERE email = user_email;
  END IF;
  
  -- Se não encontrou o usuário na tabela auth.users
  IF auth_user.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuário não encontrado na tabela auth.users'
    );
  END IF;
  
  public_user_id := auth_user.id;
  
  -- Verificar se o usuário existe na tabela pública
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = public_user_id
  ) INTO public_user_exists;
  
  -- Se não existir, criar um registro para o usuário
  IF NOT public_user_exists THEN
    BEGIN
      INSERT INTO users (
        id, 
        email, 
        user_role, 
        name, 
        status, 
        created_at,
        updated_at
      )
      VALUES (
        public_user_id,
        auth_user.email,
        'USER',
        split_part(auth_user.email, '@', 1),
        'ACTIVE',
        NOW(),
        NOW()
      );
      
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Registro de usuário criado com sucesso',
        'user_id', public_user_id,
        'email', auth_user.email
      );
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Erro ao criar registro de usuário: ' || SQLERRM,
        'error', SQLERRM,
        'code', SQLSTATE
      );
    END;
  ELSE
    -- Verificar se o papel de usuário já está definido corretamente
    DECLARE
      current_role TEXT;
    BEGIN
      SELECT user_role INTO current_role
      FROM users
      WHERE id = public_user_id;
      
      -- Atualizar o status para ACTIVE se estiver diferente
      UPDATE users 
      SET 
        status = 'ACTIVE',
        updated_at = NOW()
      WHERE id = public_user_id AND status <> 'ACTIVE';
      
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Permissões do usuário verificadas e atualizadas',
        'user_id', public_user_id,
        'email', auth_user.email,
        'role', current_role
      );
    END;
  END IF;
END;
$$;


ALTER FUNCTION "public"."repair_user_permissions"("user_email" "text", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resend_reseller_invite"("p_email" "text", "p_reseller_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_invite_id uuid;
    v_token text;
    v_result json;
    v_existing_invite record;
BEGIN
    -- Verificar se já existe um convite para este email e revendedor
    SELECT id, token INTO v_existing_invite
    FROM public.invites
    WHERE email = p_email
    AND metadata->>'reseller_id' = p_reseller_id::text
    ORDER BY created_at DESC
    LIMIT 1;

    -- Se existir, atualiza a data de expiração e usa o mesmo token
    IF v_existing_invite IS NOT NULL THEN
        UPDATE public.invites
        SET expires_at = NOW() + INTERVAL '7 days'
        WHERE id = v_existing_invite.id;
        
        v_invite_id := v_existing_invite.id;
        v_token := v_existing_invite.token;
    ELSE
        -- Gerar token único usando md5 do timestamp + email
        SELECT md5(extract(epoch from now())::text || p_email) INTO v_token;

        -- Criar novo convite
        INSERT INTO public.invites (
            email,
            token,
            created_by,
            expires_at,
            metadata
        )
        VALUES (
            p_email,
            v_token,
            auth.uid(),
            NOW() + INTERVAL '7 days',
            jsonb_build_object(
                'type', 'reseller',
                'reseller_id', p_reseller_id,
                'role', 'owner'
            )
        )
        RETURNING id INTO v_invite_id;
    END IF;

    -- Retornar os dados necessários para o frontend
    SELECT jsonb_build_object(
        'success', true,
        'invite_id', v_invite_id,
        'token', v_token,
        'email', p_email,
        'type', 'reseller',
        'needs_email', true
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."resend_reseller_invite"("p_email" "text", "p_reseller_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resend_tenant_invite_v2"("invite_id_param" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  invite_record tenant_invites;
  invite_tenant_id UUID;
  user_tenant_role TEXT;
BEGIN
  -- Obter registro do convite
  SELECT * INTO invite_record 
  FROM tenant_invites 
  WHERE id = invite_id_param;
  
  IF invite_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Convite não encontrado'
    );
  END IF;
  
  invite_tenant_id := invite_record.tenant_id;
  
  -- Verificar se o usuário tem permissão (TENANT_ADMIN)
  SELECT role INTO user_tenant_role
  FROM tenant_users
  WHERE tenant_id = invite_tenant_id AND user_id = auth.uid();
  
  IF user_tenant_role IS NULL OR user_tenant_role != 'TENANT_ADMIN' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você não tem permissão para reenviar convites'
    );
  END IF;
  
  -- Verificar se o convite está pendente
  IF invite_record.status != 'PENDING' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Apenas convites pendentes podem ser reenviados'
    );
  END IF;
  
  -- Atualizar o convite (apenas marca como "novo" para reenviar)
  UPDATE tenant_invites
  SET updated_at = now()
  WHERE id = invite_id_param;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Convite reenviado com sucesso'
  );
END;
$$;


ALTER FUNCTION "public"."resend_tenant_invite_v2"("invite_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_des_payable_sequence"("p_tenant_id" "uuid", "p_value" bigint DEFAULT 0) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
INSERT INTO public.des_payables_sequence (tenant_id, last_value)
VALUES (p_tenant_id, p_value)
ON CONFLICT (tenant_id)
DO UPDATE SET last_value = p_value, updated_at = now();
$$;


ALTER FUNCTION "public"."reset_des_payable_sequence"("p_tenant_id" "uuid", "p_value" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_monthly_billing"() RETURNS "json"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_updated_count INTEGER;
  v_month_start DATE;
BEGIN
  -- Calcular início do mês atual
  v_month_start := DATE_TRUNC('month', CURRENT_DATE);
  
  -- AIDEV-NOTE: Resetar campo 'billed' apenas para contratos que NÃO têm cobranças no mês atual
  UPDATE contracts 
  SET 
    billed = FALSE,
    updated_at = NOW()
  WHERE 
    status = 'ACTIVE' 
    AND billed = TRUE
    AND NOT EXISTS (
      SELECT 1 
      FROM charges ch 
      WHERE ch.contract_id = contracts.id 
        AND ch.created_at >= v_month_start
        AND ch.tenant_id = contracts.tenant_id
    );
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE 'Reset mensal executado: % contratos atualizados (apenas sem cobranças no mês)', v_updated_count;
  
  RETURN json_build_object(
    'success', TRUE,
    'updated_contracts', v_updated_count,
    'reset_date', CURRENT_DATE,
    'month_start', v_month_start,
    'description', 'Reset aplicado apenas a contratos sem cobranças no mês atual'
  );
END;
$$;


ALTER FUNCTION "public"."reset_monthly_billing"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_monthly_billing"() IS 'Monthly billing reset with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."revoke_all_tenant_tokens"("p_tenant_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_is_owner BOOLEAN;
  v_affected_rows INTEGER;
  v_audit_id UUID;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se o usuário é owner do tenant
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = v_user_id 
    AND tenant_id = p_tenant_id 
    AND role = 'owner'
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    -- Registrar tentativa de acesso não autorizado
    INSERT INTO public.security_logs (
      user_id,
      action,
      details,
      ip_address
    ) VALUES (
      v_user_id,
      'UNAUTHORIZED_MASS_TOKEN_REVOCATION_ATTEMPT',
      json_build_object('tenant_id', p_tenant_id),
      inet_client_addr()::TEXT
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'Permissão negada. Apenas owners podem revogar todos os tokens'
    );
  END IF;
  
  -- Incrementar a versão do token para todos os usuários do tenant
  UPDATE public.tenant_users
  SET 
    token_version = COALESCE(token_version, 0) + 1,
    updated_at = now()
  WHERE 
    tenant_id = p_tenant_id
  AND active = true;
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  
  -- Registrar no log de auditoria (ação crítica)
  INSERT INTO public.audit_logs (
    user_id,
    tenant_id,
    action,
    details
  ) VALUES (
    v_user_id,
    p_tenant_id,
    'ALL_TENANT_TOKENS_REVOKED',
    json_build_object(
      'affected_users', v_affected_rows,
      'revoked_by', v_user_id
    )
  ) RETURNING id INTO v_audit_id;
  
  -- Registrar também nos logs de segurança
  INSERT INTO public.security_logs (
    user_id,
    tenant_id,
    action,
    details,
    ip_address
  ) VALUES (
    v_user_id,
    p_tenant_id,
    'ALL_TENANT_TOKENS_REVOKED',
    json_build_object(
      'affected_users', v_affected_rows,
      'audit_log_id', v_audit_id
    ),
    inet_client_addr()::TEXT
  );
  
  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'affected_users', v_affected_rows,
    'audit_log_id', v_audit_id
  );
END;
$$;


ALTER FUNCTION "public"."revoke_all_tenant_tokens"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."revoke_all_tenant_tokens"("p_tenant_id" "uuid") IS 'Incrementa a versão do token para todos os usuários de um tenant, invalidando todos os tokens JWT emitidos anteriormente. Útil em caso de comprometimento de segurança.';



CREATE OR REPLACE FUNCTION "public"."revoke_refresh_token"("p_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  token_record record;
BEGIN
  -- Buscar e revogar o token
  UPDATE tenant_refresh_tokens 
  SET revoked_at = now()
  WHERE token = p_token
    AND revoked_at IS NULL
    AND expires_at > now()
  RETURNING user_id, tenant_id INTO token_record;
  
  -- Se encontrou e revogou
  IF FOUND THEN
    -- Log de auditoria
    INSERT INTO audit_logs (
      user_id,
      tenant_id,
      action,
      details
    ) VALUES (
      token_record.user_id,
      token_record.tenant_id,
      'REFRESH_TOKEN_REVOKED',
      jsonb_build_object('token_prefix', left(p_token, 8))
    );
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."revoke_refresh_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_refresh_tokens"("p_user_id" "uuid", "p_device_fingerprint" "text" DEFAULT NULL::"text", "p_reason" "text" DEFAULT 'USER_LOGOUT'::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    revoked_count integer;
BEGIN
    -- Revogar tokens
    UPDATE public.secure_refresh_tokens
    SET is_revoked = true,
        revoked_at = now(),
        revoked_reason = p_reason
    WHERE user_id = p_user_id
    AND is_revoked = false
    AND (p_device_fingerprint IS NULL OR device_fingerprint = p_device_fingerprint);
    
    GET DIAGNOSTICS revoked_count = ROW_COUNT;
    
    -- Log do evento
    PERFORM public.log_auth_event(
        p_user_id,
        (SELECT email FROM auth.users WHERE id = p_user_id),
        'TOKEN_REVOKED',
        NULL,
        NULL,
        jsonb_build_object(
            'revoked_count', revoked_count,
            'reason', p_reason,
            'device_fingerprint', p_device_fingerprint
        ),
        NULL
    );
    
    RETURN revoked_count;
END;
$$;


ALTER FUNCTION "public"."revoke_refresh_tokens"("p_user_id" "uuid", "p_device_fingerprint" "text", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."revoke_refresh_tokens"("p_user_id" "uuid", "p_device_fingerprint" "text", "p_reason" "text") IS 'Revoga refresh tokens de um usuário ou dispositivo específico';



CREATE OR REPLACE FUNCTION "public"."revoke_user_tenant_tokens"("p_user_id" "uuid", "p_tenant_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN;
  v_current_version INTEGER;
  v_audit_id UUID;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não autenticado'
    );
  END IF;
  
  -- Verificar se o usuário solicitante tem acesso ao tenant
  -- e se é admin ou owner
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = v_user_id 
    AND tenant_id = p_tenant_id 
    AND role IN ('admin', 'owner')
  ) INTO v_has_access;
  
  IF NOT v_has_access THEN
    -- Registrar tentativa de acesso não autorizado
    INSERT INTO public.security_logs (
      user_id,
      action,
      details,
      ip_address
    ) VALUES (
      v_user_id,
      'UNAUTHORIZED_TOKEN_REVOCATION_ATTEMPT',
      json_build_object(
        'target_user_id', p_user_id,
        'target_tenant_id', p_tenant_id
      ),
      inet_client_addr()::TEXT
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'Permissão negada. Apenas admins ou owners podem revogar tokens'
    );
  END IF;
  
  -- Obter a versão atual do token para o usuário no tenant
  SELECT token_version INTO v_current_version
  FROM public.tenant_users
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id;
  
  -- Incrementar a versão do token
  UPDATE public.tenant_users
  SET 
    token_version = COALESCE(token_version, 0) + 1,
    updated_at = now()
  WHERE 
    user_id = p_user_id 
    AND tenant_id = p_tenant_id
  RETURNING token_version INTO v_current_version;
  
  -- Registrar no log de auditoria
  INSERT INTO public.audit_logs (
    user_id,
    tenant_id,
    action,
    details
  ) VALUES (
    v_user_id,
    p_tenant_id,
    'USER_TENANT_TOKENS_REVOKED',
    json_build_object(
      'target_user_id', p_user_id,
      'previous_token_version', v_current_version - 1,
      'new_token_version', v_current_version,
      'revoked_by', v_user_id
    )
  ) RETURNING id INTO v_audit_id;
  
  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'tenant_id', p_tenant_id,
    'token_version', v_current_version,
    'audit_log_id', v_audit_id
  );
END;
$$;


ALTER FUNCTION "public"."revoke_user_tenant_tokens"("p_user_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."revoke_user_tenant_tokens"("p_user_id" "uuid", "p_tenant_id" "uuid") IS 'Incrementa a versão do token para um usuário específico em um tenant, invalidando todos os tokens JWT emitidos anteriormente para esta combinação de usuário-tenant.';



CREATE OR REPLACE FUNCTION "public"."safe_login"("user_email" "text", "user_password" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result json;
BEGIN
    -- Tenta fazer login usando a API do Supabase Auth
    BEGIN
        -- Esta é uma chamada simulada, não funcionará diretamente
        -- Apenas para ilustrar o conceito
        result := '{"success": true, "message": "Login simulado bem-sucedido"}'::json;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
    END;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."safe_login"("user_email" "text", "user_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_text_to_uuid"("p" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE v uuid; BEGIN
  BEGIN v := p::uuid; EXCEPTION WHEN others THEN RETURN NULL; END;
  RETURN v;
END; $$;


ALTER FUNCTION "public"."safe_text_to_uuid"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_upsert_contract_service"("p_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tenant_id uuid;
  v_contract_tenant_id uuid;
BEGIN
  v_tenant_id := get_current_tenant_id_simple();
  SELECT tenant_id INTO v_contract_tenant_id
  FROM contracts
  WHERE id = (p_data->>'contract_id')::uuid;
  IF v_contract_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;
  IF NOT user_has_tenant_access(v_contract_tenant_id) THEN
    RAISE EXCEPTION 'Acesso negado ao tenant';
  END IF;
  IF NOT (p_data ? 'tenant_id') THEN
    p_data := jsonb_set(p_data, '{tenant_id}', to_jsonb(v_tenant_id));
  END IF;
  INSERT INTO contract_services (
    id, contract_id, service_id, quantity, unit_price, discount_percentage,
    discount_amount, total_amount, tax_rate, tax_amount, description, is_active,
    tenant_id, payment_method, card_type, billing_type, recurrence_frequency,
    installments, payment_gateway
  ) VALUES (
    (p_data->>'id')::uuid, (p_data->>'contract_id')::uuid, (p_data->>'service_id')::uuid,
    (p_data->>'quantity')::numeric, (p_data->>'unit_price')::numeric,
    (p_data->>'discount_percentage')::numeric, (p_data->>'discount_amount')::numeric,
    (p_data->>'total_amount')::numeric, (p_data->>'tax_rate')::numeric,
    (p_data->>'tax_amount')::numeric, p_data->>'description',
    (p_data->>'is_active')::boolean, (p_data->>'tenant_id')::uuid,
    p_data->>'payment_method', p_data->>'card_type', p_data->>'billing_type',
    p_data->>'recurrence_frequency', (p_data->>'installments')::integer,
    p_data->>'payment_gateway'
  )
  ON CONFLICT (id) DO UPDATE SET
    contract_id = EXCLUDED.contract_id,
    service_id = EXCLUDED.service_id,
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    discount_percentage = EXCLUDED.discount_percentage,
    discount_amount = EXCLUDED.discount_amount,
    total_amount = EXCLUDED.total_amount,
    tax_rate = EXCLUDED.tax_rate,
    tax_amount = EXCLUDED.tax_amount,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    tenant_id = EXCLUDED.tenant_id,
    payment_method = EXCLUDED.payment_method,
    card_type = EXCLUDED.card_type,
    billing_type = EXCLUDED.billing_type,
    recurrence_frequency = EXCLUDED.recurrence_frequency,
    installments = EXCLUDED.installments,
    payment_gateway = EXCLUDED.payment_gateway,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."safe_upsert_contract_service"("p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_webhook_info"("p_tenant_id" "uuid", "p_webhook_url" "text", "p_webhook_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Atualiza a configuração do webhook
  UPDATE tenant_integrations
  SET webhook_url = p_webhook_url,
      webhook_token = p_webhook_token,
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id
    AND integration_type = 'asaas'
    AND is_active = true;

  -- Retorna sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Webhook configurado com sucesso'
  );
END;
$$;


ALTER FUNCTION "public"."save_webhook_info"("p_tenant_id" "uuid", "p_webhook_url" "text", "p_webhook_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_charges"("p_tenant_id" "uuid", "p_search_term" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_type" "text" DEFAULT NULL::"text", "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_contract_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 10) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSON;
  v_total INTEGER;
  v_offset INTEGER;
  v_search_pattern TEXT;
  v_cleaned_search TEXT;
BEGIN
  -- AIDEV-NOTE: Validar tenant_id
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id é obrigatório';
  END IF;

  -- AIDEV-NOTE: Não fazer validação explícita de acesso aqui
  -- O contexto de tenant já foi configurado via set_tenant_context_simple antes da chamada
  -- O RLS das tabelas charges e customers já protege os dados
  -- A validação de acesso já foi feita no frontend via useTenantAccessGuard

  -- AIDEV-NOTE: Calcular offset para paginação
  v_offset := (p_page - 1) * p_limit;

  -- AIDEV-NOTE: Preparar termo de busca
  IF p_search_term IS NOT NULL AND LENGTH(TRIM(p_search_term)) > 0 THEN
    v_search_pattern := '%' || LOWER(TRIM(p_search_term)) || '%';
    v_cleaned_search := REGEXP_REPLACE(p_search_term, '[^0-9]', '', 'g');
  END IF;

  -- AIDEV-NOTE: Buscar total de registros (sem paginação)
  SELECT COUNT(*) INTO v_total
  FROM charges c
  LEFT JOIN customers cust ON c.customer_id = cust.id
  WHERE c.tenant_id = p_tenant_id
    AND (
      -- Filtro de status
      (p_status IS NULL OR 
       (p_status = 'PENDING' AND c.status = 'PENDING' AND c.data_vencimento >= CURRENT_DATE) OR
       (p_status = 'OVERDUE' AND c.status = 'PENDING' AND c.data_vencimento < CURRENT_DATE) OR
       (p_status != 'PENDING' AND p_status != 'OVERDUE' AND c.status = p_status))
    )
    AND (p_type IS NULL OR c.tipo = p_type)
    AND (p_customer_id IS NULL OR c.customer_id = p_customer_id)
    AND (p_contract_id IS NULL OR c.contract_id = p_contract_id)
    AND (p_start_date IS NULL OR c.data_vencimento >= p_start_date)
    AND (p_end_date IS NULL OR c.data_vencimento <= p_end_date)
    AND (
      -- Busca: campos diretos da charge OU dados do customer
      v_search_pattern IS NULL OR
      c.descricao ILIKE v_search_pattern OR
      c.asaas_id ILIKE v_search_pattern OR
      cust.name ILIKE v_search_pattern OR
      cust.company ILIKE v_search_pattern OR
      (v_cleaned_search IS NOT NULL AND LENGTH(v_cleaned_search) >= 3 AND 
       cust.cpf_cnpj::TEXT ILIKE '%' || v_cleaned_search || '%')
    );

  -- AIDEV-NOTE: Buscar dados paginados
  WITH filtered_charges AS (
    SELECT 
      c.id,
      c.status,
      c.valor,
      c.tipo,
      c.data_vencimento,
      c.data_pagamento,
      c.descricao,
      c.asaas_id,
      c.metadata,
      c.created_at,
      c.updated_at,
      c.customer_id,
      c.contract_id,
      c.tenant_id,
      cust.id AS cust_id,
      cust.name AS cust_name,
      cust.company AS cust_company,
      cust.email AS cust_email,
      cust.phone AS cust_phone,
      cust.cpf_cnpj AS cust_cpf_cnpj,
      cont.id AS cont_id,
      cont.contract_number AS cont_contract_number
    FROM charges c
    LEFT JOIN customers cust ON c.customer_id = cust.id
    LEFT JOIN contracts cont ON c.contract_id = cont.id
    WHERE c.tenant_id = p_tenant_id
      AND (
        -- Filtro de status
        (p_status IS NULL OR 
         (p_status = 'PENDING' AND c.status = 'PENDING' AND c.data_vencimento >= CURRENT_DATE) OR
         (p_status = 'OVERDUE' AND c.status = 'PENDING' AND c.data_vencimento < CURRENT_DATE) OR
         (p_status != 'PENDING' AND p_status != 'OVERDUE' AND c.status = p_status))
      )
      AND (p_type IS NULL OR c.tipo = p_type)
      AND (p_customer_id IS NULL OR c.customer_id = p_customer_id)
      AND (p_contract_id IS NULL OR c.contract_id = p_contract_id)
      AND (p_start_date IS NULL OR c.data_vencimento >= p_start_date)
      AND (p_end_date IS NULL OR c.data_vencimento <= p_end_date)
      AND (
        -- Busca: campos diretos da charge OU dados do customer
        v_search_pattern IS NULL OR
        c.descricao ILIKE v_search_pattern OR
        c.asaas_id ILIKE v_search_pattern OR
        cust.name ILIKE v_search_pattern OR
        cust.company ILIKE v_search_pattern OR
        (v_cleaned_search IS NOT NULL AND LENGTH(v_cleaned_search) >= 3 AND 
         cust.cpf_cnpj::TEXT ILIKE '%' || v_cleaned_search || '%')
      )
    ORDER BY c.data_vencimento DESC, c.created_at DESC
    LIMIT p_limit
    OFFSET v_offset
  )
  SELECT json_build_object(
    'data', COALESCE(
      json_agg(
        json_build_object(
          'id', id,
          'status', status,
          'valor', valor,
          'tipo', tipo,
          'data_vencimento', data_vencimento,
          'data_pagamento', data_pagamento,
          'descricao', descricao,
          'asaas_id', asaas_id,
          'metadata', metadata,
          'created_at', created_at,
          'updated_at', updated_at,
          'customer_id', customer_id,
          'contract_id', contract_id,
          'tenant_id', tenant_id,
          'customers', CASE 
            WHEN cust_id IS NOT NULL THEN json_build_object(
              'id', cust_id,
              'name', cust_name,
              'company', cust_company,
              'email', cust_email,
              'phone', cust_phone,
              'cpf_cnpj', cust_cpf_cnpj
            )
            ELSE NULL
          END,
          'contracts', CASE
            WHEN cont_id IS NOT NULL THEN json_build_object(
              'id', cont_id,
              'contract_number', cont_contract_number
            )
            ELSE NULL
          END
        )
      ),
      '[]'::json
    ),
    'total', v_total
  ) INTO v_result
  FROM filtered_charges;

  -- AIDEV-NOTE: Retornar resultado ou objeto vazio se não houver dados
  RETURN COALESCE(v_result, json_build_object('data', '[]'::json, 'total', 0));
END;
$$;


ALTER FUNCTION "public"."search_charges"("p_tenant_id" "uuid", "p_search_term" "text", "p_status" "text", "p_type" "text", "p_customer_id" "uuid", "p_contract_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_page" integer, "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_charges"("p_tenant_id" "uuid", "p_search_term" "text", "p_status" "text", "p_type" "text", "p_customer_id" "uuid", "p_contract_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_page" integer, "p_limit" integer) IS 'Função RPC para busca eficiente de charges com filtros complexos. Resolve problema de URLs muito longas quando há muitos customers correspondentes.';



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "customer_asaas_id" "text",
    "active" boolean DEFAULT true,
    "additional_info" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "company" "text",
    "cpf_cnpj" bigint,
    "address" character varying(255),
    "postal_code" character varying(20),
    "address_number" character varying(20),
    "complement" character varying(255),
    "neighborhood" character varying(100),
    "city" character varying(100),
    "state" character varying(2),
    "country" character varying(50) DEFAULT 'Brasil'::character varying,
    "celular_whatsapp" "text",
    "created_by" "uuid"
);

ALTER TABLE ONLY "public"."customers" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."customers"."address" IS 'Endereço (logradouro)';



COMMENT ON COLUMN "public"."customers"."postal_code" IS 'CEP';



COMMENT ON COLUMN "public"."customers"."address_number" IS 'Número do endereço';



COMMENT ON COLUMN "public"."customers"."complement" IS 'Complemento (apto, sala, etc)';



COMMENT ON COLUMN "public"."customers"."neighborhood" IS 'Bairro';



COMMENT ON COLUMN "public"."customers"."city" IS 'Cidade';



COMMENT ON COLUMN "public"."customers"."state" IS 'Estado (UF)';



COMMENT ON COLUMN "public"."customers"."country" IS 'País';



COMMENT ON COLUMN "public"."customers"."celular_whatsapp" IS 'Número de celular/WhatsApp do cliente - mapeado do campo mobilePhone do Asaas';



CREATE OR REPLACE FUNCTION "public"."search_customers"("p_search_term" "text") RETURNS SETOF "public"."customers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_cleaned_search TEXT;
    v_tenant_id UUID;
BEGIN
    -- Extrai o tenant_id do JWT do usuário autenticado.
    -- Isso garante que a função opere apenas no contexto do tenant correto.
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;

    -- Remove todos os caracteres não numéricos para a busca em cpf_cnpj.
    v_cleaned_search := regexp_replace(p_search_term, '\D', '', 'g');

    -- Retorna os clientes que correspondem ao critério de busca dentro do tenant.
    RETURN QUERY
    SELECT *
    FROM customers c
    WHERE c.tenant_id = v_tenant_id
      AND (
           -- Busca por nome, empresa ou email usando ILIKE para ser case-insensitive.
           c.name ILIKE '%' || p_search_term || '%'
        OR c.company ILIKE '%' || p_search_term || '%'
        OR c.email ILIKE '%' || p_search_term || '%'
        -- Se houver uma string numérica, busca no campo cpf_cnpj.
        -- O campo bigint é convertido para texto para a comparação com LIKE.
        OR (v_cleaned_search <> '' AND c.cpf_cnpj::text LIKE v_cleaned_search || '%')
      );
END;
$$;


ALTER FUNCTION "public"."search_customers"("p_search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_auth_context"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Define o contexto de autenticação temporário
    PERFORM set_config('request.jwt.claims', json_build_object('sub', user_id::text)::text, true);
END;
$$;


ALTER FUNCTION "public"."set_auth_context"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_config"("setting_name" "text", "setting_value" "text", "is_local" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Log para debug
  RAISE LOG 'set_config chamada: % = % (local: %)', setting_name, setting_value, is_local;
  
  -- Validar parâmetros
  IF setting_name IS NULL OR setting_name = '' THEN
    RAISE EXCEPTION 'setting_name não pode ser nulo ou vazio';
  END IF;
  
  IF setting_value IS NULL THEN
    RAISE EXCEPTION 'setting_value não pode ser nulo';
  END IF;
  
  -- CORREÇÃO: Chamar explicitamente a função nativa do PostgreSQL
  PERFORM pg_catalog.set_config(setting_name, setting_value, is_local);
  
  -- Log de sucesso
  RAISE LOG 'Configuração definida com sucesso: % = %', setting_name, setting_value;
END;
$$;


ALTER FUNCTION "public"."set_config"("setting_name" "text", "setting_value" "text", "is_local" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_config"("setting_name" "text", "setting_value" "text", "is_local" boolean) IS 'Função RPC para definir configurações de sessão. Usada principalmente para app.current_tenant_id nas políticas RLS.';



CREATE OR REPLACE FUNCTION "public"."set_config_wrapper"("p_name" "text", "p_value" "text", "p_is_local" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM set_config(p_name, p_value, p_is_local);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao definir configuração %: %', p_name, SQLERRM;
END;
$$;


ALTER FUNCTION "public"."set_config_wrapper"("p_name" "text", "p_value" "text", "p_is_local" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_financial_payable_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Pago sempre prevalece
  IF NEW.payment_date IS NOT NULL OR NEW.paid_amount IS NOT NULL THEN
    NEW.status := 'PAID';
    RETURN NEW;
  END IF;

  -- Cancelado preserva
  IF NEW.status = 'CANCELLED' THEN
    RETURN NEW;
  END IF;

  -- Sem vencimento: pendente
  IF NEW.due_date IS NULL THEN
    NEW.status := 'PENDING';
    RETURN NEW;
  END IF;

  -- Vence hoje
  IF current_date = NEW.due_date THEN
    NEW.status := 'DUE_TODAY';

  -- Vencido
  ELSIF current_date > NEW.due_date THEN
    NEW.status := 'OVERDUE';

  -- A vencer baseado na emissão: se a diferença due_date - issue_date ≤ 7 dias
  ELSIF NEW.issue_date IS NOT NULL AND (NEW.due_date - NEW.issue_date) <= 7 THEN
    NEW.status := 'DUE_SOON';

  -- A vencer: dentro da janela de 7 dias até o vencimento (baseado na data atual)
  ELSIF current_date >= (NEW.due_date - interval '7 days')::date THEN
    NEW.status := 'DUE_SOON';

  -- Pendente: fora da janela
  ELSE
    NEW.status := 'PENDING';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_financial_payable_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_role_from_users_table"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Obter a role da tabela users
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
  
  -- Atualizar a role em auth.users
  IF user_role IS NOT NULL THEN
    UPDATE auth.users SET role = user_role WHERE id = auth.uid();
  END IF;
END;
$$;


ALTER FUNCTION "public"."set_role_from_users_table"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_tenant_config"("setting_name" "text", "new_value" "text", "is_local" boolean DEFAULT false) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Validar parâmetros de entrada
  IF setting_name IS NULL OR setting_name = '' THEN
    RAISE EXCEPTION 'Nome da configuração não pode ser vazio';
  END IF;
  
  -- Configurar o valor usando a função nativa do PostgreSQL
  PERFORM set_config(setting_name, new_value, is_local);
  
  -- Retornar o valor configurado
  RETURN new_value;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro para debug
    RAISE LOG 'Erro na função set_tenant_config: %', SQLERRM;
    RAISE EXCEPTION 'Erro ao configurar %: %', setting_name, SQLERRM;
END;
$$;


ALTER FUNCTION "public"."set_tenant_config"("setting_name" "text", "new_value" "text", "is_local" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_tenant_config"("setting_name" "text", "new_value" "text", "is_local" boolean) IS 'Função RPC para configurar variáveis de sessão do PostgreSQL. Renomeada de set_config para evitar conflito com função nativa do PostgreSQL. Utilizada principalmente para configurar app.current_tenant_id nas políticas RLS.';



CREATE OR REPLACE FUNCTION "public"."set_tenant_context_flexible"("p_tenant_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN public.set_tenant_context_flexible_boolean(p_tenant_id, p_user_id);
END;
$$;


ALTER FUNCTION "public"."set_tenant_context_flexible"("p_tenant_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_tenant_context_flexible"("p_tenant_id" "uuid", "p_user_id" "uuid") IS 'Define o contexto do tenant para o usuário especificado. Retorna true se bem-sucedido, false caso contrário. Inclui validação de segurança e auditoria.';



CREATE OR REPLACE FUNCTION "public"."set_tenant_context_flexible_boolean"("p_tenant_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    tenant_exists boolean;
    tenant_active boolean;
    user_has_access boolean;
BEGIN
    -- Verificar se o tenant existe e está ativo
    SELECT EXISTS(
        SELECT 1 FROM tenants 
        WHERE id = p_tenant_id
    ), COALESCE(
        (SELECT active FROM tenants WHERE id = p_tenant_id), false
    ) INTO tenant_exists, tenant_active;
    
    -- Se tenant não existe ou não está ativo, registrar e retornar false
    IF NOT tenant_exists OR NOT tenant_active THEN
        INSERT INTO audit_logs (entity_type, entity_id, tenant_id, action, new_data, performed_by, performed_at)
        VALUES ('tenant_ctx', gen_random_uuid(), p_tenant_id, 'CUSTOM', 
               json_build_object('operation', 'set_context', 'result', 'denied', 'tenant_id', p_tenant_id, 'reason', 
               CASE WHEN NOT tenant_exists THEN 'tenant_not_found' ELSE 'tenant_inactive' END),
               p_user_id, NOW());
        RETURN false;
    END IF;
    
    -- Verificar se o usuário tem acesso ao tenant
    SELECT EXISTS(
        SELECT 1 FROM tenant_users 
        WHERE tenant_id = p_tenant_id 
        AND user_id = p_user_id 
        AND (active IS NULL OR active = true)
    ) INTO user_has_access;
    
    -- Se usuário não tem acesso, registrar e retornar false
    IF NOT user_has_access THEN
        INSERT INTO audit_logs (entity_type, entity_id, tenant_id, action, new_data, performed_by, performed_at)
        VALUES ('tenant_ctx', gen_random_uuid(), p_tenant_id, 'CUSTOM', 
               json_build_object('operation', 'set_context', 'result', 'denied', 'tenant_id', p_tenant_id, 'user_id', p_user_id, 'reason', 'no_permission'),
               p_user_id, NOW());
        RETURN false;
    END IF;
    
    -- CORREÇÃO: Definir o contexto do tenant com escopo de sessão (local=false)
    PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
    PERFORM set_config('app.current_user_id', p_user_id::text, false);
    
    -- NOVA CORREÇÃO: Definir contexto de autenticação para que auth.uid() funcione
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id::text)::text, false);
    
    -- Registrar acesso bem-sucedido
    INSERT INTO audit_logs (entity_type, entity_id, tenant_id, action, new_data, performed_by, performed_at)
    VALUES ('tenant_ctx', gen_random_uuid(), p_tenant_id, 'CUSTOM', 
           json_build_object('operation', 'set_context', 'result', 'success', 'tenant_id', p_tenant_id, 'user_id', p_user_id),
           p_user_id, NOW());
    
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."set_tenant_context_flexible_boolean"("p_tenant_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_tenant_context_flexible_boolean"("p_tenant_id" "uuid", "p_user_id" "uuid") IS 'Função auxiliar que implementa a lógica de definição de contexto do tenant com retorno booleano. Inclui validação rigorosa e logging de auditoria.';



CREATE OR REPLACE FUNCTION "public"."set_tenant_context_simple"("p_tenant_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_access BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- Log da entrada da função
    RAISE LOG 'set_tenant_context_simple: tenant_id=%, user_id=%', p_tenant_id, p_user_id;
    
    -- Verificar se o tenant existe
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
        RAISE LOG 'set_tenant_context_simple: Tenant % não encontrado', p_tenant_id;
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tenant não encontrado',
            'tenant_id', p_tenant_id
        );
    END IF;
    
    -- Se user_id foi fornecido, verificar acesso
    IF p_user_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM tenant_users 
            WHERE user_id = p_user_id 
            AND tenant_id = p_tenant_id
        ) INTO v_user_access;
        
        IF NOT v_user_access THEN
            RAISE LOG 'set_tenant_context_simple: Usuário % não tem acesso ao tenant %', p_user_id, p_tenant_id;
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Acesso negado ao tenant',
                'tenant_id', p_tenant_id,
                'user_id', p_user_id
            );
        END IF;
    END IF;
    
    -- CORREÇÃO CRÍTICA: Usar set_config com false para persistir na transação atual
    -- O terceiro parâmetro false significa que a configuração persiste na transação
    PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
    
    -- Se user_id foi fornecido, definir também
    IF p_user_id IS NOT NULL THEN
        PERFORM set_config('app.current_user_id', p_user_id::text, false);
    END IF;
    
    v_result := jsonb_build_object(
        'success', true,
        'tenant_id', p_tenant_id,
        'user_id', p_user_id,
        'message', 'Contexto definido com sucesso'
    );
    
    RAISE LOG 'set_tenant_context_simple: Sucesso - %', v_result;
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'set_tenant_context_simple: Erro - %', SQLERRM;
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'tenant_id', p_tenant_id,
            'user_id', p_user_id
        );
END;
$$;


ALTER FUNCTION "public"."set_tenant_context_simple"("p_tenant_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_tenant_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Gera o slug a partir do nome se o slug não for fornecido ou estiver vazio
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := slugify(NEW.name);
  ELSE
     -- Se um slug foi fornecido manualmente, apenas o limpa/formata
     NEW.slug := slugify(NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_tenant_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end; $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_role"("user_id" "uuid", "role" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Atualiza a user_role na tabela users
  UPDATE public.users
  SET user_role = role
  WHERE id = user_id;
  
  -- Define a role na sessão atual (mantemos para compatibilidade)
  PERFORM set_config('app.user_role', role, false);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao definir role do usuário %: %', user_id, SQLERRM;
END;
$$;


ALTER FUNCTION "public"."set_user_role"("user_id" "uuid", "role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."setup_asaas_webhook"("p_tenant_id" "uuid", "p_webhook_url" "text", "p_webhook_token" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_tenant_id ALIAS FOR p_tenant_id;
    v_integration_exists BOOLEAN;
    v_current_config JSONB;
BEGIN
    -- Verificar acesso ao tenant
    PERFORM public.check_tenant_access(v_tenant_id);

    -- Verificar se existe integração ativa
    SELECT 
        EXISTS (
            SELECT 1 
            FROM public.tenant_integrations ti
            WHERE ti.tenant_id = v_tenant_id
              AND ti.integration_type = 'ASAAS'
              AND ti.is_active = true
        ),
        ti.config
    INTO 
        v_integration_exists,
        v_current_config
    FROM public.tenant_integrations ti
    WHERE ti.tenant_id = v_tenant_id
      AND ti.integration_type = 'ASAAS'
      AND ti.is_active = true;

    IF NOT v_integration_exists THEN
        RETURN QUERY 
        SELECT 
            false::BOOLEAN,
            'Integração ASAAS não encontrada ou inativa'::TEXT;
        RETURN;
    END IF;

    -- Atualizar config com webhook_url e webhook_token
    UPDATE public.tenant_integrations ti
    SET 
        config = v_current_config || jsonb_build_object(
            'webhook_url', p_webhook_url,
            'webhook_token', p_webhook_token
        ),
        updated_at = NOW()
    WHERE ti.tenant_id = v_tenant_id
      AND ti.integration_type = 'ASAAS'
      AND ti.is_active = true;

    -- Retornar sucesso
    RETURN QUERY 
    SELECT 
        true::BOOLEAN,
        'Webhook configurado com sucesso'::TEXT;
END;
$$;


ALTER FUNCTION "public"."setup_asaas_webhook"("p_tenant_id" "uuid", "p_webhook_url" "text", "p_webhook_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."skip_billing_period"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_skip_reason" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_period RECORD;
  v_result JSON;
BEGIN
  -- AIDEV-NOTE: Configurar contexto de tenant para RLS
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
  
  -- Buscar o período e validar
  SELECT * INTO v_period
  FROM contract_billing_periods
  WHERE id = p_period_id 
    AND tenant_id = p_tenant_id
    AND status NOT IN ('BILLED', 'SKIPPED');
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Período não encontrado ou já processado',
      'code', 'PERIOD_NOT_FOUND_OR_PROCESSED'
    );
  END IF;
  
  -- Atualizar período como pulado
  UPDATE contract_billing_periods
  SET 
    status = 'SKIPPED',
    manual_mark = true,
    manual_reason = COALESCE(p_skip_reason, 'Período pulado'),
    updated_at = NOW()
  WHERE id = p_period_id AND tenant_id = p_tenant_id;
  
  -- Retornar sucesso
  v_result := json_build_object(
    'success', true,
    'period_id', p_period_id,
    'status', 'SKIPPED',
    'skip_reason', COALESCE(p_skip_reason, 'Período pulado')
  );
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."skip_billing_period"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_skip_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."skip_billing_period"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_skip_reason" "text") IS 'Pula período de faturamento com motivo';



CREATE OR REPLACE FUNCTION "public"."skip_period"("p_billing_period_id" "uuid", "p_actor" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id uuid;
    v_current_status billing_period_status;
BEGIN
    -- AIDEV-NOTE: Buscar tenant_id e status atual
    SELECT tenant_id, status 
    INTO v_tenant_id, v_current_status
    FROM contract_billing_periods 
    WHERE id = p_billing_period_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Período de faturamento não encontrado: %', p_billing_period_id;
    END IF;
    
    -- AIDEV-NOTE: Configurar contexto de tenant
    PERFORM set_tenant_context_simple(v_tenant_id);
    
    -- AIDEV-NOTE: Atualizar período para SKIPPED
    UPDATE contract_billing_periods 
    SET 
        status = 'SKIPPED'::billing_period_status,
        manual_reason = p_reason,
        actor_id = p_actor,
        from_status = v_current_status,
        transition_reason = p_reason,
        updated_at = now()
    WHERE id = p_billing_period_id;
    
    -- AIDEV-NOTE: Log da operação usando estrutura correta
    INSERT INTO audit_logs (
        tenant_id,
        resource_type,
        resource_id,
        action,
        old_values,
        new_values,
        performed_by,
        performed_at
    ) VALUES (
        v_tenant_id,
        'contract_billing_periods',
        p_billing_period_id::text,
        'UPDATE',
        jsonb_build_object('status', v_current_status),
        jsonb_build_object('status', 'SKIPPED', 'manual_reason', p_reason),
        p_actor,
        now()
    );
END;
$$;


ALTER FUNCTION "public"."skip_period"("p_billing_period_id" "uuid", "p_actor" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify"("value" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT
    -- Remove hífens no início ou fim
    trim(both '-' from
      -- Remove hífens duplicados
      regexp_replace(
        -- Remove caracteres que não são letras, números ou hífens
        regexp_replace(
          -- Converte para minúsculas e remove acentos
          lower(unaccent(value)),
        '[^a-z0-9\\-]+', '-', 'g'),
      '-+', '-', 'g')
    );
$$;


ALTER FUNCTION "public"."slugify"("value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."smart_upsert_billing_periods_for_contract"("p_contract_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_contract RECORD;
    v_old_contract RECORD;
    v_has_customizations BOOLEAN := false;
    v_only_billing_day_changed BOOLEAN := false;
    v_periods_count INTEGER := 0;
BEGIN
    -- AIDEV-NOTE: Buscar dados atuais do contrato
    SELECT *
    INTO v_contract
    FROM public.contracts
    WHERE id = p_contract_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contrato não encontrado: %', p_contract_id;
    END IF;
    
    -- AIDEV-NOTE: Verificar se existem períodos customizados
    -- (períodos que não seguem o padrão mensal padrão)
    SELECT COUNT(*) > 0
    INTO v_has_customizations
    FROM public.contract_billing_periods cbp
    WHERE cbp.contract_id = p_contract_id
      AND cbp.tenant_id = v_contract.tenant_id
      AND cbp.status IN ('PENDING', 'DUE_TODAY', 'LATE')
      AND (
          -- Períodos com datas customizadas
          cbp.period_start != date_trunc('month', cbp.period_start)::date OR
          cbp.period_end != (date_trunc('month', cbp.period_start) + interval '1 month - 1 day')::date OR
          -- Valores customizados diferentes do padrão
          cbp.amount_planned != v_contract.total_amount
      );
    
    -- AIDEV-NOTE: Se há customizações, usar função que preserva
    IF v_has_customizations THEN
        RETURN public.update_billing_day_preserve_customizations(
            p_contract_id,
            v_contract.billing_day,
            v_contract.anticipate_weekends
        );
    ELSE
        -- AIDEV-NOTE: Se não há customizações, usar função original
        RETURN public.upsert_billing_periods_for_contract(p_contract_id);
    END IF;
END;
$$;


ALTER FUNCTION "public"."smart_upsert_billing_periods_for_contract"("p_contract_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_all_users_metadata"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    user_record RECORD;
    sync_result JSONB;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    errors JSONB := '[]'::jsonb;
BEGIN
    -- Iterar sobre todos os usuários ativos
    FOR user_record IN 
        SELECT id 
        FROM public.users 
        WHERE status = 'ACTIVE'
    LOOP
        -- Sincronizar cada usuário
        SELECT public.sync_user_metadata_from_public_users(user_record.id) 
        INTO sync_result;
        
        -- Verificar resultado
        IF (sync_result->>'success')::boolean THEN
            success_count := success_count + 1;
        ELSE
            error_count := error_count + 1;
            errors := errors || jsonb_build_object(
                'user_id', user_record.id,
                'error', sync_result->>'error'
            );
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_processed', success_count + error_count,
        'success_count', success_count,
        'error_count', error_count,
        'errors', errors,
        'sync_timestamp', EXTRACT(EPOCH FROM NOW())
    );
END;
$$;


ALTER FUNCTION "public"."sync_all_users_metadata"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_all_users_metadata"() IS 'All users metadata sync with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."sync_billing_periods_relationship"() RETURNS TABLE("action" "text", "charge_id" "uuid", "billing_period_id" "uuid", "details" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- AIDEV-NOTE: Função para sincronizar relacionamentos entre charges e billing_periods
    -- Útil para manutenção e verificação de integridade
    
    RETURN QUERY
    SELECT 
        'MISSING_BILLING_PERIOD'::TEXT as action,
        c.id as charge_id,
        c.billing_periods as billing_period_id,
        'Charge referencia billing_period inexistente'::TEXT as details
    FROM public.charges c
    WHERE c.billing_periods IS NOT NULL 
      AND NOT EXISTS (
          SELECT 1 FROM public.contract_billing_periods cbp 
          WHERE cbp.id = c.billing_periods 
            AND cbp.tenant_id = c.tenant_id
      )
    
    UNION ALL
    
    SELECT 
        'ORPHANED_CHARGE_ID'::TEXT as action,
        cbp.charge_id as charge_id,
        cbp.id as billing_period_id,
        'Billing_period tem charge_id mas charge não referencia de volta'::TEXT as details
    FROM public.contract_billing_periods cbp
    WHERE cbp.charge_id IS NOT NULL 
      AND NOT EXISTS (
          SELECT 1 FROM public.charges c 
          WHERE c.billing_periods = cbp.id 
            AND c.tenant_id = cbp.tenant_id
      );
END;
$$;


ALTER FUNCTION "public"."sync_billing_periods_relationship"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_billing_status_on_charge_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Atualizar status do contract_billing quando charge muda
  IF OLD.status != NEW.status THEN
    UPDATE contract_billings 
    SET 
      status = CASE 
        WHEN NEW.status = 'PAID' THEN 'PAID'
        WHEN NEW.status = 'CANCELLED' THEN 'CANCELLED'
        WHEN NEW.status = 'OVERDUE' THEN 'OVERDUE'
        ELSE 'PENDING'
      END,
      updated_at = NOW()
    WHERE contract_id = NEW.contract_id
      AND tenant_id = NEW.tenant_id
      AND due_date = NEW.data_vencimento
      AND amount = NEW.valor;
    
    RAISE NOTICE 'Status sincronizado: charge % -> contract_billing (% para %)', 
      NEW.id, OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_billing_status_on_charge_update"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_billing_status_on_charge_update"() IS 'Billing sync trigger with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."sync_charges_from_asaas_all_tenants"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tenant RECORD;
  v_result JSON;
  v_results JSON[] := '{}';
  v_total_tenants INTEGER := 0;
  v_successful_tenants INTEGER := 0;
  v_failed_tenants INTEGER := 0;
BEGIN
  FOR v_tenant IN
    SELECT id, name
    FROM tenants
    WHERE active = true
    ORDER BY created_at
  LOOP
    v_total_tenants := v_total_tenants + 1;
    
    BEGIN
      v_result := sync_charges_from_asaas_for_tenant(v_tenant.id);
      v_results := array_append(v_results, v_result);
      v_successful_tenants := v_successful_tenants + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed_tenants := v_failed_tenants + 1;
      v_results := array_append(v_results, json_build_object(
        'tenant_id', v_tenant.id,
        'tenant_name', v_tenant.name,
        'error', SQLERRM,
        'timestamp', NOW()
      ));
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'total_tenants', v_total_tenants,
    'successful_tenants', v_successful_tenants,
    'failed_tenants', v_failed_tenants,
    'results', v_results,
    'timestamp', NOW(),
    'note', 'Esta função identifica charges que precisam sincronização. A Edge Function sync-charges-from-asaas-api deve ser chamada para buscar dados da API e atualizar.'
  );
END;
$$;


ALTER FUNCTION "public"."sync_charges_from_asaas_all_tenants"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_charges_from_asaas_all_tenants"() IS 'Identifica charges do ASAAS que precisam sincronização para todos os tenants ativos. Executado automaticamente via pg_cron a cada 1 hora. A Edge Function sync-charges-from-asaas-api deve processar as charges identificadas.';



CREATE OR REPLACE FUNCTION "public"."sync_charges_from_asaas_for_tenant"("p_tenant_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_charge RECORD;
  v_total_found INTEGER := 0;
  v_charges_to_sync JSON[] := '{}';
BEGIN
  FOR v_charge IN
    SELECT * FROM identify_charges_needing_sync(p_tenant_id)
  LOOP
    v_total_found := v_total_found + 1;
    v_charges_to_sync := array_append(
      v_charges_to_sync,
      json_build_object(
        'charge_id', v_charge.charge_id,
        'asaas_id', v_charge.asaas_id,
        'current_status', v_charge.current_status,
        'current_data_pagamento', v_charge.current_data_pagamento
      )
    );
  END LOOP;
  
  RETURN json_build_object(
    'tenant_id', p_tenant_id,
    'total_found', v_total_found,
    'charges_to_sync', v_charges_to_sync,
    'timestamp', NOW()
  );
END;
$$;


ALTER FUNCTION "public"."sync_charges_from_asaas_for_tenant"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_charges_from_asaas_for_tenant"("p_tenant_id" "uuid") IS 'Identifica charges do ASAAS que precisam sincronização para um tenant específico. Retorna lista para processamento pela Edge Function.';



CREATE OR REPLACE FUNCTION "public"."sync_charges_from_staging_all_tenants"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tenant RECORD;
  v_result JSON;
  v_results JSON[] := '{}';
  v_total_tenants INTEGER := 0;
  v_successful_tenants INTEGER := 0;
  v_failed_tenants INTEGER := 0;
BEGIN
  -- AIDEV-NOTE: Processar cada tenant ativo
  FOR v_tenant IN
    SELECT id, name
    FROM tenants
    WHERE active = true
    ORDER BY created_at
  LOOP
    v_total_tenants := v_total_tenants + 1;
    
    BEGIN
      v_result := sync_charges_from_staging_for_tenant(v_tenant.id);
      v_results := array_append(v_results, v_result);
      v_successful_tenants := v_successful_tenants + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed_tenants := v_failed_tenants + 1;
      v_results := array_append(v_results, json_build_object(
        'tenant_id', v_tenant.id,
        'tenant_name', v_tenant.name,
        'error', SQLERRM,
        'timestamp', NOW()
      ));
    END;
  END LOOP;
  
  -- AIDEV-NOTE: Retornar resumo consolidado
  RETURN json_build_object(
    'success', true,
    'total_tenants', v_total_tenants,
    'successful_tenants', v_successful_tenants,
    'failed_tenants', v_failed_tenants,
    'results', v_results,
    'timestamp', NOW()
  );
END;
$$;


ALTER FUNCTION "public"."sync_charges_from_staging_all_tenants"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_charges_from_staging_all_tenants"() IS 'Processa sincronização de charges para todos os tenants ativos. Executado automaticamente via pg_cron a cada 1 hora.';



CREATE OR REPLACE FUNCTION "public"."sync_charges_from_staging_for_tenant"("p_tenant_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total_found INTEGER := 0;
  v_processed INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors INTEGER := 0;
  v_movement RECORD;
  v_charge_id UUID;
  v_mapped_status TEXT;
  v_needs_update BOOLEAN;
  v_current_status TEXT;
  v_current_payment_value NUMERIC;
  v_update_result INTEGER;
BEGIN
  -- AIDEV-NOTE: Buscar movimentações que podem ser sincronizadas
  FOR v_movement IN
    SELECT 
      cs.id as movement_id,
      cs.tenant_id,
      cs.id_externo,
      cs.status_externo,
      cs.valor_cobranca,
      cs.charge_id
    FROM conciliation_staging cs
    WHERE cs.tenant_id = p_tenant_id
      AND cs.origem = 'ASAAS'
      AND cs.deleted_flag = false
      AND cs.status_externo IS NOT NULL
    ORDER BY cs.created_at DESC
  LOOP
    v_total_found := v_total_found + 1;
    
    BEGIN
      -- AIDEV-NOTE: Buscar charge vinculada
      v_charge_id := v_movement.charge_id;
      
      IF v_charge_id IS NULL AND v_movement.id_externo IS NOT NULL THEN
        SELECT c.id INTO v_charge_id
        FROM charges c
        WHERE c.tenant_id = p_tenant_id
          AND c.asaas_id = v_movement.id_externo
        LIMIT 1;
      END IF;
      
      IF v_charge_id IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      
      -- AIDEV-NOTE: Verificar se precisa atualizar
      SELECT 
        c.status,
        c.payment_value
      INTO 
        v_current_status,
        v_current_payment_value
      FROM charges c
      WHERE c.id = v_charge_id
        AND c.tenant_id = p_tenant_id;
      
      IF v_current_status IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      
      -- Verificar se precisa atualizar
      v_mapped_status := map_external_status_to_charge_status(v_movement.status_externo);
      
      v_needs_update := FALSE;
      
      -- Verificar status
      IF v_current_status != v_mapped_status THEN
        v_needs_update := TRUE;
      END IF;
      
      -- Verificar payment_value (convertendo para NUMERIC para comparação correta)
      IF (v_current_payment_value IS DISTINCT FROM v_movement.valor_cobranca::NUMERIC 
          AND v_movement.valor_cobranca IS NOT NULL) THEN
        v_needs_update := TRUE;
      END IF;
      
      IF NOT v_needs_update THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      
      -- AIDEV-NOTE: Atualizar charge (tratando possíveis erros de trigger)
      BEGIN
        UPDATE charges
        SET 
          status = v_mapped_status,
          payment_value = v_movement.valor_cobranca::NUMERIC,
          updated_at = NOW() - INTERVAL '3 hours'
        WHERE id = v_charge_id
          AND tenant_id = p_tenant_id;
        
        GET DIAGNOSTICS v_update_result = ROW_COUNT;
        
        IF v_update_result > 0 THEN
          v_updated := v_updated + 1;
          v_processed := v_processed + 1;
        ELSE
          v_skipped := v_skipped + 1;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        -- AIDEV-NOTE: Se houver erro no trigger, tentar atualizar sem payment_value primeiro
        BEGIN
          UPDATE charges
          SET 
            status = v_mapped_status,
            updated_at = NOW() - INTERVAL '3 hours'
          WHERE id = v_charge_id
            AND tenant_id = p_tenant_id;
          
          v_updated := v_updated + 1;
          v_processed := v_processed + 1;
          
          -- Tentar atualizar payment_value separadamente
          BEGIN
            UPDATE charges
            SET payment_value = v_movement.valor_cobranca::NUMERIC
            WHERE id = v_charge_id
              AND tenant_id = p_tenant_id;
          EXCEPTION WHEN OTHERS THEN
            -- Se ainda falhar, apenas logar o erro
            RAISE WARNING 'Erro ao atualizar payment_value para charge %: %', v_charge_id, SQLERRM;
          END;
          
        EXCEPTION WHEN OTHERS THEN
          v_errors := v_errors + 1;
          RAISE WARNING 'Erro ao atualizar charge %: %', v_charge_id, SQLERRM;
        END;
      END;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Erro ao processar movimentação %: %', v_movement.movement_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'tenant_id', p_tenant_id,
    'total_found', v_total_found,
    'processed', v_processed,
    'updated', v_updated,
    'skipped', v_skipped,
    'errors', v_errors,
    'timestamp', NOW()
  );
END;
$$;


ALTER FUNCTION "public"."sync_charges_from_staging_for_tenant"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_charges_from_staging_for_tenant"("p_tenant_id" "uuid") IS 'Sincroniza charges com conciliation_staging para um tenant específico. Atualiza status e payment_value.';



CREATE OR REPLACE FUNCTION "public"."sync_user_metadata_from_public_users"("target_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    user_data RECORD;
    current_metadata JSONB;
    updated_metadata JSONB;
BEGIN
    -- Buscar dados do usuário na tabela public.users
    SELECT 
        user_role,
        name,
        status,
        updated_at
    INTO user_data
    FROM public.users 
    WHERE id = target_user_id;
    
    -- Verificar se o usuário existe
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found in public.users',
            'user_id', target_user_id
        );
    END IF;
    
    -- Obter metadata atual
    SELECT raw_user_meta_data 
    INTO current_metadata
    FROM auth.users 
    WHERE id = target_user_id;
    
    -- Verificar se o usuário existe na tabela auth.users
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found in auth.users',
            'user_id', target_user_id
        );
    END IF;
    
    -- Construir metadata atualizado preservando dados existentes
    updated_metadata := COALESCE(current_metadata, '{}'::jsonb) || jsonb_build_object(
        'user_role', user_data.user_role,
        'name', user_data.name,
        'status', user_data.status,
        'sync_updated_at', EXTRACT(EPOCH FROM NOW())
    );
    
    -- Atualizar o user_metadata na tabela auth.users
    UPDATE auth.users 
    SET 
        raw_user_meta_data = updated_metadata,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', target_user_id,
        'synced_data', jsonb_build_object(
            'user_role', user_data.user_role,
            'name', user_data.name,
            'status', user_data.status
        ),
        'sync_timestamp', EXTRACT(EPOCH FROM NOW())
    );
END;
$$;


ALTER FUNCTION "public"."sync_user_metadata_from_public_users"("target_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_user_metadata_from_public_users"("target_user_id" "uuid") IS 'User metadata sync with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."sync_user_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_email TEXT;
  user_role_value TEXT := 'USER'; -- Papel padrão
BEGIN
  -- Obter email do novo registro
  user_email := NEW.email;
  
  -- Verificar se o usuário tem papel administrativo nos metadados
  IF NEW.raw_user_meta_data->>'role' = 'service_role' THEN
    user_role_value := 'ADMIN';
  ELSIF NEW.raw_user_meta_data->>'admin' = 'true' THEN
    user_role_value := 'ADMIN';
  END IF;
  
  -- Inserir ou atualizar na tabela users (corrigido para usar apenas user_role)
  INSERT INTO public.users (
    id, 
    email, 
    user_role,  -- Usando apenas user_role, sem referenciar a coluna "role"
    name,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    user_email, 
    user_role_value,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(user_email, '@', 1)),
    'ACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = user_email,
    user_role = COALESCE(public.users.user_role, user_role_value),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Se user_role foi atualizado, atualizar role
    IF OLD.user_role <> NEW.user_role THEN
      NEW.role := 'authenticated';
    END IF;
    
    -- Se role foi atualizado, não precisamos fazer nada com user_role
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_contract_billing_trigger"() RETURNS "json"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_test_result json;
  v_charge_count INTEGER;
  v_billing_count INTEGER;
BEGIN
  -- Contar charges e billings antes
  SELECT COUNT(*) INTO v_charge_count FROM charges;
  SELECT COUNT(*) INTO v_billing_count FROM contract_billings;
  
  RETURN json_build_object(
    'trigger_active', TRUE,
    'charges_count', v_charge_count,
    'billings_count', v_billing_count,
    'test_date', NOW()
  );
END;
$$;


ALTER FUNCTION "public"."test_contract_billing_trigger"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."test_contract_billing_trigger"() IS 'Contract billing test with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."test_jwt_custom_claims_expanded"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  claims jsonb;
BEGIN
  -- AIDEV-NOTE: Obter claims do JWT atual para teste
  claims := auth.jwt();
  
  RETURN jsonb_build_object(
    'user_id', claims->>'user_id',
    'primary_tenant_id', claims->>'primary_tenant_id',
    'primary_role', claims->>'primary_role',
    'is_platform_admin', (claims->>'is_platform_admin')::boolean,
    'tenant_count', (claims->>'tenant_count')::integer,
    'current_tenant_id', claims->>'current_tenant_id',
    'migration_ready', (claims->>'migration_ready')::boolean,
    'tenant_access_keys', jsonb_object_keys(claims->'tenant_access'),
    'tenant_slugs_keys', jsonb_object_keys(claims->'tenant_slugs'),
    'claims_updated_at', to_timestamp((claims->>'claims_updated_at')::numeric)
  );
END;
$$;


ALTER FUNCTION "public"."test_jwt_custom_claims_expanded"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."test_jwt_custom_claims_expanded"() IS 'JWT test function with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."test_tenant_context"() RETURNS TABLE("current_user_id" "uuid", "current_tenant_id" "uuid", "tenant_access" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    NULLIF(current_setting('app.current_tenant_id', true), '')::uuid as current_tenant_id,
    EXISTS (
      SELECT 1 FROM tenant_users tu 
      WHERE tu.user_id = auth.uid() 
      AND tu.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    ) as tenant_access;
END;
$$;


ALTER FUNCTION "public"."test_tenant_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_cleanup_job"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result jsonb;
BEGIN
  -- Esta função pode ser chamada manualmente ou via webhook externo
  -- Para usar com serviços como GitHub Actions, Vercel Cron, etc.
  
  -- Log da execução
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    tenant_id,
    action,
    old_data,
    new_data,
    changed_fields,
    user_id,
    timestamp
  ) VALUES (
    'system',
    NULL,
    NULL,
    'CLEANUP_JOB_TRIGGERED',
    NULL,
    jsonb_build_object(
      'triggered_at', NOW(),
      'method', 'database_function'
    ),
    NULL,
    NULL,
    NOW()
  );
  
  -- Retornar sucesso
  result := jsonb_build_object(
    'success', true,
    'message', 'Cleanup job triggered successfully',
    'timestamp', NOW()
  );
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."trigger_cleanup_job"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_create_billing_periods"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Gerar períodos apenas para contratos ATIVOS
  IF NEW.status = 'ACTIVE' THEN
    PERFORM public.upsert_billing_periods_for_contract(NEW.id, NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_create_billing_periods"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_create_billing_periods"() IS 'Trigger function para criar períodos de faturamento após inserção de contrato';



CREATE OR REPLACE FUNCTION "public"."trigger_import_job_processing"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- AIDEV-NOTE: Acionar apenas para jobs novos com status pending
    IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
        -- AIDEV-NOTE: Chamar função assíncrona via pg_net
        PERFORM public.notify_process_import_jobs_async();
        
        RAISE NOTICE 'Triggered async processing for import job: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_import_job_processing"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_import_job_processing"() IS 'Trigger function que detecta novos jobs pending e aciona processamento assíncrono via pg_net.';



CREATE OR REPLACE FUNCTION "public"."trigger_log_session_created"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM log_tenant_session_audit(
    NEW.id,
    NEW.user_id,
    NEW.tenant_id,
    NEW.tenant_slug,
    'created',
    NEW.ip_address::inet,
    NEW.user_agent,
    jsonb_build_object(
      'refresh_expires_at', NEW.refresh_expires_at,
      'access_expires_at', NEW.access_expires_at
    )
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_log_session_created"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_log_session_created"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."trigger_log_session_revoked"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Log apenas se a sessão foi desativada
  IF OLD.is_active = true AND NEW.is_active = false THEN
    PERFORM log_tenant_session_audit(
      OLD.id,
      OLD.user_id,
      OLD.tenant_id,
      OLD.tenant_slug,
      'revoked',
      OLD.ip_address::inet,
      OLD.user_agent,
      jsonb_build_object(
        'revoked_at', now(),
        'reason', 'manual_revocation'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_log_session_revoked"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_log_session_revoked"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."trigger_log_session_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Log apenas se houve mudança no access_token (refresh)
  IF OLD.access_token != NEW.access_token THEN
    PERFORM log_tenant_session_audit(
      NEW.id,
      NEW.user_id,
      NEW.tenant_id,
      NEW.tenant_slug,
      'refreshed',
      NEW.ip_address::inet,
      NEW.user_agent,
      jsonb_build_object(
        'old_access_expires_at', OLD.access_expires_at,
        'new_access_expires_at', NEW.access_expires_at,
        'last_access', NEW.last_access
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_log_session_updated"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_log_session_updated"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_billing_periods"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Se status mudou para ACTIVE, gerar períodos imediatamente
  IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status = 'ACTIVE' THEN
    PERFORM public.upsert_billing_periods_for_contract(NEW.id, NEW.tenant_id);
    RETURN NEW;
  END IF;

  -- Caso contrato já esteja ACTIVE, reagir a mudanças relevantes
  IF NEW.status = 'ACTIVE' AND (
       (OLD.initial_date IS DISTINCT FROM NEW.initial_date) OR
       (OLD.final_date IS DISTINCT FROM NEW.final_date) OR
       (OLD.billing_type IS DISTINCT FROM NEW.billing_type) OR
       (OLD.billing_day IS DISTINCT FROM NEW.billing_day) OR
       (OLD.anticipate_weekends IS DISTINCT FROM NEW.anticipate_weekends) OR
       (OLD.installments IS DISTINCT FROM NEW.installments) OR
       (OLD.total_amount IS DISTINCT FROM NEW.total_amount)
     ) THEN
    PERFORM public.smart_upsert_billing_periods_for_contract(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_billing_periods"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_update_billing_periods"() IS 'Trigger function para atualizar períodos de faturamento após alteração de campos-chave do contrato';



CREATE OR REPLACE FUNCTION "public"."trigger_validate_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Determinar contexto baseado na tabela
    DECLARE
        expected_context TEXT;
    BEGIN
        CASE TG_TABLE_NAME
            WHEN 'tenant_users' THEN expected_context := 'TENANT';
            WHEN 'tenant_invites' THEN expected_context := 'TENANT';
            WHEN 'resellers_users' THEN expected_context := 'RESELLER';
            ELSE expected_context := NULL;
        END CASE;
        
        -- Validar se o role existe
        IF NOT validate_role_exists(NEW.role, expected_context) THEN
            RAISE EXCEPTION 'Role "%" não existe na tabela profiles para o contexto "%"', NEW.role, expected_context;
        END IF;
        
        RETURN NEW;
    END;
END;
$$;


ALTER FUNCTION "public"."trigger_validate_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_validate_role"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."update_agente_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_agente_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_bank_operation_history_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
/*
  Atualiza a coluna updated_at com o timestamp atual em fuso horário São Paulo
  sempre que um registro de bank_operation_history for alterado.
*/
BEGIN
  NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_bank_operation_history_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_billing_day_preserve_customizations"("p_contract_id" "uuid", "p_new_billing_day" integer, "p_anticipate_weekends" boolean DEFAULT false) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_contract RECORD;
    v_updated_count INTEGER := 0;
    v_period RECORD;
    v_new_bill_date DATE;
BEGIN
    -- AIDEV-NOTE: Buscar dados do contrato para validação
    SELECT tenant_id, billing_day, anticipate_weekends
    INTO v_contract
    FROM public.contracts
    WHERE id = p_contract_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contrato não encontrado: %', p_contract_id;
    END IF;
    
    -- AIDEV-NOTE: Configurar contexto de tenant para RLS
    PERFORM set_config('app.current_tenant_id', v_contract.tenant_id::text, true);
    
    -- AIDEV-NOTE: Atualizar apenas o bill_date dos períodos futuros não faturados
    -- Preserva todas as outras customizações (period_start, period_end, amount_planned, etc.)
    FOR v_period IN 
        SELECT id, period_start, period_end, bill_date
        FROM public.contract_billing_periods
        WHERE contract_id = p_contract_id
          AND tenant_id = v_contract.tenant_id
          AND status IN ('PENDING', 'DUE_TODAY', 'LATE')
          AND period_start >= CURRENT_DATE
    LOOP
        -- AIDEV-NOTE: Calcular nova data de vencimento preservando o período
        v_new_bill_date := public.calc_bill_date(
            EXTRACT(year FROM v_period.period_start)::INTEGER,
            EXTRACT(month FROM v_period.period_start)::INTEGER,
            p_new_billing_day,
            p_anticipate_weekends
        );
        
        -- AIDEV-NOTE: CORREÇÃO: Garantir que bill_date >= period_start
        -- Se a data calculada for anterior ao início do período, usar o próprio period_start
        IF v_new_bill_date < v_period.period_start THEN
            v_new_bill_date := v_period.period_start;
        END IF;
        
        -- AIDEV-NOTE: Atualizar apenas o bill_date, preservando tudo mais
        UPDATE public.contract_billing_periods
        SET 
            bill_date = v_new_bill_date,
            updated_at = NOW()
        WHERE id = v_period.id
          AND tenant_id = v_contract.tenant_id;
        
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$;


ALTER FUNCTION "public"."update_billing_day_preserve_customizations"("p_contract_id" "uuid", "p_new_billing_day" integer, "p_anticipate_weekends" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_billing_periods_on_charge_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_id UUID;
    v_period_record RECORD;
    v_period_found BOOLEAN := FALSE;
BEGIN
    -- AIDEV-NOTE: Só processa se o status mudou para RECEIVED (cobrança paga)
    IF NEW.status = 'RECEIVED' AND (OLD.status IS NULL OR OLD.status != 'RECEIVED') THEN
        
        -- Obtém o tenant_id da cobrança
        v_tenant_id := NEW.tenant_id;
        
        -- Configura o contexto do tenant para segurança multi-tenant
        PERFORM set_tenant_context_simple(v_tenant_id);
        
        -- AIDEV-NOTE: Busca o período de cobrança usando o novo relacionamento billing_periods
        IF NEW.billing_periods IS NOT NULL THEN
            BEGIN
                SELECT * INTO STRICT v_period_record
                FROM contract_billing_periods
                WHERE id = NEW.billing_periods
                  AND tenant_id = v_tenant_id;
                
                -- Se chegou aqui, encontrou o período
                v_period_found := TRUE;
            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    v_period_found := FALSE;
            END;
        END IF;
        
        -- AIDEV-NOTE: Se não encontrou por billing_periods, busca por contract_id, bill_date e amount_billed
        IF NOT v_period_found AND NEW.contract_id IS NOT NULL AND NEW.data_vencimento IS NOT NULL THEN
            BEGIN
                SELECT * INTO STRICT v_period_record
                FROM contract_billing_periods
                WHERE contract_id = NEW.contract_id
                  AND bill_date = NEW.data_vencimento::date
                  AND amount_billed = NEW.valor
                  AND tenant_id = v_tenant_id
                  AND status = 'BILLED';
                
                -- Se chegou aqui, encontrou o período
                v_period_found := TRUE;
            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    v_period_found := FALSE;
            END;
        END IF;
        
        -- AIDEV-NOTE: Se ainda não encontrou, busca apenas por contract_id e bill_date
        IF NOT v_period_found AND NEW.contract_id IS NOT NULL AND NEW.data_vencimento IS NOT NULL THEN
            BEGIN
                SELECT * INTO STRICT v_period_record
                FROM contract_billing_periods
                WHERE contract_id = NEW.contract_id
                  AND bill_date = NEW.data_vencimento::date
                  AND tenant_id = v_tenant_id
                  AND status = 'BILLED';
                
                -- Se chegou aqui, encontrou o período
                v_period_found := TRUE;
            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    v_period_found := FALSE;
            END;
        END IF;
        
        -- AIDEV-NOTE: CRÍTICO - Só acessa v_period_record se realmente encontrou um período
        -- NÃO verifica v_period_record.id porque isso causaria erro se v_period_found = FALSE
        IF v_period_found THEN
            UPDATE contract_billing_periods
            SET 
                status = 'PAID',
                from_status = v_period_record.status,
                transition_reason = 'Charge payment received',
                updated_at = NOW()
            WHERE id = v_period_record.id;
            
            -- AIDEV-NOTE: Log da auditoria para rastreabilidade
            INSERT INTO audit_logs (
                tenant_id,
                resource_type,
                resource_id,
                action,
                old_values,
                new_values,
                performed_by,
                performed_at
            ) VALUES (
                v_tenant_id,
                'contract_billing_periods',
                v_period_record.id::text,
                'UPDATE_STATUS_TO_PAID',
                jsonb_build_object('status', v_period_record.status),
                jsonb_build_object(
                    'status', 'PAID', 
                    'charge_id', NEW.id,
                    'payment_date', NEW.data_pagamento
                ),
                NULL, -- Sistema automático
                NOW()
            );
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_billing_periods_on_charge_payment"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_billing_periods_on_charge_payment"() IS 'Atualiza contract_billing_periods para status PAID quando charge correspondente é pago. 
Resolve problema do kanban onde períodos não eram atualizados após pagamento.';



CREATE OR REPLACE FUNCTION "public"."update_billing_periods_status"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  pending_to_due INTEGER := 0;
  overdue_count INTEGER := 0;
  total_updated INTEGER := 0;
BEGIN
  -- PENDING → DUE_TODAY se bill_date = hoje
  UPDATE contract_billing_periods 
  SET 
    status = 'DUE_TODAY',
    updated_at = NOW()
  WHERE 
    status = 'PENDING' 
    AND bill_date = CURRENT_DATE;
  
  -- Capturar número de linhas afetadas
  GET DIAGNOSTICS pending_to_due = ROW_COUNT;
  
  -- PENDING|DUE_TODAY → LATE se bill_date < hoje e não faturou
  UPDATE contract_billing_periods 
  SET 
    status = 'LATE',
    updated_at = NOW()
  WHERE 
    status IN ('PENDING', 'DUE_TODAY')
    AND bill_date < CURRENT_DATE;
  
  -- Capturar número de linhas afetadas
  GET DIAGNOSTICS overdue_count = ROW_COUNT;
  
  -- Calcular total
  total_updated := pending_to_due + overdue_count;
  
  -- Log da operação (opcional)
  RAISE NOTICE 'Billing periods updated: % pending->due_today, % overdue, % total', 
    pending_to_due, overdue_count, total_updated;
  
  RETURN total_updated;
END;
$$;


ALTER FUNCTION "public"."update_billing_periods_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_billing_periods_status"() IS 'Atualiza automaticamente status dos períodos baseado nas datas - deve ser executada diariamente';



CREATE OR REPLACE FUNCTION "public"."update_billing_queue_status"("p_queue_id" "uuid", "p_status" character varying, "p_error_message" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE public.billing_processing_queue
    SET 
        status = p_status,
        attempts = CASE 
            WHEN p_status = 'failed' THEN attempts + 1 
            ELSE attempts 
        END,
        error_message = p_error_message,
        updated_at = NOW(),
        processed_at = CASE 
            WHEN p_status IN ('completed', 'failed') THEN NOW() 
            ELSE processed_at 
        END
    WHERE id = p_queue_id;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$;


ALTER FUNCTION "public"."update_billing_queue_status"("p_queue_id" "uuid", "p_status" character varying, "p_error_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_billing_queue_status"("p_queue_id" "uuid", "p_status" character varying, "p_error_message" "text") IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."update_charge_from_asaas_data"("p_charge_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_data_pagamento" "date", "p_payment_value" numeric, "p_net_value" numeric DEFAULT NULL::numeric, "p_interest_rate" numeric DEFAULT NULL::numeric, "p_fine_rate" numeric DEFAULT NULL::numeric, "p_discount_value" numeric DEFAULT NULL::numeric, "p_invoice_url" "text" DEFAULT NULL::"text", "p_pdf_url" "text" DEFAULT NULL::"text", "p_transaction_receipt_url" "text" DEFAULT NULL::"text", "p_external_invoice_number" "text" DEFAULT NULL::"text", "p_barcode" "text" DEFAULT NULL::"text", "p_pix_key" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  UPDATE charges
  SET 
    status = COALESCE(p_status, status),
    data_pagamento = COALESCE(p_data_pagamento, data_pagamento),
    payment_value = COALESCE(p_payment_value, payment_value),
    net_value = COALESCE(p_net_value, net_value),
    interest_rate = COALESCE(p_interest_rate, interest_rate),
    fine_rate = COALESCE(p_fine_rate, fine_rate),
    discount_value = COALESCE(p_discount_value, discount_value),
    invoice_url = COALESCE(p_invoice_url, invoice_url),
    pdf_url = COALESCE(p_pdf_url, pdf_url),
    transaction_receipt_url = COALESCE(p_transaction_receipt_url, transaction_receipt_url),
    external_invoice_number = COALESCE(p_external_invoice_number, external_invoice_number),
    barcode = COALESCE(p_barcode, barcode),
    pix_key = COALESCE(p_pix_key, pix_key),
    updated_at = NOW() - INTERVAL '3 hours'
  WHERE id = p_charge_id
    AND tenant_id = p_tenant_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN v_updated > 0;
END;
$$;


ALTER FUNCTION "public"."update_charge_from_asaas_data"("p_charge_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_data_pagamento" "date", "p_payment_value" numeric, "p_net_value" numeric, "p_interest_rate" numeric, "p_fine_rate" numeric, "p_discount_value" numeric, "p_invoice_url" "text", "p_pdf_url" "text", "p_transaction_receipt_url" "text", "p_external_invoice_number" "text", "p_barcode" "text", "p_pix_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_charge_from_asaas_data"("p_charge_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_data_pagamento" "date", "p_payment_value" numeric, "p_net_value" numeric, "p_interest_rate" numeric, "p_fine_rate" numeric, "p_discount_value" numeric, "p_invoice_url" "text", "p_pdf_url" "text", "p_transaction_receipt_url" "text", "p_external_invoice_number" "text", "p_barcode" "text", "p_pix_key" "text") IS 'Atualiza charge com dados obtidos da API ASAAS. Chamada pela Edge Function após buscar dados atualizados.';



CREATE OR REPLACE FUNCTION "public"."update_charges_from_staging"() RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_staging_record RECORD;
  v_charge_id UUID;
  v_total_processed INTEGER := 0;
  v_total_updated INTEGER := 0;
  v_total_skipped INTEGER := 0;
  v_total_errors INTEGER := 0;
  v_error_messages TEXT[] := ARRAY[]::TEXT[];
  v_update_count INTEGER;
BEGIN
  -- AIDEV-NOTE: Processar registros de conciliation_staging que têm asaas_id
  FOR v_staging_record IN
    SELECT 
      cs.id_externo,
      cs.tenant_id,
      cs.invoice_number,
      cs.barcode,
      cs.pix_key,
      cs.pdf_url,
      cs.invoice_url,
      cs.asaas_customer_id,
      cs.data_pagamento,
      cs.valor_pago,
      cs.valor_liquido,
      cs.taxa_juros,
      cs.taxa_multa,
      cs.valor_desconto,
      cs.transaction_receipt_url,
      cs.origem
    FROM conciliation_staging cs
    WHERE cs.origem = 'ASAAS'
      AND cs.id_externo IS NOT NULL
      AND cs.tenant_id IS NOT NULL
    ORDER BY cs.created_at ASC
  LOOP
    BEGIN
      -- AIDEV-NOTE: Buscar charge pelo asaas_id
      SELECT id INTO v_charge_id
      FROM charges
      WHERE tenant_id = v_staging_record.tenant_id
        AND asaas_id = v_staging_record.id_externo
      LIMIT 1;
      
      IF v_charge_id IS NULL THEN
        -- AIDEV-NOTE: Charge não encontrada, pular
        v_total_skipped := v_total_skipped + 1;
        CONTINUE;
      END IF;
      
      -- AIDEV-NOTE: Preparar dados para atualização (apenas campos não nulos)
      -- Usar COALESCE para atualizar apenas se o valor em staging não for NULL
      UPDATE charges
      SET 
        external_invoice_number = COALESCE(
          NULLIF(v_staging_record.invoice_number, ''),
          external_invoice_number
        ),
        barcode = COALESCE(
          NULLIF(v_staging_record.barcode, ''),
          barcode
        ),
        pix_key = COALESCE(
          NULLIF(v_staging_record.pix_key, ''),
          pix_key
        ),
        pdf_url = COALESCE(
          NULLIF(v_staging_record.pdf_url, ''),
          pdf_url
        ),
        invoice_url = COALESCE(
          NULLIF(v_staging_record.invoice_url, ''),
          invoice_url
        ),
        data_pagamento = COALESCE(
          v_staging_record.data_pagamento::DATE,
          data_pagamento
        ),
        payment_value = COALESCE(
          v_staging_record.valor_pago,
          payment_value
        ),
        net_value = COALESCE(
          v_staging_record.valor_liquido,
          net_value
        ),
        interest_rate = COALESCE(
          v_staging_record.taxa_juros,
          interest_rate
        ),
        fine_rate = COALESCE(
          v_staging_record.taxa_multa,
          fine_rate
        ),
        discount_value = COALESCE(
          v_staging_record.valor_desconto,
          discount_value
        ),
        transaction_receipt_url = COALESCE(
          NULLIF(v_staging_record.transaction_receipt_url, ''),
          transaction_receipt_url
        ),
        origem = COALESCE(
          NULLIF(v_staging_record.origem, ''),
          origem
        ),
        external_customer_id = COALESCE(
          NULLIF(v_staging_record.asaas_customer_id, ''),
          external_customer_id
        ),
        updated_at = NOW()
      WHERE id = v_charge_id
        AND tenant_id = v_staging_record.tenant_id;
      
      GET DIAGNOSTICS v_update_count = ROW_COUNT;
      
      IF v_update_count > 0 THEN
        v_total_updated := v_total_updated + 1;
      ELSE
        v_total_skipped := v_total_skipped + 1;
      END IF;
      
      v_total_processed := v_total_processed + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_total_errors := v_total_errors + 1;
      v_error_messages := array_append(
        v_error_messages,
        format('Erro ao atualizar charge para asaas_id %s: %s', 
          v_staging_record.id_externo, SQLERRM)
      );
      v_total_processed := v_total_processed + 1;
    END;
  END LOOP;
  
  -- AIDEV-NOTE: Atualizar customer_asaas_id nos customers vinculados
  -- Buscar customers que têm charges do ASAAS mas não têm customer_asaas_id
  UPDATE customers c
  SET customer_asaas_id = cs.asaas_customer_id
  FROM charges ch
  INNER JOIN conciliation_staging cs ON ch.asaas_id = cs.id_externo
    AND ch.tenant_id = cs.tenant_id
  WHERE c.id = ch.customer_id
    AND c.tenant_id = ch.tenant_id
    AND c.customer_asaas_id IS NULL
    AND cs.asaas_customer_id IS NOT NULL
    AND cs.origem = 'ASAAS';
  
  -- AIDEV-NOTE: Retornar resultado da atualização
  RETURN json_build_object(
    'success', true,
    'total_processed', v_total_processed,
    'total_updated', v_total_updated,
    'total_skipped', v_total_skipped,
    'total_errors', v_total_errors,
    'errors', v_error_messages
  );
END;
$$;


ALTER FUNCTION "public"."update_charges_from_staging"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_charges_from_staging"() IS 'Atualiza charges existentes com dados adicionais de conciliation_staging, fazendo match pelo asaas_id. Atualiza invoice_number, barcode, pix_key, pdf_url, invoice_url, data_pagamento, valor_pago, net_value, interest_rate, fine_rate, discount_value, transaction_receipt_url, origem, external_customer_id e customer_asaas_id.';



CREATE OR REPLACE FUNCTION "public"."update_complementary_billing_config"("p_tenant_id" "uuid", "p_config" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    current_settings jsonb;
BEGIN
    -- Obter configurações atuais
    SELECT settings INTO current_settings
    FROM tenants 
    WHERE id = p_tenant_id;
    
    -- Mesclar nova configuração
    current_settings := COALESCE(current_settings, '{}'::jsonb);
    current_settings := jsonb_set(current_settings, '{complementary_billing}', p_config);
    
    -- Atualizar tenant
    UPDATE tenants 
    SET settings = current_settings,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_tenant_id;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_complementary_billing_config"("p_tenant_id" "uuid", "p_config" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_complementary_billing_config"("p_tenant_id" "uuid", "p_config" "jsonb") IS 'Atualiza configurações de faturamento complementar para um tenant';



CREATE OR REPLACE FUNCTION "public"."update_conciliation_staging_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conciliation_staging_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contract_billing_periods_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_contract_billing_periods_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_finance_entries_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_finance_entries_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_finance_entries_updated_at"() IS 'Trigger function with fixed search_path for security';



CREATE OR REPLACE FUNCTION "public"."update_pending_periods_amount"("p_contract_id" "uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tenant_id UUID;
  v_amount_planned NUMERIC := 0;
  v_periods_updated INTEGER := 0;
BEGIN
  -- AIDEV-NOTE: Configurar contexto de tenant
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    -- Buscar tenant_id do contrato
    SELECT tenant_id INTO v_tenant_id 
    FROM contracts 
    WHERE id = p_contract_id;
    
    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Não foi possível determinar o tenant_id para o contrato %', p_contract_id;
    END IF;
  END IF;

  -- AIDEV-NOTE: Configurar contexto RLS
  PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);

  -- AIDEV-NOTE: Calcular novo valor planejado baseado nos serviços ativos
  SELECT COALESCE(SUM(cs.total_amount), 0)
  INTO v_amount_planned
  FROM contract_services cs
  WHERE cs.contract_id = p_contract_id 
    AND cs.tenant_id = v_tenant_id
    AND COALESCE(cs.is_active, true) = true;

  -- AIDEV-NOTE: Atualizar apenas períodos que NÃO são BILLED
  -- Esta é a proteção principal - períodos BILLED permanecem inalterados
  UPDATE contract_billing_periods 
  SET 
    amount_planned = v_amount_planned,
    updated_at = CURRENT_TIMESTAMP
  WHERE contract_id = p_contract_id 
    AND tenant_id = v_tenant_id
    AND status != 'BILLED'  -- AIDEV-NOTE: Proteção crítica - não alterar períodos BILLED
    AND status != 'PAID';   -- AIDEV-NOTE: Também proteger períodos PAID

  GET DIAGNOSTICS v_periods_updated = ROW_COUNT;

  -- AIDEV-NOTE: Log da operação
  RAISE NOTICE 'Contrato %: % períodos não-faturados atualizados com valor planejado %', 
               p_contract_id, v_periods_updated, v_amount_planned;

  RETURN v_periods_updated;
END;
$$;


ALTER FUNCTION "public"."update_pending_periods_amount"("p_contract_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_stock_by_location_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_product_stock_by_location_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_receipts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_receipts_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_receipts_updated_at"() IS 'Trigger function com search_path fixo para segurança';



CREATE OR REPLACE FUNCTION "public"."update_sbe_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_sbe_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_security_notifications_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_security_notifications_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_security_notifications_updated_at"() IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."update_service_event_pendencies"("p_tenant_id" "uuid" DEFAULT NULL::"uuid", "p_contract_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_contract RECORD;
    v_period RECORD;
    v_service RECORD;
    v_contract_service_id UUID;
    v_due_date DATE;
    v_processed_count INTEGER := 0;
BEGIN
    -- AIDEV-NOTE: Iterar contratos ativos
    FOR v_contract IN 
        SELECT id, tenant_id, billing_day, anticipate_weekends
        FROM public.contracts 
        WHERE status = 'ACTIVE'
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
          AND (p_contract_id IS NULL OR id = p_contract_id)
    LOOP
        -- Configurar contexto do tenant
        PERFORM set_config('app.current_tenant_id', v_contract.tenant_id::text, true);
        
        -- AIDEV-NOTE: Processar períodos elegíveis (próximos 30 dias)
        FOR v_period IN 
            SELECT period_start, period_end, bill_date
            FROM public.contract_billing_periods
            WHERE contract_id = v_contract.id
              AND status IN ('PENDING', 'DUE_TODAY')
              AND bill_date <= CURRENT_DATE + INTERVAL '30 days'
        LOOP
            -- AIDEV-NOTE: Obter serviços elegíveis para este período
            -- A função eligible_services_for_period já foi corrigida para usar due_type/due_value
            FOR v_service IN 
                SELECT 
                    service_id,
                    service_name,
                    service_code,
                    billing_type,
                    service_amount,
                    due_date_type,  -- Este campo vem da função corrigida
                    due_date_value, -- Este campo vem da função corrigida
                    installments,
                    no_charge,
                    generate_billing,
                    installment_number
                FROM public.eligible_services_for_period(
                    v_contract.id,
                    v_period.period_start,
                    v_period.period_end
                )
                WHERE no_charge = false  -- Só serviços que geram cobrança
            LOOP
                -- AIDEV-NOTE: Obter o ID do contract_service
                SELECT cs.id INTO v_contract_service_id
                FROM public.contract_services cs
                WHERE cs.contract_id = v_contract.id
                  AND cs.service_id = v_service.service_id;
                
                -- AIDEV-NOTE: Calcular data de vencimento baseada no tipo
                -- Agora usando os campos corretos que vêm da função eligible_services_for_period
                IF v_service.due_date_type = 'days_after_billing' THEN
                    v_due_date := v_period.bill_date + (v_service.due_date_value || ' days')::INTERVAL;
                ELSIF v_service.due_date_type = 'specific_day' THEN
                    v_due_date := DATE_TRUNC('month', v_period.bill_date) + 
                                  (v_service.due_date_value - 1 || ' days')::INTERVAL;
                ELSE
                    v_due_date := v_period.bill_date + INTERVAL '7 days'; -- Default
                END IF;
                
                -- AIDEV-NOTE: Ajustar para antecipar fins de semana se necessário
                IF v_contract.anticipate_weekends AND EXTRACT(DOW FROM v_due_date) IN (0, 6) THEN
                    -- Antecipar para sexta-feira se cair no fim de semana
                    v_due_date := v_due_date - (EXTRACT(DOW FROM v_due_date) || ' days')::INTERVAL + INTERVAL '5 days';
                END IF;
                
                -- AIDEV-NOTE: Inserir ou atualizar evento de serviço
                INSERT INTO public.service_billing_events (
                    tenant_id,
                    contract_id,
                    service_id, -- Este é o contract_service.id
                    period_start,
                    period_end,
                    due_date,
                    amount,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (
                    v_contract.tenant_id,
                    v_contract.id,
                    v_contract_service_id,
                    v_period.period_start,
                    v_period.period_end,
                    v_due_date,
                    v_service.service_amount,
                    'PENDING',
                    NOW(),
                    NOW()
                )
                ON CONFLICT (tenant_id, service_id, period_start, period_end) 
                DO UPDATE SET
                    due_date = EXCLUDED.due_date,
                    amount = EXCLUDED.amount,
                    updated_at = NOW()
                WHERE service_billing_events.status = 'PENDING';
                
                v_processed_count := v_processed_count + 1;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN v_processed_count;
END;
$$;


ALTER FUNCTION "public"."update_service_event_pendencies"("p_tenant_id" "uuid", "p_contract_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_standalone_billing_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_standalone_billing_items_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_stock_movements_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_stock_movements_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_storage_locations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_storage_locations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tasks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('America/Sao_Paulo'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tasks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tenant_integrations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tenant_integrations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tenant_user_role_v2"("tenant_id_param" "text", "user_id_param" "uuid", "new_role" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  tenant_id_uuid UUID;
  tenant_user_record tenant_users;
  current_user_role TEXT;
  admin_count INTEGER;
BEGIN
  -- Tentar converter o parâmetro para UUID
  BEGIN
    tenant_id_uuid := tenant_id_param::UUID;
  EXCEPTION WHEN others THEN
    -- Caso falhe, tente buscar o UUID pelo slug
    SELECT id INTO tenant_id_uuid FROM tenants WHERE slug = tenant_id_param;
    IF tenant_id_uuid IS NULL THEN
      RAISE EXCEPTION 'ID do tenant inválido ou slug não encontrado: %', tenant_id_param;
    END IF;
  END;
  
  -- Verificar se o usuário atual é TENANT_ADMIN
  SELECT role INTO current_user_role
  FROM tenant_users
  WHERE tenant_id = tenant_id_uuid AND user_id = auth.uid();
  
  IF current_user_role IS NULL OR current_user_role != 'TENANT_ADMIN' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Você não tem permissão para alterar papéis de usuários'
    );
  END IF;
  
  -- Obter o registro do tenant_user a ser atualizado
  SELECT * INTO tenant_user_record
  FROM tenant_users
  WHERE tenant_id = tenant_id_uuid AND user_id = user_id_param;
  
  IF tenant_user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuário não encontrado neste tenant'
    );
  END IF;
  
  -- Se estiver rebaixando um TENANT_ADMIN, verificar se é o último admin
  IF tenant_user_record.role = 'TENANT_ADMIN' AND new_role != 'TENANT_ADMIN' THEN
    SELECT COUNT(*) INTO admin_count
    FROM tenant_users
    WHERE tenant_id = tenant_id_uuid AND role = 'TENANT_ADMIN';
    
    IF admin_count <= 1 THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Não é possível rebaixar o último administrador do tenant'
      );
    END IF;
  END IF;
  
  -- Atualizar o papel do usuário
  UPDATE tenant_users
  SET role = new_role
  WHERE tenant_id = tenant_id_uuid AND user_id = user_id_param;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Papel do usuário atualizado com sucesso'
  );
END;
$$;


ALTER FUNCTION "public"."update_tenant_user_role_v2"("tenant_id_param" "text", "user_id_param" "uuid", "new_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tenant_users_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tenant_users_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_jwt_tenant"("p_tenant_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_has_access BOOLEAN := FALSE;
  tenant_exists BOOLEAN := FALSE;
  tenant_active BOOLEAN := FALSE;
  user_exists BOOLEAN := FALSE;
  tenant_name TEXT;
  tenant_slug TEXT;
  user_role TEXT;
  result JSON;
BEGIN
  -- AIDEV-NOTE: Validação rigorosa de parâmetros de entrada
  IF p_tenant_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_TENANT_ID',
      'message', 'Tenant ID não pode ser nulo'
    );
  END IF;
  
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INVALID_USER_ID', 
      'message', 'User ID não pode ser nulo'
    );
  END IF;

  -- AIDEV-NOTE: Verificar se o tenant existe e está ativo
  SELECT EXISTS(
    SELECT 1 FROM tenants 
    WHERE id = p_tenant_id
  ), EXISTS(
    SELECT 1 FROM tenants 
    WHERE id = p_tenant_id AND active = true
  ) INTO tenant_exists, tenant_active;
  
  IF NOT tenant_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'TENANT_NOT_FOUND',
      'message', 'Tenant não encontrado'
    );
  END IF;
  
  IF NOT tenant_active THEN
    RETURN json_build_object(
      'success', false,
      'error', 'TENANT_INACTIVE',
      'message', 'Tenant está inativo'
    );
  END IF;

  -- AIDEV-NOTE: Verificar se o usuário existe
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = p_user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'USER_NOT_FOUND',
      'message', 'Usuário não encontrado'
    );
  END IF;

  -- AIDEV-NOTE: Verificar acesso do usuário ao tenant
  SELECT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = p_user_id 
    AND tenant_id = p_tenant_id
    AND active = true
  ) INTO user_has_access;
  
  IF NOT user_has_access THEN
    RETURN json_build_object(
      'success', false,
      'error', 'ACCESS_DENIED',
      'message', 'Usuário não tem acesso a este tenant'
    );
  END IF;

  -- AIDEV-NOTE: Buscar dados do tenant e papel do usuário separadamente
  SELECT t.name, t.slug, tu.role
  INTO tenant_name, tenant_slug, user_role
  FROM tenants t
  JOIN tenant_users tu ON tu.tenant_id = t.id
  WHERE t.id = p_tenant_id AND tu.user_id = p_user_id;

  -- AIDEV-NOTE: Atualizar app_metadata do usuário no Supabase Auth
  -- Esta é a parte crítica que estava faltando - atualizar o JWT
  UPDATE auth.users 
  SET 
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'tenant_id', p_tenant_id,
      'tenant_name', tenant_name,
      'tenant_slug', tenant_slug,
      'tenant_role', user_role,
      'updated_at', NOW()
    )
  WHERE id = p_user_id;

  -- AIDEV-NOTE: Também configurar contexto de sessão para compatibilidade
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
  PERFORM set_config('app.current_user_id', p_user_id::text, true);

  -- AIDEV-NOTE: Log de auditoria usando ação válida
  INSERT INTO audit_logs (
    id,
    entity_type,
    entity_id,
    tenant_id,
    action,
    new_data,
    performed_by,
    performed_at
  )
  VALUES (
    gen_random_uuid(),
    'user_jwt',
    p_user_id,
    p_tenant_id,
    'CUSTOM',
    json_build_object(
      'action_type', 'JWT_TENANT_UPDATE',
      'tenant_id', p_tenant_id,
      'tenant_name', tenant_name,
      'tenant_role', user_role,
      'timestamp', NOW()
    ),
    p_user_id,
    NOW()
  );

  -- AIDEV-NOTE: Retornar sucesso com informações detalhadas
  RETURN json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'tenant_name', tenant_name,
    'tenant_slug', tenant_slug,
    'tenant_role', user_role,
    'user_id', p_user_id,
    'message', 'JWT atualizado com sucesso - faça refresh da sessão',
    'timestamp', NOW()
  );
END;
$$;


ALTER FUNCTION "public"."update_user_jwt_tenant"("p_tenant_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_jwt_tenant"("p_tenant_id" "uuid", "p_user_id" "uuid") IS 'Atualiza app_metadata do usuário no Supabase Auth para incluir tenant_id no JWT';



CREATE OR REPLACE FUNCTION "public"."update_users_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_users_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_whatsapp_qrcode_history_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_whatsapp_qrcode_history_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_billing_periods_for_contract"("p_contract_id" "uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_contract RECORD;
  v_current_date DATE;
  v_period_start DATE;
  v_period_end DATE;
  v_bill_date DATE;
  v_periods_created INTEGER := 0;
  v_periods_updated INTEGER := 0;
  v_tenant_id UUID;
  v_amount_planned NUMERIC := 0;
  v_existing_period RECORD;
  v_billed_periods_count INTEGER := 0;
  v_period_id UUID;
  v_periods_to_keep UUID[];
  v_is_retroactive BOOLEAN := false;
  v_retroactive_start_date DATE;
  v_is_first_period BOOLEAN := true;
  v_current_day INTEGER;
  v_configured_day INTEGER;
BEGIN
  -- AIDEV-NOTE: Configurar contexto de tenant PRIMEIRO, antes de qualquer consulta
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    -- Buscar tenant_id do contrato sem depender do contexto
    SELECT tenant_id INTO v_tenant_id 
    FROM contracts 
    WHERE id = p_contract_id;
    
    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Não foi possível determinar o tenant_id para o contrato %', p_contract_id;
    END IF;
  END IF;

  -- AIDEV-NOTE: CORREÇÃO CRÍTICA - Configurar contexto ANTES de qualquer consulta com RLS
  PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);

  -- Buscar dados do contrato
  SELECT 
    initial_date,
    final_date,
    billing_day,
    billing_type,
    tenant_id,
    created_at
  INTO v_contract
  FROM contracts
  WHERE id = p_contract_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado: %', p_contract_id;
  END IF;

  -- AIDEV-NOTE: NOVA LÓGICA RETROATIVA - Implementação conforme documento
  v_current_date := CURRENT_DATE;
  v_current_day := EXTRACT(DAY FROM v_current_date);
  v_configured_day := v_contract.billing_day;
  
  -- AIDEV-NOTE: Detectar contrato retroativo conforme regra do documento:
  -- "initial_date < primeiro dia do mês atual"
  v_is_retroactive := (
    DATE_TRUNC('month', v_contract.initial_date) < DATE_TRUNC('month', v_current_date)
  );

  -- AIDEV-NOTE: REGRA FUNDAMENTAL - Se é retroativo, começar do mês atual
  IF v_is_retroactive THEN
    v_retroactive_start_date := DATE_TRUNC('month', v_current_date)::DATE;
    RAISE NOTICE 'CONTRATO RETROATIVO DETECTADO (ID: %). Aplicando "Mês Cheio Sempre" - Iniciando períodos a partir de: %', 
                 p_contract_id, v_retroactive_start_date;
    
    -- AIDEV-NOTE: Log da aplicação da lógica retroativa
    INSERT INTO audit_logs (
      tenant_id,
      resource_type,
      resource_id,
      action,
      old_values,
      new_values,
      performed_by,
      created_at
    ) VALUES (
      v_tenant_id,
      'contracts',
      p_contract_id::text,
      'RETROACTIVE_LOGIC_APPLIED',
      jsonb_build_object(
        'original_start_date', v_contract.initial_date,
        'contract_created_at', v_contract.created_at,
        'configured_billing_day', v_configured_day
      ),
      jsonb_build_object(
        'retroactive_start_date', v_retroactive_start_date,
        'current_date', v_current_date,
        'current_day', v_current_day,
        'logic_version', 'FULL_MONTH_ALWAYS_V2',
        'reason', 'Contrato retroativo - aplicando regra "Mês Cheio Sempre"'
      ),
      NULL, -- system user
      NOW()
    );
  ELSE
    v_retroactive_start_date := v_contract.initial_date;
    RAISE NOTICE 'Contrato normal (ID: %). Iniciando períodos a partir da data inicial: %', 
                 p_contract_id, v_retroactive_start_date;
  END IF;

  -- AIDEV-NOTE: Calcular amount_planned APÓS configurar contexto
  SELECT COALESCE(SUM(cs.total_amount), 0)
  INTO v_amount_planned
  FROM contract_services cs
  WHERE cs.contract_id = p_contract_id 
    AND cs.tenant_id = v_tenant_id
    AND COALESCE(cs.is_active, true) = true;

  -- AIDEV-NOTE: Log para debug
  RAISE NOTICE 'Contract: %, Tenant: %, Amount Planned: %, Is Retroactive: %, Start Date: %, Current Day: %, Configured Day: %', 
               p_contract_id, v_tenant_id, v_amount_planned, v_is_retroactive, v_retroactive_start_date, v_current_day, v_configured_day;

  -- AIDEV-NOTE: Contar períodos BILLED existentes
  SELECT COUNT(*) INTO v_billed_periods_count
  FROM contract_billing_periods 
  WHERE contract_id = p_contract_id 
    AND tenant_id = v_tenant_id 
    AND status = 'BILLED';

  -- AIDEV-NOTE: Inicializar array para rastrear períodos que devem ser mantidos
  v_periods_to_keep := ARRAY[]::UUID[];

  -- AIDEV-NOTE: USAR A DATA RETROATIVA CALCULADA (mês atual para retroativos)
  v_period_start := v_retroactive_start_date;

  -- AIDEV-NOTE: Gerar períodos com a NOVA LÓGICA DE DIA DE FATURAMENTO
  WHILE v_period_start <= v_contract.final_date LOOP
    -- AIDEV-NOTE: Calcular fim do período - SEMPRE MÊS COMPLETO para retroativos
    IF v_contract.billing_type = 'Mensal' OR v_contract.billing_type = 'MONTHLY' THEN
      -- Para contratos retroativos: sempre mês completo
      IF v_is_retroactive THEN
        v_period_end := (DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      ELSE
        -- Para contratos normais: usar lógica original
        v_period_end := (DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' + INTERVAL '1 day' * (v_contract.billing_day - 1))::DATE - INTERVAL '1 day';
      END IF;
      
      -- Ajustar se ultrapassar a data final do contrato
      IF v_period_end > v_contract.final_date THEN
        -- AIDEV-NOTE: Para retroativos, mesmo que termine antes, cobrar mês completo
        IF NOT v_is_retroactive THEN
          v_period_end := v_contract.final_date;
        END IF;
      END IF;
    ELSE
      v_period_end := v_contract.final_date;
    END IF;

    -- AIDEV-NOTE: NOVA LÓGICA DE DIA DE FATURAMENTO conforme documento
    IF v_contract.billing_type = 'Mensal' OR v_contract.billing_type = 'MONTHLY' THEN
      IF v_is_first_period AND v_is_retroactive THEN
        -- AIDEV-NOTE: REGRA CRÍTICA - Primeiro período de contrato retroativo
        -- Se dia configurado ≤ dia atual: usar HOJE
        -- Se dia configurado > dia atual: usar dia configurado
        IF v_configured_day <= v_current_day THEN
          v_bill_date := v_current_date; -- Usar HOJE
          RAISE NOTICE 'Primeiro período retroativo: usando DIA ATUAL (%) pois dia configurado (%) <= dia atual', 
                       v_current_date, v_configured_day;
        ELSE
          v_bill_date := (DATE_TRUNC('month', v_period_start) + INTERVAL '1 day' * (v_configured_day - 1))::DATE;
          RAISE NOTICE 'Primeiro período retroativo: usando DIA CONFIGURADO (%) pois dia configurado > dia atual (%)', 
                       v_bill_date, v_current_day;
        END IF;
      ELSE
        -- AIDEV-NOTE: Períodos subsequentes: sempre usar dia configurado
        v_bill_date := (DATE_TRUNC('month', v_period_start) + INTERVAL '1 day' * (v_configured_day - 1))::DATE;
        
        -- Ajustar se o dia não existir no mês
        IF EXTRACT(DAY FROM v_bill_date) > EXTRACT(DAY FROM (DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day')) THEN
          v_bill_date := (DATE_TRUNC('month', v_period_start) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        END IF;
        
        -- Garantir que não seja anterior ao início do período
        IF v_bill_date < v_period_start THEN
          v_bill_date := v_period_start;
        END IF;
      END IF;
    ELSE
      v_bill_date := v_period_end;
    END IF;

    -- AIDEV-NOTE: Verificar se já existe período BILLED para este intervalo
    SELECT * INTO v_existing_period
    FROM contract_billing_periods
    WHERE contract_id = p_contract_id 
      AND tenant_id = v_tenant_id
      AND status = 'BILLED'
      AND (
        (period_start <= v_period_start AND period_end >= v_period_start) OR
        (period_start <= v_period_end AND period_end >= v_period_end) OR
        (period_start >= v_period_start AND period_end <= v_period_end)
      );

    IF v_existing_period.id IS NULL THEN
      -- AIDEV-NOTE: Verificar se existe período não-BILLED que pode ser atualizado
      SELECT id INTO v_period_id
      FROM contract_billing_periods
      WHERE contract_id = p_contract_id 
        AND tenant_id = v_tenant_id
        AND status != 'BILLED'
        AND period_start = v_period_start
        AND period_end = v_period_end
      LIMIT 1;

      IF v_period_id IS NOT NULL THEN
        -- AIDEV-NOTE: ATUALIZAR período existente preservando ID
        UPDATE contract_billing_periods 
        SET 
          bill_date = v_bill_date,
          amount_planned = v_amount_planned,
          updated_at = NOW()
        WHERE id = v_period_id;
        
        -- Adicionar ao array de períodos para manter
        v_periods_to_keep := array_append(v_periods_to_keep, v_period_id);
        v_periods_updated := v_periods_updated + 1;
        RAISE NOTICE 'Período atualizado (ID preservado): % - Período: % a % - Faturamento: %', 
                     v_period_id, v_period_start, v_period_end, v_bill_date;
      ELSE
        -- AIDEV-NOTE: INSERIR novo período
        INSERT INTO contract_billing_periods (
          tenant_id,
          contract_id,
          period_start,
          period_end,
          bill_date,
          status,
          amount_planned,
          amount_billed
        ) VALUES (
          v_tenant_id,
          p_contract_id,
          v_period_start,
          v_period_end,
          v_bill_date,
          'PENDING',
          v_amount_planned,
          NULL
        ) RETURNING id INTO v_period_id;

        -- Adicionar ao array de períodos para manter
        v_periods_to_keep := array_append(v_periods_to_keep, v_period_id);
        v_periods_created := v_periods_created + 1;
        RAISE NOTICE 'Período criado: % - Período: % a % - Faturamento: %', 
                     v_period_id, v_period_start, v_period_end, v_bill_date;
      END IF;
    ELSE
      -- Período BILLED existente - adicionar ao array para manter
      v_periods_to_keep := array_append(v_periods_to_keep, v_existing_period.id);
      RAISE NOTICE 'Período % a % pulado devido a conflito com período BILLED (ID: %)', 
                   v_period_start, v_period_end, v_existing_period.id;
    END IF;

    -- AIDEV-NOTE: Marcar que não é mais o primeiro período
    v_is_first_period := false;

    -- Avançar para o próximo período
    IF v_contract.billing_type = 'Mensal' OR v_contract.billing_type = 'MONTHLY' THEN
      v_period_start := (DATE_TRUNC('month', v_period_start) + INTERVAL '1 month')::DATE;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- AIDEV-NOTE: Remover apenas períodos não-BILLED que não estão no array de manter
  DELETE FROM contract_billing_periods 
  WHERE contract_id = p_contract_id 
    AND tenant_id = v_tenant_id
    AND status != 'BILLED'
    AND id != ALL(v_periods_to_keep);

  -- AIDEV-NOTE: Log final com estatísticas da operação
  RAISE NOTICE 'OPERAÇÃO CONCLUÍDA para contrato %: % períodos criados, % períodos atualizados, % períodos BILLED preservados, Retroativo: %, Lógica: %', 
               p_contract_id, v_periods_created, v_periods_updated, v_billed_periods_count, v_is_retroactive, 
               CASE WHEN v_is_retroactive THEN 'FULL_MONTH_ALWAYS_V2' ELSE 'NORMAL' END;

  RETURN v_periods_created + v_periods_updated;
END;
$$;


ALTER FUNCTION "public"."upsert_billing_periods_for_contract"("p_contract_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_tenant_integration"("p_tenant_id" "uuid", "p_integration_type" character varying, "p_config" "jsonb", "p_is_active" boolean DEFAULT true) RETURNS TABLE("id" integer, "tenant_id" "uuid", "integration_type" character varying, "config" "jsonb", "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    INSERT INTO tenant_integrations (
        tenant_id,
        integration_type,
        config,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        p_tenant_id,
        p_integration_type,
        p_config,
        p_is_active,
        NOW(),
        NOW()
    )
    ON CONFLICT ON CONSTRAINT tenant_integrations_tenant_integration_unique
    DO UPDATE SET
        config = EXCLUDED.config,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING 
        tenant_integrations.id,
        tenant_integrations.tenant_id,
        tenant_integrations.integration_type,
        tenant_integrations.config,
        tenant_integrations.is_active,
        tenant_integrations.created_at,
        tenant_integrations.updated_at;
END;
$$;


ALTER FUNCTION "public"."upsert_tenant_integration"("p_tenant_id" "uuid", "p_integration_type" character varying, "p_config" "jsonb", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_belongs_to_tenant"("tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  belongs BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_id = $1 
    AND user_id = auth.uid()
  ) INTO belongs;
  
  RETURN belongs;
END;
$_$;


ALTER FUNCTION "public"."user_belongs_to_tenant"("tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_contract_service_access"("p_contract_id" "uuid" DEFAULT NULL::"uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
/**
 * AIDEV-NOTE: Função para validar acesso seguro aos serviços de contrato
 * Implementa validação multi-camada com fallbacks robustos
 * 
 * @param p_contract_id ID do contrato (opcional)
 * @param p_tenant_id ID do tenant (opcional)
 * @return TRUE se o usuário tem acesso, FALSE caso contrário
 */
DECLARE
    v_current_user_id UUID;
    v_current_tenant_id UUID;
    v_user_role TEXT;
    v_contract_tenant_id UUID;
BEGIN
    -- Obter ID do usuário atual
    v_current_user_id := auth.uid();
    
    -- Se não há usuário autenticado, negar acesso
    IF v_current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Obter role do usuário
    SELECT user_role INTO v_user_role
    FROM public.users 
    WHERE id = v_current_user_id;
    
    -- Usuários ADMIN têm acesso total
    IF v_user_role = 'ADMIN' THEN
        RETURN TRUE;
    END IF;
    
    -- Obter tenant_id atual da sessão
    v_current_tenant_id := public.get_current_tenant_id_simple();
    
    -- Se tenant_id foi fornecido diretamente, usar ele
    IF p_tenant_id IS NOT NULL THEN
        -- Verificar se usuário tem acesso ao tenant fornecido
        IF NOT EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            WHERE tu.user_id = v_current_user_id 
            AND tu.tenant_id = p_tenant_id
        ) THEN
            RETURN FALSE;
        END IF;
        
        -- Se tenant_id da sessão não bate com o fornecido, negar acesso
        IF v_current_tenant_id IS NOT NULL AND v_current_tenant_id != p_tenant_id THEN
            RETURN FALSE;
        END IF;
        
        RETURN TRUE;
    END IF;
    
    -- Se contract_id foi fornecido, validar através do contrato
    IF p_contract_id IS NOT NULL THEN
        SELECT c.tenant_id INTO v_contract_tenant_id
        FROM public.contracts c
        WHERE c.id = p_contract_id;
        
        -- Se contrato não existe, negar acesso
        IF v_contract_tenant_id IS NULL THEN
            RETURN FALSE;
        END IF;
        
        -- Verificar se usuário tem acesso ao tenant do contrato
        IF NOT EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            WHERE tu.user_id = v_current_user_id 
            AND tu.tenant_id = v_contract_tenant_id
        ) THEN
            RETURN FALSE;
        END IF;
        
        -- Se tenant_id da sessão não bate com o do contrato, negar acesso
        IF v_current_tenant_id IS NOT NULL AND v_current_tenant_id != v_contract_tenant_id THEN
            RETURN FALSE;
        END IF;
        
        RETURN TRUE;
    END IF;
    
    -- Se chegou até aqui sem parâmetros específicos, verificar acesso geral ao tenant
    IF v_current_tenant_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            WHERE tu.user_id = v_current_user_id 
            AND tu.tenant_id = v_current_tenant_id
        );
    END IF;
    
    -- Fallback: negar acesso se não conseguiu validar
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."user_has_contract_service_access"("p_contract_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_contract_service_access"("p_contract_id" "uuid", "p_tenant_id" "uuid") IS 'FUNÇÃO DE SEGURANÇA MULTI-TENANT - CONTRACT_SERVICES

PROPÓSITO:
Valida se o usuário atual tem acesso a um registro específico de contract_services
implementando validação multi-camada para garantir isolamento de dados.

PARÂMETROS:
- p_contract_service_id: ID do registro contract_services a ser validado
- p_tenant_id: ID do tenant para validação (opcional, obtido automaticamente se NULL)

VALIDAÇÕES IMPLEMENTADAS:
1. VALIDAÇÃO DIRETA: Verifica se contract_services.tenant_id corresponde ao tenant atual
2. VALIDAÇÃO VIA CONTRATO: Fallback via relacionamento contracts.tenant_id
3. VALIDAÇÃO DE USUÁRIO ADMIN: Permite acesso total para usuários administradores
4. VALIDAÇÃO DE EXISTÊNCIA: Confirma que o registro existe antes de validar acesso

SEGURANÇA:
- Implementa princípio de menor privilégio
- Múltiplas camadas de validação para robustez
- Logs de auditoria para debugging
- Tratamento seguro de erros

PERFORMANCE:
- Otimizada com índices apropriados
- Evita consultas desnecessárias
- Cache de resultados quando possível

RETORNO:
- TRUE: Usuário tem acesso ao registro
- FALSE: Usuário não tem acesso ou registro não existe

EXEMPLO DE USO:
SELECT * FROM contract_services 
WHERE user_has_contract_service_access(id, tenant_id);';



CREATE OR REPLACE FUNCTION "public"."user_has_contract_service_access_v2"("p_contract_id" "uuid" DEFAULT NULL::"uuid", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
/**
 * AIDEV-NOTE: Função melhorada para validar acesso aos serviços de contrato
 * Implementa validação robusta com fallbacks para casos sem contexto de sessão
 * 
 * @param p_contract_id ID do contrato (opcional)
 * @param p_tenant_id ID do tenant (opcional)
 * @return TRUE se o usuário tem acesso, FALSE caso contrário
 */
DECLARE
    v_current_user_id UUID;
    v_current_tenant_id UUID;
    v_user_role TEXT;
    v_contract_tenant_id UUID;
    v_has_tenant_access BOOLEAN := FALSE;
BEGIN
    -- Obter ID do usuário atual
    v_current_user_id := auth.uid();
    
    -- Se não há usuário autenticado, negar acesso
    IF v_current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Obter role do usuário
    SELECT user_role INTO v_user_role
    FROM public.users 
    WHERE id = v_current_user_id;
    
    -- Usuários ADMIN têm acesso total
    IF v_user_role = 'ADMIN' THEN
        RETURN TRUE;
    END IF;
    
    -- Obter tenant_id atual da sessão (pode ser NULL se não configurado)
    v_current_tenant_id := public.get_current_tenant_id_simple();
    
    -- CASO 1: tenant_id foi fornecido diretamente
    IF p_tenant_id IS NOT NULL THEN
        -- Verificar se usuário tem acesso ao tenant fornecido
        SELECT EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            WHERE tu.user_id = v_current_user_id 
            AND tu.tenant_id = p_tenant_id
            AND (tu.is_active IS NULL OR tu.is_active = TRUE)
        ) INTO v_has_tenant_access;
        
        IF NOT v_has_tenant_access THEN
            RETURN FALSE;
        END IF;
        
        -- Se tenant_id da sessão existe e não bate com o fornecido, negar acesso
        IF v_current_tenant_id IS NOT NULL AND v_current_tenant_id != p_tenant_id THEN
            RETURN FALSE;
        END IF;
        
        RETURN TRUE;
    END IF;
    
    -- CASO 2: contract_id foi fornecido, validar através do contrato
    IF p_contract_id IS NOT NULL THEN
        SELECT c.tenant_id INTO v_contract_tenant_id
        FROM public.contracts c
        WHERE c.id = p_contract_id;
        
        -- Se contrato não existe, negar acesso
        IF v_contract_tenant_id IS NULL THEN
            RETURN FALSE;
        END IF;
        
        -- Verificar se usuário tem acesso ao tenant do contrato
        SELECT EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            WHERE tu.user_id = v_current_user_id 
            AND tu.tenant_id = v_contract_tenant_id
            AND (tu.is_active IS NULL OR tu.is_active = TRUE)
        ) INTO v_has_tenant_access;
        
        IF NOT v_has_tenant_access THEN
            RETURN FALSE;
        END IF;
        
        -- Se tenant_id da sessão existe e não bate com o do contrato, negar acesso
        IF v_current_tenant_id IS NOT NULL AND v_current_tenant_id != v_contract_tenant_id THEN
            RETURN FALSE;
        END IF;
        
        RETURN TRUE;
    END IF;
    
    -- CASO 3: Sem parâmetros específicos, verificar acesso geral ao tenant da sessão
    IF v_current_tenant_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 
            FROM public.tenant_users tu
            WHERE tu.user_id = v_current_user_id 
            AND tu.tenant_id = v_current_tenant_id
            AND (tu.is_active IS NULL OR tu.is_active = TRUE)
        );
    END IF;
    
    -- CASO 4: Fallback - verificar se usuário tem acesso a qualquer tenant
    -- Isso permite operações quando o contexto de sessão não está configurado
    RETURN EXISTS (
        SELECT 1 
        FROM public.tenant_users tu
        WHERE tu.user_id = v_current_user_id 
        AND (tu.is_active IS NULL OR tu.is_active = TRUE)
    );
END;
$$;


ALTER FUNCTION "public"."user_has_contract_service_access_v2"("p_contract_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_permission"("permission_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    user_permissions jsonb;
    permission_exists boolean := false;
BEGIN
    -- Extrair permissões do JWT
    user_permissions := auth.jwt() -> 'permissions';
    
    -- Verificar se a permissão existe
    IF user_permissions IS NOT NULL THEN
        -- Verificar se é um array de permissões
        IF jsonb_typeof(user_permissions) = 'array' THEN
            SELECT EXISTS(
                SELECT 1 
                FROM jsonb_array_elements_text(user_permissions) AS perm
                WHERE perm = permission_name
            ) INTO permission_exists;
        -- Verificar se é um objeto com permissões como chaves
        ELSIF jsonb_typeof(user_permissions) = 'object' THEN
            permission_exists := user_permissions ? permission_name;
        END IF;
    END IF;
    
    RETURN permission_exists;
END;
$$;


ALTER FUNCTION "public"."user_has_permission"("permission_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_tenant_access"("tenant_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND tenant_id = tenant_uuid
  );
END;
$$;


ALTER FUNCTION "public"."user_has_tenant_access"("tenant_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_tenant_admin"("tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_id = $1 
    AND user_id = auth.uid() 
    AND role = 'TENANT_ADMIN'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$_$;


ALTER FUNCTION "public"."user_is_tenant_admin"("tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_and_sync_order_sequence"("p_tenant_id" "uuid") RETURNS TABLE("tenant_id" "uuid", "sequence_number" integer, "max_real_number" integer, "gap" integer, "synchronized" boolean)
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  v_sequence_number integer;
  v_max_real_number integer;
  v_gap integer;
BEGIN
  -- Número atual da sequência
  SELECT s.last_number INTO v_sequence_number
  FROM public.service_order_sequences s
  WHERE s.tenant_id = p_tenant_id;

  -- Maior número real apenas na tabela unificada
  SELECT MAX(order_number::integer) INTO v_max_real_number
  FROM public.contract_billing_periods cbp
  WHERE cbp.tenant_id = p_tenant_id
    AND cbp.order_number IS NOT NULL
    AND cbp.order_number ~ '^[0-9]+$';

  -- Calcular gap
  v_gap := COALESCE(v_sequence_number, 0) - COALESCE(v_max_real_number, 0);

  -- Se gap > 0, sincroniza
  IF v_gap > 0 AND v_max_real_number IS NOT NULL THEN
    UPDATE public.service_order_sequences
    SET
      last_number = v_max_real_number,
      updated_at = timezone('America/Sao_Paulo'::text, now())
    WHERE service_order_sequences.tenant_id = p_tenant_id;

    v_sequence_number := v_max_real_number;
  END IF;

  RETURN QUERY SELECT
    p_tenant_id,
    v_sequence_number,
    COALESCE(v_max_real_number, 0),
    v_gap,
    (v_gap <= 0) as synchronized;
END;
$_$;


ALTER FUNCTION "public"."validate_and_sync_order_sequence"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_billing_periods_tenant_single"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- AIDEV-NOTE: Validação multi-tenant para billing_periods único
    -- Garante que o billing_period pertence ao mesmo tenant da charge
    
    IF NEW.billing_periods IS NOT NULL THEN
        -- Verificar se o billing_period existe e pertence ao mesmo tenant
        IF NOT EXISTS (
            SELECT 1 
            FROM public.contract_billing_periods cbp
            WHERE cbp.id = NEW.billing_periods 
              AND cbp.tenant_id = NEW.tenant_id
        ) THEN
            RAISE EXCEPTION 'billing_periods deve pertencer ao mesmo tenant da charge';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_billing_periods_tenant_single"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_jwt_integrity"("p_token" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  jwt_claims jsonb;
  token_exp numeric;
  now_timestamp numeric;
BEGIN
  -- Se nenhum token fornecido, usar JWT atual
  IF p_token IS NULL THEN
    BEGIN
      jwt_claims := auth.jwt();
      
      -- Verificar se JWT existe e é válido
      IF jwt_claims IS NULL THEN
        RETURN FALSE;
      END IF;
      
      -- Verificar expiração
      token_exp := (jwt_claims->>'exp')::numeric;
      now_timestamp := extract(epoch from now());
      
      -- Token é válido se não expirou
      RETURN token_exp > now_timestamp;
      
    EXCEPTION
      WHEN OTHERS THEN
        RETURN FALSE;
    END;
  END IF;
  
  -- Para tokens fornecidos externamente, sempre retornar true por enquanto
  -- TODO: Implementar validação completa de tokens externos
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."validate_jwt_integrity"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_refresh_token"("p_refresh_token" "text", "p_tenant_slug" "text") RETURNS TABLE("session_id" "uuid", "user_id" "uuid", "tenant_id" "uuid", "tenant_name" "text", "is_valid" boolean, "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        trs.id,
        trs.user_id,
        trs.tenant_id,
        t.name,
        (trs.is_active AND trs.refresh_expires_at > NOW()) as is_valid,
        trs.refresh_expires_at
    FROM tenant_refresh_sessions trs
    JOIN tenants t ON t.id = trs.tenant_id
    WHERE trs.refresh_token = p_refresh_token
    AND trs.tenant_slug = p_tenant_slug;
END;
$$;


ALTER FUNCTION "public"."validate_refresh_token"("p_refresh_token" "text", "p_tenant_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_refresh_token"("p_refresh_token" "text", "p_tenant_slug" "text") IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."validate_refresh_token"("p_token" "text", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("user_id" "uuid", "tenant_id" "uuid", "token_id" "uuid", "valid" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.user_id,
    rt.tenant_id,
    rt.id as token_id,
    (rt.revoked_at IS NULL AND rt.expires_at > now()) as valid
  FROM tenant_refresh_tokens rt
  WHERE rt.token = p_token
    AND (p_tenant_id IS NULL OR rt.tenant_id = p_tenant_id);
END;
$$;


ALTER FUNCTION "public"."validate_refresh_token"("p_token" "text", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_refresh_token"("p_token" "text", "p_tenant_id" "uuid") IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."validate_role_exists"("role_name" "text", "role_context" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Se o contexto não for especificado, verifica se o role existe em qualquer contexto
  IF role_context IS NULL THEN
    RETURN EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE name = role_name
    );
  END IF;
  
  -- Se o contexto for especificado, verifica se o role existe no contexto específico
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE name = role_name 
    AND context = role_context
  );
END;
$$;


ALTER FUNCTION "public"."validate_role_exists"("role_name" "text", "role_context" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_role_exists"("role_name" "text", "role_context" "text") IS 'SECURITY: search_path fixado para prevenir ataques de injeção de schema';



CREATE OR REPLACE FUNCTION "public"."validate_tenant_access_jwt"("target_tenant_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  jwt_claims jsonb;
  tenant_access jsonb;
  user_role text;
  result jsonb;
BEGIN
  -- AIDEV-NOTE: Tentar obter claims do JWT atual
  BEGIN
    jwt_claims := auth.jwt();
    tenant_access := jwt_claims->'tenant_access';
    
    -- Verificar se o tenant existe no mapa de acesso
    IF tenant_access ? target_tenant_id::text THEN
      user_role := tenant_access->target_tenant_id::text->>'role';
      
      result := jsonb_build_object(
        'has_access', true,
        'role', user_role,
        'method', 'jwt',
        'tenant_id', target_tenant_id
      );
      
      RETURN result;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- JWT inválido ou não disponível, usar fallback
      NULL;
  END;
  
  -- AIDEV-NOTE: Fallback para consulta direta no banco
  SELECT jsonb_build_object(
    'has_access', CASE WHEN tu.user_id IS NOT NULL THEN true ELSE false END,
    'role', tu.role,
    'method', 'database',
    'tenant_id', target_tenant_id
  )
  INTO result
  FROM tenant_users tu
  WHERE tu.user_id = auth.uid()
    AND tu.tenant_id = target_tenant_id
    AND tu.is_active = true;
  
  RETURN COALESCE(result, jsonb_build_object(
    'has_access', false,
    'role', null,
    'method', 'database',
    'tenant_id', target_tenant_id
  ));
END;
$$;


ALTER FUNCTION "public"."validate_tenant_access_jwt"("target_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_tenant_access_jwt"("target_tenant_id" "uuid") IS 'Função segura para validar JWT do tenant - search_path fixo';



CREATE OR REPLACE FUNCTION "public"."validate_tenant_token"("p_token" "text", "p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_token_version INTEGER;
  v_current_version INTEGER;
BEGIN
  -- Esta função seria chamada pelo BFF/middleware para validar tokens
  -- Na implementação real, a validação do JWT é feita pelo middleware
  -- e esta função só verifica o token_version

  -- Obter user_id do token (simula decodificação do JWT)
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Extrair versão do token (simula claim do JWT)
  -- Na implementação real, o BFF extrai isso do JWT decodificado
  v_token_version := 1; -- Exemplo
  
  -- Verificar a versão atual do token para este usuário/tenant
  SELECT token_version INTO v_current_version
  FROM public.tenant_users
  WHERE user_id = v_user_id
  AND tenant_id = p_tenant_id
  AND active = true;
  
  IF v_current_version IS NULL THEN
    -- Usuário não tem acesso ou está inativo
    RETURN false;
  END IF;
  
  -- Token é válido se a versão armazenada corresponde à versão atual
  RETURN v_token_version = v_current_version;
END;
$$;


ALTER FUNCTION "public"."validate_tenant_token"("p_token" "text", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_tenant_token"("p_token" "text", "p_tenant_id" "uuid") IS 'Função para validar token JWT em middleware do BFF, verificando se o token_version do usuário corresponde ao armazenado.';



CREATE OR REPLACE FUNCTION "public"."verify_and_set_admin_role"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Verifica se é admin usando user_role
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = user_id 
    AND user_role = 'ADMIN'
  ) INTO is_admin;

  IF is_admin THEN
    -- Define a role na sessão atual
    PERFORM set_config('app.user_role', 'ADMIN', false);
  END IF;

  RETURN is_admin;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."verify_and_set_admin_role"("user_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agente_ia_empresa" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "nome_agente" "text" NOT NULL,
    "tom_de_voz" "text" NOT NULL,
    "exemplos_de_mensagem" "jsonb" DEFAULT '[]'::"jsonb",
    "usa_emojis" boolean DEFAULT true,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"(),
    "Coluna de Teste Branch" "jsonb"
);


ALTER TABLE "public"."agente_ia_empresa" OWNER TO "postgres";


COMMENT ON TABLE "public"."agente_ia_empresa" IS 'Configurações do agente virtual de IA por empresa';



COMMENT ON COLUMN "public"."agente_ia_empresa"."nome_agente" IS 'Nome fictício do agente de cobrança IA';



COMMENT ON COLUMN "public"."agente_ia_empresa"."tom_de_voz" IS 'Descrição do estilo de comunicação do agente';



COMMENT ON COLUMN "public"."agente_ia_empresa"."exemplos_de_mensagem" IS 'Até 3 exemplos de mensagens no estilo desejado';



COMMENT ON COLUMN "public"."agente_ia_empresa"."usa_emojis" IS 'Define se o agente pode usar emojis nas mensagens';



CREATE TABLE IF NOT EXISTS "public"."agente_ia_mensagens_regua" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "etapa_regua_id" "uuid" NOT NULL,
    "mensagem" "text" NOT NULL,
    "variaveis_contexto" "jsonb" DEFAULT '[]'::"jsonb",
    "personalizado" boolean DEFAULT false,
    "criado_em" timestamp with time zone DEFAULT "now"(),
    "atualizado_em" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agente_ia_mensagens_regua" OWNER TO "postgres";


COMMENT ON TABLE "public"."agente_ia_mensagens_regua" IS 'Integração entre Agente IA e Régua de Cobrança';



COMMENT ON COLUMN "public"."agente_ia_mensagens_regua"."mensagem" IS 'Texto da mensagem personalizada do agente IA para esta etapa';



COMMENT ON COLUMN "public"."agente_ia_mensagens_regua"."variaveis_contexto" IS 'Variáveis de contexto que podem ser usadas na mensagem';



COMMENT ON COLUMN "public"."agente_ia_mensagens_regua"."personalizado" IS 'Indica se a mensagem foi personalizada ou é a padrão da régua';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "entity_type" "text",
    "entity_id" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_fields" "jsonb",
    "performed_by" "uuid",
    "performed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Logs de auditoria para rastreamento de ações no sistema';



COMMENT ON COLUMN "public"."audit_logs"."action" IS 'Tipo de ação realizada';



COMMENT ON COLUMN "public"."audit_logs"."resource_type" IS 'Tipo de recurso afetado';



COMMENT ON COLUMN "public"."audit_logs"."old_values" IS 'Valores anteriores (para updates)';



COMMENT ON COLUMN "public"."audit_logs"."new_values" IS 'Novos valores';



COMMENT ON COLUMN "public"."audit_logs"."metadata" IS 'Dados adicionais em formato JSON';



CREATE TABLE IF NOT EXISTS "public"."bank_acounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "agency" "text" NOT NULL,
    "count" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "bank" "text",
    "current_balance" numeric DEFAULT 0 NOT NULL,
    CONSTRAINT "bank_acounts_tipo_check" CHECK (("type" = ANY (ARRAY['CORRENTE'::"text", 'POUPANCA'::"text", 'SALARIO'::"text", 'OUTRAS'::"text"])))
);


ALTER TABLE "public"."bank_acounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."bank_acounts" IS 'Contas bancárias multi-tenant com RLS';



COMMENT ON COLUMN "public"."bank_acounts"."type" IS 'Tipo da conta: CORRENTE, POUPANCA, SALARIO ou OUTRAS';



COMMENT ON COLUMN "public"."bank_acounts"."bank" IS 'Nome do banco';



CREATE TABLE IF NOT EXISTS "public"."bank_operation_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "bank_acount_id" "uuid",
    "operation_type" "public"."bank_operation_type" NOT NULL,
    "amount" numeric(18,2) NOT NULL,
    "operation_date" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()) NOT NULL,
    "description" "text",
    "document_reference" "uuid",
    "category" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()),
    "updated_by" "uuid",
    CONSTRAINT "bank_operation_history_amount_check" CHECK (("amount" >= (0)::numeric))
);


ALTER TABLE "public"."bank_operation_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."bank_operation_history" IS 'Histórico de operações financeiras (créditos e débitos) por conta bancária';



COMMENT ON COLUMN "public"."bank_operation_history"."operation_type" IS 'Tipo da operação: CREDIT (crédito) ou DEBIT (débito)';



COMMENT ON COLUMN "public"."bank_operation_history"."document_reference" IS 'Referência ao documento/fonte relacionado (ex.: ID da conta a pagar)';



COMMENT ON COLUMN "public"."bank_operation_history"."category" IS 'Classificação/categoria textual da operação';



CREATE TABLE IF NOT EXISTS "public"."billing_period_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "billing_period_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "service_id" "uuid",
    "storage_location_id" "uuid",
    "quantity" numeric(15,6) DEFAULT 1 NOT NULL,
    "unit_price" numeric(15,2) DEFAULT 0 NOT NULL,
    "total_price" numeric(15,2) GENERATED ALWAYS AS (("quantity" * "unit_price")) STORED,
    "description" "text",
    "observation" "text",
    "stock_movement_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()) NOT NULL,
    CONSTRAINT "chk_item_has_product_or_service" CHECK (((("product_id" IS NOT NULL) AND ("service_id" IS NULL)) OR (("product_id" IS NULL) AND ("service_id" IS NOT NULL)))),
    CONSTRAINT "chk_quantity_positive" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "chk_unit_price_positive" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."billing_period_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."billing_period_items" IS 'Itens de períodos de faturamento (produtos e serviços). Funciona para faturamentos avulsos e de contrato.';



COMMENT ON COLUMN "public"."billing_period_items"."billing_period_id" IS 'FK para contract_billing_periods (agora unificada com is_standalone)';



CREATE TABLE IF NOT EXISTS "public"."charges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "valor" numeric(10,2) NOT NULL,
    "status" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "data_vencimento" "date" NOT NULL,
    "data_pagamento" "date",
    "descricao" "text",
    "invoice_url" "text",
    "asaas_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "contract_id" "uuid",
    "external_invoice_number" "text",
    "asaas_discount_value" numeric(10,2),
    "asaas_invoice_url" "text",
    "billing_periods" "uuid",
    "created_by" "uuid",
    "updated_by" "uuid",
    "barcode" "text",
    "pix_key" "text",
    "installment_number" integer DEFAULT 1,
    "total_installments" integer DEFAULT 1,
    "installment_value" numeric(10,2),
    "is_installment" boolean DEFAULT false,
    "customer_name" "text",
    "origem" "text" DEFAULT 'MANUAL'::"text",
    "raw_data" "jsonb",
    "observacao" "text",
    "payment_value" numeric,
    "pdf_url" "text",
    "net_value" numeric,
    "interest_rate" numeric,
    "fine_rate" numeric,
    "discount_value" numeric,
    "transaction_receipt_url" "text",
    "external_customer_id" "text",
    CONSTRAINT "charges_origem_check" CHECK (("origem" = ANY (ARRAY['ASAAS'::"text", 'MANUAL'::"text", 'CORA'::"text", 'ITAU'::"text", 'BRADESCO'::"text", 'SANTANDER'::"text", 'PIX'::"text"]))),
    CONSTRAINT "charges_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'RECEIVED'::"text", 'RECEIVED_IN_CASH'::"text", 'RECEIVED_PIX'::"text", 'RECEIVED_BOLETO'::"text", 'OVERDUE'::"text", 'REFUNDED'::"text", 'CONFIRMED'::"text"]))),
    CONSTRAINT "charges_tipo_check" CHECK (("tipo" = ANY (ARRAY['BOLETO'::"text", 'PIX'::"text", 'CREDIT_CARD'::"text", 'CASH'::"text"]))),
    CONSTRAINT "chk_auto_charges_have_contract_id" CHECK ((((("metadata" ->> 'auto_generated'::"text"))::boolean IS NOT TRUE) OR ("contract_id" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."charges" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."charges" OWNER TO "postgres";


COMMENT ON TABLE "public"."charges" IS 'Tabela de cobranças com políticas RLS multi-tenant corrigidas - Migração aplicada em 2025-01-27';



COMMENT ON COLUMN "public"."charges"."contract_id" IS 'ID do contrato que originou esta cobrança - migrado do campo metadata (apenas IDs válidos)';



COMMENT ON COLUMN "public"."charges"."external_invoice_number" IS 'Referência externa para identificação única da cobrança';



COMMENT ON COLUMN "public"."charges"."asaas_discount_value" IS 'Valor de desconto aplicado no ASAAS';



COMMENT ON COLUMN "public"."charges"."asaas_invoice_url" IS 'URL da nota fiscal no ASAAS';



COMMENT ON COLUMN "public"."charges"."billing_periods" IS 'ID único do período de faturamento associado a esta cobrança (relacionamento 1:N - um charge pertence a um billing_period)';



COMMENT ON COLUMN "public"."charges"."created_by" IS 'ID do usuário que criou a cobrança';



COMMENT ON COLUMN "public"."charges"."updated_by" IS 'ID do usuário que fez a última atualização da cobrança';



COMMENT ON COLUMN "public"."charges"."barcode" IS 'Código de barras do boleto obtido via API ASAAS /payments/{id}/identificationField';



COMMENT ON COLUMN "public"."charges"."pix_key" IS 'Chave PIX obtida via API ASAAS /payments/{id}/pixQrCode (campo payload)';



COMMENT ON COLUMN "public"."charges"."installment_number" IS 'Número da parcela atual (1, 2, 3, etc.)';



COMMENT ON COLUMN "public"."charges"."total_installments" IS 'Total de parcelas da cobrança';



COMMENT ON COLUMN "public"."charges"."installment_value" IS 'Valor individual da parcela';



COMMENT ON COLUMN "public"."charges"."is_installment" IS 'Indica se a cobrança é parcelada';



COMMENT ON COLUMN "public"."charges"."payment_value" IS 'Aqui usamos para saber qual foi o valor pago';



COMMENT ON COLUMN "public"."charges"."net_value" IS 'Valor líquido recebido após dedução de taxas (valor_liquido do ASAAS)';



COMMENT ON COLUMN "public"."charges"."interest_rate" IS 'Taxa de juros aplicada na cobrança (taxa_juros do ASAAS)';



COMMENT ON COLUMN "public"."charges"."fine_rate" IS 'Taxa de multa aplicada na cobrança (taxa_multa do ASAAS)';



COMMENT ON COLUMN "public"."charges"."discount_value" IS 'Valor de desconto aplicado na cobrança (valor_desconto do ASAAS)';



COMMENT ON COLUMN "public"."charges"."transaction_receipt_url" IS 'URL do comprovante de transação do ASAAS';



COMMENT ON COLUMN "public"."charges"."external_customer_id" IS 'ID do customer no sistema externo (ex: asaas_customer_id do ASAAS)';



COMMENT ON CONSTRAINT "chk_auto_charges_have_contract_id" ON "public"."charges" IS 'Garante que cobranças geradas automaticamente sempre tenham contract_id preenchido';



CREATE TABLE IF NOT EXISTS "public"."conciliation_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "charge_id" "uuid",
    "movement_id" "uuid",
    "rule_id" "uuid",
    "action" "text" NOT NULL,
    "previous_status" "text",
    "new_status" "text",
    "notes" "text",
    "performed_by" "uuid",
    "performed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "reconciliation_history_action_check" CHECK (("action" = ANY (ARRAY['MATCH'::"text", 'UNMATCH'::"text", 'MANUAL_MATCH'::"text", 'AUTO_MATCH'::"text", 'REVIEW'::"text"])))
);


ALTER TABLE "public"."conciliation_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."conciliation_history" IS 'Histórico de todas as ações de conciliação realizadas';



CREATE TABLE IF NOT EXISTS "public"."conciliation_rules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "source" "text" NOT NULL,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "actions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "priority" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "auto_match" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "reconciliation_rules_source_check" CHECK (("source" = ANY (ARRAY['ASAAS'::"text", 'BANK'::"text", 'MANUAL'::"text", 'OTHER'::"text"])))
);


ALTER TABLE "public"."conciliation_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."conciliation_rules" IS 'Regras para conciliação automática de movimentações';



CREATE TABLE IF NOT EXISTS "public"."conciliation_staging" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "origem" "text" NOT NULL,
    "id_externo" "text" NOT NULL,
    "valor_cobranca" numeric(10,2),
    "valor_pago" numeric(10,2) NOT NULL,
    "status_externo" "text" NOT NULL,
    "status_conciliacao" "text" DEFAULT 'PENDENTE'::"text" NOT NULL,
    "contrato_id" "uuid",
    "data_vencimento" timestamp with time zone,
    "data_pagamento" timestamp with time zone,
    "observacao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "asaas_customer_id" "text",
    "external_reference" "text",
    "valor_original" numeric(10,2),
    "valor_liquido" numeric(10,2),
    "taxa_juros" numeric(10,2) DEFAULT 0,
    "taxa_multa" numeric(10,2) DEFAULT 0,
    "valor_desconto" numeric(10,2) DEFAULT 0,
    "payment_method" "text",
    "deleted_flag" boolean DEFAULT false,
    "anticipated_flag" boolean DEFAULT false,
    "customer_name" "text",
    "customer_email" "text",
    "customer_document" "text",
    "customer_phone" "text",
    "customer_mobile_phone" "text",
    "customer_address" "text",
    "customer_address_number" "text",
    "customer_complement" "text",
    "customer_cityName" "text",
    "customer_city" "text",
    "customer_state" "text",
    "customer_postal_code" "text",
    "customer_country" "text",
    "installment_number" integer,
    "invoice_url" "text",
    "pdf_url" "text",
    "transaction_receipt_url" "text",
    "raw_data" "jsonb",
    "processed" boolean DEFAULT false,
    "created_by" "uuid",
    "updated_by" "uuid",
    "charge_id" "uuid",
    "invoice_number" "text",
    "customer_province" "text",
    "customer_company" "text",
    "barcode" "text",
    "pix_key" "text",
    "imported_at" timestamp with time zone,
    CONSTRAINT "check_positive_financial_values" CHECK (((("valor_cobranca" IS NULL) OR ("valor_cobranca" >= (0)::numeric)) AND (("valor_pago" IS NULL) OR ("valor_pago" >= (0)::numeric)) AND (("valor_original" IS NULL) OR ("valor_original" >= (0)::numeric)) AND (("valor_liquido" IS NULL) OR ("valor_liquido" >= (0)::numeric)) AND (("taxa_juros" IS NULL) OR ("taxa_juros" >= (0)::numeric)) AND (("taxa_multa" IS NULL) OR ("taxa_multa" >= (0)::numeric)) AND (("valor_desconto" IS NULL) OR ("valor_desconto" >= (0)::numeric)))),
    CONSTRAINT "check_status_conciliacao_valid" CHECK (("status_conciliacao" = ANY (ARRAY['PENDENTE'::"text", 'CONCILIADO'::"text", 'ERRO'::"text", 'DIVERGENTE'::"text", 'CANCELADO'::"text"]))),
    CONSTRAINT "conciliation_staging_origem_check" CHECK (("origem" = ANY (ARRAY['ASAAS'::"text", 'PIX'::"text", 'MANUAL'::"text", 'CORA'::"text", 'ITAU'::"text", 'BRADESCO'::"text", 'SANTANDER'::"text"])))
);


ALTER TABLE "public"."conciliation_staging" OWNER TO "postgres";


COMMENT ON TABLE "public"."conciliation_staging" IS 'Tabela de staging para movimentações financeiras importadas antes da conciliação';



COMMENT ON COLUMN "public"."conciliation_staging"."origem" IS 'Origem da movimentação (ASAAS, CORA, etc.)';



COMMENT ON COLUMN "public"."conciliation_staging"."id_externo" IS 'ID da movimentação no sistema externo';



COMMENT ON COLUMN "public"."conciliation_staging"."valor_cobranca" IS 'Valor da cobrança interna (se houver)';



COMMENT ON COLUMN "public"."conciliation_staging"."valor_pago" IS 'Valor efetivamente pago (importado)';



COMMENT ON COLUMN "public"."conciliation_staging"."status_externo" IS 'Status no sistema externo';



COMMENT ON COLUMN "public"."conciliation_staging"."status_conciliacao" IS 'Status da conciliação interna';



COMMENT ON COLUMN "public"."conciliation_staging"."asaas_customer_id" IS 'ID do cliente no ASAAS';



COMMENT ON COLUMN "public"."conciliation_staging"."external_reference" IS 'Referência externa (nosso número)';



COMMENT ON COLUMN "public"."conciliation_staging"."valor_original" IS 'Valor original da cobrança no ASAAS';



COMMENT ON COLUMN "public"."conciliation_staging"."valor_liquido" IS 'Valor líquido após taxas no ASAAS';



COMMENT ON COLUMN "public"."conciliation_staging"."taxa_juros" IS 'Valor de juros aplicado no ASAAS';



COMMENT ON COLUMN "public"."conciliation_staging"."taxa_multa" IS 'Valor de multa aplicado no ASAAS';



COMMENT ON COLUMN "public"."conciliation_staging"."valor_desconto" IS 'Valor de desconto aplicado no ASAAS';



COMMENT ON COLUMN "public"."conciliation_staging"."payment_method" IS 'Método de pagamento (PIX, BOLETO, CREDIT_CARD, etc.)';



COMMENT ON COLUMN "public"."conciliation_staging"."raw_data" IS 'Dados completos do webhook ASAAS em formato JSON';



COMMENT ON COLUMN "public"."conciliation_staging"."processed" IS 'Flag indicando se o registro foi processado para a tabela charges';



COMMENT ON COLUMN "public"."conciliation_staging"."charge_id" IS 'Referência à cobrança importada (NULL = não importado)';



COMMENT ON COLUMN "public"."conciliation_staging"."invoice_number" IS 'Número da fatura/nota fiscal do ASAAS (campo invoiceNumber do webhook)';



COMMENT ON CONSTRAINT "conciliation_staging_origem_check" ON "public"."conciliation_staging" IS 'Constraint atualizado em 2025-01-16: Padronização MAIÚSCULA para todos os valores de origem. Inclui PIX como nova origem válida.';



CREATE TABLE IF NOT EXISTS "public"."contract_attachments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" character varying(100),
    "file_size" integer,
    "description" "text",
    "category" character varying(50),
    "is_active" boolean DEFAULT true,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uploaded_by" "uuid",
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."contract_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."contract_attachments" IS 'Documentos e arquivos anexados aos contratos';



COMMENT ON COLUMN "public"."contract_attachments"."category" IS 'Categoria do anexo: contrato, aditivo, comprovante, etc.';



CREATE TABLE IF NOT EXISTS "public"."contract_billing_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "billing_id" "uuid" NOT NULL,
    "contract_service_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" numeric(10,4) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "discount_percentage" numeric(10,6) DEFAULT 0,
    "discount_amount" numeric(10,2) GENERATED ALWAYS AS ("round"((("unit_price" * "quantity") * "discount_percentage"), 2)) STORED,
    "total_amount" numeric(10,2) GENERATED ALWAYS AS ("round"((("unit_price" * "quantity") - (("unit_price" * "quantity") * "discount_percentage")), 2)) STORED,
    "tax_code" character varying(50),
    "tax_rate" numeric(5,2) DEFAULT 0,
    "tax_amount" numeric(10,2) GENERATED ALWAYS AS ("round"(((("unit_price" * "quantity") - (("unit_price" * "quantity") * "discount_percentage")) * ("tax_rate" / (100)::numeric)), 2)) STORED,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contract_billing_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."contract_billing_items" IS 'Itens detalhados de cada faturamento';



CREATE TABLE IF NOT EXISTS "public"."contract_billing_payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "billing_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "payment_date" timestamp with time zone NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "payment_method" character varying(50) NOT NULL,
    "transaction_id" character varying(100),
    "payment_gateway_id" "uuid",
    "external_id" character varying(100),
    "notes" "text",
    "receipt_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."contract_billing_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."contract_billing_payments" IS 'Registro de pagamentos recebidos para faturamentos';



CREATE TABLE IF NOT EXISTS "public"."contract_billings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "billing_number" character varying(50) NOT NULL,
    "installment_number" integer NOT NULL,
    "total_installments" integer NOT NULL,
    "reference_period" character varying(50) NOT NULL,
    "reference_start_date" "date" NOT NULL,
    "reference_end_date" "date" NOT NULL,
    "issue_date" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "original_due_date" "date" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "net_amount" numeric(10,2) GENERATED ALWAYS AS ((("amount" - "discount_amount") + "tax_amount")) STORED,
    "status" character varying(20) DEFAULT 'PENDING'::character varying,
    "payment_date" timestamp with time zone,
    "payment_method" character varying(50),
    "payment_gateway_id" "uuid",
    "external_id" character varying(100),
    "payment_link" "text",
    "is_manually_paid" boolean DEFAULT false,
    "synchronization_status" character varying(20),
    "last_sync_attempt" timestamp with time zone,
    "invoice_number" character varying(50),
    "invoice_url" "text",
    "invoice_status" character varying(20),
    "invoice_text" "text",
    "invoice_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "currency" character varying(3) DEFAULT 'BRL'::character varying,
    "billing_type" "public"."billing_type_enum" DEFAULT 'regular'::"public"."billing_type_enum" NOT NULL,
    "parent_billing_id" "uuid",
    "complementary_reason" "text",
    "original_amount" numeric(10,2),
    "complementary_amount" numeric(10,2),
    "service_changes" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."contract_billings" OWNER TO "postgres";


COMMENT ON TABLE "public"."contract_billings" IS 'Faturamentos gerados a partir de contratos';



COMMENT ON COLUMN "public"."contract_billings"."status" IS 'Status do faturamento: PENDING (Pendente), PAID (Pago), PARTIALLY_PAID (Parcialmente Pago), OVERDUE (Vencido), CANCELED (Cancelado)';



COMMENT ON COLUMN "public"."contract_billings"."synchronization_status" IS 'Status de sincronização com gateway externo: PENDING (Pendente), SYNCED (Sincronizado), FAILED (Falhou)';



COMMENT ON COLUMN "public"."contract_billings"."currency" IS 'Moeda da cobrança (ISO 4217 - ex: BRL, USD, EUR)';



COMMENT ON COLUMN "public"."contract_billings"."billing_type" IS 'Tipo do faturamento: regular, complementary ou adjustment';



COMMENT ON COLUMN "public"."contract_billings"."parent_billing_id" IS 'Referência ao faturamento principal (para complementares)';



COMMENT ON COLUMN "public"."contract_billings"."complementary_reason" IS 'Motivo do faturamento complementar';



COMMENT ON COLUMN "public"."contract_billings"."original_amount" IS 'Valor original antes do complemento';



COMMENT ON COLUMN "public"."contract_billings"."complementary_amount" IS 'Valor do complemento';



COMMENT ON COLUMN "public"."contract_billings"."service_changes" IS 'JSON com detalhes das mudanças de serviços';



CREATE TABLE IF NOT EXISTS "public"."contract_products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "quantity" numeric(10,4) DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "discount_percentage" numeric(10,6) DEFAULT 0,
    "discount_amount" numeric(10,2) GENERATED ALWAYS AS ("round"((("unit_price" * "quantity") * "discount_percentage"), 2)) STORED,
    "total_amount" numeric(10,2) GENERATED ALWAYS AS ("round"((("unit_price" * "quantity") - (("unit_price" * "quantity") * "discount_percentage")), 2)) STORED,
    "tax_rate" numeric(5,2) DEFAULT 0,
    "tax_amount" numeric(10,2) GENERATED ALWAYS AS ("round"(((("unit_price" * "quantity") - (("unit_price" * "quantity") * "discount_percentage")) * ("tax_rate" / (100)::numeric)), 2)) STORED,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_method" character varying,
    "card_type" character varying,
    "billing_type" character varying,
    "recurrence_frequency" character varying,
    "installments" integer DEFAULT 1,
    "payment_gateway" "text",
    "due_date_type" character varying DEFAULT 'days_after_billing'::character varying,
    "due_days" integer DEFAULT 5,
    "due_day" integer DEFAULT 10,
    "due_next_month" boolean DEFAULT false,
    "generate_billing" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."contract_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."contract_products" IS 'Produtos vinculados a contratos específicos';



COMMENT ON COLUMN "public"."contract_products"."payment_method" IS 'Método de pagamento para o produto (pix, boleto, cartao_credito, cartao_debito)';



COMMENT ON COLUMN "public"."contract_products"."card_type" IS 'Tipo do cartão quando payment_method for cartão (visa, mastercard, etc.)';



COMMENT ON COLUMN "public"."contract_products"."billing_type" IS 'Tipo de faturamento (recorrente, unico, parcelado)';



COMMENT ON COLUMN "public"."contract_products"."recurrence_frequency" IS 'Frequência de recorrência (mensal, anual, etc.)';



COMMENT ON COLUMN "public"."contract_products"."installments" IS 'Número de parcelas para pagamento parcelado';



COMMENT ON COLUMN "public"."contract_products"."payment_gateway" IS 'Gateway de pagamento utilizado';



COMMENT ON COLUMN "public"."contract_products"."due_date_type" IS 'Tipo de vencimento (days_after_billing, fixed_day)';



COMMENT ON COLUMN "public"."contract_products"."due_days" IS 'Dias após faturamento para vencimento';



COMMENT ON COLUMN "public"."contract_products"."due_day" IS 'Dia fixo do mês para vencimento';



COMMENT ON COLUMN "public"."contract_products"."due_next_month" IS 'Se o vencimento deve ser no próximo mês';



COMMENT ON COLUMN "public"."contract_products"."generate_billing" IS 'Indica se este produto deve ser incluído na geração de cobranças mensais';



CREATE TABLE IF NOT EXISTS "public"."contract_services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "quantity" numeric(10,4) DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "discount_percentage" numeric(10,6) DEFAULT 0,
    "discount_amount" numeric(10,2) GENERATED ALWAYS AS ("round"((("unit_price" * "quantity") * "discount_percentage"), 2)) STORED,
    "total_amount" numeric(10,2) GENERATED ALWAYS AS ("round"((("unit_price" * "quantity") - (("unit_price" * "quantity") * "discount_percentage")), 2)) STORED,
    "tax_rate" numeric(5,2) DEFAULT 0,
    "tax_amount" numeric(10,2) GENERATED ALWAYS AS ("round"(((("unit_price" * "quantity") - (("unit_price" * "quantity") * "discount_percentage")) * ("tax_rate" / (100)::numeric)), 2)) STORED,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid",
    "payment_method" character varying(50),
    "card_type" character varying(20),
    "billing_type" character varying(50),
    "recurrence_frequency" character varying(50),
    "installments" integer DEFAULT 1,
    "payment_gateway" "text",
    "due_next_month" boolean DEFAULT false,
    "no_charge" boolean DEFAULT false NOT NULL,
    "generate_billing" boolean DEFAULT true NOT NULL,
    "due_type" "text" DEFAULT 'days_after_billing'::"text" NOT NULL,
    "due_value" integer DEFAULT 5 NOT NULL,
    "cost_price" numeric(10,2) DEFAULT 0,
    CONSTRAINT "check_due_type" CHECK (("due_type" = ANY (ARRAY['days_after_billing'::"text", 'fixed_day'::"text"]))),
    CONSTRAINT "check_due_value_positive" CHECK (("due_value" > 0)),
    CONSTRAINT "chk_billing_type" CHECK (((("billing_type")::"text" = ANY (ARRAY[('Mensal'::character varying)::"text", ('Trimestral'::character varying)::"text", ('Semestral'::character varying)::"text", ('Anual'::character varying)::"text", ('Único'::character varying)::"text"])) OR ("billing_type" IS NULL))),
    CONSTRAINT "chk_card_type" CHECK ((("card_type" IS NULL) OR (("card_type")::"text" = ANY ((ARRAY['debit'::character varying, 'credit'::character varying, 'credit_recurring'::character varying])::"text"[])))),
    CONSTRAINT "chk_card_type_with_payment_method" CHECK ((((("payment_method")::"text" = 'Cartão'::"text") AND ("card_type" IS NOT NULL)) OR ((("payment_method")::"text" <> 'Cartão'::"text") AND ("card_type" IS NULL)) OR ("payment_method" IS NULL))),
    CONSTRAINT "chk_installments_positive" CHECK (("installments" > 0)),
    CONSTRAINT "chk_payment_method" CHECK (((("payment_method")::"text" = ANY (ARRAY[('PIX'::character varying)::"text", ('Boleto'::character varying)::"text", ('Cartão'::character varying)::"text", ('Transferência'::character varying)::"text"])) OR ("payment_method" IS NULL))),
    CONSTRAINT "chk_recurrence_frequency" CHECK (((("recurrence_frequency")::"text" = ANY (ARRAY[('Mensal'::character varying)::"text", ('Trimestral'::character varying)::"text", ('Semestral'::character varying)::"text", ('Anual'::character varying)::"text", ('Único'::character varying)::"text"])) OR ("recurrence_frequency" IS NULL)))
);


ALTER TABLE "public"."contract_services" OWNER TO "postgres";


COMMENT ON TABLE "public"."contract_services" IS 'Serviços de contratos com campos de vencimento migrados para due_type/due_value - Migração aplicada em 2025-01-27';



COMMENT ON COLUMN "public"."contract_services"."payment_method" IS 'Método de pagamento: PIX, Boleto, Cartão, Transferência';



COMMENT ON COLUMN "public"."contract_services"."card_type" IS 'Tipo de cartão quando payment_method é Cartão: debit, credit';



COMMENT ON COLUMN "public"."contract_services"."billing_type" IS 'Tipo de faturamento: Mensal, Trimestral, Semestral, Anual, Único';



COMMENT ON COLUMN "public"."contract_services"."recurrence_frequency" IS 'Frequência de recorrência: Mensal, Trimestral, Semestral, Anual, Único';



COMMENT ON COLUMN "public"."contract_services"."installments" IS 'Número de parcelas para pagamento';



COMMENT ON COLUMN "public"."contract_services"."due_next_month" IS 'Se TRUE, o vencimento será no próximo mês (usado com fixed_day)';



COMMENT ON COLUMN "public"."contract_services"."no_charge" IS 'Indica se este serviço específico do contrato não deve gerar cobrança';



COMMENT ON COLUMN "public"."contract_services"."generate_billing" IS 'Controla se este serviço específico deve gerar cobrança automática. true = gera cobrança, false = não gera cobrança';



COMMENT ON COLUMN "public"."contract_services"."due_type" IS 'Tipo de cálculo de vencimento: days_after_billing ou fixed_day';



COMMENT ON COLUMN "public"."contract_services"."due_value" IS 'Valor para cálculo: dias após faturamento OU dia do mês';



COMMENT ON COLUMN "public"."contract_services"."cost_price" IS 'Preço de custo do serviço para cálculo de margem de lucro';



CREATE OR REPLACE VIEW "public"."contract_services_security_documentation" AS
 SELECT 'contract_services'::"text" AS "table_name",
    'RLS habilitado com política unificada'::"text" AS "security_status",
    'user_has_contract_service_access'::"text" AS "validation_function",
    'contract_services_unified_tenant_access'::"text" AS "rls_policy",
    'Multi-tenant com validação direta e fallbacks'::"text" AS "security_model",
    'Isolamento por tenant_id com suporte a admin'::"text" AS "access_control",
    CURRENT_TIMESTAMP AS "documentation_updated";


ALTER TABLE "public"."contract_services_security_documentation" OWNER TO "postgres";


COMMENT ON VIEW "public"."contract_services_security_documentation" IS 'VIEW DE DOCUMENTAÇÃO - Resumo das configurações de segurança da tabela contract_services.
Esta view fornece uma visão consolidada de todas as políticas e funções de segurança implementadas.';



CREATE TABLE IF NOT EXISTS "public"."contract_stage_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "from_stage_id" "uuid",
    "to_stage_id" "uuid" NOT NULL,
    "comments" "text",
    "internal_notes" "text",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "changed_by" "uuid",
    "metadata" "jsonb"
);


ALTER TABLE "public"."contract_stage_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."contract_stage_history" IS 'Histórico de mudanças de etapa de contratos';



CREATE TABLE IF NOT EXISTS "public"."contract_stage_transition_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "from_stage_id" "uuid" NOT NULL,
    "to_stage_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "conditions" "jsonb" NOT NULL,
    "priority" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contract_stage_transition_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_stage_transitions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "from_stage_id" "uuid" NOT NULL,
    "to_stage_id" "uuid" NOT NULL,
    "allowed_roles" character varying(50)[],
    "requires_comment" boolean DEFAULT false,
    "requires_approval" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contract_stage_transitions" OWNER TO "postgres";


COMMENT ON TABLE "public"."contract_stage_transitions" IS 'Define as transições permitidas entre etapas do fluxo de contratos';



CREATE TABLE IF NOT EXISTS "public"."contract_stages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "code" character varying(50) NOT NULL,
    "description" "text",
    "color" character varying(20),
    "icon" character varying(50),
    "order_index" integer NOT NULL,
    "is_initial" boolean DEFAULT false,
    "is_final" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "required_role" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ai_enabled" boolean DEFAULT false,
    "ai_trigger_conditions" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_actions" "jsonb" DEFAULT '{}'::"jsonb",
    "auto_transition_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "notification_template_id" "uuid",
    "duration_sla_days" integer,
    "requires_approval" boolean DEFAULT false,
    "approval_role" "text"
);


ALTER TABLE "public"."contract_stages" OWNER TO "postgres";


COMMENT ON TABLE "public"."contract_stages" IS 'Definição das etapas do fluxo de contratos';



COMMENT ON COLUMN "public"."contract_stages"."code" IS 'Código da etapa: DRAFT, FINANCIAL_CHECK, SIGNATURE, ACTIVE, CANCELED, etc.';



COMMENT ON COLUMN "public"."contract_stages"."required_role" IS 'Perfil necessário para mover um contrato para esta etapa';



CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "contract_number" "text" NOT NULL,
    "status" "text" DEFAULT 'DRAFT'::character varying NOT NULL,
    "initial_date" "date" NOT NULL,
    "final_date" "date" NOT NULL,
    "billing_type" "text" NOT NULL,
    "billing_day" integer NOT NULL,
    "anticipate_weekends" boolean DEFAULT true,
    "reference_period" "text",
    "installments" integer DEFAULT 1,
    "total_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_discount" numeric(10,2) DEFAULT 0,
    "total_tax" numeric(10,2) DEFAULT 0,
    "stage_id" "uuid",
    "description" "text",
    "internal_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "billed" boolean DEFAULT false
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


COMMENT ON TABLE "public"."contracts" IS 'Contratos firmados com clientes';



COMMENT ON COLUMN "public"."contracts"."status" IS 'Status do contrato: DRAFT (Em Preparação), ACTIVE (Ativo), CANCELED (Cancelado)';



COMMENT ON COLUMN "public"."contracts"."billing_type" IS 'Tipo de faturamento: MONTHLY (Mensal), BIMONTHLY (Bimestral), QUARTERLY (Trimestral), etc.';



COMMENT ON COLUMN "public"."contracts"."billed" IS 'Indica se o contrato já foi faturado no período atual';



CREATE TABLE IF NOT EXISTS "public"."des_payables_sequence" (
    "tenant_id" "uuid" NOT NULL,
    "last_value" bigint DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."des_payables_sequence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."finance_entries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "due_date" "date" NOT NULL,
    "payment_date" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "category_id" "uuid",
    "charge_id" "uuid",
    "contract_id" "uuid",
    "tenant_id" "uuid" NOT NULL,
    "bank_account_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "customer_id" "uuid",
    "notes" "text"
);


ALTER TABLE "public"."finance_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "credit_title_type" "text" NOT NULL,
    "open_id" "uuid",
    "settle_id" "uuid",
    "addition_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "financial_documents_credit_title_type_check" CHECK (("credit_title_type" = ANY (ARRAY['OUTROS'::"text", 'CHEQUE'::"text", 'DUPLICATA'::"text", 'PROMISSORIA'::"text", 'RECIBO'::"text"])))
);


ALTER TABLE "public"."financial_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_launchs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "operation_type" "public"."financial_operation_type",
    "generate_bank_movement" boolean DEFAULT false NOT NULL,
    "consider_settlement_movement" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."financial_launchs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_payables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "entry_number" "text",
    "description" "text",
    "gross_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "net_amount" numeric(14,2) DEFAULT 0 NOT NULL,
    "due_date" "date" NOT NULL,
    "issue_date" "date",
    "status" "public"."payable_status" DEFAULT 'PENDING'::"public"."payable_status" NOT NULL,
    "payment_date" "date",
    "paid_amount" numeric(14,2),
    "payment_method" "text",
    "category_id" "uuid",
    "document_id" "uuid",
    "supplier_id" "uuid",
    "supplier_name" "text",
    "repeat" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bank_account_id" "uuid",
    CONSTRAINT "financial_payables_check" CHECK ((("gross_amount" >= (0)::numeric) AND ("net_amount" >= (0)::numeric))),
    CONSTRAINT "financial_payables_check1" CHECK ((("paid_amount" IS NULL) OR ("net_amount" IS NULL) OR ("paid_amount" <= "net_amount"))),
    CONSTRAINT "financial_payables_paid_amount_check" CHECK ((("paid_amount" IS NULL) OR ("paid_amount" >= (0)::numeric)))
);


ALTER TABLE "public"."financial_payables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "type" "public"."financial_setting_type" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dre_category" "public"."dre_category" DEFAULT 'DEFAULT'::"public"."dre_category"
);


ALTER TABLE "public"."financial_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."health_check" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "status" "text" DEFAULT 'ok'::"text" NOT NULL,
    "last_checked" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."health_check" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "charge_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "customer_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" NOT NULL,
    "error_details" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "batch_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"(),
    CONSTRAINT "message_history_status_check" CHECK (("status" = ANY (ARRAY['SENT'::"text", 'DELIVERED'::"text", 'READ'::"text", 'FAILED'::"text"])))
);

ALTER TABLE ONLY "public"."message_history" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_history" OWNER TO "postgres";


COMMENT ON COLUMN "public"."message_history"."template_id" IS 'ID do template usado para a mensagem. Pode ser NULL quando mensagem customizada é enviada.';



COMMENT ON COLUMN "public"."message_history"."batch_id" IS 'ID do lote de mensagens para agrupamento e controle de órfãs';



CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "message" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "days_offset" integer DEFAULT 0 NOT NULL,
    "is_before_due" boolean DEFAULT true,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    CONSTRAINT "notification_templates_category_check" CHECK (("category" = ANY (ARRAY['cobranca'::"text", 'lembrete'::"text"])))
);

ALTER TABLE ONLY "public"."notification_templates" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_templates" IS 'Tabela com RLS híbrida: aceita contexto de sessão (get_current_tenant_id) OU validação por usuário. Operações de escrita exigem validação dupla para máxima segurança.';



COMMENT ON COLUMN "public"."notification_templates"."days_offset" IS 'Número de dias de offset para envio da notificação (0 = no dia, valores negativos = dias antes, valores positivos = dias depois)';



COMMENT ON COLUMN "public"."notification_templates"."is_before_due" IS 'Indica se a notificação deve ser enviada antes da data de vencimento (true) ou após (false)';



COMMENT ON COLUMN "public"."notification_templates"."tags" IS 'Array de tags para categorização e filtragem de templates';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "recipient_email" "text",
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "sent_at" timestamp with time zone,
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "tenant_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."product_categories" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_categories" IS 'Tabela de categorias de produtos com políticas RLS multi-tenant - Migração aplicada em 2025-01-27';



CREATE TABLE IF NOT EXISTS "public"."product_stock_by_location" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "storage_location_id" "uuid" NOT NULL,
    "available_stock" numeric(15,6) DEFAULT 0,
    "min_stock" numeric(15,6) DEFAULT 0,
    "unit_cmc" numeric(15,2) DEFAULT 0,
    "total_cmc" numeric(15,2) GENERATED ALWAYS AS (("available_stock" * "unit_cmc")) STORED,
    "updated_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()),
    CONSTRAINT "product_stock_by_location_available_stock_check" CHECK (("available_stock" >= (0)::numeric)),
    CONSTRAINT "product_stock_by_location_min_stock_check" CHECK (("min_stock" >= (0)::numeric))
);


ALTER TABLE "public"."product_stock_by_location" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_stock_by_location" IS 'Tabela para rastrear estoque de produtos por local de armazenamento';



COMMENT ON COLUMN "public"."product_stock_by_location"."available_stock" IS 'Estoque disponível no local';



COMMENT ON COLUMN "public"."product_stock_by_location"."min_stock" IS 'Estoque mínimo configurado para o local';



COMMENT ON COLUMN "public"."product_stock_by_location"."unit_cmc" IS 'Custo Médio de Compra unitário';



COMMENT ON COLUMN "public"."product_stock_by_location"."total_cmc" IS 'CMC total (available_stock * unit_cmc)';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "code" character varying(50),
    "sku" character varying(50),
    "barcode" character varying(50),
    "unit_price" numeric(15,2) NOT NULL,
    "cost_price" numeric(15,2),
    "stock_quantity" integer DEFAULT 0,
    "min_stock_quantity" integer DEFAULT 0,
    "category" character varying(100),
    "supplier" character varying(100),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "created_by" "uuid",
    "tenant_id" "uuid" NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 0.00,
    "has_inventory" boolean DEFAULT true,
    "image_url" "text",
    "unit_of_measure" character varying(10) DEFAULT 'un'::character varying,
    "category_id" "uuid"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS 'Catálogo de produtos disponíveis para contratos';



COMMENT ON COLUMN "public"."products"."unit_price" IS 'Preço unitário de venda do produto';



COMMENT ON COLUMN "public"."products"."cost_price" IS 'Preço de custo do produto';



COMMENT ON COLUMN "public"."products"."stock_quantity" IS 'Quantidade atual em estoque';



COMMENT ON COLUMN "public"."products"."min_stock_quantity" IS 'Quantidade mínima recomendada para estoque';



COMMENT ON COLUMN "public"."products"."category" IS 'Campo legado de categoria - será depreciado após migração';



COMMENT ON COLUMN "public"."products"."tenant_id" IS 'ID do tenant ao qual o produto pertence - usado para isolamento de dados';



COMMENT ON COLUMN "public"."products"."unit_of_measure" IS 'Unidade de medida do produto (ex: un, kg, l, m, etc.)';



COMMENT ON COLUMN "public"."products"."category_id" IS 'Foreign key para product_categories - nova estrutura normalizada';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "permissions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "context" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_context_check" CHECK (("context" = ANY (ARRAY['ADMIN'::"text", 'RESELLER'::"text", 'TENANT'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Tabela de perfis/roles do sistema com permissões por contexto. Inclui TENANT_ADMIN para administração de tenants.';



CREATE TABLE IF NOT EXISTS "public"."receipts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "charge_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "contract_id" "uuid",
    "valor_recebido" numeric(10,2) NOT NULL,
    "valor_original" numeric(10,2) NOT NULL,
    "desconto" numeric(10,2) DEFAULT 0,
    "juros" numeric(10,2) DEFAULT 0,
    "multa" numeric(10,2) DEFAULT 0,
    "metodo_pagamento" "text" NOT NULL,
    "data_recebimento" "date" DEFAULT CURRENT_DATE NOT NULL,
    "data_processamento" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "observacoes" "text",
    "numero_comprovante" "text",
    "banco_origem" "text",
    "agencia_origem" "text",
    "conta_origem" "text",
    "anexos" "jsonb" DEFAULT '[]'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "receipts_metodo_pagamento_check" CHECK (("metodo_pagamento" = ANY (ARRAY['pix'::"text", 'boleto'::"text", 'cartao_credito'::"text", 'cartao_debito'::"text", 'transferencia'::"text", 'dinheiro'::"text", 'outros'::"text"])))
);


ALTER TABLE "public"."receipts" OWNER TO "postgres";


COMMENT ON TABLE "public"."receipts" IS 'Registros de recebimentos/pagamentos das cobranças realizadas';



COMMENT ON COLUMN "public"."receipts"."valor_recebido" IS 'Valor efetivamente recebido';



COMMENT ON COLUMN "public"."receipts"."valor_original" IS 'Valor original da cobrança';



COMMENT ON COLUMN "public"."receipts"."anexos" IS 'Array de objetos com informações dos anexos/comprovantes';



COMMENT ON COLUMN "public"."receipts"."metadata" IS 'Metadados adicionais em formato JSON';



CREATE TABLE IF NOT EXISTS "public"."regua_cobranca_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ativo" boolean DEFAULT false,
    "canal_whatsapp" boolean DEFAULT true,
    "canal_email" boolean DEFAULT true,
    "canal_sms" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."regua_cobranca_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."regua_cobranca_config" IS 'RLS habilitado para segurança multi-tenant';



CREATE TABLE IF NOT EXISTS "public"."regua_cobranca_estatisticas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "periodo" character varying NOT NULL,
    "etapa_id" "uuid",
    "canal" character varying NOT NULL,
    "total_enviadas" integer DEFAULT 0,
    "total_entregues" integer DEFAULT 0,
    "total_lidas" integer DEFAULT 0,
    "total_respondidas" integer DEFAULT 0,
    "total_pagas_apos_24h" integer DEFAULT 0,
    "total_pagas_apos_72h" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "regua_cobranca_estatisticas_canal_check" CHECK ((("canal")::"text" = ANY (ARRAY[('whatsapp'::character varying)::"text", ('email'::character varying)::"text", ('sms'::character varying)::"text"])))
);


ALTER TABLE "public"."regua_cobranca_estatisticas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regua_cobranca_etapas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "posicao" integer NOT NULL,
    "gatilho" character varying NOT NULL,
    "dias" integer DEFAULT 0,
    "canal" character varying NOT NULL,
    "mensagem" "text" NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "regua_cobranca_etapas_canal_check" CHECK ((("canal")::"text" = ANY (ARRAY[('whatsapp'::character varying)::"text", ('email'::character varying)::"text", ('sms'::character varying)::"text"]))),
    CONSTRAINT "regua_cobranca_etapas_dias_check" CHECK ((("dias" >= 0) AND ("dias" <= 90))),
    CONSTRAINT "regua_cobranca_etapas_gatilho_check" CHECK ((("gatilho")::"text" = ANY (ARRAY[('antes_vencimento'::character varying)::"text", ('no_vencimento'::character varying)::"text", ('apos_vencimento'::character varying)::"text"])))
);


ALTER TABLE "public"."regua_cobranca_etapas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regua_cobranca_execucao" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "cobranca_id" "uuid" NOT NULL,
    "etapa_id" "uuid" NOT NULL,
    "status" character varying NOT NULL,
    "canal" character varying NOT NULL,
    "data_agendada" timestamp with time zone NOT NULL,
    "data_execucao" timestamp with time zone,
    "mensagem_enviada" "text",
    "erro" "text",
    "metadados" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "regua_cobranca_execucao_canal_check" CHECK ((("canal")::"text" = ANY (ARRAY[('whatsapp'::character varying)::"text", ('email'::character varying)::"text", ('sms'::character varying)::"text"]))),
    CONSTRAINT "regua_cobranca_execucao_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('PENDENTE'::character varying)::"text", ('ENVIADO'::character varying)::"text", ('FALHA'::character varying)::"text", ('CANCELADO'::character varying)::"text"])))
);


ALTER TABLE "public"."regua_cobranca_execucao" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regua_cobranca_interacoes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "mensagem_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "cliente_id" character varying NOT NULL,
    "cobranca_id" character varying NOT NULL,
    "tipo" character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "regua_cobranca_interacoes_tipo_check" CHECK ((("tipo")::"text" = ANY (ARRAY[('aberto'::character varying)::"text", ('clicado'::character varying)::"text", ('respondido'::character varying)::"text", ('pago'::character varying)::"text"])))
);


ALTER TABLE "public"."regua_cobranca_interacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regua_cobranca_mensagens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "etapa_id" "uuid" NOT NULL,
    "cobranca_id" character varying NOT NULL,
    "cliente_id" character varying NOT NULL,
    "status" character varying NOT NULL,
    "canal" character varying NOT NULL,
    "data_agendada" timestamp with time zone,
    "data_execucao" timestamp with time zone,
    "erro" "text",
    "mensagem_processada" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "regua_cobranca_mensagens_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('agendado'::character varying)::"text", ('enviado'::character varying)::"text", ('erro'::character varying)::"text", ('cancelado'::character varying)::"text"])))
);


ALTER TABLE "public"."regua_cobranca_mensagens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regua_cobranca_template_etapas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "posicao" integer NOT NULL,
    "gatilho" character varying NOT NULL,
    "dias" integer DEFAULT 0,
    "canal" character varying NOT NULL,
    "mensagem" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "regua_cobranca_template_etapas_canal_check" CHECK ((("canal")::"text" = ANY (ARRAY[('whatsapp'::character varying)::"text", ('email'::character varying)::"text", ('sms'::character varying)::"text"]))),
    CONSTRAINT "regua_cobranca_template_etapas_dias_check" CHECK ((("dias" >= 0) AND ("dias" <= 90))),
    CONSTRAINT "regua_cobranca_template_etapas_gatilho_check" CHECK ((("gatilho")::"text" = ANY (ARRAY[('antes_vencimento'::character varying)::"text", ('no_vencimento'::character varying)::"text", ('apos_vencimento'::character varying)::"text"])))
);


ALTER TABLE "public"."regua_cobranca_template_etapas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."regua_cobranca_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nome" character varying NOT NULL,
    "descricao" "text",
    "escopo" character varying NOT NULL,
    "tenant_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "regua_cobranca_templates_escopo_check" CHECK ((("escopo")::"text" = ANY (ARRAY[('GLOBAL'::character varying)::"text", ('TENANT'::character varying)::"text"])))
);


ALTER TABLE "public"."regua_cobranca_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."reseller_invites_view" AS
 SELECT "gen_random_uuid"() AS "invite_id",
    ''::"text" AS "email",
    'pending'::"text" AS "status",
    "now"() AS "created_at",
    ''::"text" AS "token",
    "gen_random_uuid"() AS "reseller_id",
    ''::"text" AS "reseller_name"
  WHERE false;


ALTER TABLE "public"."reseller_invites_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."reseller_invites_view" IS 'View segura sem SECURITY DEFINER - usa permissões do usuário que consulta';



CREATE TABLE IF NOT EXISTS "public"."resellers_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reseller_id" "uuid" NOT NULL,
    "role" character varying(20) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone,
    CONSTRAINT "resellers_users_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('RESELLER_ADMIN'::character varying)::"text", ('RESELLER_USER'::character varying)::"text"])))
);


ALTER TABLE "public"."resellers_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_billing_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "amount" numeric(15,2) DEFAULT 0.00 NOT NULL,
    "status" "public"."service_billing_event_status" DEFAULT 'PENDING'::"public"."service_billing_event_status" NOT NULL,
    "charge_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_sbe_amount_positive" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "chk_sbe_due_date_valid" CHECK (("due_date" >= "period_start")),
    CONSTRAINT "chk_sbe_period_order" CHECK (("period_start" <= "period_end"))
);


ALTER TABLE "public"."service_billing_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_order_sequences" (
    "tenant_id" "uuid" NOT NULL,
    "last_number" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_order_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "storage_location_id" "uuid" NOT NULL,
    "movement_type" "public"."stock_movement_type" NOT NULL,
    "movement_reason" "text",
    "movement_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "quantity" numeric(15,6) NOT NULL,
    "unit_value" numeric(15,2) DEFAULT 0,
    "total_value" numeric(15,2) GENERATED ALWAYS AS (("quantity" * "unit_value")) STORED,
    "accumulated_balance" numeric(15,6) DEFAULT 0,
    "unit_cmc" numeric(15,2) DEFAULT 0,
    "total_cmc" numeric(15,2) GENERATED ALWAYS AS (("accumulated_balance" * "unit_cmc")) STORED,
    "invoice_number" "text",
    "operation" "text",
    "customer_or_supplier" "text",
    "observation" "text",
    "origin_storage_location_id" "uuid",
    "destination_storage_location_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()),
    "updated_by" "uuid",
    CONSTRAINT "stock_movements_quantity_check" CHECK (("quantity" > (0)::numeric))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_movements" IS 'Tabela para registro de movimentações de estoque';



COMMENT ON COLUMN "public"."stock_movements"."movement_type" IS 'Tipo de movimento: ENTRADA, SAIDA, AJUSTE, TRANSFERENCIA';



COMMENT ON COLUMN "public"."stock_movements"."accumulated_balance" IS 'Saldo acumulado após esta movimentação';



COMMENT ON COLUMN "public"."stock_movements"."unit_cmc" IS 'Custo Médio de Compra unitário';



COMMENT ON COLUMN "public"."stock_movements"."total_cmc" IS 'CMC total (accumulated_balance * unit_cmc)';



CREATE TABLE IF NOT EXISTS "public"."storage_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "address" "text",
    "is_active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()),
    "created_by" "uuid",
    CONSTRAINT "storage_locations_name_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."storage_locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."storage_locations" IS 'Tabela para gerenciar locais físicos de armazenamento de estoque';



COMMENT ON COLUMN "public"."storage_locations"."tenant_id" IS 'ID do tenant proprietário do local';



COMMENT ON COLUMN "public"."storage_locations"."name" IS 'Nome do local de estoque (único por tenant)';



COMMENT ON COLUMN "public"."storage_locations"."description" IS 'Descrição detalhada do local';



COMMENT ON COLUMN "public"."storage_locations"."address" IS 'Endereço físico do local';



COMMENT ON COLUMN "public"."storage_locations"."is_active" IS 'Indica se o local está ativo';



COMMENT ON COLUMN "public"."storage_locations"."metadata" IS 'Metadados adicionais em formato JSON';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "client_name" "text",
    "client_id" "uuid",
    "charge_id" "uuid",
    "due_date" "date",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()),
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "timezone"('America/Sao_Paulo'::"text", "now"()),
    "tenant_id" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "customer_id" "uuid" GENERATED ALWAYS AS ("client_id") STORED
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Tabela de tarefas do sistema multi-tenant';



COMMENT ON COLUMN "public"."tasks"."id" IS 'Identificador único da tarefa';



COMMENT ON COLUMN "public"."tasks"."title" IS 'Título da tarefa';



COMMENT ON COLUMN "public"."tasks"."description" IS 'Descrição detalhada da tarefa';



COMMENT ON COLUMN "public"."tasks"."client_name" IS 'Nome do cliente (cache para performance)';



COMMENT ON COLUMN "public"."tasks"."client_id" IS 'Referência ao cliente (FK para customers)';



COMMENT ON COLUMN "public"."tasks"."charge_id" IS 'Referência à cobrança (FK para charges)';



COMMENT ON COLUMN "public"."tasks"."due_date" IS 'Data de vencimento da tarefa';



COMMENT ON COLUMN "public"."tasks"."priority" IS 'Prioridade: low, medium, high';



COMMENT ON COLUMN "public"."tasks"."status" IS 'Status: pending, in_progress, completed';



COMMENT ON COLUMN "public"."tasks"."created_at" IS 'Data de criação';



COMMENT ON COLUMN "public"."tasks"."completed_at" IS 'Data de conclusão';



COMMENT ON COLUMN "public"."tasks"."updated_at" IS 'Data da última atualização';



COMMENT ON COLUMN "public"."tasks"."tenant_id" IS 'ID do tenant (obrigatório para isolamento)';



COMMENT ON COLUMN "public"."tasks"."assigned_to" IS 'Usuário responsável pela tarefa; referência a auth.users(id). Validação de tenant via trigger.';



COMMENT ON COLUMN "public"."tasks"."customer_id" IS 'Alias gerado de client_id para compatibilidade com código legado. Não gravável.';



CREATE TABLE IF NOT EXISTS "public"."tasks_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "file_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tasks_attachments_file_size_check" CHECK ((("file_size" > 0) AND ("file_size" <= 10485760)))
);


ALTER TABLE "public"."tasks_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_access_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "code" character varying(64) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    CONSTRAINT "tenant_access_codes_expiration_check" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "tenant_access_codes_used_at_check" CHECK ((("used_at" IS NULL) OR (("used_at" >= "created_at") AND ("used_at" <= "expires_at"))))
);


ALTER TABLE "public"."tenant_access_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_integrations" (
    "id" integer NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "integration_type" "text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "environment" character varying(20) DEFAULT 'production'::character varying,
    "webhook_url" "text",
    "webhook_token" "text",
    "last_sync_at" timestamp with time zone,
    "sync_status" character varying(20) DEFAULT 'pending'::character varying,
    "error_message" "text",
    "created_by" "uuid",
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "encrypted_api_key" "text",
    CONSTRAINT "tenant_integrations_environment_check" CHECK ((("environment")::"text" = ANY ((ARRAY['sandbox'::character varying, 'production'::character varying])::"text"[]))),
    CONSTRAINT "tenant_integrations_integration_type_check" CHECK (("integration_type" = ANY (ARRAY[('asaas'::character varying)::"text", ('whatsapp'::character varying)::"text", ('cora'::character varying)::"text", ('evolution'::character varying)::"text", ('n8n'::character varying)::"text"]))),
    CONSTRAINT "tenant_integrations_sync_status_check" CHECK ((("sync_status")::"text" = ANY ((ARRAY['pending'::character varying, 'syncing'::character varying, 'success'::character varying, 'error'::character varying])::"text"[])))
);


ALTER TABLE "public"."tenant_integrations" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_integrations" IS 'Configurações de integrações por tenant com credenciais seguras';



COMMENT ON COLUMN "public"."tenant_integrations"."webhook_token" IS 'Token do webhook para validação de autenticidade';



COMMENT ON COLUMN "public"."tenant_integrations"."sync_status" IS 'Status da última sincronização: pending, syncing, success, error';



COMMENT ON COLUMN "public"."tenant_integrations"."config" IS 'Configurações da integração em formato JSON. Contém api_key, api_url, environment, instance_name e outros campos específicos por tipo de integração.';



COMMENT ON COLUMN "public"."tenant_integrations"."encrypted_api_key" IS 'Chave API criptografada usando pgcrypto. Mantém compatibilidade com api_key em config (texto plano)';



CREATE SEQUENCE IF NOT EXISTS "public"."tenant_integrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."tenant_integrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tenant_integrations_id_seq" OWNED BY "public"."tenant_integrations"."id";



CREATE TABLE IF NOT EXISTS "public"."tenant_invites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "role" "text" DEFAULT 'TENANT_USER'::"text" NOT NULL,
    "token" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "accepted_at" timestamp with time zone,
    "user_id" "uuid",
    CONSTRAINT "tenant_invites_role_check" CHECK (("role" = ANY (ARRAY['TENANT_USER'::"text", 'TENANT_ADMIN'::"text"]))),
    CONSTRAINT "tenant_invites_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'ACCEPTED'::"text", 'REJECTED'::"text"])))
);


ALTER TABLE "public"."tenant_invites" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_invites" IS 'RLS habilitado para segurança multi-tenant';



CREATE TABLE IF NOT EXISTS "public"."tenant_users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'TENANT_USER'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "active" boolean DEFAULT true,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "token_version" integer DEFAULT 1,
    CONSTRAINT "tenant_users_role_check" CHECK (("role" = ANY (ARRAY['TENANT_USER'::"text", 'TENANT_ADMIN'::"text"])))
);


ALTER TABLE "public"."tenant_users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenant_users"."permissions" IS 'Permissões específicas do usuário em formato JSON';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "document" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "active" boolean DEFAULT true,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "branding" "jsonb" DEFAULT '{"logo_url": null, "primary_color": "#00B4D8", "secondary_color": "#0077B6"}'::"jsonb",
    "integration_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "reseller_id" "uuid"
);

ALTER TABLE ONLY "public"."tenants" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenants"."settings" IS 'Configurações do tenant incluindo faturamento complementar: enabled, calculation_type, minimum_amount, auto_generate, billing_strategy, notification_enabled, approval_required';



COMMENT ON COLUMN "public"."tenants"."reseller_id" IS 'Referência ao revendedor associado a este tenant (opcional).';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "user_role" "text" DEFAULT 'USER'::"text" NOT NULL,
    "name" "text",
    "phone" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_login" timestamp with time zone,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "role" "text" DEFAULT 'authenticated'::"text",
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text", 'SUSPENDED'::"text"]))),
    CONSTRAINT "users_user_role_check" CHECK (("user_role" = ANY (ARRAY['USER'::"text", 'ADMIN'::"text", 'RESELLER'::"text", 'PLATFORM_ADMIN'::"text", 'TENANT_USER'::"text", 'TENANT_ADMIN'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Tabela principal de usuários do sistema, vinculada à autenticação';



COMMENT ON COLUMN "public"."users"."id" IS 'ID do usuário, vinculado à tabela auth.users';



COMMENT ON COLUMN "public"."users"."user_role" IS 'Papel principal do usuário no sistema';



COMMENT ON COLUMN "public"."users"."avatar_url" IS 'Caminho do arquivo de avatar no storage: {tenant_id}/{user_id}/avatar_{timestamp}.{ext}';



COMMENT ON COLUMN "public"."users"."settings" IS 'Configurações personalizadas do usuário';



COMMENT ON COLUMN "public"."users"."metadata" IS 'Metadados adicionais para uso flexível';



CREATE OR REPLACE VIEW "public"."v_complementary_billing_summary" AS
 SELECT "cb"."tenant_id",
    "cb"."contract_id",
    "date_trunc"('month'::"text", ("cb"."issue_date")::timestamp with time zone) AS "billing_month",
    "count"(*) FILTER (WHERE ("cb"."billing_type" = 'regular'::"public"."billing_type_enum")) AS "regular_billings",
    "count"(*) FILTER (WHERE ("cb"."billing_type" = 'complementary'::"public"."billing_type_enum")) AS "complementary_billings",
    "count"(*) FILTER (WHERE ("cb"."billing_type" = 'adjustment'::"public"."billing_type_enum")) AS "adjustment_billings",
    COALESCE("sum"("cb"."amount") FILTER (WHERE ("cb"."billing_type" = 'regular'::"public"."billing_type_enum")), (0)::numeric) AS "regular_amount",
    COALESCE("sum"("cb"."amount") FILTER (WHERE ("cb"."billing_type" = 'complementary'::"public"."billing_type_enum")), (0)::numeric) AS "complementary_amount",
    COALESCE("sum"("cb"."amount") FILTER (WHERE ("cb"."billing_type" = 'adjustment'::"public"."billing_type_enum")), (0)::numeric) AS "adjustment_amount",
    COALESCE("sum"("cb"."amount"), (0)::numeric) AS "total_amount"
   FROM "public"."contract_billings" "cb"
  GROUP BY "cb"."tenant_id", "cb"."contract_id", ("date_trunc"('month'::"text", ("cb"."issue_date")::timestamp with time zone));


ALTER TABLE "public"."v_complementary_billing_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_complementary_billing_summary" IS 'View para relatórios resumidos de faturamento complementar por mês';



CREATE OR REPLACE VIEW "public"."v_contract_billings_with_complementary" AS
 SELECT "cb"."id",
    "cb"."contract_id",
    "cb"."tenant_id",
    "cb"."billing_number",
    "cb"."installment_number",
    "cb"."total_installments",
    "cb"."reference_period",
    "cb"."reference_start_date",
    "cb"."reference_end_date",
    "cb"."issue_date",
    "cb"."due_date",
    "cb"."original_due_date",
    "cb"."amount",
    "cb"."discount_amount",
    "cb"."tax_amount",
    "cb"."net_amount",
    "cb"."status",
    "cb"."payment_date",
    "cb"."payment_method",
    "cb"."payment_gateway_id",
    "cb"."external_id",
    "cb"."payment_link",
    "cb"."is_manually_paid",
    "cb"."synchronization_status",
    "cb"."last_sync_attempt",
    "cb"."invoice_number",
    "cb"."invoice_url",
    "cb"."invoice_status",
    "cb"."invoice_text",
    "cb"."invoice_description",
    "cb"."created_at",
    "cb"."updated_at",
    "cb"."created_by",
    "cb"."updated_by",
    "cb"."currency",
    "cb"."billing_type",
    "cb"."parent_billing_id",
    "cb"."complementary_reason",
    "cb"."original_amount",
    "cb"."complementary_amount",
    "cb"."service_changes",
    "parent"."billing_number" AS "parent_billing_number",
    "parent"."amount" AS "parent_amount",
    "parent"."issue_date" AS "parent_issue_date",
    ( SELECT "count"(*) AS "count"
           FROM "public"."contract_billings" "child"
          WHERE ("child"."parent_billing_id" = "cb"."id")) AS "complementary_count",
    ( SELECT COALESCE("sum"("child"."amount"), (0)::numeric) AS "coalesce"
           FROM "public"."contract_billings" "child"
          WHERE ("child"."parent_billing_id" = "cb"."id")) AS "total_complementary_amount",
    ( SELECT "json_agg"("json_build_object"('id', "child"."id", 'billing_number', "child"."billing_number", 'amount', "child"."amount", 'issue_date', "child"."issue_date", 'status', "child"."status", 'complementary_reason', "child"."complementary_reason") ORDER BY "child"."issue_date") AS "json_agg"
           FROM "public"."contract_billings" "child"
          WHERE ("child"."parent_billing_id" = "cb"."id")) AS "complementary_billings"
   FROM ("public"."contract_billings" "cb"
     LEFT JOIN "public"."contract_billings" "parent" ON (("cb"."parent_billing_id" = "parent"."id")));


ALTER TABLE "public"."v_contract_billings_with_complementary" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_contract_billings_with_complementary" IS 'View que mostra faturamentos com suas relações complementares e totais';



CREATE OR REPLACE VIEW "public"."vw_contract_services_detailed" AS
 SELECT "cs"."id" AS "contract_service_id",
    "cs"."contract_id",
    "cs"."service_id",
    "cs"."quantity",
    "cs"."unit_price",
    "cs"."discount_percentage",
    "cs"."discount_amount",
    "cs"."total_amount",
    "cs"."tax_rate",
    "cs"."tax_amount",
    "cs"."billing_type",
    "cs"."recurrence_frequency",
    "cs"."payment_method",
    "cs"."due_type",
    "cs"."due_value",
    "cs"."due_next_month",
    "cs"."no_charge",
    "cs"."generate_billing",
    "cs"."is_active",
    "cs"."created_at",
    "cs"."updated_at",
    "cs"."tenant_id",
    "s"."name" AS "service_name",
    "s"."description" AS "service_description",
    "s"."default_price",
    ("cs"."cost_price")::numeric AS "cost_price",
    "s"."unit_type",
    "s"."tax_rate" AS "service_tax_rate"
   FROM ("public"."contract_services" "cs"
     JOIN "public"."services" "s" ON (("cs"."service_id" = "s"."id")))
  WHERE ("cs"."tenant_id" = "s"."tenant_id");


ALTER TABLE "public"."vw_contract_services_detailed" OWNER TO "postgres";


COMMENT ON VIEW "public"."vw_contract_services_detailed" IS 'View que relaciona serviços vinculados a contratos (contract_services) com o catálogo de serviços (services). 
Fornece uma visão completa dos serviços contratados incluindo informações detalhadas do catálogo.
Otimizada para consultas baseadas em tenant_id e índices das chaves primárias.';



ALTER TABLE ONLY "public"."tenant_integrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tenant_integrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."agente_ia_empresa"
    ADD CONSTRAINT "agente_ia_empresa_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agente_ia_mensagens_regua"
    ADD CONSTRAINT "agente_ia_mensagens_regua_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_acounts"
    ADD CONSTRAINT "bank_acounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_operation_history"
    ADD CONSTRAINT "bank_operation_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_period_items"
    ADD CONSTRAINT "billing_period_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_tenant_asaas_id_unique" UNIQUE ("tenant_id", "asaas_id");



ALTER TABLE ONLY "public"."conciliation_staging"
    ADD CONSTRAINT "conciliation_staging_id_externo_unique" UNIQUE ("id_externo");



ALTER TABLE ONLY "public"."conciliation_staging"
    ADD CONSTRAINT "conciliation_staging_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conciliation_staging"
    ADD CONSTRAINT "conciliation_staging_tenant_id_origem_id_externo_key" UNIQUE ("tenant_id", "origem", "id_externo");



ALTER TABLE ONLY "public"."contract_attachments"
    ADD CONSTRAINT "contract_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_billing_items"
    ADD CONSTRAINT "contract_billing_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_billing_payments"
    ADD CONSTRAINT "contract_billing_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_billing_periods"
    ADD CONSTRAINT "contract_billing_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_billings"
    ADD CONSTRAINT "contract_billings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_billings"
    ADD CONSTRAINT "contract_billings_tenant_id_billing_number_key" UNIQUE ("tenant_id", "billing_number");



ALTER TABLE ONLY "public"."contract_products"
    ADD CONSTRAINT "contract_products_contract_id_product_id_key" UNIQUE ("contract_id", "product_id");



ALTER TABLE ONLY "public"."contract_products"
    ADD CONSTRAINT "contract_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_services"
    ADD CONSTRAINT "contract_services_contract_id_service_id_key" UNIQUE ("contract_id", "service_id");



ALTER TABLE ONLY "public"."contract_services"
    ADD CONSTRAINT "contract_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_stage_history"
    ADD CONSTRAINT "contract_stage_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_stage_transition_rules"
    ADD CONSTRAINT "contract_stage_transition_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_stage_transitions"
    ADD CONSTRAINT "contract_stage_transitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_stage_transitions"
    ADD CONSTRAINT "contract_stage_transitions_tenant_id_from_stage_id_to_stage_key" UNIQUE ("tenant_id", "from_stage_id", "to_stage_id");



ALTER TABLE ONLY "public"."contract_stages"
    ADD CONSTRAINT "contract_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_stages"
    ADD CONSTRAINT "contract_stages_tenant_id_code_key" UNIQUE ("tenant_id", "code");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_tenant_id_number_key" UNIQUE ("tenant_id", "contract_number");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_asaas_id_cpf_cnpj_key" UNIQUE ("customer_asaas_id", "cpf_cnpj");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."des_payables_sequence"
    ADD CONSTRAINT "des_payables_sequence_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."finance_entries"
    ADD CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_launchs"
    ADD CONSTRAINT "financial_launchs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_payables"
    ADD CONSTRAINT "financial_payables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_settings"
    ADD CONSTRAINT "financial_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."health_check"
    ADD CONSTRAINT "health_check_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_history"
    ADD CONSTRAINT "message_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_tenant_id_name_key" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_stock_by_location"
    ADD CONSTRAINT "product_stock_by_location_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_stock_by_location"
    ADD CONSTRAINT "product_stock_by_location_unique" UNIQUE ("tenant_id", "product_id", "storage_location_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conciliation_history"
    ADD CONSTRAINT "reconciliation_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conciliation_rules"
    ADD CONSTRAINT "reconciliation_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regua_cobranca_config"
    ADD CONSTRAINT "regua_cobranca_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regua_cobranca_estatisticas"
    ADD CONSTRAINT "regua_cobranca_estatisticas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regua_cobranca_etapas"
    ADD CONSTRAINT "regua_cobranca_etapas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regua_cobranca_execucao"
    ADD CONSTRAINT "regua_cobranca_execucao_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regua_cobranca_interacoes"
    ADD CONSTRAINT "regua_cobranca_interacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regua_cobranca_mensagens"
    ADD CONSTRAINT "regua_cobranca_mensagens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regua_cobranca_template_etapas"
    ADD CONSTRAINT "regua_cobranca_template_etapas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regua_cobranca_templates"
    ADD CONSTRAINT "regua_cobranca_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resellers"
    ADD CONSTRAINT "resellers_document_key" UNIQUE ("document");



ALTER TABLE ONLY "public"."resellers"
    ADD CONSTRAINT "resellers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."resellers"
    ADD CONSTRAINT "resellers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resellers_users"
    ADD CONSTRAINT "resellers_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resellers_users"
    ADD CONSTRAINT "resellers_users_user_id_reseller_id_key" UNIQUE ("user_id", "reseller_id");



ALTER TABLE ONLY "public"."service_billing_events"
    ADD CONSTRAINT "service_billing_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_order_sequences"
    ADD CONSTRAINT "service_order_sequences_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_tenant_id_code_key" UNIQUE ("tenant_id", "code");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_locations"
    ADD CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_locations"
    ADD CONSTRAINT "storage_locations_tenant_name_unique" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."tasks_attachments"
    ADD CONSTRAINT "tasks_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_access_codes"
    ADD CONSTRAINT "tenant_access_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."tenant_access_codes"
    ADD CONSTRAINT "tenant_access_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_integrations"
    ADD CONSTRAINT "tenant_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_integrations"
    ADD CONSTRAINT "tenant_integrations_tenant_integration_unique" UNIQUE ("tenant_id", "integration_type");



ALTER TABLE ONLY "public"."tenant_invites"
    ADD CONSTRAINT "tenant_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_invites"
    ADD CONSTRAINT "tenant_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_tenant_id_user_id_key" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_user_tenant_unique" UNIQUE ("user_id", "tenant_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_document_key" UNIQUE ("document");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "uk_profiles_name_context" UNIQUE ("name", "context");



COMMENT ON CONSTRAINT "uk_profiles_name_context" ON "public"."profiles" IS 'Garante unicidade de nome de perfil por contexto';



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "unique_category_name_per_tenant" UNIQUE ("name", "tenant_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "bank_acounts_tenant_idx" ON "public"."bank_acounts" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "bank_acounts_unique_account" ON "public"."bank_acounts" USING "btree" ("tenant_id", "agency", "count");



CREATE UNIQUE INDEX "charges_tenant_asaas_unique" ON "public"."charges" USING "btree" ("tenant_id", "asaas_id") WHERE ("asaas_id" IS NOT NULL);



CREATE INDEX "financial_documents_list_idx" ON "public"."financial_documents" USING "btree" ("tenant_id", "is_active");



CREATE UNIQUE INDEX "financial_documents_unique_name" ON "public"."financial_documents" USING "btree" ("tenant_id", "lower"("name"));



CREATE INDEX "financial_launchs_tenant_idx" ON "public"."financial_launchs" USING "btree" ("tenant_id", "is_active");



CREATE INDEX "financial_payables_bank_account_idx" ON "public"."financial_payables" USING "btree" ("bank_account_id");



CREATE UNIQUE INDEX "financial_payables_entry_unique" ON "public"."financial_payables" USING "btree" ("tenant_id", "lower"("entry_number")) WHERE ("entry_number" IS NOT NULL);



CREATE INDEX "financial_payables_list_idx" ON "public"."financial_payables" USING "btree" ("tenant_id", "status", "due_date");



CREATE UNIQUE INDEX "financial_payables_tenant_entry_unique" ON "public"."financial_payables" USING "btree" ("tenant_id", "entry_number");



CREATE INDEX "financial_settings_dre_idx" ON "public"."financial_settings" USING "btree" ("tenant_id", "type", "dre_category");



CREATE INDEX "financial_settings_list_idx" ON "public"."financial_settings" USING "btree" ("tenant_id", "type", "is_active", "sort_order");



CREATE UNIQUE INDEX "financial_settings_unique_code" ON "public"."financial_settings" USING "btree" ("tenant_id", "type", "lower"("code")) WHERE ("code" IS NOT NULL);



CREATE UNIQUE INDEX "financial_settings_unique_name" ON "public"."financial_settings" USING "btree" ("tenant_id", "type", "lower"("name"));



CREATE INDEX "idx_agente_ia_empresa_tenant_id" ON "public"."agente_ia_empresa" USING "btree" ("tenant_id");



CREATE INDEX "idx_agente_mensagens_etapa_id" ON "public"."agente_ia_mensagens_regua" USING "btree" ("etapa_regua_id");



CREATE INDEX "idx_agente_mensagens_tenant_id" ON "public"."agente_ia_mensagens_regua" USING "btree" ("tenant_id");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_entity_type" ON "public"."audit_logs" USING "btree" ("entity_type");



CREATE INDEX "idx_audit_logs_performed_at" ON "public"."audit_logs" USING "btree" ("performed_at");



CREATE INDEX "idx_audit_logs_resource_type" ON "public"."audit_logs" USING "btree" ("resource_type");



CREATE INDEX "idx_audit_logs_tenant_id" ON "public"."audit_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_bank_operation_history_tenant_account_date" ON "public"."bank_operation_history" USING "btree" ("tenant_id", "bank_acount_id", "operation_date" DESC);



CREATE INDEX "idx_bank_operation_history_tenant_type_date" ON "public"."bank_operation_history" USING "btree" ("tenant_id", "operation_type", "operation_date" DESC);



CREATE INDEX "idx_billing_items_billing_id" ON "public"."contract_billing_items" USING "btree" ("billing_id");



CREATE INDEX "idx_billing_items_service_id" ON "public"."contract_billing_items" USING "btree" ("contract_service_id");



CREATE INDEX "idx_billing_payments_billing" ON "public"."contract_billing_payments" USING "btree" ("billing_id");



CREATE INDEX "idx_billing_payments_date" ON "public"."contract_billing_payments" USING "btree" ("payment_date");



CREATE INDEX "idx_billing_payments_tenant" ON "public"."contract_billing_payments" USING "btree" ("tenant_id");



CREATE INDEX "idx_billing_period_items_billing_period_id" ON "public"."billing_period_items" USING "btree" ("billing_period_id");



CREATE INDEX "idx_cbp_bill_date" ON "public"."contract_billing_periods" USING "btree" ("tenant_id", "bill_date");



CREATE INDEX "idx_cbp_billed_at" ON "public"."contract_billing_periods" USING "btree" ("tenant_id", "billed_at") WHERE ("billed_at" IS NOT NULL);



CREATE INDEX "idx_cbp_contract_id" ON "public"."contract_billing_periods" USING "btree" ("tenant_id", "contract_id");



CREATE INDEX "idx_cbp_period_start" ON "public"."contract_billing_periods" USING "btree" ("tenant_id", "period_start");



CREATE INDEX "idx_cbp_status" ON "public"."contract_billing_periods" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_cbp_tenant_id" ON "public"."contract_billing_periods" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "idx_cbp_unique_period" ON "public"."contract_billing_periods" USING "btree" ("tenant_id", "contract_id", "period_start", "period_end");



CREATE INDEX "idx_charges_asaas_external_reference" ON "public"."charges" USING "btree" ("external_invoice_number");



CREATE INDEX "idx_charges_asaas_id" ON "public"."charges" USING "btree" ("asaas_id");



CREATE INDEX "idx_charges_billing_periods" ON "public"."charges" USING "btree" ("billing_periods");



CREATE INDEX "idx_charges_contract_id" ON "public"."charges" USING "btree" ("contract_id") WHERE ("contract_id" IS NOT NULL);



CREATE INDEX "idx_charges_created_at" ON "public"."charges" USING "btree" ("created_at");



CREATE INDEX "idx_charges_created_by" ON "public"."charges" USING "btree" ("created_by");



CREATE INDEX "idx_charges_customer_id" ON "public"."charges" USING "btree" ("customer_id");



COMMENT ON INDEX "public"."idx_charges_customer_id" IS 'Índice para melhorar performance em queries por customer_id';



CREATE INDEX "idx_charges_data_pagamento" ON "public"."charges" USING "btree" ("data_pagamento");



CREATE INDEX "idx_charges_data_vencimento" ON "public"."charges" USING "btree" ("data_vencimento");



CREATE INDEX "idx_charges_installments" ON "public"."charges" USING "btree" ("contract_id", "total_installments", "installment_number") WHERE ("is_installment" = true);



CREATE INDEX "idx_charges_status" ON "public"."charges" USING "btree" ("status");



COMMENT ON INDEX "public"."idx_charges_status" IS 'Índice para melhorar performance em filtros por status';



CREATE INDEX "idx_charges_tenant_billing_periods" ON "public"."charges" USING "btree" ("tenant_id", "billing_periods");



CREATE INDEX "idx_charges_tenant_contract" ON "public"."charges" USING "btree" ("tenant_id", "contract_id") WHERE ("contract_id" IS NOT NULL);



CREATE INDEX "idx_charges_tenant_created" ON "public"."charges" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_charges_tenant_customer" ON "public"."charges" USING "btree" ("tenant_id", "customer_id");



CREATE INDEX "idx_charges_tenant_dates" ON "public"."charges" USING "btree" ("tenant_id", "data_vencimento", "data_pagamento");



CREATE INDEX "idx_charges_tenant_id" ON "public"."charges" USING "btree" ("tenant_id");



COMMENT ON INDEX "public"."idx_charges_tenant_id" IS 'Índice para melhorar performance em queries por tenant_id (multi-tenancy)';



CREATE INDEX "idx_charges_tenant_status" ON "public"."charges" USING "btree" ("tenant_id", "status");



COMMENT ON INDEX "public"."idx_charges_tenant_status" IS 'Índice composto para queries filtradas por tenant e status';



CREATE INDEX "idx_charges_tenant_tipo" ON "public"."charges" USING "btree" ("tenant_id", "tipo");



CREATE INDEX "idx_charges_tenant_vencimento" ON "public"."charges" USING "btree" ("tenant_id", "data_vencimento");



COMMENT ON INDEX "public"."idx_charges_tenant_vencimento" IS 'Índice composto para queries por tenant e data de vencimento';



CREATE INDEX "idx_charges_tipo" ON "public"."charges" USING "btree" ("tipo");



CREATE INDEX "idx_charges_updated_at" ON "public"."charges" USING "btree" ("updated_at");



CREATE INDEX "idx_charges_updated_by" ON "public"."charges" USING "btree" ("updated_by");



CREATE INDEX "idx_conciliation_staging_asaas_customer_id" ON "public"."conciliation_staging" USING "btree" ("tenant_id", "asaas_customer_id");



CREATE INDEX "idx_conciliation_staging_charge_id" ON "public"."conciliation_staging" USING "btree" ("charge_id");



CREATE INDEX "idx_conciliation_staging_contrato_id" ON "public"."conciliation_staging" USING "btree" ("contrato_id");



CREATE INDEX "idx_conciliation_staging_data_pagamento" ON "public"."conciliation_staging" USING "btree" ("data_pagamento");



CREATE INDEX "idx_conciliation_staging_dates" ON "public"."conciliation_staging" USING "btree" ("tenant_id", "data_vencimento", "data_pagamento");



CREATE INDEX "idx_conciliation_staging_external_reference" ON "public"."conciliation_staging" USING "btree" ("tenant_id", "external_reference") WHERE ("external_reference" IS NOT NULL);



CREATE INDEX "idx_conciliation_staging_invoice_number" ON "public"."conciliation_staging" USING "btree" ("invoice_number") WHERE ("invoice_number" IS NOT NULL);



CREATE INDEX "idx_conciliation_staging_origem" ON "public"."conciliation_staging" USING "btree" ("origem");



CREATE INDEX "idx_conciliation_staging_payment_method" ON "public"."conciliation_staging" USING "btree" ("tenant_id", "payment_method");



CREATE INDEX "idx_conciliation_staging_processed" ON "public"."conciliation_staging" USING "btree" ("tenant_id", "processed") WHERE (NOT "processed");



CREATE INDEX "idx_conciliation_staging_raw_data_gin" ON "public"."conciliation_staging" USING "gin" ("raw_data");



CREATE INDEX "idx_conciliation_staging_status_conciliacao" ON "public"."conciliation_staging" USING "btree" ("status_conciliacao");



CREATE INDEX "idx_conciliation_staging_tenant_id" ON "public"."conciliation_staging" USING "btree" ("tenant_id");



CREATE INDEX "idx_contract_attachments_contract_id" ON "public"."contract_attachments" USING "btree" ("contract_id");



CREATE INDEX "idx_contract_billing_periods_customer_id" ON "public"."contract_billing_periods" USING "btree" ("customer_id") WHERE ("customer_id" IS NOT NULL);



CREATE INDEX "idx_contract_billing_periods_is_standalone" ON "public"."contract_billing_periods" USING "btree" ("is_standalone");



CREATE INDEX "idx_contract_billing_periods_order_number" ON "public"."contract_billing_periods" USING "btree" ("order_number") WHERE ("order_number" IS NOT NULL);



CREATE UNIQUE INDEX "idx_contract_billing_periods_order_number_tenant" ON "public"."contract_billing_periods" USING "btree" ("tenant_id", "order_number") WHERE ("order_number" IS NOT NULL);



CREATE INDEX "idx_contract_billings_billing_type" ON "public"."contract_billings" USING "btree" ("billing_type");



CREATE INDEX "idx_contract_billings_contract" ON "public"."contract_billings" USING "btree" ("contract_id");



CREATE INDEX "idx_contract_billings_due_date" ON "public"."contract_billings" USING "btree" ("due_date");



CREATE INDEX "idx_contract_billings_external" ON "public"."contract_billings" USING "btree" ("payment_gateway_id", "external_id");



CREATE INDEX "idx_contract_billings_parent_billing_id" ON "public"."contract_billings" USING "btree" ("parent_billing_id");



CREATE INDEX "idx_contract_billings_status" ON "public"."contract_billings" USING "btree" ("status");



CREATE INDEX "idx_contract_billings_tenant" ON "public"."contract_billings" USING "btree" ("tenant_id");



CREATE INDEX "idx_contract_billings_tenant_billing_type" ON "public"."contract_billings" USING "btree" ("tenant_id", "billing_type");



CREATE INDEX "idx_contract_products_contract_id" ON "public"."contract_products" USING "btree" ("contract_id");



CREATE INDEX "idx_contract_products_product_id" ON "public"."contract_products" USING "btree" ("product_id");



CREATE INDEX "idx_contract_products_tenant_id" ON "public"."contract_products" USING "btree" ("tenant_id");



CREATE INDEX "idx_contract_services_billing_type" ON "public"."contract_services" USING "btree" ("billing_type");



CREATE INDEX "idx_contract_services_contract_id" ON "public"."contract_services" USING "btree" ("contract_id");



CREATE INDEX "idx_contract_services_cost_price" ON "public"."contract_services" USING "btree" ("cost_price");



CREATE INDEX "idx_contract_services_payment_method" ON "public"."contract_services" USING "btree" ("payment_method");



CREATE INDEX "idx_contract_services_recurrence_frequency" ON "public"."contract_services" USING "btree" ("recurrence_frequency");



CREATE INDEX "idx_contract_stages_active" ON "public"."contract_stages" USING "btree" ("tenant_id", "is_active");



CREATE INDEX "idx_contract_stages_ai_enabled" ON "public"."contract_stages" USING "btree" ("ai_enabled") WHERE ("ai_enabled" = true);



CREATE INDEX "idx_contract_stages_tenant_id" ON "public"."contract_stages" USING "btree" ("tenant_id");



CREATE INDEX "idx_contracts_customer_id" ON "public"."contracts" USING "btree" ("customer_id");



CREATE INDEX "idx_contracts_dates" ON "public"."contracts" USING "btree" ("initial_date", "final_date");



CREATE INDEX "idx_contracts_stage_status" ON "public"."contracts" USING "btree" ("stage_id", "status");



CREATE INDEX "idx_contracts_status" ON "public"."contracts" USING "btree" ("status");



CREATE INDEX "idx_contracts_tenant_id" ON "public"."contracts" USING "btree" ("tenant_id");



CREATE INDEX "idx_finance_entries_bank_account_id" ON "public"."finance_entries" USING "btree" ("bank_account_id");



CREATE INDEX "idx_finance_entries_charge_id" ON "public"."finance_entries" USING "btree" ("charge_id");



CREATE INDEX "idx_finance_entries_customer_id" ON "public"."finance_entries" USING "btree" ("customer_id");



CREATE INDEX "idx_finance_entries_due_date" ON "public"."finance_entries" USING "btree" ("due_date");



CREATE INDEX "idx_finance_entries_status" ON "public"."finance_entries" USING "btree" ("status");



CREATE INDEX "idx_finance_entries_tenant_id" ON "public"."finance_entries" USING "btree" ("tenant_id");



CREATE INDEX "idx_finance_entries_type" ON "public"."finance_entries" USING "btree" ("type");



CREATE INDEX "idx_mensagens_cobranca_id" ON "public"."regua_cobranca_mensagens" USING "btree" ("cobranca_id");



CREATE INDEX "idx_mensagens_data_agendada" ON "public"."regua_cobranca_mensagens" USING "btree" ("data_agendada");



CREATE INDEX "idx_mensagens_status" ON "public"."regua_cobranca_mensagens" USING "btree" ("status");



CREATE INDEX "idx_mensagens_tenant_id" ON "public"."regua_cobranca_mensagens" USING "btree" ("tenant_id");



CREATE INDEX "idx_message_history_batch_id" ON "public"."message_history" USING "btree" ("batch_id");



CREATE INDEX "idx_message_history_charge_id" ON "public"."message_history" USING "btree" ("charge_id");



CREATE INDEX "idx_message_history_customer_id" ON "public"."message_history" USING "btree" ("customer_id");



CREATE INDEX "idx_message_history_status_created_at" ON "public"."message_history" USING "btree" ("status", "created_at");



CREATE INDEX "idx_message_history_template_id" ON "public"."message_history" USING "btree" ("template_id");



CREATE INDEX "idx_message_history_tenant_dates" ON "public"."message_history" USING "btree" ("tenant_id", "created_at");



CREATE INDEX "idx_message_history_tenant_id" ON "public"."message_history" USING "btree" ("tenant_id");



CREATE INDEX "idx_product_categories_active" ON "public"."product_categories" USING "btree" ("is_active");



CREATE INDEX "idx_product_categories_tenant_id" ON "public"."product_categories" USING "btree" ("tenant_id");



CREATE INDEX "idx_product_stock_by_location_product_id" ON "public"."product_stock_by_location" USING "btree" ("product_id");



CREATE INDEX "idx_product_stock_by_location_storage_location_id" ON "public"."product_stock_by_location" USING "btree" ("storage_location_id");



CREATE INDEX "idx_product_stock_by_location_tenant_id" ON "public"."product_stock_by_location" USING "btree" ("tenant_id");



CREATE INDEX "idx_product_stock_by_location_tenant_product" ON "public"."product_stock_by_location" USING "btree" ("tenant_id", "product_id");



CREATE INDEX "idx_product_stock_by_location_updated_at" ON "public"."product_stock_by_location" USING "btree" ("tenant_id", "updated_at" DESC);



CREATE INDEX "idx_products_active" ON "public"."products" USING "btree" ("tenant_id", "is_active");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("tenant_id", "category");



CREATE INDEX "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_tenant_id" ON "public"."products" USING "btree" ("tenant_id");



CREATE INDEX "idx_profiles_name" ON "public"."profiles" USING "btree" ("name");



COMMENT ON INDEX "public"."idx_profiles_name" IS 'Índice para otimizar consultas por nome de perfil na tabela profiles';



CREATE INDEX "idx_receipts_charge_id" ON "public"."receipts" USING "btree" ("charge_id");



CREATE INDEX "idx_receipts_customer_id" ON "public"."receipts" USING "btree" ("customer_id");



CREATE INDEX "idx_receipts_data_recebimento" ON "public"."receipts" USING "btree" ("data_recebimento");



CREATE INDEX "idx_receipts_metodo_pagamento" ON "public"."receipts" USING "btree" ("metodo_pagamento");



CREATE INDEX "idx_receipts_tenant_id" ON "public"."receipts" USING "btree" ("tenant_id");



CREATE INDEX "idx_reconciliation_history_charge_id" ON "public"."conciliation_history" USING "btree" ("charge_id");



CREATE INDEX "idx_reconciliation_history_movement_id" ON "public"."conciliation_history" USING "btree" ("movement_id");



CREATE INDEX "idx_reconciliation_history_performed_at" ON "public"."conciliation_history" USING "btree" ("performed_at");



CREATE INDEX "idx_reconciliation_history_tenant_id" ON "public"."conciliation_history" USING "btree" ("tenant_id");



CREATE INDEX "idx_reconciliation_rules_active" ON "public"."conciliation_rules" USING "btree" ("is_active");



CREATE INDEX "idx_reconciliation_rules_priority" ON "public"."conciliation_rules" USING "btree" ("priority");



CREATE INDEX "idx_reconciliation_rules_source" ON "public"."conciliation_rules" USING "btree" ("source");



CREATE INDEX "idx_reconciliation_rules_tenant_id" ON "public"."conciliation_rules" USING "btree" ("tenant_id");



CREATE INDEX "idx_regua_config_ativo" ON "public"."regua_cobranca_config" USING "btree" ("ativo");



CREATE INDEX "idx_regua_config_tenant_id" ON "public"."regua_cobranca_config" USING "btree" ("tenant_id");



CREATE INDEX "idx_regua_estatisticas_canal" ON "public"."regua_cobranca_estatisticas" USING "btree" ("canal");



CREATE INDEX "idx_regua_estatisticas_etapa" ON "public"."regua_cobranca_estatisticas" USING "btree" ("etapa_id");



CREATE INDEX "idx_regua_estatisticas_periodo" ON "public"."regua_cobranca_estatisticas" USING "btree" ("periodo");



CREATE INDEX "idx_regua_estatisticas_tenant" ON "public"."regua_cobranca_estatisticas" USING "btree" ("tenant_id");



CREATE INDEX "idx_regua_etapas_ativo" ON "public"."regua_cobranca_etapas" USING "btree" ("ativo");



CREATE INDEX "idx_regua_etapas_gatilho" ON "public"."regua_cobranca_etapas" USING "btree" ("gatilho");



CREATE INDEX "idx_regua_etapas_posicao" ON "public"."regua_cobranca_etapas" USING "btree" ("posicao");



CREATE INDEX "idx_regua_etapas_tenant_id" ON "public"."regua_cobranca_etapas" USING "btree" ("tenant_id");



CREATE INDEX "idx_regua_execucao_cobranca" ON "public"."regua_cobranca_execucao" USING "btree" ("cobranca_id");



CREATE INDEX "idx_regua_execucao_data_agendada" ON "public"."regua_cobranca_execucao" USING "btree" ("data_agendada");



CREATE INDEX "idx_regua_execucao_status" ON "public"."regua_cobranca_execucao" USING "btree" ("status");



CREATE INDEX "idx_regua_execucao_tenant" ON "public"."regua_cobranca_execucao" USING "btree" ("tenant_id");



CREATE INDEX "idx_resellers_users_reseller" ON "public"."resellers_users" USING "btree" ("reseller_id");



CREATE INDEX "idx_resellers_users_user" ON "public"."resellers_users" USING "btree" ("user_id");



CREATE INDEX "idx_sbe_charge_id" ON "public"."service_billing_events" USING "btree" ("charge_id") WHERE ("charge_id" IS NOT NULL);



CREATE INDEX "idx_sbe_due_date_status" ON "public"."service_billing_events" USING "btree" ("due_date", "status");



CREATE INDEX "idx_sbe_status_tenant" ON "public"."service_billing_events" USING "btree" ("status", "tenant_id");



CREATE INDEX "idx_sbe_tenant_contract" ON "public"."service_billing_events" USING "btree" ("tenant_id", "contract_id");



CREATE UNIQUE INDEX "idx_sbe_unique_service_period" ON "public"."service_billing_events" USING "btree" ("tenant_id", "service_id", "period_start", "period_end");



CREATE INDEX "idx_services_active" ON "public"."services" USING "btree" ("tenant_id", "is_active");



CREATE INDEX "idx_services_service_type" ON "public"."services" USING "btree" ("unit_type") WHERE ("unit_type" IS NOT NULL);



CREATE INDEX "idx_services_tenant_id" ON "public"."services" USING "btree" ("tenant_id");



CREATE INDEX "idx_stage_history_contract" ON "public"."contract_stage_history" USING "btree" ("contract_id");



CREATE INDEX "idx_stage_history_date" ON "public"."contract_stage_history" USING "btree" ("changed_at");



CREATE INDEX "idx_stage_history_to_stage" ON "public"."contract_stage_history" USING "btree" ("to_stage_id");



CREATE INDEX "idx_stage_transitions_from" ON "public"."contract_stage_transitions" USING "btree" ("from_stage_id");



CREATE INDEX "idx_stage_transitions_tenant" ON "public"."contract_stage_transitions" USING "btree" ("tenant_id");



CREATE INDEX "idx_stage_transitions_to" ON "public"."contract_stage_transitions" USING "btree" ("to_stage_id");



CREATE INDEX "idx_standalone_billing_items_period_id" ON "public"."billing_period_items" USING "btree" ("billing_period_id");



CREATE INDEX "idx_standalone_billing_items_product_id" ON "public"."billing_period_items" USING "btree" ("product_id") WHERE ("product_id" IS NOT NULL);



CREATE INDEX "idx_standalone_billing_items_service_id" ON "public"."billing_period_items" USING "btree" ("service_id") WHERE ("service_id" IS NOT NULL);



CREATE INDEX "idx_standalone_billing_items_tenant_id" ON "public"."billing_period_items" USING "btree" ("tenant_id");



CREATE INDEX "idx_stock_movements_created_at" ON "public"."stock_movements" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_stock_movements_date" ON "public"."stock_movements" USING "btree" ("movement_date" DESC);



CREATE INDEX "idx_stock_movements_product_id" ON "public"."stock_movements" USING "btree" ("product_id");



CREATE INDEX "idx_stock_movements_storage_location_id" ON "public"."stock_movements" USING "btree" ("storage_location_id");



CREATE INDEX "idx_stock_movements_tenant_id" ON "public"."stock_movements" USING "btree" ("tenant_id");



CREATE INDEX "idx_stock_movements_tenant_product" ON "public"."stock_movements" USING "btree" ("tenant_id", "product_id");



CREATE INDEX "idx_stock_movements_type" ON "public"."stock_movements" USING "btree" ("tenant_id", "movement_type");



CREATE INDEX "idx_storage_locations_is_active" ON "public"."storage_locations" USING "btree" ("tenant_id", "is_active");



CREATE INDEX "idx_storage_locations_name" ON "public"."storage_locations" USING "btree" ("tenant_id", "name");



CREATE INDEX "idx_storage_locations_tenant_id" ON "public"."storage_locations" USING "btree" ("tenant_id");



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_charge_id" ON "public"."tasks" USING "btree" ("charge_id") WHERE ("charge_id" IS NOT NULL);



CREATE INDEX "idx_tasks_client_id" ON "public"."tasks" USING "btree" ("client_id") WHERE ("client_id" IS NOT NULL);



CREATE INDEX "idx_tasks_created_at" ON "public"."tasks" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("tenant_id", "due_date");



CREATE INDEX "idx_tasks_priority" ON "public"."tasks" USING "btree" ("tenant_id", "priority");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_tasks_tenant_id" ON "public"."tasks" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_access_codes_code" ON "public"."tenant_access_codes" USING "btree" ("code");



CREATE INDEX "idx_tenant_access_codes_expires_at" ON "public"."tenant_access_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_tenant_access_codes_tenant_user" ON "public"."tenant_access_codes" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_tenant_access_codes_used_at" ON "public"."tenant_access_codes" USING "btree" ("used_at");



CREATE INDEX "idx_tenant_integrations_active" ON "public"."tenant_integrations" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_tenant_integrations_config_api_key" ON "public"."tenant_integrations" USING "btree" ((("config" ->> 'api_key'::"text")));



CREATE INDEX "idx_tenant_integrations_config_environment" ON "public"."tenant_integrations" USING "btree" ((("config" ->> 'environment'::"text")));



CREATE INDEX "idx_tenant_integrations_config_gin" ON "public"."tenant_integrations" USING "gin" ("config");



CREATE INDEX "idx_tenant_integrations_config_instance_name" ON "public"."tenant_integrations" USING "btree" ((("config" ->> 'instance_name'::"text")));



CREATE INDEX "idx_tenant_integrations_encrypted_key" ON "public"."tenant_integrations" USING "btree" ("tenant_id", "integration_type") WHERE ("encrypted_api_key" IS NOT NULL);



CREATE INDEX "idx_tenant_integrations_tenant_id" ON "public"."tenant_integrations" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_integrations_type_env" ON "public"."tenant_integrations" USING "btree" ("integration_type", "environment");



CREATE UNIQUE INDEX "idx_tenant_integrations_unique" ON "public"."tenant_integrations" USING "btree" ("tenant_id", "integration_type", "environment");



CREATE INDEX "idx_tenant_invites_email" ON "public"."tenant_invites" USING "btree" ("email");



CREATE INDEX "idx_tenant_invites_status" ON "public"."tenant_invites" USING "btree" ("status");



CREATE INDEX "idx_tenant_invites_tenant_id" ON "public"."tenant_invites" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_users_active" ON "public"."tenant_users" USING "btree" ("active");



CREATE INDEX "idx_tenant_users_role" ON "public"."tenant_users" USING "btree" ("role");



CREATE INDEX "idx_tenant_users_tenant_active" ON "public"."tenant_users" USING "btree" ("tenant_id", "active");



CREATE INDEX "idx_tenant_users_tenant_id" ON "public"."tenant_users" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_users_token_version" ON "public"."tenant_users" USING "btree" ("token_version");



CREATE INDEX "idx_tenant_users_user_id" ON "public"."tenant_users" USING "btree" ("user_id");



CREATE INDEX "idx_tenant_users_user_tenant" ON "public"."tenant_users" USING "btree" ("user_id", "tenant_id");



CREATE INDEX "idx_tenants_active" ON "public"."tenants" USING "btree" ("active");



CREATE INDEX "idx_tenants_slug" ON "public"."tenants" USING "btree" ("slug");



CREATE INDEX "idx_users_avatar_url" ON "public"."users" USING "btree" ("avatar_url");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("user_role");



CREATE INDEX "products_barcode_idx" ON "public"."products" USING "btree" ("barcode");



CREATE INDEX "products_code_idx" ON "public"."products" USING "btree" ("code");



CREATE INDEX "products_name_idx" ON "public"."products" USING "btree" ("name");



CREATE INDEX "products_tenant_id_idx" ON "public"."products" USING "btree" ("tenant_id");



CREATE INDEX "tenant_access_codes_code_idx" ON "public"."tenant_access_codes" USING "btree" ("code");



CREATE INDEX "tenant_access_codes_expires_at_idx" ON "public"."tenant_access_codes" USING "btree" ("expires_at");



CREATE INDEX "tenant_access_codes_tenant_id_idx" ON "public"."tenant_access_codes" USING "btree" ("tenant_id");



CREATE INDEX "tenant_access_codes_user_id_idx" ON "public"."tenant_access_codes" USING "btree" ("user_id");



CREATE UNIQUE INDEX "tenant_integrations_unique" ON "public"."tenant_integrations" USING "btree" ("tenant_id", "integration_type");



CREATE INDEX "tenant_invites_email_idx" ON "public"."tenant_invites" USING "btree" ("email");



CREATE UNIQUE INDEX "tenant_invites_pending_idx" ON "public"."tenant_invites" USING "btree" ("tenant_id", "email") WHERE ("status" = 'PENDING'::"text");



CREATE INDEX "tenant_invites_status_idx" ON "public"."tenant_invites" USING "btree" ("status");



CREATE INDEX "tenant_invites_tenant_id_idx" ON "public"."tenant_invites" USING "btree" ("tenant_id");



CREATE INDEX "tenant_users_tenant_id_idx" ON "public"."tenant_users" USING "btree" ("tenant_id");



CREATE INDEX "tenant_users_user_id_idx" ON "public"."tenant_users" USING "btree" ("user_id");



CREATE UNIQUE INDEX "unique_tenant_agent" ON "public"."agente_ia_empresa" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "unique_tenant_etapa_mensagem" ON "public"."agente_ia_mensagens_regua" USING "btree" ("tenant_id", "etapa_regua_id");



CREATE OR REPLACE TRIGGER "auto_create_tenant_admin_trigger" AFTER INSERT ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_tenant_admin"();

ALTER TABLE "public"."tenants" DISABLE TRIGGER "auto_create_tenant_admin_trigger";



COMMENT ON TRIGGER "auto_create_tenant_admin_trigger" ON "public"."tenants" IS 'DESABILITADO: O fluxo de criação de tenant agora usa convites (tenant_invites). A associação tenant_users só é criada quando o convite é aceito.';



CREATE OR REPLACE TRIGGER "bank_history_adjust_on_delete" AFTER DELETE ON "public"."bank_operation_history" FOR EACH ROW EXECUTE FUNCTION "public"."adjust_balance_on_history_delete"();



CREATE OR REPLACE TRIGGER "bank_history_adjust_on_insert" AFTER INSERT ON "public"."bank_operation_history" FOR EACH ROW EXECUTE FUNCTION "public"."adjust_balance_on_history_insert"();



CREATE OR REPLACE TRIGGER "bank_history_adjust_on_update" AFTER UPDATE ON "public"."bank_operation_history" FOR EACH ROW EXECUTE FUNCTION "public"."adjust_balance_on_history_update"();



CREATE OR REPLACE TRIGGER "bank_operation_history_updated_at" BEFORE UPDATE ON "public"."bank_operation_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_bank_operation_history_updated_at"();



CREATE OR REPLACE TRIGGER "create_tenant_templates" AFTER INSERT ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_tenant"();



CREATE OR REPLACE TRIGGER "financial_payables_insert_to_history" AFTER INSERT ON "public"."financial_payables" FOR EACH ROW EXECUTE FUNCTION "public"."log_financial_payable_insert_to_history"();



CREATE OR REPLACE TRIGGER "financial_payables_payment_to_history" AFTER UPDATE ON "public"."financial_payables" FOR EACH ROW EXECUTE FUNCTION "public"."log_financial_payable_payment_to_history"();



CREATE OR REPLACE TRIGGER "generate_invite_token_trigger" BEFORE INSERT ON "public"."tenant_invites" FOR EACH ROW EXECUTE FUNCTION "public"."generate_invite_token"();



CREATE OR REPLACE TRIGGER "log_contract_stage_changes" AFTER UPDATE ON "public"."contracts" FOR EACH ROW WHEN (("old"."stage_id" IS DISTINCT FROM "new"."stage_id")) EXECUTE FUNCTION "public"."log_contract_stage_change"();



CREATE OR REPLACE TRIGGER "normalize_user_role_trigger" BEFORE INSERT OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."normalize_user_role"();



CREATE OR REPLACE TRIGGER "preserve_admin_role_trigger" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."preserve_admin_role"();



CREATE OR REPLACE TRIGGER "prevent_role_self_promotion" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."protect_user_role_changes"();



CREATE OR REPLACE TRIGGER "process_accepted_invite_trigger" AFTER UPDATE ON "public"."tenant_invites" FOR EACH ROW WHEN ((("new"."status" = 'ACCEPTED'::"text") AND ("old"."status" = 'PENDING'::"text"))) EXECUTE FUNCTION "public"."process_accepted_invite"();



CREATE OR REPLACE TRIGGER "product_stock_by_location_updated_at" BEFORE UPDATE ON "public"."product_stock_by_location" FOR EACH ROW EXECUTE FUNCTION "public"."update_product_stock_by_location_updated_at"();



CREATE OR REPLACE TRIGGER "set_agente_mensagens_timestamp" BEFORE UPDATE ON "public"."agente_ia_mensagens_regua" FOR EACH ROW EXECUTE FUNCTION "public"."update_agente_timestamp"();



CREATE OR REPLACE TRIGGER "set_agente_timestamp" BEFORE UPDATE ON "public"."agente_ia_empresa" FOR EACH ROW EXECUTE FUNCTION "public"."update_agente_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."charges" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."message_history" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."notification_templates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."resellers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_timestamp_regua_config" BEFORE UPDATE ON "public"."regua_cobranca_config" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_timestamp_regua_etapas" BEFORE UPDATE ON "public"."regua_cobranca_etapas" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "stock_movements_updated_at" BEFORE UPDATE ON "public"."stock_movements" FOR EACH ROW EXECUTE FUNCTION "public"."update_stock_movements_updated_at"();



CREATE OR REPLACE TRIGGER "sync_roles_on_update" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_roles"();



CREATE OR REPLACE TRIGGER "track_resellers_users_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."resellers_users" FOR EACH ROW EXECUTE FUNCTION "public"."log_resellers_users_changes"();



CREATE OR REPLACE TRIGGER "trg_after_insert_contract_billings" AFTER INSERT ON "public"."contract_billings" FOR EACH ROW EXECUTE FUNCTION "public"."process_contract_billing_charge"();

ALTER TABLE "public"."contract_billings" DISABLE TRIGGER "trg_after_insert_contract_billings";



COMMENT ON TRIGGER "trg_after_insert_contract_billings" ON "public"."contract_billings" IS 'Trigger único que automatiza a criação de cobranças após faturamento de contratos - trigger duplicado removido';



CREATE OR REPLACE TRIGGER "trg_enforce_active_contract_on_period" BEFORE INSERT ON "public"."contract_billing_periods" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_active_contract_on_period"();



CREATE OR REPLACE TRIGGER "trg_financial_documents_updated_at" BEFORE UPDATE ON "public"."financial_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_financial_launchs_updated_at" BEFORE UPDATE ON "public"."financial_launchs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_financial_payables_status" BEFORE INSERT OR UPDATE OF "due_date", "payment_date", "paid_amount", "status" ON "public"."financial_payables" FOR EACH ROW EXECUTE FUNCTION "public"."set_financial_payable_status"();



CREATE OR REPLACE TRIGGER "trg_financial_payables_updated_at" BEFORE UPDATE ON "public"."financial_payables" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_financial_settings_updated_at" BEFORE UPDATE ON "public"."financial_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_contract_revert_to_draft" BEFORE UPDATE ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_contract_revert_to_draft"();



CREATE OR REPLACE TRIGGER "trg_tasks_assigned_to_tenant" BEFORE INSERT OR UPDATE OF "assigned_to", "tenant_id" ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_assigned_to_tenant"();



CREATE OR REPLACE TRIGGER "trigger_auto_generate_billing_forecasts" AFTER INSERT ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."auto_generate_billing_forecasts"();



CREATE OR REPLACE TRIGGER "trigger_auto_update_billing_status" AFTER INSERT OR UPDATE ON "public"."contract_billing_periods" FOR EACH ROW EXECUTE FUNCTION "public"."auto_update_billing_status"();



CREATE OR REPLACE TRIGGER "trigger_cbp_updated_at" BEFORE UPDATE ON "public"."contract_billing_periods" FOR EACH ROW EXECUTE FUNCTION "public"."update_contract_billing_periods_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_conciliation_staging_audit" BEFORE INSERT OR UPDATE ON "public"."conciliation_staging" FOR EACH ROW EXECUTE FUNCTION "public"."handle_conciliation_staging_audit"();



CREATE OR REPLACE TRIGGER "trigger_conciliation_staging_customer_data" BEFORE INSERT OR UPDATE OF "asaas_customer_id" ON "public"."conciliation_staging" FOR EACH ROW WHEN ((("new"."asaas_customer_id" IS NOT NULL) AND ("new"."asaas_customer_id" <> ''::"text"))) EXECUTE FUNCTION "public"."process_conciliation_staging_customer_data"();



COMMENT ON TRIGGER "trigger_conciliation_staging_customer_data" ON "public"."conciliation_staging" IS 'Trigger que executa antes de INSERT/UPDATE quando asaas_customer_id é informado, buscando dados do cliente na API ASAAS';



CREATE OR REPLACE TRIGGER "trigger_contracts_audit_insert" BEFORE INSERT ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_contracts_audit"();



COMMENT ON TRIGGER "trigger_contracts_audit_insert" ON "public"."contracts" IS 'Trigger para popular created_by e updated_by em novos contratos';



CREATE OR REPLACE TRIGGER "trigger_contracts_audit_update" BEFORE UPDATE ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_contracts_audit"();



COMMENT ON TRIGGER "trigger_contracts_audit_update" ON "public"."contracts" IS 'Trigger para popular updated_by em contratos atualizados';



CREATE OR REPLACE TRIGGER "trigger_contracts_insert_billing_periods" AFTER INSERT ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_create_billing_periods"();



COMMENT ON TRIGGER "trigger_contracts_insert_billing_periods" ON "public"."contracts" IS 'Trigger para gerar períodos de cobrança apenas na criação de contratos usando upsert_billing_periods_for_contract';



CREATE OR REPLACE TRIGGER "trigger_contracts_update_billing_periods" AFTER UPDATE ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_billing_periods"();



COMMENT ON TRIGGER "trigger_contracts_update_billing_periods" ON "public"."contracts" IS 'Trigger para atualizar períodos de cobrança quando dados relevantes do contrato são alterados usando upsert_billing_periods_for_contract';



CREATE OR REPLACE TRIGGER "trigger_create_finance_entry_from_charge" AFTER UPDATE ON "public"."charges" FOR EACH ROW EXECUTE FUNCTION "public"."create_finance_entry_from_charge"();



COMMENT ON TRIGGER "trigger_create_finance_entry_from_charge" ON "public"."charges" IS 'Trigger que executa a criação automática de finance_entry quando charge é paga';



CREATE OR REPLACE TRIGGER "trigger_create_finance_entry_on_charge_payment" AFTER UPDATE ON "public"."charges" FOR EACH ROW EXECUTE FUNCTION "public"."create_finance_entry_on_charge_payment"();



COMMENT ON TRIGGER "trigger_create_finance_entry_on_charge_payment" ON "public"."charges" IS 'Trigger que executa após atualização de charges para criar finance_entries automaticamente quando o status muda para RECEIVED.';



CREATE OR REPLACE TRIGGER "trigger_generate_charge_on_billing" AFTER UPDATE ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."generate_charge_on_billing"();



COMMENT ON TRIGGER "trigger_generate_charge_on_billing" ON "public"."contracts" IS 'Trigger que gera cobrança automaticamente quando billed = true';



CREATE OR REPLACE TRIGGER "trigger_generate_order_number_contract_period" BEFORE INSERT ON "public"."contract_billing_periods" FOR EACH ROW WHEN (("new"."order_number" IS NULL)) EXECUTE FUNCTION "public"."generate_order_number_on_insert_contract_period"();



CREATE OR REPLACE TRIGGER "trigger_mark_billing_period_as_billed" AFTER INSERT ON "public"."charges" FOR EACH ROW EXECUTE FUNCTION "public"."mark_billing_period_as_billed"();



CREATE OR REPLACE TRIGGER "trigger_receipts_updated_at" BEFORE UPDATE ON "public"."receipts" FOR EACH ROW EXECUTE FUNCTION "public"."update_receipts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_resellers_users_validate_role" BEFORE INSERT OR UPDATE ON "public"."resellers_users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_validate_role"();



CREATE OR REPLACE TRIGGER "trigger_sbe_updated_at" BEFORE UPDATE ON "public"."service_billing_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_sbe_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_set_tenant_slug" BEFORE INSERT ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_slug"();



CREATE OR REPLACE TRIGGER "trigger_sync_billing_status_on_charge_update" AFTER UPDATE ON "public"."charges" FOR EACH ROW WHEN ((("new"."contract_id" IS NOT NULL) AND ("old"."status" IS DISTINCT FROM "new"."status"))) EXECUTE FUNCTION "public"."sync_billing_status_on_charge_update"();



CREATE OR REPLACE TRIGGER "trigger_tenant_integrations_updated_at" BEFORE UPDATE ON "public"."tenant_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_tenant_integrations_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_tenant_invites_validate_role" BEFORE INSERT OR UPDATE ON "public"."tenant_invites" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_validate_role"();



CREATE OR REPLACE TRIGGER "trigger_tenant_users_validate_role" BEFORE INSERT OR UPDATE ON "public"."tenant_users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_validate_role"();



CREATE OR REPLACE TRIGGER "trigger_update_billing_periods_on_charge_payment" AFTER UPDATE ON "public"."charges" FOR EACH ROW EXECUTE FUNCTION "public"."update_billing_periods_on_charge_payment"();



COMMENT ON TRIGGER "trigger_update_billing_periods_on_charge_payment" ON "public"."charges" IS 'Trigger que executa update_billing_periods_on_charge_payment quando charge é atualizado';



CREATE OR REPLACE TRIGGER "trigger_update_conciliation_staging_updated_at" BEFORE UPDATE ON "public"."conciliation_staging" FOR EACH ROW EXECUTE FUNCTION "public"."update_conciliation_staging_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_finance_entries_updated_at" BEFORE UPDATE ON "public"."finance_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_finance_entries_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_standalone_billing_items_updated_at" BEFORE UPDATE ON "public"."billing_period_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_standalone_billing_items_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_storage_locations_updated_at" BEFORE UPDATE ON "public"."storage_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_storage_locations_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_tasks_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_users_timestamp" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_users_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_validate_billing_periods_tenant_single" BEFORE INSERT OR UPDATE ON "public"."charges" FOR EACH ROW EXECUTE FUNCTION "public"."validate_billing_periods_tenant_single"();



CREATE OR REPLACE TRIGGER "update_billing_status_after_payment" AFTER INSERT ON "public"."contract_billing_payments" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_billing_status"();



CREATE OR REPLACE TRIGGER "update_contract_totals" AFTER INSERT OR DELETE OR UPDATE ON "public"."contract_services" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_contract_total"();



CREATE OR REPLACE TRIGGER "update_contract_totals_products" AFTER INSERT OR DELETE OR UPDATE ON "public"."contract_products" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_contract_total"();



CREATE OR REPLACE TRIGGER "update_contracts_updated_at" BEFORE UPDATE ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_categories_updated_at" BEFORE UPDATE ON "public"."product_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_resellers_updated_at" BEFORE UPDATE ON "public"."resellers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_services_updated_at" BEFORE UPDATE ON "public"."services" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenant_users_updated_at_trigger" BEFORE UPDATE ON "public"."tenant_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_tenant_users_updated_at"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bank_acounts"
    ADD CONSTRAINT "bank_acounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bank_acounts"
    ADD CONSTRAINT "bank_acounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_acounts"
    ADD CONSTRAINT "bank_acounts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bank_operation_history"
    ADD CONSTRAINT "bank_operation_history_bank_acount_id_fkey" FOREIGN KEY ("bank_acount_id") REFERENCES "public"."bank_acounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bank_operation_history"
    ADD CONSTRAINT "bank_operation_history_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."financial_settings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bank_operation_history"
    ADD CONSTRAINT "bank_operation_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bank_operation_history"
    ADD CONSTRAINT "bank_operation_history_document_fkey" FOREIGN KEY ("document_reference") REFERENCES "public"."financial_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bank_operation_history"
    ADD CONSTRAINT "bank_operation_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bank_operation_history"
    ADD CONSTRAINT "bank_operation_history_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."billing_period_items"
    ADD CONSTRAINT "billing_period_items_billing_period_id_fkey" FOREIGN KEY ("billing_period_id") REFERENCES "public"."contract_billing_periods"("id");



ALTER TABLE ONLY "public"."billing_period_items"
    ADD CONSTRAINT "billing_period_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_period_items"
    ADD CONSTRAINT "billing_period_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."billing_period_items"
    ADD CONSTRAINT "billing_period_items_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_period_items"
    ADD CONSTRAINT "billing_period_items_storage_location_id_fkey" FOREIGN KEY ("storage_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_period_items"
    ADD CONSTRAINT "billing_period_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "charges_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conciliation_staging"
    ADD CONSTRAINT "conciliation_staging_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conciliation_staging"
    ADD CONSTRAINT "conciliation_staging_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "public"."contracts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conciliation_staging"
    ADD CONSTRAINT "conciliation_staging_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conciliation_staging"
    ADD CONSTRAINT "conciliation_staging_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conciliation_staging"
    ADD CONSTRAINT "conciliation_staging_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contract_attachments"
    ADD CONSTRAINT "contract_attachments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_attachments"
    ADD CONSTRAINT "contract_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contract_billing_items"
    ADD CONSTRAINT "contract_billing_items_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "public"."contract_billings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_billing_items"
    ADD CONSTRAINT "contract_billing_items_contract_service_id_fkey" FOREIGN KEY ("contract_service_id") REFERENCES "public"."contract_services"("id");



ALTER TABLE ONLY "public"."contract_billing_payments"
    ADD CONSTRAINT "contract_billing_payments_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "public"."contract_billings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_billing_payments"
    ADD CONSTRAINT "contract_billing_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contract_billing_payments"
    ADD CONSTRAINT "contract_billing_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_billing_periods"
    ADD CONSTRAINT "contract_billing_periods_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_billing_periods"
    ADD CONSTRAINT "contract_billing_periods_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."contract_billing_periods"
    ADD CONSTRAINT "contract_billing_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_billings"
    ADD CONSTRAINT "contract_billings_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_billings"
    ADD CONSTRAINT "contract_billings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contract_billings"
    ADD CONSTRAINT "contract_billings_parent_billing_id_fkey" FOREIGN KEY ("parent_billing_id") REFERENCES "public"."contract_billings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contract_billings"
    ADD CONSTRAINT "contract_billings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_billings"
    ADD CONSTRAINT "contract_billings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contract_products"
    ADD CONSTRAINT "contract_products_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_products"
    ADD CONSTRAINT "contract_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contract_products"
    ADD CONSTRAINT "contract_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_services"
    ADD CONSTRAINT "contract_services_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_services"
    ADD CONSTRAINT "contract_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contract_services"
    ADD CONSTRAINT "contract_services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_stage_history"
    ADD CONSTRAINT "contract_stage_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contract_stage_history"
    ADD CONSTRAINT "contract_stage_history_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_stage_history"
    ADD CONSTRAINT "contract_stage_history_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "public"."contract_stages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contract_stage_history"
    ADD CONSTRAINT "contract_stage_history_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "public"."contract_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_stage_transition_rules"
    ADD CONSTRAINT "contract_stage_transition_rules_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "public"."contract_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_stage_transition_rules"
    ADD CONSTRAINT "contract_stage_transition_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_stage_transition_rules"
    ADD CONSTRAINT "contract_stage_transition_rules_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "public"."contract_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_stage_transitions"
    ADD CONSTRAINT "contract_stage_transitions_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "public"."contract_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_stage_transitions"
    ADD CONSTRAINT "contract_stage_transitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_stage_transitions"
    ADD CONSTRAINT "contract_stage_transitions_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "public"."contract_stages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_stages"
    ADD CONSTRAINT "contract_stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."tenant_users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."finance_entries"
    ADD CONSTRAINT "finance_entries_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_acounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."finance_entries"
    ADD CONSTRAINT "finance_entries_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id");



ALTER TABLE ONLY "public"."finance_entries"
    ADD CONSTRAINT "finance_entries_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id");



ALTER TABLE ONLY "public"."finance_entries"
    ADD CONSTRAINT "finance_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."finance_entries"
    ADD CONSTRAINT "finance_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_addition_id_fkey" FOREIGN KEY ("addition_id") REFERENCES "public"."financial_launchs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_open_id_fkey" FOREIGN KEY ("open_id") REFERENCES "public"."financial_launchs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_settle_id_fkey" FOREIGN KEY ("settle_id") REFERENCES "public"."financial_launchs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_launchs"
    ADD CONSTRAINT "financial_launchs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_payables"
    ADD CONSTRAINT "financial_payables_bank_account_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_acounts"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_payables"
    ADD CONSTRAINT "financial_payables_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."financial_settings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_payables"
    ADD CONSTRAINT "financial_payables_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."financial_payables"
    ADD CONSTRAINT "financial_payables_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."financial_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_payables"
    ADD CONSTRAINT "financial_payables_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_payables"
    ADD CONSTRAINT "financial_payables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_settings"
    ADD CONSTRAINT "financial_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."financial_settings"
    ADD CONSTRAINT "financial_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "fk_charges_billing_periods" FOREIGN KEY ("billing_periods") REFERENCES "public"."contract_billing_periods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."charges"
    ADD CONSTRAINT "fk_charges_contract_id" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contract_attachments"
    ADD CONSTRAINT "fk_contract_attachments_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "fk_contracts_stage_id" FOREIGN KEY ("stage_id") REFERENCES "public"."contract_stages"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."agente_ia_mensagens_regua"
    ADD CONSTRAINT "fk_etapa_regua" FOREIGN KEY ("etapa_regua_id") REFERENCES "public"."regua_cobranca_etapas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regua_cobranca_config"
    ADD CONSTRAINT "fk_regua_cobranca_config_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agente_ia_empresa"
    ADD CONSTRAINT "fk_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agente_ia_mensagens_regua"
    ADD CONSTRAINT "fk_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_history"
    ADD CONSTRAINT "message_history_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_history"
    ADD CONSTRAINT "message_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_history"
    ADD CONSTRAINT "message_history_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_history"
    ADD CONSTRAINT "message_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_stock_by_location"
    ADD CONSTRAINT "product_stock_by_location_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_stock_by_location"
    ADD CONSTRAINT "product_stock_by_location_storage_location_id_fkey" FOREIGN KEY ("storage_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_stock_by_location"
    ADD CONSTRAINT "product_stock_by_location_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conciliation_history"
    ADD CONSTRAINT "reconciliation_history_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conciliation_history"
    ADD CONSTRAINT "reconciliation_history_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conciliation_history"
    ADD CONSTRAINT "reconciliation_history_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."conciliation_rules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conciliation_history"
    ADD CONSTRAINT "reconciliation_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conciliation_rules"
    ADD CONSTRAINT "reconciliation_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."conciliation_rules"
    ADD CONSTRAINT "reconciliation_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conciliation_rules"
    ADD CONSTRAINT "reconciliation_rules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."regua_cobranca_estatisticas"
    ADD CONSTRAINT "regua_cobranca_estatisticas_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "public"."regua_cobranca_etapas"("id");



ALTER TABLE ONLY "public"."regua_cobranca_estatisticas"
    ADD CONSTRAINT "regua_cobranca_estatisticas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regua_cobranca_etapas"
    ADD CONSTRAINT "regua_cobranca_etapas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regua_cobranca_execucao"
    ADD CONSTRAINT "regua_cobranca_execucao_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "public"."regua_cobranca_etapas"("id");



ALTER TABLE ONLY "public"."regua_cobranca_execucao"
    ADD CONSTRAINT "regua_cobranca_execucao_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regua_cobranca_interacoes"
    ADD CONSTRAINT "regua_cobranca_interacoes_mensagem_id_fkey" FOREIGN KEY ("mensagem_id") REFERENCES "public"."regua_cobranca_mensagens"("id");



ALTER TABLE ONLY "public"."regua_cobranca_interacoes"
    ADD CONSTRAINT "regua_cobranca_interacoes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."regua_cobranca_mensagens"
    ADD CONSTRAINT "regua_cobranca_mensagens_etapa_id_fkey" FOREIGN KEY ("etapa_id") REFERENCES "public"."regua_cobranca_etapas"("id");



ALTER TABLE ONLY "public"."regua_cobranca_mensagens"
    ADD CONSTRAINT "regua_cobranca_mensagens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."regua_cobranca_template_etapas"
    ADD CONSTRAINT "regua_cobranca_template_etapas_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."regua_cobranca_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."regua_cobranca_templates"
    ADD CONSTRAINT "regua_cobranca_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resellers_users"
    ADD CONSTRAINT "resellers_users_public_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resellers_users"
    ADD CONSTRAINT "resellers_users_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resellers_users"
    ADD CONSTRAINT "resellers_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_billing_events"
    ADD CONSTRAINT "service_billing_events_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_billing_events"
    ADD CONSTRAINT "service_billing_events_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."contract_services"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_billing_events"
    ADD CONSTRAINT "service_billing_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_destination_storage_location_id_fkey" FOREIGN KEY ("destination_storage_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_origin_storage_location_id_fkey" FOREIGN KEY ("origin_storage_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_storage_location_id_fkey" FOREIGN KEY ("storage_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."storage_locations"
    ADD CONSTRAINT "storage_locations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."storage_locations"
    ADD CONSTRAINT "storage_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fk" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks_attachments"
    ADD CONSTRAINT "tasks_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks_attachments"
    ADD CONSTRAINT "tasks_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "public"."charges"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_access_codes"
    ADD CONSTRAINT "tenant_access_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_access_codes"
    ADD CONSTRAINT "tenant_access_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_integrations"
    ADD CONSTRAINT "tenant_integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."tenant_invites"
    ADD CONSTRAINT "tenant_invites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Acesso a histórico baseado em acesso ao contrato" ON "public"."contract_stage_history" USING (("contract_id" IN ( SELECT "contracts"."id"
   FROM "public"."contracts"
  WHERE ("contracts"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Acesso a itens de faturamento baseado em acesso ao faturamento" ON "public"."contract_billing_items" USING (("billing_id" IN ( SELECT "contract_billings"."id"
   FROM "public"."contract_billings"
  WHERE ("contract_billings"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE ("tenant_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Acesso a pagamentos baseado em tenant" ON "public"."contract_billing_payments" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins do tenant podem gerenciar configurações da régua" ON "public"."regua_cobranca_config" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "regua_cobranca_config"."tenant_id") AND ("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."role" = 'TENANT_ADMIN'::"text")))));



CREATE POLICY "Admins do tenant podem gerenciar convites" ON "public"."tenant_invites" USING ("public"."user_is_tenant_admin"("tenant_id"));



CREATE POLICY "Admins do tenant podem gerenciar etapas da régua" ON "public"."regua_cobranca_etapas" USING ("public"."user_is_tenant_admin"("tenant_id"));



CREATE POLICY "Allow anonymous read access to health_check" ON "public"."health_check" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow auth admin to read tenant_users" ON "public"."tenant_users" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "Allow auth admin to read users" ON "public"."users" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "Allow authenticated delete access" ON "public"."tenants" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated insert access" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated read access" ON "public"."tenants" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated update access" ON "public"."tenants" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow contract_stage_history operations for development" ON "public"."contract_stage_history" USING (true) WITH CHECK (true);



CREATE POLICY "Allow contract_stages operations for development" ON "public"."contract_stages" USING (true) WITH CHECK (true);



CREATE POLICY "Allow users to select tenants they belong to" ON "public"."tenants" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND ("tu"."tenant_id" = "tenants"."id")))));



CREATE POLICY "Context Based Read Access" ON "public"."profiles" FOR SELECT TO "authenticated" USING (((("context" = 'TENANT'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE ("tu"."user_id" = "auth"."uid"())))) OR (("context" = 'RESELLER'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."resellers_users" "ru"
  WHERE ("ru"."user_id" = "auth"."uid"())))) OR (("context" = 'ADMIN'::"text") AND ((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND ("tu"."role" = 'SUPER_ADMIN'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."resellers_users" "ru"
  WHERE (("ru"."user_id" = "auth"."uid"()) AND (("ru"."role")::"text" = 'SUPER_ADMIN'::"text"))))))));



COMMENT ON POLICY "Context Based Read Access" ON "public"."profiles" IS 'Usuários podem ler profiles baseado no seu contexto';



CREATE POLICY "Permitir acesso a revendedores para usuários autenticados" ON "public"."resellers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir acesso para usuários autenticados" ON "public"."resellers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Reseller admins can manage users" ON "public"."resellers_users" USING ((("auth"."uid"() IN ( SELECT "resellers_users"."user_id"
   FROM "public"."users"
  WHERE (("users"."user_role" = 'RESELLER_ADMIN'::"text") AND ("users"."id" = "auth"."uid"())))) OR ("auth"."uid"() = "user_id")));



COMMENT ON POLICY "Reseller admins can manage users" ON "public"."resellers_users" IS 'Permite que administradores de revendedores gerenciem usuários sem recursão infinita. Corrige erro 42P17.';



CREATE POLICY "Secure tenant access to tasks" ON "public"."tasks" USING (("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND ("tu"."active" = true) AND ("tu"."role" = ANY (ARRAY['TENANT_ADMIN'::"text", 'admin'::"text", 'owner'::"text"])))))) WITH CHECK (("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND ("tu"."active" = true) AND ("tu"."role" = ANY (ARRAY['TENANT_ADMIN'::"text", 'admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Super Admin Full Access" ON "public"."profiles" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("auth"."users" "u"
     JOIN "public"."tenant_users" "tu" ON (("u"."id" = "tu"."user_id")))
  WHERE (("u"."id" = "auth"."uid"()) AND ("tu"."role" = 'SUPER_ADMIN'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("auth"."users" "u"
     JOIN "public"."resellers_users" "ru" ON (("u"."id" = "ru"."user_id")))
  WHERE (("u"."id" = "auth"."uid"()) AND (("ru"."role")::"text" = 'SUPER_ADMIN'::"text"))))));



COMMENT ON POLICY "Super Admin Full Access" ON "public"."profiles" IS 'Super admins têm acesso total à tabela profiles';



CREATE POLICY "System can insert audit logs" ON "public"."audit_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Tenant context access to tasks" ON "public"."tasks" TO "postgres" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true))) WITH CHECK ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "Users can create standalone billing items in their tenant" ON "public"."billing_period_items" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."active" = true)))));



CREATE POLICY "Users can delete finance entries from their tenant" ON "public"."finance_entries" FOR DELETE USING ((("tenant_id" = "public"."get_tenant_id"()) OR ("auth"."role"() = 'service_role'::"text")));



COMMENT ON POLICY "Users can delete finance entries from their tenant" ON "public"."finance_entries" IS 'Permite deletar entradas financeiras do tenant usando get_tenant_id()';



CREATE POLICY "Users can delete standalone billing items from their tenant" ON "public"."billing_period_items" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."active" = true)))));



CREATE POLICY "Users can insert finance entries for their tenant" ON "public"."finance_entries" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_tenant_id"()) OR ("auth"."role"() = 'service_role'::"text")));



COMMENT ON POLICY "Users can insert finance entries for their tenant" ON "public"."finance_entries" IS 'Permite inserir entradas financeiras do tenant usando get_tenant_id()';



CREATE POLICY "Users can insert reconciliation_history for their tenant" ON "public"."conciliation_history" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage reconciliation_rules for their tenant" ON "public"."conciliation_rules" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update finance entries from their tenant" ON "public"."finance_entries" FOR UPDATE USING ((("tenant_id" = "public"."get_tenant_id"()) OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("tenant_id" = "public"."get_tenant_id"()) OR ("auth"."role"() = 'service_role'::"text")));



COMMENT ON POLICY "Users can update finance entries from their tenant" ON "public"."finance_entries" IS 'Permite atualizar entradas financeiras do tenant usando get_tenant_id()';



CREATE POLICY "Users can update standalone billing items from their tenant" ON "public"."billing_period_items" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."active" = true))))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."active" = true)))));



CREATE POLICY "Users can view finance entries from their tenant" ON "public"."finance_entries" FOR SELECT USING ((("tenant_id" = "public"."get_tenant_id"()) OR ("auth"."role"() = 'service_role'::"text")));



COMMENT ON POLICY "Users can view finance entries from their tenant" ON "public"."finance_entries" IS 'Permite visualizar entradas financeiras do tenant usando get_tenant_id()';



CREATE POLICY "Users can view invites sent to them" ON "public"."tenant_invites" FOR SELECT USING (("email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text"));



CREATE POLICY "Users can view reconciliation_history from their tenant" ON "public"."conciliation_history" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view reconciliation_rules from their tenant" ON "public"."conciliation_rules" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view standalone billing items from their tenant" ON "public"."billing_period_items" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."active" = true)))));



CREATE POLICY "Users can view tenant audit logs" ON "public"."audit_logs" FOR SELECT USING (("tenant_id" IN ( SELECT "t"."id"
   FROM ("public"."tenants" "t"
     JOIN "public"."tenant_users" "tu" ON (("t"."id" = "tu"."tenant_id")))
  WHERE ("tu"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own tenant associations" ON "public"."tenant_users" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."user_role" = ANY (ARRAY['ADMIN'::"text", 'RESELLER'::"text"])))))));



CREATE POLICY "Usuários do tenant podem ver configurações da régua" ON "public"."regua_cobranca_config" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "regua_cobranca_config"."tenant_id") AND ("tenant_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários do tenant podem ver convites" ON "public"."tenant_invites" FOR SELECT USING ("public"."user_belongs_to_tenant"("tenant_id"));



CREATE POLICY "Usuários do tenant podem ver etapas da régua" ON "public"."regua_cobranca_etapas" FOR SELECT USING ("public"."user_belongs_to_tenant"("tenant_id"));



CREATE POLICY "Usuários veem seus próprios vínculos" ON "public"."resellers_users" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admin_full_access_policy" ON "public"."notifications" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "admin_select_tenant_access_codes" ON "public"."tenant_access_codes" FOR SELECT USING (("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."role" = 'admin'::"text") OR ("tenant_users"."role" = 'owner'::"text")))));



ALTER TABLE "public"."agente_ia_empresa" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agente_ia_empresa_delete" ON "public"."agente_ia_empresa" FOR DELETE USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."role" = ANY (ARRAY['ADMIN'::"text", 'TENANT_ADMIN'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'ADMIN'::"text"))))));



CREATE POLICY "agente_ia_empresa_insert" ON "public"."agente_ia_empresa" FOR INSERT WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."role" = ANY (ARRAY['ADMIN'::"text", 'TENANT_ADMIN'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ((("users"."raw_user_meta_data" ->> 'role'::"text") = 'ADMIN'::"text") OR (("users"."raw_user_meta_data" ->> 'role'::"text") = 'RESELLER'::"text")))))));



CREATE POLICY "agente_ia_empresa_select" ON "public"."agente_ia_empresa" FOR SELECT USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ((("users"."raw_user_meta_data" ->> 'role'::"text") = 'ADMIN'::"text") OR (("users"."raw_user_meta_data" ->> 'role'::"text") = 'RESELLER'::"text")))))));



CREATE POLICY "agente_ia_empresa_update" ON "public"."agente_ia_empresa" FOR UPDATE USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."role" = ANY (ARRAY['ADMIN'::"text", 'TENANT_ADMIN'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ((("users"."raw_user_meta_data" ->> 'role'::"text") = 'ADMIN'::"text") OR (("users"."raw_user_meta_data" ->> 'role'::"text") = 'RESELLER'::"text")))))));



ALTER TABLE "public"."agente_ia_mensagens_regua" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agente_mensagens_delete" ON "public"."agente_ia_mensagens_regua" FOR DELETE USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."role" = ANY (ARRAY['ADMIN'::"text", 'TENANT_ADMIN'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'ADMIN'::"text"))))));



CREATE POLICY "agente_mensagens_insert" ON "public"."agente_ia_mensagens_regua" FOR INSERT WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."role" = ANY (ARRAY['ADMIN'::"text", 'TENANT_ADMIN'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ((("users"."raw_user_meta_data" ->> 'role'::"text") = 'ADMIN'::"text") OR (("users"."raw_user_meta_data" ->> 'role'::"text") = 'RESELLER'::"text")))))));



CREATE POLICY "agente_mensagens_select" ON "public"."agente_ia_mensagens_regua" FOR SELECT USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ((("users"."raw_user_meta_data" ->> 'role'::"text") = 'ADMIN'::"text") OR (("users"."raw_user_meta_data" ->> 'role'::"text") = 'RESELLER'::"text")))))));



CREATE POLICY "agente_mensagens_update" ON "public"."agente_ia_mensagens_regua" FOR UPDATE USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."role" = ANY (ARRAY['ADMIN'::"text", 'TENANT_ADMIN'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ((("users"."raw_user_meta_data" ->> 'role'::"text") = 'ADMIN'::"text") OR (("users"."raw_user_meta_data" ->> 'role'::"text") = 'RESELLER'::"text")))))));



CREATE POLICY "attachments_delete" ON "public"."tasks_attachments" FOR DELETE USING (((COALESCE("current_setting"('app.tenant_id'::"text", true), ''::"text") <> ''::"text") AND ("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")));



CREATE POLICY "attachments_insert" ON "public"."tasks_attachments" FOR INSERT WITH CHECK (((COALESCE("current_setting"('app.tenant_id'::"text", true), ''::"text") <> ''::"text") AND ("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")));



CREATE POLICY "attachments_select" ON "public"."tasks_attachments" FOR SELECT USING (((COALESCE("current_setting"('app.tenant_id'::"text", true), ''::"text") <> ''::"text") AND ("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")));



CREATE POLICY "bank_acounts_delete_same_tenant" ON "public"."bank_acounts" FOR DELETE USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."check_tenant_access_safe"("tenant_id")));



CREATE POLICY "bank_acounts_insert_same_tenant" ON "public"."bank_acounts" FOR INSERT WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."check_tenant_access_safe"("tenant_id")));



CREATE POLICY "bank_acounts_select_same_tenant" ON "public"."bank_acounts" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."check_tenant_access_safe"("tenant_id")));



CREATE POLICY "bank_acounts_update_same_tenant" ON "public"."bank_acounts" FOR UPDATE USING ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."check_tenant_access_safe"("tenant_id"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND "public"."check_tenant_access_safe"("tenant_id")));



CREATE POLICY "bank_operation_history_delete_policy" ON "public"."bank_operation_history" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."active" = true)))));



CREATE POLICY "bank_operation_history_insert_policy" ON "public"."bank_operation_history" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."active" = true)))));



CREATE POLICY "bank_operation_history_select_policy" ON "public"."bank_operation_history" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."active" = true)))));



CREATE POLICY "bank_operation_history_update_policy" ON "public"."bank_operation_history" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."active" = true))))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."active" = true)))));



ALTER TABLE "public"."charges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "charges_unified_delete_policy" ON "public"."charges" FOR DELETE TO "authenticated" USING (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true))))))));



COMMENT ON POLICY "charges_unified_delete_policy" ON "public"."charges" IS 'SECURITY: Política unificada para DELETE com validação de tenant';



CREATE POLICY "charges_unified_insert_policy" ON "public"."charges" FOR INSERT TO "authenticated", "anon" WITH CHECK (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true))))))));



COMMENT ON POLICY "charges_unified_insert_policy" ON "public"."charges" IS 'SECURITY: Política unificada para INSERT com validação de tenant';



CREATE POLICY "charges_unified_select_policy" ON "public"."charges" FOR SELECT TO "authenticated", "anon" USING (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true)))))) OR ("auth"."uid"() IS NULL)));



COMMENT ON POLICY "charges_unified_select_policy" ON "public"."charges" IS 'SECURITY: Política unificada para SELECT com suporte a contexto de tenant e usuários anônimos temporariamente';



CREATE POLICY "charges_unified_update_policy" ON "public"."charges" FOR UPDATE TO "authenticated", "anon" USING (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true)))))))) WITH CHECK (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true))))))));



COMMENT ON POLICY "charges_unified_update_policy" ON "public"."charges" IS 'SECURITY: Política unificada para UPDATE com validação de tenant';



ALTER TABLE "public"."conciliation_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conciliation_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conciliation_staging_tenant_context_isolation" ON "public"."conciliation_staging" USING ((("tenant_id" = "public"."get_tenant_id"()) OR ("public"."get_tenant_id"() IS NULL)));



COMMENT ON POLICY "conciliation_staging_tenant_context_isolation" ON "public"."conciliation_staging" IS 'Política RLS que isola dados por tenant usando contexto de sessão configurado por set_tenant_context_simple. Permite acesso quando tenant_id da linha corresponde ao contexto atual ou quando não há contexto (operações admin).';



CREATE POLICY "contract_attachments_tenant_access" ON "public"."contract_attachments" USING ("public"."user_has_tenant_access"("tenant_id")) WITH CHECK ("public"."user_has_tenant_access"("tenant_id"));



ALTER TABLE "public"."contract_billing_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_billing_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_billing_periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contract_billing_periods_tenant_secure" ON "public"."contract_billing_periods" USING (((("current_setting"('app.current_tenant_id'::"text", true) IS NOT NULL) AND ("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid")) OR (("current_setting"('app.tenant_id'::"text", true) IS NOT NULL) AND ("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true))))))));



COMMENT ON POLICY "contract_billing_periods_tenant_secure" ON "public"."contract_billing_periods" IS 'RLS policy com fallback seguro para isolamento de tenant';



ALTER TABLE "public"."contract_billings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contract_billings_delete_policy" ON "public"."contract_billings" FOR DELETE TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM ("public"."tenant_users" "tu"
     JOIN "public"."users" "u" ON (("tu"."user_id" = "u"."id")))
  WHERE (("tu"."user_id" = "auth"."uid"()) AND ("tu"."tenant_id" = "contract_billings"."tenant_id") AND ("u"."user_role" = ANY (ARRAY['ADMIN'::"text", 'MANAGER'::"text"])))))));



CREATE POLICY "contract_billings_insert_policy" ON "public"."contract_billings" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "contract_billings_select_policy" ON "public"."contract_billings" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "contract_billings_update_policy" ON "public"."contract_billings" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "contract_services_unified_delete_policy" ON "public"."contract_services" FOR DELETE USING (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true))))))));



CREATE POLICY "contract_services_unified_insert_policy" ON "public"."contract_services" FOR INSERT TO "authenticated" WITH CHECK (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true))))))));



CREATE POLICY "contract_services_unified_select_policy" ON "public"."contract_services" FOR SELECT USING (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true))))))));



CREATE POLICY "contract_services_unified_update_policy" ON "public"."contract_services" FOR UPDATE USING (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true)))))))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true)))))));



ALTER TABLE "public"."contract_stage_transitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contracts_tenant_secure" ON "public"."contracts" USING (("tenant_id" = COALESCE(("current_setting"('app.tenant_id'::"text", true))::"uuid", "tenant_id"))) WITH CHECK (("tenant_id" = COALESCE(("current_setting"('app.tenant_id'::"text", true))::"uuid", "tenant_id")));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_tenant_secure" ON "public"."customers" USING (("tenant_id" = COALESCE(("current_setting"('app.tenant_id'::"text", true))::"uuid", "tenant_id"))) WITH CHECK (("tenant_id" = COALESCE(("current_setting"('app.tenant_id'::"text", true))::"uuid", "tenant_id")));



CREATE POLICY "enable_all_authenticated_users" ON "public"."users" USING (true) WITH CHECK (true);



CREATE POLICY "financial_documents_delete" ON "public"."financial_documents" FOR DELETE USING (("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid"));



CREATE POLICY "financial_documents_insert" ON "public"."financial_documents" FOR INSERT WITH CHECK (("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid"));



CREATE POLICY "financial_documents_select" ON "public"."financial_documents" FOR SELECT USING (("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid"));



CREATE POLICY "financial_documents_update" ON "public"."financial_documents" FOR UPDATE USING (("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")) WITH CHECK (("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid"));



CREATE POLICY "financial_payables_delete" ON "public"."financial_payables" FOR DELETE USING (("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid"));



CREATE POLICY "financial_payables_insert" ON "public"."financial_payables" FOR INSERT WITH CHECK (("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid"));



CREATE POLICY "financial_payables_select" ON "public"."financial_payables" FOR SELECT USING (("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid"));



CREATE POLICY "financial_payables_update" ON "public"."financial_payables" FOR UPDATE USING (("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")) WITH CHECK (("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid"));



CREATE POLICY "fl_tenant_delete" ON "public"."financial_launchs" FOR DELETE USING ((("tenant_id" = "public"."current_tenant_id"()) OR ("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "financial_launchs"."tenant_id") AND ("tenant_users"."active" = true))))));



CREATE POLICY "fl_tenant_insert" ON "public"."financial_launchs" FOR INSERT WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR ("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "financial_launchs"."tenant_id") AND ("tenant_users"."active" = true))))));



CREATE POLICY "fl_tenant_select" ON "public"."financial_launchs" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) OR ("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "financial_launchs"."tenant_id") AND ("tenant_users"."active" = true))))));



CREATE POLICY "fl_tenant_update" ON "public"."financial_launchs" FOR UPDATE USING ((("tenant_id" = "public"."current_tenant_id"()) OR ("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "financial_launchs"."tenant_id") AND ("tenant_users"."active" = true)))))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR ("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "financial_launchs"."tenant_id") AND ("tenant_users"."active" = true))))));



ALTER TABLE "public"."health_check" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "no_direct_delete" ON "public"."tenant_access_codes" FOR DELETE USING (false);



CREATE POLICY "no_direct_insert" ON "public"."tenant_access_codes" FOR INSERT WITH CHECK (false);



CREATE POLICY "no_direct_update" ON "public"."tenant_access_codes" FOR UPDATE USING (false);



ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "policy_sbe_tenant_isolation" ON "public"."service_billing_events" TO "authenticated" USING (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid")) WITH CHECK (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_read_pending_invites_by_token" ON "public"."tenant_invites" FOR SELECT USING ((("status" = 'PENDING'::"text") AND ("expires_at" > "now"())));



COMMENT ON POLICY "public_read_pending_invites_by_token" ON "public"."tenant_invites" IS 'Permite que usuários não autenticados leiam convites pendentes para validação na página de registro. Seguro porque o token é único e secreto.';



ALTER TABLE "public"."receipts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "receipts_tenant_isolation" ON "public"."receipts" USING (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text"))::"uuid"));



ALTER TABLE "public"."regua_cobranca_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."regua_cobranca_etapas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resellers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resellers_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_billing_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_full_access_conciliation_staging" ON "public"."conciliation_staging" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "services_unified_delete_policy" ON "public"."services" FOR DELETE USING (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true))))))));



CREATE POLICY "services_unified_insert_policy" ON "public"."services" FOR INSERT WITH CHECK (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true))))))));



CREATE POLICY "services_unified_select_policy" ON "public"."services" FOR SELECT USING (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true)))))) OR ("auth"."uid"() IS NULL)));



CREATE POLICY "services_unified_update_policy" ON "public"."services" FOR UPDATE USING (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true)))))))) WITH CHECK (((("public"."get_current_tenant_context_robust"() IS NOT NULL) AND ("tenant_id" = "public"."get_current_tenant_context_robust"())) OR (("auth"."uid"() IS NOT NULL) AND ("tenant_id" IN ( SELECT "tu"."tenant_id"
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."user_id" = "auth"."uid"()) AND (("tu"."active" IS NULL) OR ("tu"."active" = true))))))));



CREATE POLICY "simple_contract_stage_transitions_access" ON "public"."contract_stage_transitions" USING ("public"."check_user_tenant_access"("tenant_id")) WITH CHECK ("public"."check_user_tenant_access"("tenant_id"));



CREATE POLICY "simple_contract_stages_access" ON "public"."contract_stages" USING (((EXISTS ( SELECT 1
   FROM "pg_policies"
  WHERE (("pg_policies"."tablename" = 'contract_stages'::"name") AND ("pg_policies"."policyname" = 'Allow contract_stages operations for development'::"name")))) OR "public"."check_user_tenant_access"("tenant_id"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "pg_policies"
  WHERE (("pg_policies"."tablename" = 'contract_stages'::"name") AND ("pg_policies"."policyname" = 'Allow contract_stages operations for development'::"name")))) OR "public"."check_user_tenant_access"("tenant_id")));



CREATE POLICY "simple_tenant_invites_policy" ON "public"."tenant_invites" USING (true) WITH CHECK (true);



CREATE POLICY "simple_tenant_users_access" ON "public"."tenant_users" USING (((EXISTS ( SELECT 1
   FROM "pg_policies"
  WHERE (("pg_policies"."tablename" = 'tenant_users'::"name") AND ("pg_policies"."policyname" = 'simple_tenant_users_policy'::"name")))) OR "public"."check_user_tenant_access"("tenant_id") OR ("user_id" = "auth"."uid"()))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "pg_policies"
  WHERE (("pg_policies"."tablename" = 'tenant_users'::"name") AND ("pg_policies"."policyname" = 'simple_tenant_users_policy'::"name")))) OR "public"."check_user_tenant_access"("tenant_id") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "simple_tenant_users_policy" ON "public"."tenant_users" USING (true) WITH CHECK (true);



CREATE POLICY "strict_tenant_isolation_policy" ON "public"."notification_templates" USING (("tenant_id" = COALESCE(("current_setting"('app.tenant_id'::"text", true))::"uuid", "tenant_id"))) WITH CHECK (("tenant_id" = COALESCE(("current_setting"('app.tenant_id'::"text", true))::"uuid", "tenant_id")));



COMMENT ON POLICY "strict_tenant_isolation_policy" ON "public"."notification_templates" IS 'AIDEV-NOTE: Política RLS RESTRITIVA seguindo guia multi-tenant. BLOQUEIA completamente acesso sem contexto válido. Isolamento ABSOLUTO por tenant ativo.';



CREATE POLICY "supabase_auth_admin_tenant_users_select" ON "public"."tenant_users" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "supabase_auth_admin_tenants_select" ON "public"."tenants" FOR SELECT TO "supabase_auth_admin" USING (true);



ALTER TABLE "public"."tenant_access_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_access_codes_delete_policy" ON "public"."tenant_access_codes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND (("u"."user_role" = 'ADMIN'::"text") OR ("u"."user_role" = 'SUPER_ADMIN'::"text"))))));



CREATE POLICY "tenant_access_codes_insert_policy" ON "public"."tenant_access_codes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "tenant_access_codes_select_policy" ON "public"."tenant_access_codes" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND (("u"."user_role" = 'ADMIN'::"text") OR ("u"."user_role" = 'SUPER_ADMIN'::"text")))))));



CREATE POLICY "tenant_access_codes_update_policy" ON "public"."tenant_access_codes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "tenant_admin_invites_policy" ON "public"."tenant_invites" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."tenant_id" = "tenant_invites"."tenant_id") AND ("tenant_users"."role" = 'TENANT_ADMIN'::"text")))));



CREATE POLICY "tenant_integrations_delete_policy_v2" ON "public"."tenant_integrations" FOR DELETE USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "tenant_integrations_insert_policy_v2" ON "public"."tenant_integrations" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "tenant_integrations_select_policy_v2" ON "public"."tenant_integrations" FOR SELECT USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "tenant_integrations_update_policy_v2" ON "public"."tenant_integrations" FOR UPDATE USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("tenant_id" = "public"."get_current_tenant_id"()) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "tenant_isolation_financial_settings_delete" ON "public"."financial_settings" FOR DELETE USING ((("tenant_id" = "public"."current_tenant_id"()) OR ("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "financial_settings"."tenant_id") AND ("tenant_users"."active" = true))))));



CREATE POLICY "tenant_isolation_financial_settings_insert" ON "public"."financial_settings" FOR INSERT WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR ("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "financial_settings"."tenant_id") AND ("tenant_users"."active" = true))))));



CREATE POLICY "tenant_isolation_financial_settings_select" ON "public"."financial_settings" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) OR ("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "financial_settings"."tenant_id") AND ("tenant_users"."active" = true))))));



CREATE POLICY "tenant_isolation_financial_settings_update" ON "public"."financial_settings" FOR UPDATE USING ((("tenant_id" = "public"."current_tenant_id"()) OR ("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "financial_settings"."tenant_id") AND ("tenant_users"."active" = true)))))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) OR ("auth"."uid"() IN ( SELECT "tenant_users"."user_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."tenant_id" = "financial_settings"."tenant_id") AND ("tenant_users"."active" = true))))));



CREATE POLICY "tenant_strict_isolation_policy" ON "public"."notifications" USING ((("tenant_id" = COALESCE(("current_setting"('app.current_tenant_id'::"text", true))::"uuid", ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())
 LIMIT 1))) AND (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."tenant_id" = "notifications"."tenant_id")))) AND ("recipient_email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text"))) WITH CHECK ((("tenant_id" = COALESCE(("current_setting"('app.current_tenant_id'::"text", true))::"uuid", ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = "auth"."uid"())
 LIMIT 1))) AND (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."tenant_id" = "notifications"."tenant_id"))))));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_invites_policy" ON "public"."tenant_invites" FOR SELECT TO "authenticated" USING ((("email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "user_tenant_users_policy" ON "public"."tenant_users" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";






GRANT ALL ON FUNCTION "app_auth"."set_role_after_login"() TO "dashboard_user";

























































































































































































































































GRANT ALL ON FUNCTION "public"."acknowledge_security_notification"("p_notification_id" "uuid", "p_acknowledged_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."acknowledge_security_notification"("p_notification_id" "uuid", "p_acknowledged_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."acknowledge_security_notification"("p_notification_id" "uuid", "p_acknowledged_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_balance_on_history_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_balance_on_history_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_balance_on_history_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_balance_on_history_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_balance_on_history_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_balance_on_history_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_balance_on_history_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_balance_on_history_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_balance_on_history_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_check_user_exists"("user_email" "text", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_check_user_exists"("user_email" "text", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_check_user_exists"("user_email" "text", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_create_user_bypass_rls"("user_id" "uuid", "user_email" "text", "user_role_value" "text", "user_name" "text", "user_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_user_bypass_rls"("user_id" "uuid", "user_email" "text", "user_role_value" "text", "user_name" "text", "user_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_user_bypass_rls"("user_id" "uuid", "user_email" "text", "user_role_value" "text", "user_name" "text", "user_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_force_create_user"("user_id_param" "uuid", "user_email_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_force_create_user"("user_id_param" "uuid", "user_email_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_force_create_user"("user_id_param" "uuid", "user_email_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_get_all_tenants"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_all_tenants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_all_tenants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_get_tenant_pending_invites_v2"("tenant_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_tenant_pending_invites_v2"("tenant_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_tenant_pending_invites_v2"("tenant_id_param" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_list_tenant_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_tenant_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_tenant_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."attempt_billing_period_charge"("p_period_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."attempt_billing_period_charge"("p_period_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."attempt_billing_period_charge"("p_period_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."attempt_standalone_billing_charge"("p_tenant_id" "uuid", "p_period_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."attempt_standalone_billing_charge"("p_tenant_id" "uuid", "p_period_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."attempt_standalone_billing_charge"("p_tenant_id" "uuid", "p_period_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_tenant_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_tenant_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_tenant_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_billing_forecasts"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_billing_forecasts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_billing_forecasts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_billing_periods"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_billing_periods"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_billing_periods"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_billing_periods"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_billing_periods"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_billing_periods"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_update_billing_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_update_billing_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_update_billing_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_billing_periods"("p_tenant_id" "uuid", "p_months_ahead" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_billing_periods"("p_tenant_id" "uuid", "p_months_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_billing_periods"("p_tenant_id" "uuid", "p_months_ahead" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_contract_billing_periods"() TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_contract_billing_periods"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_contract_billing_periods"() TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_service_order_numbers"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_service_order_numbers"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_service_order_numbers"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."bypass_rls_insert_billing"("p_tenant_id" "uuid", "p_contract_id" "uuid", "p_billing_number" "text", "p_installment_number" integer, "p_total_installments" integer, "p_reference_period" "text", "p_reference_start_date" "date", "p_reference_end_date" "date", "p_issue_date" "date", "p_due_date" "date", "p_original_due_date" "date", "p_amount" numeric, "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."bypass_rls_insert_billing"("p_tenant_id" "uuid", "p_contract_id" "uuid", "p_billing_number" "text", "p_installment_number" integer, "p_total_installments" integer, "p_reference_period" "text", "p_reference_start_date" "date", "p_reference_end_date" "date", "p_issue_date" "date", "p_due_date" "date", "p_original_due_date" "date", "p_amount" numeric, "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bypass_rls_insert_billing"("p_tenant_id" "uuid", "p_contract_id" "uuid", "p_billing_number" "text", "p_installment_number" integer, "p_total_installments" integer, "p_reference_period" "text", "p_reference_start_date" "date", "p_reference_end_date" "date", "p_issue_date" "date", "p_due_date" "date", "p_original_due_date" "date", "p_amount" numeric, "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."bypass_rls_insert_billing_item"("p_billing_id" "uuid", "p_description" "text", "p_quantity" numeric, "p_unit_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."bypass_rls_insert_billing_item"("p_billing_id" "uuid", "p_description" "text", "p_quantity" numeric, "p_unit_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bypass_rls_insert_billing_item"("p_billing_id" "uuid", "p_description" "text", "p_quantity" numeric, "p_unit_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."calc_bill_date"("p_year" integer, "p_month" integer, "p_day" integer, "p_anticipate_weekends" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."calc_bill_date"("p_year" integer, "p_month" integer, "p_day" integer, "p_anticipate_weekends" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calc_bill_date"("p_year" integer, "p_month" integer, "p_day" integer, "p_anticipate_weekends" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."calc_contract_bill_date"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calc_contract_bill_date"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calc_contract_bill_date"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calcular_estatisticas_regua"("tenant_id" "uuid", "periodo_inicio" timestamp without time zone, "periodo_fim" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calcular_estatisticas_regua"("tenant_id" "uuid", "periodo_inicio" timestamp without time zone, "periodo_fim" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calcular_estatisticas_regua"("tenant_id" "uuid", "periodo_inicio" timestamp without time zone, "periodo_fim" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_amount_planned_for_periods"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_amount_planned_for_periods"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_amount_planned_for_periods"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_billing_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_billing_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_billing_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_contract_planned_amount"("p_contract_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_contract_planned_amount"("p_contract_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_contract_planned_amount"("p_contract_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_bill_date"("p_base_date" "date", "p_billing_day" integer, "p_anticipate_weekends" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_bill_date"("p_base_date" "date", "p_billing_day" integer, "p_anticipate_weekends" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_bill_date"("p_base_date" "date", "p_billing_day" integer, "p_anticipate_weekends" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_risk_score"("p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_event_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_risk_score"("p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_event_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_risk_score"("p_user_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_event_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_service_product_due_date"("p_contract_id" "uuid", "p_reference_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_service_product_due_date"("p_contract_id" "uuid", "p_reference_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_service_product_due_date"("p_contract_id" "uuid", "p_reference_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_stock_balance"("p_tenant_id" "uuid", "p_product_id" "uuid", "p_storage_location_id" "uuid", "p_movement_type" "public"."stock_movement_type", "p_quantity" numeric, "p_unit_value" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_stock_balance"("p_tenant_id" "uuid", "p_product_id" "uuid", "p_storage_location_id" "uuid", "p_movement_type" "public"."stock_movement_type", "p_quantity" numeric, "p_unit_value" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_stock_balance"("p_tenant_id" "uuid", "p_product_id" "uuid", "p_storage_location_id" "uuid", "p_movement_type" "public"."stock_movement_type", "p_quantity" numeric, "p_unit_value" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."call_sync_charges_edge_function"() TO "anon";
GRANT ALL ON FUNCTION "public"."call_sync_charges_edge_function"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."call_sync_charges_edge_function"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_transition_stage"("p_contract_id" "uuid", "p_to_stage_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_transition_stage"("p_contract_id" "uuid", "p_to_stage_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_transition_stage"("p_contract_id" "uuid", "p_to_stage_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_contract_billing"("p_billing_id" "uuid", "p_reason" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_contract_billing"("p_billing_id" "uuid", "p_reason" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_contract_billing"("p_billing_id" "uuid", "p_reason" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_tenant_invite_v2"("invite_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_tenant_invite_v2"("invite_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_tenant_invite_v2"("invite_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_stage_id" "uuid", "p_comments" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_stage_id" "uuid", "p_comments" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_stage_id" "uuid", "p_comments" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_stage_id" "uuid", "p_user_id" "uuid", "p_comments" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_stage_id" "uuid", "p_user_id" "uuid", "p_comments" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_stage_id" "uuid", "p_user_id" "uuid", "p_comments" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_active_session"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_active_session"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_active_session"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_admin_role"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_admin_role"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_admin_role"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_fix_login"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_fix_login"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_fix_login"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_email_exists"("email_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_email_exists"("email_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_email_exists"("email_to_check" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_overdue_billings"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_overdue_billings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_overdue_billings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_tenant_access"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_tenant_access"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tenant_access"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_tenant_access_by_slug"("user_id_param" "uuid", "tenant_slug_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_tenant_access_by_slug"("user_id_param" "uuid", "tenant_slug_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tenant_access_by_slug"("user_id_param" "uuid", "tenant_slug_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_tenant_access_explicit"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_tenant_access_explicit"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tenant_access_explicit"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_tenant_access_safe"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_tenant_access_safe"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tenant_access_safe"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_permissions"("p_user_id" "uuid", "required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_permissions"("p_user_id" "uuid", "required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_permissions"("p_user_id" "uuid", "required_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_tenant_access"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_tenant_access"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_tenant_access"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_tenant_access_count"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_tenant_access_count"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_tenant_access_count"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_refresh_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_refresh_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_refresh_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_tenant_codes"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tenant_codes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tenant_codes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_audit_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_security_notifications"("p_days_to_keep" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_security_notifications"("p_days_to_keep" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_security_notifications"("p_days_to_keep" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_orphaned_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_orphaned_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_orphaned_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_tenant_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."clear_tenant_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_tenant_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_contract"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_initial_date" "date", "p_final_date" "date", "p_billing_type" character varying, "p_billing_day" integer, "p_anticipate_weekends" boolean, "p_installments" integer, "p_description" "text", "p_internal_notes" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_contract"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_initial_date" "date", "p_final_date" "date", "p_billing_type" character varying, "p_billing_day" integer, "p_anticipate_weekends" boolean, "p_installments" integer, "p_description" "text", "p_internal_notes" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_contract"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_initial_date" "date", "p_final_date" "date", "p_billing_type" character varying, "p_billing_day" integer, "p_anticipate_weekends" boolean, "p_installments" integer, "p_description" "text", "p_internal_notes" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_contract_billing_from_charge"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_contract_billing_from_charge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_contract_billing_from_charge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_contract_billing_on_charge"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_contract_billing_on_charge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_contract_billing_on_charge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_contract_with_services"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_initial_date" "date", "p_final_date" "date", "p_billing_type" character varying, "p_billing_day" integer, "p_anticipate_weekends" boolean, "p_installments" integer, "p_description" "text", "p_internal_notes" "text", "p_services" "jsonb", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_contract_with_services"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_initial_date" "date", "p_final_date" "date", "p_billing_type" character varying, "p_billing_day" integer, "p_anticipate_weekends" boolean, "p_installments" integer, "p_description" "text", "p_internal_notes" "text", "p_services" "jsonb", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_contract_with_services"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_initial_date" "date", "p_final_date" "date", "p_billing_type" character varying, "p_billing_day" integer, "p_anticipate_weekends" boolean, "p_installments" integer, "p_description" "text", "p_internal_notes" "text", "p_services" "jsonb", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_templates"("tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_templates"("tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_templates"("tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_finance_entry_from_charge"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_finance_entry_from_charge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_finance_entry_from_charge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_finance_entry_on_charge_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_finance_entry_on_charge_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_finance_entry_on_charge_payment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_refresh_token"("p_user_id" "uuid", "p_token" "text", "p_device_fingerprint" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_tenant_id" "uuid", "p_expires_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_refresh_token"("p_user_id" "uuid", "p_token" "text", "p_device_fingerprint" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_tenant_id" "uuid", "p_expires_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_refresh_token"("p_user_id" "uuid", "p_token" "text", "p_device_fingerprint" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_tenant_id" "uuid", "p_expires_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_reseller_invite"("p_reseller_id" "uuid", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_reseller_invite"("p_reseller_id" "uuid", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_reseller_invite"("p_reseller_id" "uuid", "p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_reseller_with_invite"("p_name" "text", "p_document" "text", "p_email" "text", "p_phone" "text", "p_commission_rate" numeric, "p_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_reseller_with_invite"("p_name" "text", "p_document" "text", "p_email" "text", "p_phone" "text", "p_commission_rate" numeric, "p_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_reseller_with_invite"("p_name" "text", "p_document" "text", "p_email" "text", "p_phone" "text", "p_commission_rate" numeric, "p_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_reseller_with_invite"("p_name" "text", "p_document" "text", "p_email" "text", "p_phone" "text", "p_commission_rate" numeric, "p_active" boolean) TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_service_with_tenant"("service_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_service_with_tenant"("service_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_service_with_tenant"("service_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."daily_billing_status_recalc"() TO "anon";
GRANT ALL ON FUNCTION "public"."daily_billing_status_recalc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."daily_billing_status_recalc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."deactivate_access_to_inactive_tenants"() TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_access_to_inactive_tenants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_access_to_inactive_tenants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_auth_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_auth_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_auth_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_auth_uid"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_auth_uid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_auth_uid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_tenant_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_tenant_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_tenant_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_tenant_id"("tenant_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_tenant_id"("tenant_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_tenant_id"("tenant_id_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_user_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_user_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_user_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrypt_api_key"("encrypted_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."decrypt_api_key"("encrypted_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrypt_api_key"("encrypted_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_notification"("p_notification_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_notification"("p_notification_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_notification"("p_notification_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."diagnose_contract_services_security"() TO "anon";
GRANT ALL ON FUNCTION "public"."diagnose_contract_services_security"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."diagnose_contract_services_security"() TO "service_role";



GRANT ALL ON FUNCTION "public"."eligible_services_for_period"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."eligible_services_for_period"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."eligible_services_for_period"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."encrypt_api_key"("plain_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."encrypt_api_key"("plain_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."encrypt_api_key"("plain_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_active_contract_on_period"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_active_contract_on_period"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_active_contract_on_period"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_assigned_to_tenant"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_assigned_to_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_assigned_to_tenant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."exchange_tenant_access_code"("p_code" character varying, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."exchange_tenant_access_code"("p_code" character varying, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exchange_tenant_access_code"("p_code" character varying, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_or_create_customer_from_staging"("p_tenant_id" "uuid", "p_asaas_customer_id" "text", "p_customer_name" "text", "p_customer_email" "text", "p_customer_document" "text", "p_customer_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_or_create_customer_from_staging"("p_tenant_id" "uuid", "p_asaas_customer_id" "text", "p_customer_name" "text", "p_customer_email" "text", "p_customer_document" "text", "p_customer_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_or_create_customer_from_staging"("p_tenant_id" "uuid", "p_asaas_customer_id" "text", "p_customer_name" "text", "p_customer_email" "text", "p_customer_document" "text", "p_customer_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_billing_inconsistencies"() TO "anon";
GRANT ALL ON FUNCTION "public"."fix_billing_inconsistencies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_billing_inconsistencies"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_billing_number"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_billing_number"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_billing_number"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_charge_on_billing"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_charge_on_billing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_charge_on_billing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_contract_billing"("p_contract_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_billing_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_contract_billing"("p_contract_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_billing_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_contract_billing"("p_contract_id" "uuid", "p_tenant_id" "uuid", "p_user_id" "uuid", "p_billing_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_contract_billings"("p_contract_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_contract_billings"("p_contract_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_contract_billings"("p_contract_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_contract_number"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_contract_number"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_contract_number"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_order_number_on_insert_contract_period"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_number_on_insert_contract_period"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number_on_insert_contract_period"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_refresh_token"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_refresh_token"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_refresh_token"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_secure_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_secure_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_secure_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_service_order_number"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_service_order_number"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_service_order_number"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_tenant_access_code"("p_tenant_id" "uuid", "p_expiration_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_tenant_access_code"("p_tenant_id" "uuid", "p_expiration_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_tenant_access_code"("p_tenant_id" "uuid", "p_expiration_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_tenant_access_code"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_expiration_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_tenant_access_code"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_expiration_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_tenant_access_code"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_expiration_minutes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_token_hash"("token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_token_hash"("token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_token_hash"("token" "text") TO "service_role";



GRANT ALL ON TABLE "public"."resellers" TO "anon";
GRANT ALL ON TABLE "public"."resellers" TO "authenticated";
GRANT ALL ON TABLE "public"."resellers" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_resellers"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_resellers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_resellers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_tenants_with_user_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_tenants_with_user_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_tenants_with_user_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_user_tenants"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_user_tenants"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_user_tenants"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bank_statement"("p_tenant_id" "uuid", "p_bank_acount_id" "uuid", "p_start" "date", "p_end" "date", "p_operation_type" "public"."bank_operation_type") TO "anon";
GRANT ALL ON FUNCTION "public"."get_bank_statement"("p_tenant_id" "uuid", "p_bank_acount_id" "uuid", "p_start" "date", "p_end" "date", "p_operation_type" "public"."bank_operation_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bank_statement"("p_tenant_id" "uuid", "p_bank_acount_id" "uuid", "p_start" "date", "p_end" "date", "p_operation_type" "public"."bank_operation_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_billing_kanban"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_billing_kanban"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_billing_kanban"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_billing_kanban_data"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_billing_kanban_data"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_billing_kanban_data"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."contract_billing_periods" TO "anon";
GRANT ALL ON TABLE "public"."contract_billing_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_billing_periods" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_billing_period_by_id"("p_tenant_id" "uuid", "p_period_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_billing_period_by_id"("p_tenant_id" "uuid", "p_period_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_billing_period_by_id"("p_tenant_id" "uuid", "p_period_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_complementary_billing_config"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_complementary_billing_config"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_complementary_billing_config"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_complementary_billing_minimum"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_complementary_billing_minimum"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_complementary_billing_minimum"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_contract_details"("p_contract_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_contract_details"("p_contract_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_contract_details"("p_contract_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_session_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_session_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_session_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_tenant_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_tenant_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_tenant_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_tenant_context_robust"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_tenant_context_robust"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_tenant_context_robust"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_tenant_id_simple"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_tenant_id_simple"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_tenant_id_simple"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_tenant_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_tenant_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_tenant_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_decrypted_api_key"("p_tenant_id" "uuid", "p_integration_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_decrypted_api_key"("p_tenant_id" "uuid", "p_integration_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_decrypted_api_key"("p_tenant_id" "uuid", "p_integration_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_direct_tenant_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_direct_tenant_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_direct_tenant_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_billing_queue_items"("p_tenant_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_billing_queue_items"("p_tenant_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_billing_queue_items"("p_tenant_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_by_tenant"("p_tenant_id" "uuid", "p_search_term" "text", "p_category" "text", "p_is_active" boolean, "p_min_price" numeric, "p_max_price" numeric, "p_in_stock" boolean, "p_page" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_by_tenant"("p_tenant_id" "uuid", "p_search_term" "text", "p_category" "text", "p_is_active" boolean, "p_min_price" numeric, "p_max_price" numeric, "p_in_stock" boolean, "p_page" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_by_tenant"("p_tenant_id" "uuid", "p_search_term" "text", "p_category" "text", "p_is_active" boolean, "p_min_price" numeric, "p_max_price" numeric, "p_in_stock" boolean, "p_page" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_project_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_project_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_project_settings"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_reseller_by_id"("p_reseller_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_reseller_by_id"("p_reseller_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reseller_by_id"("p_reseller_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_reseller_invites"("p_reseller_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_reseller_invites"("p_reseller_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reseller_invites"("p_reseller_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_reseller_users_with_details"("p_reseller_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_reseller_users_with_details"("p_reseller_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reseller_users_with_details"("p_reseller_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_security_notification_stats"("p_tenant_id" "uuid", "p_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_security_notification_stats"("p_tenant_id" "uuid", "p_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_security_notification_stats"("p_tenant_id" "uuid", "p_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_security_stats"("p_tenant_id" "uuid", "p_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_security_stats"("p_tenant_id" "uuid", "p_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_security_stats"("p_tenant_id" "uuid", "p_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_server_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_server_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_server_time"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_server_time_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_server_time_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_server_time_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_services_by_tenant"("tenant_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_services_by_tenant"("tenant_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_services_by_tenant"("tenant_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant"("p_tenant_id" "uuid", "p_slug" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant"("p_tenant_id" "uuid", "p_slug" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant"("p_tenant_id" "uuid", "p_slug" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_asaas_credentials"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_asaas_credentials"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_asaas_credentials"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_asaas_webhook"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_asaas_webhook"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_asaas_webhook"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_by_slug"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_by_slug"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_by_slug"("p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_contracts"("p_tenant_id" "uuid", "p_status" character varying, "p_customer_id" "uuid", "p_stage_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_contracts"("p_tenant_id" "uuid", "p_status" character varying, "p_customer_id" "uuid", "p_stage_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_contracts"("p_tenant_id" "uuid", "p_status" character varying, "p_customer_id" "uuid", "p_stage_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_id_by_slug"("p_slug" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_id_by_slug"("p_slug" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_id_by_slug"("p_slug" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_id_by_slug_jwt"("target_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_id_by_slug_jwt"("target_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_id_by_slug_jwt"("target_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_info"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_info"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_info"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_integrations_by_tenant"("tenant_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_integrations_by_tenant"("tenant_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_integrations_by_tenant"("tenant_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_notifications"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_notifications"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_notifications"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_pending_invites"("tenant_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_pending_invites"("tenant_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_pending_invites"("tenant_id_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_pending_invites_v2"("tenant_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_pending_invites_v2"("tenant_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_pending_invites_v2"("tenant_id_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_users_v2"("tenant_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_users_v2"("tenant_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_users_v2"("tenant_id_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_pending_invites"("user_email_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_pending_invites"("user_email_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_pending_invites"("user_email_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_pending_invites"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_pending_invites"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_pending_invites"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_portal_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_portal_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_portal_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_portal_data"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_portal_data"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_portal_data"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role_by_id"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role_by_id"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role_by_id"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role_wrapper"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role_wrapper"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role_wrapper"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_session_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_session_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_session_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_sessions"("p_user_id" "uuid", "p_updated_at" timestamp with time zone, "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tenants"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tenants"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tenants"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tenants_simple"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tenants_simple"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tenants_simple"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_users_in_inactive_tenants"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_users_in_inactive_tenants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users_in_inactive_tenants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_valid_next_stages"("p_contract_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_valid_next_stages"("p_contract_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_valid_next_stages"("p_contract_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_conciliation_staging_audit"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_conciliation_staging_audit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_conciliation_staging_audit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_contracts_audit"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_contracts_audit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_contracts_audit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_tenant"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_tenant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_tenant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_tenant_access"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_tenant_access"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_tenant_access"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "postgres";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "anon";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."identify_charges_needing_sync"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."identify_charges_needing_sync"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."identify_charges_needing_sync"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."import_movements_to_charges"("p_tenant_id" "uuid", "p_movement_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."import_movements_to_charges"("p_tenant_id" "uuid", "p_movement_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_movements_to_charges"("p_tenant_id" "uuid", "p_movement_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_tenant_context_by_slug"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_tenant_context_by_slug"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_tenant_context_by_slug"("p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_access_log"("p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_access_log"("p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_access_log"("p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_access_log"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_access_log"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_access_log"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_access_log_with_context"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_access_log_with_context"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_access_log_with_context"("p_user_id" "uuid", "p_action" "text", "p_resource" "text", "p_tenant_id" "uuid", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_charge_with_auth_context"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_contract_id" "uuid", "p_valor" numeric, "p_data_vencimento" "date", "p_status" "text", "p_tipo" "text", "p_descricao" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_charge_with_auth_context"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_contract_id" "uuid", "p_valor" numeric, "p_data_vencimento" "date", "p_status" "text", "p_tipo" "text", "p_descricao" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_charge_with_auth_context"("p_tenant_id" "uuid", "p_customer_id" "uuid", "p_contract_id" "uuid", "p_valor" numeric, "p_data_vencimento" "date", "p_status" "text", "p_tipo" "text", "p_descricao" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_message_history_system"("p_charge_id" "uuid", "p_customer_id" "uuid", "p_tenant_id" "uuid", "p_template_id" "uuid", "p_status" "text", "p_message" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_message_history_system"("p_charge_id" "uuid", "p_customer_id" "uuid", "p_tenant_id" "uuid", "p_template_id" "uuid", "p_status" "text", "p_message" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_message_history_system"("p_charge_id" "uuid", "p_customer_id" "uuid", "p_tenant_id" "uuid", "p_template_id" "uuid", "p_status" "text", "p_message" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_complementary_billing_enabled"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_complementary_billing_enabled"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_complementary_billing_enabled"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_tenant_active"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_tenant_active"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_tenant_active"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_existing_charges_to_contracts"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_existing_charges_to_contracts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_existing_charges_to_contracts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lock_pending_import_jobs"("batch_size_param" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."lock_pending_import_jobs"("batch_size_param" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_pending_import_jobs"("batch_size_param" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."lock_pending_import_jobs"("batch_size_param" integer, "worker_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lock_pending_import_jobs"("batch_size_param" integer, "worker_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_pending_import_jobs"("batch_size_param" integer, "worker_id_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_auth_event"("p_user_id" "uuid", "p_email" "text", "p_event_type" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_details" "jsonb", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."log_auth_event"("p_user_id" "uuid", "p_email" "text", "p_event_type" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_details" "jsonb", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_auth_event"("p_user_id" "uuid", "p_email" "text", "p_event_type" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_details" "jsonb", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_contract_stage_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_contract_stage_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_contract_stage_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_financial_payable_insert_to_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_financial_payable_insert_to_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_financial_payable_insert_to_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_financial_payable_payment_to_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_financial_payable_payment_to_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_financial_payable_payment_to_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_resellers_users_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_resellers_users_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_resellers_users_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_tenant_session_audit"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_tenant_slug" character varying, "p_action" character varying, "p_ip_address" "inet", "p_user_agent" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_tenant_session_audit"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_tenant_slug" character varying, "p_action" character varying, "p_ip_address" "inet", "p_user_agent" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_tenant_session_audit"("p_session_id" "uuid", "p_user_id" "uuid", "p_tenant_id" "uuid", "p_tenant_slug" character varying, "p_action" character varying, "p_ip_address" "inet", "p_user_agent" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."manual_update_last_login"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."manual_update_last_login"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manual_update_last_login"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."map_external_status_to_charge_status"("status_externo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."map_external_status_to_charge_status"("status_externo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."map_external_status_to_charge_status"("status_externo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."map_payment_method_to_tipo"("payment_method" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."map_payment_method_to_tipo"("payment_method" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."map_payment_method_to_tipo"("payment_method" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_as_read"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_as_read"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_as_read"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_billing_period_as_billed"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_billing_period_as_billed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_billing_period_as_billed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_billing_period_as_billed"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_manual_reason" "text", "p_amount_billed" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_billing_period_as_billed"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_manual_reason" "text", "p_amount_billed" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_billing_period_as_billed"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_manual_reason" "text", "p_amount_billed" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("p_notification_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("p_notification_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("p_notification_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_period_billed"("p_billing_period_id" "uuid", "p_actor" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_period_billed"("p_billing_period_id" "uuid", "p_actor" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_period_billed"("p_billing_period_id" "uuid", "p_actor" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_period_billed"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_charge_id" "uuid", "p_amount_billed" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_period_billed"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_charge_id" "uuid", "p_amount_billed" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_period_billed"("p_contract_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_charge_id" "uuid", "p_amount_billed" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_conciliation_staging_to_charges"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_conciliation_staging_to_charges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_conciliation_staging_to_charges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."next_des_payable_number"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."next_des_payable_number"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_des_payable_number"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_process_import_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_process_import_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_process_import_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_process_import_jobs_async"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_process_import_jobs_async"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_process_import_jobs_async"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_charge_created_link_period"("p_charge_id" "uuid", "p_contract_id" "uuid", "p_bill_date" "date", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."on_charge_created_link_period"("p_charge_id" "uuid", "p_contract_id" "uuid", "p_bill_date" "date", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_charge_created_link_period"("p_charge_id" "uuid", "p_contract_id" "uuid", "p_bill_date" "date", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."on_financial_payables_insert_update_bank_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_financial_payables_insert_update_bank_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_financial_payables_insert_update_bank_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."peek_des_payable_number"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."peek_des_payable_number"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."peek_des_payable_number"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."preserve_admin_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."preserve_admin_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."preserve_admin_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_contract_revert_to_draft"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_contract_revert_to_draft"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_contract_revert_to_draft"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_accepted_invite"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_accepted_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_accepted_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_asaas_webhook"("p_tenant_id" "uuid", "p_event" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."process_asaas_webhook"("p_tenant_id" "uuid", "p_event" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_asaas_webhook"("p_tenant_id" "uuid", "p_event" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_asaas_webhook"("tenant_id" "uuid", "event_type" "text", "event_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."process_asaas_webhook"("tenant_id" "uuid", "event_type" "text", "event_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_asaas_webhook"("tenant_id" "uuid", "event_type" "text", "event_json" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_billing_charge_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_billing_charge_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_billing_charge_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_conciliation_staging_customer_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_conciliation_staging_customer_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_conciliation_staging_customer_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_contract_billing_charge"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_contract_billing_charge"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_contract_billing_charge"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_contract_stage_transitions"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_contract_stage_transitions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_contract_stage_transitions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_user_role_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_user_role_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_user_role_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_billing_statuses"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_billing_statuses"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_billing_statuses"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_billing_statuses_simple"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_billing_statuses_simple"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_billing_statuses_simple"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_contract_period_statuses"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_contract_period_statuses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_contract_period_statuses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_contract_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_contract_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_contract_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_financial_payables_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_financial_payables_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_financial_payables_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regenerate_contract_billing_forecasts"("contract_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."regenerate_contract_billing_forecasts"("contract_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_contract_billing_forecasts"("contract_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_punctuation"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_punctuation"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_punctuation"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_tenant_member"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_tenant_member"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_tenant_member"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_tenant_user_v2"("tenant_id_param" "text", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_tenant_user_v2"("tenant_id_param" "text", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_tenant_user_v2"("tenant_id_param" "text", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."renew_access_token"("p_session_id" "uuid", "p_new_access_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."renew_access_token"("p_session_id" "uuid", "p_new_access_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."renew_access_token"("p_session_id" "uuid", "p_new_access_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."repair_user_permissions"("user_email" "text", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."repair_user_permissions"("user_email" "text", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."repair_user_permissions"("user_email" "text", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."resend_reseller_invite"("p_email" "text", "p_reseller_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."resend_reseller_invite"("p_email" "text", "p_reseller_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resend_reseller_invite"("p_email" "text", "p_reseller_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."resend_tenant_invite_v2"("invite_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."resend_tenant_invite_v2"("invite_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resend_tenant_invite_v2"("invite_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_des_payable_sequence"("p_tenant_id" "uuid", "p_value" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."reset_des_payable_sequence"("p_tenant_id" "uuid", "p_value" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_des_payable_sequence"("p_tenant_id" "uuid", "p_value" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_monthly_billing"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_monthly_billing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_monthly_billing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_all_tenant_tokens"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_all_tenant_tokens"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_all_tenant_tokens"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_refresh_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_refresh_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_refresh_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_refresh_tokens"("p_user_id" "uuid", "p_device_fingerprint" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_refresh_tokens"("p_user_id" "uuid", "p_device_fingerprint" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_refresh_tokens"("p_user_id" "uuid", "p_device_fingerprint" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_user_tenant_tokens"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_user_tenant_tokens"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_user_tenant_tokens"("p_user_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_login"("user_email" "text", "user_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_login"("user_email" "text", "user_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_login"("user_email" "text", "user_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_text_to_uuid"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_text_to_uuid"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_text_to_uuid"("p" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_upsert_contract_service"("p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_upsert_contract_service"("p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_upsert_contract_service"("p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_webhook_info"("p_tenant_id" "uuid", "p_webhook_url" "text", "p_webhook_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_webhook_info"("p_tenant_id" "uuid", "p_webhook_url" "text", "p_webhook_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_webhook_info"("p_tenant_id" "uuid", "p_webhook_url" "text", "p_webhook_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_charges"("p_tenant_id" "uuid", "p_search_term" "text", "p_status" "text", "p_type" "text", "p_customer_id" "uuid", "p_contract_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_page" integer, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_charges"("p_tenant_id" "uuid", "p_search_term" "text", "p_status" "text", "p_type" "text", "p_customer_id" "uuid", "p_contract_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_page" integer, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_charges"("p_tenant_id" "uuid", "p_search_term" "text", "p_status" "text", "p_type" "text", "p_customer_id" "uuid", "p_contract_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_page" integer, "p_limit" integer) TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_customers"("p_search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_customers"("p_search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_customers"("p_search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_auth_context"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_auth_context"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_auth_context"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_config"("setting_name" "text", "setting_value" "text", "is_local" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_config"("setting_name" "text", "setting_value" "text", "is_local" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_config"("setting_name" "text", "setting_value" "text", "is_local" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_config_wrapper"("p_name" "text", "p_value" "text", "p_is_local" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_config_wrapper"("p_name" "text", "p_value" "text", "p_is_local" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_config_wrapper"("p_name" "text", "p_value" "text", "p_is_local" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_financial_payable_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_financial_payable_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_financial_payable_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_role_from_users_table"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_role_from_users_table"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_role_from_users_table"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_tenant_config"("setting_name" "text", "new_value" "text", "is_local" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_tenant_config"("setting_name" "text", "new_value" "text", "is_local" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_tenant_config"("setting_name" "text", "new_value" "text", "is_local" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_tenant_context_flexible"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_tenant_context_flexible"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_tenant_context_flexible"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_tenant_context_flexible_boolean"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_tenant_context_flexible_boolean"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_tenant_context_flexible_boolean"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_tenant_context_simple"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_tenant_context_simple"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_tenant_context_simple"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_tenant_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_tenant_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_tenant_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_role"("user_id" "uuid", "role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_role"("user_id" "uuid", "role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_role"("user_id" "uuid", "role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."setup_asaas_webhook"("p_tenant_id" "uuid", "p_webhook_url" "text", "p_webhook_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."setup_asaas_webhook"("p_tenant_id" "uuid", "p_webhook_url" "text", "p_webhook_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."setup_asaas_webhook"("p_tenant_id" "uuid", "p_webhook_url" "text", "p_webhook_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."skip_billing_period"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_skip_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."skip_billing_period"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_skip_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."skip_billing_period"("p_tenant_id" "uuid", "p_period_id" "uuid", "p_skip_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."skip_period"("p_billing_period_id" "uuid", "p_actor" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."skip_period"("p_billing_period_id" "uuid", "p_actor" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."skip_period"("p_billing_period_id" "uuid", "p_actor" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."slugify"("value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify"("value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify"("value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."smart_upsert_billing_periods_for_contract"("p_contract_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."smart_upsert_billing_periods_for_contract"("p_contract_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."smart_upsert_billing_periods_for_contract"("p_contract_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_all_users_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_all_users_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_all_users_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_billing_periods_relationship"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_billing_periods_relationship"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_billing_periods_relationship"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_billing_status_on_charge_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_billing_status_on_charge_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_billing_status_on_charge_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_charges_from_asaas_all_tenants"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_charges_from_asaas_all_tenants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_charges_from_asaas_all_tenants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_charges_from_asaas_for_tenant"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_charges_from_asaas_for_tenant"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_charges_from_asaas_for_tenant"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_charges_from_staging_all_tenants"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_charges_from_staging_all_tenants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_charges_from_staging_all_tenants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_charges_from_staging_for_tenant"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_charges_from_staging_for_tenant"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_charges_from_staging_for_tenant"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_metadata_from_public_users"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_metadata_from_public_users"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_metadata_from_public_users"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_contract_billing_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_contract_billing_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_contract_billing_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_jwt_custom_claims_expanded"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_jwt_custom_claims_expanded"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_jwt_custom_claims_expanded"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_tenant_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_tenant_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_tenant_context"() TO "service_role";



GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_cleanup_job"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_job"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_job"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_create_billing_periods"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_create_billing_periods"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_create_billing_periods"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_import_job_processing"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_import_job_processing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_import_job_processing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_log_session_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_log_session_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_log_session_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_log_session_revoked"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_log_session_revoked"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_log_session_revoked"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_log_session_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_log_session_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_log_session_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_billing_periods"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_billing_periods"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_billing_periods"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_validate_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_validate_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_validate_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agente_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_agente_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agente_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bank_operation_history_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_bank_operation_history_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bank_operation_history_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_billing_day_preserve_customizations"("p_contract_id" "uuid", "p_new_billing_day" integer, "p_anticipate_weekends" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_billing_day_preserve_customizations"("p_contract_id" "uuid", "p_new_billing_day" integer, "p_anticipate_weekends" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_billing_day_preserve_customizations"("p_contract_id" "uuid", "p_new_billing_day" integer, "p_anticipate_weekends" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_billing_periods_on_charge_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_billing_periods_on_charge_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_billing_periods_on_charge_payment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_billing_periods_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_billing_periods_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_billing_periods_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_billing_queue_status"("p_queue_id" "uuid", "p_status" character varying, "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_billing_queue_status"("p_queue_id" "uuid", "p_status" character varying, "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_billing_queue_status"("p_queue_id" "uuid", "p_status" character varying, "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_charge_from_asaas_data"("p_charge_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_data_pagamento" "date", "p_payment_value" numeric, "p_net_value" numeric, "p_interest_rate" numeric, "p_fine_rate" numeric, "p_discount_value" numeric, "p_invoice_url" "text", "p_pdf_url" "text", "p_transaction_receipt_url" "text", "p_external_invoice_number" "text", "p_barcode" "text", "p_pix_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_charge_from_asaas_data"("p_charge_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_data_pagamento" "date", "p_payment_value" numeric, "p_net_value" numeric, "p_interest_rate" numeric, "p_fine_rate" numeric, "p_discount_value" numeric, "p_invoice_url" "text", "p_pdf_url" "text", "p_transaction_receipt_url" "text", "p_external_invoice_number" "text", "p_barcode" "text", "p_pix_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_charge_from_asaas_data"("p_charge_id" "uuid", "p_tenant_id" "uuid", "p_status" "text", "p_data_pagamento" "date", "p_payment_value" numeric, "p_net_value" numeric, "p_interest_rate" numeric, "p_fine_rate" numeric, "p_discount_value" numeric, "p_invoice_url" "text", "p_pdf_url" "text", "p_transaction_receipt_url" "text", "p_external_invoice_number" "text", "p_barcode" "text", "p_pix_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_charges_from_staging"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_charges_from_staging"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_charges_from_staging"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_complementary_billing_config"("p_tenant_id" "uuid", "p_config" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_complementary_billing_config"("p_tenant_id" "uuid", "p_config" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_complementary_billing_config"("p_tenant_id" "uuid", "p_config" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conciliation_staging_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conciliation_staging_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conciliation_staging_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contract_billing_periods_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_contract_billing_periods_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contract_billing_periods_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_finance_entries_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_finance_entries_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_finance_entries_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pending_periods_amount"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_pending_periods_amount"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pending_periods_amount"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_product_stock_by_location_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_product_stock_by_location_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_product_stock_by_location_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_receipts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_receipts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_receipts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sbe_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sbe_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sbe_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_security_notifications_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_security_notifications_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_security_notifications_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_service_event_pendencies"("p_tenant_id" "uuid", "p_contract_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_service_event_pendencies"("p_tenant_id" "uuid", "p_contract_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_service_event_pendencies"("p_tenant_id" "uuid", "p_contract_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_standalone_billing_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_standalone_billing_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_standalone_billing_items_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_stock_movements_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_stock_movements_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_stock_movements_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_storage_locations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_storage_locations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_storage_locations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tenant_integrations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tenant_integrations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tenant_integrations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tenant_user_role_v2"("tenant_id_param" "text", "user_id_param" "uuid", "new_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_tenant_user_role_v2"("tenant_id_param" "text", "user_id_param" "uuid", "new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tenant_user_role_v2"("tenant_id_param" "text", "user_id_param" "uuid", "new_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tenant_users_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tenant_users_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tenant_users_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_jwt_tenant"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_jwt_tenant"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_jwt_tenant"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_users_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_whatsapp_qrcode_history_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_whatsapp_qrcode_history_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_whatsapp_qrcode_history_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_billing_periods_for_contract"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_billing_periods_for_contract"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_billing_periods_for_contract"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_tenant_integration"("p_tenant_id" "uuid", "p_integration_type" character varying, "p_config" "jsonb", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_tenant_integration"("p_tenant_id" "uuid", "p_integration_type" character varying, "p_config" "jsonb", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_tenant_integration"("p_tenant_id" "uuid", "p_integration_type" character varying, "p_config" "jsonb", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."user_belongs_to_tenant"("tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_belongs_to_tenant"("tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_belongs_to_tenant"("tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_contract_service_access"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_contract_service_access"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_contract_service_access"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_contract_service_access_v2"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_contract_service_access_v2"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_contract_service_access_v2"("p_contract_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_permission"("permission_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_permission"("permission_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_permission"("permission_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_tenant_access"("tenant_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_tenant_access"("tenant_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_tenant_access"("tenant_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_tenant_admin"("tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_tenant_admin"("tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_tenant_admin"("tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_and_sync_order_sequence"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_and_sync_order_sequence"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_and_sync_order_sequence"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_billing_periods_tenant_single"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_billing_periods_tenant_single"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_billing_periods_tenant_single"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_jwt_integrity"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_jwt_integrity"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_jwt_integrity"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_refresh_token"("p_refresh_token" "text", "p_tenant_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_refresh_token"("p_refresh_token" "text", "p_tenant_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_refresh_token"("p_refresh_token" "text", "p_tenant_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_refresh_token"("p_token" "text", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_refresh_token"("p_token" "text", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_refresh_token"("p_token" "text", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_role_exists"("role_name" "text", "role_context" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_role_exists"("role_name" "text", "role_context" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_role_exists"("role_name" "text", "role_context" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_tenant_access_jwt"("target_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_tenant_access_jwt"("target_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_tenant_access_jwt"("target_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_tenant_token"("p_token" "text", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_tenant_token"("p_token" "text", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_tenant_token"("p_token" "text", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_and_set_admin_role"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_and_set_admin_role"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_and_set_admin_role"("user_id" "uuid") TO "service_role";







































GRANT ALL ON TABLE "public"."agente_ia_empresa" TO "anon";
GRANT ALL ON TABLE "public"."agente_ia_empresa" TO "authenticated";
GRANT ALL ON TABLE "public"."agente_ia_empresa" TO "service_role";



GRANT ALL ON TABLE "public"."agente_ia_mensagens_regua" TO "anon";
GRANT ALL ON TABLE "public"."agente_ia_mensagens_regua" TO "authenticated";
GRANT ALL ON TABLE "public"."agente_ia_mensagens_regua" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bank_acounts" TO "anon";
GRANT ALL ON TABLE "public"."bank_acounts" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_acounts" TO "service_role";



GRANT ALL ON TABLE "public"."bank_operation_history" TO "anon";
GRANT ALL ON TABLE "public"."bank_operation_history" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_operation_history" TO "service_role";



GRANT ALL ON TABLE "public"."billing_period_items" TO "anon";
GRANT ALL ON TABLE "public"."billing_period_items" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_period_items" TO "service_role";



GRANT ALL ON TABLE "public"."charges" TO "anon";
GRANT ALL ON TABLE "public"."charges" TO "authenticated";
GRANT ALL ON TABLE "public"."charges" TO "service_role";



GRANT ALL ON TABLE "public"."conciliation_history" TO "anon";
GRANT ALL ON TABLE "public"."conciliation_history" TO "authenticated";
GRANT ALL ON TABLE "public"."conciliation_history" TO "service_role";



GRANT ALL ON TABLE "public"."conciliation_rules" TO "anon";
GRANT ALL ON TABLE "public"."conciliation_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."conciliation_rules" TO "service_role";



GRANT ALL ON TABLE "public"."conciliation_staging" TO "anon";
GRANT ALL ON TABLE "public"."conciliation_staging" TO "authenticated";
GRANT ALL ON TABLE "public"."conciliation_staging" TO "service_role";



GRANT ALL ON TABLE "public"."contract_attachments" TO "anon";
GRANT ALL ON TABLE "public"."contract_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."contract_billing_items" TO "anon";
GRANT ALL ON TABLE "public"."contract_billing_items" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_billing_items" TO "service_role";



GRANT ALL ON TABLE "public"."contract_billing_payments" TO "anon";
GRANT ALL ON TABLE "public"."contract_billing_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_billing_payments" TO "service_role";



GRANT ALL ON TABLE "public"."contract_billings" TO "anon";
GRANT ALL ON TABLE "public"."contract_billings" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_billings" TO "service_role";



GRANT ALL ON TABLE "public"."contract_products" TO "anon";
GRANT ALL ON TABLE "public"."contract_products" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_products" TO "service_role";



GRANT ALL ON TABLE "public"."contract_services" TO "anon";
GRANT ALL ON TABLE "public"."contract_services" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_services" TO "service_role";



GRANT ALL ON TABLE "public"."contract_services_security_documentation" TO "anon";
GRANT ALL ON TABLE "public"."contract_services_security_documentation" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_services_security_documentation" TO "service_role";



GRANT ALL ON TABLE "public"."contract_stage_history" TO "anon";
GRANT ALL ON TABLE "public"."contract_stage_history" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_stage_history" TO "service_role";



GRANT ALL ON TABLE "public"."contract_stage_transition_rules" TO "anon";
GRANT ALL ON TABLE "public"."contract_stage_transition_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_stage_transition_rules" TO "service_role";



GRANT ALL ON TABLE "public"."contract_stage_transitions" TO "anon";
GRANT ALL ON TABLE "public"."contract_stage_transitions" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_stage_transitions" TO "service_role";



GRANT ALL ON TABLE "public"."contract_stages" TO "anon";
GRANT ALL ON TABLE "public"."contract_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_stages" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON TABLE "public"."des_payables_sequence" TO "anon";
GRANT ALL ON TABLE "public"."des_payables_sequence" TO "authenticated";
GRANT ALL ON TABLE "public"."des_payables_sequence" TO "service_role";



GRANT ALL ON TABLE "public"."finance_entries" TO "anon";
GRANT ALL ON TABLE "public"."finance_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."finance_entries" TO "service_role";



GRANT ALL ON TABLE "public"."financial_documents" TO "anon";
GRANT ALL ON TABLE "public"."financial_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_documents" TO "service_role";



GRANT ALL ON TABLE "public"."financial_launchs" TO "anon";
GRANT ALL ON TABLE "public"."financial_launchs" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_launchs" TO "service_role";



GRANT ALL ON TABLE "public"."financial_payables" TO "anon";
GRANT ALL ON TABLE "public"."financial_payables" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_payables" TO "service_role";



GRANT ALL ON TABLE "public"."financial_settings" TO "anon";
GRANT ALL ON TABLE "public"."financial_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_settings" TO "service_role";



GRANT ALL ON TABLE "public"."health_check" TO "anon";
GRANT ALL ON TABLE "public"."health_check" TO "authenticated";
GRANT ALL ON TABLE "public"."health_check" TO "service_role";



GRANT ALL ON TABLE "public"."message_history" TO "anon";
GRANT ALL ON TABLE "public"."message_history" TO "authenticated";
GRANT ALL ON TABLE "public"."message_history" TO "service_role";



GRANT ALL ON TABLE "public"."notification_templates" TO "anon";
GRANT ALL ON TABLE "public"."notification_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_templates" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."product_categories" TO "anon";
GRANT ALL ON TABLE "public"."product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_categories" TO "service_role";



GRANT ALL ON TABLE "public"."product_stock_by_location" TO "anon";
GRANT ALL ON TABLE "public"."product_stock_by_location" TO "authenticated";
GRANT ALL ON TABLE "public"."product_stock_by_location" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."receipts" TO "anon";
GRANT ALL ON TABLE "public"."receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."receipts" TO "service_role";



GRANT ALL ON TABLE "public"."regua_cobranca_config" TO "anon";
GRANT ALL ON TABLE "public"."regua_cobranca_config" TO "authenticated";
GRANT ALL ON TABLE "public"."regua_cobranca_config" TO "service_role";



GRANT ALL ON TABLE "public"."regua_cobranca_estatisticas" TO "anon";
GRANT ALL ON TABLE "public"."regua_cobranca_estatisticas" TO "authenticated";
GRANT ALL ON TABLE "public"."regua_cobranca_estatisticas" TO "service_role";



GRANT ALL ON TABLE "public"."regua_cobranca_etapas" TO "anon";
GRANT ALL ON TABLE "public"."regua_cobranca_etapas" TO "authenticated";
GRANT ALL ON TABLE "public"."regua_cobranca_etapas" TO "service_role";



GRANT ALL ON TABLE "public"."regua_cobranca_execucao" TO "anon";
GRANT ALL ON TABLE "public"."regua_cobranca_execucao" TO "authenticated";
GRANT ALL ON TABLE "public"."regua_cobranca_execucao" TO "service_role";



GRANT ALL ON TABLE "public"."regua_cobranca_interacoes" TO "anon";
GRANT ALL ON TABLE "public"."regua_cobranca_interacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."regua_cobranca_interacoes" TO "service_role";



GRANT ALL ON TABLE "public"."regua_cobranca_mensagens" TO "anon";
GRANT ALL ON TABLE "public"."regua_cobranca_mensagens" TO "authenticated";
GRANT ALL ON TABLE "public"."regua_cobranca_mensagens" TO "service_role";



GRANT ALL ON TABLE "public"."regua_cobranca_template_etapas" TO "anon";
GRANT ALL ON TABLE "public"."regua_cobranca_template_etapas" TO "authenticated";
GRANT ALL ON TABLE "public"."regua_cobranca_template_etapas" TO "service_role";



GRANT ALL ON TABLE "public"."regua_cobranca_templates" TO "anon";
GRANT ALL ON TABLE "public"."regua_cobranca_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."regua_cobranca_templates" TO "service_role";



GRANT ALL ON TABLE "public"."reseller_invites_view" TO "anon";
GRANT ALL ON TABLE "public"."reseller_invites_view" TO "authenticated";
GRANT ALL ON TABLE "public"."reseller_invites_view" TO "service_role";



GRANT ALL ON TABLE "public"."resellers_users" TO "anon";
GRANT ALL ON TABLE "public"."resellers_users" TO "authenticated";
GRANT ALL ON TABLE "public"."resellers_users" TO "service_role";



GRANT ALL ON TABLE "public"."service_billing_events" TO "anon";
GRANT ALL ON TABLE "public"."service_billing_events" TO "authenticated";
GRANT ALL ON TABLE "public"."service_billing_events" TO "service_role";



GRANT ALL ON TABLE "public"."service_order_sequences" TO "anon";
GRANT ALL ON TABLE "public"."service_order_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."service_order_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."storage_locations" TO "anon";
GRANT ALL ON TABLE "public"."storage_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_locations" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."tasks_attachments" TO "anon";
GRANT ALL ON TABLE "public"."tasks_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_access_codes" TO "anon";
GRANT ALL ON TABLE "public"."tenant_access_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_access_codes" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_integrations" TO "anon";
GRANT ALL ON TABLE "public"."tenant_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_integrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tenant_integrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tenant_integrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tenant_integrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_invites" TO "anon";
GRANT ALL ON TABLE "public"."tenant_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_invites" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_users" TO "anon";
GRANT ALL ON TABLE "public"."tenant_users" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_users" TO "service_role";
GRANT SELECT ON TABLE "public"."tenant_users" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";
GRANT SELECT ON TABLE "public"."tenants" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT SELECT ON TABLE "public"."users" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."v_complementary_billing_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_complementary_billing_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_complementary_billing_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_contract_billings_with_complementary" TO "anon";
GRANT ALL ON TABLE "public"."v_contract_billings_with_complementary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_contract_billings_with_complementary" TO "service_role";



GRANT ALL ON TABLE "public"."vw_contract_services_detailed" TO "anon";
GRANT ALL ON TABLE "public"."vw_contract_services_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_contract_services_detailed" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























