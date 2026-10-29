# Fonction Edge — `ask-assistant`

Assistant IA de conformité de ComplyHub. Reçoit une question (et un fil de
conversation + un contexte de dossier facultatifs) et renvoie une réponse
spécialisée sur la conformité des travailleurs étrangers temporaires au Canada
(RIPR, PMI, PTET), avec références et avertissement CICC. Appelle l'API Messages
d'Anthropic (Claude) en HTTP brut.

Appelée depuis le front via `supabase.functions.invoke('ask-assistant', …)`
(voir `askAssistant()` dans `src/lib/api.js`). Interface : onglet **Assistant IA**
du tableau de bord employeur et carte dans la **console Cabinet**
(versions Pro & Cabinet).

## Déploiement

1. **Créer une clé API Anthropic**
   Console Anthropic → <https://console.anthropic.com> → *API Keys* → *Create Key*.

2. **Enregistrer le secret** (jamais committé dans le dépôt) :

   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   # (facultatif) choisir le modèle — défaut : claude-opus-5-5
   # alternative économique pour du Q&R : claude-haiku-5-5
   supabase secrets set ASSISTANT_MODEL=claude-opus-5-5
   ```

3. **Déployer la fonction** :

   ```bash
   supabase functions deploy ask-assistant
   ```

## Variables d'environnement

| Secret              | Requis | Défaut            | Rôle                                   |
| ------------------- | :----: | ----------------- | -------------------------------------- |
| `ANTHROPIC_API_KEY` |   ✔    | —                 | Clé de l'API Anthropic                 |
| `ASSISTANT_MODEL`   |        | `claude-opus-5-5` | Modèle Claude utilisé pour les réponses |

## Remarques

- Aucune donnée personnelle (NAS, etc.) n'est envoyée : seul un contexte
  agrégé facultatif (nom du client, province, programme, score, nombre
  d'alertes) peut accompagner la question.
- ComplyHub ne fournit pas de conseil juridique : l'amorce système impose un
  rappel en ce sens lorsque la question touche à une décision réglementaire.
