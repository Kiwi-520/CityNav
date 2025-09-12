# CityNav Project Documentation

---

## 1. App Overview

**CityNav** is a Progressive Web App (PWA) designed to help newcomers and travelers navigate Indian cities—starting with Pune—by offering unified, multi-modal routing, essentials discovery, offline navigation, safety tools, and community-driven feedback. The app is multilingual and offers seamless offline support, focusing on user safety, reliability, and ease of use.

### **Key Features**
- **City-Aware Onboarding:** Localized onboarding, quick city tips, language selection, and emergency info.
- **Multi-Modal Journey Planner:** Bus, metro, auto-rickshaw, and walking route suggestions with time, fare, and safety scores.
- **Essentials Map:** Nearby verified restrooms, ATMs, water stations, with community cleanliness and safety ratings.
- **Chatbot Assistant:** Local, multilingual AI answering city and transit queries, works offline.
- **Safety Tools:** Safety heatmaps, incident overlays, and SOS emergency button.
- **Offline Navigation:** Cached map tiles, routes, and city data; seamless offline fallback.
- **Community Feedback:** Rate facilities and transit, submit safety reports, sync feedback when online.
- **Post-Trip Summary:** Trip analytics, used facilities, safety scoring, and smart suggestions.

### **Primary Use Cases**
- **Newcomers:** Students or professionals arriving in a new city, needing safe, reliable navigation and essentials.
- **Travelers:** Tourists managing limited connectivity, language barriers, and safety concerns.
- **Local Explorers:** Residents seeking community-vetted recommendations or to contribute feedback.

---

## 2. Feature Details

### A. City Detection & Onboarding
- **Detect city via browser geolocation.**
- Display onboarding with:
  - Quick local transport tips and etiquette.
  - Emergency contact numbers (police, ambulance).
  - Language toggle (English, Hindi, Marathi).
- Dismiss onboarding after completion; recallable from menu.

### B. Essentials Map
- **Show OpenStreetMap-based city map.**
- Display and filter Points of Interest (POIs): restrooms, ATMs, water stations.
- Each POI displays community ratings (cleanliness, safety).
- Bookmark POIs for quick access.
- Show current location and allow zoom/pan.

### C. Route Planner
- Allow user to input source (auto-detect by default) and destination.
- Suggest multi-modal routes (bus, walk, metro, auto).
- Fetch route data from OSM APIs or static sources.
- Show for each route:
  - Estimated time, fare, and safety score.
  - Step-by-step navigation instructions.
- Pre-cache selected route for offline use.

### D. Offline Support
- Enable service worker via next-pwa.
- Cache:
  - Static assets (JS, CSS, images).
  - City data and onboarding tips.
  - Map tiles for core city zones.
  - User’s selected routes and POIs.
- Ensure all essential flows work offline:
  - Onboarding, essentials map, navigation.

### E. Chatbot Assistant (Basic)
- FAQ-based chatbot:
  - Preloaded answers for common city/transit questions.
  - Works offline with static knowledge base.
- Optionally, fetch dynamic answers from Firebase when online.
- Multilingual support.

### F. Community Feedback
- Allow users to rate POIs and transit experiences.
- Submit safety, cleanliness, and reliability feedback.
- Store feedback locally if offline; sync to Firebase when back online.
- Aggregate and display community ratings per POI/route.

### G. Safety Tools
- Overlay safety heatmap (well-lit streets and incident-prone areas) on the map.
- Show visual indicators of safe/unsafe zones.
- Add a prominent SOS button, linking to city emergency contacts.
- Optionally, allow users to submit incident reports.

---

## 3. Tech Stack and Specifications

### **Frontend**
- **Framework:** Next.js (React-based), set up as a PWA using next-pwa.
- **Styling:** CSS Modules or TailwindCSS.
- **Maps:** react-leaflet (with OpenStreetMap tiles).
- **State Management:** React Context (expandable to Redux Toolkit if needed).

### **Backend and Data**
- **Hosting/Data:** Firebase
  - Firestore/Realtime Database for feedback, ratings, and dynamic content.
  - Firebase Storage for images/resources.
  - Firebase Authentication (optional, for advanced features).
- **POIs & Routing:** OpenStreetMap APIs, Overpass API for POIs, OSRM/GraphHopper for routing.

### **Offline**
- **Service Worker:** Managed by next-pwa.
- **Caching:** Static assets, city data, map tiles, and user-selected content.
- **Local Storage:** IndexedDB/localStorage for storing unsynced user data.

### **Other Tools**
- **Testing:** Jest, React Testing Library.
- **Linting/Formatting:** ESLint, Prettier.
- **Collaboration:** GitHub for version control, Notion/Trello for planning.
- **Deployment:** Vercel, Netlify, or Firebase Hosting (HTTPS enforced).

---

## 4. Workflow

### 1. **Wireframe & User Stories**
- Design wireframes for all flows and screens in Figma (or similar).
- Create user stories for each feature, based on the Priya scenario and key use cases.

### 2. **Project Initialization**
- Scaffold Next.js app with TypeScript, next-pwa, TailwindCSS/CSS Modules.
- Set up Firebase project with Firestore, Storage, (and Auth as needed).
- Integrate react-leaflet and configure OSM tiles.

### 3. **Feature Implementation (Iterative)**
- **Batch 1:** City Detection & Onboarding, Essentials Map, Route Planner.
  - Assign 1 feature per team member.
  - Develop, integrate, and test each feature before moving to next batch.
- **Batch 2:** Offline Support, Community Feedback, Chatbot, Safety Tools.
  - Repeat assignment, development, and testing.
- **Continuous Integration:** Use GitHub for PRs, code reviews, and merging.

### 4. **Testing & QA**
- Test each feature on multiple devices and browsers.
- Confirm offline/online transitions, caching, and data sync.
- Conduct user testing with real personas and gather actionable feedback.

### 5. **Polish & Launch**
- Finalize PWA manifest, icons, and splash screens.
- Optimize performance, accessibility, and offline experience.
- Deploy to chosen platform (Vercel, Netlify, or Firebase Hosting).
- Share with beta users, iterate based on feedback, and plan for next phase.

---

## 5. User Experience & Stories

### **Primary Persona Example: Priya**
- **Goal:** Navigate from Pune Airport to hostel in Aundh, safely and efficiently, with minimal data and language barriers.

#### **User Story 1: Onboarding**
- As Priya, I open the app and it detects Pune, offering me onboarding tips in my chosen language with quick city survival info.

#### **User Story 2: Route Planning**
- As Priya, I enter my hostel address. The app suggests multiple safe, time-efficient routes using available public transport and autos.

#### **User Story 3: Essentials Map**
- Before leaving, I check the essentials map for the nearest restroom and ATM, and bookmark them for my journey.

#### **User Story 4: Chatbot Help**
- I ask the chatbot where to find a prepaid auto. The chatbot answers instantly, even with poor connectivity.

#### **User Story 5: Safety & Offline Navigation**
- The app overlays a safety heatmap and guides me via cached maps when data drops, ensuring my route avoids unsafe zones.

#### **User Story 6: Community Feedback**
- Upon arrival, I rate my auto experience and the restroom. My input syncs automatically when I’m back online, helping others.

---

**This document provides a structured, actionable guide for building CityNav using Next.js, Firebase, and OpenStreetMap, with a clear workflow, feature blueprint, and user-centered experience.**


---------------------------------------------------------------------------------------------


# CityNav Technical Documentation & System Design

---

## 1. Project Overview

CityNav is a Progressive Web App (PWA) designed to help newcomers, students, and travelers navigate Indian cities—starting with Pune. It features offline navigation, essentials discovery, community feedback, and safety tools, all within a multilingual, installable, and mobile-first interface.

---

## 2. Core Features

### 2.1. City Detection & Onboarding
- **Geolocation**: Detect user's city at launch using browser geolocation.
- **Onboarding**: Show local tips, emergency contacts, and city-specific information.
- **Language Switcher**: Support onboarding and app content in English, Hindi, and Marathi.

### 2.2. Essentials Map
- **Map Display**: Show interactive, mobile-friendly map using OpenStreetMap tiles.
- **POIs**: Display key facilities (restrooms, ATMs, water stations) as markers.
- **Ratings**: Show community cleanliness and safety ratings for each POI.
- **Bookmarking**: Allow users to bookmark important POIs.

### 2.3. Route Planner
- **Input**: Allow user to specify source (default to current location) and destination.
- **Routing**: Suggest multi-modal routes (bus, walk, metro, auto) using OSM-based APIs or static data.
- **Details**: Show each route's estimated time, fare, and safety score.
- **Offline**: Cache selected routes for offline navigation.

### 2.4. Offline Support
- **Service Worker**: Use next-pwa to cache static assets, map tiles, city data, and routes.
- **Resilience**: Ensure onboarding, essentials map, and core navigation work without connectivity.

### 2.5. Chatbot Assistant (Basic)
- **FAQ Bot**: Provide instant answers to common city and transit questions.
- **Offline Mode**: Use a static knowledge base for offline usage.
- **Dynamic Extension**: Optionally fetch up-to-date answers from Firebase when online.

### 2.6. Community Feedback
- **Rating**: Allow users to rate POIs and routes on cleanliness, safety, and reliability.
- **Sync**: Store feedback locally when offline, sync to Firebase when online.
- **Aggregate Display**: Display aggregate feedback on POIs/routes.

### 2.7. Safety Tools
- **Heatmaps**: Overlay safety heatmaps (lit streets, incident-prone areas) on the map.
- **SOS Button**: Prominently display an emergency contacts/SOS button.
- **Incident Reporting**: Allow users to submit safety reports (optional).

---

## 3. System Architecture

### 3.1. High-Level Architecture

```
[User Device]
    ↓
[PWA Frontend (Next.js + React, next-pwa)]
    ↓               ↓
[OpenStreetMap APIs]   [Firebase Backend]
                          ↓
                [Firestore DB, Storage]
```

- **Frontend**: Next.js React app, PWA-enabled, runs on user devices with offline-first logic.
- **Maps**: Map rendering and POI overlays using react-leaflet and OSM tiles.
- **Backend**: Firebase for real-time data (community feedback, dynamic content), storage (images), and (optional) authentication.
- **Offline**: Service worker (via next-pwa) for caching; IndexedDB/localStorage for unsynced feedback.

---

### 3.2. Major Components

- `/pages`: Next.js routing, one file per major view (onboarding, map, planner, feedback, chatbot, etc.)
- `/components`: Reusable UI elements (map, POI marker, feedback form, chatbot UI, etc.)
- `/features` or `/modules`: Feature-specific logic and state (onboarding, route planner, feedback manager, offline handler).
- `/firebase`: Firebase config and data utilities.
- `/hooks`: Custom React hooks (e.g., useGeolocation, useOffline, useFirestore).
- `/utils`: Helper functions (e.g., language translation, cache manager).

---

### 3.3. Data Flow

#### **POIs and Map Data**
- Fetched from OSM APIs or Overpass queries, cached for offline.
- Community feedback and ratings are fetched from/synced to Firebase.

#### **Routing**
- OSM-based API (OSRM, GraphHopper, or static data) provides route suggestions.
- Route info is cached locally if user saves the route for offline use.

#### **User Feedback**
- Submitted feedback is stored locally if offline, then pushed to Firebase upon reconnection.
- Real-time feedback updates are pulled from Firebase to keep POI info fresh.

#### **Chatbot**
- Static knowledge base is bundled for offline use.
- Dynamic answers are pulled from Firebase if available and online.

---

### 3.4. Offline Strategy

- **Service Worker**: Provided by next-pwa, caches app shell, static assets, map tiles, and key city data.
- **IndexedDB/LocalStorage**: Stores unsynced feedback, saved routes, and bookmarks.
- **Sync Logic**: On reconnection, triggers synchronization to Firebase.

---

### 3.5. Security & Privacy

- All data transfer via HTTPS.
- Minimal personal data collected; user authentication optional for basic features.
- Feedback and ratings anonymized.

---

## 4. Tech Stack

- **Frontend**
  - Next.js (React, SSR/SSG, Routing)
  - next-pwa (PWA, service worker, offline)
  - react-leaflet (OSM map rendering)
  - TailwindCSS or CSS Modules (styling)
- **Backend**
  - Firebase Firestore/Realtime Database (dynamic data, feedback)
  - Firebase Storage (images/uploads)
  - Firebase Authentication (optional)
- **Map & Data**
  - OpenStreetMap APIs (tiles, Overpass for POIs)
  - OSRM/GraphHopper (routing; or static JSON for MVP)
- **Other**
  - Jest, React Testing Library (testing)
  - ESLint, Prettier (linting/formatting)
  - GitHub (version control)
  - Notion/Trello (project management)

---

## 5. Implementation Workflow

### 5.1. Setup Phase
1. Scaffold Next.js project with TypeScript and next-pwa.
2. Configure TailwindCSS or CSS Modules for styling.
3. Set up Firebase project: Firestore, Storage, Auth (if needed).
4. Integrate react-leaflet, set up OSM map rendering.
5. Set up environment variable management (`.env.example`).

### 5.2. Feature Development (Iterative Sprints)
1. **Batch 1:** City Detection & Onboarding, Essentials Map, Route Planner
   - Build, test, and merge each feature sequentially with clear ownership.
2. **Batch 2:** Offline Support, Chatbot, Community Feedback, Safety Tools
   - Continue iterative development, ensuring offline-first for each.
3. **Integration:** Test all features together, resolve conflicts, ensure smooth cross-feature flows.

### 5.3. Testing & QA
- Manual and automated testing for all features.
- Test offline/online transitions, PWA installability, and data sync.
- User feedback sessions for UX improvement.

### 5.4. Polish & Launch
- Finalize PWA manifest, icons, and splash screens.
- Optimize performance and accessibility.
- Deploy to Vercel, Netlify, or Firebase Hosting (HTTPS).
- Collect initial user feedback and iterate.

---

## 6. User Experience & Stories

### 6.1. Example User Story (Priya)

- **Onboarding**: Priya lands in Pune, opens CityNav, and sees onboarding tips and emergency contacts in Hindi.
- **Route Planning**: She enters her hostel address, receives safe, multi-modal route suggestions, and bookmarks restrooms and ATMs.
- **Offline**: On the move, Priya loses connectivity, but CityNav’s offline cache keeps her on track.
- **Feedback**: After arrival, she rates her route and the restroom she used; feedback syncs when she’s online again.
- **Safety**: Priya checks the safety heatmap to avoid unsafe areas and knows the SOS button is visible at all times.

---

## 7. Deployment & Maintenance

- **Deploy**: Use Vercel/Netlify/Firebase Hosting for HTTPS-enabled deployment.
- **Monitor**: Use Firebase Analytics for usage tracking and Sentry for error monitoring.
- **Iterate**: Regularly update based on user feedback and expand to new cities and features.

---

## 8. Security & Compliance

- HTTPS enforced for all communications.
- Minimal user data collected and processed.
- Compliance with local data privacy laws for feedback and user data.

---

## 9. Folder Structure Example

```
/citynav-app
  /components       # Shared UI components
  /features         # Feature modules (onboarding, map, planner, feedback, etc.)
  /firebase         # Firebase config and utilities
  /hooks            # Custom React hooks
  /pages            # Next.js route files
  /public           # Static assets (icons, manifest, images)
  /styles           # TailwindCSS or CSS Modules
  /utils            # Utility functions (i18n, cache, etc.)
  /tests            # Test files
  .env.example      # Environment variable template
  README.md         # Project documentation
  next.config.js    # Next.js configuration (PWA, etc.)
```

---

## 10. Setup Checklist

- [ ] Next.js app initialized with TypeScript and next-pwa.
- [ ] Firebase project set up (Firestore/Realtime DB, Storage, Auth if needed).
- [ ] react-leaflet integrated for OSM rendering.
- [ ] Service worker configured for offline support and caching.
- [ ] All essential features scaffolded as per design system.
- [ ] Project documentation and README provided.
- [ ] Ready for iterative, team-based feature development.

---

**This document provides a comprehensive technical blueprint for CityNav using Next.js, Firebase, and OpenStreetMap, following an offline-first, modular, and scalable architecture.**
