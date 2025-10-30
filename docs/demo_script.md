CityNav demo & explanation script

Purpose

A short script and checklist to demonstrate CityNav in a talk or video. It covers elevator pitch, live demo steps, and technical talking points you can use when explaining what we implemented.

Elevator pitch (30s)

- "CityNav is a lightweight, offline-capable POI pack system for urban navigation. It lets users generate small, focused datasets (hospitals, transit stops, banks, hotels, restaurants) from OpenStreetMap, compress them on-device, and store them locally so critical POI information remains available offline. Packs are stored as NDJSON with a small JSON manifest and saved in IndexedDB; the Pack Manager UI supports create, preview, load, and delete workflows."

Live demo checklist (5–7 minutes)

1. Setup
   - Open the app: `citynav-nextjs-app` (run `npm install` then `npm run dev`).
   - Open browser devtools (Application/Storage tab) to show IndexedDB when needed.

2. Show map and current filters
   - Point to the right-side essentials panel (60% map / 40% right panel).
   - Demonstrate toggling filter categories (hospitals, transit, banks) — note that filters persist via localStorage.

3. Create a pack
   - Click the menu → Pack Manager.
   - Select a center on the map (or use current location), set radius (small/medium), and click "Create Pack".
   - While it runs: explain Overpass query (radius-limited, amenity and public_transport tags) and that results are normalized to POI records.

4. Preview the manifest
   - In Pack Manager preview: show manifest metadata (center, itemCount, sizeBytes, compressedBytes if available) — explain manifest-first preview avoids decompressing everything.

5. Load the pack
   - Click Load: pack POIs render on the map, demonstrate forced-center behavior or loading a pack elsewhere.

6. Inspect storage
   - Open devtools → IndexedDB: show `manifests` and `data` storing the pack and blob.

7. Explain compression and fallbacks
   - If compressed: mention gzip compressedBytes recorded; if not, fallback is raw NDJSON.
   - Mention dynamic import of `pako` for gzip and the graceful fallback.

8. Edge cases and notes
   - Explain rate limits (Overpass), CORS, and recommendation to use a small proxy for batch experiments.

Technical talking points (1–2 minutes)

- Data model: NDJSON per line for simple, streaming-friendly packs; small manifests for metadata.
- Storage: IndexedDB with two stores (`manifests` and `data`) so manifest-first previews are fast.
- Performance: client-side gzip yields high compression ratios (3–6× typical), and NDJSON parsing loads a few hundred POIs interactively; decompression adds modest overhead.
- Robustness: AbortController timeouts for network calls and provider fallbacks for reverse-geocoding.

Commands and files to reference

- Start dev server:

```powershell
cd citynav-nextjs-app
npm install
npm run dev
```

- Key files:
  - `src/hooks/useNearbyPOIs.ts`
  - `src/lib/packManager.ts`
  - `src/components/PackManagerPanel.tsx`
  - `src/components/LeafletMap.tsx`
  - `src/components/LocationDetails.tsx`
  - `docs/research_paper.md`

Follow-ups after the demo

- Run benchmark scripts to measure sizes and timings for the paper.
- Add short screencapture clips for each step to include in an appendix or demo video.

---

Spoken script (copy-paste ready, ~2 minutes)

"Hi — I’ll show CityNav, a small system to make essential points-of-interest available offline. On the right you can see the Pack Manager. I’ll create a pack around this downtown area with a 1-kilometer radius. The client sends a radius-limited Overpass query for amenity and transit tags, normalizes results into small POI records and serializes them as NDJSON. For space savings we compress on the device using gzip — if compression is available — and write a small manifest with the pack’s center, item count, and byte sizes. The manifest is stored separately so the UI can show a preview instantly without reading the full blob. Now I’ll create the pack — you can see the manifest with item count and compressed size. I'll load the pack and show the POIs rendered on the map; this works even if I move the map elsewhere because the pack contains explicit coordinates. For reproducibility the pack format and code are in the repo; we plan to run benchmark scripts to collect compression ratios and load latencies for the paper. That’s CityNav — compact, offline-capable POI packs built for the web."