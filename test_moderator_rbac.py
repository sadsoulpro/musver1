#!/usr/bin/env python3
"""
Test script for moderator RBAC functionality
"""

import requests
import sys
import json
from datetime import datetime
import time

class ModeratorRBACTester:
    def __init__(self, base_url="https://app-gateway-17.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.owner_token = None
        self.moderator_token = None
        self.test_user_id = None
        self.moderator_user_id = None
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
        
        # 1. Login as owner first
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
            print("❌ Failed to login as owner")
            return False
        
        # 2. Create regular user for testing
        timestamp = int(time.time())
        regular_user_data = {
            "email": f"testuser{timestamp}@example.com",
            "username": f"testuser{timestamp}",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "Create Test User",
            "POST",
            "auth/register",
            200,
            data=regular_user_data
        )
        
        if success and 'token' in response:
            self.test_user_id = response['user']['id']
            print(f"   ✅ Test user created: {regular_user_data['email']}")
        else:
            print("❌ Failed to create test user")
            return False
        
        # 3. Create moderator user
        moderator_user_data = {
            "email": f"moderator{timestamp}@example.com",
            "username": f"moderator{timestamp}",
            "password": "modpass123"
        }
        
        success, response = self.run_test(
            "Create Moderator User",
            "POST",
            "auth/register",
            200,
            data=moderator_user_data
        )
        
        if success and 'token' in response:
            self.moderator_user_id = response['user']['id']
            print(f"   ✅ Moderator user created: {moderator_user_data['email']}")
        else:
            print("❌ Failed to create moderator user")
            return False
        
        # 4. Promote user to moderator using owner token
        success, response = self.run_test(
            "Promote User to Moderator",
            "PUT",
            f"admin/users/{self.moderator_user_id}/role",
            200,
            data={"role": "moderator"},
            token=self.owner_token
        )
        
        if not success:
            print("❌ Failed to promote user to moderator")
            return False
        
        print(f"   ✅ User promoted to moderator")
        
        # 5. Login as moderator
        success, response = self.run_test(
            "Login as Moderator",
            "POST",
            "auth/login",
            200,
            data={"email": moderator_user_data["email"], "password": moderator_user_data["password"]}
        )
        
        if success and 'token' in response:
            self.moderator_token = response['token']
            print(f"   ✅ Moderator logged in")
        else:
            print("❌ Failed to login as moderator")
            return False
        
        return True

    def test_moderator_access_user_profile(self):
        """Test moderator access to user profile endpoint"""
        if not self.moderator_token or not self.test_user_id:
            print("❌ No moderator token or test user ID available")
            return False
            
        success, response = self.run_test(
            "Moderator Access User Profile",
            "GET",
            f"admin/users/{self.test_user_id}",
            200,
            token=self.moderator_token
        )
        
        if not success:
            return False
            
        # Verify required fields are present
        required_fields = ['id', 'email', 'username', 'role', 'plan', 'page_count', 'total_clicks']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field: {field}")
                return False
        
        print(f"   ✅ Moderator can access user profile")
        print(f"   ✅ User: {response.get('email')}")
        return True

    def test_moderator_access_user_pages(self):
        """Test moderator access to user pages endpoint"""
        if not self.moderator_token or not self.test_user_id:
            print("❌ No moderator token or test user ID available")
            return False
            
        success, response = self.run_test(
            "Moderator Access User Pages",
            "GET",
            f"admin/users/{self.test_user_id}/pages",
            200,
            token=self.moderator_token
        )
        
        if not success:
            return False
            
        # Verify response structure
        required_fields = ['pages', 'total', 'skip', 'limit', 'user']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field: {field}")
                return False
        
        print(f"   ✅ Moderator can access user pages")
        print(f"   ✅ Found {len(response.get('pages', []))} pages")
        return True

    def test_moderator_access_audit_logs(self):
        """Test moderator access to audit logs (should work since moderator >= admin requirement)"""
        if not self.moderator_token:
            print("❌ No moderator token available")
            return False
            
        success, response = self.run_test(
            "Moderator Access Audit Logs",
            "GET",
            "admin/audit-logs",
            200,
            token=self.moderator_token
        )
        
        if not success:
            return False
            
        # Verify response structure
        required_fields = ['logs', 'total', 'skip', 'limit']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field: {field}")
                return False
        
        print(f"   ✅ Moderator can access audit logs")
        print(f"   ✅ Found {len(response.get('logs', []))} audit logs")
        return True

    def test_moderator_cannot_change_roles(self):
        """Test that moderator cannot change user roles (only owner can)"""
        if not self.moderator_token or not self.test_user_id:
            print("❌ No moderator token or test user ID available")
            return False
            
        success, response = self.run_test(
            "Moderator Try Change Role (Should Fail)",
            "PUT",
            f"admin/users/{self.test_user_id}/role",
            403,  # Should be forbidden
            data={"role": "admin"},
            token=self.moderator_token
        )
        
        if not success:
            print("❌ Moderator should get 403 when trying to change roles")
            return False
            
        print(f"   ✅ Moderator correctly blocked from changing roles")
        return True

def main():
    print("🚀 Starting Moderator RBAC Tests...")
    print(f"Testing against: https://app-gateway-17.preview.emergentagent.com/api")
    
    tester = ModeratorRBACTester()
    
    # Setup test users first
    if not tester.setup_test_users():
        print("❌ Failed to setup test users")
        return 1
    
    # Test sequence
    tests = [
        ("Moderator Access User Profile", tester.test_moderator_access_user_profile),
        ("Moderator Access User Pages", tester.test_moderator_access_user_pages),
        ("Moderator Access Audit Logs", tester.test_moderator_access_audit_logs),
        ("Moderator Cannot Change Roles", tester.test_moderator_cannot_change_roles),
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