# Offline Onboarding Feature

This folder documents the offline onboarding capability we implemented: discovering nearby POIs, packaging them into compact packs, storing them locally, and consuming them when the device is offline.

Highlights
- Live POI discovery scoped by center + radius with category filters (hospitals, clinics, railway, bus stops, banks/ATMs, hotels, restaurants).
- Pack format: JSON manifest + NDJSON body, optional gzip compression.
- Local storage in IndexedDB with a Pack Manager UI (list, preview, load, delete).
- Automatic nearby-pack fallback when offline; explicit pack selection takes precedence.
- Routing and navigation panel with distance/ETA/steps; clickable legend with persistent filters.

Quick links (within this folder)
- Packs: ./packs/README.md
- Overpass: ./overpass/README.md
- Experiments: ./experiments/README.md
- UI overview: ./ui/README.md
- Troubleshooting: ./troubleshooting.md
- Project structure map: ./structure.md

Notes
- This is a documentation and examples area. It references the live code under the main app folders; it does not duplicate or move the implementation.