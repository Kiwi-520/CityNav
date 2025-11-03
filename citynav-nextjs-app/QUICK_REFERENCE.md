# CityNav Quick Reference

## 🚀 Quick Start

```bash
cd citynav-nextjs-app
npm run dev
```

**URL**: http://localhost:3001 (or next available port)

---

## 📍 Key Features & Routes

### Essential Maps

- **Route**: `/essential-maps`
- **Features**:
  - Real-time POI fetching from OpenStreetMap
  - Interactive map with Mapbox GL JS
  - POI filtering (hospitals, pharmacies, restaurants, etc.)
  - Location-based search

### Offline Onboarding

- **Route**: `/offline-onboarding`
- **Features**:
  - Feature tour
  - App setup wizard
  - Offline capabilities

### Search & Discovery

- **Route**: `/search-discovery`
- **Features**:
  - Location search
  - POI discovery
  - Nearby places

### Directions

- **Route**: `/directions`
- **Features**:
  - Route planning
  - Turn-by-turn navigation
  - Multiple route options

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## 📂 Important Files

### Configuration

- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `.env.local` - Environment variables (Mapbox token)

### Core Services

- `src/services/osm.service.ts` - OpenStreetMap API integration
- `src/features/essential-maps/components/MapboxMapComponent.tsx` - Map display

### Entry Points

- `src/app/page.tsx` - Homepage
- `src/app/layout.tsx` - Root layout
- `src/app/globals.css` - Global styles

---

## 🌍 Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

---

## 🔍 POI Types Supported

- `hospital` - Hospitals and clinics
- `pharmacy` - Pharmacies
- `restaurant` - Restaurants
- `cafe` - Cafés
- `hotel` - Hotels
- `atm` - ATMs
- `bank` - Banks
- `fuel` - Fuel stations
- `restroom` - Public restrooms
- `water` - Drinking water fountains
- `food` - Fast food outlets
- `park` - Parks
- `police` - Police stations
- `fire_station` - Fire stations

---

## 🛠️ Troubleshooting

### Port Already in Use

If port 3000 is in use, Next.js will automatically use the next available port (e.g., 3001).

### TypeScript Errors

Run `npm run lint` to check for errors.

### Map Not Loading

1. Check `.env.local` for valid Mapbox token
2. Verify internet connection
3. Check browser console for errors

### POI Not Appearing

1. Grant location permissions
2. Check internet connection
3. Verify OSM service is running (check console for errors)

---

## 📝 Recent Changes

- ✅ Fixed all TypeScript compilation errors
- ✅ Removed unnecessary documentation files
- ✅ Fixed OSM service file corruption
- ✅ Verified all features are working
- ✅ Development server running successfully

---

## 📞 Support

For issues or questions, refer to:

- `README.md` - Project overview
- `FINAL_STATUS.md` - Detailed project status
- `docs/research_paper.md` - Technical documentation

---

_Last updated: Current session_
