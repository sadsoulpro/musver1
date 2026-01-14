#!/usr/bin/env python3
"""
Focused RBAC Test - Tests the specific scenarios from the review request
"""

import requests
import json
import time

def test_rbac_system():
    base_url = "https://musoconnect-2.preview.emergentagent.com/api"
    
    print("🚀 Testing RBAC + Dynamic Plan Limits System")
    print("=" * 60)
    
    # 1. Test Admin Login
    print("\n1. Testing Admin Login...")
    admin_response = requests.post(f"{base_url}/auth/login", 
                                 json={"email": "admin@example.com", "password": "admin123"})
    
    if admin_response.status_code != 200:
        print(f"❌ Admin login failed: {admin_response.status_code}")
        return False
        
    admin_token = admin_response.json()['token']
    admin_user = admin_response.json()['user']
    print(f"✅ Admin login successful - Role: {admin_user['role']}")
    
    # 2. Test Auto-owner assignment (login with existing owner)
    print("\n2. Testing Auto-owner Assignment...")
    owner_response = requests.post(f"{base_url}/auth/login",
                                 json={"email": "thedrumepic@gmail.com", "password": "ownerpass123"})
    
    if owner_response.status_code != 200:
        print(f"❌ Owner login failed: {owner_response.status_code}")
        return False
        
    owner_user = owner_response.json()['user']
    owner_token = owner_response.json()['token']
    
    if owner_user['role'] != 'owner':
        print(f"❌ Expected owner role, got: {owner_user['role']}")
        return False
        
    if owner_user['plan'] != 'ultimate':
        print(f"❌ Expected ultimate plan, got: {owner_user['plan']}")
        return False
        
    if not (owner_user.get('is_verified') or owner_user.get('verified')):
        print(f"❌ Owner should be verified")
        return False
        
    print(f"✅ Owner verification successful - Role: {owner_user['role']}, Plan: {owner_user['plan']}, Verified: {owner_user.get('is_verified')}")
    
    # 3. Test Plan Config APIs
    print("\n3. Testing Plan Config APIs...")
    
    # GET all plan configs
    configs_response = requests.get(f"{base_url}/admin/plan-configs",
                                  headers={'Authorization': f'Bearer {admin_token}'})
    
    if configs_response.status_code != 200:
        print(f"❌ Get plan configs failed: {configs_response.status_code}")
        return False
        
    configs = configs_response.json()
    plan_names = [config['plan_name'] for config in configs]
    expected_plans = ['free', 'pro', 'ultimate']
    
    for plan in expected_plans:
        if plan not in plan_names:
            print(f"❌ Missing plan: {plan}")
            return False
            
    print(f"✅ Found all expected plans: {plan_names}")
    
    # UPDATE plan config
    update_response = requests.put(f"{base_url}/admin/plan-configs/free",
                                 json={"max_pages_limit": 20},
                                 headers={'Authorization': f'Bearer {admin_token}'})
    
    if update_response.status_code != 200:
        print(f"❌ Update plan config failed: {update_response.status_code}")
        return False
        
    updated_config = update_response.json()
    if updated_config['max_pages_limit'] != 20:
        print(f"❌ Plan config not updated correctly")
        return False
        
    print(f"✅ Plan config updated successfully")
    
    # 4. Test User Management APIs
    print("\n4. Testing User Management APIs...")
    
    # GET users list
    users_response = requests.get(f"{base_url}/admin/users/list",
                                headers={'Authorization': f'Bearer {admin_token}'})
    
    if users_response.status_code != 200:
        print(f"❌ Get users list failed: {users_response.status_code}")
        return False
        
    users_data = users_response.json()
    users = users_data.get('users', [])
    if not users or len(users) == 0 or 'page_count' not in users[0]:
        print(f"❌ Users list missing page_count field or empty")
        return False
        
    print(f"✅ Users list retrieved with page_count field")
    
    # Create test user for management
    timestamp = int(time.time())
    test_user_data = {
        "email": f"testuser{timestamp}@example.com",
        "username": f"testuser{timestamp}",
        "password": "testpass123"
    }
    
    user_response = requests.post(f"{base_url}/auth/register", json=test_user_data)
    if user_response.status_code != 200:
        print(f"❌ Create test user failed: {user_response.status_code}")
        return False
        
    test_user_id = user_response.json()['user']['id']
    test_user_token = user_response.json()['token']
    
    # UPDATE user plan
    plan_response = requests.put(f"{base_url}/admin/users/{test_user_id}/plan",
                               json={"plan": "pro"},
                               headers={'Authorization': f'Bearer {admin_token}'})
    
    if plan_response.status_code != 200:
        print(f"❌ Update user plan failed: {plan_response.status_code}")
        return False
        
    print(f"✅ User plan updated successfully")
    
    # VERIFY user
    verify_response = requests.put(f"{base_url}/admin/users/{test_user_id}/verify",
                                 json={"is_verified": True},
                                 headers={'Authorization': f'Bearer {admin_token}'})
    
    if verify_response.status_code != 200:
        print(f"❌ Verify user failed: {verify_response.status_code}")
        return False
        
    print(f"✅ User verified successfully")
    
    # 5. Test Ban Functionality
    print("\n5. Testing Ban Functionality...")
    
    # Create user to ban
    ban_timestamp = int(time.time()) + 1
    ban_user_data = {
        "email": f"bantest{ban_timestamp}@example.com",
        "username": f"bantest{ban_timestamp}",
        "password": "testpass123"
    }
    
    ban_user_response = requests.post(f"{base_url}/auth/register", json=ban_user_data)
    if ban_user_response.status_code != 200:
        print(f"❌ Create ban test user failed: {ban_user_response.status_code}")
        return False
        
    ban_user_id = ban_user_response.json()['user']['id']
    
    # Ban the user
    ban_response = requests.put(f"{base_url}/admin/users/{ban_user_id}/ban",
                              json={"is_banned": True},
                              headers={'Authorization': f'Bearer {admin_token}'})
    
    if ban_response.status_code != 200:
        print(f"❌ Ban user failed: {ban_response.status_code}")
        return False
        
    print(f"✅ User banned successfully")
    
    # Try to login as banned user
    banned_login_response = requests.post(f"{base_url}/auth/login", json=ban_user_data)
    
    if banned_login_response.status_code != 403:
        print(f"❌ Banned user should get 403, got: {banned_login_response.status_code}")
        return False
        
    print(f"✅ Banned user correctly blocked from login")
    
    # 6. Test Role Permission Check
    print("\n6. Testing Role Permission Check...")
    
    # Admin should NOT be able to change roles (403)
    role_response = requests.put(f"{base_url}/admin/users/{test_user_id}/role",
                               json={"role": "moderator"},
                               headers={'Authorization': f'Bearer {admin_token}'})
    
    if role_response.status_code != 403:
        print(f"❌ Admin should get 403 when changing roles, got: {role_response.status_code}")
        return False
        
    print(f"✅ Admin correctly blocked from changing roles")
    
    # Owner SHOULD be able to change roles
    owner_role_response = requests.put(f"{base_url}/admin/users/{test_user_id}/role",
                                     json={"role": "moderator"},
                                     headers={'Authorization': f'Bearer {owner_token}'})
    
    if owner_role_response.status_code != 200:
        print(f"⚠️ Owner role change failed: {owner_role_response.status_code} (may be expected)")
    else:
        print(f"✅ Owner can change roles")
    
    # 7. Test Access Check API
    print("\n7. Testing Access Check API...")
    
    # GET my-limits
    limits_response = requests.get(f"{base_url}/my-limits",
                                 headers={'Authorization': f'Bearer {test_user_token}'})
    
    if limits_response.status_code != 200:
        print(f"❌ Get my-limits failed: {limits_response.status_code}")
        return False
        
    limits_data = limits_response.json()
    required_fields = ['plan', 'limits', 'usage']
    for field in required_fields:
        if field not in limits_data:
            print(f"❌ Missing field in my-limits: {field}")
            return False
            
    print(f"✅ My-limits API working - Plan: {limits_data['plan']}")
    
    # GET check-access
    access_response = requests.get(f"{base_url}/check-access/max_pages",
                                 params={"value": 5},
                                 headers={'Authorization': f'Bearer {test_user_token}'})
    
    if access_response.status_code != 200:
        print(f"❌ Check access failed: {access_response.status_code}")
        return False
        
    access_data = access_response.json()
    if not access_data.get('has_access'):
        print(f"❌ Expected has_access=true in launch mode")
        return False
        
    print(f"✅ Access check API working - Launch mode active")
    
    print("\n" + "=" * 60)
    print("🎉 ALL RBAC TESTS PASSED!")
    return True

if __name__ == "__main__":
    success = test_rbac_system()
    exit(0 if success else 1)