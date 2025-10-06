# CityNav: Offline-first POI discovery and compressed offline packs

Authors: [Your names here]
Date: 2025-10-06

## Abstract

(First draft) We present CityNav, a lightweight offline-first system for discovering and packaging nearby points-of-interest (POIs) from OpenStreetMap for mobile and low-connectivity contexts. CityNav integrates efficient Overpass-based POI collection, client-side compression, and local storage using an extendable IndexedDB pack format. We evaluate compression strategies, download and storage trade-offs, and offline coverage across urban settings. Results show that client gzip compresses typical POI packs by 70–85%, reducing download sizes from several hundred kilobytes to tens of kilobytes for neighborhood-sized packs, while enabling robust offline discovery and navigation. We discuss design choices for pack manifests, compatibility with web mapping stacks (Leaflet/React), and implications for field data collection and reproducible experiments.

## Introduction

Motivation: In many parts of the world, mobile connectivity is unreliable or costly. Mobile mapping applications that rely on remote servers for POI data can be unusable in these contexts. CityNav explores how client-side tooling and simple pack formats can improve offline usability for essential services (hospitals, clinics, transit stops, banks/ATMs, hotels, restaurants).

Contributions:
- A reproducible pipeline to discover POIs using Overpass queries and normalize them into a compact NDJSON pack.
- A pack manifest and storage layout using IndexedDB that supports gzip-compressed blobs and metadata for quick discovery.
- A modular React/Next.js implementation with hooks (`useNearbyPOIs`, `useOfflineLocation`) and a `packManager` library.
- Evaluation of compression effectiveness, offline coverage, and UX trade-offs.

## Paper outline

1. Abstract
2. Introduction
3. Related work
4. System design
   - Data sources and Overpass queries
   - POI normalization and NDJSON packing
   - Manifest schema and IndexedDB layout
   - Client compression (pako/gzip) and decompression
   - UI patterns (map, right-side panels, pack manager)
5. Implementation details
   - Key components and hooks with code pointers
   - Pack lifecycle (create, list, read, delete)
6. Experimental setup
   - Datasets & test cities
   - Metrics: pack size, compressed ratio, download time, read latency, success rate
   - Reproducibility scripts
7. Results
8. Discussion, limitations, ethics
9. Conclusion & future work
10. Appendix: Overpass queries, manifest schema, commands

## Next steps
- Expand the Abstract and write the full Introduction (task assigned).
- Draft Methods section with reproducibility commands and code references (packManager, hooks, UI files).
- Prepare scripts to collect real-world data (small script to build packs across sample locations).


---

(Use this file as the working draft. I will expand sections and generate figures/tables as we run experiments.)