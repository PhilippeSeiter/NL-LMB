# PRD — App Illustrations LMB

## Contexte
Assistant illustration pour la newsletter **Les Maîtres Bâtisseurs** (LMB).  
Outil interne Artyplanet pour générer pictos 3D et illustrations éditoriales à partir d'articles de newsletter.

## Architecture
- **Frontend** : React + Tailwind + Shadcn UI (port 3000)
- **Backend** : FastAPI Python (port 8001)
- **Base de données** : MongoDB — collection `sessions` (DB: `lmb_illustrations`)
- **APIs** : OpenAI GPT-4o-mini (text + vision) via emergentintegrations + fal.ai Flux/dev

## Ce qui a été implémenté (2026-02-xx)

### Pages / Composants
| Fichier | Description |
|---|---|
| `HomePage.jsx` | Logo Artyplanet + titre + 2 CTA |
| `SessionList.jsx` | Liste sessions avec statut + suppression |
| `NewSession.jsx` | Container workflow 3 étapes + stepper |
| `StepImport.jsx` | Upload multiple + OCR GPT-4o Vision |
| `StepPictos.jsx` | 10 propositions → 2 sélections → génération 1024×1024 |
| `StepIllustrations.jsx` | 4 propositions → 1 sélection → génération 1792×1024 |
| `SessionSummary.jsx` | Résumé + export ZIP |

### Routes API Backend
```
GET    /api/sessions              → Liste sessions
POST   /api/sessions              → Créer session
GET    /api/sessions/{id}         → Récupérer session
PUT    /api/sessions/{id}         → Mettre à jour session
DELETE /api/sessions/{id}         → Supprimer session
POST   /api/ocr                   → OCR image → titre article
POST   /api/propositions/pictos   → 10 propositions pictos (GPT)
POST   /api/propositions/illustrations → 4 propositions illus (GPT)
POST   /api/generate/picto        → Générer picto (Flux/dev, 1024×1024)
POST   /api/generate/illustration → Générer illustration (Flux/dev, 1792×1024)
GET    /api/sessions/{id}/export  → Export ZIP
```

### Nommage automatique des fichiers
- Pictos : `Picto_[N]_Article[XX]_LMB_[YYYYMMDD].png`
- Illustrations : `Illustration_Article[XX]_LMB_[YYYYMMDD].png`

### Modèle de données (collection `sessions`)
```json
{
  "id": "uuid",
  "titre": "Session LMB — JJ/MM/AAAA",
  "date_creation": "ISO",
  "statut": "en_cours | terminee",
  "articles": [{
    "index": 1,
    "titre": "Titre article",
    "picto": {
      "propositions": [], "selections": [], "images": [],
      "valide": false, "nom_fichiers": []
    },
    "illustration": {
      "propositions": [], "selection": -1, "image": "",
      "valide": false, "nom_fichier": ""
    }
  }]
}
```

## Variables d'environnement (backend/.env)
- `MONGO_URL`, `DB_NAME=lmb_illustrations`
- `OPENAI_API_KEY` — GPT-4o-mini text + vision
- `FAL_KEY` — fal.ai image generation
- `FLUX_MODEL=fal-ai/flux/dev` — modèle Flux (configurable)

## Backlog P1/P2

### P1 (prochaine itération)
- [ ] Test du workflow OCR complet avec vraies images
- [ ] Test de génération pictos + illustrations end-to-end
- [ ] Navigation "article précédent" dans les étapes Pictos/Illustrations
- [ ] Session title éditable (renommer une session)
- [ ] Preview thumbnail des images importées dans StepImport

### P2 (futures itérations)
- [ ] Historique des propositions GPT par article (pour rejouer sans API call)
- [ ] Mode aperçu de session (voir toutes les images générées dans une session)
- [ ] Sélection du modèle Flux (flux/dev vs flux-pro vs flux-2/dev quand disponible)
- [ ] Notifications toast pour chaque action (succès/erreur)
- [ ] Export par article individuel (pas seulement la session complète)
