// src/features/offline-onboarding/components/MapClientWrapper.tsx
"use client";

import dynamic from "next/dynamic";
const CityMap = dynamic(() => import("@/features/offline-onboarding/components/CityMap"), { ssr: false });

export default function MapClientWrapper() {
  return <CityMap />;
}
