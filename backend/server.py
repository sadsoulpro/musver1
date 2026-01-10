from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Header, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
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
JWT_SECRET = os.environ.get('JWT_SECRET', 'bandlink-secret-key-change-in-production')
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

app = FastAPI()
api_router = APIRouter(prefix="/api")

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
    created_at: str

class PageCreate(BaseModel):
    title: str
    slug: str
    artist_name: str
    release_title: str
    description: Optional[str] = ""
    cover_image: Optional[str] = ""
    qr_enabled: Optional[bool] = True

class PageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    artist_name: Optional[str] = None
    release_title: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    status: Optional[str] = None
    qr_enabled: Optional[bool] = None

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

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user["status"] == "blocked":
        raise HTTPException(status_code=403, detail="Account blocked")
    return user

async def get_admin_user(authorization: str = Header(None)):
    user = await get_current_user(authorization)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

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
    
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "username": data.username,
        "password_hash": hash_password(data.password),
        "role": "user",
        "status": "active",
        "plan": "free",
        "verified": False,
        "verification_status": "none",  # none, pending, approved, rejected
        "show_verification_badge": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
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
            "created_at": user["created_at"]
        }
    }

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user["status"] == "blocked":
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
            "plan": user["plan"],
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
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "role": user["role"],
        "status": user["status"],
        "plan": user["plan"],
        "verified": user.get("verified", False),
        "verification_status": user.get("verification_status", "none"),
        "show_verification_badge": user.get("show_verification_badge", True),
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pages.insert_one(page)
    page.pop("_id", None)
    return page

@api_router.get("/pages/{page_id}")
async def get_page(page_id: str, user: dict = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    links = await db.links.find({"page_id": page_id}, {"_id": 0}).sort("order", 1).to_list(100)
    page["links"] = links
    return page

@api_router.put("/pages/{page_id}")
async def update_page(page_id: str, data: PageUpdate, user: dict = Depends(get_current_user)):
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
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
    result = await db.pages.delete_one({"id": page_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    
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
    
    # Get user verification status
    user = await db.users.find_one({"id": page["user_id"]}, {"_id": 0, "verified": 1, "show_verification_badge": 1})
    if user:
        page["user_verified"] = user.get("verified", False) and user.get("show_verification_badge", True)
    else:
        page["user_verified"] = False
    
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
    
    # Get geo info from headers (set by proxy/CDN) or IP
    country = "Unknown"
    city = "Unknown"
    if request:
        # Try to get from headers (Cloudflare, etc.)
        country = request.headers.get("CF-IPCountry", 
                  request.headers.get("X-Country", "Unknown"))
        city = request.headers.get("CF-IPCity",
               request.headers.get("X-City", "Unknown"))
    
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
    
    country = "Unknown"
    city = "Unknown"
    if request:
        country = request.headers.get("CF-IPCountry",
                  request.headers.get("X-Country", "Unknown"))
        city = request.headers.get("CF-IPCity",
               request.headers.get("X-City", "Unknown"))
    
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
    
    country = "Unknown"
    city = "Unknown"
    if request:
        country = request.headers.get("CF-IPCountry",
                  request.headers.get("X-Country", "Unknown"))
        city = request.headers.get("CF-IPCity",
               request.headers.get("X-City", "Unknown"))
    
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
    
    country = "Unknown"
    city = "Unknown"
    if request:
        country = request.headers.get("CF-IPCountry",
                  request.headers.get("X-Country", "Unknown"))
        city = request.headers.get("CF-IPCity",
               request.headers.get("X-City", "Unknown"))
    
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
    
    return {
        "page_id": page_id,
        "views": page.get("views", 0),
        "total_clicks": total_clicks,
        "clicks_by_platform": clicks_by_platform,
        "links": links,
        "shares": page.get("shares", 0),
        "qr_scans": page.get("qr_scans", 0)
    }

# Global analytics for all user pages
@api_router.get("/analytics/global/summary")
async def get_global_analytics(user: dict = Depends(get_current_user)):
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
            "pages": []
        }
    
    # Aggregate stats from pages
    total_views = sum(p.get("views", 0) for p in pages)
    total_shares = sum(p.get("shares", 0) for p in pages)
    total_qr_scans = sum(p.get("qr_scans", 0) for p in pages)
    
    # Get all links for these pages
    links = await db.links.find({"page_id": {"$in": page_ids}}, {"_id": 0}).to_list(1000)
    total_clicks = sum(link.get("clicks", 0) for link in links)
    
    # Get clicks by country
    clicks_cursor = db.clicks.aggregate([
        {"$match": {"page_id": {"$in": page_ids}}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ])
    by_country = []
    async for doc in clicks_cursor:
        by_country.append({"country": doc["_id"] or "Unknown", "clicks": doc["count"]})
    
    # Get clicks by city
    city_cursor = db.clicks.aggregate([
        {"$match": {"page_id": {"$in": page_ids}}},
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ])
    by_city = []
    async for doc in city_cursor:
        by_city.append({"city": doc["_id"] or "Unknown", "clicks": doc["count"]})
    
    # Get timeline (last 30 days)
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
    
    # Page stats
    page_stats = []
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
        "pages": page_stats
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
            by_country.append({"country": doc["_id"] or "Unknown", "clicks": doc["count"]})
    
    # Get clicks by city
    by_city = []
    if page_ids:
        city_cursor = db.clicks.aggregate([
            {"$group": {"_id": "$city", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ])
        async for doc in city_cursor:
            by_city.append({"city": doc["_id"] or "Unknown", "clicks": doc["count"]})
    
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
    """Proxy endpoint for Odesli (song.link) API to get links for all platforms"""
    try:
        async with httpx.AsyncClient() as client:
            odesli_url = f"https://api.song.link/v1-alpha.1/links?url={url}&userCountry={country}"
            response = await client.get(odesli_url, timeout=15.0)
            
            if response.status_code != 200:
                logging.error(f"Odesli API error: {response.status_code}")
                return {"error": "Failed to fetch from Odesli", "links": {}}
            
            data = response.json()
            
            # Extract platform links
            links_by_platform = data.get("linksByPlatform", {})
            
            # Map Odesli platform names to our platform IDs
            platform_mapping = {
                "spotify": "spotify",
                "appleMusic": "apple",
                "itunes": "itunes",
                "youtube": "youtube",
                "youtubeMusic": "youtube",
                "soundcloud": "soundcloud",
                "tidal": "tidal",
                "deezer": "deezer",
                "yandex": "yandex",
                "amazonMusic": "amazon",
                "amazonStore": "amazon",
            }
            
            result_links = {}
            for odesli_platform, link_info in links_by_platform.items():
                our_platform = platform_mapping.get(odesli_platform)
                if our_platform and link_info.get("url"):
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
            "plan": "free",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logging.info("Default admin created: admin@example.com / admin123")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    await db.pages.create_index("slug", unique=True)
    await db.pages.create_index("user_id")
    await db.links.create_index("page_id")
    await db.clicks.create_index("link_id")

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
