// ============================================================
//  Edge Function — Assistant IA de conformité (Claude)
//  Reçoit une question (+ un fil de conversation et un contexte de
//  dossier facultatifs) et renvoie une réponse spécialisée sur la
//  conformité des travailleurs étrangers temporaires au Canada
//  (RIPR, PMI, PTET), avec références et avertissement CICC.
//
//  Appel HTTP brut vers l'API Messages d'Anthropic (même approche
//  que la fonction send-alerts, sans SDK).
//
//  À déployer :   supabase functions deploy ask-assistant
//  Secrets requis (supabase secrets set …) :
//    - ANTHROPIC_API_KEY   (https://console.anthropic.com → API Keys)
//  Secret facultatif :
//    - ASSISTANT_MODEL     (défaut: claude-opus-5-5 ; alternative
//                           économique pour du Q&R : claude-haiku-5-5)
// ============================================================

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const ASSISTANT_MODEL = Deno.env.get('ASSISTANT_MODEL') ?? 'claude-opus-5-5'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Amorce système : cadre le modèle sur la conformité TET canadienne et
// impose l'avertissement « pas de conseil juridique » (réservé CICC/avocats).
const SYSTEM_PROMPT = `Tu es l'assistant de conformité de ComplyHub, une plateforme SaaS qui aide les employeurs canadiens de travailleurs étrangers temporaires (TET) à rester conformes et prêts en cas d'inspection d'IRCC ou d'ESDC.

Domaine : Règlement sur l'immigration et la protection des réfugiés (RIPR), Programme de mobilité internationale (PMI) et Programme des travailleurs étrangers temporaires (PTET), obligations de l'employeur (conditions de travail, salaire au moins égal au salaire courant/EIMT, milieu de travail exempt de violence, dossiers conservés 6 ans, etc.), inspections et conformité provinciale du travail (CNESST au Québec, WorkSafeNB, WorkSafeBC, etc.).

Règles :
- Réponds dans la langue de la question (français par défaut).
- Sois précis, concret et orienté action. Quand c'est pertinent, cite l'article du RIPR (p. ex. « RIPR art. 209.3 / 209.4 ») ou le programme concerné.
- Si une information dépend de la province, du programme (PMI vs PTET) ou de la date, demande la précision ou indique clairement l'hypothèse retenue.
- Si tu n'es pas certain, dis-le plutôt que d'inventer. Ne fabrique jamais de numéro d'article, de montant ni de date.
- Reste bref : quelques phrases ou une courte liste. Pas de longues dissertations.

Avertissement obligatoire : ComplyHub est un outil de gestion et d'organisation documentaire et NE fournit PAS de conseil juridique en immigration (réservé aux avocats et aux consultants réglementés par le CICC). Termine par un rappel bref en ce sens uniquement lorsque la question touche à une décision juridique, un cas individuel sensible ou une interprétation réglementaire.`

type Msg = { role: 'user' | 'assistant'; content: string }

function clampHistory(history: unknown): Msg[] {
  if (!Array.isArray(history)) return []
  return history
    .filter(
      (m): m is Msg =>
        m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
    )
    .slice(-10) // on borne la taille du contexte envoyé
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  try {
    if (!ANTHROPIC_API_KEY) {
      return json(
        { error: "La clé ANTHROPIC_API_KEY n'est pas configurée sur la fonction ask-assistant." },
        500,
      )
    }

    const payload = await req.json().catch(() => ({}))
    const question = typeof payload.question === 'string' ? payload.question.trim() : ''
    if (!question) return json({ error: 'Question vide.' }, 400)

    const history = clampHistory(payload.history)

    // Contexte de dossier facultatif (nom du client, province, programme,
    // score, alertes) — fourni par l'interface pour ancrer la réponse.
    let system = SYSTEM_PROMPT
    if (payload.context && typeof payload.context === 'object') {
      const c = payload.context
      const parts: string[] = []
      if (c.orgName) parts.push(`Organisation : ${String(c.orgName).slice(0, 120)}`)
      if (c.province) parts.push(`Province : ${String(c.province).slice(0, 60)}`)
      if (c.program) parts.push(`Programme : ${String(c.program).slice(0, 40)}`)
      if (typeof c.score === 'number') parts.push(`Score de préparation : ${c.score} %`)
      if (typeof c.alerts === 'number') parts.push(`Alertes ouvertes : ${c.alerts}`)
      if (parts.length) {
        system += `\n\nContexte du dossier en cours (ne divulgue aucune donnée personnelle, raisonne seulement dessus) :\n- ${parts.join('\n- ')}`
      }
    }

    const messages: Msg[] = [...history, { role: 'user', content: question.slice(0, 4000) }]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: ASSISTANT_MODEL, max_tokens: 1024, system, messages }),
    })

    if (!res.ok) {
      const detail = await res.text()
      return json({ error: `Anthropic ${res.status}`, detail: detail.slice(0, 500) }, 502)
    }

    const data = await res.json()
    const answer = (data?.content ?? [])
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim()

    return json({ answer: answer || "Je n'ai pas pu formuler de réponse.", model: ASSISTANT_MODEL })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
