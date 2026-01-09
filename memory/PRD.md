# MyTrack MVP - Product Requirements Document

## Original Problem Statement
Build a minimal band.link-like smart link web service for musicians. Focus on MVP only. No overengineering.

## User Choices
- **Image Storage**: Local file storage (server-side)
- **Authentication**: JWT-based custom auth
- **Theme**: Dark theme (modern, music-industry feel)
- **Admin Account**: admin@example.com / admin123
- **Language**: Russian (full UI localization)

## User Personas

### Guest (Fan)
- Views public smart link pages
- Clicks platform links to access music
- No authentication required

### User (Artist)
- Registers and logs in
- Creates and manages smart link pages
- Views basic analytics (views, clicks)
- Uploads cover images

### Admin
- Manages all users and pages
- Can block/unblock users
- Can disable/enable pages

## Core Requirements (Static)

### 1. Authentication
- [x] User registration (email + password + username)
- [x] Login / logout with JWT
- [x] Password reset endpoint (MVP: returns success message)
- [x] User model: id, email, username, plan (free), created_at, status

### 2. User Dashboard
- [x] List of user's smart pages
- [x] Create new page button
- [x] Basic stats per page: views, total clicks

### 3. Smart Link Page (Public)
- [x] Public URL: /artist/{slug}
- [x] Artist name, release title, description
- [x] Cover image with blurred background
- [x] Platform links (Spotify, Apple Music, YouTube, SoundCloud, Tidal, Deezer, Custom)
- [x] Click tracking via backend redirect

### 4. Page Builder
- [x] Create / edit page
- [x] Fields: title, slug, artist name, release title, description
- [x] Cover image upload with auto blur for background
- [x] Links management (add, toggle, delete)
- [x] Live mobile preview

### 5. Analytics (Basic)
- [x] Track page views
- [x] Track clicks per platform
- [x] Display simple numbers (no charts)

### 6. Admin Panel
- [x] Admin login
- [x] List users with page counts
- [x] View all pages
- [x] Block / unblock user
- [x] Disable / enable page

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- Complete REST API with all endpoints
- JWT authentication with proper header handling
- File upload with automatic blurred background generation (Pillow)
- Click tracking and redirect system
- Admin routes with role-based access
- Database indexes for performance
- Default admin user creation on startup
- Backend proxy for iTunes/Spotify API (CORS bypass)

### Frontend (React + Tailwind CSS)
- Dark theme with neon purple accents
- Glassmorphism design for public pages
- Responsive sidebar layout for dashboard
- Live preview in page builder
- Platform icons with brand colors (including Yandex Music, VK Music)
- Framer Motion animations
- Toast notifications via Sonner
- QR code generation with download
- Scan Source feature (auto-populate from Spotify/Apple Music)
- Dynamic OG meta tags for public pages
- Link reordering with up/down buttons
- **Full Russian localization** (January 9, 2026)

### Database Collections
- users: authentication and profile
- pages: smart link pages
- links: platform links per page
- clicks: click tracking data

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/me
- GET/POST /api/pages
- GET/PUT/DELETE /api/pages/{id}
- GET/POST /api/pages/{id}/links
- PUT/DELETE /api/pages/{id}/links/{link_id}
- GET /api/artist/{slug} (public)
- GET /api/click/{link_id} (redirect + track)
- GET /api/analytics/{page_id}
- GET /api/admin/users
- GET /api/admin/pages
- PUT /api/admin/users/{id}/block
- PUT /api/admin/pages/{id}/disable
- POST /api/upload

## Prioritized Backlog

### P0 (Completed)
- ✅ Core authentication
- ✅ Page CRUD operations
- ✅ Public smart link pages
- ✅ Click tracking
- ✅ Admin panel

### P1 (Next Phase)
- Custom themes/colors for pages
- Image optimization
- Email verification

### P2 (Future)
- Pre-save campaigns
- Email capture forms
- Multiple page themes
- Analytics charts

## Out of Scope
- Payments/subscriptions
- Teams/collaboration
- Advanced analytics/charts
- Design themes marketplace

## Tech Stack
- **Backend**: FastAPI, MongoDB, Pillow
- **Frontend**: React, Tailwind CSS, Framer Motion
- **Auth**: JWT (PyJWT, bcrypt)
- **File Storage**: Local (server-side)

## Testing Summary
- Backend: 90.5% pass rate
- Frontend: 95% functional
- All core flows working

## Localization Status (January 9, 2026)
**Russian Translation Complete:**
- ✅ Login page
- ✅ Register page
- ✅ Dashboard
- ✅ Admin Panel
- ✅ PageBuilder (all sections)
- ✅ Toast messages
- ✅ Form labels and placeholders
- ✅ Buttons and navigation
- ✅ Forgot Password page
- ✅ Reset Password page
- ✅ Password reset email template (Russian)
