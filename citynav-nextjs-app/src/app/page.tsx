"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HomeDashboard from "./home/HomeDashboard";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showDashboard = searchParams.get("dashboard") === "1";

  useEffect(() => {
    if (!showDashboard) {
      router.replace("/welcome");
    }
  }, [router, showDashboard]);

  if (showDashboard) {
    return <HomeDashboard />;
  }

  return null;
}
