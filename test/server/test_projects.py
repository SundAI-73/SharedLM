"""
Comprehensive tests for projects endpoints
"""
import pytest
from fastapi.testclient import TestClient
from test.fixtures.sample_data import SAMPLE_PROJECT, SAMPLE_PROJECT_2
from database import crud
from database.models import ProjectFile


@pytest.mark.api
class TestProjects:
    """Test projects endpoints"""
    
    def test_create_project_success(self, client: TestClient, test_user, auth_headers):
        """Test successful project creation"""
        response = client.post(
            f"/projects/{test_user.id}",
            json=SAMPLE_PROJECT,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "project" in data
        assert data["project"]["name"] == SAMPLE_PROJECT["name"]
        assert "id" in data["project"]
        assert "type" in data["project"]
    
    def test_create_project_unauthorized(self, client: TestClient, test_user, test_user_2, auth_headers):
        """Test project creation for another user (should fail)"""
        response = client.post(
            f"/projects/{test_user_2.id}",
            json=SAMPLE_PROJECT,
            headers=auth_headers
        )
        assert response.status_code == 403
    
    def test_get_user_projects(self, client: TestClient, test_user, test_project, auth_headers):
        """Test getting user projects"""
        response = client.get(
            f"/projects/{test_user.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(p["id"] == test_project.id for p in data)
    
    def test_get_user_projects_empty(self, client: TestClient, test_user, auth_headers):
        """Test getting projects for user with no projects"""
        response = client.get(
            f"/projects/{test_user.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_project_success(self, client: TestClient, test_user, test_project, auth_headers):
        """Test successful project update"""
        new_name = "Updated Project Name"
        response = client.patch(
            f"/projects/{test_project.id}",
            json={"name": new_name, "is_starred": True},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["project"]["name"] == new_name
    
    def test_update_project_nonexistent(self, client: TestClient, test_user, auth_headers):
        """Test updating nonexistent project"""
        response = client.patch(
            "/projects/99999",
            json={"name": "New Name"},
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_update_project_unauthorized(self, client: TestClient, test_user, test_user_2, test_project, auth_headers):
        """Test updating another user's project (should fail)"""
        # Create project for user 2
        project2 = client.post(
            f"/projects/{test_user_2.id}",
            json=SAMPLE_PROJECT_2,
            headers={"X-User-ID": test_user_2.id}
        ).json()["project"]
        
        # Try to update user 2's project as user 1 (should fail)
        response = client.patch(
            f"/projects/{project2['id']}",
            json={"name": "Hacked Name"},
            headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 403
    
    def test_delete_project_success(self, client: TestClient, test_user, test_project, auth_headers, test_db):
        """Test successful project deletion"""
        project_id = test_project.id
        response = client.delete(
            f"/projects/{project_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify project is deleted
        get_response = client.get(
            f"/projects/{test_user.id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        projects = get_response.json()
        assert isinstance(projects, list)
        assert not any(p["id"] == project_id for p in projects)
    
    def test_delete_project_nonexistent(self, client: TestClient, auth_headers):
        """Test deleting nonexistent project"""
        response = client.delete(
            "/projects/99999",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_delete_project_unauthorized(self, client: TestClient, test_user, test_user_2, test_project, auth_headers):
        """Test deleting another user's project (should fail)"""
        # Create project for user 2
        project2 = client.post(
            f"/projects/{test_user_2.id}",
            json=SAMPLE_PROJECT_2,
            headers={"X-User-ID": test_user_2.id}
        ).json()["project"]
        
        # Try to delete user 2's project as user 1 (should fail)
        response = client.delete(
            f"/projects/{project2['id']}",
            headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 403


@pytest.mark.api
class TestProjectFiles:
    """Test project file operations"""
    
    def test_upload_project_file_success(self, client: TestClient, test_user, test_project, auth_headers, tmpdir):
        """Test successful project file upload"""
        # Create a test file
        test_file = tmpdir.join("test.txt")
        test_file.write("Test file content")
        
        with open(test_file, "rb") as f:
            response = client.post(
                f"/projects/{test_project.id}/upload",
                files={"file": ("test.txt", f, "text/plain")},
                headers=auth_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "file" in data
        assert data["file"]["filename"] == "test.txt"
        assert "id" in data["file"]
    
    def test_upload_project_file_unauthorized(self, client: TestClient, test_user_2, test_project, auth_headers, tmpdir):
        """Test uploading file to another user's project (should fail)"""
        test_file = tmpdir.join("test.txt")
        test_file.write("Test content")
        
        with open(test_file, "rb") as f:
            response = client.post(
                f"/projects/{test_project.id}/upload",
                files={"file": ("test.txt", f, "text/plain")},
                headers={"X-User-ID": test_user_2.id}
            )
        
        assert response.status_code == 403
    
    def test_upload_project_file_invalid(self, client: TestClient, test_user, test_project, auth_headers):
        """Test uploading invalid file to project"""
        response = client.post(
            f"/projects/{test_project.id}/upload",
            files={"file": ("test.exe", b"content", "application/x-msdownload")},
            headers=auth_headers
        )
        
        assert response.status_code == 400
    
    def test_get_project_files_success(self, client: TestClient, test_user, test_project, auth_headers, test_db, tmpdir):
        """Test getting project files"""
        # Upload a file first
        test_file = tmpdir.join("test.txt")
        test_file.write("Test content")
        
        with open(test_file, "rb") as f:
            upload_response = client.post(
                f"/projects/{test_project.id}/upload",
                files={"file": ("test.txt", f, "text/plain")},
                headers=auth_headers
            )
        
        file_id = upload_response.json()["file"]["id"]
        
        # Get project files
        response = client.get(
            f"/projects/{test_project.id}/files",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(f["id"] == file_id for f in data)
    
    def test_get_project_files_empty(self, client: TestClient, test_user, test_project, auth_headers):
        """Test getting files for project with no files"""
        response = client.get(
            f"/projects/{test_project.id}/files",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_project_files_unauthorized(self, client: TestClient, test_user_2, test_project, auth_headers):
        """Test getting files from another user's project (should fail)"""
        response = client.get(
            f"/projects/{test_project.id}/files",
            headers={"X-User-ID": test_user_2.id}
        )
        
        assert response.status_code == 403
    
    def test_delete_project_file_success(self, client: TestClient, test_user, test_project, auth_headers, test_db, tmpdir):
        """Test deleting project file"""
        # Upload a file first
        test_file = tmpdir.join("test.txt")
        test_file.write("Test content")
        
        with open(test_file, "rb") as f:
            upload_response = client.post(
                f"/projects/{test_project.id}/upload",
                files={"file": ("test.txt", f, "text/plain")},
                headers=auth_headers
            )
        
        file_id = upload_response.json()["file"]["id"]
        
        # Delete file
        response = client.delete(
            f"/projects/files/{file_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify file is deleted
        file_obj = test_db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
        assert file_obj is None
    
    def test_delete_project_file_nonexistent(self, client: TestClient, test_user, auth_headers):
        """Test deleting nonexistent project file"""
        response = client.delete(
            "/projects/files/99999",
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    def test_delete_project_file_unauthorized(self, client: TestClient, test_user, test_user_2, test_project, auth_headers, test_db, tmpdir):
        """Test deleting file from another user's project (should fail)"""
        # Upload a file to user 1's project (as user 1)
        test_file = tmpdir.join("test.txt")
        test_file.write("Test content")
        
        with open(test_file, "rb") as f:
            upload_response = client.post(
                f"/projects/{test_project.id}/upload",
                files={"file": ("test.txt", f, "text/plain")},
                headers=auth_headers  # Use user 1's headers
            )
        
        file_id = upload_response.json()["file"]["id"]
        
        # Try to delete as user 2 (should fail)
        response = client.delete(
            f"/projects/files/{file_id}",
            headers={"X-User-ID": test_user_2.id}
        )
        
        assert response.status_code == 403
    
    def test_upload_project_file_pdf(self, client: TestClient, test_user, test_project, auth_headers, tmpdir):
        """Test uploading PDF file to project"""
        test_file = tmpdir.join("test.pdf")
        test_file.write_binary(b"PDF content")
        
        with open(test_file, "rb") as f:
            response = client.post(
                f"/projects/{test_project.id}/upload",
                files={"file": ("test.pdf", f, "application/pdf")},
                headers=auth_headers
            )
        
        assert response.status_code == 200
        assert response.json()["file"]["filename"] == "test.pdf"
    
    def test_upload_project_file_too_large(self, client: TestClient, test_user, test_project, auth_headers):
        """Test uploading file that's too large"""
        large_content = b"x" * (11 * 1024 * 1024)  # 11MB
        
        response = client.post(
            f"/projects/{test_project.id}/upload",
            files={"file": ("large.txt", large_content, "text/plain")},
            headers=auth_headers
        )
        
        assert response.status_code == 400
