# CityNav — Smart City Navigation PWA

A Progressive Web App for intelligent city navigation with Google Maps, multimodal route planning, offline POI packs, and location-based services — built with **Next.js 15**, **React 19**, **TypeScript 5**, and **Tailwind CSS 4**.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black) ![React](https://img.shields.io/badge/React-19.1-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![PWA](https://img.shields.io/badge/PWA-Enabled-brightgreen) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

---

## Table of Contents

- [Overview](#overview)
- [Setup Guide (Step-by-Step)](#setup-guide-step-by-step)
  - [Step 1 — Install Required Software](#step-1--install-required-software)
  - [Step 2 — Clone the Project](#step-2--clone-the-project)
  - [Step 3 — Install Dependencies](#step-3--install-dependencies)
  - [Step 4 — Set Up Google Maps API Key](#step-4--set-up-google-maps-api-key)
  - [Step 5 — Set Up the Database (PostgreSQL)](#step-5--set-up-the-database-postgresql)
  - [Step 6 — Set Up Google Login (Optional)](#step-6--set-up-google-login-optional)
  - [Step 7 — Configure Environment Variables](#step-7--configure-environment-variables)
  - [Step 8 — Run the App](#step-8--run-the-app)
- [Environment Variables Reference](#environment-variables-reference)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Available Pages & Routes](#available-pages--routes)
- [Architecture](#architecture)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**CityNav** is an intelligent Progressive Web App designed for urban navigation in Indian cities. It combines an offline-first architecture with multimodal route planning and Google Maps integration to provide comprehensive navigation without requiring constant connectivity.

### Highlights

- **Google Maps powered** — Directions, Geocoding, Places (New), and Maps JS on client
- **Multimodal route engine** — Walk, Bus, Metro, Auto, Cab with 4 route variants (Fastest / Cheapest / Balanced / Comfort)
- **Offline-first** — POI packs compressed with pako and stored in IndexedDB; service worker caches assets; cached route directions shown when network drops
- **Indian-city optimised** — Real pricing, city-specific transport apps (Mumbai, Pune, Delhi, Bangalore, and more)
- **Community reviews** — User reviews, ratings, and visit tracking for places
- **Authentication** — Sign in with Google or email/password
- **PWA** — Installable, standalone, works offline

---

## Setup Guide (Step-by-Step)

> **Don't worry if you're not a programmer!** Follow each step below carefully and you'll have CityNav running on your computer.

---

### Step 1 — Install Required Software

You need three things installed on your computer before starting:

#### a) Node.js (version 18 or higher)

Node.js runs the app on your computer.

1. Go to **https://nodejs.org**
2. Download the **LTS** version (the big green button)
3. Run the installer — click "Next" through all screens, keep all defaults
4. When done, open a **Terminal** (or **Command Prompt** on Windows) and type:
   ```bash
   node --version
   ```
   You should see something like `v18.x.x` or `v20.x.x`. If so, you're good!

> **npm** (the package manager) comes bundled with Node.js — no separate install needed.

#### b) Git

Git lets you download the project code.

1. Go to **https://git-scm.com/downloads**
2. Download for your operating system and install with default settings
3. Verify by typing in Terminal:
   ```bash
   git --version
   ```

#### c) PostgreSQL (version 14 or higher) — *optional*

Only needed if you want **login**, **sign up**, or **community review** features. If you just want maps and navigation, skip this.

- **Windows**: Download from https://www.postgresql.org/download/windows/ — run the installer, set a password for the `postgres` user (remember this password!)
- **macOS**: `brew install postgresql@16 && brew services start postgresql@16`
- **Ubuntu/Debian**: `sudo apt update && sudo apt install postgresql postgresql-contrib -y && sudo systemctl start postgresql`

---

### Step 2 — Clone the Project

Open your Terminal and run:

```bash
git clone https://github.com/Kiwi-520/CityNav.git
cd CityNav/citynav-nextjs-app
```

This downloads all the code into a folder called `CityNav` and moves into the app directory.

---

### Step 3 — Install Dependencies

Still in the Terminal (inside `CityNav/citynav-nextjs-app`), run:

```bash
npm install
```

This downloads all the libraries the app needs. It may take a minute or two.

---

### Step 4 — Set Up Google Maps API Key

The app uses Google Maps to show maps, directions, and nearby places. You need a free API key.

#### a) Create a Google Cloud project

1. Go to **https://console.cloud.google.com**
2. Sign in with your Google account
3. Click the project dropdown at the top → **New Project**
4. Name it `CityNav` → click **Create**
5. Make sure the new `CityNav` project is selected in the dropdown

#### b) Enable billing (required by Google, but there's a free tier)

1. Go to **https://console.cloud.google.com/billing**
2. Click **Link a billing account** (or create one)
3. Add a payment method — **you will NOT be charged** unless you exceed the free $200/month credit, which covers ~28,000 map loads

#### c) Enable the required APIs

Go to **https://console.cloud.google.com/apis/library** and search for + enable each of these (click on them → click **Enable**):

| # | API to Enable | What It Does |
|---|---------------|-------------|
| 1 | **Maps JavaScript API** | Shows the interactive map in the browser |
| 2 | **Directions API** | Calculates routes between two places |
| 3 | **Geocoding API** | Converts addresses to coordinates and vice versa |
| 4 | **Places API (New)** | Searches for nearby restaurants, hospitals, ATMs, etc. |

#### d) Create an API key

1. Go to **https://console.cloud.google.com/google/maps-apis/credentials**
2. Click **+ CREATE CREDENTIALS** → **API key**
3. A key will appear (looks like `AIzaSy...`). **Copy it** — you'll need it in Step 7
4. *(Optional but recommended)* Click **Edit** on the key:
   - Under **Application restrictions**, choose **HTTP referrers**
   - Add `http://localhost:3000/*`
   - This prevents others from using your key

---

### Step 5 — Set Up the Database (PostgreSQL)

> **Skip this step** if you don't need login/signup/community features. The maps and navigation will work without a database.

#### a) Create the database

Open a Terminal and run:

```bash
# On Linux/macOS:
sudo -u postgres psql -c "CREATE DATABASE citynav;"

# On Windows (open Command Prompt as Administrator):
psql -U postgres -c "CREATE DATABASE citynav;"
```

Enter the password you set during PostgreSQL installation when prompted.

#### b) Enable PostGIS (for geospatial features)

```bash
# On Linux/macOS:
sudo -u postgres psql -d citynav -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# On Windows:
psql -U postgres -d citynav -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

> **Note:** If PostGIS is not installed, install it first:
> - **Ubuntu/Debian**: `sudo apt install postgis postgresql-16-postgis-3`
> - **macOS**: `brew install postgis`
> - **Windows**: PostGIS is included in the PostgreSQL installer — make sure you checked the "Stack Builder" option during install, then use Stack Builder to add PostGIS

#### c) Run database migrations

Back in the `citynav-nextjs-app` folder:

```bash
npx prisma generate
npx prisma migrate deploy
```

This creates all the tables the app needs.

#### d) Run extra SQL setup (community forum features)

```bash
# On Linux/macOS:
sudo -u postgres psql -d citynav -f prisma/sql/community_forum_extras.sql

# On Windows:
psql -U postgres -d citynav -f prisma/sql/community_forum_extras.sql
```

---

### Step 6 — Set Up Google Login (Optional)

> **Skip this step** if you only want email/password login (or no login at all).

1. Go to **https://console.cloud.google.com/apis/credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If asked to configure the consent screen:
   - Choose **External** → **Create**
   - Fill in App Name: `CityNav`, User support email: your email
   - Add your email to **Developer contact information** → **Save and Continue**
   - Skip Scopes and Test Users → **Back to Dashboard**
4. Now create the OAuth client:
   - Application type: **Web application**
   - Name: `CityNav Web`
   - **Authorized redirect URIs** → Add URI: `http://localhost:3000/api/auth/callback/google`
   - Click **Create**
5. Copy the **Client ID** and **Client Secret** — you'll need them in Step 7

---

### Step 7 — Configure Environment Variables

1. In the `citynav-nextjs-app` folder, copy the example file:

   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` in any text editor (Notepad, VS Code, nano, etc.) and fill in your values:

   ```dotenv
   # Paste your Google Maps API key (from Step 4)
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...your_key_here
   GOOGLE_MAPS_API_KEY=AIzaSy...your_key_here

   # Default map center (Mumbai). Change to your city if you want:
   #   Delhi:     28.6139, 77.2090
   #   Bangalore: 12.9716, 77.5946
   #   Pune:      18.5204, 73.8567
   NEXT_PUBLIC_DEFAULT_LAT=19.0760
   NEXT_PUBLIC_DEFAULT_LNG=72.8777

   # Database (update password if you set a different one)
   DATABASE_URL=postgresql://postgres:your_password@127.0.0.1:5432/citynav?schema=public

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=run_this_command_to_generate: openssl rand -base64 32

   # Google OAuth (from Step 6 — leave blank if skipped)
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   ```

3. **Generate a NextAuth secret** by running:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and paste it as the value for `NEXTAUTH_SECRET`.

   > **Windows users** without `openssl`: Use this in Node.js instead:
   > ```bash
   > node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   > ```

4. Save the file.

---

### Step 8 — Run the App

```bash
npm run dev
```

Open your browser and go to **http://localhost:3000**

🎉 **That's it! CityNav is running.**

- Allow **location access** when the browser asks — this lets the map show your position
- The app works best in **Google Chrome** or **Microsoft Edge**

#### Quick Test

1. Go to **Essential Maps** (bottom navigation) — you should see Google Maps with your location
2. Click on a POI marker → you should see place details + direction info
3. Try **Search & Discovery** — search for "restaurants" or "hospital"
4. Go offline (turn off Wi-Fi) → cached POIs and routes should still display

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | **Yes** | Google Maps API key for the browser (renders maps) |
| `GOOGLE_MAPS_API_KEY` | **Yes** | Google Maps API key for the server (directions, geocoding, places) |
| `NEXT_PUBLIC_DEFAULT_LAT` | No | Default map latitude before GPS lock (default: `19.0760` — Mumbai) |
| `NEXT_PUBLIC_DEFAULT_LNG` | No | Default map longitude before GPS lock (default: `72.8777` — Mumbai) |
| `DATABASE_URL` | For auth | PostgreSQL connection string |
| `NEXTAUTH_URL` | For auth | Base URL of the app (default: `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | For auth | Random secret for encrypting session tokens |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID (for "Sign in with Google") |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |

> **Minimal setup** (maps only, no login): You only need `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and `GOOGLE_MAPS_API_KEY`.

---

## Key Features

### Multimodal Route Planning (core)

- **5 transport modes**: Walk, Bus, Metro, Auto-rickshaw, Cab
- **4 route variants**: Fastest, Cheapest, Balanced, Comfort
- **Distance-based intelligence**: automatically picks appropriate modes
- **Indian pricing**: Metro ₹10–60, Bus ₹5–50, Auto ₹20/km, Cab ₹12–18/km
- **Offline + Online**: estimation engine works offline; enhanced engine calls Google Directions
- **Step-by-step segments** with time, cost, and distance per leg

Example (12 km journey):

```
Metro + Auto:  28 min, ₹75  (Balanced — recommended)
Direct Cab:    25 min, ₹290 (Fastest)
Bus + Metro:   50 min, ₹40  (Cheapest)
Walk + Bus:    65 min, ₹30  (Eco-Friendly)
```

### Google Maps Integration

- Interactive maps via `@react-google-maps/api`
- Server-side proxy API routes keep the API key secret
- Directions, geocoding, text search, and nearby-place search

### Offline Capabilities

- **POI Packs**: 1 km radius POI discovery via Google Places API, compressed with pako (gzip) and stored in IndexedDB
- **Cached Directions**: Routes cached in IndexedDB with 3-day TTL; shown automatically when network drops
- **Fuzzy Route Matching**: When exact cached route not found, nearby routes within ~500 m are matched
- **Offline Navigation Banners**: Amber "Offline Mode" indicators when viewing cached directions
- **Service Worker**: Caches OSM tiles, pages, and API responses via Workbox
- Auto-named packs from reverse geocode (e.g. *"Ghatkopar, Mumbai — 400077"*)
- 11+ POI categories (hospitals, ATMs, restaurants, museums, etc.)

### Authentication & Community

- **NextAuth v5** with Google OAuth + email/password credentials
- **Community reviews** — rate and review places with tags (crowded, safe, clean, etc.)
- **Visit history** — track visited places with verification
- **Review moderation** — voting, flagging, and media attachments
- **PostgreSQL + Prisma ORM** with PostGIS for geospatial queries

### Location-Based Essential Apps

- City-detected app recommendations (Mumbai, Pune, Delhi, Bangalore + fallback)
- Direct Play Store / website links

### Theme System

- Dark / Light / System with `class`-based Tailwind strategy
- Persisted in `localStorage`, instant switch without reload

### PWA

- Service worker via `next-pwa` + Workbox
- Manifest for standalone install
- Offline asset caching

---

## Technology Stack

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.5.2 | React framework (App Router, Turbopack) |
| `react` / `react-dom` | 19.1.0 | UI library |
| `@react-google-maps/api` | 2.20.8 | Google Maps React components |
| `next-auth` | 5.0.0-beta.30 | Authentication (Google OAuth + credentials) |
| `@auth/prisma-adapter` | 2.11.1 | NextAuth ↔ Prisma integration |
| `@prisma/client` / `prisma` | 6.16.2 | Database ORM for PostgreSQL |
| `bcryptjs` | 3.0.3 | Password hashing for credential login |
| `next-pwa` | 5.6.0 | PWA service-worker generation |
| `pako` | 2.1.0 | Gzip compression for offline packs |
| `react-icons` | 5.5.0 | Icon set (`Fi*`, etc.) |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` 5 | Type-safe JavaScript |
| `tailwindcss` 4 + `@tailwindcss/postcss` | Utility-first CSS |
| `eslint` 9 + `eslint-config-next` | Linting |
| `@types/node`, `@types/react`, `@types/react-dom`, `@types/next-pwa` | Type definitions |
| `@eslint/eslintrc` | ESLint flat-config compatibility |

### External APIs & Services

| API | Provider | Auth | Purpose |
|-----|----------|------|---------|
| Maps JavaScript API | Google | API key (client) | Interactive maps in browser |
| Directions API | Google | API key (server) | Route calculation |
| Geocoding API | Google | API key (server) | Address ↔ coordinates |
| Places API (New) | Google | API key (server) | POI search, text search |
| PostgreSQL + PostGIS | Self-hosted | Connection string | User data, reviews, geospatial queries |

---

## Project Structure

```
citynav-nextjs-app/
├── prisma/
│   ├── schema.prisma              # Database schema (11 models)
│   ├── migrations/                # Auto-generated migration SQL
│   └── sql/
│       └── community_forum_extras.sql  # PostGIS indexes, views, functions
│
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker
│   ├── workbox-*.js               # Workbox runtime
│   └── images/                    # Icons & assets
│
├── src/
│   ├── app/                       # Next.js 15 App Router
│   │   ├── layout.tsx             # Root layout (BottomNavigation, globals.css)
│   │   ├── page.tsx               # / → HomeDashboard
│   │   ├── globals.css            # Material Design 3 variables + Tailwind
│   │   ├── pwa-register.tsx       # Service-worker registration
│   │   │
│   │   ├── auth/
│   │   │   └── page.tsx           # Login / Sign-up page
│   │   ├── home/
│   │   │   └── HomeDashboard.tsx
│   │   ├── essential-maps/
│   │   │   └── page.tsx           # Google Maps + POI explorer
│   │   ├── essential-apps/
│   │   │   └── page.tsx           # City-specific apps
│   │   ├── route-options/
│   │   │   └── page.tsx           # Multimodal route planner
│   │   ├── route-planning-example/
│   │   │   └── page.tsx           # Demo / test page
│   │   ├── search-discovery/
│   │   │   └── page.tsx           # Place search (Google Places API)
│   │   ├── interactive-map/
│   │   │   └── page.tsx           # Redirects to /essential-maps
│   │   ├── about/
│   │   │   └── page.tsx
│   │   │
│   │   └── api/                   # Server-side API proxies
│   │       ├── google-directions/route.ts
│   │       ├── google-geocode/route.ts
│   │       ├── google-places/route.ts
│   │       ├── google-places-search/route.ts
│   │       └── google-transit/route.ts
│   │
│   ├── components/                # Shared UI components
│   │   ├── BottomNavigation.tsx
│   │   ├── PageHeader.tsx
│   │   ├── QuickActions.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── RouteCard.tsx
│   │   ├── RouteComparison.tsx
│   │   ├── QuickDecisionView.tsx
│   │   └── RouteNavigationView.tsx   # Google Maps navigation overlay
│   │
│   ├── features/
│   │   └── offline-onboarding/
│   │       ├── components/
│   │       │   ├── GoogleMapsExplorer.tsx   # Main map + POI UI
│   │       │   ├── GoogleMapView.tsx        # @react-google-maps/api wrapper
│   │       │   ├── CategoryFilterSidebar.tsx
│   │       │   ├── DraggableRoutePopup.tsx  # Route popup with navigation
│   │       │   ├── EssentialsNavSidebar.tsx
│   │       │   ├── LocationDetailsHorizontal.tsx
│   │       │   ├── NavigationPanel.tsx      # Turn-by-turn directions
│   │       │   └── PackManagerPanel.tsx
│   │       ├── hooks/
│   │       │   ├── useNearbyPOIs.ts
│   │       │   ├── useOfflineLocation.ts
│   │       │   └── useRoute.ts             # Route fetching + IndexedDB cache
│   │       └── lib/
│   │           ├── packManager.ts           # IndexedDB pack CRUD
│   │           └── logger.ts
│   │
│   ├── lib/
│   │   ├── auth.ts                # NextAuth config (Google + credentials)
│   │   └── prisma.ts              # Prisma client singleton
│   │
│   ├── services/                  # Business-logic layer
│   │   ├── multimodal.service.ts           # Core offline route engine
│   │   ├── enhanced-multimodal.service.ts  # Google-powered route engine
│   │   ├── journey-segmentation.service.ts # Route breakdown
│   │   ├── route-scoring.service.ts        # Multi-criteria ranking
│   │   ├── transit-stop-finder.service.ts  # Nearby stop detection
│   │   ├── context-aware.service.ts        # Time/weather/traffic context
│   │   ├── city-config.service.ts          # City profiles (8 Indian cities)
│   │   ├── google-directions.service.ts    # Google Directions client
│   │   ├── location.service.ts             # Geolocation + reverse geocode
│   │   └── route-storage.service.ts        # Route plan persistence
│   │
│   ├── hooks/
│   │   ├── useLiveLocation.ts     # Continuous GPS tracking
│   │   ├── useGeolocation.ts      # One-shot geolocation
│   │   └── useOfflineRouting.ts   # Offline route calculation hook
│   │
│   ├── types/
│   │   ├── multimodal.ts          # Core type definitions
│   │   └── pako.d.ts              # Module declaration for pako
│   │
│   └── data/
│       └── city-apps.json         # City-specific app database
│
├── docs/
│   └── ARCHITECTURE_DIAGRAM.md
│
├── .env.example                 # Environment variable template
├── next.config.ts               # Next.js + PWA config
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
└── package.json
```

---

## Available Pages & Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Static | Home dashboard — location, weather, quick actions, essential apps |
| `/essential-maps` | Static | Google Maps explorer with 1 km POI discovery + offline packs |
| `/essential-apps` | Static | City-specific transport app recommendations |
| `/route-options` | Static | Multimodal route planner (origin/destination → 4 route variants) |
| `/route-planning-example` | Static | Demo page for the offline routing engine |
| `/search-discovery` | Static | Place search via Google Places API with GPS-biased results |
| `/interactive-map` | Static | Redirects to `/essential-maps` |
| `/auth` | Static | Login / Sign-up page (Google OAuth + email/password) |
| `/about` | Static | About page |
| `/api/google-directions` | Dynamic | Proxy → Google Directions API |
| `/api/google-geocode` | Dynamic | Proxy → Google Geocoding API |
| `/api/google-places` | Dynamic | Proxy → Google Places API (nearby search) |
| `/api/google-places-search` | Dynamic | Proxy → Google Places API (text search) |
| `/api/google-transit` | Dynamic | Proxy → Google Places API (transit types) |

---

## Architecture

```
Browser
 │
 ├─ Pages (client components)
 │   ├── / ─────────────── HomeDashboard
 │   ├── /essential-maps ─ GoogleMapsExplorer (POIs, packs, navigation)
 │   ├── /essential-apps ─ City transport app links
 │   ├── /route-options ── Multimodal route comparison
 │   ├── /search-discovery  Place search (Google Places text search)
 │   └── /auth ──────────── Login / Sign-up (NextAuth)
 │
 ├─ API Routes (server-side proxies — keep API key secret)
 │   ├── /api/google-directions      → Google Directions API
 │   ├── /api/google-geocode         → Google Geocoding API
 │   ├── /api/google-places          → Google Places API (nearby)
 │   ├── /api/google-places-search   → Google Places API (text search)
 │   ├── /api/google-transit         → Google Places API (transit)
 │   └── /api/auth/*                 → NextAuth handlers
 │
 ├─ Routing Engine (client-side, partly offline)
 │   ├── MultimodalDecisionEngine   (distance-based estimation, 100 % offline)
 │   ├── EnhancedMultimodalEngine   (Google-powered, real directions)
 │   ├── RouteScoringEngine         (multi-criteria ranking)
 │   ├── ContextAwareDecisionEngine (time / weather / traffic)
 │   └── CityConfigurationManager   (8 Indian city profiles)
 │
 ├─ Offline Storage
 │   ├── localStorage  (POI cache, settings, theme, language)
 │   ├── IndexedDB     (offline packs via packManager, route cache with 3-day TTL)
 │   └── Service Worker (asset caching via Workbox)
 │
 ├─ Database (PostgreSQL + PostGIS)
 │   ├── Users, Accounts, Sessions (NextAuth)
 │   ├── Places, Reviews, Visit History (community)
 │   └── Geospatial queries (get_nearby_reviews, community_forum view)
 │
 └─ PWA
     ├── manifest.json  (standalone, start_url: /essential-maps)
     └── sw.js + workbox
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack hot-reload |
| `npm run build` | Production build |
| `npm run build:turbo` | Production build with Turbopack |
| `npm start` | Serve production build |
| `npm run lint` | ESLint check |
| `npm run prisma:generate` | Generate Prisma client from schema |
| `npm run prisma:migrate` | Run database migrations (development) |
| `npm run prisma:studio` | Open Prisma Studio (visual database browser) |

---

## Deployment

### Vercel (recommended)

```bash
npm i -g vercel
cd citynav-nextjs-app
vercel
```

Set these environment variables in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes |
| `GOOGLE_MAPS_API_KEY` | Yes |
| `DATABASE_URL` | For auth |
| `NEXTAUTH_URL` | For auth (set to your production URL) |
| `NEXTAUTH_SECRET` | For auth |
| `GOOGLE_CLIENT_ID` | For Google login |
| `GOOGLE_CLIENT_SECRET` | For Google login |

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t citynav .
docker run -p 3000:3000 \
  -e GOOGLE_MAPS_API_KEY=your_key \
  -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key \
  -e DATABASE_URL=postgresql://user:pass@host/citynav \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=your_secret \
  citynav
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` or `npm run dev -- -p 4000` |
| Location not working | Must be on `localhost` or HTTPS; check browser permissions |
| Maps show grey tiles | Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set and **Maps JavaScript API** is enabled |
| API routes return 403 | Verify `GOOGLE_MAPS_API_KEY` is set and the required APIs are enabled in Cloud Console |
| `prisma migrate` fails | Make sure PostgreSQL is running and `DATABASE_URL` is correct; check password |
| PostGIS extension error | Install PostGIS for your PostgreSQL version (see Step 5) |
| Google login not working | Verify `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set and redirect URI is `http://localhost:3000/api/auth/callback/google` |
| `NEXTAUTH_SECRET` error | Generate a secret: `openssl rand -base64 32` and set it in `.env.local` |
| Build fails | `rm -rf .next node_modules && npm install && npm run build` |
| Offline packs not saving | Use a modern browser in normal (not private) mode; check IndexedDB support |
| POIs not loading | Check browser console for API errors; ensure **Places API (New)** is enabled |
| Search returns no results | Ensure **Places API (New)** is enabled (not the legacy Places API) |

---

## Contributing

1. Fork & clone
2. `npm install`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make changes, ensure `npm run build` passes
5. Commit with conventional messages (`feat:`, `fix:`, `docs:`, etc.)
6. Open a Pull Request

### Areas for Contribution

- Additional city profiles & transport apps
- More language translations (Tamil, Telugu, Bengali)
- Real-time transit data integration
- Unit / integration tests
- Accessibility improvements

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

**Last updated: February 13, 2026** · Built with Next.js 15, React 19, TypeScript 5, and Google Maps Platform
