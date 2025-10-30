# Troubleshooting

- Overpass timeouts / rate limits: retry later, reduce radius, or run via a proxy.
- No POIs in sparse regions: results can be empty; create a pack for a denser area.
- IndexedDB quota errors: delete old packs from the Pack Manager.
- Compression not applied: gzip library may not be available; pack stores as uncompressed NDJSON.
- Geolocation denied: app falls back to last stored location or a default center.
