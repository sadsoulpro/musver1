import requests
import sys
import json
from datetime import datetime
import time

class ContactInfoAPITester:
    def __init__(self, base_url="https://github-importer-16.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add auth header if needed
        if use_admin and self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif not use_admin and self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
            
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
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
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_login_admin(self):
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
            print(f"   Admin logged in successfully")
            return True
        return False

    def test_auth_login_user(self):
        """Test user login with registered user"""
        timestamp = int(time.time())
        test_data = {
            "email": f"contacttest{timestamp}@example.com",
            "username": f"contacttest{timestamp}",
            "password": "testpass123"
        }
        
        # First register
        success, reg_response = self.run_test(
            "Register for Contact Test",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        
        if not success:
            return False
            
        # Then login
        success, response = self.run_test(
            "User Login for Contact Test",
            "POST",
            "auth/login",
            200,
            data={"email": test_data["email"], "password": test_data["password"]}
        )
        
        # Update token for subsequent tests
        if success and 'token' in response:
            self.token = response['token']
        
        return success and 'token' in response

    def test_get_contact_info(self):
        """Test GET /api/profile/contacts - should return contact_email and social_links"""
        if not self.token:
            print("❌ No user token available")
            return False
            
        success, response = self.run_test(
            "Get Contact Info",
            "GET",
            "profile/contacts",
            200
        )
        
        if not success:
            return False
            
        # Verify response structure
        required_fields = ['contact_email', 'social_links']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field: {field}")
                return False
        
        # Verify social_links structure
        social_links = response.get('social_links', {})
        expected_social_platforms = ['telegram', 'instagram', 'vk', 'tiktok', 'twitter', 'website']
        
        for platform in expected_social_platforms:
            if platform not in social_links:
                print(f"❌ Missing social platform: {platform}")
                return False
        
        print(f"   ✅ Contact email: {response.get('contact_email', 'empty')}")
        print(f"   ✅ Social links: {list(social_links.keys())}")
        return True

    def test_update_contact_info(self):
        """Test PUT /api/profile/contacts - update contact info"""
        if not self.token:
            print("❌ No user token available")
            return False
            
        # Test data as specified in the review request
        update_data = {
            "contact_email": "new@example.com",
            "social_links": {
                "telegram": "@newtest",
                "instagram": "@newtest"
            }
        }
        
        success, response = self.run_test(
            "Update Contact Info",
            "PUT",
            "profile/contacts",
            200,
            data=update_data
        )
        
        if not success:
            return False
            
        # Verify success message
        if 'message' not in response:
            print("❌ Missing success message in response")
            return False
            
        print(f"   ✅ Update message: {response.get('message')}")
        
        # Verify the update by getting contact info again
        success, get_response = self.run_test(
            "Verify Contact Info Update",
            "GET",
            "profile/contacts",
            200
        )
        
        if not success:
            return False
            
        # Check if the data was updated correctly
        if get_response.get('contact_email') != update_data['contact_email']:
            print(f"❌ Contact email not updated correctly. Expected: {update_data['contact_email']}, Got: {get_response.get('contact_email')}")
            return False
            
        social_links = get_response.get('social_links', {})
        if social_links.get('telegram') != update_data['social_links']['telegram']:
            print(f"❌ Telegram not updated correctly. Expected: {update_data['social_links']['telegram']}, Got: {social_links.get('telegram')}")
            return False
            
        if social_links.get('instagram') != update_data['social_links']['instagram']:
            print(f"❌ Instagram not updated correctly. Expected: {update_data['social_links']['instagram']}, Got: {social_links.get('instagram')}")
            return False
            
        print(f"   ✅ Contact info updated and verified successfully")
        return True

    def test_artist_page_contact_info(self):
        """Test GET /api/artist/thley - should include contact_email and social_links"""
        # Test the specific slug mentioned in the review request
        success, response = self.run_test(
            "Get Artist Page with Contact Info",
            "GET",
            "artist/thley",
            200
        )
        
        if not success:
            return False
            
        # Verify response includes contact info fields
        required_fields = ['contact_email', 'social_links']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field in artist page: {field}")
                return False
        
        # Check if contact info is present (could be empty strings/objects)
        contact_email = response.get('contact_email', '')
        social_links = response.get('social_links', {})
        
        print(f"   ✅ Artist page contact email: {contact_email if contact_email else 'empty'}")
        print(f"   ✅ Artist page social links: {social_links if social_links else 'empty'}")
        
        # Verify social_links is a dict (even if empty)
        if not isinstance(social_links, dict):
            print(f"❌ Social links should be a dict, got: {type(social_links)}")
            return False
            
        return True

def main():
    print("🚀 Starting Contact Info API Tests...")
    print(f"Testing against: https://github-importer-16.preview.emergentagent.com/api")
    
    tester = ContactInfoAPITester()
    
    # Test sequence - focused on Contact Info API
    tests = [
        # Authentication setup
        ("Admin Login", tester.test_auth_login_admin),
        ("User Login for Contact Test", tester.test_auth_login_user),
        
        # Contact Info API tests (HIGH PRIORITY - as requested in review)
        ("Get Contact Info", tester.test_get_contact_info),
        ("Update Contact Info", tester.test_update_contact_info),
        ("Artist Page Contact Info", tester.test_artist_page_contact_info),
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
    print(f"\n📊 Contact Info API Test Results:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"  - {test}")
    else:
        print(f"\n✅ All Contact Info API tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())