"use client";

import AuthGuard from "@/components/AuthGuard";
import type { ReactNode } from "react";

export default function SearchLayout({ children }: { children: ReactNode }) {
  return <AuthGuard message="Sign in to search and discover places near you">{children}</AuthGuard>;
}
