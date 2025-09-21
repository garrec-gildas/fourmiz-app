import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Log de démarrage
    console.log('Starting auto-cancel process...')

    // Créer le client Supabase avec les permissions service_role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Appeler la fonction d'auto-annulation que nous avons créée
    const { data, error } = await supabase
      .rpc('auto_cancel_expired_orders')

    if (error) {
      console.error('Error calling auto_cancel_expired_orders:', error)
      throw error
    }

    const totalCancelled = data?.length || 0
    
    console.log(`Auto-cancel completed: ${totalCancelled} orders cancelled`)
    
    // Retourner le résultat
    return new Response(JSON.stringify({ 
      success: true, 
      cancelled_orders: data,
      total_cancelled: totalCancelled,
      timestamp: new Date().toISOString(),
      message: totalCancelled > 0 
        ? `Successfully cancelled ${totalCancelled} expired orders` 
        : 'No expired orders found to cancel'
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
      }
    })

  } catch (error) {
    console.error('Function execution error:', error)
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
})