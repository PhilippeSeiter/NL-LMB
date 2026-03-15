"""
LMB Illustrations - Engine Feature Tests (Iteration 3)
Tests the new engine selection feature: fal vs openai for image generation.
NOTE: OpenAI gpt-image-1 tests require 60-90 seconds due to API latency.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


# ---------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------

@pytest.fixture(scope="module")
def session_fal():
    """Create a session with engine=fal, delete at teardown."""
    payload = {
        "titre": "TEST_Engine_FAL_Session",
        "engine": "fal",
        "articles": [
            {"index": 1, "titre": "Innovation et construction durable"},
        ]
    }
    resp = requests.post(f"{BASE_URL}/api/sessions", json=payload)
    assert resp.status_code == 200, f"Failed to create fal session: {resp.text}"
    data = resp.json()
    yield data
    requests.delete(f"{BASE_URL}/api/sessions/{data['id']}")
    print(f"Cleaned up session_fal {data['id']}")


@pytest.fixture(scope="module")
def session_openai():
    """Create a session with engine=openai, delete at teardown."""
    payload = {
        "titre": "TEST_Engine_OpenAI_Session",
        "engine": "openai",
        "articles": [
            {"index": 1, "titre": "Les nouvelles technologies du BTP"},
        ]
    }
    resp = requests.post(f"{BASE_URL}/api/sessions", json=payload)
    assert resp.status_code == 200, f"Failed to create openai session: {resp.text}"
    data = resp.json()
    yield data
    requests.delete(f"{BASE_URL}/api/sessions/{data['id']}")
    print(f"Cleaned up session_openai {data['id']}")


@pytest.fixture(scope="module")
def session_no_engine():
    """Create a session without engine field (should default to fal), delete at teardown."""
    payload = {
        "titre": "TEST_Engine_Default_Session",
        "articles": [
            {"index": 1, "titre": "Test default engine"},
        ]
    }
    resp = requests.post(f"{BASE_URL}/api/sessions", json=payload)
    assert resp.status_code == 200, f"Failed to create default session: {resp.text}"
    data = resp.json()
    yield data
    requests.delete(f"{BASE_URL}/api/sessions/{data['id']}")
    print(f"Cleaned up session_no_engine {data['id']}")


# ---------------------------------------------------------------
# 1. Session Engine Field Tests
# ---------------------------------------------------------------

class TestSessionEngineField:
    """Test that engine field is properly stored and retrieved in sessions."""

    def test_create_session_with_engine_fal(self, session_fal):
        """POST /api/sessions with engine=fal stores and returns engine field."""
        assert "engine" in session_fal, f"engine field missing in response: {session_fal}"
        assert session_fal["engine"] == "fal", f"Expected engine=fal, got: {session_fal['engine']}"
        assert session_fal["titre"] == "TEST_Engine_FAL_Session"
        print(f"Session with engine=fal created: id={session_fal['id']}")

    def test_create_session_with_engine_openai(self, session_openai):
        """POST /api/sessions with engine=openai stores and returns engine field."""
        assert "engine" in session_openai, f"engine field missing in response: {session_openai}"
        assert session_openai["engine"] == "openai", f"Expected engine=openai, got: {session_openai['engine']}"
        assert session_openai["titre"] == "TEST_Engine_OpenAI_Session"
        print(f"Session with engine=openai created: id={session_openai['id']}")

    def test_create_session_without_engine_defaults_to_fal(self, session_no_engine):
        """POST /api/sessions without engine defaults to fal."""
        assert "engine" in session_no_engine, f"engine field missing in response: {session_no_engine}"
        assert session_no_engine["engine"] == "fal", \
            f"Expected default engine=fal, got: {session_no_engine['engine']}"
        print(f"Session without engine defaults to fal: id={session_no_engine['id']}")

    def test_get_session_returns_engine_fal(self, session_fal):
        """GET /api/sessions/{id} returns engine field for fal session."""
        session_id = session_fal["id"]
        resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "engine" in data, f"engine field missing in GET response: {data}"
        assert data["engine"] == "fal", f"Expected engine=fal, got: {data['engine']}"
        print(f"GET /api/sessions/{session_id}: engine={data['engine']} OK")

    def test_get_session_returns_engine_openai(self, session_openai):
        """GET /api/sessions/{id} returns engine field for openai session."""
        session_id = session_openai["id"]
        resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "engine" in data, f"engine field missing in GET response: {data}"
        assert data["engine"] == "openai", f"Expected engine=openai, got: {data['engine']}"
        print(f"GET /api/sessions/{session_id}: engine={data['engine']} OK")

    def test_get_session_old_without_engine_defaults_to_fal(self, session_no_engine):
        """GET /api/sessions/{id} for session without engine returns fal."""
        session_id = session_no_engine["id"]
        resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("engine", "fal") == "fal", \
            f"Expected engine=fal for old session, got: {data.get('engine')}"
        print(f"GET /api/sessions/{session_id}: default engine=fal OK")


# ---------------------------------------------------------------
# 2. Generate Picto — FAL.ai (regression)
# ---------------------------------------------------------------

class TestGeneratePictoFal:
    """POST /api/generate/picto with engine=fal — FAL.ai behavior unchanged."""

    def test_generate_picto_fal(self):
        """Generate a picto via FAL.ai (engine=fal). Returns CDN URL."""
        payload = {
            "proposition": "A glossy 3D gear icon representing industrial construction",
            "article_index": 1,
            "picto_number": 1,
            "engine": "fal",
        }
        print("Testing picto with engine=fal (FAL.ai, may take 60-120s)...")
        resp = requests.post(
            f"{BASE_URL}/api/generate/picto",
            json=payload,
            timeout=180
        )
        assert resp.status_code == 200, f"Generate picto fal failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "image_url" in data, f"Missing image_url: {data}"
        assert "nom_fichier" in data, f"Missing nom_fichier: {data}"

        # FAL.ai returns CDN URL (not /api/static/uploads/)
        url = data["image_url"]
        assert url.startswith("http"), f"URL must start with http: {url}"
        # FAL.ai URL typically contains fal.media or cdn.fal.media
        # NOT /api/static/uploads/
        assert "/api/static/uploads/" not in url, \
            f"engine=fal should return FAL CDN URL, not uploads path: {url}"
        print(f"Picto fal URL: {url[:80]}... — nom_fichier: {data['nom_fichier']}")

    def test_generate_picto_fal_url_accessible(self):
        """Generate picto via fal and verify generated URL is accessible."""
        payload = {
            "proposition": "A glossy 3D house icon",
            "article_index": 2,
            "picto_number": 2,
            "engine": "fal",
        }
        print("Testing picto fal URL accessibility...")
        resp = requests.post(
            f"{BASE_URL}/api/generate/picto",
            json=payload,
            timeout=180
        )
        assert resp.status_code == 200
        url = resp.json()["image_url"]
        # Verify URL is accessible
        img_resp = requests.get(url, timeout=30)
        assert img_resp.status_code == 200, f"Image URL not accessible: {url} — status: {img_resp.status_code}"
        assert len(img_resp.content) > 0, "Image content is empty"
        print(f"Picto fal URL accessible: {url[:60]}... ({len(img_resp.content)} bytes)")


# ---------------------------------------------------------------
# 3. Generate Picto — OpenAI gpt-image-1
# ---------------------------------------------------------------

class TestGeneratePictoOpenAI:
    """POST /api/generate/picto with engine=openai — Real gpt-image-1 call."""

    def test_generate_picto_openai(self):
        """Generate a picto via gpt-image-1. Returns /api/static/uploads/ URL."""
        payload = {
            "proposition": "A glossy 3D crane icon for construction sector newsletter",
            "article_index": 1,
            "picto_number": 1,
            "engine": "openai",
        }
        print("Testing picto with engine=openai (gpt-image-1, may take 60-90s)...")
        resp = requests.post(
            f"{BASE_URL}/api/generate/picto",
            json=payload,
            timeout=180
        )
        assert resp.status_code == 200, f"Generate picto openai failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "image_url" in data, f"Missing image_url: {data}"
        assert "nom_fichier" in data, f"Missing nom_fichier: {data}"

        url = data["image_url"]
        assert url.startswith("http"), f"URL must start with http: {url}"
        # OpenAI should return /api/static/uploads/ URL
        assert "/api/static/uploads/" in url, \
            f"engine=openai should return /api/static/uploads/ URL, got: {url}"
        # nom_fichier should contain Picto_1_Article01
        assert "Picto_1_Article01" in data["nom_fichier"], \
            f"nom_fichier format unexpected: {data['nom_fichier']}"
        print(f"Picto openai URL: {url} — nom_fichier: {data['nom_fichier']}")
        return url

    def test_generate_picto_openai_url_accessible(self):
        """Generate picto via openai and verify saved image is accessible via /api/static/uploads/."""
        payload = {
            "proposition": "A premium 3D diamond icon for luxury construction",
            "article_index": 3,
            "picto_number": 1,
            "engine": "openai",
        }
        print("Testing picto openai URL accessibility...")
        resp = requests.post(
            f"{BASE_URL}/api/generate/picto",
            json=payload,
            timeout=180
        )
        assert resp.status_code == 200
        url = resp.json()["image_url"]
        assert "/api/static/uploads/" in url, f"Expected uploads URL: {url}"
        # Verify the saved image is accessible
        img_resp = requests.get(url, timeout=30)
        assert img_resp.status_code == 200, \
            f"Saved image not accessible at {url} — status: {img_resp.status_code}"
        assert len(img_resp.content) > 1000, \
            f"Image too small (probably empty): {len(img_resp.content)} bytes"
        # Verify it's a PNG
        assert img_resp.content[:8] == b'\x89PNG\r\n\x1a\n', \
            f"Response is not a PNG file (header: {img_resp.content[:8]})"
        print(f"Picto openai saved image accessible: {url} ({len(img_resp.content)} bytes, PNG verified)")


# ---------------------------------------------------------------
# 4. Generate Illustration — FAL.ai (regression)
# ---------------------------------------------------------------

class TestGenerateIllustrationFal:
    """POST /api/generate/illustration with engine=fal — FAL.ai behavior unchanged."""

    def test_generate_illustration_fal(self):
        """Generate illustration via FAL.ai (engine=fal). Returns CDN URL."""
        payload = {
            "proposition": "Editorial collage showing digital transformation in construction",
            "article_index": 1,
            "engine": "fal",
        }
        print("Testing illustration with engine=fal (FAL.ai, may take 60-120s)...")
        resp = requests.post(
            f"{BASE_URL}/api/generate/illustration",
            json=payload,
            timeout=180
        )
        assert resp.status_code == 200, \
            f"Generate illustration fal failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "image_url" in data, f"Missing image_url: {data}"
        assert "nom_fichier" in data, f"Missing nom_fichier: {data}"

        url = data["image_url"]
        assert url.startswith("http"), f"URL must start with http: {url}"
        # FAL.ai returns CDN URL — not /api/static/uploads/
        assert "/api/static/uploads/" not in url, \
            f"engine=fal should return FAL CDN URL, not uploads path: {url}"
        assert "Illustration_Article01" in data["nom_fichier"], \
            f"nom_fichier format unexpected: {data['nom_fichier']}"
        print(f"Illustration fal URL: {url[:80]}... — nom_fichier: {data['nom_fichier']}")


# ---------------------------------------------------------------
# 5. Generate Illustration — OpenAI gpt-image-1 (size=1536x1024)
# ---------------------------------------------------------------

class TestGenerateIllustrationOpenAI:
    """POST /api/generate/illustration with engine=openai — Real gpt-image-1 call (1536x1024)."""

    def test_generate_illustration_openai(self):
        """Generate illustration via gpt-image-1. Returns /api/static/uploads/ URL."""
        payload = {
            "proposition": "Editorial collage with modern architecture, blueprints, and urban skyline",
            "article_index": 1,
            "engine": "openai",
        }
        print("Testing illustration with engine=openai (gpt-image-1 1536x1024, may take 60-90s)...")
        resp = requests.post(
            f"{BASE_URL}/api/generate/illustration",
            json=payload,
            timeout=180
        )
        assert resp.status_code == 200, \
            f"Generate illustration openai failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "image_url" in data, f"Missing image_url: {data}"
        assert "nom_fichier" in data, f"Missing nom_fichier: {data}"

        url = data["image_url"]
        assert url.startswith("http"), f"URL must start with http: {url}"
        # OpenAI should return /api/static/uploads/ URL
        assert "/api/static/uploads/" in url, \
            f"engine=openai should return /api/static/uploads/ URL, got: {url}"
        assert "Illustration_Article01" in data["nom_fichier"], \
            f"nom_fichier format unexpected: {data['nom_fichier']}"
        print(f"Illustration openai URL: {url} — nom_fichier: {data['nom_fichier']}")

    def test_generate_illustration_openai_url_accessible(self):
        """Generate illustration via openai and verify saved image is accessible."""
        payload = {
            "proposition": "Panoramic urban construction site with cranes and modern buildings at dusk",
            "article_index": 2,
            "engine": "openai",
        }
        print("Testing illustration openai URL accessibility (1536x1024)...")
        resp = requests.post(
            f"{BASE_URL}/api/generate/illustration",
            json=payload,
            timeout=180
        )
        assert resp.status_code == 200
        url = resp.json()["image_url"]
        assert "/api/static/uploads/" in url, f"Expected uploads URL: {url}"
        # Verify the saved image is accessible
        img_resp = requests.get(url, timeout=30)
        assert img_resp.status_code == 200, \
            f"Saved illustration not accessible at {url} — status: {img_resp.status_code}"
        assert len(img_resp.content) > 1000, \
            f"Illustration too small: {len(img_resp.content)} bytes"
        # Verify it's a PNG
        assert img_resp.content[:8] == b'\x89PNG\r\n\x1a\n', \
            f"Response is not a PNG file (header: {img_resp.content[:8]})"
        print(f"Illustration openai accessible: {url} ({len(img_resp.content)} bytes, PNG verified)")
