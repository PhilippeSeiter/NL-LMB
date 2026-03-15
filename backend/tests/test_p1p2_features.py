"""
Backend tests for P1/P2 features:
- Session rename (PUT /api/sessions/{id})
- Session list (GET /api/sessions)
- Session get (GET /api/sessions/{id})
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def test_session_id():
    """Create a TEST_ session for rename tests, clean up after module."""
    payload = {
        "titre": "TEST_P1P2_RenameSession",
        "articles": [
            {"index": 1, "titre": "Article Test 1"},
            {"index": 2, "titre": "Article Test 2"},
        ],
        "engine": "fal",
    }
    resp = requests.post(f"{BASE_URL}/api/sessions", json=payload)
    assert resp.status_code == 200, f"Failed to create test session: {resp.text}"
    session_id = resp.json()["id"]
    yield session_id
    # Cleanup
    requests.delete(f"{BASE_URL}/api/sessions/{session_id}")


class TestSessionList:
    """Tests for GET /api/sessions"""

    def test_get_sessions_returns_200(self):
        resp = requests.get(f"{BASE_URL}/api/sessions")
        assert resp.status_code == 200

    def test_get_sessions_returns_list(self):
        resp = requests.get(f"{BASE_URL}/api/sessions")
        data = resp.json()
        assert isinstance(data, list)

    def test_sessions_have_required_fields(self):
        resp = requests.get(f"{BASE_URL}/api/sessions")
        data = resp.json()
        if len(data) > 0:
            session = data[0]
            assert "id" in session
            assert "titre" in session
            assert "articles" in session
            assert "statut" in session


class TestSessionGet:
    """Tests for GET /api/sessions/{session_id}"""

    def test_get_session_by_id(self, test_session_id):
        resp = requests.get(f"{BASE_URL}/api/sessions/{test_session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == test_session_id
        assert data["titre"] == "TEST_P1P2_RenameSession"

    def test_get_nonexistent_session_returns_404(self):
        fake_id = str(uuid.uuid4())
        resp = requests.get(f"{BASE_URL}/api/sessions/{fake_id}")
        assert resp.status_code == 404

    def test_session_has_articles(self, test_session_id):
        resp = requests.get(f"{BASE_URL}/api/sessions/{test_session_id}")
        data = resp.json()
        assert isinstance(data["articles"], list)
        assert len(data["articles"]) == 2


class TestSessionRename:
    """Tests for PUT /api/sessions/{id} - rename feature used in SessionList and SessionRecap"""

    def test_rename_session_returns_200(self, test_session_id):
        resp = requests.put(
            f"{BASE_URL}/api/sessions/{test_session_id}",
            json={"titre": "TEST_P1P2_Renamed"},
        )
        assert resp.status_code == 200

    def test_rename_session_updates_title_in_response(self, test_session_id):
        new_title = "TEST_P1P2_Renamed_V2"
        resp = requests.put(
            f"{BASE_URL}/api/sessions/{test_session_id}",
            json={"titre": new_title},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["titre"] == new_title

    def test_rename_persists_in_get(self, test_session_id):
        """After PUT rename, GET should return the new title"""
        new_title = "TEST_P1P2_PersistCheck"
        put_resp = requests.put(
            f"{BASE_URL}/api/sessions/{test_session_id}",
            json={"titre": new_title},
        )
        assert put_resp.status_code == 200

        get_resp = requests.get(f"{BASE_URL}/api/sessions/{test_session_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["titre"] == new_title

    def test_rename_nonexistent_session(self):
        fake_id = str(uuid.uuid4())
        resp = requests.put(
            f"{BASE_URL}/api/sessions/{fake_id}",
            json={"titre": "SomeTitle"},
        )
        # Should return 404 for nonexistent session
        assert resp.status_code == 404

    def test_rename_preserves_articles(self, test_session_id):
        """Renaming should not delete articles"""
        put_resp = requests.put(
            f"{BASE_URL}/api/sessions/{test_session_id}",
            json={"titre": "TEST_P1P2_PreserveArticles"},
        )
        assert put_resp.status_code == 200

        get_resp = requests.get(f"{BASE_URL}/api/sessions/{test_session_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert len(data["articles"]) == 2  # Articles should be preserved

    def test_rename_preserves_engine(self, test_session_id):
        """Renaming should not overwrite the engine field"""
        put_resp = requests.put(
            f"{BASE_URL}/api/sessions/{test_session_id}",
            json={"titre": "TEST_P1P2_EngineCheck"},
        )
        assert put_resp.status_code == 200

        get_resp = requests.get(f"{BASE_URL}/api/sessions/{test_session_id}")
        data = get_resp.json()
        assert data.get("engine") == "fal"


class TestSessionCreate:
    """Tests to support multi-article navigation (prev button)"""

    def test_create_session_with_2_articles(self):
        """Verifies sessions with 2+ articles can be created"""
        payload = {
            "titre": "TEST_TwoArticles",
            "articles": [
                {"index": 1, "titre": "Premier Article"},
                {"index": 2, "titre": "Deuxième Article"},
            ],
            "engine": "fal",
        }
        resp = requests.post(f"{BASE_URL}/api/sessions", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["titre"] == "TEST_TwoArticles"
        assert len(data["articles"]) == 2

        # Cleanup
        requests.delete(f"{BASE_URL}/api/sessions/{data['id']}")

    def test_session_engine_field_stored(self):
        """Engine field is properly stored and retrievable"""
        for engine in ["fal", "openai"]:
            payload = {
                "titre": f"TEST_Engine_{engine}",
                "articles": [{"index": 1, "titre": "Test"}],
                "engine": engine,
            }
            resp = requests.post(f"{BASE_URL}/api/sessions", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data.get("engine") == engine
            # Cleanup
            requests.delete(f"{BASE_URL}/api/sessions/{data['id']}")
