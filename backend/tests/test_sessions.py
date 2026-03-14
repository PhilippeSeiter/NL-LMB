"""Backend tests for LMB Illustrations - Sessions CRUD"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSessionsCRUD:
    """Sessions CRUD endpoint tests"""

    def test_get_sessions_empty_or_list(self):
        """GET /api/sessions returns a list"""
        resp = requests.get(f"{BASE_URL}/api/sessions")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"GET /api/sessions: {len(data)} sessions found")

    def test_create_session(self):
        """POST /api/sessions creates a session"""
        payload = {
            "titre": "TEST_Session_Backend",
            "articles": [
                {"index": 1, "titre": "Article TEST 1"},
                {"index": 2, "titre": "Article TEST 2"},
            ]
        }
        resp = requests.post(f"{BASE_URL}/api/sessions", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert data["titre"] == "TEST_Session_Backend"
        assert len(data["articles"]) == 2
        print(f"POST /api/sessions: created session id={data['id']}")
        return data["id"]

    def test_create_and_get_session(self):
        """POST then GET to verify persistence"""
        payload = {
            "titre": "TEST_Session_Get",
            "articles": [{"index": 1, "titre": "Article A"}]
        }
        create_resp = requests.post(f"{BASE_URL}/api/sessions", json=payload)
        assert create_resp.status_code == 200
        session_id = create_resp.json()["id"]

        get_resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["id"] == session_id
        assert data["titre"] == "TEST_Session_Get"
        assert len(data["articles"]) == 1
        print(f"GET /api/sessions/{session_id}: OK")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/sessions/{session_id}")

    def test_update_session(self):
        """PUT /api/sessions/:id updates session"""
        payload = {"titre": "TEST_Session_Update", "articles": [{"index": 1, "titre": "Article X"}]}
        session_id = requests.post(f"{BASE_URL}/api/sessions", json=payload).json()["id"]

        update_resp = requests.put(f"{BASE_URL}/api/sessions/{session_id}", json={"statut": "terminee"})
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["statut"] == "terminee"
        print(f"PUT /api/sessions/{session_id}: statut updated to terminee")

        # Verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        assert get_resp.json()["statut"] == "terminee"

        # Cleanup
        requests.delete(f"{BASE_URL}/api/sessions/{session_id}")

    def test_delete_session(self):
        """DELETE /api/sessions/:id removes session"""
        payload = {"titre": "TEST_Session_Delete", "articles": []}
        session_id = requests.post(f"{BASE_URL}/api/sessions", json=payload).json()["id"]

        del_resp = requests.delete(f"{BASE_URL}/api/sessions/{session_id}")
        assert del_resp.status_code == 200
        print(f"DELETE /api/sessions/{session_id}: OK")

        # Verify removal
        get_resp = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
        assert get_resp.status_code == 404
        print(f"Verified session {session_id} no longer exists")

    def test_get_nonexistent_session(self):
        """GET /api/sessions/nonexistent returns 404"""
        resp = requests.get(f"{BASE_URL}/api/sessions/nonexistentid123")
        assert resp.status_code == 404
        print("GET /api/sessions/nonexistentid123: 404 as expected")
