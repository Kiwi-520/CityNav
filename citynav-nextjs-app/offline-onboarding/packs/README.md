# Packs

The pack format is a JSON manifest paired with a NDJSON body. Packs are stored in IndexedDB and can be gzipped.

- Manifest fields: id, bbox, center, radiusMeters, categories, createdAt, sizeBytes, compressedBytes?, contentEncoding?, itemCount.
- Body: one POI JSON object per line.

See examples in ./examples/
