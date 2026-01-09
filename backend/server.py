from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Header
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

class PageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    artist_name: Optional[str] = None
    release_title: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    status: Optional[str] = None

class LinkCreate(BaseModel):
    platform: str
    url: str
    active: bool = True

class LinkUpdate(BaseModel):
    platform: Optional[str] = None
    url: Optional[str] = None
    active: Optional[bool] = None

class PasswordReset(BaseModel):
    email: EmailStr

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

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordReset):
    user = await db.users.find_one({"email": data.email})
    if not user:
        return {"message": "If email exists, reset instructions will be sent"}
    # In MVP, just return success message (no actual email sending)
    return {"message": "If email exists, reset instructions will be sent"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "username": user["username"],
        "role": user["role"],
        "status": user["status"],
        "plan": user["plan"],
        "created_at": user["created_at"]
    }

# ===================== PAGE ROUTES =====================

@api_router.get("/pages")
async def get_user_pages(user: dict = Depends(get_current_user)):
    pages = await db.pages.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    # Get click counts for each page
    for page in pages:
        total_clicks = 0
        links = await db.links.find({"page_id": page["id"]}, {"_id": 0}).to_list(100)
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pages.insert_one(page)
    page.pop("_id", None)
    return page

@api_router.get("/pages/{page_id}")
async def get_page(page_id: str, authorization: str = None):
    user = await get_current_user(authorization)
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    links = await db.links.find({"page_id": page_id}, {"_id": 0}).to_list(100)
    page["links"] = links
    return page

@api_router.put("/pages/{page_id}")
async def update_page(page_id: str, data: PageUpdate, authorization: str = None):
    user = await get_current_user(authorization)
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
async def delete_page(page_id: str, authorization: str = None):
    user = await get_current_user(authorization)
    result = await db.pages.delete_one({"id": page_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Delete associated links and clicks
    await db.links.delete_many({"page_id": page_id})
    await db.clicks.delete_many({"page_id": page_id})
    
    return {"message": "Page deleted"}

# ===================== LINK ROUTES =====================

@api_router.get("/pages/{page_id}/links")
async def get_page_links(page_id: str, authorization: str = None):
    user = await get_current_user(authorization)
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    links = await db.links.find({"page_id": page_id}, {"_id": 0}).to_list(100)
    return links

@api_router.post("/pages/{page_id}/links")
async def create_link(page_id: str, data: LinkCreate, authorization: str = None):
    user = await get_current_user(authorization)
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    link = {
        "id": str(uuid.uuid4()),
        "page_id": page_id,
        "platform": data.platform,
        "url": data.url,
        "active": data.active,
        "clicks": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.links.insert_one(link)
    link.pop("_id", None)
    return link

@api_router.put("/pages/{page_id}/links/{link_id}")
async def update_link(page_id: str, link_id: str, data: LinkUpdate, authorization: str = None):
    user = await get_current_user(authorization)
    page = await db.pages.find_one({"id": page_id, "user_id": user["id"]})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.links.update_one({"id": link_id, "page_id": page_id}, {"$set": update_data})
    
    updated = await db.links.find_one({"id": link_id}, {"_id": 0})
    return updated

@api_router.delete("/pages/{page_id}/links/{link_id}")
async def delete_link(page_id: str, link_id: str, authorization: str = None):
    user = await get_current_user(authorization)
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
    
    links = await db.links.find({"page_id": page["id"], "active": True}, {"_id": 0}).to_list(100)
    page["links"] = links
    page["views"] = page.get("views", 0) + 1
    
    return page

@api_router.get("/click/{link_id}")
async def track_click(link_id: str, referrer: Optional[str] = None):
    link = await db.links.find_one({"id": link_id}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    # Track click
    click = {
        "id": str(uuid.uuid4()),
        "link_id": link_id,
        "page_id": link["page_id"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "referrer": referrer
    }
    await db.clicks.insert_one(click)
    
    # Increment click count
    await db.links.update_one({"id": link_id}, {"$inc": {"clicks": 1}})
    
    return RedirectResponse(url=link["url"], status_code=302)

# ===================== ANALYTICS ROUTES =====================

@api_router.get("/analytics/{page_id}")
async def get_page_analytics(page_id: str, authorization: str = None):
    user = await get_current_user(authorization)
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
        "links": links
    }

# ===================== ADMIN ROUTES =====================

@api_router.get("/admin/users")
async def admin_get_users(authorization: str = None):
    await get_admin_user(authorization)
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    # Get page counts for each user
    for user in users:
        page_count = await db.pages.count_documents({"user_id": user["id"]})
        user["page_count"] = page_count
    
    return users

@api_router.get("/admin/pages")
async def admin_get_pages(authorization: str = None):
    await get_admin_user(authorization)
    pages = await db.pages.find({}, {"_id": 0}).to_list(1000)
    
    # Get user info and clicks for each page
    for page in pages:
        user = await db.users.find_one({"id": page["user_id"]}, {"_id": 0, "password_hash": 0})
        page["user"] = user
        
        links = await db.links.find({"page_id": page["id"]}, {"_id": 0}).to_list(100)
        page["total_clicks"] = sum(link.get("clicks", 0) for link in links)
    
    return pages

@api_router.put("/admin/users/{user_id}/block")
async def admin_block_user(user_id: str, authorization: str = None):
    await get_admin_user(authorization)
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = "blocked" if user["status"] == "active" else "active"
    await db.users.update_one({"id": user_id}, {"$set": {"status": new_status}})
    
    return {"message": f"User {new_status}", "status": new_status}

@api_router.put("/admin/pages/{page_id}/disable")
async def admin_disable_page(page_id: str, authorization: str = None):
    await get_admin_user(authorization)
    page = await db.pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    new_status = "disabled" if page["status"] == "active" else "active"
    await db.pages.update_one({"id": page_id}, {"$set": {"status": new_status}})
    
    return {"message": f"Page {new_status}", "status": new_status}

# ===================== FILE UPLOAD =====================

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), authorization: str = None):
    await get_current_user(authorization)
    
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
