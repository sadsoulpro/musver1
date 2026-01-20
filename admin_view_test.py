#!/usr/bin/env python3
"""
Focused test script for "Admin View User Profile and Pages" feature
Tests the specific requirements from the review request
"""

import requests
import sys
import json
import time
from datetime import datetime

class AdminViewTester:
    def __init__(self, base_url="https://pending-task-3.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.owner_token = None
        self.admin_token = None
        self.moderator_token = None
        self.regular_token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add auth header if token provided
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
        print("\n🔧 Setting up test users...")
        
        # 1. Login as owner (thedrumepic@gmail.com / ownerpass123)
        success, response = self.run_test(
            "Login as Owner",
            "POST",
            "auth/login",
            200,
            data={"email": "thedrumepic@gmail.com", "password": "ownerpass123"}
        )
        
        if success and 'token' in response:
            self.owner_token = response['token']
            print(f"   ✅ Owner token obtained")
        else:
            print(f"   ❌ Failed to get owner token")
            return False

        # 2. Create and login as regular user
        timestamp = int(time.time())
        regular_user_data = {
            "email": f"regular{timestamp}@example.com",
            "username": f"regular{timestamp}",
            "password": "regularpass123"
        }
        
        success, response = self.run_test(
            "Register Regular User",
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
            print(f"   ❌ Failed to create regular user")
            return False

        # 3. Create admin user (using owner token)
        admin_user_data = {
            "email": f"admin{timestamp}@example.com",
            "username": f"admin{timestamp}",
            "password": "adminpass123"
        }
        
        success, response = self.run_test(
            "Register Admin User",
            "POST",
            "auth/register",
            200,
            data=admin_user_data
        )
        
        if success:
            admin_user_id = response['user']['id']
            
            # Promote to admin using owner token
            success, response = self.run_test(
                "Promote User to Admin",
                "PUT",
                f"admin/users/{admin_user_id}/role",
                200,
                data={"role": "admin"},
                token=self.owner_token
            )
            
            if success:
                # Login as admin
                success, response = self.run_test(
                    "Login as Admin",
                    "POST",
                    "auth/login",
                    200,
                    data={"email": admin_user_data["email"], "password": admin_user_data["password"]}
                )
                
                if success and 'token' in response:
                    self.admin_token = response['token']
                    print(f"   ✅ Admin user created and logged in")
                else:
                    print(f"   ❌ Failed to login as admin")
            else:
                print(f"   ❌ Failed to promote user to admin")
        else:
            print(f"   ❌ Failed to register admin user")

        # 4. Create moderator user (using owner token)
        moderator_user_data = {
            "email": f"moderator{timestamp}@example.com",
            "username": f"moderator{timestamp}",
            "password": "modpass123"
        }
        
        success, response = self.run_test(
            "Register Moderator User",
            "POST",
            "auth/register",
            200,
            data=moderator_user_data
        )
        
        if success:
            moderator_user_id = response['user']['id']
            
            # Promote to moderator using owner token
            success, response = self.run_test(
                "Promote User to Moderator",
                "PUT",
                f"admin/users/{moderator_user_id}/role",
                200,
                data={"role": "moderator"},
                token=self.owner_token
            )
            
            if success:
                # Login as moderator
                success, response = self.run_test(
                    "Login as Moderator",
                    "POST",
                    "auth/login",
                    200,
                    data={"email": moderator_user_data["email"], "password": moderator_user_data["password"]}
                )
                
                if success and 'token' in response:
                    self.moderator_token = response['token']
                    print(f"   ✅ Moderator user created and logged in")
                else:
                    print(f"   ❌ Failed to login as moderator")
            else:
                print(f"   ❌ Failed to promote user to moderator")
        else:
            print(f"   ❌ Failed to register moderator user")

        return True

    def test_owner_access(self):
        """Test Owner access to all endpoints"""
        print(f"\n📋 Testing Owner Access...")
        
        if not self.owner_token or not self.test_user_id:
            print("❌ No owner token or test user ID")
            return False

        # Test user profile access
        success, response = self.run_test(
            "Owner - Get User Profile",
            "GET",
            f"admin/users/{self.test_user_id}",
            200,
            token=self.owner_token
        )
        
        if not success:
            return False

        # Verify required fields
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

        print(f"   ✅ User profile: role={response.get('role')}, plan={response.get('plan')}, pages={response.get('page_count')}")

        # Test user pages access
        success, response = self.run_test(
            "Owner - Get User Pages",
            "GET",
            f"admin/users/{self.test_user_id}/pages",
            200,
            token=self.owner_token
        )
        
        if not success:
            return False

        print(f"   ✅ User pages: found {len(response.get('pages', []))} pages")

        # Test audit logs access
        success, response = self.run_test(
            "Owner - Get Audit Logs",
            "GET",
            "admin/audit-logs",
            200,
            token=self.owner_token
        )
        
        if not success:
            return False

        print(f"   ✅ Audit logs: found {len(response.get('logs', []))} logs")
        return True

    def test_admin_access(self):
        """Test Admin access to all endpoints"""
        print(f"\n📋 Testing Admin Access...")
        
        if not self.admin_token or not self.test_user_id:
            print("❌ No admin token or test user ID")
            return False

        # Test user profile access
        success, response = self.run_test(
            "Admin - Get User Profile",
            "GET",
            f"admin/users/{self.test_user_id}",
            200,
            token=self.admin_token
        )
        
        if not success:
            return False

        print(f"   ✅ User profile access granted")

        # Test user pages access
        success, response = self.run_test(
            "Admin - Get User Pages",
            "GET",
            f"admin/users/{self.test_user_id}/pages",
            200,
            token=self.admin_token
        )
        
        if not success:
            return False

        print(f"   ✅ User pages access granted")

        # Test audit logs access
        success, response = self.run_test(
            "Admin - Get Audit Logs",
            "GET",
            "admin/audit-logs",
            200,
            token=self.admin_token
        )
        
        if not success:
            return False

        print(f"   ✅ Audit logs access granted")
        return True

    def test_moderator_access(self):
        """Test Moderator access - should have access to user profile/pages but NOT audit logs"""
        print(f"\n📋 Testing Moderator Access...")
        
        if not self.moderator_token or not self.test_user_id:
            print("❌ No moderator token or test user ID")
            return False

        # Test user profile access (should work)
        success, response = self.run_test(
            "Moderator - Get User Profile",
            "GET",
            f"admin/users/{self.test_user_id}",
            200,
            token=self.moderator_token
        )
        
        if not success:
            return False

        print(f"   ✅ User profile access granted")

        # Test user pages access (should work)
        success, response = self.run_test(
            "Moderator - Get User Pages",
            "GET",
            f"admin/users/{self.test_user_id}/pages",
            200,
            token=self.moderator_token
        )
        
        if not success:
            return False

        print(f"   ✅ User pages access granted")

        # Test audit logs access (should get 403)
        success, response = self.run_test(
            "Moderator - Get Audit Logs (Should Fail)",
            "GET",
            "admin/audit-logs",
            403,
            token=self.moderator_token
        )
        
        if not success:
            print("❌ Moderator should get 403 for audit logs")
            return False

        print(f"   ✅ Audit logs correctly blocked (403)")
        return True

    def test_regular_user_access(self):
        """Test Regular user should get 403 on all admin endpoints"""
        print(f"\n📋 Testing Regular User Access (Should All Fail)...")
        
        if not self.regular_token or not self.test_user_id:
            print("❌ No regular token or test user ID")
            return False

        # Test user profile access (should get 403)
        success, response = self.run_test(
            "Regular User - Get User Profile (Should Fail)",
            "GET",
            f"admin/users/{self.test_user_id}",
            403,
            token=self.regular_token
        )
        
        if not success:
            print("❌ Regular user should get 403 for user profile")
            return False

        # Test user pages access (should get 403)
        success, response = self.run_test(
            "Regular User - Get User Pages (Should Fail)",
            "GET",
            f"admin/users/{self.test_user_id}/pages",
            403,
            token=self.regular_token
        )
        
        if not success:
            print("❌ Regular user should get 403 for user pages")
            return False

        # Test audit logs access (should get 403)
        success, response = self.run_test(
            "Regular User - Get Audit Logs (Should Fail)",
            "GET",
            "admin/audit-logs",
            403,
            token=self.regular_token
        )
        
        if not success:
            print("❌ Regular user should get 403 for audit logs")
            return False

        print(f"   ✅ All admin endpoints correctly blocked (403)")
        return True

    def test_unauthenticated_access(self):
        """Test Unauthenticated should get 401"""
        print(f"\n📋 Testing Unauthenticated Access (Should All Fail)...")
        
        if not self.test_user_id:
            print("❌ No test user ID")
            return False

        # Test user profile access (should get 401)
        success, response = self.run_test(
            "Unauthenticated - Get User Profile (Should Fail)",
            "GET",
            f"admin/users/{self.test_user_id}",
            401
        )
        
        if not success:
            print("❌ Unauthenticated should get 401 for user profile")
            return False

        # Test user pages access (should get 401)
        success, response = self.run_test(
            "Unauthenticated - Get User Pages (Should Fail)",
            "GET",
            f"admin/users/{self.test_user_id}/pages",
            401
        )
        
        if not success:
            print("❌ Unauthenticated should get 401 for user pages")
            return False

        # Test audit logs access (should get 401)
        success, response = self.run_test(
            "Unauthenticated - Get Audit Logs (Should Fail)",
            "GET",
            "admin/audit-logs",
            401
        )
        
        if not success:
            print("❌ Unauthenticated should get 401 for audit logs")
            return False

        print(f"   ✅ All admin endpoints correctly require authentication (401)")
        return True

    def test_non_existent_user(self):
        """Test Non-existent user should return 404"""
        print(f"\n📋 Testing Non-existent User (Should Return 404)...")
        
        if not self.owner_token:
            print("❌ No owner token")
            return False

        fake_user_id = "non-existent-user-id-12345"

        # Test user profile with fake ID (should get 404)
        success, response = self.run_test(
            "Non-existent User Profile",
            "GET",
            f"admin/users/{fake_user_id}",
            404,
            token=self.owner_token
        )
        
        if not success:
            print("❌ Non-existent user should return 404 for profile")
            return False

        # Test user pages with fake ID (should get 404)
        success, response = self.run_test(
            "Non-existent User Pages",
            "GET",
            f"admin/users/{fake_user_id}/pages",
            404,
            token=self.owner_token
        )
        
        if not success:
            print("❌ Non-existent user should return 404 for pages")
            return False

        print(f"   ✅ Non-existent user correctly returns 404")
        return True

    def test_audit_log_creation(self):
        """Test that audit logs are created when viewing profile/pages"""
        print(f"\n📋 Testing Audit Log Creation...")
        
        if not self.owner_token or not self.test_user_id:
            print("❌ No owner token or test user ID")
            return False

        # Get current audit log count
        success, response = self.run_test(
            "Get Initial Audit Log Count",
            "GET",
            "admin/audit-logs?limit=1",
            200,
            token=self.owner_token
        )
        
        if not success:
            return False

        initial_count = response.get('total', 0)
        print(f"   📊 Initial audit log count: {initial_count}")

        # View user profile (should create ADMIN_VIEW_USER_PROFILE event)
        success, response = self.run_test(
            "View User Profile for Audit Log",
            "GET",
            f"admin/users/{self.test_user_id}",
            200,
            token=self.owner_token
        )
        
        if not success:
            return False

        # View user pages (should create ADMIN_VIEW_USER_PAGES event)
        success, response = self.run_test(
            "View User Pages for Audit Log",
            "GET",
            f"admin/users/{self.test_user_id}/pages",
            200,
            token=self.owner_token
        )
        
        if not success:
            return False

        # Wait a moment for logs to be written
        time.sleep(1)

        # Check audit logs for new events
        success, response = self.run_test(
            "Check New Audit Logs",
            "GET",
            "admin/audit-logs?limit=10",
            200,
            token=self.owner_token
        )
        
        if not success:
            return False

        new_count = response.get('total', 0)
        logs = response.get('logs', [])
        
        print(f"   📊 New audit log count: {new_count}")
        
        if new_count <= initial_count:
            print("❌ No new audit logs created")
            return False

        # Check for specific events
        recent_events = [log.get('event') for log in logs[:5]]  # Check last 5 events
        
        has_profile_event = 'ADMIN_VIEW_USER_PROFILE' in recent_events
        has_pages_event = 'ADMIN_VIEW_USER_PAGES' in recent_events
        
        print(f"   📝 Recent events: {recent_events}")
        
        if not has_profile_event:
            print("❌ ADMIN_VIEW_USER_PROFILE event not found")
            return False
            
        if not has_pages_event:
            print("❌ ADMIN_VIEW_USER_PAGES event not found")
            return False

        print(f"   ✅ Audit log events created correctly")
        return True

def main():
    print("🚀 Starting Admin View User Profile and Pages Tests...")
    print(f"Testing against: https://pending-task-3.preview.emergentagent.com/api")
    
    tester = AdminViewTester()
    
    # Setup test users first
    if not tester.setup_test_users():
        print("❌ Failed to setup test users")
        return 1
    
    # Test sequence based on review request requirements
    tests = [
        ("Owner Access", tester.test_owner_access),
        ("Admin Access", tester.test_admin_access),
        ("Moderator Access", tester.test_moderator_access),
        ("Regular User Access (403)", tester.test_regular_user_access),
        ("Unauthenticated Access (401)", tester.test_unauthenticated_access),
        ("Non-existent User (404)", tester.test_non_existent_user),
        ("Audit Log Creation", tester.test_audit_log_creation),
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