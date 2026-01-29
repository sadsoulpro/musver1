#!/usr/bin/env python3
"""
Test script specifically for the new Admin Panel - View User Profile and Pages feature
"""

import requests
import sys
import json
from datetime import datetime
import time

class AdminPanelTester:
    def __init__(self, base_url="https://medialinker-4.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.owner_token = None
        self.regular_token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add auth header if needed
        if token:
            test_headers['Authorization'] = f'Bearer {token}'
        elif headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, allow_redirects=False)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, allow_redirects=False)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, allow_redirects=False)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, allow_redirects=False)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def setup_test_users(self):
        """Setup test users and get tokens"""
        print("🔧 Setting up test users...")
        
        # 1. Create regular user
        timestamp = int(time.time())
        regular_user_data = {
            "email": f"regular{timestamp}@example.com",
            "username": f"regular{timestamp}",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "Create Regular User",
            "POST",
            "auth/register",
            200,
            data=regular_user_data
        )
        
        if success and 'token' in response:
            self.regular_token = response['token']
            self.test_user_id = response['user']['id']
            print(f"   ✅ Regular user created: {regular_user_data['email']}")
        else:
            print("❌ Failed to create regular user")
            return False
        
        # 2. Login as admin (assuming admin@example.com exists)
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   ✅ Admin logged in")
        else:
            print("❌ Failed to login as admin")
            return False
        
        # 3. Try to login as owner
        success, response = self.run_test(
            "Owner Login",
            "POST",
            "auth/login",
            200,
            data={"email": "thedrumepic@gmail.com", "password": "ownerpass123"}
        )
        
        if success and 'token' in response:
            self.owner_token = response['token']
            print(f"   ✅ Owner logged in")
        else:
            print("⚠️ Owner login failed - may not exist")
        
        return True

    def test_admin_get_user_profile(self):
        """Test GET /api/admin/users/{user_id} - Get user profile details"""
        if not self.admin_token or not self.test_user_id:
            print("❌ No admin token or test user ID available")
            return False
            
        success, response = self.run_test(
            "Admin Get User Profile",
            "GET",
            f"admin/users/{self.test_user_id}",
            200,
            token=self.admin_token
        )
        
        if not success:
            return False
            
        # Verify required fields are present
        required_fields = ['id', 'email', 'username', 'role', 'plan', 'page_count', 'total_clicks']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field: {field}")
                return False
        
        # Verify sensitive fields are NOT present
        sensitive_fields = ['password_hash', 'reset_token', 'reset_token_expiry']
        for field in sensitive_fields:
            if field in response:
                print(f"❌ Sensitive field should not be present: {field}")
                return False
        
        print(f"   ✅ User ID: {response.get('id')}")
        print(f"   ✅ Email: {response.get('email')}")
        print(f"   ✅ Page count: {response.get('page_count')}")
        print(f"   ✅ Total clicks: {response.get('total_clicks')}")
        return True

    def test_admin_get_user_pages(self):
        """Test GET /api/admin/users/{user_id}/pages - Get user's pages list"""
        if not self.admin_token or not self.test_user_id:
            print("❌ No admin token or test user ID available")
            return False
            
        success, response = self.run_test(
            "Admin Get User Pages",
            "GET",
            f"admin/users/{self.test_user_id}/pages",
            200,
            token=self.admin_token
        )
        
        if not success:
            return False
            
        # Verify response structure
        required_fields = ['pages', 'total', 'skip', 'limit', 'user']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field: {field}")
                return False
        
        # Verify pages array structure (if pages exist)
        pages = response.get('pages', [])
        if pages:
            first_page = pages[0]
            page_required_fields = ['id', 'title', 'slug', 'total_clicks', 'clicks_7d']
            for field in page_required_fields:
                if field not in first_page:
                    print(f"❌ Missing required page field: {field}")
                    return False
        
        print(f"   ✅ Found {len(pages)} pages")
        print(f"   ✅ Total pages: {response.get('total')}")
        print(f"   ✅ User info: {response.get('user', {}).get('username')}")
        return True

    def test_admin_get_audit_logs(self):
        """Test GET /api/admin/audit-logs - Get audit logs"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        success, response = self.run_test(
            "Admin Get Audit Logs",
            "GET",
            "admin/audit-logs",
            200,
            token=self.admin_token
        )
        
        if not success:
            return False
            
        # Verify response structure
        required_fields = ['logs', 'total', 'skip', 'limit']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field: {field}")
                return False
        
        # Verify logs array structure
        logs = response.get('logs', [])
        if logs:
            first_log = logs[0]
            log_required_fields = ['id', 'admin_id', 'event', 'timestamp', 'admin_email', 'admin_username']
            for field in log_required_fields:
                if field not in first_log:
                    print(f"❌ Missing required log field: {field}")
                    return False
        
        print(f"   ✅ Found {len(logs)} audit logs")
        print(f"   ✅ Total logs: {response.get('total')}")
        if logs:
            print(f"   ✅ Latest event: {logs[0].get('event')}")
        return True

    def test_rbac_regular_user_403(self):
        """Test RBAC - Regular user should get 403 on admin endpoints"""
        if not self.regular_token or not self.test_user_id:
            print("❌ No regular user token or test user ID available")
            return False
            
        # Test user profile endpoint - should get 403
        success, response = self.run_test(
            "Regular User Access User Profile (Should Fail)",
            "GET",
            f"admin/users/{self.test_user_id}",
            403,  # Should be forbidden
            token=self.regular_token
        )
        
        if not success:
            print("❌ Regular user should get 403 for admin/users/{id}")
            return False
            
        # Test user pages endpoint - should get 403
        success, response = self.run_test(
            "Regular User Access User Pages (Should Fail)",
            "GET",
            f"admin/users/{self.test_user_id}/pages",
            403,  # Should be forbidden
            token=self.regular_token
        )
        
        if not success:
            print("❌ Regular user should get 403 for admin/users/{id}/pages")
            return False
            
        print(f"   ✅ Regular user correctly blocked from admin endpoints")
        return True

    def test_rbac_owner_access(self):
        """Test RBAC - Owner should have access to all endpoints"""
        if not self.owner_token or not self.test_user_id:
            print("⚠️ No owner token or test user ID available - skipping")
            return True  # Skip if owner doesn't exist
            
        # Test owner access to user profile
        success, response = self.run_test(
            "Owner Access User Profile",
            "GET",
            f"admin/users/{self.test_user_id}",
            200,
            token=self.owner_token
        )
        
        if not success:
            return False
            
        # Test owner access to user pages
        success, response = self.run_test(
            "Owner Access User Pages",
            "GET",
            f"admin/users/{self.test_user_id}/pages",
            200,
            token=self.owner_token
        )
        
        if not success:
            return False
            
        # Test owner access to audit logs
        success, response = self.run_test(
            "Owner Access Audit Logs",
            "GET",
            "admin/audit-logs",
            200,
            token=self.owner_token
        )
        
        if not success:
            return False
            
        print(f"   ✅ Owner has access to all admin endpoints")
        return True

    def test_admin_user_not_found(self):
        """Test admin endpoints with non-existent user ID"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        fake_user_id = "non-existent-user-id"
        
        # Test user profile with fake ID - should get 404
        success, response = self.run_test(
            "Admin Get Non-existent User Profile",
            "GET",
            f"admin/users/{fake_user_id}",
            404,
            token=self.admin_token
        )
        
        if not success:
            return False
            
        # Test user pages with fake ID - should get 404
        success, response = self.run_test(
            "Admin Get Non-existent User Pages",
            "GET",
            f"admin/users/{fake_user_id}/pages",
            404,
            token=self.admin_token
        )
        
        if not success:
            return False
            
        print(f"   ✅ Non-existent user correctly returns 404")
        return True

    def test_unauthenticated_access(self):
        """Test that unauthenticated requests get 401"""
        if not self.test_user_id:
            print("❌ No test user ID available")
            return False
            
        # Test without any token - should get 401
        success, response = self.run_test(
            "Unauthenticated Access User Profile (Should Fail)",
            "GET",
            f"admin/users/{self.test_user_id}",
            401,  # Should be unauthorized
            token=None
        )
        
        if not success:
            return False
            
        # Test audit logs without token - should get 401
        success, response = self.run_test(
            "Unauthenticated Access Audit Logs (Should Fail)",
            "GET",
            "admin/audit-logs",
            401,  # Should be unauthorized
            token=None
        )
        
        if not success:
            return False
            
        print(f"   ✅ Unauthenticated requests correctly blocked with 401")
        return True

def main():
    print("🚀 Starting Admin Panel - View User Profile and Pages Tests...")
    print(f"Testing against: https://medialinker-4.preview.emergentagent.com/api")
    
    tester = AdminPanelTester()
    
    # Setup test users first
    if not tester.setup_test_users():
        print("❌ Failed to setup test users")
        return 1
    
    # Test sequence
    tests = [
        ("Admin Get User Profile", tester.test_admin_get_user_profile),
        ("Admin Get User Pages", tester.test_admin_get_user_pages),
        ("Admin Get Audit Logs", tester.test_admin_get_audit_logs),
        ("RBAC - Regular User 403", tester.test_rbac_regular_user_403),
        ("RBAC - Owner Access", tester.test_rbac_owner_access),
        ("Admin User Not Found", tester.test_admin_user_not_found),
        ("Unauthenticated Access", tester.test_unauthenticated_access),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print(f"\n📊 Test Results:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"  - {test}")
    else:
        print(f"\n✅ All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())