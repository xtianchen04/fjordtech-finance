// ============================================================
//  Edge Function — Alertes de conformité par courriel
//  Calcule, côté serveur, les alertes (permis bientôt expiré / expiré,
//  salaire sous le minimum, conditions manquantes) pour chaque organisation
//  ayant activé les notifications, et envoie un courriel récapitulatif via
//  Resend. Le courriel inclut aussi les « rappels proactifs » (régulateur SST
//  provincial, veille du salaire minimum, assurance santé) — mais ceux-ci
//  n'envoient pas de courriel à eux seuls : ils accompagnent une alerte réelle.
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

type Reminder = { title: string; detail: string; action?: { label: string; url: string } }

// Répliques côté serveur de src/lib/provincialRegulators.js et src/lib/minWage.js.
// ⚠️ Garder synchronisés avec le front (mêmes valeurs).
const REGULATORS: Record<string, { board: string; url: string }> = {
  AB: { board: 'WCB-Alberta', url: 'https://www.wcb.ab.ca' },
  BC: { board: 'WorkSafeBC', url: 'https://www.worksafebc.com' },
  MB: { board: 'WCB Manitoba', url: 'https://www.wcb.mb.ca' },
  NB: { board: 'WorkSafeNB', url: 'https://www.worksafenb.ca' },
  NL: { board: 'WorkplaceNL', url: 'https://workplacenl.ca' },
  NS: { board: 'WCB Nova Scotia', url: 'https://www.wcb.ns.ca' },
  NT: { board: 'WSCC (T.N.-O. / Nunavut)', url: 'https://www.wscc.nt.ca' },
  NU: { board: 'WSCC (Nunavut / T.N.-O.)', url: 'https://www.wscc.nt.ca' },
  ON: { board: 'WSIB / CSPAAT', url: 'https://www.wsib.ca' },
  PE: { board: 'WCB PEI', url: 'https://www.wcb.pe.ca' },
  QC: { board: 'CNESST', url: 'https://www.cnesst.gouv.qc.ca' },
  SK: { board: 'WCB Saskatchewan', url: 'https://www.wcbsask.com' },
  YT: { board: "Yukon Workers' Safety and Compensation Board", url: 'https://wcb.yk.ca' },
}

const MIN_WAGE: Record<string, { rate: number; asOf: string }> = {
  AB: { rate: 15.0, asOf: '2024-10-01' },
  BC: { rate: 17.4, asOf: '2025-06-01' },
  MB: { rate: 15.8, asOf: '2025-10-01' },
  NB: { rate: 15.3, asOf: '2025-04-01' },
  NL: { rate: 16.0, asOf: '2025-04-01' },
  NS: { rate: 15.7, asOf: '2025-04-01' },
  NT: { rate: 16.7, asOf: '2024-09-01' },
  NU: { rate: 19.0, asOf: '2024-01-01' },
  ON: { rate: 17.6, asOf: '2025-10-01' },
  PE: { rate: 16.0, asOf: '2025-04-01' },
  QC: { rate: 16.1, asOf: '2025-05-01' },
  SK: { rate: 15.0, asOf: '2024-10-01' },
  YT: { rate: 17.94, asOf: '2025-04-01' },
}

function minWageChange(code: string, windowDays = 120) {
  const mw = MIN_WAGE[code]
  if (!mw?.asOf) return null
  const asOf = new Date(mw.asOf)
  if (Number.isNaN(asOf.getTime())) return null
  const days = Math.round((asOf.getTime() - Date.now()) / 86_400_000)
  if (Math.abs(days) > windowDays) return null
  return { rate: mw.rate, asOf: mw.asOf, upcoming: days > 0, days }
}

// Réplique de computeReminders() (src/lib/api.js) côté serveur.
function computeReminders(workers: any[], province: string | null): Reminder[] {
  const reminders: Reminder[] = []

  if (province) {
    const reg = REGULATORS[province]
    if (reg) {
      reminders.push({
        title: `Inscription ${reg.board} (${province})`,
        detail:
          `En tant qu'employeur établi en ${province}, assurez-vous d'être inscrit auprès de ${reg.board} ` +
          `et d'y déclarer votre masse salariale. Obligation provinciale distincte des programmes TET, ` +
          `souvent vérifiée en inspection.`,
        action: { label: reg.board, url: reg.url },
      })
    }
  }

  const provinces = new Set<string>(
    [...workers.map((w) => w.work_province).filter(Boolean), province].filter(Boolean) as string[],
  )
  for (const code of provinces) {
    const chg = minWageChange(code)
    if (chg) {
      const when = chg.upcoming
        ? `passera à ${chg.rate.toFixed(2)} $/h le ${chg.asOf} (dans ${chg.days} j)`
        : `est passé à ${chg.rate.toFixed(2)} $/h le ${chg.asOf}`
      reminders.push({
        title: `Salaire minimum — ${code}`,
        detail:
          `Le salaire minimum en ${code} ${when}. Reconfirmez que la rémunération reste au moins égale ` +
          `au minimum et conforme à l'offre d'emploi (R209.2).`,
      })
    }
  }

  for (const w of workers) {
    if (w.work_province && w.offered_wage != null) {
      const mw = MIN_WAGE[w.work_province]
      if (mw) {
        const margin = Number(w.offered_wage) - mw.rate
        if (margin >= 0 && margin <= 1.0) {
          reminders.push({
            title: `Salaire proche du minimum — ${w.full_name}`,
            detail:
              `Le salaire offert (${Number(w.offered_wage).toFixed(2)} $/h) n'est que ${margin.toFixed(2)} $ ` +
              `au-dessus du minimum de ${w.work_province} (${mw.rate.toFixed(2)} $/h) — à surveiller.`,
          })
        }
      }
    }
  }

  if (workers.length > 0) {
    reminders.push({
      title: 'Assurance santé privée (délai de carence)',
      detail:
        "Pour les travailleurs du PTET (poste à bas salaire), l'employeur doit fournir une assurance " +
        'maladie privée couvrant les soins d’urgence tant que le travailleur n’est pas admissible au ' +
        'régime public de la province. Vérifiez la couverture de chaque nouveau travailleur.',
    })
  }

  return reminders
}

function esc(s: string): string {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}

function renderEmail(orgName: string, alerts: Alert[], reminders: Reminder[] = []): string {
  const rows = alerts
    .map((a) => {
      const color = a.severity === 'missing' ? '#D1495B' : '#E0A030'
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E8F1F8;vertical-align:top">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:8px"></span>
          <strong style="color:#0B1F33">${esc(a.title)}</strong>
          <div style="color:#5E7385;font-size:13px;margin-top:2px">${esc(a.detail)}</div>
        </td>
      </tr>`
    })
    .join('')

  // Section « Rappels proactifs » (guidance, hors compteur d'alertes).
  const reminderRows = reminders
    .map((r) => {
      const link = r.action
        ? `<div style="margin-top:4px"><a href="${esc(r.action.url)}" style="color:#2E6CA4;font-size:12.5px;font-weight:600;text-decoration:none">${esc(r.action.label)} →</a></div>`
        : ''
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E8F1F8;vertical-align:top">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2E6CA4;margin-right:8px"></span>
          <strong style="color:#0B1F33">${esc(r.title)}</strong>
          <div style="color:#5E7385;font-size:13px;margin-top:2px">${esc(r.detail)}</div>
          ${link}
        </td>
      </tr>`
    })
    .join('')

  const reminderSection = reminders.length
    ? `<p style="color:#0B1F33;font-size:14px;font-weight:700;margin:22px 0 2px">Rappels proactifs</p>
       <p style="color:#7A8FA0;font-size:12px;margin:0 0 6px">Obligations à anticiper selon votre province — guidance, hors compteur d'alertes.</p>
       <table style="width:100%;border-collapse:collapse;margin:4px 0">${reminderRows}</table>`
    : ''

  return `<!doctype html><html><body style="margin:0;background:#F4F7FA;font-family:Segoe UI,system-ui,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#0B1F33;border-radius:14px 14px 0 0;padding:18px 22px;color:#fff">
        <span style="font-size:18px;font-weight:800;font-family:Georgia,serif">ComplyHub</span>
        <span style="color:#5AA0DC;font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin-left:8px">Alertes de conformité</span>
      </div>
      <div style="background:#fff;border-radius:0 0 14px 14px;padding:22px">
        <p style="color:#0B1F33;font-size:14px">Bonjour,</p>
        <p style="color:#5E7385;font-size:14px">Voici les éléments de conformité requérant votre attention pour
          <strong style="color:#0B1F33">${esc(orgName)}</strong> :</p>
        <table style="width:100%;border-collapse:collapse;margin:14px 0">${rows}</table>
        ${reminderSection}
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
      .select('id, name, province, notify_email, alert_window_days, notify_enabled')
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
      // Les rappels proactifs accompagnent une alerte réelle : ils n'envoient
      // pas de courriel à eux seuls (sinon courriel quotidien sans action).
      if (alerts.length === 0) {
        results.push({ org: org.id, alerts: 0, sent: false })
        continue
      }

      const reminders = computeReminders(workers ?? [], org.province ?? null)

      await sendEmail(
        org.notify_email,
        `ComplyHub — ${alerts.length} alerte(s) de conformité`,
        renderEmail(org.name, alerts, reminders),
      )
      sent++
      results.push({ org: org.id, alerts: alerts.length, reminders: reminders.length, sent: true })
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
