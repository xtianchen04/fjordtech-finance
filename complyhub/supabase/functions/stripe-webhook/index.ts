// Supabase Edge Function — stripe-webhook
// Met à jour organizations.subscription_tier après un paiement Stripe réussi.
//
// Déploiement (la vérification JWT doit être désactivée pour les webhooks) :
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Secrets requis :
//   STRIPE_SECRET_KEY            clé secrète Stripe (sk_...)
//   STRIPE_WEBHOOK_SECRET        secret de signature du webhook (whsec_...)
//   SUPABASE_URL                 (injecté automatiquement)
//   SUPABASE_SERVICE_ROLE_KEY    clé service_role (pour écrire malgré la RLS)
//
// Configurez l'endpoint dans Stripe → Developers → Webhooks :
//   https://<projet>.supabase.co/functions/v1/stripe-webhook
//   Événement : checkout.session.completed

import Stripe from 'https://esm.sh/stripe@16.8.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
})

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature ?? '',
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
    )
  } catch (err) {
    return new Response(`Signature invalide : ${(err as Error).message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id ?? session.client_reference_id
    const plan = session.metadata?.plan ?? 'pro'

    if (userId) {
      // Met à jour le palier de l'organisation appartenant à cet utilisateur.
      const { error } = await admin
        .from('organizations')
        .update({ subscription_tier: plan })
        .eq('created_by', userId)
      if (error) return new Response(error.message, { status: 500 })
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
