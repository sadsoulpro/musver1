# Muslink - Smart Links for Musicians

## Original Problem Statement
Application cloned from GitHub repository `https://github.com/sadsoulpro/prefinal-final.git`. A smart link-in-bio service for musicians with multi-platform link pages.

## What's Been Implemented

### Core Features (Existing)
- JWT-based authentication (login, register, password reset)
- Role-based access control (Owner, Admin, Moderator, User)
- Smart link pages with music platform links
- Odesli/Songlink API integration for auto-filling music links (URL + UPC code support)
- Cover image upload and management
- QR code generation for pages
- Analytics (views, clicks, geography)
- Subdomain management
- Admin panel with global analytics
- Support ticket system
- Verification badge system
- RandomCover - AI-powered cover art editor

### Session Updates (2025-01-17) - Light Theme Fixes

#### Public Page Theme Selector
- Added page_theme field to pages collection (dark/light)
- Added "Page Design" section in PageBuilder between Cover and Platform Links
- PublicPage.jsx now respects the selected theme independently of user's panel theme
- Fixed visibility of artist name, release title, and share buttons in light mode

#### Light Mode UI Fixes for Panel Pages
- **RandomCover.jsx**: Fixed background, dialogs, tooltips, tabs, and empty state colors
- **Domains.jsx**: Fixed background, loading state, plan badge, toggle switch, and empty state
- **AdminPanel.jsx**: Fixed background, loading state, plan config, select dropdowns, toggle switches, disabled states, and subdomains list
- **Analytics.jsx**: Fixed background, loading state, header, empty states, and PRO overlay
- **Dashboard.jsx**: Fixed dropdown menu, card backgrounds, and image placeholders

All pages now use CSS variables (`bg-background`, `bg-muted`, `border-border`, `text-muted-foreground`, `bg-card`) instead of hardcoded Zinc colors.

### Session Updates (2025-01-17) - Major Redesign

#### 1. Full Landing Page Redesign
- **New Structure**:
  - Hero section with title, subtitle, CTA buttons, phone mockup
  - Features section (6 cards): All Platforms, One Link, Analytics (PRO), Custom Design (PRO), QR Codes, Fast & Free
  - "How It Works" section (3 steps)
  - Preview section with browser mockup
  - FAQ section (accordion)
  - Footer with logo and copyright
- **New Logo**: Muslink SVG logo integrated as React component (`/app/frontend/src/components/MuslinkLogo.jsx`)
- **Design**: Modern, minimalist, music-focused aesthetic with soft shadows, cards, good typography

#### 2. Light/Dark Mode Support
- **ThemeContext** (`/app/frontend/src/contexts/ThemeContext.jsx`): Full theme management
- **ThemeToggle** component: Moon/Sun icon toggle
- **Storage**: Theme persists in localStorage (`muslink_theme`)
- **Default**: Respects `prefers-color-scheme` system preference
- **Integration**: Works on Landing page, Dashboard/Sidebar, and all authenticated pages
- **CSS Variables**: Updated `/app/frontend/src/index.css` with light theme variables

#### 3. OG Tags for Social Sharing
- **Backend endpoint**: `GET /api/og/{slug}?lang=en|ru|es`
- **Dynamic OG meta**:
  - `og:title`: "{Release Title} — Muslink"
  - `og:description`: Localized ("Listen, download or stream..." in EN/RU/ES)
  - `og:image`: Uses cover art from release, falls back to default
- **Redirect**: After crawler reads OG tags, redirects to actual page

#### 4. PRO Feature Modal + Waitlist
- **ProFeatureModal** (`/app/frontend/src/components/ProFeatureModal.jsx`)
- **Localized text** for EN, RU, ES:
  - "This feature is not available yet. Leave your email..."
- **Email collection**:
  - Frontend validation
  - Backend API: `POST /api/waitlist`
  - Saves to MongoDB `waitlist` collection
- **Spam protection**:
  - Rate limiting (60s cooldown per IP)
  - Frontend cooldown (30s)
- **Email confirmation**: Sends localized email via Resend API

### Previous Session Updates (2025-01-15)
- Full internationalization (i18n) for RU, EN, ES
- Admin Panel translation complete
- RandomCover iPhone photo fix (HEIC support, EXIF orientation)
- FAQ merged into Support page
- Sidebar layout fixed

## Tech Stack
- **Backend**: FastAPI, MongoDB (motor), Pydantic, JWT, bcrypt, Resend
- **Frontend**: React, React Router, Tailwind CSS, Shadcn UI, Axios, Framer Motion
- **Database**: MongoDB (database name: smartlink)
- **Services**: Managed by Supervisor

## New Files Created This Session
```
/app/frontend/src/components/MuslinkLogo.jsx       - SVG logo component
/app/frontend/src/components/ThemeToggle.jsx       - Theme switch button
/app/frontend/src/components/ProFeatureModal.jsx   - PRO waitlist modal
/app/frontend/src/contexts/ThemeContext.jsx        - Theme management
```

## Modified Files This Session
```
/app/frontend/src/pages/Landing.jsx       - Complete redesign
/app/frontend/src/components/Sidebar.jsx  - Added ThemeToggle
/app/frontend/src/App.js                  - Added ThemeProvider
/app/frontend/src/index.css               - Added light theme CSS variables
/app/frontend/src/i18n/translations.js    - Added proModal and newLanding sections
/app/backend/server.py                    - Added /waitlist and /og/{slug} endpoints
```

## Key API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/users/me` - Current user profile
- `GET /api/lookup/odesli?url=<url_or_upc>` - Music link lookup
- `POST /api/waitlist` - Add email to PRO features waitlist
- `GET /api/og/{slug}?lang=en` - Get HTML page with OG meta tags

## Database Schema
- **users**: id, email, username, password_hash, role, plan, status, verified
- **pages**: id, user_id, slug, title, cover_image, links, qr_enabled
- **subdomains**: id, user_id, subdomain, is_active
- **tickets**: id, user_id, subject, messages, status
- **waitlist**: id, email, features[], language, created_at, ip (NEW)

## Test Credentials
- **Owner**: `thedrumepic@gmail.com` / `password`

## Completed Tasks
- [x] Full Landing page redesign
- [x] Light/Dark mode with toggle
- [x] OG tags endpoint for social sharing
- [x] PRO feature modal with email collection
- [x] Waitlist API with spam protection
- [x] Email notification for waitlist
- [x] Theme persists in localStorage
- [x] System theme preference detection
- [x] Light mode fixes for RandomCover, Domains, AdminPanel pages
- [x] Light mode fixes for Analytics page and Dashboard dropdown
- [x] Public page theme selector (Dark/Light in PageBuilder)
- [x] Fixed visibility of text and buttons on public pages in light mode
- [x] Fixed "Copy" button visibility in dark theme on public pages
- [x] Removed /pricing page
- [x] Added E-Mails tab in Admin Panel for waitlist management
- [x] PRO feature modal in RandomCover (AI Generation)

## Pending/Future Tasks

### P2 - Minor Improvements
- Fix mixed language in PageBuilder preview
- Add default OG image file to server

### P2 - Security Improvements
- Remove hardcoded JWT_SECRET fallback
- Make OWNER_EMAIL configurable via .env

### P3 - Cleanup
- Optimize N+1 database queries in admin panel

## File Structure
```
/app
├── backend/
│   ├── .env
│   ├── requirements.txt
│   └── server.py
├── frontend/
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── App.js
│       ├── index.css
│       ├── components/
│       │   ├── MuslinkLogo.jsx (NEW)
│       │   ├── ThemeToggle.jsx (NEW)
│       │   ├── ProFeatureModal.jsx (NEW)
│       │   ├── Sidebar.jsx
│       │   └── LanguageSwitcher.jsx
│       ├── contexts/
│       │   ├── LanguageContext.jsx
│       │   └── ThemeContext.jsx (NEW)
│       ├── i18n/
│       │   └── translations.js
│       └── pages/
│           ├── Landing.jsx (REDESIGNED)
│           └── ...
└── memory/
    └── PRD.md
```

## 3rd Party Integrations
- **Odesli/Songlink API** - No key required
- **iTunes Search API** - No key required  
- **Resend** - Key in .env, used for waitlist emails
- **Hugging Face** - Key in .env, used for RandomCover AI
