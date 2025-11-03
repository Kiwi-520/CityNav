// src/features/offline-onboarding/components/MapClientWrapper.tsx
"use client";

import dynamic from "next/dynamic";
import FeatureNavigation from "@/components/FeatureNavigation";

const CityMap = dynamic(
  () => import("@/features/offline-onboarding/components/CityMap"),
  { ssr: false }
);

export default function MapClientWrapper() {
  return (
    <div style={{ padding: "16px" }}>
      {/* <FeatureNavigation /> */}
      <CityMap />
    </div>
  );
}
