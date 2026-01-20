from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Header, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse, JSONResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64
from PIL import Image, ImageFilter
import aiofiles
import io
import httpx
import resend
import asyncio
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ['JWT_SECRET']  # Required - no fallback for security
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Resend Config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Frontend URL for reset links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Upload directory
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

# Covers directory
COVERS_DIR = UPLOAD_DIR / 'covers'
COVERS_DIR.mkdir(exist_ok=True)

# ===================== RBAC CONFIGURATION =====================

# Owner email - gets automatic owner role
OWNER_EMAIL = os.environ['OWNER_EMAIL']  # Required - configured in .env

# Role hierarchy (higher index = more permissions)
ROLE_HIERARCHY = {
    "user": 0,
    "moderator": 1,
    "admin": 2,
    "owner": 3
}

# Default plan limits (used as fallback if PlanConfig not found)
DEFAULT_PLAN_CONFIGS = {
    "free": {
        "plan_name": "free",
        "max_pages_limit": 3,
        "max_subdomains_limit": 0,  # No subdomains for free
        "can_use_custom_design": False,
        "has_analytics": True,
        "has_advanced_analytics": False,
        "can_remove_branding": False,
        "can_use_ai_generation": False,
        "can_verify_profile": False,
        "priority_support": False
    },
    "pro": {
        "plan_name": "pro",
        "max_pages_limit": -1,  # unlimited
        "max_subdomains_limit": -1,  # unlimited
        "can_use_custom_design": True,
        "has_analytics": True,
        "has_advanced_analytics": True,
        "can_remove_branding": True,
        "can_use_ai_generation": True,
        "can_verify_profile": True,
        "priority_support": True
    }
}

# Launch mode - when True, check_access returns True for all active users
LAUNCH_MODE = True

# Geo cache to avoid too many API calls
_geo_cache = {}

async def get_geo_from_ip(ip: str) -> dict:
    """Get country and city from IP address using ip-api.com (free, no key needed)"""
    # Return cached result if exists
    if ip in _geo_cache:
        return _geo_cache[ip]
    
    # Default values
    result = {"country": "Неизвестно", "city": "Неизвестно"}
    
    # Skip local/private IPs
    if not ip or ip in ["127.0.0.1", "localhost", "::1"] or ip.startswith("10.") or ip.startswith("192.168.") or ip.startswith("172."):
        return result
    
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"http://ip-api.com/json/{ip}?fields=status,country,city&lang=ru")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    result = {
                        "country": data.get("country", "Неизвестно"),
                        "city": data.get("city", "Неизвестно")
                    }
                    # Cache the result
                    _geo_cache[ip] = result
    except Exception as e:
        logging.warning(f"Geo lookup failed for IP {ip}: {e}")
    
    return result

def get_client_ip(request: Request) -> str:
    """Get the real client IP from request, handling proxies"""
    # Check X-Forwarded-For header (set by proxies/load balancers)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP (original client)
        return forwarded_for.split(",")[0].strip()
    
    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fall back to direct client IP
    if request.client:
        return request.client.host
    
    return ""

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===================== SUBDOMAIN MIDDLEWARE =====================

# Main domain (without subdomain)
MAIN_DOMAIN = os.environ.get('MAIN_DOMAIN', 'mytrack.cc')

class SubdomainMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle subdomain routing.
    Extracts subdomain from Host header and adds it to request state.
    Example: music.mytrack.cc -> subdomain = "music"
    """
    async def dispatch(self, request: Request, call_next):
        host = request.headers.get("host", "").split(":")[0].lower()
        
        # Check for X-Subdomain header (for Nginx proxy)
        subdomain = request.headers.get("x-subdomain", "").lower().strip()
        
        # If no X-Subdomain header, extract from Host
        if not subdomain and host:
            # Check if host ends with main domain
            if host.endswith(f".{MAIN_DOMAIN}"):
                # Extract subdomain part
                subdomain = host.replace(f".{MAIN_DOMAIN}", "")
            elif host == MAIN_DOMAIN or host == f"www.{MAIN_DOMAIN}":
                subdomain = ""
        
        # Store subdomain in request state for use in routes
        request.state.subdomain = subdomain if subdomain and subdomain != "www" else ""
        
        response = await call_next(request)
        return response

app.add_middleware(SubdomainMiddleware)

# ===================== OG BOT MIDDLEWARE =====================

# List of bot User-Agents that need OG tags
BOT_USER_AGENTS = [
    'telegrambot',
    'whatsapp',
    'facebookexternalhit',
    'facebookcatalog',
    'twitterbot',
    'discordbot',
    'slackbot',
    'linkedinbot',
    'pinterest',
    'googlebot',
    'bingbot',
    'yandex',
    'baiduspider',
    'duckduckbot',
    'applebot',
    'embedly',
    'quora link preview',
    'outbrain',
    'vkshare',
    'skypeuripreview',
    'viber',
]

# OG descriptions by language
OG_DESCRIPTIONS = {
    "en": 'Listen, download or stream "{title}" on all available platforms.',
    "ru": 'Слушайте, скачивайте "{title}" на всех доступных площадках.',
    "es": 'Escucha, descarga o reproduce "{title}" en todas las plataformas disponibles.',
}

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

def is_bot(user_agent: str) -> bool:
    """Check if the request is from a social media bot"""
    if not user_agent:
        return False
    ua_lower = user_agent.lower()
    return any(bot in ua_lower for bot in BOT_USER_AGENTS)

async def get_page_for_og(slug: str) -> dict:
    """Get page data for OG tags"""
    page = await db.pages.find_one({"slug": slug}, {"_id": 0})
    if not page:
        return None
    
    # Get user's preferred language
    user = await db.users.find_one(
        {"id": page.get("user_id")}, 
        {"_id": 0, "preferred_language": 1}
    )
    
    return {
        "title": page.get("title", "Music Release"),
        "cover_image": page.get("cover_image", ""),
        "language": user.get("preferred_language", "en") if user else "en"
    }

def generate_og_html(slug: str, title: str, cover_image: str, language: str) -> str:
    """Generate HTML page with OG tags for social media crawlers"""
    # Normalize language
    lang = language.lower() if language.lower() in OG_DESCRIPTIONS else "en"
    
    # Generate description
    description = OG_DESCRIPTIONS[lang].format(title=title)
    
    # Use cover image or default
    og_image = cover_image if cover_image and (cover_image.startswith("http") or cover_image.startswith("/")) else f"{FRONTEND_URL}/og-default.png"
    if og_image.startswith("/"):
        og_image = f"{FRONTEND_URL}{og_image}"
    
    # Page URL
    page_url = f"{FRONTEND_URL}/{slug}"
    
    # Escape HTML entities
    title_escaped = title.replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
    description_escaped = description.replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')
    
    return f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title_escaped} — Muslink</title>
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="music.song">
    <meta property="og:url" content="{page_url}">
    <meta property="og:title" content="{title_escaped} — Muslink">
    <meta property="og:description" content="{description_escaped}">
    <meta property="og:image" content="{og_image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Muslink">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="{page_url}">
    <meta name="twitter:title" content="{title_escaped} — Muslink">
    <meta name="twitter:description" content="{description_escaped}">
    <meta name="twitter:image" content="{og_image}">
    
    <!-- Standard Meta -->
    <meta name="description" content="{description_escaped}">
    
    <!-- Theme -->
    <meta name="theme-color" content="#d946ef">
    
    <!-- Redirect for non-bot visitors that somehow got here -->
    <script>window.location.href = "{page_url}";</script>
</head>
<body style="background:#0a0a0a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
    <div style="text-align:center;padding:20px;">
        <img src="{og_image}" alt="{title_escaped}" style="max-width:300px;border-radius:12px;margin-bottom:20px;">
        <h1 style="margin:0 0 10px;">{title_escaped}</h1>
        <p style="margin:0;opacity:0.7;">{description_escaped}</p>
        <p style="margin-top:20px;"><a href="{page_url}" style="color:#d946ef;">Open in Muslink →</a></p>
    </div>
</body>
</html>'''

class OGBotMiddleware(BaseHTTPMiddleware):
    """
    Middleware to serve OG tags HTML to social media bots.
    Regular users get the SPA (index.html).
    """
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Skip API routes, static files, and special paths
        if (path.startswith('/api') or 
            path.startswith('/static') or 
            path.startswith('/uploads') or
            path.startswith('/assets') or
            path in ['/', '/login', '/register', '/forgot-password', '/reset-password', '/demo', '/pricing'] or
            path.startswith('/multilinks') or
            path.startswith('/random-cover') or
            path.startswith('/analytics') or
            path.startswith('/domains') or
            path.startswith('/settings') or
            path.startswith('/verification') or
            path.startswith('/support') or
            path.startswith('/admin') or
            path.startswith('/page/') or
            '.' in path.split('/')[-1]):  # Skip files with extensions
            return await call_next(request)
        
        # Extract potential slug (e.g., /artist-name)
        slug = path.lstrip('/')
        if not slug or '/' in slug:
            return await call_next(request)
        
        # Check if this is a bot request
        user_agent = request.headers.get('user-agent', '')
        if not is_bot(user_agent):
            return await call_next(request)
        
        # Get page data for OG tags
        try:
            page_data = await get_page_for_og(slug)
            if not page_data:
                return await call_next(request)
            
            # Generate OG HTML
            html = generate_og_html(
                slug=slug,
                title=page_data['title'],
                cover_image=page_data['cover_image'],
                language=page_data['language']
            )
            
            logging.info(f"Serving OG HTML for bot: {user_agent[:50]}... slug: {slug}")
            return HTMLResponse(content=html, status_code=200)
            
        except Exception as e:
            logging.error(f"OG middleware error: {e}")
            return await call_next(request)

# Add OG middleware BEFORE subdomain middleware
app.add_middleware(OGBotMiddleware)

# ===================== MODELS =====================

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    role: str
    status: str
    plan: str
    is_verified: Optional[bool] = False
    is_banned: Optional[bool] = False
    verified: Optional[bool] = False
    verification_status: Optional[str] = "none"
    show_verification_badge: Optional[bool] = True
    site_navigation_enabled: Optional[bool] = False
    created_at: str

class PageCreate(BaseModel):
    title: str
    slug: str
    artist_name: str
    release_title: str
    description: Optional[str] = ""
    cover_image: Optional[str] = ""
    qr_enabled: Optional[bool] = True
    page_theme: Optional[str] = "dark"

class PageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    artist_name: Optional[str] = None
    release_title: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    status: Optional[str] = None
    qr_enabled: Optional[bool] = None
    page_theme: Optional[str] = None

class LinkCreate(BaseModel):
    platform: str
    url: str
    active: bool = True
    order: Optional[int] = None

class LinkUpdate(BaseModel):
    platform: Optional[str] = None
    url: Optional[str] = None
    active: Optional[bool] = None
    order: Optional[int] = None

class LinkReorder(BaseModel):
    link_ids: List[str]

class PasswordReset(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

# ===================== RBAC MODELS =====================

class PlanConfigCreate(BaseModel):
    plan_name: str
    max_pages_limit: int = 3
    max_subdomains_limit: int = 0
    can_use_custom_design: bool = False
    has_analytics: bool = True
    has_advanced_analytics: bool = False
    can_remove_branding: bool = False
    can_use_ai_generation: bool = False
    can_verify_profile: bool = False
    priority_support: bool = False

class PlanConfigUpdate(BaseModel):
    max_pages_limit: Optional[int] = None
    max_subdomains_limit: Optional[int] = None
    can_use_custom_design: Optional[bool] = None
    has_analytics: Optional[bool] = None
    has_advanced_analytics: Optional[bool] = None
    can_remove_branding: Optional[bool] = None
    can_use_ai_generation: Optional[bool] = None
    can_verify_profile: Optional[bool] = None
    priority_support: Optional[bool] = None

class UserRoleUpdate(BaseModel):
    role: str  # owner, admin, moderator, user

class UserPlanUpdate(BaseModel):
    plan: str  # free, pro

class UserBanUpdate(BaseModel):
    is_banned: bool

class UserVerifyUpdate(BaseModel):
    is_verified: bool

# ===================== SUBDOMAIN MODELS =====================

class SubdomainCreate(BaseModel):
    subdomain: str = Field(..., min_length=3, max_length=32, pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")

class SubdomainUpdate(BaseModel):
    is_active: bool

# ===================== TICKET/SUPPORT MODELS =====================

class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)
    category: str = "general"  # general, technical, billing, other

class TicketReply(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)

class TicketStatusUpdate(BaseModel):
    status: str  # open, in_progress, resolved, closed

# ===================== HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===================== RBAC HELPERS =====================

def has_role_permission(user_role: str, required_role: str) -> bool:
    """Check if user role has permission based on hierarchy"""
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_level >= required_level

async def get_plan_config(plan_name: str) -> dict:
    """Get plan configuration from database or default"""
    config = await db.plan_configs.find_one({"plan_name": plan_name}, {"_id": 0})
    if config:
        return config
    return DEFAULT_PLAN_CONFIGS.get(plan_name, DEFAULT_PLAN_CONFIGS["free"])

async def check_access(user: dict, requirement: str, value: any = None) -> bool:
    """
    Check if user has access to a feature/action.
    In LAUNCH_MODE, returns True for all active (non-banned) users.
    
    Requirements:
    - max_pages: Check if user can create more pages
    - custom_design: Check if user can use custom design
    - analytics: Check if user has analytics access
    - advanced_analytics: Check if user has advanced analytics
    - remove_branding: Check if user can remove branding
    - role_min: Check if user has minimum role level
    """
    # Check if user is banned
    if user.get("is_banned", False):
        return False
    
    # In launch mode, allow everything for active users
    if LAUNCH_MODE:
        return True
    
    # Get plan config
    plan_config = await get_plan_config(user.get("plan", "free"))
    
    if requirement == "max_pages":
        max_limit = plan_config.get("max_pages_limit", 3)
        if max_limit == -1:  # unlimited
            return True
        current_pages = value or 0
        return current_pages < max_limit
    
    elif requirement == "custom_design":
        return plan_config.get("can_use_custom_design", False)
    
    elif requirement == "analytics":
        return plan_config.get("has_analytics", True)
    
    elif requirement == "advanced_analytics":
        return plan_config.get("has_advanced_analytics", False)
    
    elif requirement == "remove_branding":
        return plan_config.get("can_remove_branding", False)
    
    elif requirement == "role_min":
        return has_role_permission(user.get("role", "user"), value)
    
    return True

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is banned (403 for any request)
    if user.get("is_banned", False):
        raise HTTPException(status_code=403, detail="Аккаунт заблокирован. Обратитесь в поддержку.")
    
    # Legacy status check
    if user.get("status") == "blocked":
        raise HTTPException(status_code=403, detail="Account blocked")
    
    return user

async def get_admin_user(authorization: str = Header(None)):
    """Require at least moderator role"""
    user = await get_current_user(authorization)
    if not has_role_permission(user.get("role", "user"), "moderator"):
        raise HTTPException(status_code=403, detail="Доступ запрещён. Требуется роль модератора или выше.")
    return user

async def get_owner_user(authorization: str = Header(None)):
    """Require owner role"""
    user = await get_current_user(authorization)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Доступ запрещён. Требуется роль владельца.")
    return user

async def get_page_with_admin_access(page_id: str, user: dict) -> dict:
    """
    Get page with admin access check.
    Owner/Admin/Moderator can access any page.
    Regular users can only access their own pages.
    Returns the page if access is granted, raises 404 if not found/not authorized.
    """
    user_role = user.get("role", "user")
    is_admin = user_role in ["owner", "admin", "moderator"]
    
    if is_admin:
        # Admin can access any page
        page = await db.pages.find_one({"id": page_id}, {"_id": 0})
    else:
        # Regular user can only access own pages
        page = await db.pages.find_one({"id": page_id, "user_id": user["id"]}, {"_id": 0})
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return page

def generate_blurred_background(input_path: str, output_path: str):
    """Generate blurred background from cover image"""
    try:
        with Image.open(input_path) as img:
            img = img.convert('RGB')
            img = img.resize((400, 400))
            blurred = img.filter(ImageFilter.GaussianBlur(radius=30))
            blurred.save(output_path, 'JPEG', quality=70)
    except Exception as e:
        logging.error(f"Error generating blurred background: {e}")

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"$or": [{"email": data.email}, {"username": data.username}]})
    if existing:
        raise HTTPException(status_code=400, detail="Email or username already exists")
    
    # Auto-assign owner role and pro plan for specific email
    is_owner = data.email.lower() == OWNER_EMAIL.lower()
    
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "username": data.username,
        "password_hash": hash_password(data.password),
        "role": "owner" if is_owner else "user",
        "status": "active",
        "plan": "pro" if is_owner else "free",
        "is_verified": is_owner,  # Owner is auto-verified
        "is_banned": False,
        "verified": is_owner,  # Legacy field
        "verification_status": "approved" if is_owner else "none",
        "show_verification_badge": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    if is_owner:
        logging.info(f"Owner account created: {data.email}")
    
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "role": user["role"],
            "status": user["status"],
            "plan": user["plan"],
            "is_verified": user["is_verified"],
            "is_banned": user["is_banned"],
            "verified": user["verified"],
            "verification_status": user["verification_status"],
            "show_verification_badge": user["show_verification_badge"],
            "created_at": user["created_at"]
        }
    }

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user is banned
    if user.get("is_banned", False):
        raise HTTPException(status_code=403, detail="Аккаунт заблокирован. Обратитесь в поддержку.")
    
    if user.get("status") == "blocked":
        raise HTTPException(status_code=403, detail="Account blocked")
    
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "role": user["role"],
            "status": user["status"],
            "plan": user.get("plan", "free"),
            "is_verified": user.get("is_verified", False),
            "is_banned": user.get("is_banned", False),
            "verified": user.get("verified", False),
            "verification_status": user.get("verification_status", "none"),
            "show_verification_badge": user.get("show_verification_badge", True),
            "site_navigation_enabled": user.get("site_navigation_enabled", False),
            "created_at": user["created_at"]
        }
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Send password reset email"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "Если email существует, инструкции по сбросу пароля будут отправлены"}
    
    # Generate reset token (valid for 1 hour)
    reset_token = secrets.token_urlsafe(32)
    reset_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token in database
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_expiry": reset_expiry.isoformat()
        }}
    )
    
    # Build reset URL
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Send email via Resend
    if RESEND_API_KEY:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Сброс пароля MyTrack</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #18181b; color: #ffffff; padding: 40px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #27272a; border-radius: 16px; padding: 40px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #d946ef; margin: 0;">MYTRACK</h1>
                </div>
                <h2 style="color: #ffffff; margin-bottom: 20px;">Сброс пароля</h2>
                <p style="color: #a1a1aa; line-height: 1.6;">
                    Привет, {user.get('username', 'пользователь')}!
                </p>
                <p style="color: #a1a1aa; line-height: 1.6;">
                    Мы получили запрос на сброс пароля для вашей учётной записи. Нажмите на кнопку ниже, чтобы создать новый пароль:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="display: inline-block; background-color: #d946ef; color: #ffffff; padding: 14px 32px; border-radius: 30px; text-decoration: none; font-weight: bold;">
                        Сбросить пароль
                    </a>
                </div>
                <p style="color: #a1a1aa; line-height: 1.6; font-size: 14px;">
                    Ссылка действительна в течение 1 часа. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
                </p>
                <hr style="border: none; border-top: 1px solid #3f3f46; margin: 30px 0;">
                <p style="color: #71717a; font-size: 12px; text-align: center;">
                    © 2026 MyTrack. Все права защищены.
                </p>
            </div>
        </body>
        </html>
        """
        
        try:
            params = {
                "from": SENDER_EMAIL,
                "to": [data.email],
                "subject": "Сброс пароля MyTrack",
                "html": html_content
            }
            await asyncio.to_thread(resend.Emails.send, params)
            logging.info(f"Password reset email sent to {data.email}")
        except Exception as e:
            logging.error(f"Failed to send reset email: {str(e)}")
            # Don't expose email sending errors to user
    
    return {"message": "Если email существует, инструкции по сбросу пароля будут отправлены"}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password using token"""
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен содержать минимум 6 символов")
    
    # Find user with valid reset token
    user = await db.users.find_one({"reset_token": data.token}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=400, detail="Недействительная или просроченная ссылка для сброса пароля")
    
    # Check token expiry
    expiry_str = user.get("reset_token_expiry")
    if expiry_str:
        expiry = datetime.fromisoformat(expiry_str.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expiry:
            raise HTTPException(status_code=400, detail="Ссылка для сброса пароля истекла")
    
    # Update password and clear reset token
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {"password_hash": hash_password(data.new_password)},
            "$unset": {"reset_token": "", "reset_token_expiry": ""}
        }
    )
    
    return {"message": "Пароль успешно изменён"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    # Get plan config for user
    plan_config = await get_plan_config(user.get("plan", "free"))
    
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "role": user["role"],
        "status": user["status"],
        "plan": user["plan"],
        "plan_config": plan_config,
        "verified": user.get("verified", False),
        "verification_status": user.get("verification_status", "none"),
        "show_verification_badge": user.get("show_verification_badge", True),
        "site_navigation_enabled": user.get("site_navigation_enabled", False),
        "created_at": user["created_at"]
    }

# ===================== USER SETTINGS ROUTES =====================

class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@api_router.put("/settings/profile")
async def update_profile(data: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    """Update user profile (username, email)"""
    update_data = {}
    
    if data.username and data.username != user["username"]:
        # Check if username is taken
        existing = await db.users.find_one({"username": data.username, "id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Это имя пользователя уже занято")
        update_data["username"] = data.username
    
    if data.email and data.email != user["email"]:
        # Check if email is taken
        existing = await db.users.find_one({"email": data.email, "id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Этот email уже используется")
        update_data["email"] = data.email
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Нет данных для обновления")
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    # Return updated user
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"message": "Профиль обновлён", "user": updated_user}

@api_router.put("/settings/password")
async def change_password(data: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    """Change user password"""
    # Verify current password
    if not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Новый пароль должен содержать минимум 6 символов")
    
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="Новый пароль должен отличаться от текущего")
    
    # Update password
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    
    return {"message": "Пароль успешно изменён"}

@api_router.delete("/settings/account")
async def delete_account(user: dict = Depends(get_current_user)):
    """Delete user account (not allowed for admins)"""
    if user["role"] == "admin":
        raise HTTPException(status_code=403, detail="Администратор не может удалить свой аккаунт")
    
    user_id = user["id"]
    
    # Get all user pages
    pages = await db.pages.find({"user_id": user_id}, {"id": 1}).to_list(1000)
    page_ids = [p["id"] for p in pages]
    
    # Delete all related data
    if page_ids:
        await db.links.delete_many({"page_id": {"$in": page_ids}})
        await db.clicks.delete_many({"page_id": {"$in": page_ids}})
        await db.views.delete_many({"page_id": {"$in": page_ids}})
        await db.shares.delete_many({"page_id": {"$in": page_ids}})
    
    # Delete pages
    await db.pages.delete_many({"user_id": user_id})
    
    # Delete user
    await db.users.delete_one({"id": user_id})
    
    return {"message": "Аккаунт и все связанные данные удалены"}

@api_router.put("/settings/site-navigation")
async def toggle_site_navigation(data: dict, user: dict = Depends(get_current_user)):
    """Toggle site navigation mode (shows arrows on public pages)"""
    enabled = data.get("enabled", False)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"site_navigation_enabled": enabled}}
    )
    
    return {"enabled": enabled, "message": "Настройка сохранена"}

# ===================== CONTACT INFO ROUTES =====================

class SocialLinksModel(BaseModel):
    telegram: Optional[str] = ""
    instagram: Optional[str] = ""
    vk: Optional[str] = ""
    tiktok: Optional[str] = ""
    twitter: Optional[str] = ""
    website: Optional[str] = ""

class ContactInfoUpdate(BaseModel):
    contact_email: Optional[str] = ""
    social_links: Optional[SocialLinksModel] = None
    profile_description: Optional[str] = ""
    artist_name: Optional[str] = ""

@api_router.get("/profile/contacts")
async def get_contact_info(user: dict = Depends(get_current_user)):
    """Get user's contact information"""
    return {
        "contact_email": user.get("contact_email", ""),
        "profile_description": user.get("profile_description", ""),
        "artist_name": user.get("artist_name", ""),
        "social_links": user.get("social_links", {
            "telegram": "",
            "instagram": "",
            "vk": "",
            "tiktok": "",
            "twitter": "",
            "website": ""
        })
    }

@api_router.put("/profile/contacts")
async def update_contact_info(data: ContactInfoUpdate, user: dict = Depends(get_current_user)):
    """Update user's contact information (email and social links)"""
    update_data = {}
    
    if data.contact_email is not None:
        update_data["contact_email"] = data.contact_email
    
    if data.profile_description is not None:
        update_data["profile_description"] = data.profile_description
    
    if data.artist_name is not None:
        update_data["artist_name"] = data.artist_name
    
    if data.social_links is not None:
        update_data["social_links"] = data.social_links.model_dump()
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Нет данных для обновления")
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    return {"message": "Контактная информация обновлена"}

@api_router.get("/users/{user_id}/pages")
async def get_user_pages_public(user_id: str):
    """Get all active pages for a user (for site navigation)"""
    pages = await db.pages.find(
        {"user_id": user_id, "status": "active"},
        {"id": 1, "slug": 1, "title": 1, "artist_name": 1, "release_title": 1, "cover_image": 1, "_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    return pages

# ===================== VERIFICATION ROUTES =====================

class VerificationRequest(BaseModel):
    artist_name: str
    social_links: str  # Links to social media profiles
    description: str  # Why they should be verified

@api_router.get("/verification/status")
async def get_verification_status(user: dict = Depends(get_current_user)):
    """Get current verification status"""
    # Get pending request if any
    request = await db.verification_requests.find_one(
        {"user_id": user["id"], "status": "pending"},
        {"_id": 0}
    )
    
    return {
        "verified": user.get("verified", False),
        "verification_status": user.get("verification_status", "none"),
        "show_badge": user.get("show_verification_badge", True),
        "pending_request": request
    }

@api_router.post("/verification/request")
async def submit_verification_request(data: VerificationRequest, user: dict = Depends(get_current_user)):
    """Submit verification request"""
    
    # Check if already verified
    if user.get("verified"):
        raise HTTPException(status_code=400, detail="Вы уже верифицированы")
    
    # Check if already has pending request
    existing = await db.verification_requests.find_one({
        "user_id": user["id"],
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="У вас уже есть ожидающая заявка")
    
    request = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "artist_name": data.artist_name,
        "social_links": data.social_links,
        "description": data.description,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.verification_requests.insert_one(request)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"verification_status": "pending"}}
    )
    
    return {"message": "Заявка на верификацию отправлена", "request_id": request["id"]}

@api_router.put("/settings/verification-badge")
async def toggle_verification_badge(user: dict = Depends(get_current_user)):
    """Toggle verification badge visibility"""
    current = user.get("show_verification_badge", True)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"show_verification_badge": not current}}
    )
    return {"show_badge": not current}

# ===================== NOTIFICATIONS ROUTES =====================

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    """Get user notifications"""
    notifications = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    unread_count = await db.notifications.count_documents({
        "user_id": user["id"],
        "read": False
    })
    
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"read": True}}
    )
    return {"success": True}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user["id"]},
        {"$set": {"read": True}}
    )
    return {"success": True}

# ===================== PAGE ROUTES =====================

@api_router.get("/pages")
async def get_user_pages(user: dict = Depends(get_current_user)):
    pages = await db.pages.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    # Get click counts for each page
    for page in pages:
        total_clicks = 0
        links = await db.links.find({"page_id": page["id"]}, {"_id": 0}).sort("order", 1).to_list(100)
        for link in links:
            total_clicks += link.get("clicks", 0)
        page["total_clicks"] = total_clicks
        page["links"] = links
    
    return pages

@api_router.post("/pages")
async def create_page(data: PageCreate, user: dict = Depends(get_current_user)):
    
    # Check page limit
    plan_config = await get_plan_config(user.get("plan", "free"))
    max_pages = plan_config.get("max_pages_limit", 3)
    current_count = await db.pages.count_documents({"user_id": user["id"]})
    
    if max_pages != -1 and current_count >= max_pages:
        raise HTTPException(
            status_code=403, 
            detail="PAGE_LIMIT_REACHED"
        )
    
    # Check slug uniqueness
    existing = await db.pages.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    page = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": data.title,
        "slug": data.slug,
        "artist_name": data.artist_name,
        "release_title": data.release_title,
        "description": data.description,
        "cover_image": data.cover_image,
        "background_image": "",
        "status": "active",
        "views": 0,
        "qr_enabled": data.qr_enabled if data.qr_enabled is not None else True,
        "page_theme": data.page_theme if data.page_theme else "dark",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pages.insert_one(page)
    page.pop("_id", None)
    return page

@api_router.get("/pages/{page_id}")
async def get_page(page_id: str, user: dict = Depends(get_current_user)):
    # Use admin access check - owner/admin/moder can access any page
    page = await get_page_with_admin_access(page_id, user)
    
    links = await db.links.find({"page_id": page_id}, {"_id": 0}).sort("order", 1).to_list(100)
    page["links"] = links
    return page

@api_router.put("/pages/{page_id}")
async def update_page(page_id: str, data: PageUpdate, user: dict = Depends(get_current_user)):
    # Use admin access check - owner/admin/moder can edit any page
    page = await get_page_with_admin_access(page_id, user)
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Check slug uniqueness if updating
    if "slug" in update_data and update_data["slug"] != page["slug"]:
        existing = await db.pages.find_one({"slug": update_data["slug"]})
        if existing:
            raise HTTPException(status_code=400, detail="Slug already exists")
    
    if update_data:
        await db.pages.update_one({"id": page_id}, {"$set": update_data})
    
    updated = await db.pages.find_one({"id": page_id}, {"_id": 0})
    return updated

@api_router.delete("/pages/{page_id}")
async def delete_page(page_id: str, user: dict = Depends(get_current_user)):
    # Use admin access check - owner/admin/moder can delete any page
    page = await get_page_with_admin_access(page_id, user)
    
    await db.pages.delete_one({"id": page_id})
    
    # Delete associated links and clicks
    await db.links.delete_many({"page_id": page_id})
    await db.clicks.delete_many({"page_id": page_id})
    
    return {"message": "Page deleted"}

# ===================== LINK ROUTES =====================

@api_router.get("/pages/{page_id}/links")
async def get_page_links(page_id: str, user: dict = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    links = await db.links.find({"page_id": page_id}, {"_id": 0}).sort("order", 1).to_list(100)
    return links

@api_router.post("/pages/{page_id}/links")
async def create_link(page_id: str, data: LinkCreate, user: dict = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Get max order for this page
    max_order_link = await db.links.find_one({"page_id": page_id}, sort=[("order", -1)])
    next_order = (max_order_link.get("order", 0) + 1) if max_order_link else 0
    
    link = {
        "id": str(uuid.uuid4()),
        "page_id": page_id,
        "platform": data.platform,
        "url": data.url,
        "active": data.active,
        "order": data.order if data.order is not None else next_order,
        "clicks": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.links.insert_one(link)
    link.pop("_id", None)
    return link

@api_router.put("/pages/{page_id}/links/reorder")
async def reorder_links(page_id: str, data: LinkReorder, user: dict = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Update order for each link
    for index, link_id in enumerate(data.link_ids):
        await db.links.update_one(
            {"id": link_id, "page_id": page_id},
            {"$set": {"order": index}}
        )
    
    # Return updated links in new order
    links = await db.links.find({"page_id": page_id}, {"_id": 0}).sort("order", 1).to_list(100)
    return links

@api_router.put("/pages/{page_id}/links/{link_id}")
async def update_link(page_id: str, link_id: str, data: LinkUpdate, user: dict = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.links.update_one({"id": link_id, "page_id": page_id}, {"$set": update_data})
    
    updated = await db.links.find_one({"id": link_id}, {"_id": 0})
    return updated

@api_router.delete("/pages/{page_id}/links/{link_id}")
async def delete_link(page_id: str, link_id: str, user: dict = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    result = await db.links.delete_one({"id": link_id, "page_id": page_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return {"message": "Link deleted"}

# ===================== WAITLIST =====================

class WaitlistRequest(BaseModel):
    email: EmailStr
    feature: Optional[str] = ""
    language: Optional[str] = "en"

# Simple in-memory rate limiting (per IP)
waitlist_rate_limit = {}
WAITLIST_RATE_LIMIT_SECONDS = 60

@api_router.post("/waitlist")
async def add_to_waitlist(data: WaitlistRequest, request: Request):
    """Add email to waitlist for PRO features"""
    # Rate limiting by IP
    client_ip = request.client.host if request.client else "unknown"
    now = datetime.now(timezone.utc)
    
    if client_ip in waitlist_rate_limit:
        last_request = waitlist_rate_limit[client_ip]
        if (now - last_request).total_seconds() < WAITLIST_RATE_LIMIT_SECONDS:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    waitlist_rate_limit[client_ip] = now
    
    # Check if email already exists
    existing = await db.waitlist.find_one({"email": data.email.lower()})
    if existing:
        # Update features if different
        if data.feature and data.feature not in existing.get("features", []):
            await db.waitlist.update_one(
                {"email": data.email.lower()},
                {"$addToSet": {"features": data.feature}, "$set": {"updated_at": now.isoformat()}}
            )
        return {"success": True, "message": "Email updated"}
    
    # Create new waitlist entry
    waitlist_entry = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower(),
        "features": [data.feature] if data.feature else [],
        "language": data.language,
        "created_at": now.isoformat(),
        "ip": client_ip
    }
    await db.waitlist.insert_one(waitlist_entry)
    
    # Send confirmation email
    if RESEND_API_KEY:
        try:
            # Email content based on language
            subjects = {
                "ru": "Спасибо за интерес к Muslink!",
                "es": "¡Gracias por tu interés en Muslink!",
                "en": "Thanks for your interest in Muslink!"
            }
            bodies = {
                "ru": """
                <h2>Спасибо за вашу заинтересованность!</h2>
                <p>Мы добавили вас в список ожидания. Как только функция станет доступна, мы вам сообщим.</p>
                <p>С наилучшими пожеланиями,<br>Команда Muslink</p>
                """,
                "es": """
                <h2>¡Gracias por tu interés!</h2>
                <p>Te hemos añadido a la lista de espera. Te avisaremos cuando la función esté disponible.</p>
                <p>Saludos,<br>El equipo de Muslink</p>
                """,
                "en": """
                <h2>Thanks for your interest!</h2>
                <p>We've added you to our waitlist. We'll notify you when the feature becomes available.</p>
                <p>Best regards,<br>The Muslink Team</p>
                """
            }
            
            lang = data.language if data.language in subjects else "en"
            
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": data.email,
                "subject": subjects[lang],
                "html": bodies[lang]
            })
        except Exception as e:
            logging.error(f"Failed to send waitlist confirmation email: {e}")
    
    logging.info(f"New waitlist entry: {data.email} for feature: {data.feature}")
    return {"success": True, "message": "Added to waitlist"}

# ===================== OG ENDPOINT FOR BOTS =====================

@api_router.get("/og-check/{slug}")
async def check_og_for_bots(slug: str, request: Request):
    """
    Endpoint that checks User-Agent and returns either:
    - OG HTML for bots
    - JSON redirect instruction for regular users
    """
    user_agent = request.headers.get('user-agent', '')
    
    if is_bot(user_agent):
        # Get page data for OG tags
        page_data = await get_page_for_og(slug)
        if not page_data:
            return JSONResponse({"is_bot": True, "page_found": False})
        
        # Generate OG HTML
        html = generate_og_html(
            slug=slug,
            title=page_data['title'],
            cover_image=page_data['cover_image'],
            language=page_data['language']
        )
        
        logging.info(f"Serving OG HTML for bot: {user_agent[:50]}... slug: {slug}")
        return HTMLResponse(content=html, status_code=200)
    
    return JSONResponse({"is_bot": False, "redirect": f"/{slug}"})

# ===================== SHARE LINK ROUTE FOR SOCIAL MEDIA =====================
# Use /api/s/{slug} for sharing links that bots will crawl correctly
# Example: https://mus.link/api/s/artist-name (users share this link)

@api_router.get("/s/{slug}")
async def share_link_with_og(slug: str, request: Request):
    """
    Share link route with OG tags for social media bots.
    - For bots: serve HTML with OG tags
    - For regular users: redirect to the actual page immediately
    """
    user_agent = request.headers.get('user-agent', '')
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    
    # Get page data
    page_data = await get_page_for_og(slug)
    
    if not page_data:
        # Page not found, redirect to home
        return RedirectResponse(url=frontend_url, status_code=302)
    
    if is_bot(user_agent):
        # Generate OG HTML for bots
        html = generate_og_html(
            slug=slug,
            title=page_data['title'],
            cover_image=page_data['cover_image'],
            language=page_data['language']
        )
        logging.info(f"Serving OG for bot via /api/s/: {user_agent[:50]}... slug: {slug}")
        return HTMLResponse(content=html)
    
    # For regular users, redirect to the actual page
    return RedirectResponse(url=f"{frontend_url}/{slug}", status_code=302)

# ===================== PUBLIC ROUTES =====================

@api_router.get("/artist/{slug}")
async def get_public_page(slug: str):
    page = await db.pages.find_one({"slug": slug, "status": "active"}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Increment view count
    await db.pages.update_one({"slug": slug}, {"$inc": {"views": 1}})
    
    links = await db.links.find({"page_id": page["id"], "active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    page["links"] = links
    page["views"] = page.get("views", 0) + 1
    
    # Get user info (verification, site navigation, plan features, and contact info)
    user = await db.users.find_one({"id": page["user_id"]}, {"_id": 0, "verified": 1, "show_verification_badge": 1, "site_navigation_enabled": 1, "plan": 1, "contact_email": 1, "social_links": 1})
    if user:
        page["user_verified"] = user.get("verified", False) and user.get("show_verification_badge", True)
        page["site_navigation_enabled"] = user.get("site_navigation_enabled", False)
        
        # Add contact info for public page
        page["contact_email"] = user.get("contact_email", "")
        page["social_links"] = user.get("social_links", {})
        
        # Get plan config for branding removal
        plan_config = await get_plan_config(user.get("plan", "free"))
        page["can_remove_branding"] = plan_config.get("can_remove_branding", False)
    else:
        page["user_verified"] = False
        page["site_navigation_enabled"] = False
        page["can_remove_branding"] = False
        page["contact_email"] = ""
        page["social_links"] = {}
    
    return page

@api_router.get("/click/{link_id}")
async def track_click(
    link_id: str, 
    referrer: Optional[str] = None,
    request: Request = None
):
    link = await db.links.find_one({"id": link_id}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Get geo info from IP
    country = "Неизвестно"
    city = "Неизвестно"
    if request:
        # First try CDN headers (Cloudflare, etc.)
        country = request.headers.get("CF-IPCountry", "")
        city = request.headers.get("CF-IPCity", "")
        
        # If no CDN headers, use IP geolocation
        if not country or country == "Unknown":
            client_ip = get_client_ip(request)
            geo = await get_geo_from_ip(client_ip)
            country = geo["country"]
            city = geo["city"]
    
    # Track click with geo data
    click = {
        "id": str(uuid.uuid4()),
        "link_id": link_id,
        "page_id": link["page_id"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "referrer": referrer,
        "country": country,
        "city": city,
        "source": "link"
    }
    await db.clicks.insert_one(click)
    
    # Increment click count
    await db.links.update_one({"id": link_id}, {"$inc": {"clicks": 1}})
    
    return RedirectResponse(url=link["url"], status_code=302)

# Track page view with geo
@api_router.post("/track/view/{page_id}")
async def track_page_view(page_id: str, request: Request = None):
    page = await db.pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    country = "Неизвестно"
    city = "Неизвестно"
    if request:
        # First try CDN headers
        country = request.headers.get("CF-IPCountry", "")
        city = request.headers.get("CF-IPCity", "")
        
        # If no CDN headers, use IP geolocation
        if not country or country == "Unknown":
            client_ip = get_client_ip(request)
            geo = await get_geo_from_ip(client_ip)
            country = geo["country"]
            city = geo["city"]
    
    view = {
        "id": str(uuid.uuid4()),
        "page_id": page_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "country": country,
        "city": city,
        "source": "direct"
    }
    await db.views.insert_one(view)
    
    return {"success": True}

# Track share
@api_router.post("/track/share/{page_id}")
async def track_share(page_id: str, share_type: str = "link", request: Request = None):
    page = await db.pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    country = "Неизвестно"
    city = "Неизвестно"
    if request:
        # First try CDN headers
        country = request.headers.get("CF-IPCountry", "")
        city = request.headers.get("CF-IPCity", "")
        
        # If no CDN headers, use IP geolocation
        if not country or country == "Unknown":
            client_ip = get_client_ip(request)
            geo = await get_geo_from_ip(client_ip)
            country = geo["country"]
            city = geo["city"]
    
    share = {
        "id": str(uuid.uuid4()),
        "page_id": page_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": share_type,  # "link", "qr", "social"
        "country": country,
        "city": city
    }
    await db.shares.insert_one(share)
    
    # Increment share count on page
    await db.pages.update_one({"id": page_id}, {"$inc": {"shares": 1, f"shares_{share_type}": 1}})
    
    return {"success": True}

# Track QR scan
@api_router.get("/qr/{page_id}")
async def track_qr_scan(page_id: str, request: Request = None):
    page = await db.pages.find_one({"id": page_id, "status": "active"}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    country = "Неизвестно"
    city = "Неизвестно"
    if request:
        # First try CDN headers
        country = request.headers.get("CF-IPCountry", "")
        city = request.headers.get("CF-IPCity", "")
        
        # If no CDN headers, use IP geolocation
        if not country or country == "Unknown":
            client_ip = get_client_ip(request)
            geo = await get_geo_from_ip(client_ip)
            country = geo["country"]
            city = geo["city"]
    
    # Track QR scan as a share
    share = {
        "id": str(uuid.uuid4()),
        "page_id": page_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "qr",
        "country": country,
        "city": city
    }
    await db.shares.insert_one(share)
    
    # Increment QR scan count
    await db.pages.update_one({"id": page_id}, {"$inc": {"qr_scans": 1}})
    
    # Redirect to public page
    return RedirectResponse(url=f"/{page['slug']}", status_code=302)

# ===================== ANALYTICS ROUTES =====================

@api_router.get("/analytics/{page_id}")
async def get_page_analytics(page_id: str, user: dict = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    links = await db.links.find({"page_id": page_id}, {"_id": 0}).to_list(100)
    
    total_clicks = sum(link.get("clicks", 0) for link in links)
    clicks_by_platform = {link["platform"]: link.get("clicks", 0) for link in links}
    
    # Check if user has advanced analytics access
    plan_config = await get_plan_config(user.get("plan", "free"))
    has_advanced = plan_config.get("has_advanced_analytics", False)
    
    by_country = []
    by_city = []
    
    # Only fetch detailed geo data for PRO users
    if has_advanced:
        # Get clicks by country for this page
        clicks_cursor = db.clicks.aggregate([
            {"$match": {"page_id": page_id}},
            {"$group": {"_id": "$country", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ])
        async for doc in clicks_cursor:
            by_country.append({"country": doc["_id"] or "Неизвестно", "clicks": doc["count"]})
        
        # Get clicks by city for this page
        city_cursor = db.clicks.aggregate([
            {"$match": {"page_id": page_id}},
            {"$group": {"_id": "$city", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ])
        async for doc in city_cursor:
            by_city.append({"city": doc["_id"] or "Неизвестно", "clicks": doc["count"]})
    
    return {
        "page_id": page_id,
        "views": page.get("views", 0),
        "total_clicks": total_clicks,
        "clicks_by_platform": clicks_by_platform,
        "links": links,
        "shares": page.get("shares", 0),
        "qr_scans": page.get("qr_scans", 0),
        "by_country": by_country,
        "by_city": by_city,
        "has_advanced_analytics": has_advanced
    }

# Global analytics for all user pages
@api_router.get("/analytics/global/summary")
async def get_global_analytics(user: dict = Depends(get_current_user)):
    # Check if user has advanced analytics access
    plan_config = await get_plan_config(user.get("plan", "free"))
    has_advanced = plan_config.get("has_advanced_analytics", False)
    
    # Get all user pages
    pages = await db.pages.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    page_ids = [p["id"] for p in pages]
    
    if not page_ids:
        return {
            "total_views": 0,
            "total_clicks": 0,
            "total_shares": 0,
            "total_qr_scans": 0,
            "by_country": [],
            "by_city": [],
            "timeline": [],
            "pages": [],
            "has_advanced_analytics": has_advanced
        }
    
    # Aggregate stats from pages
    total_views = sum(p.get("views", 0) for p in pages)
    total_shares = sum(p.get("shares", 0) for p in pages)
    total_qr_scans = sum(p.get("qr_scans", 0) for p in pages)
    
    # Get all links for these pages
    links = await db.links.find({"page_id": {"$in": page_ids}}, {"_id": 0}).to_list(1000)
    total_clicks = sum(link.get("clicks", 0) for link in links)
    
    by_country = []
    by_city = []
    
    # Only fetch detailed geo data for PRO users
    if has_advanced:
        # Get clicks by country
        clicks_cursor = db.clicks.aggregate([
            {"$match": {"page_id": {"$in": page_ids}}},
            {"$group": {"_id": "$country", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ])
        async for doc in clicks_cursor:
            by_country.append({"country": doc["_id"] or "Неизвестно", "clicks": doc["count"]})
        
        # Get clicks by city
        city_cursor = db.clicks.aggregate([
            {"$match": {"page_id": {"$in": page_ids}}},
            {"$group": {"_id": "$city", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ])
        async for doc in city_cursor:
            by_city.append({"city": doc["_id"] or "Неизвестно", "clicks": doc["count"]})
    
    # Get timeline (last 30 days) - available for all
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    timeline_cursor = db.clicks.aggregate([
        {"$match": {"page_id": {"$in": page_ids}, "timestamp": {"$gte": thirty_days_ago}}},
        {"$addFields": {"date": {"$substr": ["$timestamp", 0, 10]}}},
        {"$group": {"_id": "$date", "clicks": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ])
    timeline = []
    async for doc in timeline_cursor:
        timeline.append({"date": doc["_id"], "clicks": doc["clicks"]})
    
    # Get shares timeline
    shares_cursor = db.shares.aggregate([
        {"$match": {"page_id": {"$in": page_ids}, "timestamp": {"$gte": thirty_days_ago}}},
        {"$addFields": {"date": {"$substr": ["$timestamp", 0, 10]}}},
        {"$group": {"_id": "$date", "shares": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ])
    shares_timeline = {}
    async for doc in shares_cursor:
        shares_timeline[doc["_id"]] = doc["shares"]
    
    # Merge timeline
    for item in timeline:
        item["shares"] = shares_timeline.get(item["date"], 0)
    
    # Get shares by type
    shares_by_type_cursor = db.shares.aggregate([
        {"$match": {"page_id": {"$in": page_ids}}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}}
    ])
    shares_by_type = {}
    async for doc in shares_by_type_cursor:
        shares_by_type[doc["_id"] or "link"] = doc["count"]
    
    # Page stats (only for PRO)
    page_stats = []
    if has_advanced:
        for p in pages:
            page_links = [l for l in links if l["page_id"] == p["id"]]
            page_clicks = sum(l.get("clicks", 0) for l in page_links)
            page_stats.append({
                "id": p["id"],
                "title": p["title"],
                "slug": p["slug"],
                "views": p.get("views", 0),
                "clicks": page_clicks,
                "shares": p.get("shares", 0),
                "qr_scans": p.get("qr_scans", 0)
            })
    
    return {
        "total_views": total_views,
        "total_clicks": total_clicks,
        "total_shares": total_shares,
        "total_qr_scans": total_qr_scans,
        "shares_by_type": shares_by_type,
        "by_country": by_country,
        "by_city": by_city,
        "timeline": timeline,
        "pages": page_stats,
        "has_advanced_analytics": has_advanced
    }

# ===================== ADMIN ROUTES =====================

@api_router.get("/admin/users")
async def admin_get_users(admin_user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    # Get page counts for each user
    for user in users:
        page_count = await db.pages.count_documents({"user_id": user["id"]})
        user["page_count"] = page_count
    
    return users

@api_router.get("/admin/pages")
async def admin_get_pages(admin_user: dict = Depends(get_admin_user)):
    pages = await db.pages.find({}, {"_id": 0}).to_list(1000)
    
    # Get user info and clicks for each page
    for page in pages:
        user = await db.users.find_one({"id": page["user_id"]}, {"_id": 0, "password_hash": 0})
        page["user"] = user
        
        links = await db.links.find({"page_id": page["id"]}, {"_id": 0}).to_list(100)
        page["total_clicks"] = sum(link.get("clicks", 0) for link in links)
    
    return pages

@api_router.put("/admin/users/{user_id}/block")
async def admin_block_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = "blocked" if user["status"] == "active" else "active"
    await db.users.update_one({"id": user_id}, {"$set": {"status": new_status}})
    
    return {"message": f"User {new_status}", "status": new_status}

@api_router.put("/admin/pages/{page_id}/disable")
async def admin_disable_page(page_id: str, admin_user: dict = Depends(get_admin_user)):
    page = await db.pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    new_status = "disabled" if page["status"] == "active" else "active"
    await db.pages.update_one({"id": page_id}, {"$set": {"status": new_status}})
    
    return {"message": f"Page {new_status}", "status": new_status}

# Admin verification management
@api_router.get("/admin/verification/requests")
async def admin_get_verification_requests(admin_user: dict = Depends(get_admin_user)):
    """Get all verification requests"""
    requests = await db.verification_requests.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests

@api_router.put("/admin/verification/{user_id}/approve")
async def admin_approve_verification(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Approve verification request"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "verified": True,
            "verification_status": "approved"
        }}
    )
    
    # Update request
    await db.verification_requests.update_one(
        {"user_id": user_id, "status": "pending"},
        {"$set": {
            "status": "approved",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": admin_user["id"]
        }}
    )
    
    # Create notification
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "verification_approved",
        "title": "Верификация одобрена",
        "message": "Поздравляем! Ваша заявка на верификацию одобрена. Теперь рядом с вашим именем будет отображаться галочка.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {"message": "Верификация одобрена"}

@api_router.put("/admin/verification/{user_id}/reject")
async def admin_reject_verification(user_id: str, reason: str = "", admin_user: dict = Depends(get_admin_user)):
    """Reject verification request"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"verification_status": "rejected"}}
    )
    
    # Update request
    await db.verification_requests.update_one(
        {"user_id": user_id, "status": "pending"},
        {"$set": {
            "status": "rejected",
            "rejection_reason": reason,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": admin_user["id"]
        }}
    )
    
    # Create notification
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "verification_rejected",
        "title": "Верификация отклонена",
        "message": f"К сожалению, ваша заявка на верификацию отклонена.{' Причина: ' + reason if reason else ''} Вы можете подать новую заявку.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {"message": "Верификация отклонена"}

@api_router.put("/admin/verification/{user_id}/grant")
async def admin_grant_verification(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Grant verification directly to user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("verified"):
        raise HTTPException(status_code=400, detail="User already verified")
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "verified": True,
            "verification_status": "approved"
        }}
    )
    
    # Create notification
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "verification_granted",
        "title": "Верификация получена",
        "message": "Администратор выдал вам верификацию. Теперь рядом с вашим именем будет отображаться галочка.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {"message": "Верификация выдана"}

@api_router.put("/admin/verification/{user_id}/revoke")
async def admin_revoke_verification(user_id: str, admin_user: dict = Depends(get_admin_user)):
    """Revoke verification from user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "verified": False,
            "verification_status": "none"
        }}
    )
    
    # Create notification
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "verification_revoked",
        "title": "Верификация отозвана",
        "message": "Ваша верификация была отозвана администратором.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {"message": "Верификация отозвана"}

# Admin global analytics - all users
@api_router.get("/admin/analytics/global")
async def admin_global_analytics(admin_user: dict = Depends(get_admin_user)):
    """Global analytics for all users - admin only"""
    
    # Get all pages
    pages = await db.pages.find({}, {"_id": 0}).to_list(10000)
    page_ids = [p["id"] for p in pages]
    
    # Get all links
    links = await db.links.find({}, {"_id": 0}).to_list(10000)
    
    # Calculate totals
    total_views = sum(p.get("views", 0) for p in pages)
    total_clicks = sum(l.get("clicks", 0) for l in links)
    total_shares = sum(p.get("shares", 0) for p in pages)
    total_qr_scans = sum(p.get("qr_scans", 0) for p in pages)
    
    # Get clicks by country
    by_country = []
    if page_ids:
        clicks_cursor = db.clicks.aggregate([
            {"$group": {"_id": "$country", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ])
        async for doc in clicks_cursor:
            by_country.append({"country": doc["_id"] or "Неизвестно", "clicks": doc["count"]})
    
    # Get clicks by city
    by_city = []
    if page_ids:
        city_cursor = db.clicks.aggregate([
            {"$group": {"_id": "$city", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ])
        async for doc in city_cursor:
            by_city.append({"city": doc["_id"] or "Неизвестно", "clicks": doc["count"]})
    
    # Timeline (last 30 days)
    timeline = []
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    timeline_cursor = db.clicks.aggregate([
        {"$match": {"timestamp": {"$gte": thirty_days_ago}}},
        {"$addFields": {"date": {"$substr": ["$timestamp", 0, 10]}}},
        {"$group": {"_id": "$date", "clicks": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ])
    async for doc in timeline_cursor:
        timeline.append({"date": doc["_id"], "clicks": doc["clicks"]})
    
    # Shares timeline
    shares_cursor = db.shares.aggregate([
        {"$match": {"timestamp": {"$gte": thirty_days_ago}}},
        {"$addFields": {"date": {"$substr": ["$timestamp", 0, 10]}}},
        {"$group": {"_id": "$date", "shares": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ])
    shares_timeline = {}
    async for doc in shares_cursor:
        shares_timeline[doc["_id"]] = doc["shares"]
    
    for item in timeline:
        item["shares"] = shares_timeline.get(item["date"], 0)
    
    # Top pages by views
    top_pages = sorted(pages, key=lambda x: x.get("views", 0), reverse=True)[:10]
    top_pages_data = []
    for p in top_pages:
        page_links = [l for l in links if l["page_id"] == p["id"]]
        page_clicks = sum(l.get("clicks", 0) for l in page_links)
        user = await db.users.find_one({"id": p["user_id"]}, {"_id": 0, "username": 1})
        top_pages_data.append({
            "id": p["id"],
            "title": p["title"],
            "slug": p["slug"],
            "views": p.get("views", 0),
            "clicks": page_clicks,
            "shares": p.get("shares", 0),
            "username": user.get("username", "Unknown") if user else "Unknown"
        })
    
    # Shares by type
    shares_by_type = {}
    type_cursor = db.shares.aggregate([
        {"$group": {"_id": "$type", "count": {"$sum": 1}}}
    ])
    async for doc in type_cursor:
        shares_by_type[doc["_id"] or "link"] = doc["count"]
    
    # Users count
    users_count = await db.users.count_documents({})
    
    return {
        "total_views": total_views,
        "total_clicks": total_clicks,
        "total_shares": total_shares,
        "total_qr_scans": total_qr_scans,
        "total_pages": len(pages),
        "total_users": users_count,
        "shares_by_type": shares_by_type,
        "by_country": by_country,
        "by_city": by_city,
        "timeline": timeline,
        "top_pages": top_pages_data
    }

# VPS Resource Monitoring - admin only
@api_router.get("/admin/system/metrics")
async def admin_system_metrics(admin_user: dict = Depends(get_admin_user)):
    """Get VPS system metrics - admin only"""
    import psutil
    
    # CPU usage
    cpu_percent = psutil.cpu_percent(interval=0.5)
    cpu_count = psutil.cpu_count()
    
    # Memory usage
    memory = psutil.virtual_memory()
    memory_total = memory.total / (1024 ** 3)  # GB
    memory_used = memory.used / (1024 ** 3)  # GB
    memory_percent = memory.percent
    
    # Disk usage
    disk = psutil.disk_usage('/')
    disk_total = disk.total / (1024 ** 3)  # GB
    disk_used = disk.used / (1024 ** 3)  # GB
    disk_percent = disk.percent
    
    # Network I/O
    net_io = psutil.net_io_counters()
    bytes_sent = net_io.bytes_sent / (1024 ** 2)  # MB
    bytes_recv = net_io.bytes_recv / (1024 ** 2)  # MB
    
    # Uptime
    boot_time = datetime.fromtimestamp(psutil.boot_time())
    uptime = datetime.now() - boot_time
    uptime_str = f"{uptime.days}д {uptime.seconds // 3600}ч {(uptime.seconds % 3600) // 60}м"
    
    # Load average (Linux only)
    try:
        load_avg = psutil.getloadavg()
        load_1, load_5, load_15 = load_avg
    except:
        load_1, load_5, load_15 = 0, 0, 0
    
    return {
        "cpu": {
            "percent": cpu_percent,
            "count": cpu_count,
            "load_1m": round(load_1, 2),
            "load_5m": round(load_5, 2),
            "load_15m": round(load_15, 2)
        },
        "memory": {
            "total_gb": round(memory_total, 2),
            "used_gb": round(memory_used, 2),
            "percent": memory_percent
        },
        "disk": {
            "total_gb": round(disk_total, 2),
            "used_gb": round(disk_used, 2),
            "percent": disk_percent
        },
        "network": {
            "sent_mb": round(bytes_sent, 2),
            "recv_mb": round(bytes_recv, 2)
        },
        "uptime": uptime_str,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# VPS Metrics History - store and retrieve historical data
@api_router.get("/admin/system/metrics/history")
async def admin_system_metrics_history(admin_user: dict = Depends(get_admin_user), hours: int = 24):
    """Get historical VPS metrics - admin only"""
    
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    
    metrics = await db.system_metrics.find(
        {"timestamp": {"$gte": since}},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    return metrics

# ===================== RBAC MANAGEMENT API =====================

# --- Plan Config Management (Owner/Admin only) ---

@api_router.get("/admin/plan-configs")
async def get_all_plan_configs(user: dict = Depends(get_admin_user)):
    """Get all plan configurations"""
    configs = await db.plan_configs.find({}, {"_id": 0}).to_list(100)
    
    # If no configs in DB, return defaults
    if not configs:
        return list(DEFAULT_PLAN_CONFIGS.values())
    
    return configs

@api_router.get("/admin/plan-configs/{plan_name}")
async def get_plan_config_by_name(plan_name: str, user: dict = Depends(get_admin_user)):
    """Get specific plan configuration"""
    config = await db.plan_configs.find_one({"plan_name": plan_name}, {"_id": 0})
    if not config:
        config = DEFAULT_PLAN_CONFIGS.get(plan_name)
        if not config:
            raise HTTPException(status_code=404, detail="Plan not found")
    return config

@api_router.put("/admin/plan-configs/{plan_name}")
async def update_plan_config(plan_name: str, data: PlanConfigUpdate, user: dict = Depends(get_admin_user)):
    """Update plan configuration - changes apply to all users on this plan"""
    # Check if user has permission (owner or admin)
    if not has_role_permission(user.get("role", "user"), "admin"):
        raise HTTPException(status_code=403, detail="Требуется роль админа или владельца")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Upsert the config
    result = await db.plan_configs.update_one(
        {"plan_name": plan_name},
        {"$set": {**update_data, "plan_name": plan_name, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    config = await db.plan_configs.find_one({"plan_name": plan_name}, {"_id": 0})
    logging.info(f"Plan config updated: {plan_name} by {user['email']}")
    
    return config

@api_router.post("/admin/plan-configs")
async def create_plan_config(data: PlanConfigCreate, user: dict = Depends(get_admin_user)):
    """Create new plan configuration"""
    if not has_role_permission(user.get("role", "user"), "admin"):
        raise HTTPException(status_code=403, detail="Требуется роль админа или владельца")
    
    existing = await db.plan_configs.find_one({"plan_name": data.plan_name})
    if existing:
        raise HTTPException(status_code=400, detail="План с таким именем уже существует")
    
    config = {
        **data.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.plan_configs.insert_one(config)
    
    return {k: v for k, v in config.items() if k != "_id"}

# --- User Management (Admin panel) ---

@api_router.get("/admin/users/list")
async def admin_list_users(
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    plan: Optional[str] = None,
    is_banned: Optional[bool] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_admin_user)
):
    """List users with filters - for admin panel"""
    query = {}
    
    if role:
        query["role"] = role
    if plan:
        query["plan"] = plan
    if is_banned is not None:
        query["is_banned"] = is_banned
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    # Add page count for each user
    for u in users:
        u["page_count"] = await db.pages.count_documents({"user_id": u["id"]})
    
    return {
        "users": users,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@api_router.put("/admin/users/{user_id}/role")
async def admin_update_user_role(user_id: str, data: UserRoleUpdate, user: dict = Depends(get_owner_user)):
    """Update user role - OWNER ONLY"""
    if data.role not in ROLE_HIERARCHY:
        raise HTTPException(status_code=400, detail=f"Invalid role. Valid roles: {list(ROLE_HIERARCHY.keys())}")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot change owner's role
    if target_user.get("role") == "owner" and user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Нельзя изменить роль владельца")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": data.role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logging.info(f"User role changed: {user_id} -> {data.role} by {user['email']}")
    
    return {"success": True, "user_id": user_id, "new_role": data.role}

@api_router.put("/admin/users/{user_id}/plan")
async def admin_update_user_plan(user_id: str, data: UserPlanUpdate, user: dict = Depends(get_admin_user)):
    """Update user plan - Admin/Owner"""
    if data.plan not in ["free", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid plan. Valid plans: free, pro")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"plan": data.plan, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logging.info(f"User plan changed: {user_id} -> {data.plan} by {user['email']}")
    
    return {"success": True, "user_id": user_id, "new_plan": data.plan}

@api_router.put("/owner/my-plan")
async def owner_update_own_plan(data: UserPlanUpdate, user: dict = Depends(get_owner_user)):
    """Owner can change their own plan for testing purposes"""
    if data.plan not in ["free", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid plan. Valid plans: free, pro")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"plan": data.plan, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logging.info(f"Owner changed own plan to {data.plan} for testing")
    
    return {"success": True, "new_plan": data.plan}

@api_router.put("/admin/users/{user_id}/ban")
async def admin_ban_user(user_id: str, data: UserBanUpdate, user: dict = Depends(get_admin_user)):
    """Ban/unban user - Admin/Moderator"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot ban owner or admin (unless you're owner)
    target_role = target_user.get("role", "user")
    if target_role in ["owner", "admin"] and user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Нельзя заблокировать администратора")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_banned": data.is_banned,
            "status": "blocked" if data.is_banned else "active",
            "banned_at": datetime.now(timezone.utc).isoformat() if data.is_banned else None,
            "banned_by": user["id"] if data.is_banned else None
        }}
    )
    
    action = "забанен" if data.is_banned else "разбанен"
    logging.info(f"User {action}: {user_id} by {user['email']}")
    
    return {"success": True, "user_id": user_id, "is_banned": data.is_banned}

@api_router.put("/admin/users/{user_id}/verify")
async def admin_verify_user(user_id: str, data: UserVerifyUpdate, user: dict = Depends(get_admin_user)):
    """Set verified badge - Admin/Moderator"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_verified": data.is_verified,
            "verified": data.is_verified,
            "verification_status": "approved" if data.is_verified else "none",
            "verified_at": datetime.now(timezone.utc).isoformat() if data.is_verified else None,
            "verified_by": user["id"] if data.is_verified else None
        }}
    )
    
    action = "верифицирован" if data.is_verified else "снята верификация"
    logging.info(f"User {action}: {user_id} by {user['email']}")
    
    return {"success": True, "user_id": user_id, "is_verified": data.is_verified}

@api_router.get("/admin/users/{user_id}")
async def admin_get_user(user_id: str, user: dict = Depends(get_admin_user)):
    """Get user details - Admin panel"""
    target_user = await db.users.find_one(
        {"id": user_id}, 
        {"_id": 0, "password_hash": 0, "reset_token": 0, "reset_token_expiry": 0}
    )
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add page count
    target_user["page_count"] = await db.pages.count_documents({"user_id": user_id})
    target_user["total_clicks"] = 0
    
    # Get total clicks across all user's pages
    pages = await db.pages.find({"user_id": user_id}, {"id": 1}).to_list(100)
    if pages:
        page_ids = [p["id"] for p in pages]
        target_user["total_clicks"] = await db.clicks.count_documents({"page_id": {"$in": page_ids}})
    
    # Log admin view action
    await log_admin_action(user["id"], "ADMIN_VIEW_USER_PROFILE", {"target_user_id": user_id})
    
    return target_user

@api_router.get("/admin/users/{user_id}/pages")
async def admin_get_user_pages(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    admin_user: dict = Depends(get_admin_user)
):
    """Get all pages created by a user - Admin/Moderator panel"""
    # Verify target user exists
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "username": 1})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's pages with stats
    pages_cursor = db.pages.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    pages = await pages_cursor.to_list(limit)
    total = await db.pages.count_documents({"user_id": user_id})
    
    # Add click count for each page
    for page in pages:
        page["total_clicks"] = await db.clicks.count_documents({"page_id": page["id"]})
        # Get last 7 days clicks
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        page["clicks_7d"] = await db.clicks.count_documents({
            "page_id": page["id"],
            "timestamp": {"$gte": seven_days_ago.isoformat()}
        })
    
    # Log admin view action
    await log_admin_action(admin_user["id"], "ADMIN_VIEW_USER_PAGES", {
        "target_user_id": user_id,
        "pages_count": len(pages)
    })
    
    return {
        "pages": pages,
        "total": total,
        "skip": skip,
        "limit": limit,
        "user": target_user
    }

# ===================== AUDIT LOG HELPER =====================

async def log_admin_action(admin_id: str, event: str, details: dict = None):
    """Log admin actions for audit trail"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "event": event,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": None  # Can be populated from request if needed
    }
    await db.audit_logs.insert_one(log_entry)
    logging.info(f"AUDIT: {event} by admin {admin_id} - {details}")

@api_router.get("/admin/audit-logs")
async def admin_get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    event: Optional[str] = None,
    admin_id: Optional[str] = None,
    user: dict = Depends(get_admin_user)
):
    """Get audit logs - Admin panel"""
    # Only owner and admin can view audit logs
    if not has_role_permission(user.get("role", "user"), "admin"):
        raise HTTPException(status_code=403, detail="Only admin/owner can view audit logs")
    
    query = {}
    if event:
        query["event"] = event
    if admin_id:
        query["admin_id"] = admin_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.audit_logs.count_documents(query)
    
    # Enrich with admin info
    for log in logs:
        admin = await db.users.find_one({"id": log["admin_id"]}, {"_id": 0, "email": 1, "username": 1})
        log["admin_email"] = admin.get("email") if admin else "Unknown"
        log["admin_username"] = admin.get("username") if admin else "Unknown"
    
    return {
        "logs": logs,
        "total": total,
        "skip": skip,
        "limit": limit
    }

# --- Access Check API ---

@api_router.get("/check-access/{requirement}")
async def api_check_access(requirement: str, value: Optional[int] = None, user: dict = Depends(get_current_user)):
    """Check if current user has access to a feature"""
    has_access = await check_access(user, requirement, value)
    
    # Get plan config for additional info
    plan_config = await get_plan_config(user.get("plan", "free"))
    
    return {
        "has_access": has_access,
        "requirement": requirement,
        "user_plan": user.get("plan", "free"),
        "user_role": user.get("role", "user"),
        "launch_mode": LAUNCH_MODE,
        "plan_config": plan_config
    }

# ===================== SUBDOMAIN MANAGEMENT API =====================

# Reserved subdomains that cannot be used
RESERVED_SUBDOMAINS = {"www", "api", "admin", "app", "mail", "ftp", "smtp", "pop", "imap", "cdn", "static", "assets", "beta", "dev", "test", "staging", "preview"}

@api_router.get("/subdomains")
async def get_user_subdomains(user: dict = Depends(get_current_user)):
    """Get all subdomains for current user"""
    subdomains = await db.subdomains.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    # Get plan limits
    plan_config = await get_plan_config(user.get("plan", "free"))
    max_limit = plan_config.get("max_subdomains_limit", 1)
    
    return {
        "subdomains": subdomains,
        "count": len(subdomains),
        "max_limit": max_limit,
        "can_add": max_limit == -1 or len(subdomains) < max_limit
    }

@api_router.get("/subdomains/check/{subdomain}")
async def check_subdomain_availability(subdomain: str, user: dict = Depends(get_current_user)):
    """Check if subdomain is available"""
    subdomain = subdomain.lower().strip()
    
    # Check reserved
    if subdomain in RESERVED_SUBDOMAINS:
        return {"available": False, "reason": "Зарезервировано системой"}
    
    # Check format
    if len(subdomain) < 3:
        return {"available": False, "reason": "Минимум 3 символа"}
    if len(subdomain) > 32:
        return {"available": False, "reason": "Максимум 32 символа"}
    if not subdomain.replace("-", "").isalnum():
        return {"available": False, "reason": "Только буквы, цифры и дефисы"}
    if subdomain.startswith("-") or subdomain.endswith("-"):
        return {"available": False, "reason": "Не может начинаться/заканчиваться дефисом"}
    
    # Check if exists
    existing = await db.subdomains.find_one({"subdomain": subdomain})
    if existing:
        return {"available": False, "reason": "Уже занят"}
    
    return {"available": True, "reason": None}

@api_router.post("/subdomains")
async def create_subdomain(data: SubdomainCreate, user: dict = Depends(get_current_user)):
    """Create a new subdomain"""
    subdomain = data.subdomain.lower().strip()
    
    # Check reserved
    if subdomain in RESERVED_SUBDOMAINS:
        raise HTTPException(status_code=400, detail="Этот поддомен зарезервирован системой")
    
    # Check if exists
    existing = await db.subdomains.find_one({"subdomain": subdomain})
    if existing:
        raise HTTPException(status_code=400, detail="Этот поддомен уже занят")
    
    # Check plan limits
    plan_config = await get_plan_config(user.get("plan", "free"))
    max_limit = plan_config.get("max_subdomains_limit", 1)
    current_count = await db.subdomains.count_documents({"user_id": user["id"]})
    
    if max_limit != -1 and current_count >= max_limit:
        raise HTTPException(
            status_code=403, 
            detail="Лимит достигнут, перейдите на PRO-подписку."
        )
    
    # Create subdomain
    subdomain_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "subdomain": subdomain,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subdomains.insert_one(subdomain_doc)
    
    logging.info(f"Subdomain created: {subdomain} by {user['email']}")
    
    return {k: v for k, v in subdomain_doc.items() if k != "_id"}

@api_router.put("/subdomains/{subdomain_id}")
async def update_subdomain(subdomain_id: str, data: SubdomainUpdate, user: dict = Depends(get_current_user)):
    """Update subdomain (toggle active status)"""
    subdomain = await db.subdomains.find_one({"id": subdomain_id, "user_id": user["id"]})
    if not subdomain:
        raise HTTPException(status_code=404, detail="Поддомен не найден")
    
    await db.subdomains.update_one(
        {"id": subdomain_id},
        {"$set": {"is_active": data.is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "is_active": data.is_active}

@api_router.delete("/subdomains/{subdomain_id}")
async def delete_subdomain(subdomain_id: str, user: dict = Depends(get_current_user)):
    """Delete a subdomain"""
    subdomain = await db.subdomains.find_one({"id": subdomain_id, "user_id": user["id"]})
    if not subdomain:
        raise HTTPException(status_code=404, detail="Поддомен не найден")
    
    await db.subdomains.delete_one({"id": subdomain_id})
    
    logging.info(f"Subdomain deleted: {subdomain['subdomain']} by {user['email']}")
    
    return {"success": True}

# --- Admin Subdomain Management ---

@api_router.get("/admin/subdomains")
async def admin_list_subdomains(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    user: dict = Depends(get_admin_user)
):
    """List all subdomains in system - Admin only"""
    query = {}
    if search:
        query["subdomain"] = {"$regex": search, "$options": "i"}
    
    subdomains = await db.subdomains.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.subdomains.count_documents(query)
    
    # Add user info for each subdomain
    for sub in subdomains:
        owner = await db.users.find_one({"id": sub["user_id"]}, {"_id": 0, "username": 1, "email": 1})
        sub["owner"] = owner
    
    return {
        "subdomains": subdomains,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@api_router.put("/admin/subdomains/{subdomain_id}/toggle")
async def admin_toggle_subdomain(subdomain_id: str, data: SubdomainUpdate, user: dict = Depends(get_admin_user)):
    """Force toggle subdomain status - Admin only"""
    subdomain = await db.subdomains.find_one({"id": subdomain_id})
    if not subdomain:
        raise HTTPException(status_code=404, detail="Поддомен не найден")
    
    await db.subdomains.update_one(
        {"id": subdomain_id},
        {"$set": {
            "is_active": data.is_active, 
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "disabled_by_admin": not data.is_active,
            "disabled_by": user["id"] if not data.is_active else None
        }}
    )
    
    action = "включен" if data.is_active else "выключен"
    logging.info(f"Subdomain {action} by admin: {subdomain['subdomain']} by {user['email']}")
    
    return {"success": True, "is_active": data.is_active}

@api_router.delete("/admin/subdomains/{subdomain_id}")
async def admin_delete_subdomain(subdomain_id: str, user: dict = Depends(get_admin_user)):
    """Force delete subdomain - Admin only"""
    subdomain = await db.subdomains.find_one({"id": subdomain_id})
    if not subdomain:
        raise HTTPException(status_code=404, detail="Поддомен не найден")
    
    await db.subdomains.delete_one({"id": subdomain_id})
    
    logging.info(f"Subdomain force deleted: {subdomain['subdomain']} by {user['email']}")
    
    return {"success": True}

# --- Waitlist Admin API ---

@api_router.get("/admin/waitlist")
async def admin_get_waitlist(user: dict = Depends(get_admin_user)):
    """Get all waitlist emails - Admin only"""
    emails = await db.waitlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"emails": emails, "total": len(emails)}

@api_router.delete("/admin/waitlist/{email_id}")
async def admin_delete_waitlist_email(email_id: str, user: dict = Depends(get_admin_user)):
    """Delete waitlist email - Admin only"""
    result = await db.waitlist.delete_one({"id": email_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"success": True}

# --- Subdomain Resolution API ---

@api_router.get("/resolve/{subdomain}")
async def resolve_subdomain(subdomain: str):
    """Resolve subdomain to user - for middleware"""
    subdomain = subdomain.lower().strip()
    
    subdomain_doc = await db.subdomains.find_one({"subdomain": subdomain}, {"_id": 0})
    if not subdomain_doc:
        raise HTTPException(status_code=404, detail="Subdomain not found")
    
    if not subdomain_doc.get("is_active", True):
        raise HTTPException(status_code=410, detail="Домен неактивен")
    
    # Get user info
    user = await db.users.find_one({"id": subdomain_doc["user_id"]}, {"_id": 0, "id": 1, "username": 1, "is_banned": 1})
    if not user or user.get("is_banned"):
        raise HTTPException(status_code=410, detail="Домен неактивен")
    
    return {
        "subdomain": subdomain_doc,
        "user_id": subdomain_doc["user_id"],
        "username": user.get("username")
    }

@api_router.get("/resolve/{subdomain}/page/{path}")
async def resolve_subdomain_page(subdomain: str, path: str):
    """Resolve subdomain + path to a specific page"""
    subdomain = subdomain.lower().strip()
    
    # Check subdomain
    subdomain_doc = await db.subdomains.find_one({"subdomain": subdomain}, {"_id": 0})
    if not subdomain_doc:
        raise HTTPException(status_code=404, detail="Subdomain not found")
    
    if not subdomain_doc.get("is_active", True):
        raise HTTPException(status_code=410, detail="Домен неактивен")
    
    # Check user
    user = await db.users.find_one({"id": subdomain_doc["user_id"]}, {"_id": 0})
    if not user or user.get("is_banned"):
        raise HTTPException(status_code=410, detail="Домен неактивен")
    
    # Find page by slug belonging to this user
    page = await db.pages.find_one(
        {"slug": path, "user_id": subdomain_doc["user_id"], "status": "active"},
        {"_id": 0}
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Increment view count
    await db.pages.update_one({"id": page["id"]}, {"$inc": {"views": 1}})
    
    # Get links
    links = await db.links.find({"page_id": page["id"], "active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    page["links"] = links
    
    # Get plan config for branding
    plan_config = await get_plan_config(user.get("plan", "free"))
    page["can_remove_branding"] = plan_config.get("can_remove_branding", False)
    page["user_verified"] = user.get("verified", False) and user.get("show_verification_badge", True)
    
    return page

# --- Subdomain Page Endpoint (for direct subdomain access) ---

@api_router.get("/subdomain-page")
async def get_subdomain_page(request: Request, slug: Optional[str] = None):
    """
    Get page data when accessing via subdomain.
    Uses subdomain from request state (set by middleware).
    If no slug provided, returns list of user's pages.
    """
    subdomain = getattr(request.state, 'subdomain', '') or request.headers.get('x-subdomain', '').lower().strip()
    
    if not subdomain:
        raise HTTPException(status_code=400, detail="Поддомен не указан")
    
    # Resolve subdomain
    subdomain_doc = await db.subdomains.find_one({"subdomain": subdomain}, {"_id": 0})
    if not subdomain_doc:
        raise HTTPException(status_code=404, detail="Поддомен не найден")
    
    if not subdomain_doc.get("is_active", True) or subdomain_doc.get("disabled_by_admin", False):
        raise HTTPException(status_code=410, detail="Домен неактивен")
    
    # Check user
    user = await db.users.find_one({"id": subdomain_doc["user_id"]}, {"_id": 0})
    if not user or user.get("is_banned"):
        raise HTTPException(status_code=410, detail="Домен неактивен")
    
    # If no slug, return user info and page list
    if not slug:
        pages = await db.pages.find(
            {"user_id": subdomain_doc["user_id"], "status": "active"},
            {"_id": 0, "id": 1, "title": 1, "slug": 1, "cover_image": 1, "artist_name": 1, "release_title": 1}
        ).to_list(100)
        
        return {
            "subdomain": subdomain,
            "username": user.get("username"),
            "artist_name": user.get("artist_name", ""),
            "profile_description": user.get("profile_description", ""),
            "pages": pages,
            "verified": user.get("verified", False) and user.get("show_verification_badge", True),
            "contact_email": user.get("contact_email", ""),
            "social_links": user.get("social_links", {})
        }
    
    # Find specific page by slug
    page = await db.pages.find_one(
        {"slug": slug, "user_id": subdomain_doc["user_id"], "status": "active"},
        {"_id": 0}
    )
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    
    # Increment view count
    await db.pages.update_one({"id": page["id"]}, {"$inc": {"views": 1}})
    
    # Get links
    links = await db.links.find({"page_id": page["id"], "active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    page["links"] = links
    
    # Get plan config for branding
    plan_config = await get_plan_config(user.get("plan", "free"))
    page["can_remove_branding"] = plan_config.get("can_remove_branding", False)
    page["user_verified"] = user.get("verified", False) and user.get("show_verification_badge", True)
    page["subdomain"] = subdomain
    page["owner_username"] = user.get("username")
    
    return page

@api_router.get("/my-limits")
async def get_my_limits(user: dict = Depends(get_current_user)):
    """Get current user's plan limits and usage"""
    plan_config = await get_plan_config(user.get("plan", "free"))
    page_count = await db.pages.count_documents({"user_id": user["id"]})
    
    return {
        "plan": user.get("plan", "free"),
        "role": user.get("role", "user"),
        "is_verified": user.get("is_verified", False),
        "launch_mode": LAUNCH_MODE,
        "limits": plan_config,
        "usage": {
            "pages_count": page_count,
            "pages_remaining": plan_config["max_pages_limit"] - page_count if plan_config["max_pages_limit"] != -1 else "unlimited"
        }
    }

# ===================== METADATA LOOKUP =====================

@api_router.get("/lookup/itunes")
async def lookup_itunes(id: Optional[str] = None, term: Optional[str] = None):
    """Proxy endpoint for iTunes API to avoid CORS issues"""
    try:
        async with httpx.AsyncClient() as client:
            if id:
                url = f"https://itunes.apple.com/lookup?id={id}"
            elif term:
                url = f"https://itunes.apple.com/search?term={term}&media=music&limit=1"
            else:
                raise HTTPException(status_code=400, detail="Provide id or term parameter")
            
            response = await client.get(url, timeout=10.0)
            data = response.json()
            
            if data.get("results") and len(data["results"]) > 0:
                result = data["results"][0]
                artwork = result.get("artworkUrl100") or result.get("artworkUrl60") or ""
                # Convert to high resolution
                if artwork:
                    artwork = artwork.replace("100x100bb", "600x600bb").replace("60x60bb", "600x600bb")
                
                return {
                    "artwork": artwork,
                    "trackName": result.get("trackName") or result.get("collectionName"),
                    "artistName": result.get("artistName"),
                    "collectionName": result.get("collectionName")
                }
            
            return {"artwork": "", "trackName": "", "artistName": "", "collectionName": ""}
    except Exception as e:
        logging.error(f"iTunes lookup error: {e}")
        return {"artwork": "", "trackName": "", "artistName": "", "collectionName": ""}

@api_router.get("/lookup/spotify")
async def lookup_spotify(url: str):
    """Proxy endpoint for Spotify oEmbed to avoid CORS issues"""
    try:
        async with httpx.AsyncClient() as client:
            oembed_url = f"https://open.spotify.com/oembed?url={url}"
            response = await client.get(oembed_url, timeout=10.0)
            data = response.json()
            
            return {
                "artwork": data.get("thumbnail_url", ""),
                "title": data.get("title", ""),
                "provider": "spotify"
            }
    except Exception as e:
        logging.error(f"Spotify lookup error: {e}")
        return {"artwork": "", "title": "", "provider": "spotify"}

@api_router.get("/lookup/odesli")
async def lookup_odesli(url: str, country: Optional[str] = "RU"):
    """Proxy endpoint for Odesli (song.link) API to get links for all platforms.
    Supports URLs and UPC codes (via iTunes lookup first)."""
    try:
        async with httpx.AsyncClient() as client:
            # Check if input is a UPC code (numeric, typically 12-14 digits)
            clean_input = url.strip()
            is_upc = clean_input.isdigit() and 10 <= len(clean_input) <= 14
            
            lookup_url = clean_input
            
            if is_upc:
                # For UPC codes, first search in iTunes to get a proper URL
                itunes_url = f"https://itunes.apple.com/lookup?upc={clean_input}&country={country}"
                itunes_response = await client.get(itunes_url, timeout=10.0)
                
                if itunes_response.status_code == 200:
                    itunes_data = itunes_response.json()
                    results = itunes_data.get("results", [])
                    
                    if results:
                        # Get the collection URL (album) or track URL
                        collection_url = results[0].get("collectionViewUrl") or results[0].get("trackViewUrl")
                        if collection_url:
                            lookup_url = collection_url
                            logging.info(f"UPC {clean_input} resolved to: {collection_url}")
                        else:
                            return {"error": "Релиз не найден по UPC коду", "links": {}}
                    else:
                        return {"error": "Релиз не найден по UPC коду", "links": {}}
                else:
                    return {"error": "Не удалось найти релиз по UPC", "links": {}}
            
            # Call Odesli API
            odesli_url = f"https://api.song.link/v1-alpha.1/links?url={lookup_url}&userCountry={country}"
            response = await client.get(odesli_url, timeout=15.0)
            
            if response.status_code != 200:
                logging.error(f"Odesli API error: {response.status_code}")
                return {"error": "Failed to fetch from Odesli", "links": {}}
            
            data = response.json()
            
            # Extract platform links
            links_by_platform = data.get("linksByPlatform", {})
            
            # Map ALL Odesli platform names to our platform IDs
            platform_mapping = {
                "spotify": "spotify",
                "itunes": "itunes",
                "appleMusic": "appleMusic",
                "youtube": "youtube",
                "youtubeMusic": "youtubeMusic",
                "google": "google",
                "googleStore": "googleStore",
                "pandora": "pandora",
                "deezer": "deezer",
                "tidal": "tidal",
                "amazonStore": "amazonStore",
                "amazonMusic": "amazonMusic",
                "soundcloud": "soundcloud",
                "napster": "napster",
                "yandex": "yandex",
                "spinrilla": "spinrilla",
                "audius": "audius",
                "anghami": "anghami",
                "boomplay": "boomplay",
                "audiomack": "audiomack",
            }
            
            result_links = {}
            for odesli_platform, link_info in links_by_platform.items():
                our_platform = platform_mapping.get(odesli_platform, odesli_platform)
                if link_info.get("url"):
                    # Don't overwrite if we already have this platform
                    if our_platform not in result_links:
                        result_links[our_platform] = link_info["url"]
            
            # Get entity info for metadata
            entity_unique_id = data.get("entityUniqueId", "")
            entities_by_unique_id = data.get("entitiesByUniqueId", {})
            entity_info = entities_by_unique_id.get(entity_unique_id, {})
            
            # Get artwork URL (prefer high resolution)
            artwork_url = ""
            thumbnail_url = entity_info.get("thumbnailUrl", "")
            if thumbnail_url:
                # Try to get higher resolution image
                artwork_url = thumbnail_url.replace("100x100", "600x600").replace("300x300", "600x600")
            
            return {
                "links": result_links,
                "pageUrl": data.get("pageUrl", ""),
                "title": entity_info.get("title", ""),
                "artistName": entity_info.get("artistName", ""),
                "thumbnailUrl": artwork_url or thumbnail_url
            }
    except Exception as e:
        logging.error(f"Odesli lookup error: {e}")
        return {"error": str(e), "links": {}}

# ===================== FILE UPLOAD =====================

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Save file
    content = await file.read()
    async with aiofiles.open(filepath, 'wb') as f:
        await f.write(content)
    
    # Generate blurred background
    bg_filename = f"{uuid.uuid4()}_blur.jpg"
    bg_filepath = UPLOAD_DIR / bg_filename
    generate_blurred_background(str(filepath), str(bg_filepath))
    
    return {
        "cover_url": f"/api/uploads/{filename}",
        "background_url": f"/api/uploads/{bg_filename}"
    }

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

# ===================== COVERS ROUTES =====================

class CoverUploadRequest(BaseModel):
    image: str  # Base64 encoded image
    filename: Optional[str] = None

@api_router.post("/covers/upload")
async def upload_cover(data: CoverUploadRequest, user: dict = Depends(get_current_user)):
    """Upload a cover image (Base64) and save to server"""
    try:
        # Decode base64 image
        if "," in data.image:
            # Remove data URL prefix (e.g., "data:image/png;base64,")
            image_data = data.image.split(",")[1]
        else:
            image_data = data.image
        
        import base64
        image_bytes = base64.b64decode(image_data)
        
        # Generate filename
        filename = data.filename or f"cover_{uuid.uuid4().hex}.png"
        if not filename.endswith(('.png', '.jpg', '.jpeg', '.webp')):
            filename += '.png'
        
        # Save to covers directory
        filepath = COVERS_DIR / filename
        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(image_bytes)
        
        # Get file size
        file_size = len(image_bytes)
        
        # Save to database
        cover_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "filename": filename,
            "path": f"/uploads/covers/{filename}",
            "size": file_size,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.covers.insert_one(cover_doc)
        
        return {
            "success": True,
            "cover": {
                "id": cover_doc["id"],
                "filename": filename,
                "path": cover_doc["path"],
                "size": file_size
            }
        }
    except Exception as e:
        logging.error(f"Cover upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки: {str(e)}")

@api_router.get("/covers")
async def get_user_covers(user: dict = Depends(get_current_user)):
    """Get all covers for current user"""
    covers = await db.covers.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"covers": covers}

@api_router.delete("/covers/{cover_id}")
async def delete_cover(cover_id: str, user: dict = Depends(get_current_user)):
    """Delete a cover"""
    cover = await db.covers.find_one({"id": cover_id, "user_id": user["id"]})
    if not cover:
        raise HTTPException(status_code=404, detail="Обложка не найдена")
    
    # Delete file
    filepath = COVERS_DIR / cover["filename"]
    if filepath.exists():
        filepath.unlink()
    
    # Delete from database
    await db.covers.delete_one({"id": cover_id})
    
    return {"success": True, "message": "Обложка удалена"}

@api_router.get("/uploads/covers/{filename}")
async def get_cover(filename: str):
    """Serve cover image"""
    filepath = COVERS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

# ===================== COVER PROJECTS ROUTES =====================

class CoverProjectSave(BaseModel):
    project_id: Optional[str] = None  # None for new project, ID for update
    project_name: str
    canvas_json: str  # JSON string of canvas state
    preview_image: Optional[str] = None  # Base64 encoded preview image

class CoverProjectResponse(BaseModel):
    id: str
    project_name: str
    canvas_json: str
    preview_url: Optional[str] = None
    created_at: str
    updated_at: str

@api_router.post("/projects/save")
async def save_cover_project(data: CoverProjectSave, user: dict = Depends(get_current_user)):
    """Save or update a cover project"""
    try:
        now = datetime.now(timezone.utc).isoformat()
        preview_url = None
        
        # Handle preview image if provided
        if data.preview_image:
            try:
                if "," in data.preview_image:
                    image_data = data.preview_image.split(",")[1]
                else:
                    image_data = data.preview_image
                
                image_bytes = base64.b64decode(image_data)
                preview_filename = f"preview_{uuid.uuid4().hex}.png"
                preview_path = COVERS_DIR / preview_filename
                
                async with aiofiles.open(preview_path, 'wb') as f:
                    await f.write(image_bytes)
                
                preview_url = f"/api/uploads/covers/{preview_filename}"
            except Exception as e:
                logging.warning(f"Failed to save preview image: {e}")
        
        # Update existing project
        if data.project_id:
            existing = await db.cover_projects.find_one({
                "id": data.project_id,
                "user_id": user["id"]
            })
            
            if not existing:
                raise HTTPException(status_code=404, detail="Проект не найден")
            
            # Delete old preview if exists and we have new one
            if preview_url and existing.get("preview_url"):
                old_filename = existing["preview_url"].split("/")[-1]
                old_path = COVERS_DIR / old_filename
                if old_path.exists():
                    try:
                        old_path.unlink()
                    except:
                        pass
            
            update_data = {
                "project_name": data.project_name,
                "canvas_json": data.canvas_json,
                "updated_at": now
            }
            if preview_url:
                update_data["preview_url"] = preview_url
            
            await db.cover_projects.update_one(
                {"id": data.project_id},
                {"$set": update_data}
            )
            
            project = await db.cover_projects.find_one({"id": data.project_id}, {"_id": 0})
            return {
                "success": True,
                "message": "Проект обновлён",
                "project": project
            }
        
        # Create new project
        project_id = str(uuid.uuid4())
        project = {
            "id": project_id,
            "user_id": user["id"],
            "project_name": data.project_name,
            "canvas_json": data.canvas_json,
            "preview_url": preview_url,
            "created_at": now,
            "updated_at": now
        }
        
        await db.cover_projects.insert_one(project)
        
        return {
            "success": True,
            "message": "Проект сохранён",
            "project": {k: v for k, v in project.items() if k != "_id"}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Project save error: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения: {str(e)}")

@api_router.get("/projects")
async def get_user_projects(user: dict = Depends(get_current_user)):
    """Get all cover projects for current user"""
    projects = await db.cover_projects.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    return {"projects": projects}

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    """Get a specific cover project"""
    project = await db.cover_projects.find_one(
        {"id": project_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    return {"project": project}

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    """Delete a cover project"""
    project = await db.cover_projects.find_one({
        "id": project_id,
        "user_id": user["id"]
    })
    
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")
    
    # Delete preview file if exists
    if project.get("preview_url"):
        preview_filename = project["preview_url"].split("/")[-1]
        preview_path = COVERS_DIR / preview_filename
        if preview_path.exists():
            try:
                preview_path.unlink()
            except:
                pass
    
    await db.cover_projects.delete_one({"id": project_id})
    
    return {"success": True, "message": "Проект удалён"}

# ===================== AI IMAGE GENERATION =====================

class AIGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=500)

@api_router.post("/generate-bg")
async def generate_ai_background(request: AIGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate AI background image using Hugging Face Stable Diffusion XL"""
    
    # Check if user has AI generation access
    plan_config = await get_plan_config(user.get("plan", "free"))
    if not plan_config.get("can_use_ai_generation", False):
        raise HTTPException(
            status_code=403, 
            detail="Эта функция доступна только в PRO-версии."
        )
    
    huggingface_token = os.getenv("HUGGINGFACE_TOKEN")
    if not huggingface_token:
        raise HTTPException(status_code=500, detail="Hugging Face token not configured")
    
    # Hugging Face Router API endpoint for SDXL (new API)
    api_url = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0"
    
    headers = {
        "Authorization": f"Bearer {huggingface_token}",
        "Content-Type": "application/json"
    }
    
    # Add quality enhancers to the prompt
    enhanced_prompt = f"{request.prompt}, high quality, detailed, 4k, professional"
    
    payload = {
        "inputs": enhanced_prompt,
        "parameters": {
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
            "width": 1024,
            "height": 1024
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(api_url, headers=headers, json=payload)
            
            if response.status_code == 503:
                # Model is loading, return loading status
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Модель загружается. Попробуйте через 20-30 секунд."}
                )
            
            if response.status_code != 200:
                error_detail = response.text[:200] if response.text else "Unknown error"
                logging.error(f"HuggingFace API error: {response.status_code} - {error_detail}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Ошибка генерации: {error_detail}"
                )
            
            # Response is binary image data
            image_bytes = response.content
            
            # Convert to base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            # Also save to uploads folder
            filename = f"ai_bg_{uuid.uuid4().hex[:8]}.png"
            filepath = UPLOAD_DIR / filename
            
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(image_bytes)
            
            return {
                "success": True,
                "image_base64": f"data:image/png;base64,{image_base64}",
                "image_url": f"/api/uploads/{filename}"
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Время ожидания генерации истекло. Попробуйте ещё раз.")
    except Exception as e:
        logging.error(f"AI generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации: {str(e)}")

# ===================== SUPPORT TICKETS =====================

@api_router.post("/tickets")
async def create_ticket(data: TicketCreate, user: dict = Depends(get_current_user)):
    """Create a new support ticket"""
    ticket = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "username": user.get("username", ""),
        "subject": data.subject,
        "category": data.category,
        "status": "open",
        "messages": [{
            "id": str(uuid.uuid4()),
            "sender_id": user["id"],
            "sender_role": "user",
            "message": data.message,
            "created_at": datetime.now(timezone.utc).isoformat()
        }],
        "is_read_by_staff": False,
        "is_read_by_user": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tickets.insert_one(ticket)
    logging.info(f"New ticket created: {ticket['id']} by {user['email']}")
    
    return {k: v for k, v in ticket.items() if k != "_id"}

@api_router.get("/tickets")
async def get_user_tickets(user: dict = Depends(get_current_user)):
    """Get all tickets for current user"""
    tickets = await db.tickets.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    return tickets

@api_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    """Get specific ticket - user can only view their own tickets"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")
    
    # Users can only view their own tickets
    if ticket["user_id"] != user["id"] and not has_role_permission(user.get("role", "user"), "moderator"):
        raise HTTPException(status_code=403, detail="Нет доступа к этому тикету")
    
    # If user is viewing their own ticket, mark as read by user
    if ticket["user_id"] == user["id"] and not ticket.get("is_read_by_user", True):
        await db.tickets.update_one(
            {"id": ticket_id},
            {"$set": {"is_read_by_user": True}}
        )
        ticket["is_read_by_user"] = True
    
    return ticket

@api_router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(ticket_id: str, data: TicketReply, user: dict = Depends(get_current_user)):
    """Add a reply to ticket"""
    ticket = await db.tickets.find_one({"id": ticket_id})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")
    
    is_staff = has_role_permission(user.get("role", "user"), "moderator")
    
    # Users can only reply to their own tickets
    if ticket["user_id"] != user["id"] and not is_staff:
        raise HTTPException(status_code=403, detail="Нет доступа к этому тикету")
    
    new_message = {
        "id": str(uuid.uuid4()),
        "sender_id": user["id"],
        "sender_role": "staff" if is_staff else "user",
        "sender_name": user.get("username", user["email"]),
        "message": data.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update read status based on who is replying
    update_data = {
        "$push": {"messages": new_message},
        "$set": {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_read_by_staff": is_staff,  # If staff replies, they've read it
            "is_read_by_user": not is_staff  # If user replies, staff needs to read; if staff replies, user needs to read
        }
    }
    
    # If staff replies and ticket is open, change to in_progress
    if is_staff and ticket["status"] == "open":
        update_data["$set"]["status"] = "in_progress"
    
    await db.tickets.update_one({"id": ticket_id}, update_data)
    
    updated_ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    return updated_ticket

@api_router.get("/tickets/user/unread-count")
async def get_user_unread_tickets(user: dict = Depends(get_current_user)):
    """Get count of unread tickets for current user (staff replied)"""
    count = await db.tickets.count_documents({
        "user_id": user["id"],
        "is_read_by_user": False
    })
    return {"unread_count": count}

# Admin ticket endpoints
@api_router.get("/admin/tickets")
async def admin_get_tickets(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_admin_user)
):
    """Get all tickets for admin panel"""
    if not has_role_permission(user.get("role", "user"), "moderator"):
        raise HTTPException(status_code=403, detail="Требуется роль модератора или выше")
    
    query = {}
    if status:
        query["status"] = status
    
    tickets = await db.tickets.find(query, {"_id": 0}).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.tickets.count_documents(query)
    
    return {"tickets": tickets, "total": total}

@api_router.get("/admin/tickets/unread-count")
async def admin_get_unread_tickets_count(user: dict = Depends(get_admin_user)):
    """Get count of unread tickets for staff"""
    if not has_role_permission(user.get("role", "user"), "moderator"):
        raise HTTPException(status_code=403, detail="Требуется роль модератора или выше")
    
    count = await db.tickets.count_documents({
        "status": {"$in": ["open", "in_progress"]},
        "is_read_by_staff": False
    })
    return {"unread_count": count}

@api_router.get("/admin/tickets/{ticket_id}")
async def admin_get_ticket(ticket_id: str, user: dict = Depends(get_admin_user)):
    """Get specific ticket and mark as read by staff"""
    if not has_role_permission(user.get("role", "user"), "moderator"):
        raise HTTPException(status_code=403, detail="Требуется роль модератора или выше")
    
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")
    
    # Mark as read by staff
    if not ticket.get("is_read_by_staff", False):
        await db.tickets.update_one(
            {"id": ticket_id},
            {"$set": {"is_read_by_staff": True}}
        )
        ticket["is_read_by_staff"] = True
    
    return ticket

@api_router.put("/admin/tickets/{ticket_id}/status")
async def admin_update_ticket_status(ticket_id: str, data: TicketStatusUpdate, user: dict = Depends(get_admin_user)):
    """Update ticket status"""
    if not has_role_permission(user.get("role", "user"), "moderator"):
        raise HTTPException(status_code=403, detail="Требуется роль модератора или выше")
    
    if data.status not in ["open", "in_progress", "resolved", "closed"]:
        raise HTTPException(status_code=400, detail="Неверный статус")
    
    result = await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Тикет не найден")
    
    return {"success": True, "status": data.status}

# ===================== STARTUP =====================

@app.on_event("startup")
async def startup_event():
    # Create default admin if not exists
    admin = await db.users.find_one({"email": "admin@example.com"})
    if not admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@example.com",
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "status": "active",
            "plan": "pro",
            "is_verified": True,
            "is_banned": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logging.info("Default admin created: admin@example.com / admin123")
    
    # Check and create/update owner account
    owner = await db.users.find_one({"email": OWNER_EMAIL})
    if owner and owner.get("role") != "owner":
        await db.users.update_one(
            {"email": OWNER_EMAIL},
            {"$set": {"role": "owner", "plan": "pro", "is_verified": True, "is_banned": False}}
        )
        logging.info(f"Owner role assigned to: {OWNER_EMAIL}")
    
    # Initialize default plan configs if not exist
    for plan_name, config in DEFAULT_PLAN_CONFIGS.items():
        existing = await db.plan_configs.find_one({"plan_name": plan_name})
        if not existing:
            await db.plan_configs.insert_one({
                **config,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logging.info(f"Created default plan config: {plan_name}")
    
    # Migrate existing users to have new RBAC fields
    users_migration = await db.users.update_many(
        {"is_banned": {"$exists": False}},
        {"$set": {"is_banned": False, "is_verified": False}}
    )
    if users_migration.modified_count > 0:
        logging.info(f"Migrated {users_migration.modified_count} users with RBAC fields")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.pages.create_index("slug", unique=True)
    await db.pages.create_index("user_id")
    await db.links.create_index("page_id")
    await db.clicks.create_index("link_id")
    await db.plan_configs.create_index("plan_name", unique=True)
    await db.subdomains.create_index("subdomain", unique=True)
    await db.subdomains.create_index("user_id")
    await db.cover_projects.create_index("user_id")
    await db.tickets.create_index("user_id")
    await db.tickets.create_index([("status", 1), ("is_read_by_staff", 1)])
    
    # Update existing plan configs with new fields
    for plan_name in ["free", "pro"]:
        if plan_name in DEFAULT_PLAN_CONFIGS:
            default_config = DEFAULT_PLAN_CONFIGS[plan_name]
            await db.plan_configs.update_one(
                {"plan_name": plan_name},
                {"$set": {
                    "max_subdomains_limit": default_config.get("max_subdomains_limit", 0),
                    "can_use_ai_generation": default_config.get("can_use_ai_generation", False),
                    "can_verify_profile": default_config.get("can_verify_profile", False)
                }},
                upsert=True
            )
    
    # Migrate users from 'ultimate' plan to 'pro'
    await db.users.update_many(
        {"plan": "ultimate"},
        {"$set": {"plan": "pro"}}
    )
    
    # Remove old 'ultimate' plan config
    await db.plan_configs.delete_one({"plan_name": "ultimate"})
    
    # Migrate old "Unknown" entries to "Неизвестно" for consistency
    migration_result = await db.clicks.update_many(
        {"$or": [{"country": "Unknown"}, {"city": "Unknown"}]},
        {"$set": {"country": "Неизвестно", "city": "Неизвестно"}}
    )
    if migration_result.modified_count > 0:
        logging.info(f"Migrated {migration_result.modified_count} click records with Unknown values")
    
    # Same for views
    views_result = await db.views.update_many(
        {"$or": [{"country": "Unknown"}, {"city": "Unknown"}]},
        {"$set": {"country": "Неизвестно", "city": "Неизвестно"}}
    )
    if views_result.modified_count > 0:
        logging.info(f"Migrated {views_result.modified_count} view records with Unknown values")
    
    # Same for shares
    shares_result = await db.shares.update_many(
        {"$or": [{"country": "Unknown"}, {"city": "Unknown"}]},
        {"$set": {"country": "Неизвестно", "city": "Неизвестно"}}
    )
    if shares_result.modified_count > 0:
        logging.info(f"Migrated {shares_result.modified_count} share records with Unknown values")
    
    logging.info(f"RBAC System initialized. Launch mode: {LAUNCH_MODE}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Include router and configure CORS
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
