"use client";

import AuthGuard from "@/components/AuthGuard";
import type { ReactNode } from "react";

export default function EssentialMapsLayout({ children }: { children: ReactNode }) {
  return <AuthGuard message="Sign in to access maps and navigation">{children}</AuthGuard>;
}
