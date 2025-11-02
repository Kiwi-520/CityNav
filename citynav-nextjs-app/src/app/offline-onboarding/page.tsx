"use client";

import React from "react";
import dynamic from "next/dynamic";

const MapClientWrapper = dynamic(
  () => import("@/features/offline-onboarding/components/MapClientWrapper"),
  { ssr: false }
);

export default function OfflineOnboardingPage() {
  return <MapClientWrapper />;
}
