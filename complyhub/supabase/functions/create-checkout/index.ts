// Supabase Edge Function — create-checkout
// Crée une session Stripe Checkout pour un palier d'abonnement.
//
// Déploiement :
//   supabase functions deploy create-checkout
//
// Secrets requis (supabase secrets set ...) :
//   STRIPE_SECRET_KEY        clé secrète Stripe (sk_...)
//   STRIPE_PRICE_PRO         ID de prix Stripe pour le plan Pro (price_...)
//   STRIPE_PRICE_CABINET     ID de prix Stripe pour le plan Cabinet (price_...)
//
// L'authentification de l'appelant est gérée par Supabase (JWT vérifié).

import Stripe from 'https://esm.sh/stripe@16.8.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
})

const PRICE_BY_PLAN: Record<string, string | undefined> = {
  pro: Deno.env.get('STRIPE_PRICE_PRO'),
  cabinet: Deno.env.get('STRIPE_PRICE_CABINET'),
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { plan, origin } = await req.json()
    const priceId = PRICE_BY_PLAN[plan]
    if (!priceId) {
      return json({ error: `Aucun prix Stripe configuré pour le plan « ${plan} ».` }, 400)
    }

    // Identifie l'utilisateur appelant via son JWT.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return json({ error: 'Non authentifié.' }, 401)

    const base = origin ?? Deno.env.get('APP_URL') ?? ''
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan },
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
    })

    return json({ url: session.url })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
