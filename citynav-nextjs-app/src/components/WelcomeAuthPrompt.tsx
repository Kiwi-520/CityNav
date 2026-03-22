"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AuthPopup from "@/components/AuthPopup";

const POPUP_DISMISSED_KEY = "citynav_welcome_popup_dismissed";

export default function WelcomeAuthPrompt() {
  const { data: session, status } = useSession();
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (session) return; // already logged in

    // Show popup only once per session (browser session)
    const dismissed = sessionStorage.getItem(POPUP_DISMISSED_KEY);
    if (!dismissed) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setShowPopup(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [session, status]);

  const handleClose = () => {
    setShowPopup(false);
    sessionStorage.setItem(POPUP_DISMISSED_KEY, "true");
  };

  const handleSuccess = () => {
    setShowPopup(false);
    sessionStorage.setItem(POPUP_DISMISSED_KEY, "true");
    window.location.reload();
  };

  if (!showPopup) return null;

  return (
    <AuthPopup
      onClose={handleClose}
      onSuccess={handleSuccess}
      message="Sign in for personalized navigation, saved routes, and offline access"
    />
  );
}
