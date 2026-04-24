import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" ? false : false,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/(a|b|c)\.tile\.openstreetmap\.org\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "openstreetmap-tiles",
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    {
      urlPattern: /^https:\/\/(overpass-api\.de|overpass\.kumi\.systems|overpass\.openstreetmap\.ru)\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "overpass-api-cache",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    {
      urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "nominatim-api-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    {
      urlPattern: /^https:\/\/router\.project-osrm\.org\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "osrm-routing-cache",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    {
      urlPattern: ({ request }: { request: Request }) =>
        request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      urlPattern: /\/api\/google-directions\?.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "google-directions-cache",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 3 * 24 * 60 * 60, // 3 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/api\/google-places\?.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "google-places-cache",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 500, // 18 types × many locations
          maxAgeSeconds: 3 * 24 * 60 * 60, // 3 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/api\/google-geocode\?.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-geocode-cache",
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 14 * 24 * 60 * 60, // 14 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default withPWA(nextConfig);
