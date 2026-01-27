#!/usr/bin/env python3
"""
Focused IP Geolocation Testing Script for MyTrack App
Tests the new IP geolocation feature for analytics
"""

import requests
import json
import time
from datetime import datetime

class GeolocationTester:
    def __init__(self, base_url="https://app-gateway-17.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.test_user_id = None
        self.test_page_id = None
        self.test_link_id = None
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def make_request(self, method, endpoint, data=None, headers=None, expected_status=200):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}/{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
            
        if headers:
            req_headers.update(headers)
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers)
                
            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ Request failed - Expected {expected_status}, got {response.status_code}")
                try:
                    self.log(f"   Response: {response.json()}")
                except:
                    self.log(f"   Response: {response.text[:200]}...")
                return False, {}
                
        except Exception as e:
            self.log(f"❌ Request error: {str(e)}")
            return False, {}
    
    def setup_test_data(self):
        """Create test user, page, and link for geolocation testing"""
        self.log("🔧 Setting up test data...")
        
        # Register test user
        timestamp = int(time.time())
        user_data = {
            "email": f"geotest{timestamp}@example.com",
            "username": f"geotest{timestamp}",
            "password": "testpass123"
        }
        
        success, response = self.make_request('POST', 'auth/register', user_data)
        if not success:
            return False
            
        self.token = response.get('token')
        self.test_user_id = response['user']['id']
        self.log(f"✅ Created test user: {user_data['email']}")
        
        # Create test page
        page_data = {
            "title": f"Geo Test Song {timestamp}",
            "slug": f"geo-test-{timestamp}",
            "artist_name": "Geo Test Artist",
            "release_title": "Geo Test Release",
            "description": "Testing geolocation feature"
        }
        
        success, response = self.make_request('POST', 'pages', page_data)
        if not success:
            return False
            
        self.test_page_id = response['id']
        self.log(f"✅ Created test page: {response['slug']}")
        
        # Create test link with valid URL
        link_data = {
            "platform": "spotify",
            "url": "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",  # Valid Spotify URL
            "active": True
        }
        
        success, response = self.make_request('POST', f'pages/{self.test_page_id}/links', link_data)
        if not success:
            return False
            
        self.test_link_id = response['id']
        self.log(f"✅ Created test link: {response['platform']}")
        
        return True
    
    def test_geolocation_with_ip(self, ip_address, expected_country=None, expected_city=None, test_name=""):
        """Test geolocation with specific IP address"""
        self.log(f"🌍 Testing geolocation with {test_name} IP: {ip_address}")
        
        # Simulate click with specific IP
        headers = {'X-Forwarded-For': ip_address}
        
        # Use GET request to click endpoint (it should redirect)
        success, response = self.make_request('GET', f'click/{self.test_link_id}', 
                                            headers=headers, expected_status=302)
        
        if not success:
            # Try without expecting redirect - some setups might handle differently
            success, response = self.make_request('GET', f'click/{self.test_link_id}', 
                                                headers=headers, expected_status=200)
        
        if not success:
            self.log(f"❌ Failed to simulate click with IP {ip_address}")
            return False
            
        # Wait for click to be processed
        time.sleep(2)
        
        # Check analytics for geolocation data
        success, analytics = self.make_request('GET', 'analytics/global/summary')
        if not success:
            self.log("❌ Failed to get analytics data")
            return False
            
        # Analyze geolocation results
        by_country = analytics.get('by_country', [])
        by_city = analytics.get('by_city', [])
        
        self.log(f"   📍 Countries found: {[c.get('country') for c in by_country]}")
        self.log(f"   🏙️ Cities found: {[c.get('city') for c in by_city]}")
        
        # Check if we have the expected results
        if expected_country:
            found_country = any(expected_country.lower() in c.get('country', '').lower() 
                              for c in by_country)
            if found_country:
                self.log(f"   ✅ Found expected country: {expected_country}")
            else:
                self.log(f"   ⚠️ Expected country '{expected_country}' not found")
        
        if expected_city:
            found_city = any(expected_city.lower() in c.get('city', '').lower() 
                           for c in by_city)
            if found_city:
                self.log(f"   ✅ Found expected city: {expected_city}")
            else:
                self.log(f"   ⚠️ Expected city '{expected_city}' not found")
        
        # Check for non-unknown data
        has_real_data = any(
            country.get('country') not in ['Неизвестно', 'Unknown', ''] 
            for country in by_country
        )
        
        return has_real_data
    
    def test_localhost_handling(self):
        """Test that localhost IPs return 'Неизвестно'"""
        self.log("🏠 Testing localhost IP handling...")
        
        # Test with localhost IP
        headers = {'X-Forwarded-For': '127.0.0.1'}
        
        success, response = self.make_request('GET', f'click/{self.test_link_id}', 
                                            headers=headers, expected_status=302)
        
        if not success:
            success, response = self.make_request('GET', f'click/{self.test_link_id}', 
                                                headers=headers, expected_status=200)
        
        if not success:
            self.log("❌ Failed to simulate localhost click")
            return False
            
        time.sleep(2)
        
        # Check analytics
        success, analytics = self.make_request('GET', 'analytics/global/summary')
        if not success:
            return False
            
        by_country = analytics.get('by_country', [])
        by_city = analytics.get('by_city', [])
        
        # Should have "Неизвестно" entries
        has_unknown = any(
            country.get('country') == 'Неизвестно' 
            for country in by_country
        )
        
        if has_unknown:
            self.log("   ✅ Localhost correctly returns 'Неизвестно'")
            return True
        else:
            self.log("   ⚠️ Expected 'Неизвестно' for localhost IP")
            return False
    
    def test_other_endpoints(self):
        """Test geolocation on other tracking endpoints"""
        self.log("📊 Testing other tracking endpoints...")
        
        test_ips = [
            ('1.1.1.1', 'Cloudflare DNS'),
            ('8.8.4.4', 'Google DNS'),
        ]
        
        results = []
        
        for ip, description in test_ips:
            headers = {'X-Forwarded-For': ip}
            
            # Test page view tracking
            success, _ = self.make_request('POST', f'track/view/{self.test_page_id}', 
                                        headers=headers)
            if success:
                self.log(f"   ✅ Page view tracking with {description}")
                results.append(True)
            else:
                self.log(f"   ❌ Page view tracking failed with {description}")
                results.append(False)
            
            # Test share tracking
            success, _ = self.make_request('POST', f'track/share/{self.test_page_id}?share_type=link', 
                                        headers=headers)
            if success:
                self.log(f"   ✅ Share tracking with {description}")
                results.append(True)
            else:
                self.log(f"   ❌ Share tracking failed with {description}")
                results.append(False)
        
        return all(results)
    
    def run_all_tests(self):
        """Run comprehensive geolocation tests"""
        self.log("🚀 Starting IP Geolocation Tests for MyTrack...")
        self.log(f"Testing against: {self.base_url}")
        
        # Setup
        if not self.setup_test_data():
            self.log("❌ Failed to setup test data")
            return False
        
        results = []
        
        # Test with different public IPs
        test_cases = [
            ('8.8.8.8', 'United States', None, 'US Google DNS'),
            ('77.88.8.8', 'Russia', None, 'Russian Yandex DNS'),
            ('1.1.1.1', None, None, 'Cloudflare DNS'),
            ('208.67.222.222', 'United States', None, 'OpenDNS'),
        ]
        
        for ip, country, city, description in test_cases:
            result = self.test_geolocation_with_ip(ip, country, city, description)
            results.append(result)
        
        # Test localhost handling
        localhost_result = self.test_localhost_handling()
        results.append(localhost_result)
        
        # Test other endpoints
        other_endpoints_result = self.test_other_endpoints()
        results.append(other_endpoints_result)
        
        # Summary
        passed = sum(results)
        total = len(results)
        
        self.log(f"\n📊 Geolocation Test Results:")
        self.log(f"Tests passed: {passed}/{total}")
        self.log(f"Success rate: {(passed/total*100):.1f}%")
        
        if passed == total:
            self.log("✅ All geolocation tests passed!")
            return True
        else:
            self.log("⚠️ Some geolocation tests failed - see details above")
            return False

def main():
    tester = GeolocationTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())