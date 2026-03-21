"use client";

import AuthGuard from "@/components/AuthGuard";
import type { ReactNode } from "react";

export default function EssentialAppsLayout({ children }: { children: ReactNode }) {
  return <AuthGuard message="Sign in to access essential city apps">{children}</AuthGuard>;
}
