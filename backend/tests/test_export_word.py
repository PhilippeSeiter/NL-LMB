"""
Tests for the Word export feature: GET /api/sessions/{id}/export-word
Tests:
  - Content-Type header is correct for .docx
  - Response body is a valid ZIP (i.e. a valid .docx file)
  - ZIP contains word/document.xml
  - Works with a session that has articles with pictos and illustrations
  - Works with an empty session (0 articles)
  - Returns 404 for unknown session_id
  - Content-Disposition header contains the session titre
"""

import pytest
import requests
import os
import io
import zipfile
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Known session in DB with pictos+illustrations (created in previous tests)
SESSION_WITH_IMAGES = "5a81d182-0d09-4978-9b18-598d6bdb7488"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def empty_session_id(api_client):
    """Create a temporary session with 0 articles for testing."""
    payload = {
        "titre": "TEST_WordExport_Empty_Session",
        "engine": "fal",
        "articles": []
    }
    resp = api_client.post(f"{BASE_URL}/api/sessions", json=payload)
    assert resp.status_code == 200, f"Failed to create empty session: {resp.text}"
    sid = resp.json()["id"]
    yield sid
    # Cleanup
    api_client.delete(f"{BASE_URL}/api/sessions/{sid}")


@pytest.fixture(scope="module")
def session_with_articles_id(api_client):
    """Create a session with 2 articles (no images, text only) for structure testing."""
    payload = {
        "titre": "TEST_WordExport_Articles_Session",
        "engine": "fal",
        "articles": [
            {"index": 1, "titre": "Article de test numéro un"},
            {"index": 2, "titre": "Article de test numéro deux"},
        ]
    }
    resp = api_client.post(f"{BASE_URL}/api/sessions", json=payload)
    assert resp.status_code == 200, f"Failed to create session: {resp.text}"
    sid = resp.json()["id"]
    yield sid
    # Cleanup
    api_client.delete(f"{BASE_URL}/api/sessions/{sid}")


# ---------------------------------------------------------------------------
# Test 1: 404 for unknown session
# ---------------------------------------------------------------------------
class TestExportWordNotFound:
    """404 for non-existent session"""

    def test_export_word_404_unknown_session(self, api_client):
        fake_id = str(uuid.uuid4())
        resp = api_client.get(f"{BASE_URL}/api/sessions/{fake_id}/export-word")
        assert resp.status_code == 404, (
            f"Expected 404 for unknown session, got {resp.status_code}"
        )
        print("PASS: 404 returned for unknown session_id")


# ---------------------------------------------------------------------------
# Test 2: Content-Type header
# ---------------------------------------------------------------------------
class TestExportWordContentType:
    """Content-Type must be the Word MIME type"""

    def test_content_type_is_docx(self, api_client, empty_session_id):
        resp = api_client.get(
            f"{BASE_URL}/api/sessions/{empty_session_id}/export-word",
            stream=True
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        ct = resp.headers.get("Content-Type", "")
        assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in ct, (
            f"Unexpected Content-Type: {ct}"
        )
        print(f"PASS: Content-Type is correct: {ct}")


# ---------------------------------------------------------------------------
# Test 3: Content-Disposition header contains session title
# ---------------------------------------------------------------------------
class TestExportWordContentDisposition:
    """Content-Disposition must include a filename derived from session titre"""

    def test_content_disposition_has_filename(self, api_client, empty_session_id):
        resp = api_client.get(
            f"{BASE_URL}/api/sessions/{empty_session_id}/export-word",
            stream=True
        )
        assert resp.status_code == 200
        cd = resp.headers.get("Content-Disposition", "")
        assert "attachment" in cd, f"Content-Disposition missing 'attachment': {cd}"
        assert ".docx" in cd, f"Content-Disposition missing '.docx' extension: {cd}"
        # The filename should contain a sanitized version of the title
        # titre = "TEST_WordExport_Empty_Session" → sanitized contains "TEST_WordExport_Empty_Session"
        assert "TEST_WordExport_Empty_Session" in cd or "TEST" in cd, (
            f"Content-Disposition does not contain session title: {cd}"
        )
        print(f"PASS: Content-Disposition: {cd}")

    def test_content_disposition_known_session(self, api_client):
        """Test with the known session with images to verify title in filename"""
        resp = api_client.get(
            f"{BASE_URL}/api/sessions/{SESSION_WITH_IMAGES}/export-word",
            stream=True
        )
        assert resp.status_code == 200
        cd = resp.headers.get("Content-Disposition", "")
        assert ".docx" in cd, f"Content-Disposition missing .docx: {cd}"
        print(f"PASS: Content-Disposition for session with images: {cd}")


# ---------------------------------------------------------------------------
# Test 4: Valid ZIP (valid .docx structure)
# ---------------------------------------------------------------------------
class TestExportWordZipValid:
    """The .docx must be a valid ZIP file"""

    def test_docx_is_valid_zip_empty_session(self, api_client, empty_session_id):
        resp = api_client.get(f"{BASE_URL}/api/sessions/{empty_session_id}/export-word")
        assert resp.status_code == 200
        content = resp.content
        assert len(content) > 0, "Response body is empty"
        assert zipfile.is_zipfile(io.BytesIO(content)), "Response is not a valid ZIP file"
        print(f"PASS: .docx is a valid ZIP ({len(content)} bytes)")

    def test_docx_contains_word_document_xml_empty_session(self, api_client, empty_session_id):
        resp = api_client.get(f"{BASE_URL}/api/sessions/{empty_session_id}/export-word")
        assert resp.status_code == 200
        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        names = zf.namelist()
        assert "word/document.xml" in names, (
            f"word/document.xml not found in .docx ZIP. Found: {names}"
        )
        print(f"PASS: word/document.xml present. ZIP contents: {names}")

    def test_docx_is_valid_zip_session_with_articles(self, api_client, session_with_articles_id):
        resp = api_client.get(
            f"{BASE_URL}/api/sessions/{session_with_articles_id}/export-word"
        )
        assert resp.status_code == 200
        content = resp.content
        assert zipfile.is_zipfile(io.BytesIO(content)), "Response is not a valid ZIP"
        zf = zipfile.ZipFile(io.BytesIO(content))
        assert "word/document.xml" in zf.namelist(), "word/document.xml missing"
        print(f"PASS: session with articles returns valid .docx ({len(content)} bytes)")

    def test_docx_is_valid_zip_session_with_images(self, api_client):
        """Test with known session that has real pictos and illustration URLs"""
        resp = api_client.get(
            f"{BASE_URL}/api/sessions/{SESSION_WITH_IMAGES}/export-word"
        )
        assert resp.status_code == 200, (
            f"Expected 200 for session with images, got {resp.status_code}"
        )
        content = resp.content
        assert zipfile.is_zipfile(io.BytesIO(content)), "Response is not a valid ZIP"
        zf = zipfile.ZipFile(io.BytesIO(content))
        names = zf.namelist()
        assert "word/document.xml" in names, f"word/document.xml missing from: {names}"
        print(f"PASS: session with images returns valid .docx ({len(content)} bytes)")
        print(f"  ZIP contains: {names}")


# ---------------------------------------------------------------------------
# Test 5: Document XML content
# ---------------------------------------------------------------------------
class TestExportWordDocumentContent:
    """Verify basic content inside word/document.xml"""

    def test_document_xml_is_parseable(self, api_client, session_with_articles_id):
        resp = api_client.get(
            f"{BASE_URL}/api/sessions/{session_with_articles_id}/export-word"
        )
        assert resp.status_code == 200
        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        xml_bytes = zf.read("word/document.xml")
        assert len(xml_bytes) > 0, "word/document.xml is empty"
        # Should be valid XML
        import xml.etree.ElementTree as ET
        root = ET.fromstring(xml_bytes)
        assert root is not None, "word/document.xml is not valid XML"
        print(f"PASS: word/document.xml is valid XML ({len(xml_bytes)} bytes)")

    def test_document_xml_contains_article_titles(self, api_client, session_with_articles_id):
        """Article titles should appear in the document XML"""
        resp = api_client.get(
            f"{BASE_URL}/api/sessions/{session_with_articles_id}/export-word"
        )
        assert resp.status_code == 200
        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        xml_bytes = zf.read("word/document.xml")
        xml_str = xml_bytes.decode("utf-8")
        # Article titles from the session fixture
        assert "Article de test num" in xml_str or "Article" in xml_str, (
            "Article title not found in document.xml"
        )
        print("PASS: Article title found in word/document.xml")

    def test_cover_page_title_in_document(self, api_client, empty_session_id):
        """Cover page title 'Visuels Newsletter LMB' should be in the document"""
        resp = api_client.get(
            f"{BASE_URL}/api/sessions/{empty_session_id}/export-word"
        )
        assert resp.status_code == 200
        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        xml_bytes = zf.read("word/document.xml")
        xml_str = xml_bytes.decode("utf-8")
        assert "Visuels Newsletter LMB" in xml_str, (
            "Cover page title 'Visuels Newsletter LMB' not found in document.xml"
        )
        print("PASS: Cover page title found in word/document.xml")


# ---------------------------------------------------------------------------
# Test 6: French date in document
# ---------------------------------------------------------------------------
class TestExportWordFrenchDate:
    """The document should contain a French month name in the cover page"""

    FRENCH_MONTHS = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ]

    def test_french_date_in_document(self, api_client, empty_session_id):
        resp = api_client.get(
            f"{BASE_URL}/api/sessions/{empty_session_id}/export-word"
        )
        assert resp.status_code == 200
        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        xml_bytes = zf.read("word/document.xml")
        xml_str = xml_bytes.decode("utf-8")
        found_month = any(m in xml_str for m in self.FRENCH_MONTHS)
        assert found_month, (
            f"No French month name found in document.xml (cover page date missing)"
        )
        print("PASS: French month name found in word/document.xml")
