Project structure recommendations for CityNav (Next.js + Leaflet + PWA)

This document outlines a recommended, well-organized project layout for your main application (`citynav-nextjs-app`) and the top-level workspace. It focuses on clarity, separation of concerns, and easy scaling.

Goals
- Keep frontend (Next.js app) files in `citynav-nextjs-app/`.
- Separate API/backend logic under `src/app/api` (Next.js app router) or a separate `api/` service.
- Put reusable components and hooks in clear folders under `src/`.
- Keep public assets in `public/` and static data in `data/`.
- Add docs and dev scripts to help local development and deployment.

Recommended layout (relative to `citynav-nextjs-app`)

.
├─ README.md
├─ package.json
├─ next.config.ts
├─ public/
│  ├─ sw.js
│  ├─ images/
│  └─ icons/
├─ src/
│  ├─ app/                 # Next.js app router pages (if using app/)
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  └─ api/              # server routes (keep lightweight)
│  │     └─ osrm/route/route.ts
│  ├─ pages/               # optional: legacy pages/ router (if used)
│  ├─ components/          # UI components
│  │  ├─ Map/
│  │  │  ├─ LeafletMap.tsx
│  │  │  └─ MapClientWrapper.tsx
│  │  ├─ UI/
│  │  │  └─ Button.tsx
│  │  └─ LocationDetails.tsx
│  ├─ hooks/               # custom hooks
│  │  ├─ useOfflineLocation.ts
│  │  ├─ useRoute.ts
│  │  └─ (Note: `useEssentialPOI` — Overpass-based POI fetching removed from this workspace)
│  ├─ lib/                 # small utilities (OSM queries, haversine, types)
│  ├─ styles/              # global CSS or Tailwind config
│  └─ public/              # static files (mirrors top-level public)
├─ scripts/                # helper scripts for builds, fixes
└─ infra/                  # (optional) infra as code, docker-compose for Overpass

Notes & migration tips
- Keep API proxy routes (e.g. `/api/osrm/route`) under `src/app/api` (app router) for Next 13+.
- Move existing components into `src/components/` and hooks into `src/hooks/` — code in your workspace already matches this mostly.
- If you plan to self-host Overpass, add a `infra/overpass/` folder with a `docker-compose.yml` and docs to manage import and updates.

Commands to scaffold directories (PowerShell)

# create folders
New-Item -ItemType Directory -Path .\citynav-nextjs-app\src\components\Map -Force
New-Item -ItemType Directory -Path .\citynav-nextjs-app\src\hooks -Force
New-Item -ItemType Directory -Path .\citynav-nextjs-app\infra\overpass -Force

# move files (careful, do manually or use git mv to preserve history)
# Example: move LocationDetails
git mv citynav-nextjs-app/src/components/LocationDetails.tsx citynav-nextjs-app/src/components/LocationDetails.tsx

Follow-up
- If you want, I can scaffold missing folders and placeholder files now (I won't move any existing files unless you ask). I can also generate a `docker-compose.yml` for a small Overpass instance under `infra/overpass` if you decide to self-host.

---
If you'd like me to create those folders and scaffolding now, tell me which of the follow-ups you want: "scaffold folders", "scaffold Overpass docker-compose", or "move files automatically".
