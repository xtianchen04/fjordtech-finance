// ============================================================
//  Edge Function — Alertes de conformité par courriel
//  Calcule, côté serveur, les alertes (permis bientôt expiré / expiré,
//  conditions manquantes) pour chaque organisation ayant activé les
//  notifications, et envoie un courriel récapitulatif via Resend.
//
//  À déployer :   supabase functions deploy send-alerts
//  Secrets requis (supabase secrets set …) :
//    - SUPABASE_URL                (fourni par la plateforme)
//    - SUPABASE_SERVICE_ROLE_KEY   (lecture multi-organisations, contourne la RLS)
//    - RESEND_API_KEY              (https://resend.com)
//    - ALERTS_FROM                 (ex. "ComplyHub <alertes@votredomaine.ca>")
//
//  Déclenchement quotidien : voir migrations/2026-06_schedule_send_alerts.sql
//  (pg_cron) ou un planificateur externe qui appelle cette fonction.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const ALERTS_FROM = Deno.env.get('ALERTS_FROM') ?? 'ComplyHub <onboarding@resend.dev>'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

type Alert = { severity: 'missing' | 'warn'; title: string; detail: string }

// Réplique de computeAlerts() (src/lib/api.js) côté serveur.
function computeAlerts(workers: any[], complianceByWorker: Record<string, any[]>, windowDays = 90): Alert[] {
  const alerts: Alert[] = []
  const today = new Date()

  for (const w of workers) {
    if (w.permit_expiry) {
      const exp = new Date(w.permit_expiry)
      const days = Math.ceil((exp.getTime() - today.getTime()) / 86_400_000)
      if (days < 0) {
        alerts.push({
          severity: 'missing',
          title: `Permis expiré — ${w.full_name}`,
          detail: `Le permis de travail a expiré il y a ${Math.abs(days)} jour(s).`,
        })
      } else if (days <= windowDays) {
        alerts.push({
          severity: 'warn',
          title: `Permis bientôt expiré — ${w.full_name}`,
          detail: `Le permis de travail expire dans ${days} jour(s).`,
        })
      }
    }

    const rows = complianceByWorker[w.id] ?? []
    for (const r of rows.filter((r) => r.status === 'missing')) {
      alerts.push({
        severity: 'missing',
        title: `Condition manquante — ${w.full_name}`,
        detail: r.condition?.label ?? 'Condition de conformité non satisfaite.',
      })
    }
  }

  const rank: Record<string, number> = { missing: 0, warn: 1 }
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity])
}

function renderEmail(orgName: string, alerts: Alert[]): string {
  const rows = alerts
    .map((a) => {
      const color = a.severity === 'missing' ? '#D1495B' : '#E0A030'
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E8F1F8;vertical-align:top">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:8px"></span>
          <strong style="color:#0B1F33">${a.title}</strong>
          <div style="color:#5E7385;font-size:13px;margin-top:2px">${a.detail}</div>
        </td>
      </tr>`
    })
    .join('')

  return `<!doctype html><html><body style="margin:0;background:#F4F7FA;font-family:Segoe UI,system-ui,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#0B1F33;border-radius:14px 14px 0 0;padding:18px 22px;color:#fff">
        <span style="font-size:18px;font-weight:800;font-family:Georgia,serif">ComplyHub</span>
        <span style="color:#5AA0DC;font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin-left:8px">Alertes de conformité</span>
      </div>
      <div style="background:#fff;border-radius:0 0 14px 14px;padding:22px">
        <p style="color:#0B1F33;font-size:14px">Bonjour,</p>
        <p style="color:#5E7385;font-size:14px">Voici les éléments de conformité requérant votre attention pour
          <strong style="color:#0B1F33">${orgName}</strong> :</p>
        <table style="width:100%;border-collapse:collapse;margin:14px 0">${rows}</table>
        <p style="color:#9FB0BF;font-size:12px;margin-top:18px">
          Vous recevez ce courriel parce que les notifications sont activées dans les paramètres de votre
          organisation ComplyHub. ComplyHub ne fournit pas de conseil juridique en immigration.
        </p>
      </div>
    </div>
  </body></html>`
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: ALERTS_FROM, to, subject, html }),
  })
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`)
  }
}

Deno.serve(async () => {
  try {
    // Organisations ayant activé les notifications avec une adresse valide.
    const { data: orgs, error: orgErr } = await admin
      .from('organizations')
      .select('id, name, notify_email, alert_window_days, notify_enabled')
      .eq('notify_enabled', true)
      .not('notify_email', 'is', null)
    if (orgErr) throw orgErr

    let sent = 0
    const results: any[] = []

    for (const org of orgs ?? []) {
      const { data: workers } = await admin.from('workers').select('*').eq('org_id', org.id)
      const ids = (workers ?? []).map((w) => w.id)

      const complianceByWorker: Record<string, any[]> = {}
      if (ids.length) {
        const { data: comp } = await admin
          .from('worker_compliance')
          .select('*, condition:compliance_conditions(*)')
          .in('worker_id', ids)
        for (const row of comp ?? []) {
          ;(complianceByWorker[row.worker_id] ??= []).push(row)
        }
      }

      const alerts = computeAlerts(workers ?? [], complianceByWorker, org.alert_window_days ?? 90)
      if (alerts.length === 0) {
        results.push({ org: org.id, alerts: 0, sent: false })
        continue
      }

      await sendEmail(
        org.notify_email,
        `ComplyHub — ${alerts.length} alerte(s) de conformité`,
        renderEmail(org.name, alerts),
      )
      sent++
      results.push({ org: org.id, alerts: alerts.length, sent: true })
    }

    return new Response(JSON.stringify({ ok: true, organizations: orgs?.length ?? 0, emails_sent: sent, results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
