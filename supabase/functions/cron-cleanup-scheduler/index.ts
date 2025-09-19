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

    // Verify this is being called by Supabase Cron or admin
    const cronSecret = req.headers.get('x-cron-secret')
    const adminKey = req.headers.get('x-admin-api-key')
    
    if (cronSecret !== Deno.env.get('CRON_SECRET') && adminKey !== Deno.env.get('ADMIN_API_KEY')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid cron secret or admin key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('[Cron Scheduler] Starting automated cleanup process...')

    // Call the cleanup function
    const cleanupUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cleanup-expired-tokens`
    
    const cleanupResponse = await fetch(cleanupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-api-key': Deno.env.get('ADMIN_API_KEY') ?? '',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    })

    if (!cleanupResponse.ok) {
      const errorText = await cleanupResponse.text()
      throw new Error(`Cleanup function failed: ${cleanupResponse.status} - ${errorText}`)
    }

    const cleanupResult = await cleanupResponse.json()
    
    console.log('[Cron Scheduler] Cleanup completed:', cleanupResult)

    // Log the cron execution
    await supabaseClient
      .from('audit_logs')
      .insert({
        entity_type: 'system',
        entity_id: null,
        tenant_id: null,
        action: 'CRON_CLEANUP_EXECUTED',
        old_data: null,
        new_data: {
          execution_timestamp: new Date().toISOString(),
          cleanup_result: cleanupResult,
          triggered_by: cronSecret ? 'cron' : 'admin'
        },
        changed_fields: null,
        user_id: null,
        timestamp: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Cron cleanup executed successfully',
        cleanupResult
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in cron-cleanup-scheduler:', error)
    
    // Try to log the error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabaseClient
        .from('audit_logs')
        .insert({
          entity_type: 'system',
          entity_id: null,
          tenant_id: null,
          action: 'CRON_CLEANUP_ERROR',
          old_data: null,
          new_data: {
            error_timestamp: new Date().toISOString(),
            error_message: error.message,
            error_stack: error.stack
          },
          changed_fields: null,
          user_id: null,
          timestamp: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log cron error:', logError)
    }

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
