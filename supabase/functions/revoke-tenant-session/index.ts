import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevokeSessionRequest {
  sessionId?: string;
  refreshToken?: string;
  revokeAll?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { sessionId, refreshToken, revokeAll }: RevokeSessionRequest = await req.json()

    // Get tenant slug from URL
    const url = new URL(req.url)
    const tenantSlug = url.pathname.split('/').pop()

    if (!tenantSlug) {
      return new Response(
        JSON.stringify({ error: 'Tenant slug is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate tenant access
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check user access to tenant
    const { data: userTenant, error: userTenantError } = await supabaseClient
      .from('user_tenants')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
      .single()

    if (userTenantError || !userTenant) {
      return new Response(
        JSON.stringify({ error: 'Access denied to tenant' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let revokedSessions = 0

    if (revokeAll) {
      // Revoke all sessions for user in this tenant
      const { data: sessions, error: sessionsError } = await supabaseClient
        .from('tenant_refresh_sessions')
        .select('id, refresh_token')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)

      if (sessionsError) {
        throw new Error(`Failed to fetch sessions: ${sessionsError.message}`)
      }

      if (sessions && sessions.length > 0) {
        // Mark sessions as inactive
        const { error: updateError } = await supabaseClient
          .from('tenant_refresh_sessions')
          .update({ 
            is_active: false,
            last_access: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)

        if (updateError) {
          throw new Error(`Failed to revoke sessions: ${updateError.message}`)
        }

        // Also revoke refresh tokens
        const { error: tokenError } = await supabaseClient
          .from('tenant_refresh_tokens')
          .update({ 
            revoked_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('tenant_id', tenant.id)
          .is('revoked_at', null)

        if (tokenError) {
          console.error('Failed to revoke refresh tokens:', tokenError)
        }

        revokedSessions = sessions.length

        // Log audit trail for each session
        for (const session of sessions) {
          await supabaseClient
            .from('tenant_sessions_audit')
            .insert({
              session_id: session.id,
              user_id: user.id,
              tenant_id: tenant.id,
              tenant_slug: tenantSlug,
              action: 'revoked',
              ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
              user_agent: req.headers.get('user-agent'),
              metadata: { 
                revoke_type: 'all_sessions',
                revoked_by: 'user_request'
              }
            })
        }
      }
    } else if (sessionId) {
      // Revoke specific session by ID
      const { data: session, error: sessionError } = await supabaseClient
        .from('tenant_refresh_sessions')
        .select('id, refresh_token')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .single()

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found or already revoked' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Mark session as inactive
      const { error: updateError } = await supabaseClient
        .from('tenant_refresh_sessions')
        .update({ 
          is_active: false,
          last_access: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (updateError) {
        throw new Error(`Failed to revoke session: ${updateError.message}`)
      }

      // Also revoke the refresh token
      const { error: tokenError } = await supabaseClient
        .from('tenant_refresh_tokens')
        .update({ 
          revoked_at: new Date().toISOString()
        })
        .eq('token', session.refresh_token)

      if (tokenError) {
        console.error('Failed to revoke refresh token:', tokenError)
      }

      revokedSessions = 1

      // Log audit trail
      await supabaseClient
        .from('tenant_sessions_audit')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          tenant_id: tenant.id,
          tenant_slug: tenantSlug,
          action: 'revoked',
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
          metadata: { 
            revoke_type: 'single_session',
            revoked_by: 'user_request'
          }
        })

    } else if (refreshToken) {
      // Revoke session by refresh token
      const { data: session, error: sessionError } = await supabaseClient
        .from('tenant_refresh_sessions')
        .select('id')
        .eq('refresh_token', refreshToken)
        .eq('user_id', user.id)
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .single()

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found or already revoked' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Mark session as inactive
      const { error: updateError } = await supabaseClient
        .from('tenant_refresh_sessions')
        .update({ 
          is_active: false,
          last_access: new Date().toISOString()
        })
        .eq('refresh_token', refreshToken)

      if (updateError) {
        throw new Error(`Failed to revoke session: ${updateError.message}`)
      }

      // Also revoke the refresh token
      const { error: tokenError } = await supabaseClient
        .from('tenant_refresh_tokens')
        .update({ 
          revoked_at: new Date().toISOString()
        })
        .eq('token', refreshToken)

      if (tokenError) {
        console.error('Failed to revoke refresh token:', tokenError)
      }

      revokedSessions = 1

      // Log audit trail
      await supabaseClient
        .from('tenant_sessions_audit')
        .insert({
          session_id: session.id,
          user_id: user.id,
          tenant_id: tenant.id,
          tenant_slug: tenantSlug,
          action: 'revoked',
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
          metadata: { 
            revoke_type: 'by_refresh_token',
            revoked_by: 'user_request'
          }
        })

    } else {
      return new Response(
        JSON.stringify({ error: 'Either sessionId, refreshToken, or revokeAll must be provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully revoked ${revokedSessions} session(s)`,
        revokedSessions
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in revoke-tenant-session:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
