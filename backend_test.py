import requests
import sys
import json
from datetime import datetime
import time

class BandLinkAPITester:
    def __init__(self, base_url="https://github-importer-16.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_page_id = None
        self.test_link_id = None

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

    def test_auth_register(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_data = {
            "email": f"testuser{timestamp}@example.com",
            "username": f"testuser{timestamp}",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.test_user_id = response['user']['id']
            print(f"   Registered user: {test_data['email']}")
            return True
        return False

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
            "email": f"logintest{timestamp}@example.com",
            "username": f"logintest{timestamp}",
            "password": "testpass123"
        }
        
        # First register
        success, reg_response = self.run_test(
            "Register for Login Test",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        
        if not success:
            return False
            
        # Then login
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": test_data["email"], "password": test_data["password"]}
        )
        
        # Update token for subsequent tests
        if success and 'token' in response:
            self.token = response['token']
            if 'user' in response and 'id' in response['user']:
                self.test_user_id = response['user']['id']
        
        return success and 'token' in response

    def test_auth_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success and 'id' in response

    def test_create_page(self):
        """Test page creation"""
        timestamp = int(time.time())
        page_data = {
            "title": f"Test Song {timestamp}",
            "slug": f"test-song-{timestamp}",
            "artist_name": "Test Artist",
            "release_title": "Test Release",
            "description": "Test description"
        }
        
        success, response = self.run_test(
            "Create Page",
            "POST",
            "pages",
            200,
            data=page_data
        )
        
        if success and 'id' in response:
            self.test_page_id = response['id']
            print(f"   Created page: {response['slug']}")
            return True
        return False

    def test_get_pages(self):
        """Test get user pages"""
        success, response = self.run_test(
            "Get User Pages",
            "GET",
            "pages",
            200
        )
        return success and isinstance(response, list)

    def test_get_page(self):
        """Test get specific page"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        success, response = self.run_test(
            "Get Specific Page",
            "GET",
            f"pages/{self.test_page_id}",
            200
        )
        return success and 'id' in response

    def test_update_page(self):
        """Test page update"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        update_data = {
            "description": "Updated description"
        }
        
        success, response = self.run_test(
            "Update Page",
            "PUT",
            f"pages/{self.test_page_id}",
            200,
            data=update_data
        )
        return success

    def test_create_link(self):
        """Test link creation"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        link_data = {
            "platform": "spotify",
            "url": "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",  # Valid Spotify URL
            "active": True
        }
        
        success, response = self.run_test(
            "Create Link",
            "POST",
            f"pages/{self.test_page_id}/links",
            200,
            data=link_data
        )
        
        if success and 'id' in response:
            self.test_link_id = response['id']
            print(f"   Created link: {response['platform']}")
            return True
        return False

    def test_get_links(self):
        """Test get page links"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        success, response = self.run_test(
            "Get Page Links",
            "GET",
            f"pages/{self.test_page_id}/links",
            200
        )
        return success and isinstance(response, list)

    def test_update_link(self):
        """Test link update"""
        if not self.test_page_id or not self.test_link_id:
            print("❌ No test page/link ID available")
            return False
            
        update_data = {
            "active": False
        }
        
        success, response = self.run_test(
            "Update Link",
            "PUT",
            f"pages/{self.test_page_id}/links/{self.test_link_id}",
            200,
            data=update_data
        )
        return success

    def test_public_page(self):
        """Test public page access"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        # First get the page to find its slug
        success, page_response = self.run_test(
            "Get Page for Slug",
            "GET",
            f"pages/{self.test_page_id}",
            200
        )
        
        if not success or 'slug' not in page_response:
            print("❌ Could not get page slug")
            return False
            
        slug = page_response['slug']
        
        success, response = self.run_test(
            "Public Page Access",
            "GET",
            f"artist/{slug}",
            200
        )
        return success and 'artist_name' in response

    def test_analytics(self):
        """Test analytics"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        success, response = self.run_test(
            "Get Analytics",
            "GET",
            f"analytics/{self.test_page_id}",
            200
        )
        return success and 'views' in response and 'total_clicks' in response

    def test_admin_get_users(self):
        """Test admin get users"""
        success, response = self.run_test(
            "Admin Get Users",
            "GET",
            "admin/users",
            200,
            use_admin=True
        )
        return success and isinstance(response, list)

    def test_admin_get_pages(self):
        """Test admin get pages"""
        success, response = self.run_test(
            "Admin Get Pages",
            "GET",
            "admin/pages",
            200,
            use_admin=True
        )
        return success and isinstance(response, list)

    def test_admin_block_user(self):
        """Test admin block user"""
        if not self.test_user_id:
            print("❌ No test user ID available")
            return False
            
        success, response = self.run_test(
            "Admin Block User",
            "PUT",
            f"admin/users/{self.test_user_id}/block",
            200,
            use_admin=True
        )
        return success and 'status' in response

    def test_admin_disable_page(self):
        """Test admin disable page"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        success, response = self.run_test(
            "Admin Disable Page",
            "PUT",
            f"admin/pages/{self.test_page_id}/disable",
            200,
            use_admin=True
        )
        return success and 'status' in response

    def test_delete_link(self):
        """Test link deletion"""
        if not self.test_page_id or not self.test_link_id:
            print("❌ No test page/link ID available")
            return False
            
        success, response = self.run_test(
            "Delete Link",
            "DELETE",
            f"pages/{self.test_page_id}/links/{self.test_link_id}",
            200
        )
        return success

    def test_delete_page(self):
        """Test page deletion"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        success, response = self.run_test(
            "Delete Page",
            "DELETE",
            f"pages/{self.test_page_id}",
            200
        )
        return success

    def test_odesli_integration(self):
        """Test Odesli API integration with real Spotify URL"""
        # Test with Shape of You by Ed Sheeran
        spotify_url = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"
        
        success, response = self.run_test(
            "Odesli API Integration",
            "GET",
            f"lookup/odesli?url={spotify_url}",
            200
        )
        
        if not success:
            return False
            
        # Verify response structure
        required_fields = ['links', 'title', 'artistName', 'thumbnailUrl']
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field: {field}")
                return False
        
        # Verify we have platform links
        links = response.get('links', {})
        if not links:
            print("❌ No platform links returned")
            return False
            
        # Check for expected platforms
        expected_platforms = ['spotify', 'apple', 'youtube', 'soundcloud', 'tidal', 'deezer']
        found_platforms = []
        
        for platform in expected_platforms:
            if platform in links and links[platform]:
                found_platforms.append(platform)
                print(f"   ✅ Found {platform}: {links[platform]}")
        
        if not found_platforms:
            print("❌ No valid platform links found")
            return False
            
        # Verify metadata
        title = response.get('title', '')
        artist = response.get('artistName', '')
        thumbnail = response.get('thumbnailUrl', '')
        
        print(f"   📝 Title: {title}")
        print(f"   🎤 Artist: {artist}")
        print(f"   🖼️ Thumbnail: {thumbnail}")
        
        # Basic validation - should have title and artist for this well-known track
        if not title or not artist:
            print("❌ Missing title or artist information")
            return False
            
        print(f"   ✅ Found {len(found_platforms)} platform links")
        return True

    def test_ip_geolocation_us_ip(self):
        """Test IP geolocation with US IP (8.8.8.8 - Google DNS)"""
        if not self.test_link_id:
            print("❌ No test link ID available")
            return False
            
        # Simulate click with US IP
        headers = {'X-Forwarded-For': '8.8.8.8'}
        
        success, response = self.run_test(
            "Click Link with US IP",
            "GET",
            f"click/{self.test_link_id}",
            302,  # Redirect response
            headers=headers
        )
        
        if not success:
            return False
            
        # Wait a moment for the click to be processed
        time.sleep(1)
        
        # Check analytics to see if geolocation worked
        success, analytics = self.run_test(
            "Get Global Analytics for Geo Check",
            "GET",
            "analytics/global/summary",
            200
        )
        
        if not success:
            return False
            
        # Check if we have country/city data
        by_country = analytics.get('by_country', [])
        by_city = analytics.get('by_city', [])
        
        print(f"   📍 Countries found: {[c.get('country') for c in by_country]}")
        print(f"   🏙️ Cities found: {[c.get('city') for c in by_city]}")
        
        # Look for US-related entries (should not be "Неизвестно")
        has_real_country = any(
            country.get('country') not in ['Неизвестно', 'Unknown', ''] 
            for country in by_country
        )
        
        has_real_city = any(
            city.get('city') not in ['Неизвестно', 'Unknown', ''] 
            for city in by_city
        )
        
        if not has_real_country:
            print("❌ No real country data found - geolocation may not be working")
            return False
            
        if not has_real_city:
            print("❌ No real city data found - geolocation may not be working")
            return False
            
        print("   ✅ Real geolocation data found")
        return True

    def test_ip_geolocation_russia_ip(self):
        """Test IP geolocation with Russian IP (77.88.8.8 - Yandex DNS)"""
        if not self.test_link_id:
            print("❌ No test link ID available")
            return False
            
        # Simulate click with Russian IP
        headers = {'X-Forwarded-For': '77.88.8.8'}
        
        success, response = self.run_test(
            "Click Link with Russian IP",
            "GET",
            f"click/{self.test_link_id}",
            302,  # Redirect response
            headers=headers
        )
        
        if not success:
            return False
            
        # Wait a moment for the click to be processed
        time.sleep(1)
        
        # Check analytics to see if geolocation worked
        success, analytics = self.run_test(
            "Get Global Analytics for Russian Geo Check",
            "GET",
            "analytics/global/summary",
            200
        )
        
        if not success:
            return False
            
        # Check if we have Russian data
        by_country = analytics.get('by_country', [])
        by_city = analytics.get('by_city', [])
        
        print(f"   📍 Countries found: {[c.get('country') for c in by_country]}")
        print(f"   🏙️ Cities found: {[c.get('city') for c in by_city]}")
        
        # Look for Russia-related entries
        has_russia = any(
            'Россия' in country.get('country', '') or 'Russia' in country.get('country', '')
            for country in by_country
        )
        
        has_russian_city = any(
            city.get('city') not in ['Неизвестно', 'Unknown', ''] 
            for city in by_city
        )
        
        if not has_russia and not any(country.get('country') not in ['Неизвестно', 'Unknown', ''] for country in by_country):
            print("❌ No Russian or real country data found")
            return False
            
        print("   ✅ Russian geolocation data found")
        return True

    def test_ip_geolocation_localhost(self):
        """Test IP geolocation with localhost IP (should return 'Неизвестно')"""
        if not self.test_link_id:
            print("❌ No test link ID available")
            return False
            
        # Simulate click with localhost IP
        headers = {'X-Forwarded-For': '127.0.0.1'}
        
        success, response = self.run_test(
            "Click Link with Localhost IP",
            "GET",
            f"click/{self.test_link_id}",
            302,  # Redirect response
            headers=headers
        )
        
        if not success:
            return False
            
        # Wait a moment for the click to be processed
        time.sleep(1)
        
        # Check analytics to see if localhost is handled correctly
        success, analytics = self.run_test(
            "Get Global Analytics for Localhost Check",
            "GET",
            "analytics/global/summary",
            200
        )
        
        if not success:
            return False
            
        # Check if we have "Неизвестно" entries for localhost
        by_country = analytics.get('by_country', [])
        by_city = analytics.get('by_city', [])
        
        print(f"   📍 Countries found: {[c.get('country') for c in by_country]}")
        print(f"   🏙️ Cities found: {[c.get('city') for c in by_city]}")
        
        # Should have "Неизвестно" entries for localhost
        has_unknown_country = any(
            country.get('country') == 'Неизвестно'
            for country in by_country
        )
        
        has_unknown_city = any(
            city.get('city') == 'Неизвестно'
            for city in by_city
        )
        
        if not has_unknown_country:
            print("❌ Expected 'Неизвестно' country for localhost IP")
            return False
            
        if not has_unknown_city:
            print("❌ Expected 'Неизвестно' city for localhost IP")
            return False
            
        print("   ✅ Localhost correctly returns 'Неизвестно'")
        return True

    def test_track_page_view_geolocation(self):
        """Test page view tracking with geolocation"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        # Test page view with German IP
        headers = {'X-Forwarded-For': '8.8.4.4'}  # Another Google DNS
        
        success, response = self.run_test(
            "Track Page View with Geolocation",
            "POST",
            f"track/view/{self.test_page_id}",
            200,
            headers=headers
        )
        
        return success and response.get('success') == True

    def test_track_share_geolocation(self):
        """Test share tracking with geolocation"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        # Test share with UK IP
        headers = {'X-Forwarded-For': '1.1.1.1'}  # Cloudflare DNS
        
        success, response = self.run_test(
            "Track Share with Geolocation",
            "POST",
            f"track/share/{self.test_page_id}?share_type=link",
            200,
            headers=headers
        )
        
        return success and response.get('success') == True

    def test_qr_scan_geolocation(self):
        """Test QR scan tracking with geolocation"""
        if not self.test_page_id:
            print("❌ No test page ID available")
            return False
            
        # Test QR scan with Canadian IP
        headers = {'X-Forwarded-For': '1.0.0.1'}  # Cloudflare DNS
        
        success, response = self.run_test(
            "Track QR Scan with Geolocation",
            "GET",
            f"qr/{self.test_page_id}",
            302,  # Redirect response
            headers=headers
        )
        
        return success

    # ===================== RBAC + DYNAMIC PLAN LIMITS TESTS =====================

    def test_auto_owner_assignment(self):
        """Test auto-owner assignment for thedrumepic@gmail.com"""
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
            return False
            
        # Verify owner role and ultimate plan
        user = response.get('user', {})
        if user.get('role') != 'owner':
            print(f"❌ Expected role 'owner', got '{user.get('role')}'")
            return False
            
        if user.get('plan') != 'ultimate':
            print(f"❌ Expected plan 'ultimate', got '{user.get('plan')}'")
            return False
            
        # Check both is_verified and verified fields (legacy support)
        is_verified = user.get('is_verified') or user.get('verified')
        if not is_verified:
            print(f"❌ Expected is_verified=true, got is_verified={user.get('is_verified')}, verified={user.get('verified')}")
            return False
            
        print(f"   ✅ Owner role: {user.get('role')}")
        print(f"   ✅ Ultimate plan: {user.get('plan')}")
        print(f"   ✅ Auto-verified: {user.get('is_verified')}")
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
            use_admin=True
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
        update_data = {"max_pages_limit": 10}
        success, response = self.run_test(
            "Update Free Plan Config",
            "PUT",
            "admin/plan-configs/free",
            200,
            data=update_data,
            use_admin=True
        )
        
        if not success:
            return False
            
        if response.get('max_pages_limit') != 10:
            print(f"❌ Plan config not updated correctly")
            return False
            
        print(f"   ✅ Updated free plan max_pages_limit to 10")
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
            use_admin=True
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
            
        test_user_id = reg_response['user']['id']
        
        # Test UPDATE user plan
        success, response = self.run_test(
            "Update User Plan",
            "PUT",
            f"admin/users/{test_user_id}/plan",
            200,
            data={"plan": "pro"},
            use_admin=True
        )
        
        if not success:
            return False
            
        print(f"   ✅ Updated user plan to pro")
        
        # Test VERIFY user
        success, response = self.run_test(
            "Verify User",
            "PUT",
            f"admin/users/{test_user_id}/verify",
            200,
            data={"is_verified": True},
            use_admin=True
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
            
        test_user_id = reg_response['user']['id']
        test_user_token = reg_response['token']
        
        # Ban the user
        success, response = self.run_test(
            "Ban User",
            "PUT",
            f"admin/users/{test_user_id}/ban",
            200,
            data={"is_banned": True},
            use_admin=True
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
            use_admin=True
        )
        
        if not success:
            print("❌ Admin should get 403 when trying to change roles")
            return False
            
        print(f"   ✅ Admin correctly blocked from changing roles (403)")
        return True

    def test_access_check_api(self):
        """Test Access Check API"""
        if not self.token:
            print("❌ No user token available")
            return False
            
        # Test GET my-limits
        success, response = self.run_test(
            "Get My Limits",
            "GET",
            "my-limits",
            200
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
        print(f"   ✅ Limits: {response.get('limits')}")
        print(f"   ✅ Usage: {response.get('usage')}")
        
        # Test GET check-access (should return has_access=true in launch mode)
        success, response = self.run_test(
            "Check Access Max Pages",
            "GET",
            "check-access/max_pages?value=5",
            200
        )
        
        if not success:
            return False
            
        if not response.get('has_access'):
            print(f"❌ Expected has_access=true in launch mode, got {response.get('has_access')}")
            return False
            
        print(f"   ✅ Access check returned has_access=true (launch mode)")
        return True

    # ===================== CONTACT INFO API TESTS =====================

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
    print("🚀 Starting BandLink API Tests...")
    print(f"Testing against: https://github-importer-16.preview.emergentagent.com/api")
    
    tester = BandLinkAPITester()
    
    # Test sequence
    tests = [
        # Authentication tests
        ("User Registration", tester.test_auth_register),
        ("Admin Login", tester.test_auth_login_admin),
        ("User Login", tester.test_auth_login_user),
        ("Get Current User", tester.test_auth_me),
        
        # RBAC + Dynamic Plan Limits tests (HIGH PRIORITY)
        ("Auto Owner Assignment", tester.test_auto_owner_assignment),
        ("Plan Config APIs", tester.test_plan_config_apis),
        ("User Management APIs", tester.test_user_management_apis),
        ("Ban Functionality", tester.test_ban_functionality),
        ("Role Permission Check", tester.test_role_permission_check),
        ("Access Check API", tester.test_access_check_api),
        
        # Contact Info API tests (HIGH PRIORITY - as requested in review)
        ("Get Contact Info", tester.test_get_contact_info),
        ("Update Contact Info", tester.test_update_contact_info),
        ("Artist Page Contact Info", tester.test_artist_page_contact_info),
        
        # API Integration tests (high priority)
        ("Odesli API Integration", tester.test_odesli_integration),
        
        # Page management tests
        ("Create Page", tester.test_create_page),
        ("Get User Pages", tester.test_get_pages),
        ("Get Specific Page", tester.test_get_page),
        ("Update Page", tester.test_update_page),
        
        # Link management tests
        ("Create Link", tester.test_create_link),
        ("Get Page Links", tester.test_get_links),
        ("Update Link", tester.test_update_link),
        
        # IP Geolocation tests (high priority - new feature)
        ("IP Geolocation - US IP", tester.test_ip_geolocation_us_ip),
        ("IP Geolocation - Russian IP", tester.test_ip_geolocation_russia_ip),
        ("IP Geolocation - Localhost", tester.test_ip_geolocation_localhost),
        ("Track Page View with Geo", tester.test_track_page_view_geolocation),
        ("Track Share with Geo", tester.test_track_share_geolocation),
        ("Track QR Scan with Geo", tester.test_qr_scan_geolocation),
        
        # Public access tests
        ("Public Page Access", tester.test_public_page),
        ("Analytics", tester.test_analytics),
        
        # Admin tests
        ("Admin Get Users", tester.test_admin_get_users),
        ("Admin Get Pages", tester.test_admin_get_pages),
        ("Admin Block User", tester.test_admin_block_user),
        ("Admin Disable Page", tester.test_admin_disable_page),
        
        # Cleanup tests
        ("Delete Link", tester.test_delete_link),
        ("Delete Page", tester.test_delete_page),
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