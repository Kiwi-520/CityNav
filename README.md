# �️ CityNav - Smart City Navigation PWA

A modern Progressive Web App for city navigation with offline maps, location-based services, and essential city apps - built with Next.js 15, TypeScript, and Tailwind CSS.

![CityNav](https://img.shields.io/badge/CityNav-Next.js%20PWA-brightgreen) ![Status](https://img.shields.io/badge/Status-Active%20Development-success) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 📋 Table of Contents
- [Quick Start](#-quick-start)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Technology Stack](#-technology-stack)
- [Setup Instructions](#-setup-instructions)
- [Available Features](#-available-features)
- [Contributing](#-contributing)

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

## ✨ Features

### 🏠 **Home Dashboard**
- Real-time location detection with weather display
- Quick access to search, routes, maps, and offline features
- Essential city apps section (automatically changes based on your location)
- Multi-language support (English, हिंदी, मराठी)
- Dark mode / Light mode / System theme

### 🗺️ **Essential Maps (Offline-Ready)**
- Interactive Leaflet map with OpenStreetMap tiles
- **1 km radius** location-based POI discovery
- Categories: Hospitals, Police Stations, Fire Stations, Pharmacies, ATMs, Restaurants, Cafes, Tourist Attractions, Museums, Monuments, Viewpoints
- **Offline Pack Creation**: Save nearby POIs for offline access with pincode-based naming
- **Live GPS tracking** with accuracy indicators
- Category filtering with color-coded markers
- POI details with distance calculation
- Turn-by-turn navigation ready

### 📱 **Essential Apps**
Location-based app recommendations that automatically change based on your city:

**Mumbai:**
- 🚌 Chalo (Bus tracking)
- 🚂 IRCTC Rail Connect
- 🚆 RailYatri
- 🚇 Mumbai Metro One
- 🕐 m-Indicator (Local train timings)
- 🚖 Uber
- 🚍 BEST Undertaking

**Pune:**
- 🚌 Chalo (PMPML Bus)
- 🚂 IRCTC Rail Connect
- 🚇 Pune Metro
- 🚖 Ola
- 🚆 RailYatri

**Delhi:**
- 🚌 DTC Bus Sewa
- 🚇 Delhi Metro Rail
- 🚂 IRCTC Rail Connect
- 🏍️ Rapido
- 🚖 Uber

**Bangalore:**
- 🚇 Namma Metro
- 🚌 BMTC Official
- 🚍 Chalo
- 🏍️ Rapido
- 🚖 Ola

*+ Generic apps for other cities*

### 🔍 **Search & Discovery**
- Place search functionality
- Category-based filtering
- Location-based results

### 🧭 **Route Planning**
- Route options with multiple alternatives
- Distance and time estimates
- Interactive route visualization

### 🎨 **Theming & Personalization**
- **Dark Mode**: Full dark theme support across entire app
- **Light Mode**: Clean, modern light interface
- **System Theme**: Automatically follows device preference
- **Language Selection**: English, हिंदी, मराठी
- Settings accessible via gear icon in header

---

## 📁 Project Structure

```
citynav-nextjs-app/
├── 📁 src/
│   ├── 📁 app/                          # Next.js 15 App Router
│   │   ├── page.tsx                    # Home page (main entry)
│   │   ├── layout.tsx                  # Root layout with navigation
│   │   ├── globals.css                 # Global styles
│   │   ├── 📁 home/
│   │   │   └── HomeDashboard.tsx       # Main dashboard with location & apps
│   │   ├── 📁 essential-maps/
│   │   │   └── page.tsx                # Offline maps feature
│   │   ├── 📁 essential-apps/
│   │   │   └── page.tsx                # City-specific app recommendations
│   │   ├── 📁 search-discovery/
│   │   │   └── page.tsx                # Search functionality
│   │   └── 📁 route-options/
│   │       └── page.tsx                # Route planning
│   │
│   ├── 📁 components/                   # Reusable UI components
│   │   ├── BottomNavigation.tsx        # Bottom nav bar
│   │   ├── PageHeader.tsx              # Page header with dark mode
│   │   ├── QuickActions.tsx            # Quick action buttons
│   │   ├── Button.tsx                  # Button component
│   │   └── GeolocationPrompt.tsx       # Location permission
│   │
│   ├── 📁 features/
│   │   └── 📁 offline-onboarding/
│   │       ├── 📁 components/
│   │       │   ├── LeafletMap.tsx      # Main map component
│   │       │   ├── PackManagerPanel.tsx # Offline pack management
│   │       │   ├── CategoryFilterSidebar.tsx # POI category filters
│   │       │   ├── NavigationPanel.tsx  # Route navigation
│   │       │   ├── LocationDetailsHorizontal.tsx # Location display
│   │       │   ├── EssentialsNavSidebar.tsx # Floating nav button
│   │       │   └── MapView.tsx         # Map rendering
│   │       ├── 📁 hooks/
│   │       │   ├── useNearbyPOIs.ts    # Overpass API POI fetching
│   │       │   ├── useOfflineLocation.ts # Location management
│   │       │   └── useRoute.ts         # Route calculation
│   │       └── 📁 lib/
│   │           ├── packManager.ts      # IndexedDB offline storage
│   │           └── logger.ts           # Debug logging
│   │
│   ├── 📁 data/
│   │   ├── city-apps.json              # City-specific app data
│   │   └── onboarding-content.json     # Onboarding content
│   │
│   ├── 📁 hooks/
│   │   └── useLiveLocation.ts          # Live GPS tracking
│   │
│   └── 📁 services/
│       └── (API services)
│
├── 📁 public/
│   ├── manifest.json                   # PWA manifest
│   ├── sw.js                          # Service worker
│   └── 📁 images/                     # App images & icons
│
├── package.json                        # Dependencies & scripts
├── next.config.ts                     # Next.js configuration
├── tailwind.config.js                 # Tailwind CSS config
└── tsconfig.json                      # TypeScript config
```

---

## 🛠 Technology Stack

### **Core Technologies**
- **Next.js 15.5.2** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework

### **Mapping & Location**
- **Leaflet 1.9.4** - Interactive maps
- **React Leaflet 5.0.0** - React wrapper for Leaflet
- **OpenStreetMap** - Map tiles (offline-capable)
- **Overpass API** - POI data fetching
- **Nominatim API** - Geocoding & reverse geocoding

### **Data & Storage**
- **IndexedDB** - Offline pack storage via packManager
- **Pako** - Gzip compression for offline data
- **LocalStorage** - User preferences (theme, language)

### **PWA Features**
- **next-pwa 5.6.0** - Progressive Web App functionality
- **Service Worker** - Offline caching
- **Workbox** - PWA tooling

### **UI & Icons**
- **React Icons 5.5.0** - Icon library
- **Axios 1.11.0** - HTTP client

---

## 🔧 Setup Instructions

### **Prerequisites**
- **Node.js 18+** (Download: https://nodejs.org)
- **npm** (comes with Node.js)
- **Git** (Download: https://git-scm.com)

### **Step-by-Step Setup**

#### 1. Clone Repository
```bash
git clone https://github.com/Kiwi-520/CityNav.git
cd CityNav/citynav-nextjs-app
```

#### 2. Install Dependencies
```bash
npm install
```

*This installs all required packages listed in package.json*

#### 3. Run Development Server
```bash
npm run dev
```

#### 4. Build for Production (Optional)
```bash
npm run build
npm start
```

### **Available Scripts**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (http://localhost:3000) |
| `npm run build` | Build production-ready app |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint code checker |

---

## 🎯 Available Features

### **1. Home Page** (`/`)
- **Location Display**: Shows current city, state, and weather
- **Quick Actions**: Search, Routes, Maps, Offline Packs
- **Essential Apps**: First 4 city-specific apps with "View All" link
- **Settings Menu**: Language selector + Theme switcher
- **Status Bar**: Online/offline indicator, location services status

### **2. Essential Maps** (`/essential-maps`)
- **Interactive Map**: Leaflet with OpenStreetMap tiles
- **POI Categories**:
  - 🏥 Health & Emergency (Hospitals, Pharmacies, Police, Fire Stations)
  - 🏛️ Tourist Attractions (Museums, Monuments, Viewpoints, Tourist Spots)
  - 💰 Financial (ATMs, Banks)
  - 🍽️ Food & Drink (Restaurants, Cafes, Fast Food)
- **Search Radius**: 1 km from current location
- **Offline Packs**:
  - Create pack with current location + pincode
  - Auto-naming: "Area, Broader Location - Pincode" (e.g., "Khopal Wadi, Ghatkopar - 400077")
  - Stores all nearby POIs for offline access
  - Load/unload packs via floating sidebar button
- **Location Details**: City/town prioritized over neighborhood
- **Live GPS**: Real-time location tracking with accuracy badges

### **3. Essential Apps** (`/essential-apps`)
- **Location-Aware**: Automatically shows apps for detected city
- **Categories**: Bus, Train, Metro, Taxi, Bike Taxi, Navigation
- **App Info**: Name, icon, category tag, description
- **Actions**: Download app (Play Store) or visit website
- **Category Filtering**: Filter apps by type
- **Cities Covered**: Mumbai, Pune, Delhi, Bangalore + Default

### **4. Search & Discovery** (`/search-discovery`)
- Place search with filters
- Location-based results
- Category organization

### **5. Route Options** (`/route-options`)
- Multiple route alternatives
- Distance and time estimates
- Route comparison

### **Theme System**
- ☀️ **Light Mode**: White backgrounds, dark text
- 🌙 **Dark Mode**: Dark backgrounds, light text
- 🌍 **System Theme**: Follows device preference
- Persistent across sessions (saved in localStorage)
- Instant switching without page reload

### **Language Support**
- 🇬🇧 English
- 🇮🇳 हिंदी (Hindi)
- 🇮🇳 मराठी (Marathi)
- Saved in localStorage for persistence

---

## 🧩 Key Implementation Details

### **Offline Pack System**
```typescript
// Location naming format
const locationName = `${neighbourhood}, ${suburb/city_district} - ${postcode}`;
// Example: "Khopal Wadi, Ghatkopar - 400077"

// POI storage
- Compressed with Pako (gzip)
- Stored in IndexedDB
- 1 km radius from pack center
- All categories included
```

### **Dark Mode Implementation**
```typescript
// Theme is applied via class on root element
document.documentElement.classList.add('dark');  // Dark mode
document.documentElement.classList.remove('dark'); // Light mode

// All components use Tailwind dark: variants
className="bg-white dark:bg-slate-800"
```

### **City Detection**
```typescript
// Reverse geocoding with Nominatim
1. Get GPS coordinates
2. Reverse geocode to get address
3. Extract city/town
4. Load city-specific apps from city-apps.json
5. Fallback to "default" if city not found
```

---

## 🤝 Contributing

### **Branch Strategy**
```bash
# Never push directly to main!

# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes and commit
git add .
git commit -m "feat: add your feature description"

# 3. Push branch
git push origin feature/your-feature-name

# 4. Create Pull Request on GitHub
```

### **Commit Conventions**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code formatting
- `refactor:` - Code refactoring
- `perf:` - Performance improvements

---

## 🐛 Troubleshooting

### **App Won't Start**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### **Location Not Working**
- Allow location permission in browser
- Check HTTPS connection (required for geolocation)
- Verify GPS is enabled on device

### **Maps Not Loading**
- Check internet connection for initial tile download
- OpenStreetMap tiles cache in browser after first load

### **Dark Mode Not Working**
- Check if theme is saved: Open DevTools → Application → Local Storage → appTheme
- Try manually switching theme in settings

---

## 📞 Support

### **For Issues:**
1. Check this README first
2. Open browser console (F12) to see errors
3. Create issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Browser and OS version

---

## 🎉 Current Status

### ✅ **Completed Features**
- ✅ Home dashboard with location detection
- ✅ Essential maps with offline packs (1 km radius)
- ✅ Essential apps (city-specific recommendations)
- ✅ Dark mode / Light mode / System theme
- ✅ Multi-language support (3 languages)
- ✅ PWA ready with service worker
- ✅ Responsive design (mobile + desktop)
- ✅ Bottom navigation
- ✅ Search & route features
- ✅ Tourist attraction categories
- ✅ Pincode-based pack naming
- ✅ Category filtering with color coding
- ✅ Live GPS tracking

### 🚧 **In Progress**
- Search discovery implementation
- Route navigation enhancements
- Additional city support for Essential Apps

---

**Last Updated: January 30, 2026**

**Built with ❤️ using Next.js 15, TypeScript, and modern web technologies**

# Go to GitHub and create a Pull Request
# 1. Navigate to https://github.com/Kiwi-520/CityNav
# 2. Click "Compare & pull request"
# 3. Fill in PR title and description
# 4. Request review from team members
```

### **Step 5: Pull Request Review Process**
1. **Code Review**: Team members review your changes
2. **Testing**: Verify functionality using test URLs
3. **Approval**: PR gets approved by maintainers
4. **Merge**: Changes are merged into main branch
5. **Cleanup**: Delete feature branch after merge

### **Branch Naming Conventions**
```bash
feature/your-feature-name    # New features
fix/bug-description         # Bug fixes
docs/documentation-update   # Documentation
refactor/component-name     # Code refactoring
```

### **Pull Request Template**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Tested on screen-test.html
- [ ] Tested complete flow on citynav-app.html
- [ ] Verified responsive design
- [ ] Cross-browser testing completed

## Screenshots
(Add screenshots if applicable)
```

---

## 📱 Screen Overview

### **Complete MVP Implementation (18 Screens)**

| Category | Screen | Purpose | Status |
|----------|--------|---------|--------|
| **Onboarding** | Welcome | Language selection & intro | ✅ Complete |
| | Feature Tour | App capabilities showcase | ✅ Complete |
| | Location Permission | GPS access setup | ✅ Complete |
| | City Selection | Primary city configuration | ✅ Complete |
| | Setup Complete | Onboarding completion | ✅ Complete |
| **Authentication** | Login Screen | Social + email + guest login | ✅ Complete |
| **Core App** | Home Dashboard | Main hub with quick actions | ✅ Complete |
| | Interactive Map | Location-only map (live POI fetching removed) | ✅ Complete |
| | Search & Discovery | Place search with filters | ✅ Complete |
| | Nearby Places | Location-based listings (static/mock data; live Overpass POI fetching removed) | ✅ Complete |
| **Navigation** | POI Details | Business information & actions | ✅ Complete |
| | Route Options | Multi-route planning | ✅ Complete |
| | Turn-by-Turn Navigation | Live guidance interface | ✅ Complete |
| **User Account** | Profile & Settings | User preferences | ✅ Complete |
| **System** | Feedback Modal | Rating & review system | ✅ Complete |
| | Loading Screen | App initialization | ✅ Complete |
| | 404 Error Page | Error handling | ✅ Complete |
| | Privacy Policy | Legal compliance | ✅ Complete |

---

## 📞 Support & Contact

### **Testing Issues?**
1. Ensure local server is running on port 1550
2. Check browser console for any errors
3. Verify all CSS files are loading properly
4. Test both individual screens and complete app flow

### **Questions or Issues?**
- Create an issue on GitHub
- Follow the contributing guidelines above
- Test thoroughly before submitting PR

---

## 🎉 Ready for Testing!

### **Team Members & Stakeholders:**
- **Individual Screen Testing**: http://localhost:1550/screen-test.html
- **Complete App Experience**: http://localhost:1550/citynav-app.html

### **Developers:**
- Follow the contributing guidelines above
- Always create feature branches
- Test using both URLs before submitting PR
- Never push directly to main branch

**Happy Testing & Contributing! 🚀**

---

*Last Updated: August 28, 2025 | All 18 MVP screens complete and ready for comprehensive testing*

## 🎯 Overview

This prototype implements all the essential MVP screens as specified in your detailed wireframe requirements, featuring:

- **Responsive Design**: 1200×800 px desktop PWA base, centered content cards (max-width 600px)
- **Material Design 3**: Complete typography scale, color system, and component library
- **Accessibility**: WCAG 2.1 AA compliant with proper focus states and screen reader support
- **Interactive Components**: Fully functional buttons, forms, navigation, and state management
- **Offline-First**: Designed for PWA implementation with offline indicators and local storage

## 📁 Project Structure

```
prototype1/
├── index.html              # Design system documentation & component showcase
├── styles/
│   ├── design-tokens.css   # Color palette, typography, spacing, elevation
│   ├── components.css      # Button, input, card, navigation components
│   └── screens.css         # Screen-specific styles and layout
├── scripts/
│   └── design-system.js    # Interactive functionality and form validation
└── screens/
    ├── welcome.html           # Onboarding welcome screen
    ├── feature-tour.html      # Interactive feature tour
    ├── location-permission.html # Location access request
    ├── city-selection.html    # Manual/automatic city selection
    ├── setup-complete.html    # Setup completion with celebration
    └── home-dashboard.html    # Main dashboard with quick actions
```

## 🎨 Design System Features

### Color Palette
- **Primary**: #2E7D5E (Brand green for actions)
- **Primary Container**: #B8F2D9 (Active states, selected items)
- **Secondary**: #5D7C6B (Supporting text, secondary actions)
- **Surface**: #FDFDF7 (Background, cards)
- **Success**: #388E3C, **Warning**: #F9A825, **Error**: #BA1A1A

### Typography Scale (Inter Font)
- **Display Large**: 40px (Headlines like "Welcome to CityNav")
- **Display Medium**: 32px (Screen titles)
- **Headline Small**: 18px (Card titles)
- **Body Large**: 18px (Important descriptions)
- **Body Medium**: 16px (General text)
- **Label Large**: 14px (Button text)

### Components
- **Buttons**: Primary, secondary, outline, icon, emergency SOS
- **Inputs**: Text fields with icons, validation states
- **Cards**: Elevation-based with consistent 16px radius
- **Navigation**: Language selector, mode chips, bottom nav
- **Form Elements**: Toggle switches, dropdowns, search

## 🚀 Key Features Implemented

### 1. Onboarding Flow
- Welcome screen with language selection
- Interactive feature tour with carousel
- Location permission request with fallback
- City detection/manual selection
- Setup completion with celebratory animation

### 2. Dashboard
- Weather integration and city display
- Quick action buttons (Find, Route, Essentials)
- Daily tips with dismiss functionality
- Recent activity feed
- Emergency SOS button (3-second press)
- Safety alerts banner
- Bottom navigation

### 3. Interactive Elements
- **Ripple Effects**: Material Design button feedback
- **Form Validation**: Real-time email/password validation
- **State Management**: LocalStorage for user preferences
- **Responsive Navigation**: Mobile-friendly with hamburger menu
- **Loading States**: Spinners and progress indicators
- **Notifications**: Toast messages for user feedback

### 4. Accessibility
- **Keyboard Navigation**: Full keyboard support with focus indicators
- **Screen Reader**: Proper ARIA labels and semantic markup
- **Color Contrast**: WCAG 2.1 AA compliant color combinations
- **Touch Targets**: Minimum 48px interactive elements
- **Alternative Text**: Descriptive text for all icons

## 💻 Technical Implementation

### CSS Architecture
- **CSS Custom Properties**: Full design token system
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Mobile-First**: Responsive design starting from mobile
- **Component-Based**: Modular, reusable component styles

### JavaScript Features
- **ES6+ Modules**: Clean, modern JavaScript architecture
- **Event Handling**: Efficient event delegation
- **Local Storage**: Client-side state persistence
- **Web APIs**: Geolocation, vibration, audio context
- **Error Handling**: Graceful fallbacks for unsupported features

### Responsive Behavior
- **Desktop (1200px+)**: Centered cards with full features
- **Tablet (768px-1200px)**: Adapted layouts with touch optimization
- **Mobile (<768px)**: Full-width cards, stacked navigation, bottom tabs

## 🎯 Screen Specifications Met

All screens follow your exact requirements:

1. **Layout**: 1200×800 desktop PWA, 600px max-width cards
2. **Elevation**: 4dp main cards, 16dp modals, 2dp rest states
3. **Typography**: Complete Material Design 3 scale implementation
4. **Colors**: Exact hex values with proper semantic usage
5. **Components**: All specified interactive elements
6. **Responsive**: Full mobile adaptation with proper touch targets

## 🔧 Usage Instructions

### Local Development
1. Open `index.html` in a web browser
2. Navigate through the design system documentation
3. Test individual screens in the `/screens/` folder
4. Use browser dev tools to test responsive behavior

### Key Interactive Features
- **Language Selection**: Click language cards to switch
- **Form Validation**: Real-time validation on email/password fields
- **Emergency SOS**: Hold emergency button for 3 seconds
- **Navigation**: Use bottom nav or direct links between screens
- **State Persistence**: User selections saved in browser storage

## 🎨 Customization

### Design Tokens
All colors, spacing, and typography are defined in `design-tokens.css`:
```css
:root {
  --primary: #2E7D5E;
  --spacing-lg: 24px;
  --display-large-size: 40px;
}
```

### Component Modification
Individual components can be customized in `components.css` without affecting others.

### Screen-Specific Styling
Each screen has its own section in `screens.css` for unique layouts.

## 🚀 Next Steps

This prototype provides the foundation for:
1. **PWA Implementation**: Service worker integration for offline functionality
2. **API Integration**: Replace mock data with real backend services
3. **Advanced Features**: Push notifications, background sync, caching strategies
4. **User Testing**: A/B testing for different UI patterns
5. **Performance Optimization**: Code splitting, lazy loading, image optimization

## 📱 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Features**: CSS Grid, Flexbox, Custom Properties, Geolocation API
- **Fallbacks**: Graceful degradation for unsupported features

---

**Built with modern web standards and following Material Design 3 principles for a consistent, accessible, and delightful user experience.**
