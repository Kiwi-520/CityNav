"use client";

import React from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/PageHeader";

// Dynamic import of the map component (SSR disabled for Google Maps)
const GoogleMapsExplorer = dynamic(
  () => import("@/features/offline-onboarding/components/GoogleMapsExplorer"),
  { ssr: false }
);

export default function EssentialMapsPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PageHeader title="Essential Maps" showBack backHref="/" />
      <div className="flex-1 overflow-hidden">
        <GoogleMapsExplorer />
      </div>
    </div>
  );
}

