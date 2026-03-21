"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

const USER_STORAGE_KEY = "citynav_user";

interface StoredUser {
  id: string;
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  reputation: number;
  lastSyncedAt: string;
}

export function useAuth() {
  const { data: session, status } = useSession();

  // Sync session user to localStorage for offline access
  useEffect(() => {
    if (session?.user) {
      const userData: StoredUser = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        reputation: session.user.reputation ?? 0,
        lastSyncedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      } catch {
        // localStorage full or unavailable
      }
    }
  }, [session]);

  const getOfflineUser = (): StoredUser | null => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as StoredUser;
    } catch {
      return null;
    }
  };

  const clearStoredUser = () => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";
  const user = session?.user ?? null;

  return {
    session,
    user,
    isAuthenticated,
    isLoading,
    getOfflineUser,
    clearStoredUser,
  };
}
