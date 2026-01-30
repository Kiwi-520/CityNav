# �️ CityNav - Smart City Navigation PWA

A modern Progressive Web App for intelligent city navigation with offline maps, multimodal route planning, and location-based services - built with Next.js 15, React 19, TypeScript, and Tailwind CSS 4.

![CityNav](https://img.shields.io/badge/CityNav-Next.js%20PWA-brightgreen) ![Status](https://img.shields.io/badge/Status-Production%20Ready-success) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![React](https://img.shields.io/badge/React-19.1-61dafb) ![Next.js](https://img.shields.io/badge/Next.js-15.5-black)

## 📋 Table of Contents
- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Key Features](#-key-features)
- [Multimodal Travel System](#-multimodal-route-planning-system) ⭐
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Setup Instructions](#-setup-instructions)
- [Available Pages](#-available-pages)
- [Implementation Details](#-implementation-details)
- [Contributing](#-contributing)
- [Current Status](#-current-status)

---

## 🌟 Overview

**CityNav** is an intelligent Progressive Web Application designed for urban navigation in Indian cities. It combines offline-first architecture with advanced multimodal route planning to provide comprehensive navigation solutions without requiring constant internet connectivity.

### **What Makes CityNav Unique?**
- **🧠 Intelligent Route Planning**: AI-powered decision engine for optimal transport mode combinations
- **📡 Offline-First**: Full functionality without internet - maps, POIs, and route calculations work offline
- **🚇 Indian Cities Optimized**: Tailored for Indian transport modes (Metro, Bus, Auto, Cab) and costs
- **🗺️ Location-Based Discovery**: 1 km radius POI discovery with 11+ categories
- **🌍 Multi-Language**: English, हिंदी, मराठी support
- **🌓 Theme System**: Dark, Light, and System themes with instant switching
- **📍 City-Aware**: Automatic city detection with location-specific app recommendations

---

## 🚀 Quick Start

### **For Non-Technical Users:**

#### 1. Install Required Software
First, install these tools (one-time setup):
- **Node.js** (Download from https://nodejs.org - choose the LTS version)
- **Git** (Download from https://git-scm.com)

#### 2. Download the Project
Open your terminal (Command Prompt on Windows, Terminal on Mac/Linux) and run:
```bash
git clone https://github.com/Kiwi-520/CityNav.git
cd CityNav/citynav-nextjs-app
```

#### 3. Install Dependencies
```bash
npm install
```
*This will download all required packages (may take 2-3 minutes)*

#### 4. Start the Application
```bash
npm run dev
```

#### 5. Open in Browser
Once you see "Ready in X seconds", open your browser and go to:
```
http://localhost:3000
```

That's it! The app is now running on your computer.

### **To Stop the App:**
Press `Ctrl + C` in the terminal

---

## ✨ Key Features

### 🧭 **Advanced Multimodal Route Planning** ⭐ CORE FEATURE
The crown jewel of CityNav - an intelligent decision engine that calculates optimal multi-transport routes:

**Smart Capabilities:**
- **5 Transport Modes**: Walk 🚶, Bus 🚌, Metro 🚇, Auto 🛺, Cab 🚗
- **4 Route Variants**: Fastest, Cheapest, Balanced, Comfort
- **Distance-Based Intelligence**: Automatically selects appropriate modes (walk <1km, auto 1-5km, metro/bus >5km)
- **Cost-Optimized**: Real Indian pricing (Metro ₹10-60, Bus ₹5-50, Auto ₹20/km, Cab ₹12-18/km)
- **100% Offline**: All calculations run in-browser using advanced graph algorithms
- **Journey Segmentation**: Step-by-step instructions with time and cost per segment
- **User Preferences**: Customize by budget limit, walking distance, and mode priorities

**Services Architecture:**
- [`multimodal.service.ts`](./citynav-nextjs-app/src/services/multimodal.service.ts) - Core decision engine
- [`enhanced-multimodal.service.ts`](./citynav-nextjs-app/src/services/enhanced-multimodal.service.ts) - Enhanced features
- [`journey-segmentation.service.ts`](./citynav-nextjs-app/src/services/journey-segmentation.service.ts) - Step-by-step breakdown
- [`route-scoring.service.ts`](./citynav-nextjs-app/src/services/route-scoring.service.ts) - Route ranking
- [`transit-stop-finder.service.ts`](./citynav-nextjs-app/src/services/transit-stop-finder.service.ts) - Stop detection
- [`context-aware.service.ts`](./citynav-nextjs-app/src/services/context-aware.service.ts) - Context-based optimization
- [`city-config.service.ts`](./citynav-nextjs-app/src/services/city-config.service.ts) - City-specific configurations

**Example Route** (12 km journey):
```
🚇 Metro + 🛺 Auto: 28 min, ₹75 (Recommended - Balanced)
🚗 Direct Cab: 25 min, ₹290 (Fastest)
🚌 Bus + 🚇 Metro: 50 min, ₹40 (Cheapest)
🚶 Walk + 🚌 Bus: 65 min, ₹30 (Eco-Friendly)
```

### 🗺️ **Offline Maps with POI Discovery**
Interactive maps with comprehensive offline capabilities:

**Features:**
- **Interactive Leaflet Maps**: OpenStreetMap tiles with custom styling
- **1 km Radius POI Discovery**: Real-time fetching from Overpass API
- **11 POI Categories**:
  - 🏥 Health & Emergency (Hospitals, Pharmacies, Police, Fire Stations)
  - 🏛️ Tourism (Museums, Monuments, Viewpoints, Tourist Attractions)
  - 💰 Financial (ATMs, Banks)
  - 🍽️ Food & Dining (Restaurants, Cafes, Fast Food)
- **Offline Pack Creation**: Save nearby POIs with pincode-based naming
  - Example: "Khopal Wadi, Ghatkopar - 400077"
  - Compressed storage using Pako (gzip)
  - IndexedDB persistence
- **Live GPS Tracking**: Real-time location with accuracy indicators
- **Category Filtering**: Color-coded markers for easy identification
- **Distance Calculation**: Haversine formula for accurate distances

**Implementation:**
- [`LeafletMap.tsx`](./citynav-nextjs-app/src/features/offline-onboarding/components/LeafletMap.tsx) - Main map component
- [`useNearbyPOIs.ts`](./citynav-nextjs-app/src/features/offline-onboarding/hooks/useNearbyPOIs.ts) - POI fetching logic
- [`packManager.ts`](./citynav-nextjs-app/src/features/offline-onboarding/lib/packManager.ts) - Offline storage

### 🏠 **Smart Home Dashboard**
Centralized navigation hub with location awareness:

**Components:**
- **Real-time Location Display**: City, state, and coordinates
- **Weather Integration**: Current conditions (temperature, humidity)
- **Quick Actions**: Search, Routes, Maps, Offline Packs
- **Essential Apps Section**: First 4 city-specific apps with "View All" link
- **Theme Toggle**: Dark/Light/System mode switcher in header
- **Language Selector**: English, हिंदी, मराठी
- **Status Indicators**: Online/offline status, location services state

**Implementation:**
- [`HomeDashboard.tsx`](./citynav-nextjs-app/src/app/home/HomeDashboard.tsx)
- [`useLiveLocation.ts`](./citynav-nextjs-app/src/hooks/useLiveLocation.ts)

### 📱 **Location-Based Essential Apps**
Curated app recommendations that automatically adapt to your city:

**Cities Covered:**
- **Mumbai**: Chalo, IRCTC, RailYatri, Mumbai Metro One, m-Indicator, BEST
- **Pune**: Chalo (PMPML), IRCTC, Pune Metro, Ola, RailYatri
- **Delhi**: DTC Bus Sewa, Delhi Metro Rail, IRCTC, Rapido, Uber
- **Bangalore**: Namma Metro, BMTC, Chalo, Rapido, Ola
- **Default**: Generic apps for other cities

**Features:**
- Automatic city detection via GPS + Reverse geocoding
- Category tags (Bus, Train, Metro, Taxi, Bike Taxi, Navigation)
- Direct download links (Play Store)
- Website links for web-based services
- Category filtering

**Implementation:**
- [`city-apps.json`](./citynav-nextjs-app/src/data/city-apps.json) - App database
- [`page.tsx`](./citynav-nextjs-app/src/app/essential-apps/page.tsx) - Apps listing page

### 🎨 **Advanced Theme System**
Complete dark mode implementation with persistence:

**Modes:**
- ☀️ **Light Mode**: Clean white backgrounds with dark text
- 🌙 **Dark Mode**: Dark slate backgrounds (#0f172a) with light text
- 🌍 **System Theme**: Automatically follows device preference

**Implementation:**
- Class-based switching on `<html>` element
- Tailwind `dark:` variants throughout codebase
- LocalStorage persistence across sessions
- Instant switching without reload
- [`ThemeProvider.tsx`](./citynav-nextjs-app/src/components/ThemeProvider.tsx)
- [`ThemeToggle.tsx`](./citynav-nextjs-app/src/components/ThemeToggle.tsx)

### 🔍 **Search & Discovery**
- Place search with auto-complete
- Category-based filtering
- Location-based results with distance sorting
- Recent searches history

### 🧭 **Navigation Components**
- Bottom navigation bar with active state indicators
- Page headers with back navigation
- Breadcrumb navigation for nested pages
- Responsive hamburger menu for mobile

---

## 📁 Project Structure

```
CityNav/
├── 📁 citynav-nextjs-app/              # Main Next.js application
│   ├── 📁 src/
│   │   ├── 📁 app/                     # Next.js 15 App Router
│   │   │   ├── page.tsx               # Root page (redirects to home)
│   │   │   ├── layout.tsx             # Root layout with navigation
│   │   │   ├── globals.css            # Global Tailwind styles
│   │   │   ├── head.tsx               # Custom head component
│   │   │   ├── pwa-register.tsx       # PWA registration
│   │   │   │
│   │   │   ├── 📁 home/
│   │   │   │   └── HomeDashboard.tsx  # Main dashboard component
│   │   │   │
│   │   │   ├── 📁 essential-maps/
│   │   │   │   └── page.tsx           # Offline maps page
│   │   │   │
│   │   │   ├── 📁 essential-apps/
│   │   │   │   └── page.tsx           # City-specific apps page
│   │   │   │
│   │   │   ├── 📁 route-options/
│   │   │   │   └── page.tsx           # Multimodal route planning (855 lines)
│   │   │   │
│   │   │   ├── 📁 search-discovery/
│   │   │   │   └── page.tsx           # Search functionality
│   │   │   │
│   │   │   ├── 📁 interactive-map/
│   │   │   │   └── page.tsx           # Interactive map view
│   │   │   │
│   │   │   └── 📁 about/
│   │   │       └── page.tsx           # About page
│   │   │
│   │   ├── 📁 components/              # Reusable UI components
│   │   │   ├── BottomNavigation.tsx   # Bottom nav bar
│   │   │   ├── PageHeader.tsx         # Page header with theme toggle
│   │   │   ├── QuickActions.tsx       # Dashboard quick actions
│   │   │   ├── Button.tsx             # Reusable button
│   │   │   ├── GeolocationPrompt.tsx  # Location permission
│   │   │   ├── ThemeProvider.tsx      # Theme context provider
│   │   │   ├── ThemeToggle.tsx        # Theme switcher
│   │   │   ├── RouteCard.tsx          # Route display card
│   │   │   ├── RouteComparison.tsx    # Route comparison view
│   │   │   ├── QuickDecisionView.tsx  # Quick route decision
│   │   │   ├── ManualCitySelection.tsx # Manual city picker
│   │   │   └── Onboarding.tsx         # Onboarding flow
│   │   │
│   │   ├── 📁 features/
│   │   │   └── 📁 offline-onboarding/
│   │   │       ├── 📁 components/
│   │   │       │   ├── LeafletMap.tsx           # Main Leaflet map
│   │   │       │   ├── PackManagerPanel.tsx     # Offline pack UI
│   │   │       │   ├── CategoryFilterSidebar.tsx # POI filters
│   │   │       │   ├── NavigationPanel.tsx      # Route navigation
│   │   │       │   ├── LocationDetailsHorizontal.tsx # Location display
│   │   │       │   ├── EssentialsNavSidebar.tsx # Floating nav
│   │   │       │   └── MapView.tsx              # Map wrapper
│   │   │       │
│   │   │       ├── 📁 hooks/
│   │   │       │   ├── useNearbyPOIs.ts         # Overpass API hook
│   │   │       │   ├── useOfflineLocation.ts    # Location management
│   │   │       │   └── useRoute.ts              # Route calculation
│   │   │       │
│   │   │       └── 📁 lib/
│   │   │           ├── packManager.ts           # IndexedDB storage
│   │   │           └── logger.ts                # Debug logging
│   │   │
│   │   ├── 📁 services/                # Business logic services
│   │   │   ├── multimodal.service.ts            # Core route engine
│   │   │   ├── enhanced-multimodal.service.ts   # Enhanced features
│   │   │   ├── journey-segmentation.service.ts  # Route breakdown
│   │   │   ├── route-scoring.service.ts         # Route ranking
│   │   │   ├── transit-stop-finder.service.ts   # Stop detection
│   │   │   ├── context-aware.service.ts         # Context optimization
│   │   │   ├── city-config.service.ts           # City configs
│   │   │   ├── location.service.ts              # Location utilities
│   │   │   ├── directions.service.ts            # Turn-by-turn
│   │   │   ├── route-storage.service.ts         # Route caching
│   │   │   ├── offline-storage.service.ts       # Offline data
│   │   │   ├── openstreetmap.service.ts         # OSM integration
│   │   │   └── osm.service.ts                   # OSM utilities
│   │   │
│   │   ├── 📁 types/                   # TypeScript definitions
│   │   │   ├── multimodal.ts          # Multimodal types (200+ lines)
│   │   │   └── pako.d.ts              # Pako type definitions
│   │   │
│   │   ├── 📁 data/                    # Static data files
│   │   │   ├── city-apps.json         # City-specific apps database
│   │   │   └── onboarding-content.json # Onboarding content
│   │   │
│   │   ├── 📁 hooks/                   # Custom React hooks
│   │   │   └── useLiveLocation.ts     # Live GPS tracking
│   │   │
│   │   └── 📁 styles/                  # Global styles
│   │       └── (Additional CSS files)
│   │
│   ├── 📁 public/                      # Static assets
│   │   ├── manifest.json              # PWA manifest
│   │   ├── sw.js                      # Service worker
│   │   ├── workbox-e43f5367.js       # Workbox runtime
│   │   └── 📁 images/                 # App images & icons
│   │
│   ├── 📁 docs/                        # Documentation
│   │   └── ARCHITECTURE_DIAGRAM.md    # System architecture
│   │
│   ├── package.json                   # Dependencies & scripts
│   ├── next.config.ts                 # Next.js configuration
│   ├── tailwind.config.js             # Tailwind CSS config
│   ├── postcss.config.mjs             # PostCSS config
│   ├── tsconfig.json                  # TypeScript config
│   └── eslint.config.mjs              # ESLint config
│
├── 📁 screens/                         # Prototype HTML screens (18 screens)
│   ├── welcome.html                   # Onboarding welcome
│   ├── feature-tour.html              # Feature tour
│   ├── location-permission.html       # Location access
│   ├── city-selection.html            # City picker
│   ├── setup-complete.html            # Setup completion
│   ├── login.html                     # Authentication
│   ├── home-dashboard.html            # Main dashboard
│   ├── interactive-map.html           # Map view
│   ├── search-discovery.html          # Search
│   ├── nearby-places.html             # Nearby POIs
│   ├── poi-details.html               # POI information
│   ├── route-options.html             # Route planning
│   ├── route-navigation.html          # Turn-by-turn
│   ├── directions-navigation.html     # Navigation
│   ├── profile-settings.html          # User profile
│   ├── feedback-modal.html            # Feedback
│   ├── loading-screen.html            # Loading
│   ├── 404-error.html                 # Error page
│   ├── privacy-policy.html            # Privacy
│   ├── offline-downloads.html         # Offline management
│   └── safety-features.html           # Safety features
│
├── 📁 scripts/                         # Utility scripts & data
│   ├── design-system.js               # Design system logic
│   ├── overpass_results.csv           # POI data results
│   ├── overpass_summary.csv           # POI summary
│   └── 📁 output/                     # Performance test results
│       ├── Mumbai_*.json              # Mumbai test data
│       ├── NewDelhi_*.json            # Delhi test data
│       └── RuralMontana_*.json        # Rural test data
│
├── 📁 styles/                          # Prototype styles
│   ├── base.css                       # Base styles
│   ├── components.css                 # Component styles
│   ├── design-tokens.css              # Design system tokens
│   └── screens.css                    # Screen-specific styles
│
├── 📁 docs/                            # Project documentation
│   ├── demo_script.md                 # Demo script
│   ├── research_paper.md              # Research paper
│   └── 📁 figures/                    # Documentation figures
│
├── index.html                         # Design system showcase
├── citynav-app.html                   # Complete app prototype
├── screen-test.html                   # Screen testing tool
├── package.json                       # Root package config
└── README.md                          # This file
```

### **Key Architecture Decisions**

1. **App Router (Next.js 15)**: Modern file-based routing with server components support
2. **TypeScript Throughout**: Complete type safety across the entire codebase
3. **Feature-Based Organization**: Related components, hooks, and logic grouped together
4. **Service Layer**: Separated business logic from UI components
5. **Offline-First**: IndexedDB + Service Workers for complete offline functionality
6. **Modular Services**: Each service handles a specific domain (routing, location, storage)
7. **Type-Safe**: Comprehensive TypeScript interfaces for all data structures

---

## 🛠 Technology Stack

### **Core Framework & Libraries**
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.5.2 | React framework with App Router and Turbopack |
| **React** | 19.1.0 | UI library with latest features |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |

### **Mapping & Geolocation**
| Technology | Version | Purpose |
|------------|---------|---------|
| **Leaflet** | 1.9.4 | Interactive maps library |
| **React Leaflet** | 5.0.0 | React components for Leaflet |
| **OpenStreetMap** | - | Map tiles (offline-capable) |
| **Overpass API** | - | POI data fetching |
| **Nominatim API** | - | Geocoding & reverse geocoding |

### **Data & Storage**
| Technology | Version | Purpose |
|------------|---------|---------|
| **IndexedDB** | Native | Offline pack storage |
| **Pako** | 2.1.0 | Gzip compression for offline data |
| **LocalStorage** | Native | User preferences (theme, language) |

### **Progressive Web App**
| Technology | Version | Purpose |
|------------|---------|---------|
| **next-pwa** | 5.6.0 | PWA functionality for Next.js |
| **Service Worker** | Native | Offline caching & background sync |
| **Workbox** | 7.3.0 | PWA tooling and strategies |

### **UI Components & Utilities**
| Technology | Version | Purpose |
|------------|---------|---------|
| **React Icons** | 5.5.0 | Comprehensive icon library |
| **Axios** | 1.11.0 | HTTP client for API requests |

### **APIs & Services**
- **OpenStreetMap Tiles**: https://tile.openstreetmap.org
- **Overpass API**: https://overpass-api.de/api/interpreter
- **Nominatim**: https://nominatim.openstreetmap.org

### **Development Tools**
| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 9.x | Code linting |
| **PostCSS** | Latest | CSS processing |
| **TypeScript ESLint** | Latest | TypeScript linting |

---

## 🔧 Setup Instructions

### **Prerequisites**
Before starting, ensure you have these installed:
- **Node.js 18+** (LTS recommended) - [Download](https://nodejs.org)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com)
- **Modern web browser** (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### **Installation Steps**

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Kiwi-520/CityNav.git
cd CityNav/citynav-nextjs-app
```

#### 2️⃣ Install Dependencies
```bash
npm install
```
*This installs all packages from package.json (~300MB, takes 2-3 minutes)*

#### 3️⃣ Start Development Server
```bash
npm run dev
```

You should see:
```
  ▲ Next.js 15.5.2
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Compiled in XXXms
 ✓ Ready in X.Xs
```

#### 4️⃣ Open in Browser
Navigate to: **http://localhost:3000**

The app should load with the home dashboard.

### **Available Scripts**

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run dev` | Start development server with hot reload | Development |
| `npm run build` | Build optimized production bundle | Production |
| `npm run build:turbo` | Build with Turbopack (faster) | Production |
| `npm start` | Start production server | After build |
| `npm run lint` | Run ESLint code checker | Code quality |

### **Building for Production**

#### Build the Application
```bash
npm run build
```

This creates an optimized build in the `.next` folder.

#### Start Production Server
```bash
npm start
```

The production server runs on `http://localhost:3000` by default.

### **Environment Configuration**

#### Optional: Create `.env.local` for custom settings
```bash
# .env.local (optional)
NEXT_PUBLIC_API_URL=https://your-api.com
NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

### **Port Configuration**

#### Change the default port (3000):
```bash
# Use custom port
npm run dev -- -p 4000
```

### **Troubleshooting**

#### Issue: Port 3000 already in use
```bash
# Find and kill process on port 3000
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### Issue: Dependencies not installing
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Issue: Build errors
```bash
# Update Next.js and dependencies
npm update
npm run build
```

#### Issue: TypeScript errors
```bash
# Check TypeScript configuration
npx tsc --noEmit
```

### **Development Tips**

1. **Hot Reload**: Changes auto-reload in browser (save files to see updates)
2. **Browser Console**: Press F12 to see logs and errors
3. **Location Services**: App requires HTTPS or localhost for geolocation
4. **Offline Testing**: Use Chrome DevTools → Network → "Offline" checkbox
5. **PWA Testing**: Use Lighthouse in DevTools for PWA audits

---

## � Available Pages

### **Main Application Routes**

| Route | Component | Description | Status |
|-------|-----------|-------------|--------|
| `/` | [page.tsx](./citynav-nextjs-app/src/app/page.tsx) | Root page (redirects to home) | ✅ Complete |
| `/home` | [HomeDashboard.tsx](./citynav-nextjs-app/src/app/home/HomeDashboard.tsx) | Main dashboard with location, weather, quick actions | ✅ Complete |
| `/essential-maps` | [page.tsx](./citynav-nextjs-app/src/app/essential-maps/page.tsx) | Offline maps with POI discovery (1 km radius) | ✅ Complete |
| `/essential-apps` | [page.tsx](./citynav-nextjs-app/src/app/essential-apps/page.tsx) | City-specific app recommendations | ✅ Complete |
| `/route-options` | [page.tsx](./citynav-nextjs-app/src/app/route-options/page.tsx) | Multimodal route planning (855 lines) | ✅ Complete |
| `/search-discovery` | [page.tsx](./citynav-nextjs-app/src/app/search-discovery/page.tsx) | Place search with filters | ✅ Complete |
| `/interactive-map` | [page.tsx](./citynav-nextjs-app/src/app/interactive-map/page.tsx) | Interactive map view | ✅ Complete |
| `/about` | [page.tsx](./citynav-nextjs-app/src/app/about/page.tsx) | About page | ✅ Complete |

### **Page Features Breakdown**

#### **1. Home Dashboard** (`/home`)
**Features:**
- Real-time GPS location display (city, state, coordinates)
- Weather information (temperature, humidity, conditions)
- Quick action buttons (Search, Routes, Maps, Offline Packs)
- Essential apps section (first 4 apps with "View All" link)
- Theme toggle (Dark/Light/System) in header
- Language selector (English, हिंदी, मराठी)
- Online/offline status indicator
- Bottom navigation bar

**Components Used:**
- `PageHeader` - Header with theme toggle
- `QuickActions` - Action button grid
- `BottomNavigation` - Bottom nav bar
- `useLiveLocation` hook - GPS tracking

#### **2. Essential Maps** (`/essential-maps`)
**Features:**
- Interactive Leaflet map with OpenStreetMap tiles
- 1 km radius POI discovery (11 categories)
- Category filtering with color-coded markers
- Offline pack creation with pincode-based naming
- Pack management (load/unload/delete)
- Live GPS tracking with accuracy indicator
- Distance calculation to POIs
- Category filter sidebar

**Components Used:**
- `LeafletMap` - Main map component
- `PackManagerPanel` - Pack management UI
- `CategoryFilterSidebar` - POI filters
- `LocationDetailsHorizontal` - Location display
- `useNearbyPOIs` hook - POI fetching
- `packManager` - IndexedDB storage

**POI Categories:**
- 🏥 Hospitals
- 💊 Pharmacies
- 🚓 Police Stations
- 🚒 Fire Stations
- 💰 ATMs
- 🍽️ Restaurants
- ☕ Cafes
- 🏛️ Museums
- 🗿 Monuments
- 🔭 Viewpoints
- 📸 Tourist Attractions

#### **3. Route Options** (`/route-options`)
**Features:**
- Multimodal route planning with 4 variants
- Origin and destination input
- Multiple route display (3-5 options)
- Detailed segment breakdown per route
- Cost and time estimates
- Mode icons and colors
- User preference controls (budget, walking distance)
- Quick decision view
- Route comparison table
- Export/save functionality

**Components Used:**
- `RouteCard` - Individual route display
- `RouteComparison` - Side-by-side comparison
- `QuickDecisionView` - Quick route selection
- `multimodalEngine` - Route calculation
- `enhancedMultimodalEngine` - Advanced features

**Route Types:**
- 🏃 **Fastest**: Minimum time, may cost more
- 💰 **Cheapest**: Minimum cost, may take longer
- ⚖️ **Balanced**: Optimal time-cost tradeoff
- 🛋️ **Comfort**: Preference for comfortable modes (metro/cab over bus/auto)

#### **4. Essential Apps** (`/essential-apps`)
**Features:**
- Location-based app filtering
- Category tags (Bus, Train, Metro, Taxi, etc.)
- App information cards
- Direct download links (Play Store)
- Website links
- Category filter chips
- Automatic city detection

**Cities Supported:**
- Mumbai (7 apps)
- Pune (5 apps)
- Delhi (5 apps)
- Bangalore (5 apps)
- Default (6 generic apps)

#### **5. Search & Discovery** (`/search-discovery`)
**Features:**
- Place search with auto-complete
- Category-based filtering
- Distance-based sorting
- Recent searches history
- Location-based results

#### **6. Interactive Map** (`/interactive-map`)
**Features:**
- Full-screen map view
- Location marker
- Pan and zoom controls
- Layer controls

---

## 🧩 Implementation Details

### **Multimodal Route Planning System**

#### **Architecture**
The routing system uses a graph-based approach with multiple services:

```typescript
// Main flow
RouteRequest → multimodalEngine → RouteResponse
              ↓
    [Decision Engine]
              ↓
    [Journey Segmentation]
              ↓
    [Route Scoring]
              ↓
    [4 Route Variants]
```

#### **Key Services**

**1. multimodal.service.ts** - Core Engine
- Distance-based mode selection
- Multi-leg route generation
- Cost and time calculation
- 4 route variants (fastest, cheapest, balanced, comfort)

**2. enhanced-multimodal.service.ts** - Advanced Features
- Transfer optimization
- Wait time estimation
- Weather-based adjustments
- Reliability scoring

**3. journey-segmentation.service.ts** - Breakdown
- Segment-by-segment instructions
- Mode transitions
- Time allocation per segment

**4. route-scoring.service.ts** - Ranking
- Multi-criteria scoring (time, cost, comfort, reliability)
- Weighted scoring based on preferences
- Route comparison logic

**5. transit-stop-finder.service.ts** - Stop Detection
- Nearest metro/bus stop finding
- Walk distance calculation
- Stop metadata

**6. context-aware.service.ts** - Context Optimization
- Time-of-day considerations
- Traffic patterns
- Peak/off-peak adjustments

**7. city-config.service.ts** - City Configurations
- City-specific pricing
- Available transport modes
- Operating hours

#### **Algorithm: Distance-Based Mode Selection**

```typescript
function selectModes(distance: number): TransportMode[] {
  if (distance < 1000) return ['walk'];
  if (distance < 5000) return ['walk', 'auto', 'bus'];
  if (distance < 15000) return ['metro', 'bus', 'auto'];
  return ['metro', 'bus', 'cab'];
}
```

#### **Route Calculation Flow**

1. **Input**: Origin, Destination, User Preferences
2. **Distance Calculation**: Haversine formula
3. **Mode Selection**: Based on distance thresholds
4. **Route Generation**: 
   - Fastest: Prioritize time
   - Cheapest: Prioritize cost
   - Balanced: Time-cost tradeoff
   - Comfort: Prefer comfortable modes
5. **Segmentation**: Break into steps
6. **Scoring**: Rank routes
7. **Output**: Array of MultimodalRoute objects

### **Offline Pack System**

#### **Storage Architecture**
```
IndexedDB
  └── citynav-packs
       └── packs (object store)
            ├── id (key)
            ├── name
            ├── center (lat, lng)
            ├── pois (compressed)
            ├── createdAt
            └── size
```

#### **Pack Creation Flow**

1. **Fetch POIs**: Overpass API query (1 km radius)
2. **Process Data**: Extract relevant fields
3. **Compress**: Pako gzip compression
4. **Store**: IndexedDB with metadata
5. **Name**: Auto-generate from geocoding

```typescript
// Example pack naming
const packName = `${neighbourhood}, ${suburb} - ${postcode}`;
// "Khopal Wadi, Ghatkopar - 400077"
```

#### **Pack Manager API**

```typescript
// Create pack
await packManager.createPack(name, center, pois);

// List packs
const packs = await packManager.listPacks();

// Load pack
const pack = await packManager.loadPack(id);

// Delete pack
await packManager.deletePack(id);
```

### **Location Services**

#### **Live GPS Tracking**

```typescript
// useLiveLocation hook
const { location, accuracy, loading, error } = useLiveLocation({
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
});
```

**Features:**
- Continuous position updates
- Accuracy indicators (High/Medium/Low)
- Error handling
- Battery optimization

#### **Reverse Geocoding**

```typescript
// Nominatim API
const response = await fetch(
  `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}`
);
const data = await response.json();
const city = data.address.city || data.address.town;
```

### **POI Discovery**

#### **Overpass API Integration**

```typescript
// Query nearby POIs
const query = `
  [out:json];
  (
    node["amenity"="hospital"](around:1000,${lat},${lon});
    node["amenity"="pharmacy"](around:1000,${lat},${lon});
  );
  out body;
`;

const response = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  body: query
});
```

**Categories Queried:**
- amenity: hospital, pharmacy, police, fire_station, atm, restaurant, cafe
- tourism: museum, monument, viewpoint, attraction

#### **POI Data Structure**

```typescript
interface POI {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  distance: number;
  address?: string;
  phone?: string;
  opening_hours?: string;
}
```

### **Theme System**

#### **Implementation**

```typescript
// ThemeProvider.tsx
const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

useEffect(() => {
  if (theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('appTheme', theme);
}, [theme]);
```

#### **Tailwind Configuration**

```typescript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode
        background: '#ffffff',
        foreground: '#0f172a',
        // Dark mode (applied with dark: prefix)
        'dark-background': '#0f172a',
        'dark-foreground': '#f8fafc'
      }
    }
  }
}
```

#### **Component Usage**

```tsx
<div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
  Content
</div>
```

### **PWA Features**

#### **Service Worker**

```javascript
// sw.js
const CACHE_NAME = 'citynav-v1';
const urlsToCache = [
  '/',
  '/essential-maps',
  '/essential-apps',
  '/route-options',
  '/styles/globals.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

#### **Manifest**

```json
{
  "name": "CityNav",
  "short_name": "CityNav",
  "description": "Smart City Navigation",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2E7D5E",
  "icons": [...]
}
```

### **Performance Optimizations**

1. **Code Splitting**: Automatic with Next.js App Router
2. **Image Optimization**: Next.js Image component
3. **Lazy Loading**: Dynamic imports for heavy components
4. **Caching**: Service Worker + IndexedDB
5. **Compression**: Gzip for offline data
6. **Tree Shaking**: Remove unused code

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### **Development Workflow**

#### **1. Fork & Clone**
```bash
# Fork the repository on GitHub first
git clone https://github.com/YOUR_USERNAME/CityNav.git
cd CityNav/citynav-nextjs-app
```

#### **2. Create Feature Branch**
```bash
# Always work on a feature branch, never main
git checkout -b feature/your-feature-name
```

**Branch Naming Conventions:**
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/update-description` - Documentation
- `refactor/component-name` - Code refactoring
- `perf/optimization-name` - Performance improvements

#### **3. Make Changes**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Make your changes
# Test thoroughly
```

#### **4. Commit Changes**
```bash
git add .
git commit -m "feat: add your feature description"
```

**Commit Message Conventions:**
- `feat:` - New feature (e.g., `feat: add offline route caching`)
- `fix:` - Bug fix (e.g., `fix: correct location accuracy calculation`)
- `docs:` - Documentation (e.g., `docs: update setup instructions`)
- `style:` - Code formatting (e.g., `style: format with prettier`)
- `refactor:` - Code refactoring (e.g., `refactor: simplify route scoring`)
- `perf:` - Performance (e.g., `perf: optimize POI rendering`)
- `test:` - Tests (e.g., `test: add route calculation tests`)
- `chore:` - Maintenance (e.g., `chore: update dependencies`)

#### **5. Push & Create Pull Request**
```bash
# Push to your fork
git push origin feature/your-feature-name

# Go to GitHub and create Pull Request
```

### **Pull Request Guidelines**

**PR Title Format:**
```
[Type] Brief description
```
Examples:
- `[Feature] Add real-time traffic integration`
- `[Fix] Correct dark mode theme switching`
- `[Docs] Update installation instructions`

**PR Description Template:**
```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] npm run dev works without errors
- [ ] npm run build completes successfully
- [ ] npm run lint passes
- [ ] Tested in Chrome/Firefox/Safari
- [ ] Tested on mobile device
- [ ] Tested offline functionality (if applicable)

## Screenshots (if applicable)
Add screenshots to show the changes

## Related Issues
Closes #issue_number
```

### **Code Style Guidelines**

#### **TypeScript**
```typescript
// Use explicit types
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // implementation
}

// Use interfaces for complex types
interface RouteSegment {
  mode: TransportMode;
  distance: number;
  duration: number;
}

// Use async/await over promises
async function fetchPOIs(location: Location): Promise<POI[]> {
  const response = await fetch(url);
  return response.json();
}
```

#### **React Components**
```tsx
// Use functional components with TypeScript
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ onClick, children, variant = 'primary' }: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}
```

#### **File Naming**
- Components: `PascalCase.tsx` (e.g., `RouteCard.tsx`)
- Services: `kebab-case.service.ts` (e.g., `multimodal.service.ts`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useLiveLocation.ts`)
- Types: `kebab-case.ts` (e.g., `multimodal.ts`)
- Utils: `kebab-case.ts` (e.g., `distance-calculator.ts`)

### **Testing Checklist**

Before submitting PR:
- [ ] Code runs without console errors
- [ ] Build completes successfully (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] All pages load correctly
- [ ] Navigation works properly
- [ ] Dark mode works (if applicable)
- [ ] Responsive on mobile
- [ ] Offline functionality works (if applicable)
- [ ] No TypeScript errors

### **Areas for Contribution**

We especially welcome contributions in these areas:

**High Priority:**
- 🌐 Additional language translations (Tamil, Telugu, Bengali, etc.)
- 🏙️ More cities in Essential Apps
- 🚦 Real-time traffic integration
- 📊 User analytics and route history
- 🔔 Push notifications for transit updates

**Medium Priority:**
- 🧪 Unit tests and integration tests
- 📱 Native mobile app (React Native)
- 🎙️ Voice navigation
- 🗺️ 3D map visualization
- 🚌 Real-time bus/metro tracking

**Documentation:**
- 📝 API documentation
- 🎥 Video tutorials
- 🌍 Translations for docs
- 📖 User guides

### **Getting Help**

- 💬 **Questions**: Open a GitHub Discussion
- 🐛 **Bugs**: Open a GitHub Issue with detailed description
- 💡 **Feature Requests**: Open a GitHub Issue with [Feature Request] tag
- 📧 **Email**: contact@citynav.app (if available)

### **Code Review Process**

1. **Automated Checks**: Linting and build checks run automatically
2. **Code Review**: Maintainers review within 48 hours
3. **Feedback**: Address review comments
4. **Approval**: At least one maintainer approval required
5. **Merge**: Maintainer merges the PR
6. **Cleanup**: Delete feature branch after merge

### **Recognition**

Contributors will be added to:
- README contributors section
- GitHub contributors list
- Release notes (for significant contributions)

---

## 🐛 Troubleshooting

### **Common Issues and Solutions**

#### **1. Application Won't Start**

**Symptom:** `npm run dev` fails or throws errors

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Try with specific Node version
nvm use 18
npm install
npm run dev
```

#### **2. Port Already in Use**

**Symptom:** "Port 3000 is already in use"

**Solutions:**
```bash
# Linux/Mac - Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Windows - Kill process
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Or use a different port
npm run dev -- -p 4000
```

#### **3. Location Not Working**

**Symptom:** "Location services not available"

**Possible Causes & Solutions:**
- **HTTPS Required**: Geolocation only works on HTTPS or localhost
  - Solution: Use `http://localhost:3000` (works) or deploy with HTTPS
  
- **Browser Permission Denied**: User denied location access
  - Solution: Click lock icon in address bar → Reset permissions
  
- **GPS Disabled**: Device GPS is off
  - Solution: Enable location services in device settings
  
- **Browser Compatibility**: Older browsers may not support geolocation
  - Solution: Update to latest Chrome, Firefox, or Safari

#### **4. Maps Not Loading**

**Symptom:** Map area shows gray tiles or nothing

**Possible Causes & Solutions:**
- **No Internet**: First load requires internet for tiles
  - Solution: Connect to internet, refresh page
  
- **Tile Server Down**: OpenStreetMap servers might be down
  - Solution: Wait and retry, or change tile URL in config
  
- **Leaflet CSS Missing**: Styles not loaded
  - Solution: Check that Leaflet CSS is imported in component
  
```typescript
// Add to component
import 'leaflet/dist/leaflet.css';
```

#### **5. Dark Mode Not Working**

**Symptom:** Theme doesn't switch or persists incorrectly

**Solutions:**
```typescript
// Clear localStorage and reset
localStorage.removeItem('appTheme');
location.reload();

// Check localStorage in DevTools
console.log(localStorage.getItem('appTheme'));

// Manually set theme
localStorage.setItem('appTheme', 'dark');
location.reload();
```

#### **6. Build Errors**

**Symptom:** `npm run build` fails

**Solutions:**
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build

# Check for missing dependencies
npm install
```

#### **7. TypeScript Errors**

**Symptom:** Type errors in IDE or build

**Solutions:**
```bash
# Ensure types are installed
npm install --save-dev @types/node @types/react @types/react-dom @types/leaflet

# Restart TypeScript server (VS Code)
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Check tsconfig.json
cat tsconfig.json
```

#### **8. Offline Packs Not Saving**

**Symptom:** Created packs disappear after refresh

**Possible Causes & Solutions:**
- **IndexedDB Not Supported**: Older browsers
  - Solution: Use modern browser (Chrome 90+, Firefox 88+, Safari 14+)
  
- **Storage Quota Exceeded**: Too much data
  - Solution: Delete old packs, clear browser data
  
- **Private Browsing**: IndexedDB disabled
  - Solution: Use normal browsing mode

```javascript
// Check IndexedDB support
if ('indexedDB' in window) {
  console.log('IndexedDB supported');
} else {
  console.log('IndexedDB NOT supported');
}

// Check storage quota
navigator.storage.estimate().then(estimate => {
  console.log(`Used: ${estimate.usage} / ${estimate.quota} bytes`);
});
```

#### **9. POI Not Loading**

**Symptom:** No POIs appear on map

**Possible Causes & Solutions:**
- **Overpass API Rate Limit**: Too many requests
  - Solution: Wait 60 seconds, try again
  
- **No POIs in Area**: Remote location with no data
  - Solution: Try different location or increase radius
  
- **API Error**: Overpass server down
  - Solution: Check browser console for errors, retry later

```javascript
// Check Overpass API status
fetch('https://overpass-api.de/api/status')
  .then(r => r.text())
  .then(console.log);
```

#### **10. Routing Not Working**

**Symptom:** Route calculation fails or no routes shown

**Possible Causes & Solutions:**
- **Invalid Coordinates**: Wrong lat/lng format
  - Solution: Check coordinates are valid numbers
  
- **Distance Too Small**: Origin and destination too close
  - Solution: Minimum 100m distance required
  
- **Distance Too Large**: Beyond supported range
  - Solution: Keep distances under 50 km

```typescript
// Debug route request
const request: RouteRequest = {
  origin: { lat: 19.0760, lng: 72.8777, name: "Mumbai" },
  destination: { lat: 28.7041, lng: 77.1025, name: "Delhi" },
  userPreferences: {}
};
console.log('Request:', request);
```

### **Performance Issues**

#### **Slow Loading**

**Solutions:**
```bash
# Use production build
npm run build
npm start

# Enable compression (if deploying)
# Add to next.config.ts
compress: true
```

#### **High Memory Usage**

**Solutions:**
- Clear browser cache (Ctrl + Shift + Delete)
- Delete old offline packs
- Close unused tabs
- Restart browser

### **Getting More Help**

If issues persist:

1. **Check Browser Console** (F12) for error messages
2. **Create GitHub Issue** with:
   - Exact error message
   - Steps to reproduce
   - Browser and OS version
   - Screenshots
3. **Search Existing Issues** on GitHub
4. **Ask in Discussions** for community help

### **Debug Mode**

Enable verbose logging:
```typescript
// Add to .env.local
NEXT_PUBLIC_DEBUG=true

// Check logs in console
localStorage.setItem('debug', '*');
```

---

## 🎉 Current Status

### ✅ **Completed Features**

#### **Core Application**
- ✅ Home dashboard with real-time location detection
- ✅ Weather display integration
- ✅ Quick action buttons (Search, Routes, Maps, Offline)
- ✅ Bottom navigation bar with active states
- ✅ Page headers with back navigation
- ✅ Responsive design (mobile + tablet + desktop)

#### **Multimodal Route Planning** ⭐
- ✅ Core decision engine (7 services)
- ✅ 5 transport modes (Walk, Bus, Metro, Auto, Cab)
- ✅ 4 route variants (Fastest, Cheapest, Balanced, Comfort)
- ✅ Distance-based intelligent mode selection
- ✅ Journey segmentation with step-by-step instructions
- ✅ Route scoring and ranking system
- ✅ User preference controls (budget, walking distance)
- ✅ Cost calculation with Indian pricing
- ✅ Time estimation per segment
- ✅ 100% offline calculation
- ✅ Complete TypeScript type definitions (200+ lines)
- ✅ Comprehensive UI (855 lines)

#### **Maps & Location**
- ✅ Interactive Leaflet maps with OpenStreetMap
- ✅ POI discovery (1 km radius, 11 categories)
- ✅ Offline pack creation with compression
- ✅ IndexedDB storage for offline packs
- ✅ Pincode-based pack naming
- ✅ Category filtering with color-coded markers
- ✅ Live GPS tracking with accuracy indicators
- ✅ Distance calculation (Haversine formula)
- ✅ Pack management UI (load/unload/delete)
- ✅ Overpass API integration

#### **Essential Apps**
- ✅ City-specific app recommendations
- ✅ Automatic city detection
- ✅ 4 major cities supported (Mumbai, Pune, Delhi, Bangalore)
- ✅ Default apps for other cities
- ✅ Category filtering (Bus, Train, Metro, Taxi, etc.)
- ✅ Direct download links (Play Store)
- ✅ Website integration

#### **Theme System**
- ✅ Complete dark mode implementation
- ✅ Light mode
- ✅ System theme (auto-detect)
- ✅ Tailwind dark: variants throughout
- ✅ LocalStorage persistence
- ✅ Instant switching without reload
- ✅ ThemeProvider context
- ✅ ThemeToggle component

#### **Internationalization**
- ✅ Multi-language support (3 languages)
- ✅ English (default)
- ✅ हिंदी (Hindi)
- ✅ मराठी (Marathi)
- ✅ Language selector in header
- ✅ LocalStorage persistence

#### **PWA Features**
- ✅ Service Worker implementation
- ✅ Manifest file
- ✅ Workbox integration
- ✅ Offline caching
- ✅ Install prompt
- ✅ PWA registration component

#### **Developer Experience**
- ✅ TypeScript throughout (100% typed)
- ✅ ESLint configuration
- ✅ Next.js 15 with App Router
- ✅ Turbopack support
- ✅ Hot module replacement
- ✅ Modular service architecture
- ✅ Custom hooks for reusability
- ✅ Component-based architecture

### 🎯 **Production Ready**
All core features are fully implemented and tested. The application is ready for deployment and user testing.

### 📊 **Code Statistics**

| Category | Lines of Code | Files |
|----------|---------------|-------|
| **Services** | ~3000+ | 13 |
| **Components** | ~2500+ | 15+ |
| **Pages** | ~1500+ | 8 |
| **Types** | ~200+ | 2 |
| **Hooks** | ~500+ | 4 |
| **Features** | ~2000+ | 10+ |
| **Total** | **~10,000+** | **50+** |

### 🏗️ **Architecture Highlights**

- **Service Layer**: 13 specialized services for business logic
- **Type Safety**: Comprehensive TypeScript interfaces
- **Offline-First**: Complete offline functionality
- **Modular Design**: Easy to maintain and extend
- **Performance**: Optimized with Next.js 15 + Turbopack
- **Scalable**: Clean architecture for future enhancements

### 📈 **Future Enhancements** (Optional)

While the application is production-ready, potential future improvements include:

- 🔄 Real-time transit data integration (when available)
- 🗺️ 3D building visualization
- 🚦 Traffic condition integration
- 📊 Route history and analytics
- 👥 Multi-user trip planning
- 🌐 More languages (Tamil, Telugu, Bengali, etc.)
- 🏙️ More cities in Essential Apps
- 🎙️ Voice navigation
- 🔔 Push notifications for transit updates
- 📱 Native mobile apps (React Native)

---

## 🚀 Deployment

### **Vercel (Recommended)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Kiwi-520/CityNav)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd citynav-nextjs-app
vercel
```

### **Netlify**

```bash
# Build command
npm run build

# Publish directory
.next

# Deploy
npm install -g netlify-cli
netlify deploy --prod
```

### **Docker**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t citynav .
docker run -p 3000:3000 citynav
```

### **Environment Variables**

For production deployment, set these in your hosting platform:

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api.com
NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 CityNav

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

### **Technologies & Services**
- **Next.js** - The React Framework for Production
- **React** - A JavaScript library for building user interfaces
- **TypeScript** - JavaScript with syntax for types
- **Tailwind CSS** - A utility-first CSS framework
- **Leaflet** - Leading open-source JavaScript library for mobile-friendly interactive maps
- **OpenStreetMap** - Free, editable map of the whole world
- **Overpass API** - Read-only API serving custom selected parts of OSM data
- **Nominatim** - Search engine for OpenStreetMap data

### **Open Source Libraries**
- **React Leaflet** - React components for Leaflet maps
- **React Icons** - Popular icon sets as React components
- **Axios** - Promise-based HTTP client
- **Pako** - High-speed zlib port to JavaScript
- **Workbox** - JavaScript libraries for Progressive Web Apps

### **Data Sources**
- **OpenStreetMap Contributors** - Mapping data © OpenStreetMap contributors
- **Weather Data** - (If integrated) Weather service provider
- **Transit Data** - City-specific transit authorities

### **Inspiration & References**
- Material Design 3 Guidelines
- Progressive Web App Best Practices
- Indian Smart Cities Mission
- Urban Mobility Research

### **Special Thanks**
- All contributors who have helped improve CityNav
- The open-source community for amazing tools and libraries
- OpenStreetMap community for comprehensive mapping data
- Beta testers and early users for valuable feedback

---

## 📞 Contact & Support

### **Project Links**
- 🌐 **Website**: https://citynav.app (if available)
- 💻 **GitHub**: https://github.com/Kiwi-520/CityNav
- 📧 **Email**: contact@citynav.app (if available)
- 🐦 **Twitter**: @CityNavApp (if available)

### **For Contributors**
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Kiwi-520/CityNav/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Kiwi-520/CityNav/issues)
- 📖 **Wiki**: [GitHub Wiki](https://github.com/Kiwi-520/CityNav/wiki)

### **For Users**
- 📱 **App Support**: Open GitHub Issue
- 💡 **Feature Requests**: Open GitHub Issue with [Feature Request] tag
- 🔒 **Security Issues**: Email security@citynav.app (if available)

---

## 📊 Project Status & Metrics

![GitHub stars](https://img.shields.io/github/stars/Kiwi-520/CityNav?style=social)
![GitHub forks](https://img.shields.io/github/forks/Kiwi-520/CityNav?style=social)
![GitHub issues](https://img.shields.io/github/issues/Kiwi-520/CityNav)
![GitHub pull requests](https://img.shields.io/github/issues-pr/Kiwi-520/CityNav)
![GitHub license](https://img.shields.io/github/license/Kiwi-520/CityNav)

### **Project Timeline**
- **v0.1.0** - Initial prototype with basic features
- **v0.2.0** - Multimodal routing engine implementation
- **v0.3.0** - Offline maps and PWA features
- **v1.0.0** - Production-ready release (Current)

### **Key Milestones**
- ✅ 50+ files created
- ✅ 10,000+ lines of code
- ✅ 13 specialized services
- ✅ 8 main pages
- ✅ 15+ reusable components
- ✅ 100% TypeScript coverage
- ✅ Complete dark mode
- ✅ Offline-first architecture
- ✅ PWA ready

---

## 🎯 Roadmap

### **Version 1.1** (Q2 2026)
- [ ] Real-time transit data integration
- [ ] Push notifications
- [ ] User accounts and profiles
- [ ] Route history and favorites
- [ ] More cities (10+ cities)

### **Version 1.2** (Q3 2026)
- [ ] Native mobile apps (iOS/Android)
- [ ] Voice navigation
- [ ] Accessibility improvements
- [ ] More languages (10+ languages)

### **Version 2.0** (Q4 2026)
- [ ] 3D building visualization
- [ ] AR navigation
- [ ] Social features
- [ ] Traffic prediction AI
- [ ] Electric vehicle routing

---

**Last Updated: January 30, 2026**

**Version: 1.0.0**

**Status: ✅ Production Ready | 🚀 Ready for Deployment | 📱 PWA Enabled**

**Made with ❤️ by the CityNav Team**

**Built using Next.js 15, React 19, TypeScript 5, and modern web technologies**

---

<div align="center">

### ⭐ Star us on GitHub — it motivates us a lot!

[⬆ Back to Top](#️-citynav---smart-city-navigation-pwa)

</div>
