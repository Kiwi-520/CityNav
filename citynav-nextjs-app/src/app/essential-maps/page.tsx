"use client";

import React from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/PageHeader";

const LeafletMap = dynamic(
  () => import("@/features/offline-onboarding/components/LeafletMap"),
  { ssr: false }
);

export default function EssentialMapsPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PageHeader title="Essential Maps" showBack backHref="/" />
      <div className="flex-1 overflow-hidden">
        <LeafletMap />
      </div>
    </div>
  );
}

