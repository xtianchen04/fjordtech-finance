// ============================================================
//  Edge Function — Mise à jour auto des taux de salaire minimum
//  Utilise Claude (API Messages) avec l'outil de RECHERCHE WEB pour
//  retrouver le salaire minimum général courant de chaque province /
//  territoire, avec sa date d'entrée en vigueur et une URL source.
//
//  Garde-fous (la conformité en dépend, donc aucune valeur douteuse n'est
//  écrite en silence) :
//   - bande de plausibilité (13–35 $/h) ;
//   - code de province connu ;
//   - URL source obligatoire ;
//   - tout changement est CONSIGNÉ dans min_wage_rate_log ;
//   - checked_at horodate chaque vérification.
//
//  À déployer :   supabase functions deploy refresh-min-wage
//  Secrets requis (supabase secrets set …) :
//    - ANTHROPIC_API_KEY           (partagé avec ask-assistant)
//    - SUPABASE_URL                (fourni par la plateforme)
//    - SUPABASE_SERVICE_ROLE_KEY   (écriture, contourne la RLS)
//  Secret facultatif :
//    - RATES_MODEL                 (défaut: claude-opus-5-5)
//
//  Planification hebdomadaire : migrations/2026-11_schedule_refresh_min_wage.sql
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const RATES_MODEL = Deno.env.get('RATES_MODEL') ?? 'claude-opus-5-5'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']
const MIN_PLAUSIBLE = 13
const MAX_PLAUSIBLE = 35

const SYSTEM = `Tu es un vérificateur de données de conformité. Ta tâche : trouver le SALAIRE MINIMUM GÉNÉRAL en vigueur (taux horaire standard, hors cas particuliers comme les pourboires ou les étudiants) pour chaque province et territoire du Canada, à l'aide de la recherche web, en te fondant sur des sources officielles (sites gouvernementaux provinciaux/fédéraux).

Pour chaque juridiction, donne le taux courant, sa date d'entrée en vigueur et l'URL de la source officielle.

Réponds UNIQUEMENT par un objet JSON strict, sans texte avant ni après, de la forme :
{"rates":[{"province":"ON","rate":17.60,"as_of":"2025-10-01","source_url":"https://..."}, ...]}

Codes de province attendus : AB, BC, MB, NB, NL, NS, NT, NU, ON, PE, QC, SK, YT.
- rate : nombre en dollars/heure.
- as_of : date AAAA-MM-JJ d'entrée en vigueur (au mieux de ta connaissance vérifiée).
- source_url : URL officielle. N'invente jamais une valeur : si tu ne peux pas confirmer une juridiction par une source, omets-la du tableau.`

async function callAnthropic(messages: any[]) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: RATES_MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 20 }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 500)}`)
  return await res.json()
}

// L'outil web renvoie des blocs intermédiaires + un stop_reason "pause_turn"
// tant que Claude n'a pas fini : on relance en réinjectant le contenu.
async function askForRates(): Promise<any[]> {
  const messages: any[] = [
    { role: 'user', content: 'Donne les salaires minimums courants, format JSON strict comme indiqué.' },
  ]
  let data: any
  for (let i = 0; i < 6; i++) {
    data = await callAnthropic(messages)
    if (data.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: data.content })
      continue
    }
    break
  }
  const text = (data?.content ?? [])
    .filter((b: any) => b?.type === 'text')
    .map((b: any) => b.text)
    .join('')
    .trim()
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('Réponse sans JSON exploitable.')
  const parsed = JSON.parse(cleaned.slice(start, end + 1))
  return Array.isArray(parsed?.rates) ? parsed.rates : []
}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  try {
    if (!ANTHROPIC_API_KEY) return json({ ok: false, error: 'ANTHROPIC_API_KEY non configurée.' }, 500)

    // 1) Taux actuels en base.
    const { data: current, error: curErr } = await admin.from('min_wage_rates').select('*')
    if (curErr) throw curErr
    const byProv: Record<string, any> = {}
    for (const row of current ?? []) byProv[row.province] = row

    // 2) Récupération assistée par Claude + recherche web.
    const proposed = await askForRates()

    const now = new Date().toISOString()
    const changes: any[] = []
    const checked: string[] = []
    const rejected: any[] = []

    for (const r of proposed) {
      const province = String(r?.province ?? '').toUpperCase()
      const rate = Number(r?.rate)
      const asOf = r?.as_of ? String(r.as_of).slice(0, 10) : null
      const source = typeof r?.source_url === 'string' ? r.source_url : null

      // Garde-fous.
      if (!PROVINCES.includes(province)) {
        rejected.push({ province, reason: 'code inconnu' })
        continue
      }
      if (!Number.isFinite(rate) || rate < MIN_PLAUSIBLE || rate > MAX_PLAUSIBLE) {
        rejected.push({ province, reason: `taux hors bande (${rate})` })
        continue
      }
      if (!source || !/^https?:\/\//i.test(source)) {
        rejected.push({ province, reason: 'source absente' })
        continue
      }

      const prev = byProv[province]
      const changed = !prev || Number(prev.rate) !== rate || (prev.as_of ?? null) !== asOf

      // Mise à jour (ou insertion) + horodatage de la vérification.
      const { error: upErr } = await admin.from('min_wage_rates').upsert(
        {
          province,
          rate,
          as_of: asOf,
          source_url: source,
          checked_at: now,
          updated_at: now,
        },
        { onConflict: 'province' },
      )
      if (upErr) {
        rejected.push({ province, reason: `écriture: ${upErr.message}` })
        continue
      }
      checked.push(province)

      if (changed) {
        await admin.from('min_wage_rate_log').insert({
          province,
          old_rate: prev ? Number(prev.rate) : null,
          new_rate: rate,
          old_as_of: prev?.as_of ?? null,
          new_as_of: asOf,
          source_url: source,
          note: prev ? 'mise à jour auto (refresh-min-wage)' : 'ajout auto (refresh-min-wage)',
        })
        changes.push({ province, old: prev ? Number(prev.rate) : null, new: rate })
      }
    }

    return json({
      ok: true,
      model: RATES_MODEL,
      checked: checked.length,
      changed: changes.length,
      changes,
      rejected,
    })
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500)
  }
})
