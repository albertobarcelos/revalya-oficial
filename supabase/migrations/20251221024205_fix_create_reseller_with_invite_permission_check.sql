-- =====================================================
-- Migration: Corrigir Verificação de Permissão em create_reseller_with_invite
-- Data: 2025-12-21
-- Descrição: Corrige a verificação de permissão para usar user_role = 'ADMIN'
--            ao invés de role = 'admin' (coluna e valor incorretos)
-- =====================================================

BEGIN;

-- AIDEV-NOTE: Corrigir função create_reseller_with_invite
-- A função estava verificando role = 'admin' quando deveria verificar user_role = 'ADMIN'
-- A coluna correta é user_role e o valor é 'ADMIN' (uppercase)
CREATE OR REPLACE FUNCTION public.create_reseller_with_invite(
    p_name text,
    p_document text,
    p_email text,
    p_phone text,
    p_commission_rate numeric,
    p_active boolean DEFAULT true
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_reseller_id uuid;
    v_invite_id uuid;
    v_token text;
    v_result json;
BEGIN
    -- AIDEV-NOTE: Verificar se o usuário tem permissão ADMIN
    -- Corrigido: usar user_role ao invés de role, e 'ADMIN' (uppercase) ao invés de 'admin'
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND user_role = 'ADMIN'
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

-- Comentários descritivos
COMMENT ON FUNCTION public.create_reseller_with_invite IS 
  'Cria um revendedor e gera um convite. Requer permissão ADMIN (user_role = ''ADMIN'')';

COMMIT;

