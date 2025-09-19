import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Verify admin API key for security
    const apiKey = req.headers.get('x-admin-api-key')
    if (apiKey !== Deno.env.get('ADMIN_API_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const now = new Date().toISOString()
    let totalCleaned = 0

    // 1. Clean expired tenant_access_codes
    console.log('[Cleanup] Cleaning expired tenant access codes...')
    const { data: expiredCodes, error: codesError } = await supabaseClient
      .from('tenant_access_codes')
      .delete()
      .lt('expires_at', now)
      .select('id')

    if (codesError) {
      console.error('Error cleaning access codes:', codesError)
    } else {
      const codesCount = expiredCodes?.length || 0
      totalCleaned += codesCount
      console.log(`[Cleanup] Removed ${codesCount} expired access codes`)
    }

    // 2. Clean expired tenant_refresh_tokens
    console.log('[Cleanup] Cleaning expired refresh tokens...')
    const { data: expiredRefreshTokens, error: refreshError } = await supabaseClient
      .from('tenant_refresh_tokens')
      .delete()
      .lt('expires_at', now)
      .select('id')

    if (refreshError) {
      console.error('Error cleaning refresh tokens:', refreshError)
    } else {
      const refreshCount = expiredRefreshTokens?.length || 0
      totalCleaned += refreshCount
      console.log(`[Cleanup] Removed ${refreshCount} expired refresh tokens`)
    }

    // 3. Clean revoked refresh tokens older than 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    console.log('[Cleanup] Cleaning old revoked refresh tokens...')
    const { data: revokedTokens, error: revokedError } = await supabaseClient
      .from('tenant_refresh_tokens')
      .delete()
      .not('revoked_at', 'is', null)
      .lt('revoked_at', sevenDaysAgo.toISOString())
      .select('id')

    if (revokedError) {
      console.error('Error cleaning revoked tokens:', revokedError)
    } else {
      const revokedCount = revokedTokens?.length || 0
      totalCleaned += revokedCount
      console.log(`[Cleanup] Removed ${revokedCount} old revoked refresh tokens`)
    }

    // 4. Clean inactive tenant_refresh_sessions older than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    console.log('[Cleanup] Cleaning old inactive sessions...')
    const { data: inactiveSessions, error: sessionsError } = await supabaseClient
      .from('tenant_refresh_sessions')
      .delete()
      .eq('is_active', false)
      .lt('last_access', thirtyDaysAgo.toISOString())
      .select('id')

    if (sessionsError) {
      console.error('Error cleaning inactive sessions:', sessionsError)
    } else {
      const sessionsCount = inactiveSessions?.length || 0
      totalCleaned += sessionsCount
      console.log(`[Cleanup] Removed ${sessionsCount} old inactive sessions`)
    }

    // 5. Clean expired sessions (refresh_expires_at < now)
    console.log('[Cleanup] Cleaning expired sessions...')
    const { data: expiredSessions, error: expiredSessionsError } = await supabaseClient
      .from('tenant_refresh_sessions')
      .delete()
      .lt('refresh_expires_at', now)
      .select('id')

    if (expiredSessionsError) {
      console.error('Error cleaning expired sessions:', expiredSessionsError)
    } else {
      const expiredSessionsCount = expiredSessions?.length || 0
      totalCleaned += expiredSessionsCount
      console.log(`[Cleanup] Removed ${expiredSessionsCount} expired sessions`)
    }

    // 6. Clean old audit logs (older than 90 days) to prevent table bloat
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    console.log('[Cleanup] Cleaning old audit logs...')
    const { data: oldAuditLogs, error: auditError } = await supabaseClient
      .from('tenant_sessions_audit')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString())
      .select('id')

    if (auditError) {
      console.error('Error cleaning audit logs:', auditError)
    } else {
      const auditCount = oldAuditLogs?.length || 0
      totalCleaned += auditCount
      console.log(`[Cleanup] Removed ${auditCount} old audit logs`)
    }

    // 7. Clean orphaned sessions (sessions without valid refresh tokens)
    console.log('[Cleanup] Cleaning orphaned sessions...')
    const { data: orphanedSessions, error: orphanedError } = await supabaseClient
      .rpc('cleanup_orphaned_sessions')

    if (orphanedError) {
      console.error('Error cleaning orphaned sessions:', orphanedError)
    } else {
      const orphanedCount = orphanedSessions || 0
      totalCleaned += orphanedCount
      console.log(`[Cleanup] Removed ${orphanedCount} orphaned sessions`)
    }

    // Log cleanup summary
    await supabaseClient
      .from('audit_logs')
      .insert({
        entity_type: 'system',
        entity_id: null,
        tenant_id: null,
        action: 'CLEANUP_EXPIRED_TOKENS',
        old_data: null,
        new_data: {
          total_cleaned: totalCleaned,
          cleanup_timestamp: now,
          details: {
            expired_codes: expiredCodes?.length || 0,
            expired_refresh_tokens: expiredRefreshTokens?.length || 0,
            revoked_tokens: revokedTokens?.length || 0,
            inactive_sessions: inactiveSessions?.length || 0,
            expired_sessions: expiredSessions?.length || 0,
            old_audit_logs: oldAuditLogs?.length || 0,
            orphaned_sessions: orphanedSessions || 0
          }
        },
        changed_fields: null,
        user_id: null,
        timestamp: now
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Cleanup completed successfully`,
        totalCleaned,
        details: {
          expiredCodes: expiredCodes?.length || 0,
          expiredRefreshTokens: expiredRefreshTokens?.length || 0,
          revokedTokens: revokedTokens?.length || 0,
          inactiveSessions: inactiveSessions?.length || 0,
          expiredSessions: expiredSessions?.length || 0,
          oldAuditLogs: oldAuditLogs?.length || 0,
          orphanedSessions: orphanedSessions || 0
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in cleanup-expired-tokens:', error)
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
