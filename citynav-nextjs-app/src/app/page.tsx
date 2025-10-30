// src/app/page.tsx

import MapClientWrapper from "@/features/offline-onboarding/components/MapClientWrapper";

export default function Page() {
  return (
    <main className="h-screen overflow-hidden">
      <MapClientWrapper />
    </main>
  );
}