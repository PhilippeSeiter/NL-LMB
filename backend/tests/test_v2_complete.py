"""
LMB Illustrations - V2 Complete Backend Tests
Tests all endpoints including real OCR (OpenAI) and FAL.ai image generation.
NOTE: Image generation tests require 60-120 seconds due to FAL.ai latency.
"""
import pytest
import requests
import os
import zipfile
import io
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_IMAGE_PATH = "/tmp/test_article.png"

# ---------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------

@pytest.fixture(scope="module")
def test_session():
    """Create a session for the test module, delete at teardown."""
    payload = {
        "titre": "TEST_V2_Session",
        "articles": [
            {"index": 1, "titre": "Innovation digitale dans le secteur BTP"},
        ]
    }
    resp = requests.post(f"{BASE_URL}/api/sessions", json=payload)
    assert resp.status_code == 200, f"Failed to create test session: {resp.text}"
    session_data = resp.json()
    yield session_data
    # Cleanup
    requests.delete(f"{BASE_URL}/api/sessions/{session_data['id']}")
    print(f"Cleaned up session {session_data['id']}")


@pytest.fixture(scope="module")
def generated_images():
    """Container to pass generated image data between tests."""
    return {}


# ---------------------------------------------------------------
# 1. Health Check
# ---------------------------------------------------------------

class TestHealthCheck:
    """GET /api/ — Health check"""

    def test_health(self):
        resp = requests.get(f"{BASE_URL}/api/")
        assert resp.status_code == 200, f"Health check failed: {resp.status_code}"
        data = resp.json()
        assert "message" in data
        print(f"Health check: {data['message']}")


# ---------------------------------------------------------------
# 2. Sessions CRUD
# ---------------------------------------------------------------

class TestSessionsCRUD:
    """Sessions basic CRUD operations"""

    def test_list_sessions(self):
        """GET /api/sessions returns list"""
        resp = requests.get(f"{BASE_URL}/api/sessions")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        print(f"GET /api/sessions: {len(resp.json())} sessions")

    def test_create_session(self):
        """POST /api/sessions creates a valid session"""
        payload = {
            "titre": "TEST_V2_CRUD",
            "articles": [
                {"index": 1, "titre": "Article de test CRUD"},
            ]
        }
        resp = requests.post(f"{BASE_URL}/api/sessions", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert data["titre"] == "TEST_V2_CRUD"
        assert len(data["articles"]) == 1
        assert data["articles"][0]["titre"] == "Article de test CRUD"
        assert "_id" not in data  # MongoDB _id must be excluded
        session_id = data["id"]

        # GET to verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == session_id

        # Cleanup
        requests.delete(f"{BASE_URL}/api/sessions/{session_id}")
        print(f"Create+Get session {session_id}: OK")

    def test_get_nonexistent_session(self):
        """GET /api/sessions/{nonexistent} returns 404"""
        resp = requests.get(f"{BASE_URL}/api/sessions/nonexistent-id-xyz")
        assert resp.status_code == 404
        print("GET /api/sessions/nonexistent: 404 as expected")

    def test_update_session(self, test_session):
        """PUT /api/sessions/{id} updates statut"""
        session_id = test_session["id"]
        update_resp = requests.put(
            f"{BASE_URL}/api/sessions/{session_id}",
            json={"statut": "en_cours"}
        )
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["statut"] == "en_cours"
        # Verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        assert get_resp.json()["statut"] == "en_cours"
        print(f"PUT /api/sessions/{session_id}: statut updated")

    def test_delete_and_verify(self):
        """DELETE /api/sessions/{id} removes session"""
        payload = {"titre": "TEST_V2_Delete", "articles": []}
        session_id = requests.post(f"{BASE_URL}/api/sessions", json=payload).json()["id"]

        del_resp = requests.delete(f"{BASE_URL}/api/sessions/{session_id}")
        assert del_resp.status_code == 200

        get_resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        assert get_resp.status_code == 404
        print(f"DELETE /api/sessions/{session_id}: verified 404 after deletion")


# ---------------------------------------------------------------
# 3. OCR — Real OpenAI GPT-4o-mini vision call
# ---------------------------------------------------------------

class TestOCR:
    """POST /api/ocr — Real OpenAI OCR"""

    def test_ocr_with_real_image(self):
        """Upload a real image and verify OCR title extraction"""
        # Ensure test image exists
        if not os.path.exists(TEST_IMAGE_PATH):
            from PIL import Image as PILImage, ImageDraw
            img = PILImage.new('RGB', (400, 200), color='white')
            draw = ImageDraw.Draw(img)
            draw.text((20, 80), 'Innovation digitale dans le secteur BTP', fill='black')
            img.save(TEST_IMAGE_PATH, 'PNG')

        with open(TEST_IMAGE_PATH, 'rb') as f:
            resp = requests.post(
                f"{BASE_URL}/api/ocr",
                files={"file": ("test_article.png", f, "image/png")},
                timeout=60
            )

        assert resp.status_code == 200, f"OCR failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "titre" in data, f"Missing 'titre' in response: {data}"
        assert isinstance(data["titre"], str)
        assert len(data["titre"]) > 0, "titre should not be empty"
        assert "file_key" in data, "Missing 'file_key' in response"
        assert isinstance(data["file_key"], str)
        print(f"OCR result: titre='{data['titre']}', file_key={data['file_key']}")


# ---------------------------------------------------------------
# 4. Propositions — GPT-4o-mini calls
# ---------------------------------------------------------------

class TestPropositions:
    """POST /api/propositions/pictos and /illustrations"""

    def test_picto_propositions_with_auto_select(self):
        """Propositions pictos + auto-sélection de 2 numéros"""
        payload = {
            "titre": "Innovation digitale dans le BTP",
            "auto_select": True
        }
        resp = requests.post(
            f"{BASE_URL}/api/propositions/pictos",
            json=payload,
            timeout=60
        )
        assert resp.status_code == 200, f"Propositions pictos failed: {resp.text}"
        data = resp.json()
        assert "propositions" in data
        assert isinstance(data["propositions"], list)
        assert len(data["propositions"]) >= 2, f"Expected >= 2 propositions, got {len(data['propositions'])}"
        assert "auto_selections" in data
        assert isinstance(data["auto_selections"], list)
        assert len(data["auto_selections"]) == 2, f"Expected 2 auto_selections, got {data['auto_selections']}"
        # Selections must be valid indices
        for sel in data["auto_selections"]:
            assert 1 <= sel <= len(data["propositions"]), f"Selection {sel} out of range"
        print(f"Picto propositions: {len(data['propositions'])} items, auto_selections={data['auto_selections']}")

    def test_illustration_propositions_with_auto_select(self):
        """Propositions illustrations + auto-sélection de 1 numéro"""
        payload = {
            "titre": "Les nouvelles tendances de la construction durable",
            "auto_select": True
        }
        resp = requests.post(
            f"{BASE_URL}/api/propositions/illustrations",
            json=payload,
            timeout=60
        )
        assert resp.status_code == 200, f"Propositions illustrations failed: {resp.text}"
        data = resp.json()
        assert "propositions" in data
        assert isinstance(data["propositions"], list)
        assert len(data["propositions"]) >= 1, f"Expected >= 1 proposition, got {len(data['propositions'])}"
        assert "auto_selection" in data
        auto_sel = data["auto_selection"]
        assert auto_sel > 0, f"auto_selection should be > 0, got {auto_sel}"
        assert auto_sel <= len(data["propositions"]), f"auto_selection {auto_sel} out of range"
        print(f"Illustration propositions: {len(data['propositions'])} items, auto_selection={auto_sel}")


# ---------------------------------------------------------------
# 5. Image Generation — Real FAL.ai calls (60-120s timeout)
# ---------------------------------------------------------------

class TestImageGeneration:
    """POST /api/generate/picto and /api/generate/illustration — Real FAL.ai calls"""

    def test_generate_picto(self, generated_images):
        """Generate a picto via FAL.ai fal-ai/flux-2/edit (real call, ~60s)"""
        payload = {
            "proposition": "A glossy 3D rendered building crane icon, premium quality",
            "article_index": 1,
            "picto_number": 1
        }
        print("Calling FAL.ai for picto generation (may take 60-120s)...")
        resp = requests.post(
            f"{BASE_URL}/api/generate/picto",
            json=payload,
            timeout=180  # FAL.ai can take up to 120s
        )
        assert resp.status_code == 200, f"Generate picto failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "image_url" in data, f"Missing 'image_url' in response: {data}"
        assert "nom_fichier" in data, f"Missing 'nom_fichier' in response: {data}"
        assert data["image_url"].startswith("http"), f"image_url should start with http: {data['image_url']}"
        assert "Picto_1_Article01" in data["nom_fichier"], f"nom_fichier format unexpected: {data['nom_fichier']}"
        # Store for later tests
        generated_images["picto1_url"] = data["image_url"]
        generated_images["picto1_nom"] = data["nom_fichier"]
        print(f"Picto generated: {data['image_url'][:80]}...")
        print(f"nom_fichier: {data['nom_fichier']}")

    def test_generate_illustration(self, generated_images):
        """Generate an illustration via FAL.ai fal-ai/flux-2/edit (real call, ~60s)"""
        payload = {
            "proposition": "Editorial collage showing digital transformation in construction: blueprints, smartphones, crane, and data visualization",
            "article_index": 1
        }
        print("Calling FAL.ai for illustration generation (may take 60-120s)...")
        resp = requests.post(
            f"{BASE_URL}/api/generate/illustration",
            json=payload,
            timeout=180  # FAL.ai can take up to 120s
        )
        assert resp.status_code == 200, f"Generate illustration failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "image_url" in data, f"Missing 'image_url' in response: {data}"
        assert "nom_fichier" in data, f"Missing 'nom_fichier' in response: {data}"
        assert data["image_url"].startswith("http"), f"image_url should start with http: {data['image_url']}"
        assert "Illustration_Article01" in data["nom_fichier"], f"nom_fichier format unexpected: {data['nom_fichier']}"
        # Store for later tests
        generated_images["illus_url"] = data["image_url"]
        generated_images["illus_nom"] = data["nom_fichier"]
        print(f"Illustration generated: {data['image_url'][:80]}...")
        print(f"nom_fichier: {data['nom_fichier']}")


# ---------------------------------------------------------------
# 6. Session Update with picto + illustration data
# ---------------------------------------------------------------

class TestSessionUpdate:
    """PUT /api/sessions/{id} with full picto+illustration data"""

    def test_update_session_with_media(self, test_session, generated_images):
        """Update session articles with generated images"""
        session_id = test_session["id"]

        # Use dummy URLs if image generation hasn't run
        picto1_url = generated_images.get("picto1_url", "https://fal.media/dummy-picto1.png")
        illus_url = generated_images.get("illus_url", "https://fal.media/dummy-illus.png")
        picto1_nom = generated_images.get("picto1_nom", "Picto_1_Article01_LMB_20260101.png")
        illus_nom = generated_images.get("illus_nom", "Illustration_Article01_LMB_20260101.png")

        updated_articles = [
            {
                "index": 1,
                "titre": "Innovation digitale dans le secteur BTP",
                "original_file_key": "",
                "picto": {
                    "propositions": ["glossy crane icon", "building blueprint icon"],
                    "selections": [1, 2],
                    "images": [picto1_url, picto1_url],
                    "nom_fichiers": [picto1_nom, picto1_nom.replace("Picto_1", "Picto_2")],
                    "valide": True
                },
                "illustration": {
                    "propositions": ["editorial digital transformation"],
                    "selection": 1,
                    "image": illus_url,
                    "nom_fichier": illus_nom,
                    "valide": True
                }
            }
        ]

        resp = requests.put(
            f"{BASE_URL}/api/sessions/{session_id}",
            json={"articles": updated_articles, "statut": "terminee"},
            timeout=30
        )
        assert resp.status_code == 200, f"Update failed: {resp.text}"
        data = resp.json()
        assert data["statut"] == "terminee"
        assert len(data["articles"]) == 1
        article = data["articles"][0]
        assert article["picto"]["valide"] is True
        assert article["illustration"]["valide"] is True
        print(f"PUT /api/sessions/{session_id}: updated with media data OK")


# ---------------------------------------------------------------
# 7. Export ZIP
# ---------------------------------------------------------------

class TestExportZIP:
    """GET /api/sessions/{id}/export — ZIP download"""

    def test_export_zip(self, test_session):
        """Download ZIP and verify it's a valid ZIP file"""
        session_id = test_session["id"]

        resp = requests.get(
            f"{BASE_URL}/api/sessions/{session_id}/export",
            timeout=120,
            stream=True
        )
        assert resp.status_code == 200, f"Export ZIP failed: {resp.status_code} - {resp.text}"
        content_type = resp.headers.get("Content-Type", "")
        assert "zip" in content_type or "octet-stream" in content_type, \
            f"Expected zip content-type, got: {content_type}"

        # Verify it's a valid ZIP file
        content = resp.content
        assert len(content) > 0, "ZIP file is empty"
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as zf:
                names = zf.namelist()
                print(f"ZIP contains {len(names)} files: {names}")
        except zipfile.BadZipFile:
            pytest.fail("Response is not a valid ZIP file")

        # Verify session status was updated to terminee
        get_resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        assert get_resp.json()["statut"] == "terminee"
        print(f"Export ZIP for session {session_id}: OK ({len(content)} bytes)")


# ---------------------------------------------------------------
# 8. Static reference images accessible
# ---------------------------------------------------------------

class TestStaticReferences:
    """Verify reference images are accessible via /api/static/"""

    def test_picto_references_accessible(self):
        """Reference picto images should be accessible"""
        for fname in ["picto3.png", "picto5.png", "picto6.png"]:
            resp = requests.get(
                f"{BASE_URL}/api/static/references/{fname}",
                timeout=10
            )
            assert resp.status_code == 200, f"Reference {fname} not accessible: {resp.status_code}"
            assert len(resp.content) > 0, f"Reference {fname} is empty"
            print(f"/api/static/references/{fname}: OK ({len(resp.content)} bytes)")

    def test_illustration_references_accessible(self):
        """Reference illustration images should be accessible"""
        for fname in ["illus1.png", "illus2.png", "illus3.png"]:
            resp = requests.get(
                f"{BASE_URL}/api/static/references/illustrations/{fname}",
                timeout=10
            )
            assert resp.status_code == 200, f"Reference {fname} not accessible: {resp.status_code}"
            assert len(resp.content) > 0, f"Reference {fname} is empty"
            print(f"/api/static/references/illustrations/{fname}: OK ({len(resp.content)} bytes)")
