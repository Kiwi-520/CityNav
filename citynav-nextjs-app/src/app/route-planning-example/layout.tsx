"use client";

import AuthGuard from "@/components/AuthGuard";
import type { ReactNode } from "react";

export default function RoutePlanningLayout({ children }: { children: ReactNode }) {
  return <AuthGuard message="Sign in to use route planning">{children}</AuthGuard>;
}
