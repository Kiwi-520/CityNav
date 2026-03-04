# CityNav — Smart City Navigation PWA

A Progressive Web App for intelligent city navigation with Google Maps, multimodal route planning, offline POI packs, and location-based services — built with **Next.js 15**, **React 19**, **TypeScript 5**, and **Tailwind CSS 4**.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black) ![React](https://img.shields.io/badge/React-19.1-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![PWA](https://img.shields.io/badge/PWA-Enabled-brightgreen)

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Environment Variables & API Setup](#environment-variables--api-setup)
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
- **Offline-first** — POI packs compressed with pako and stored in IndexedDB; service worker caches assets
- **Indian-city optimised** — Real pricing, city-specific transport apps (Mumbai, Pune, Delhi, Bangalore, and more)
- **PWA** — Installable, standalone, works offline

---

## Quick Start

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ (LTS recommended) | https://nodejs.org |
| npm | comes with Node.js | — |
| Git | any recent | https://git-scm.com |

### 1. Clone & install

```bash
git clone https://github.com/Kiwi-520/CityNav.git
cd CityNav/citynav-nextjs-app
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and paste your Google Maps API key(s)
```

See [Environment Variables & API Setup](#environment-variables--api-setup) for details.

### 3. Run

```bash
npm run dev          # development (Turbopack)
# or
npm run build && npm start   # production
```

Open **http://localhost:3000** in your browser.

---

## Environment Variables & API Setup

### `.env.local` (required)

Copy the provided `.env.example`:

```dotenv
# Client-side — loaded by @react-google-maps/api in the browser
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here

# Server-side — used by Next.js API routes (never exposed to the browser)
GOOGLE_MAPS_API_KEY=your_key_here
```

> **Tip:** During development you can use the same key for both variables. For production, create two keys with different restrictions (HTTP referrer for client, IP restriction for server).

### Google Cloud Console — APIs to Enable

Go to **Google Cloud Console → APIs & Services → Library** and enable:

| # | API Name | Used By | Purpose |
|---|----------|---------|---------|
| 1 | **Maps JavaScript API** | Client (`RouteNavigationView`, `GoogleMapView`) | Renders interactive maps in the browser |
| 2 | **Directions API** | Server (`/api/google-directions`) | Route planning (driving, walking, transit) |
| 3 | **Geocoding API** | Server (`/api/google-geocode`) | Address ↔ coordinate conversion |
| 4 | **Places API (New)** | Server (`/api/google-places`, `/api/google-transit`) | Nearby place search, place details |

### How to Create a Key

1. Go to https://console.cloud.google.com/google/maps-apis/credentials
2. Click **+ CREATE CREDENTIALS → API key**
3. (Optional) Restrict the key:
   - *Client key*: **Application restrictions → HTTP referrers** → add `http://localhost:3000/*` and your production domain
   - *Server key*: **Application restrictions → IP addresses** → add your server IP
4. Copy the key into `.env.local`

> Google Maps Platform includes a **$200/month free credit** (~28 000 dynamic map loads).

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
- Directions, geocoding, and nearby-place search

### Offline POI Packs

- 1 km radius POI discovery via Google Places API
- 11+ POI categories (hospitals, ATMs, restaurants, museums, etc.)
- Packs compressed with **pako** (gzip) and stored in **IndexedDB**
- Auto-named from reverse geocode (e.g. *"Ghatkopar, Mumbai — 400077"*)

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
| `next-pwa` | 5.6.0 | PWA service-worker generation |
| `pako` | 2.1.0 | Gzip compression for offline packs |
| `react-icons` | 5.5.0 | Feather icon set (`Fi*`) |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` 5 | Type-safe JavaScript |
| `tailwindcss` 4 + `@tailwindcss/postcss` | Utility-first CSS |
| `eslint` 9 + `eslint-config-next` | Linting |
| `@types/node`, `@types/react`, `@types/react-dom`, `@types/next-pwa` | Type definitions |
| `@eslint/eslintrc` | ESLint flat-config compatibility |

### External APIs

| API | Provider | Auth |
|-----|----------|------|
| Maps JavaScript API | Google | API key (client) |
| Directions API | Google | API key (server) |
| Geocoding API | Google | API key (server) |
| Places API (New) | Google | API key (server) |

---

## Project Structure

```
citynav-nextjs-app/
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service worker
│   ├── workbox-*.js             # Workbox runtime
│   └── images/                  # Icons & assets
│
├── src/
│   ├── app/                     # Next.js 15 App Router
│   │   ├── layout.tsx           # Root layout (BottomNavigation, globals.css)
│   │   ├── page.tsx             # / → HomeDashboard
│   │   ├── globals.css          # Material Design 3 variables + Tailwind
│   │   ├── pwa-register.tsx     # Service-worker registration
│   │   │
│   │   ├── home/
│   │   │   └── HomeDashboard.tsx
│   │   ├── essential-maps/
│   │   │   └── page.tsx         # Google Maps + POI explorer
│   │   ├── essential-apps/
│   │   │   └── page.tsx         # City-specific apps
│   │   ├── route-options/
│   │   │   └── page.tsx         # Multimodal route planner
│   │   ├── route-planning-example/
│   │   │   └── page.tsx         # Demo / test page
│   │   ├── search-discovery/
│   │   │   └── page.tsx         # Place search
│   │   ├── interactive-map/
│   │   │   └── page.tsx         # Redirects to /essential-maps
│   │   ├── about/
│   │   │   └── page.tsx
│   │   │
│   │   └── api/                 # Server-side API proxies
│   │       ├── google-directions/route.ts
│   │       ├── google-geocode/route.ts
│   │       ├── google-places/route.ts
│   │       └── google-transit/route.ts
│   │
│   ├── components/              # Shared UI components
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
│   │       │   ├── EssentialsNavSidebar.tsx
│   │       │   ├── LocationDetailsHorizontal.tsx
│   │       │   ├── NavigationPanel.tsx
│   │       │   └── PackManagerPanel.tsx
│   │       ├── hooks/
│   │       │   ├── useNearbyPOIs.ts
│   │       │   ├── useOfflineLocation.ts
│   │       │   └── useRoute.ts
│   │       └── lib/
│   │           ├── packManager.ts   # IndexedDB pack CRUD
│   │           └── logger.ts
│   │
│   ├── services/                # Business-logic layer
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
│   │   ├── useLiveLocation.ts   # Continuous GPS tracking
│   │   ├── useGeolocation.ts    # One-shot geolocation
│   │   └── useOfflineRouting.ts # Offline route calculation hook
│   │
│   ├── types/
│   │   ├── multimodal.ts        # Core type definitions
│   │   └── pako.d.ts            # Module declaration for pako
│   │
│   └── data/
│       └── city-apps.json       # City-specific app database
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
| `/search-discovery` | Static | Place search with category filters |
| `/interactive-map` | Static | Redirects to `/essential-maps` |
| `/about` | Static | About page |
| `/api/google-directions` | Dynamic | Proxy → Google Directions API |
| `/api/google-geocode` | Dynamic | Proxy → Google Geocoding API |
| `/api/google-places` | Dynamic | Proxy → Google Places API (New) |
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
 │   └── /search-discovery  Place search
 │
 ├─ API Routes (server-side proxies — keep API key secret)
 │   ├── /api/google-directions → Google Directions API
 │   ├── /api/google-geocode    → Google Geocoding API
 │   ├── /api/google-places     → Google Places API (New)
 │   └── /api/google-transit    → Google Places API (transit types)
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
 │   ├── IndexedDB     (offline packs via packManager, route cache)
 │   └── Service Worker (asset caching via Workbox)
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

---

## Deployment

### Vercel (recommended)

```bash
npm i -g vercel
cd citynav-nextjs-app
vercel
```

Set `GOOGLE_MAPS_API_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in the Vercel dashboard under **Settings → Environment Variables**.

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t citynav .
docker run -p 3000:3000 \
  -e GOOGLE_MAPS_API_KEY=your_key \
  -e NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key \
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
| Build fails | `rm -rf .next node_modules && npm install && npm run build` |
| Offline packs not saving | Use a modern browser in normal (not private) mode; check IndexedDB support |
| POIs not loading | Check browser console for API errors; ensure **Places API (New)** is enabled |

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
