"""
Subdomain API Tests for MyTrack Smart-Link Service
Tests subdomain CRUD operations, plan limits, and admin management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://app-gateway-17.preview.emergentagent.com')

# Test credentials
TEST_USER = {"email": "test@test.com", "password": "testpass123"}
ADMIN_USER = {"email": "admin@example.com", "password": "admin123"}


class TestSubdomainAPI:
    """Test subdomain CRUD operations for regular users"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as test user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user_data = response.json().get("user")
        else:
            pytest.skip(f"Test user login failed: {response.status_code}")
        
        yield
        
        # Cleanup: Delete any test subdomains created during tests
        try:
            response = self.session.get(f"{BASE_URL}/api/subdomains")
            if response.status_code == 200:
                for sub in response.json().get("subdomains", []):
                    if sub["subdomain"].startswith("test"):
                        self.session.delete(f"{BASE_URL}/api/subdomains/{sub['id']}")
        except:
            pass
    
    def test_get_user_subdomains(self):
        """GET /api/subdomains - Get list of user's subdomains"""
        response = self.session.get(f"{BASE_URL}/api/subdomains")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "subdomains" in data, "Response should contain 'subdomains' key"
        assert "count" in data, "Response should contain 'count' key"
        assert "max_limit" in data, "Response should contain 'max_limit' key"
        assert "can_add" in data, "Response should contain 'can_add' key"
        
        assert isinstance(data["subdomains"], list), "subdomains should be a list"
        assert isinstance(data["count"], int), "count should be an integer"
        
        print(f"✓ User has {data['count']} subdomains, max_limit: {data['max_limit']}, can_add: {data['can_add']}")
    
    def test_check_subdomain_availability_available(self):
        """GET /api/subdomains/check/{subdomain} - Check available subdomain"""
        unique_subdomain = f"test{uuid.uuid4().hex[:8]}"
        response = self.session.get(f"{BASE_URL}/api/subdomains/check/{unique_subdomain}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "available" in data, "Response should contain 'available' key"
        assert data["available"] == True, f"Unique subdomain should be available, got: {data}"
        
        print(f"✓ Subdomain '{unique_subdomain}' is available")
    
    def test_check_subdomain_availability_reserved(self):
        """GET /api/subdomains/check/{subdomain} - Check reserved subdomain"""
        response = self.session.get(f"{BASE_URL}/api/subdomains/check/admin")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["available"] == False, "Reserved subdomain should not be available"
        assert "reason" in data, "Response should contain reason"
        
        print(f"✓ Reserved subdomain 'admin' correctly marked as unavailable: {data['reason']}")
    
    def test_check_subdomain_availability_too_short(self):
        """GET /api/subdomains/check/{subdomain} - Check too short subdomain"""
        response = self.session.get(f"{BASE_URL}/api/subdomains/check/ab")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["available"] == False, "Too short subdomain should not be available"
        
        print(f"✓ Too short subdomain correctly rejected: {data.get('reason')}")
    
    def test_check_subdomain_availability_taken(self):
        """GET /api/subdomains/check/{subdomain} - Check already taken subdomain"""
        # 'mymusic' is already created by test user according to context
        response = self.session.get(f"{BASE_URL}/api/subdomains/check/mymusic")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["available"] == False, "Taken subdomain should not be available"
        
        print(f"✓ Taken subdomain 'mymusic' correctly marked as unavailable: {data.get('reason')}")
    
    def test_plan_limit_enforcement_free_user(self):
        """POST /api/subdomains - Test FREE plan limit (max 1 subdomain)"""
        # First check current state
        response = self.session.get(f"{BASE_URL}/api/subdomains")
        assert response.status_code == 200
        
        data = response.json()
        current_count = data["count"]
        max_limit = data["max_limit"]
        can_add = data["can_add"]
        
        print(f"Current state: count={current_count}, max_limit={max_limit}, can_add={can_add}")
        
        # If user already has max subdomains, try to create another (should fail)
        if not can_add and max_limit != -1:
            unique_subdomain = f"test{uuid.uuid4().hex[:8]}"
            response = self.session.post(f"{BASE_URL}/api/subdomains", json={"subdomain": unique_subdomain})
            
            assert response.status_code == 403, f"Expected 403 for limit exceeded, got {response.status_code}"
            
            data = response.json()
            assert "detail" in data, "Error response should contain detail"
            assert "лимит" in data["detail"].lower() or "limit" in data["detail"].lower(), \
                f"Error should mention limit: {data['detail']}"
            
            print(f"✓ Plan limit correctly enforced: {data['detail']}")
        else:
            print(f"⚠ User can still add subdomains (count={current_count}, limit={max_limit}), skipping limit test")
    
    def test_toggle_subdomain_status(self):
        """PUT /api/subdomains/{id} - Toggle subdomain active status"""
        # Get user's subdomains
        response = self.session.get(f"{BASE_URL}/api/subdomains")
        assert response.status_code == 200
        
        subdomains = response.json().get("subdomains", [])
        if not subdomains:
            pytest.skip("No subdomains to toggle")
        
        subdomain = subdomains[0]
        original_status = subdomain["is_active"]
        
        # Toggle status
        response = self.session.put(
            f"{BASE_URL}/api/subdomains/{subdomain['id']}", 
            json={"is_active": not original_status}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["is_active"] == (not original_status), "Status should be toggled"
        
        # Toggle back to original
        response = self.session.put(
            f"{BASE_URL}/api/subdomains/{subdomain['id']}", 
            json={"is_active": original_status}
        )
        assert response.status_code == 200
        
        print(f"✓ Subdomain '{subdomain['subdomain']}' status toggled successfully")
    
    def test_delete_nonexistent_subdomain(self):
        """DELETE /api/subdomains/{id} - Delete non-existent subdomain"""
        fake_id = str(uuid.uuid4())
        response = self.session.delete(f"{BASE_URL}/api/subdomains/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ Non-existent subdomain deletion correctly returns 404")


class TestAdminSubdomainAPI:
    """Test admin subdomain management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.admin_data = response.json().get("user")
        else:
            pytest.skip(f"Admin login failed: {response.status_code}")
        
        yield
    
    def test_admin_list_all_subdomains(self):
        """GET /api/admin/subdomains - List all subdomains in system"""
        response = self.session.get(f"{BASE_URL}/api/admin/subdomains")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "subdomains" in data, "Response should contain 'subdomains' key"
        assert "total" in data, "Response should contain 'total' key"
        
        # Check subdomain structure
        if data["subdomains"]:
            sub = data["subdomains"][0]
            assert "id" in sub, "Subdomain should have 'id'"
            assert "subdomain" in sub, "Subdomain should have 'subdomain'"
            assert "user_id" in sub, "Subdomain should have 'user_id'"
            assert "owner" in sub, "Subdomain should have 'owner' info"
        
        print(f"✓ Admin can list all subdomains. Total: {data['total']}")
    
    def test_admin_list_subdomains_with_search(self):
        """GET /api/admin/subdomains?search=xxx - Search subdomains"""
        response = self.session.get(f"{BASE_URL}/api/admin/subdomains?search=my")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # All returned subdomains should contain 'my' in name
        for sub in data.get("subdomains", []):
            assert "my" in sub["subdomain"].lower(), f"Search result should contain 'my': {sub['subdomain']}"
        
        print(f"✓ Admin search works. Found {len(data.get('subdomains', []))} subdomains matching 'my'")
    
    def test_admin_toggle_subdomain(self):
        """PUT /api/admin/subdomains/{id}/toggle - Admin toggle subdomain"""
        # First get a subdomain to toggle
        response = self.session.get(f"{BASE_URL}/api/admin/subdomains")
        assert response.status_code == 200
        
        subdomains = response.json().get("subdomains", [])
        if not subdomains:
            pytest.skip("No subdomains to toggle")
        
        subdomain = subdomains[0]
        original_status = subdomain.get("is_active", True)
        
        # Toggle to disabled
        response = self.session.put(
            f"{BASE_URL}/api/admin/subdomains/{subdomain['id']}/toggle",
            json={"is_active": not original_status}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] == True, "Toggle should succeed"
        assert data["is_active"] == (not original_status), "Status should be toggled"
        
        # Toggle back to original
        response = self.session.put(
            f"{BASE_URL}/api/admin/subdomains/{subdomain['id']}/toggle",
            json={"is_active": original_status}
        )
        assert response.status_code == 200
        
        print(f"✓ Admin can toggle subdomain '{subdomain['subdomain']}' status")
    
    def test_admin_toggle_nonexistent_subdomain(self):
        """PUT /api/admin/subdomains/{id}/toggle - Toggle non-existent subdomain"""
        fake_id = str(uuid.uuid4())
        response = self.session.put(
            f"{BASE_URL}/api/admin/subdomains/{fake_id}/toggle",
            json={"is_active": False}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ Admin toggle of non-existent subdomain correctly returns 404")


class TestSubdomainAccessControl:
    """Test access control for subdomain endpoints"""
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are denied"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try to access subdomains without auth
        response = session.get(f"{BASE_URL}/api/subdomains")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print("✓ Unauthenticated access correctly denied")
    
    def test_regular_user_cannot_access_admin_endpoints(self):
        """Test that regular users cannot access admin endpoints"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as regular user
        response = session.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
        if response.status_code != 200:
            pytest.skip("Test user login failed")
        
        token = response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to access admin endpoint
        response = session.get(f"{BASE_URL}/api/admin/subdomains")
        
        # Should be 403 Forbidden (not 401 Unauthorized)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print("✓ Regular user correctly denied access to admin endpoints")


class TestSubdomainValidation:
    """Test subdomain validation rules"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin (has unlimited subdomains)
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Admin login failed")
        
        yield
    
    def test_subdomain_with_invalid_characters(self):
        """Test subdomain with invalid characters is rejected"""
        response = self.session.get(f"{BASE_URL}/api/subdomains/check/test_invalid")
        
        assert response.status_code == 200
        data = response.json()
        assert data["available"] == False, "Subdomain with underscore should be rejected"
        
        print(f"✓ Invalid characters correctly rejected: {data.get('reason')}")
    
    def test_subdomain_starting_with_hyphen(self):
        """Test subdomain starting with hyphen is rejected"""
        response = self.session.get(f"{BASE_URL}/api/subdomains/check/-testdomain")
        
        assert response.status_code == 200
        data = response.json()
        assert data["available"] == False, "Subdomain starting with hyphen should be rejected"
        
        print(f"✓ Hyphen at start correctly rejected: {data.get('reason')}")
    
    def test_subdomain_ending_with_hyphen(self):
        """Test subdomain ending with hyphen is rejected"""
        response = self.session.get(f"{BASE_URL}/api/subdomains/check/testdomain-")
        
        assert response.status_code == 200
        data = response.json()
        assert data["available"] == False, "Subdomain ending with hyphen should be rejected"
        
        print(f"✓ Hyphen at end correctly rejected: {data.get('reason')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
