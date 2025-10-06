'use client';

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    // Only register the service worker in production builds. In development
    // Next.js does not serve the built `/_next` files that workbox precaches,
    // which leads to bad-precaching-response 404 errors in the console.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => {
          // Service worker registered
        })
        .catch(() => {
          // Registration failed
        });
    }
  }, []);
  return null;
}