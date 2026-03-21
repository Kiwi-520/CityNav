"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import AuthPopup from "@/components/AuthPopup";

const USER_STORAGE_KEY = "citynav_user";

interface AuthGuardProps {
  children: React.ReactNode;
  message?: string;
}

export default function AuthGuard({ children, message }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasOfflineUser, setHasOfflineUser] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Check for cached user data
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) setHasOfflineUser(true);
    } catch {}

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // If offline and user was previously logged in, allow access
  if (!isOnline && hasOfflineUser) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent mb-3" />
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  if (!dismissed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white mb-4">
          <h2 className="text-2xl font-bold mb-2">Sign in required</h2>
          <p className="text-white/70 text-sm">{message || "Please sign in to access this feature."}</p>
        </div>
        <AuthPopup
          onClose={() => setDismissed(true)}
          onSuccess={() => window.location.reload()}
          message={message || "Sign in to access this feature"}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="text-center text-white">
        <h2 className="text-2xl font-bold mb-2">Sign in required</h2>
        <p className="text-white/70 text-sm mb-4">{message || "You need to sign in to use this feature."}</p>
        <button
          onClick={() => setDismissed(false)}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition border-none cursor-pointer"
        >
          Sign In / Sign Up
        </button>
      </div>
    </div>
  );
}
