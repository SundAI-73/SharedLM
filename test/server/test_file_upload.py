"""
Tests for file upload endpoints
"""
import pytest
import os
import tempfile
from fastapi.testclient import TestClient
from io import BytesIO


@pytest.mark.api
class TestFileUpload:
    """Test file upload endpoints"""
    
    def test_upload_file_success(self, client: TestClient, test_user, auth_headers):
        """Test successful file upload"""
        file_content = b"Test file content"
        file_data = BytesIO(file_content)
        
        response = client.post(
            "/upload",
            files={"file": ("test.txt", file_data, "text/plain")},
            data={"user_id": test_user.id},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "file" in data
        assert data["file"]["filename"] == "test.txt"
        assert data["file"]["size"] == len(file_content)
        assert "stored_name" in data["file"]
        assert "path" in data["file"]
    
    def test_upload_file_pdf(self, client: TestClient, test_user, auth_headers):
        """Test uploading PDF file"""
        file_content = b"%PDF-1.4\nTest PDF content"
        file_data = BytesIO(file_content)
        
        response = client.post(
            "/upload",
            files={"file": ("test.pdf", file_data, "application/pdf")},
            data={"user_id": test_user.id},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["file"]["filename"] == "test.pdf"
    
    def test_upload_file_image(self, client: TestClient, test_user, auth_headers):
        """Test uploading image file"""
        # Create a simple PNG file header
        file_content = b"\x89PNG\r\n\x1a\n" + b"x" * 100
        file_data = BytesIO(file_content)
        
        response = client.post(
            "/upload",
            files={"file": ("test.png", file_data, "image/png")},
            data={"user_id": test_user.id},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["file"]["filename"] == "test.png"
    
    def test_upload_file_missing_filename(self, client: TestClient, test_user, auth_headers):
        """Test uploading file without filename"""
        file_content = b"Test content"
        # Create a fresh BytesIO that can be read - the endpoint checks filename before reading
        # So even if the stream is consumed, the check happens first
        response = client.post(
            "/upload",
            files={"file": ("", BytesIO(file_content), "text/plain")},
            data={"user_id": test_user.id},
            headers=auth_headers
        )
        # The endpoint should check filename first and return 400 before reading
        assert response.status_code == 400
    
    def test_upload_file_too_large(self, client: TestClient, test_user, auth_headers):
        """Test uploading file that exceeds size limit"""
        # Create file larger than 10MB
        file_content = b"x" * (11 * 1024 * 1024)  # 11MB
        file_data = BytesIO(file_content)
        
        response = client.post(
            "/upload",
            files={"file": ("large.txt", file_data, "text/plain")},
            data={"user_id": test_user.id},
            headers=auth_headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "size" in data["detail"].lower() or "large" in data["detail"].lower()
    
    def test_upload_file_invalid_type(self, client: TestClient, test_user, auth_headers):
        """Test uploading file with invalid type"""
        file_content = b"Test content"
        file_data = BytesIO(file_content)
        
        response = client.post(
            "/upload",
            files={"file": ("test.exe", file_data, "application/x-msdownload")},
            data={"user_id": test_user.id},
            headers=auth_headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "not allowed" in data["detail"].lower() or "type" in data["detail"].lower()
    
    def test_upload_file_unauthorized(self, client: TestClient, test_user_2, auth_headers):
        """Test uploading file for another user (should fail if user_id provided)"""
        file_content = b"Test content"
        file_data = BytesIO(file_content)
        
        response = client.post(
            "/upload",
            files={"file": ("test.txt", file_data, "text/plain")},
            data={"user_id": test_user_2.id},
            headers=auth_headers
        )
        assert response.status_code == 403
    
    def test_upload_file_with_conversation_id(self, client: TestClient, test_user, test_conversation, auth_headers):
        """Test uploading file with conversation_id"""
        file_content = b"Test content"
        file_data = BytesIO(file_content)
        
        response = client.post(
            "/upload",
            files={"file": ("test.txt", file_data, "text/plain")},
            data={
                "user_id": test_user.id,
                "conversation_id": str(test_conversation.id)
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


@pytest.mark.api
class TestProjectFileUpload:
    """Test project file upload endpoints"""
    
    def test_upload_project_file_success(self, client: TestClient, test_user, test_project, auth_headers):
        """Test successful project file upload"""
        file_content = b"Test project file content"
        file_data = BytesIO(file_content)
        
        response = client.post(
            f"/projects/{test_project.id}/upload",
            files={"file": ("project_file.txt", file_data, "text/plain")},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "file" in data
        assert data["file"]["filename"] == "project_file.txt"
        assert data["file"]["size"] == len(file_content)
        assert "id" in data["file"]
    
    def test_upload_project_file_unauthorized(self, client: TestClient, test_user_2, test_project, auth_headers):
        """Test uploading file to another user's project (should fail)"""
        file_content = b"Test content"
        file_data = BytesIO(file_content)
        
        response = client.post(
            f"/projects/{test_project.id}/upload",
            files={"file": ("test.txt", file_data, "text/plain")},
            headers={"X-User-ID": test_user_2.id}
        )
        assert response.status_code == 403
    
    def test_get_project_files_success(self, client: TestClient, test_user, test_project, auth_headers, test_db):
        """Test getting project files"""
        from database import crud
        
        # Upload a file first
        file_content = b"Test content"
        file_data = BytesIO(file_content)
        
        upload_response = client.post(
            f"/projects/{test_project.id}/upload",
            files={"file": ("test.txt", file_data, "text/plain")},
            headers=auth_headers
        )
        assert upload_response.status_code == 200
        
        # Get files
        response = client.get(
            f"/projects/{test_project.id}/files",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_get_project_files_empty(self, client: TestClient, test_user, test_project, auth_headers):
        """Test getting files from project with no files"""
        response = client.get(
            f"/projects/{test_project.id}/files",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_delete_project_file_success(self, client: TestClient, test_user, test_project, auth_headers, test_db):
        """Test deleting project file"""
        from database import crud
        
        # Upload a file first
        file_content = b"Test content"
        file_data = BytesIO(file_content)
        
        upload_response = client.post(
            f"/projects/{test_project.id}/upload",
            files={"file": ("test.txt", file_data, "text/plain")},
            headers=auth_headers
        )
        assert upload_response.status_code == 200
        file_id = upload_response.json()["file"]["id"]
        
        response = client.delete(
            f"/projects/files/{file_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify file is deleted
        get_response = client.get(
            f"/projects/{test_project.id}/files",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        files = get_response.json()
        assert not any(f["id"] == file_id for f in files)
    
    def test_delete_project_file_nonexistent(self, client: TestClient, auth_headers):
        """Test deleting nonexistent project file"""
        response = client.delete(
            "/projects/files/99999",
            headers=auth_headers
        )
        assert response.status_code == 404

