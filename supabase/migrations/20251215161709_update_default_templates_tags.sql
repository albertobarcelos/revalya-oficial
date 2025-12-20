-- =====================================================
-- AIDEV-NOTE: Atualizar função create_default_templates para usar tags centralizadas
-- Data: 2025-12-15
-- Descrição: Atualiza os templates padrão criados ao criar um tenant para usar
--             as tags corretas do arquivo centralizado messageTags.ts
-- =====================================================

-- AIDEV-NOTE: Recriar função create_default_templates com tags atualizadas
-- Tags corretas (do arquivo centralizado messageTags.ts):
-- - {cliente.nome} ✅
-- - {cliente.empresa} ✅
-- - {cobranca.valor} ✅
-- - {cobranca.vencimento} ✅
-- - {cobranca.link} ✅ (substitui {cobranca.linkPagamento})
-- - {dias.ateVencimento} ✅
-- - {dias.aposVencimento} ✅

CREATE OR REPLACE FUNCTION public.create_default_templates(tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- AIDEV-NOTE: Comentário na função para documentação
COMMENT ON FUNCTION public.create_default_templates(uuid) IS 
'Cria templates padrão de mensagem para um novo tenant. 
Usa apenas tags do arquivo centralizado messageTags.ts:
- {cliente.nome}, {cliente.empresa}
- {cobranca.valor}, {cobranca.vencimento}, {cobranca.link}
- {dias.ateVencimento}, {dias.aposVencimento}';

