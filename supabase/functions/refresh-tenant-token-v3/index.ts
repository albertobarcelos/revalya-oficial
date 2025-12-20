/**
 * Edge Function: refresh-tenant-token-v3
 * 
 * Renova access tokens usando refresh tokens válidos.
 * Implementa o padrão "orbi-pixel" da Omie para renovação segura de sessões.
 * 
 * MELHORIAS V3:
 * - Validação rigorosa de refresh tokens
 * - Rotação automática de refresh tokens (opcional)
 * - Logs de segurança aprimorados
 * - Compatibilidade com TenantSessionManager
 * - Detecção de tokens comprometidos
 */ import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create, verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Configurações de renovação
const CONFIG = {
  ACCESS_TOKEN_EXPIRY_HOURS: 1,
  REFRESH_TOKEN_ROTATION: false,
  MAX_REFRESH_ATTEMPTS: 5,
  SECURITY_LOG_ENABLED: true
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { refreshToken, tenantSlug } = await req.json();
    // Validar parâmetros obrigatórios
    if (!refreshToken || !tenantSlug) {
      return new Response(JSON.stringify({
        error: 'Parâmetros obrigatórios: refreshToken, tenantSlug'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Obter chave JWT
    const jwtSecret = Deno.env.get('JWT_PRIVATE_KEY');
    if (!jwtSecret) {
      console.error('[refresh-tenant-token-v3] JWT_PRIVATE_KEY não configurado');
      throw new Error('Configuração de JWT não encontrada');
    }
    // Verificar e decodificar refresh token
    let refreshPayload;
    try {
      refreshPayload = await verify(refreshToken, jwtSecret);
    } catch (error) {
      console.log('[refresh-tenant-token-v3] Refresh token inválido:', error.message);
      return new Response(JSON.stringify({
        error: 'Refresh token inválido ou expirado'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Validar payload do refresh token
    if (refreshPayload.type !== 'refresh' || refreshPayload.tenant_slug !== tenantSlug) {
      console.log('[refresh-tenant-token-v3] Refresh token inválido para tenant:', tenantSlug);
      return new Response(JSON.stringify({
        error: 'Refresh token inválido para este tenant'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { user_id: userId, email: userEmail, tenant_id: tenantId } = refreshPayload;
    // Verificar se sessão ainda está ativa no banco
    const { data: sessionData, error: sessionError } = await supabaseClient.from('tenant_refresh_sessions').select('id, is_active, refresh_expires_at, last_access').eq('user_id', userId).eq('tenant_id', tenantId).eq('refresh_token', refreshToken).eq('is_active', true).single();
    if (sessionError || !sessionData) {
      console.log('[refresh-tenant-token-v3] Sessão não encontrada ou inativa:', sessionError);
      return new Response(JSON.stringify({
        error: 'Sessão não encontrada ou expirada'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verificar se usuário ainda tem acesso ao tenant
    const { data: tenantAccess, error: accessError } = await supabaseClient.from('tenant_users').select('id, role, is_active').eq('tenant_id', tenantId).eq('user_id', userId).eq('is_active', true).single();
    if (accessError || !tenantAccess) {
      console.log(`[refresh-tenant-token-v3] Acesso revogado para usuário ${userId} no tenant ${tenantId}`);
      // Desativar sessão
      await supabaseClient.from('tenant_refresh_sessions').update({
        is_active: false
      }).eq('id', sessionData.id);
      return new Response(JSON.stringify({
        error: 'Acesso ao tenant foi revogado'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Verificar se tenant ainda está ativo
    const { data: tenant, error: tenantError } = await supabaseClient.from('tenants').select('id, slug, is_active').eq('id', tenantId).eq('slug', tenantSlug).eq('is_active', true).single();
    if (tenantError || !tenant) {
      console.log(`[refresh-tenant-token-v3] Tenant inativo: ${tenantId}/${tenantSlug}`);
      // Desativar sessão
      await supabaseClient.from('tenant_refresh_sessions').update({
        is_active: false
      }).eq('id', sessionData.id);
      return new Response(JSON.stringify({
        error: 'Tenant não está mais ativo'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Gerar novo access token
    const accessTokenPayload = {
      user_id: userId,
      email: userEmail,
      tenant_id: tenantId,
      tenant_slug: tenantSlug,
      role: tenantAccess.role,
      type: 'access',
      exp: Math.floor(Date.now() / 1000) + CONFIG.ACCESS_TOKEN_EXPIRY_HOURS * 60 * 60,
      iat: Math.floor(Date.now() / 1000)
    };
    const newAccessToken = await create({
      alg: 'HS256',
      typ: 'JWT'
    }, accessTokenPayload, jwtSecret);
    let newRefreshToken = refreshToken;
    let newRefreshExpiry = refreshPayload.exp;
    // Rotação de refresh token (se habilitada)
    if (CONFIG.REFRESH_TOKEN_ROTATION) {
      const newRefreshPayload = {
        user_id: userId,
        email: userEmail,
        tenant_id: tenantId,
        tenant_slug: tenantSlug,
        type: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        iat: Math.floor(Date.now() / 1000)
      };
      newRefreshToken = await create({
        alg: 'HS256',
        typ: 'JWT'
      }, newRefreshPayload, jwtSecret);
      newRefreshExpiry = newRefreshPayload.exp;
    }
    // Atualizar sessão no banco
    const { error: updateError } = await supabaseClient.from('tenant_refresh_sessions').update({
      access_token: newAccessToken,
      access_expires_at: new Date(accessTokenPayload.exp * 1000).toISOString(),
      refresh_token: newRefreshToken,
      refresh_expires_at: new Date(newRefreshExpiry * 1000).toISOString(),
      last_access: new Date().toISOString(),
      user_agent: req.headers.get('user-agent'),
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    }).eq('id', sessionData.id);
    if (updateError) {
      console.error('[refresh-tenant-token-v3] Erro ao atualizar sessão:', updateError);
    // Não falhar a requisição, apenas logar
    }
    // Log de auditoria
    if (CONFIG.SECURITY_LOG_ENABLED) {
      await supabaseClient.from('audit_logs').insert({
        user_id: userId,
        tenant_id: tenantId,
        action: 'TENANT_TOKEN_REFRESHED_V3',
        details: {
          tenant_slug: tenantSlug,
          token_rotated: CONFIG.REFRESH_TOKEN_ROTATION,
          user_agent: req.headers.get('user-agent'),
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          version: 'v3'
        },
        created_at: new Date().toISOString()
      });
    }
    // Preparar resposta
    const response = {
      accessToken: newAccessToken,
      expiresAt: accessTokenPayload.exp * 1000
    };
    // Incluir novo refresh token se rotação estiver habilitada
    if (CONFIG.REFRESH_TOKEN_ROTATION) {
      response.refreshToken = newRefreshToken;
    }
    console.log(`[refresh-tenant-token-v3] Token renovado com sucesso para usuário ${userId} no tenant ${tenantSlug}`);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[refresh-tenant-token-v3] Erro na renovação de token:', error);
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
