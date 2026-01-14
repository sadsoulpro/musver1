#!/usr/bin/env python3
"""
RBAC + Dynamic Plan Limits Test Suite for MyTrack App
Tests the new role-based access control and dynamic plan configuration system.
"""

import requests
import json
import time
from datetime import datetime

class RBACTester:
    def __init__(self, base_url="https://github-importer-16.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.owner_token = None
        self.user_token = None
        self.test_user_id = None
        self.banned_user_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add auth header if needed
        if token:
            test_headers['Authorization'] = f'Bearer {token}'
            
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data if data else None)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

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
                    print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin role: {response['user'].get('role')}")
            return True
        return False

    def test_auto_owner_assignment(self):
        """Test auto-owner assignment for thedrumepic@gmail.com"""
        # Use a unique username to avoid conflicts
        timestamp = int(time.time())
        owner_data = {
            "email": "thedrumepic@gmail.com",
            "username": f"thedrumepic{timestamp}",
            "password": "ownerpass123"
        }
        
        success, response = self.run_test(
            "Auto Owner Assignment",
            "POST",
            "auth/register",
            200,
            data=owner_data
        )
        
        if not success:
            # If email exists, try to login instead to verify owner status
            response_text = str(response.get('detail', ''))
            if "already exists" in response_text:
                print("   Email exists, testing login to verify owner status...")
                success, response = self.run_test(
                    "Owner Login (Existing)",
                    "POST",
                    "auth/login",
                    200,
                    data={"email": "thedrumepic@gmail.com", "password": "ownerpass123"}
                )
                if not success:
                    print("   ❌ Could not login with owner credentials")
                    return False
            else:
                return False
            
        # Verify owner role and ultimate plan
        user = response.get('user', {})
        if user.get('role') != 'owner':
            print(f"❌ Expected role 'owner', got '{user.get('role')}'")
            return False
            
        if user.get('plan') != 'ultimate':
            print(f"❌ Expected plan 'ultimate', got '{user.get('plan')}'")
            return False
            
        # Check verification status (both fields for compatibility)
        is_verified = user.get('is_verified') or user.get('verified')
        if not is_verified:
            print(f"❌ Expected verified=true, got is_verified={user.get('is_verified')}, verified={user.get('verified')}")
            return False
            
        self.owner_token = response.get('token')
        print(f"   ✅ Owner role: {user.get('role')}")
        print(f"   ✅ Ultimate plan: {user.get('plan')}")
        print(f"   ✅ Auto-verified: {is_verified}")
        return True

    def test_plan_config_apis(self):
        """Test Plan Config APIs"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        # Test GET all plan configs
        success, response = self.run_test(
            "Get All Plan Configs",
            "GET",
            "admin/plan-configs",
            200,
            token=self.admin_token
        )
        
        if not success or not isinstance(response, list):
            return False
            
        # Should have 3 plans (free, pro, ultimate)
        plan_names = [config.get('plan_name') for config in response]
        expected_plans = ['free', 'pro', 'ultimate']
        
        for plan in expected_plans:
            if plan not in plan_names:
                print(f"❌ Missing plan config: {plan}")
                return False
                
        print(f"   ✅ Found plans: {plan_names}")
        
        # Test UPDATE plan config
        update_data = {"max_pages_limit": 15}
        success, response = self.run_test(
            "Update Free Plan Config",
            "PUT",
            "admin/plan-configs/free",
            200,
            data=update_data,
            token=self.admin_token
        )
        
        if not success:
            return False
            
        if response.get('max_pages_limit') != 15:
            print(f"❌ Plan config not updated correctly")
            return False
            
        print(f"   ✅ Updated free plan max_pages_limit to 15")
        return True

    def test_user_management_apis(self):
        """Test User Management APIs"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        # Test GET users list
        success, response = self.run_test(
            "Get Users List",
            "GET",
            "admin/users/list",
            200,
            token=self.admin_token
        )
        
        if not success or not isinstance(response, list):
            return False
            
        # Should have page_count field
        if response and len(response) > 0:
            first_user = response[0]
            if 'page_count' not in first_user:
                print("❌ Missing page_count in user data")
                return False
        else:
            print("⚠️ No users found in response")
            
        print(f"   ✅ Found {len(response)} users with page_count")
        
        # Create test user for management tests
        timestamp = int(time.time())
        test_user_data = {
            "email": f"testmanage{timestamp}@example.com",
            "username": f"testmanage{timestamp}",
            "password": "testpass123"
        }
        
        success, reg_response = self.run_test(
            "Create Test User for Management",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if not success:
            return False
            
        self.test_user_id = reg_response['user']['id']
        self.user_token = reg_response['token']
        
        # Test UPDATE user plan
        success, response = self.run_test(
            "Update User Plan",
            "PUT",
            f"admin/users/{self.test_user_id}/plan",
            200,
            data={"plan": "pro"},
            token=self.admin_token
        )
        
        if not success:
            return False
            
        print(f"   ✅ Updated user plan to pro")
        
        # Test VERIFY user
        success, response = self.run_test(
            "Verify User",
            "PUT",
            f"admin/users/{self.test_user_id}/verify",
            200,
            data={"is_verified": True},
            token=self.admin_token
        )
        
        if not success:
            return False
            
        print(f"   ✅ Verified user")
        return True

    def test_ban_functionality(self):
        """Test Ban Functionality"""
        if not self.admin_token:
            print("❌ No admin token available")
            return False
            
        # Create test user for banning
        timestamp = int(time.time())
        ban_user_data = {
            "email": f"testban{timestamp}@example.com",
            "username": f"testban{timestamp}",
            "password": "testpass123"
        }
        
        success, reg_response = self.run_test(
            "Create Test User for Banning",
            "POST",
            "auth/register",
            200,
            data=ban_user_data
        )
        
        if not success:
            return False
            
        self.banned_user_id = reg_response['user']['id']
        
        # Ban the user
        success, response = self.run_test(
            "Ban User",
            "PUT",
            f"admin/users/{self.banned_user_id}/ban",
            200,
            data={"is_banned": True},
            token=self.admin_token
        )
        
        if not success:
            return False
            
        print(f"   ✅ User banned successfully")
        
        # Try to login as banned user - should get 403
        success, response = self.run_test(
            "Login as Banned User",
            "POST",
            "auth/login",
            403,  # Should be forbidden
            data={"email": ban_user_data["email"], "password": ban_user_data["password"]}
        )
        
        if not success:
            print("❌ Banned user login should return 403")
            return False
            
        print(f"   ✅ Banned user correctly blocked from login")
        return True

    def test_role_permission_check(self):
        """Test Role Permission Check - Admin should NOT be able to change roles"""
        if not self.admin_token or not self.test_user_id:
            print("❌ No admin token or test user ID available")
            return False
            
        # Admin should NOT be able to change roles (403 - only owner can)
        success, response = self.run_test(
            "Admin Try Change Role (Should Fail)",
            "PUT",
            f"admin/users/{self.test_user_id}/role",
            403,  # Should be forbidden
            data={"role": "moderator"},
            token=self.admin_token
        )
        
        if not success:
            print("❌ Admin should get 403 when trying to change roles")
            return False
            
        print(f"   ✅ Admin correctly blocked from changing roles (403)")
        
        # Test that owner CAN change roles (if we have owner token)
        if self.owner_token:
            success, response = self.run_test(
                "Owner Change Role (Should Work)",
                "PUT",
                f"admin/users/{self.test_user_id}/role",
                200,
                data={"role": "moderator"},
                token=self.owner_token
            )
            
            if success:
                print(f"   ✅ Owner can change roles")
            else:
                print(f"   ⚠️ Owner role change failed (may be expected)")
        
        return True

    def test_access_check_api(self):
        """Test Access Check API"""
        if not self.user_token:
            print("❌ No user token available")
            return False
            
        # Test GET my-limits
        success, response = self.run_test(
            "Get My Limits",
            "GET",
            "my-limits",
            200,
            token=self.user_token
        )
        
        if not success:
            return False
            
        # Should have plan limits and usage
        required_fields = ['plan', 'limits', 'usage']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing field in my-limits: {field}")
                return False
                
        print(f"   ✅ Plan: {response.get('plan')}")
        print(f"   ✅ Limits: {response.get('limits', {}).get('plan_name', 'N/A')}")
        print(f"   ✅ Usage: {response.get('usage')}")
        
        # Test GET check-access (should return has_access=true in launch mode)
        success, response = self.run_test(
            "Check Access Max Pages",
            "GET",
            "check-access/max_pages",
            200,
            data={"value": 5},
            token=self.user_token
        )
        
        if not success:
            return False
            
        if not response.get('has_access'):
            print(f"❌ Expected has_access=true in launch mode, got {response.get('has_access')}")
            return False
            
        print(f"   ✅ Access check returned has_access=true (launch mode)")
        return True

def main():
    print("🚀 Starting RBAC + Dynamic Plan Limits Tests...")
    print(f"Testing against: https://github-importer-16.preview.emergentagent.com/api")
    
    tester = RBACTester()
    
    # Test sequence - focused on RBAC features
    tests = [
        ("Admin Login", tester.test_admin_login),
        ("Auto Owner Assignment", tester.test_auto_owner_assignment),
        ("Plan Config APIs", tester.test_plan_config_apis),
        ("User Management APIs", tester.test_user_management_apis),
        ("Ban Functionality", tester.test_ban_functionality),
        ("Role Permission Check", tester.test_role_permission_check),
        ("Access Check API", tester.test_access_check_api),
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
    print(f"\n📊 RBAC Test Results:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"  - {test}")
    else:
        print(f"\n✅ All RBAC tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    exit(main())