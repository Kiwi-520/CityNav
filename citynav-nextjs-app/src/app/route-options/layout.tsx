"use client";

import AuthGuard from "@/components/AuthGuard";
import type { ReactNode } from "react";

export default function RouteOptionsLayout({ children }: { children: ReactNode }) {
  return <AuthGuard message="Sign in to plan and compare routes">{children}</AuthGuard>;
}
