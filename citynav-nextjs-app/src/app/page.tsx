"use client";

import { useState } from "react";
import GeolocationPrompt from "../components/GeolocationPrompt";
import Onboarding from "../components/Onboarding";
import ManualCitySelection from "../components/ManualCitySelection";
import { LanguageKey } from "../components/Onboarding";
import HomeDashboard from "./home/HomeDashboard";

export default function HomePage() {
  const [city, setCity] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("en");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [onRetryFn, setOnRetryFn] = useState<() => void>(() => {});
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showManualSelection, setShowManualSelection] =
    useState<boolean>(false);
  const [showMainApp, setShowMainApp] = useState<boolean>(false);

  const handleLocationDetermined = (
    detectedCity: string | null,
    error: string | null,
    refetch: () => void
  ) => {
    if (error) {
      setShowManualSelection(true);
      setOnRetryFn(() => refetch);
    } else {
      setCity(detectedCity || "Unknown City");
      setShowOnboarding(true);
    }
  };

  const handleDismissOnboarding = (
    selectedCity: string,
    selectedLanguage: LanguageKey
  ) => {
    setCity(selectedCity);
    setLanguage(selectedLanguage);
    setShowOnboarding(false);
    setShowMainApp(true);
  };

  // FIX: This function now transitions to the Onboarding screen (language selector)
  const handleManualCitySelected = (selectedCity: string) => {
    setCity(selectedCity);
    setShowManualSelection(false);
    // Transition to the next logical step: Language Selection (Onboarding screen)
    setShowOnboarding(true);
  };

  if (!showOnboarding && !showManualSelection && !showMainApp) {
    return (
      <GeolocationPrompt onLocationDetermined={handleLocationDetermined} />
    );
  }

  if (showOnboarding) {
    return (
      <Onboarding
        detectedCity={city}
        error={locationError}
        onDismiss={handleDismissOnboarding}
        onRetry={onRetryFn}
        onLanguageChange={setLanguage}
      />
    );
  }

  if (showManualSelection) {
    // NOTE: The Onboarding component will now handle the flow after manual city selection
    return (
      <ManualCitySelection
        onCitySelected={handleManualCitySelected}
        onRetry={onRetryFn}
        onLanguageChange={setLanguage}
      />
    );
  }

  if (showMainApp) {
    return <HomeDashboard />;
  }

  return null;
}
