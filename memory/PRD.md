# PRD — App Illustrations LMB

## Contexte
Assistant illustration pour la newsletter **Les Maîtres Bâtisseurs** (LMB).  
Outil interne Artyplanet pour générer pictos 3D et illustrations éditoriales à partir d'articles de newsletter.

## Architecture
- **Frontend** : React + Tailwind + Shadcn UI (port 3000)
- **Backend** : FastAPI Python (port 8001)
- **Base de données** : MongoDB — collection `sessions` (DB: `lmb_illustrations`)
- **APIs** : OpenAI GPT-4o-mini (OCR + propositions + auto-sélection) via emergentintegrations + Fal.ai `fal-ai/flux-2/edit` (génération avec références de style)

## Workflow V2 (actuel — validé)

```
Import → Articles → Récapitulatif
```

### Étape 1 — Import (`StepImport.jsx`)
- Upload multiple d'images (JPG, PNG, WEBP)
- OCR automatique à l'upload (GPT-4o-mini vision)
- Titre éditable + icône re-transcription OCR
- Sauvegarde de l'image originale dans `backend/static/uploads/`

### Étape 2 — Articles (`StepArticle.jsx`)
- Pour chaque article : auto-génération en 4 sous-étapes
  1. Propositions pictos (GPT, 10 idées) + auto-sélection (GPT choisit les 2 meilleures)
  2. Génération 2 pictos en parallèle (FAL.ai flux-2/edit avec images de référence)
  3. Propositions illustrations (GPT, 4 idées) + auto-sélection (GPT choisit la meilleure)
  4. Génération illustration (FAL.ai flux-2/edit avec images de référence)
- Bouton "Changer" sur chaque image → panel avec toutes les propositions
- Bouton "Valider" → article suivant ou récap

### Étape 3 — Récapitulatif (`SessionRecap.jsx`)
- Grille : 1 ligne par article, 3 colonnes (Picto 1, Picto 2, Illustration 16/9)
- Compteurs (articles / pictos / illustrations)
- Bouton "Exporter le ZIP" → télécharge toutes les images + originaux

## Pages / Composants (V2)

| Fichier | Description |
|---|---|
| `HomePage.jsx` | Logo Artyplanet + titre + 2 CTA |
| `SessionList.jsx` | Liste sessions avec statut + suppression |
| `NewSession.jsx` | Container workflow 3 étapes + stepper |
| `StepImport.jsx` | Upload multiple + OCR auto (GPT-4o Vision) |
| `StepArticle.jsx` | Auto-génération 4 sous-étapes + bouton Changer |
| `SessionRecap.jsx` | Grille récap + export ZIP |

> ⚠️ Les anciens composants V1 (`StepPictos.jsx`, `StepIllustrations.jsx`, `SessionSummary.jsx`) ont été supprimés.

## Routes API Backend

```
GET    /api/sessions              → Liste sessions
POST   /api/sessions              → Créer session
GET    /api/sessions/{id}         → Récupérer session
PUT    /api/sessions/{id}         → Mettre à jour session
DELETE /api/sessions/{id}         → Supprimer session
POST   /api/ocr                   → OCR image → titre + file_key (sauvegarde originale)
POST   /api/propositions/pictos   → 10 propositions (+ auto_select=true → 2 sélections GPT)
POST   /api/propositions/illustrations → 4 propositions (+ auto_select=true → 1 sélection GPT)
POST   /api/generate/picto        → Génère picto (flux-2/edit avec refs style, 1024×1024)
POST   /api/generate/illustration → Génère illustration (flux-2/edit avec refs style, 1792×1024)
GET    /api/sessions/{id}/export  → Export ZIP (originaux + pictos + illustrations)
GET    /api/static/...            → Fichiers statiques (refs style + uploads)
```

## Modèle de données (collection `sessions`)

```json
{
  "id": "uuid",
  "titre": "Session LMB — JJ/MM/AAAA",
  "date_creation": "ISO",
  "statut": "en_cours | terminee",
  "articles": [{
    "index": 1,
    "titre": "Titre article",
    "original_file_key": "uuid",
    "picto": {
      "propositions": ["...x10"],
      "selections": [3, 7],
      "images": ["url1", "url2"],
      "nom_fichiers": ["Picto_1_Article01_LMB_20260315.png", "..."],
      "valide": true
    },
    "illustration": {
      "propositions": ["...x4"],
      "selection": 2,
      "image": "url",
      "nom_fichier": "Illustration_Article01_LMB_20260315.png",
      "valide": true
    }
  }]
}
```

## Nommage automatique des fichiers

- Original : `Article[XX]_LMB_[YYYYMMDD].png`
- Pictos : `Picto_[N]_Article[XX]_LMB_[YYYYMMDD].png`
- Illustrations : `Illustration_Article[XX]_LMB_[YYYYMMDD].png`

## Images de référence de style

- `backend/static/references/picto3.png`, `picto5.png`, `picto6.png` → style pictos 3D
- `backend/static/references/illustrations/illus1.png`, `illus2.png`, `illus3.png` → style illustrations éditoriales

## Variables d'environnement (backend/.env)

- `MONGO_URL`, `DB_NAME=lmb_illustrations`
- `OPENAI_API_KEY` — GPT-4o-mini text + vision (via emergentintegrations)
- `FAL_KEY` — fal.ai image generation
- `FLUX_MODEL=fal-ai/flux/dev` — fallback si pas de refs style
- `BACKEND_URL` — URL publique pour servir les refs de style à FAL.ai

## Tests (état au 15/03/2026)

- **Backend :** 21/21 ✅ (`/app/backend/tests/test_v2_complete.py`)
- **Frontend :** 100% des flux critiques ✅
- **Appels réels testés :** OpenAI OCR ✅, GPT auto-sélection ✅, FAL.ai flux-2/edit pictos ✅, FAL.ai flux-2/edit illustrations ✅, Export ZIP ✅

## Backlog

### P1 (prochaine session)
- [ ] Navigation "article précédent" dans l'étape Articles
- [ ] Titre de session éditable (renommer)
- [ ] Indicateur de progression global (ex: "Article 2/5")

### P2 (futures itérations)
- [ ] Mode aperçu de session (voir toutes les images sans devoir les regénérer)
- [ ] Sélection du modèle Flux (configurable par l'utilisateur)
- [ ] Notifications toast (succès/erreur) pour chaque action
- [ ] Export par article individuel
- [ ] Historique des propositions GPT par article (rejouer sans API call)
