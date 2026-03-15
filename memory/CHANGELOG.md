# CHANGELOG — App Illustrations LMB

## 2026-03-15 — Session 5 : Features P1/P2

### Ajoutés
- **Toaster** sonner (bottom-right, richColors) dans `App.js`
- **Badge moteur** dans le header de `NewSession` (⚡ Rapide / ⭐ Qualité)
- **Navigation article précédent** dans `StepArticle` (btn-prev-article, désactivé sur article 0)
- **Titre de session éditable** inline (crayon + input) dans `SessionList` et `SessionRecap`
- **Modale aperçu avant export Word** dans `SessionRecap` (liste articles avec statut pictos/illus)
- **Toasts** sur toutes les actions clés (validation article, suppression, renommage, exports)

### Corrigés
- `PUT /api/sessions/{id}` retourne désormais 404 si session inexistante (était 200 silencieux)
- `SessionRecap` rename propage le nouveau titre au header de `NewSession` via callback `onRename`
- JSX syntax error dans `SessionRecap.jsx` (Dialog hors Fragment) — fixé par wrapping `<>...</>`

---

## 2026-03-15 — Session 4 : Export Word (.docx)

### Ajoutés
- `python-docx==1.2.0` dans `requirements.txt`
- Endpoint `GET /api/sessions/{id}/export-word` : génère .docx avec page de couverture + une page par article
- Bouton "Exporter Word" dans `SessionRecap` (à côté de "Exporter ZIP")

---

## 2026-03-15 — Session 3 : Choix moteur de génération

### Ajoutés
- `openai==1.99.9` SDK dans `requirements.txt`
- Modale de choix moteur sur `HomePage` (⚡ Rapide = FAL.ai / ⭐ Qualité = gpt-image-1)
- Champ `engine` dans le modèle `Session` et `SessionCreate` MongoDB
- Branche `engine=openai` dans `generate_picto` (gpt-image-1 1024×1024 medium) et `generate_illustration` (gpt-image-1 1536×1024 medium)
- Propagation de `engine` : `NewSession` → `StepArticle` → API calls

---

## 2026-03-14 — Session 2 : Workflow V2 + Tests E2E

### Validés (tests complets)
- Workflow V2 : Import → Articles → Récap (21/21 backend, 100% frontend)
- OCR réel OpenAI GPT-4o-mini ✅
- Génération FAL.ai flux-2/edit pictos + illustrations ✅
- Export ZIP avec originaux ✅

---

## 2026-03-14 — Session 1 : Implémentation initiale V2

### Ajoutés
- Workflow V2 complet : `StepImport`, `StepArticle`, `SessionRecap`, `NewSession`
- Génération avec références de style (fal-ai/flux-2/edit + images refs)
- Sauvegarde image originale dans ZIP
- Sécurité : clés API retirées de l'historique Git
