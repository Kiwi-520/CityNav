# Project Structure (Offline Onboarding)

This map shows where the implementation lives in the app and how it relates to offline onboarding. Use this as a guide; the source of truth remains in the app folders.

- App entry and routing: src/app/
  - Home page mounts the map and panels.
- Core UI composition: src/components/
  - Map (rendering, markers, polylines)
  - Essentials panel (legend, filters, nearby list, pack manager glue)
  - Navigation panel (route details)
  - Location/weather card
- Hooks: src/hooks/
  - POI fetching (Overpass), routing, offline location fallback.
- Pack storage: src/lib/
  - IndexedDB wrapper for manifests + data (NDJSON, optionally gzipped).
- Public assets: public/
  - Leaflet icons, PWA assets.
- Experiments and outputs: scripts/ and scripts/output/
  - Batch Overpass runs, CSV summaries, SVG charts.

Feature threads relevant to offline onboarding
- Live discovery → Pack creation → Local storage → Offline consumption (nearest pack) → Map & navigation.
- Persistent UI filters and compressed size preview for current selection.
