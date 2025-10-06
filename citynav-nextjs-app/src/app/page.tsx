// src/app/page.tsx

import MapClientWrapper from "@/components/MapClientWrapper";

export default function Page() {
  return (
    <main>
      <h1>Welcome to CityNav!</h1>
      <MapClientWrapper />
    </main>
  );
}
// This is a Server Component by default
// export default function HomePage() {
//   return (
//     <main>
//       <h1>Welcome to the Next.js App!</h1>
//       <p>This is your home page.</p>
//     </main>
//   );
// }

"use client";

import HomeDashboard from "./home/HomeDashboard";

export default function HomePage() {
  return <HomeDashboard />;
}

'use client';

import { useState } from 'react';
import GeolocationPrompt from '../components/GeolocationPrompt';
import Onboarding from '../components/Onboarding';
import ManualCitySelection from '../components/ManualCitySelection';
import { LanguageKey } from '../components/Onboarding'; // Import LanguageKey from the correct location

const appTranslations = {
    en: {
        welcomeMessage: "Welcome to the CityNav App!",
        cityMessage: "You are currently in",
        subMessage: "This is your main navigation and map view.",
    },
    hi: {
        welcomeMessage: "सिटीनैव ऐप में आपका स्वागत है!",
        cityMessage: "आप वर्तमान में हैं",
        subMessage: "यह आपका मुख्य नेविगेशन और मानचित्र दृश्य है।",
    },
    mr: {
        welcomeMessage: "सिटीनेव्ह ॲपमध्ये आपले स्वागत आहे!",
        cityMessage: "आपण सध्या येथे आहात",
        subMessage: "हे तुमचे मुख्य नेव्हिगेशन आणि नकाशा दृश्य आहे.",
    },
};

const MainApp = ({ city, language }: { city: string | null, language: string }) => {
    const translations = appTranslations[language as keyof typeof appTranslations] || appTranslations.en;

    return (
        <>
            <main style={{ textAlign: 'center', padding: '2rem', background: '#000', color: 'white' }}>
                <h1>{translations.welcomeMessage}</h1>
                <p>{translations.cityMessage} {city || 'Pune'}.</p>
                <p>{translations.subMessage}</p>
            </main>
        </>
    );
};

export default function HomePage() {
    const [city, setCity] = useState<string | null>(null);
    const [language, setLanguage] = useState<string>('en');
    const [locationError, setLocationError] = useState<string | null>(null);
    const [onRetryFn, setOnRetryFn] = useState<() => void>(() => {});
    const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
    const [showManualSelection, setShowManualSelection] = useState<boolean>(false);
    const [showMainApp, setShowMainApp] = useState<boolean>(false);

    const handleLocationDetermined = (detectedCity: string | null, error: string | null, refetch: () => void) => {
        if (error) {
            setShowManualSelection(true);
            setOnRetryFn(() => refetch);
        } else {
            setCity(detectedCity || 'Pune');
            setShowOnboarding(true);
        }
    };

    const handleDismissOnboarding = (selectedCity: string, selectedLanguage: LanguageKey) => {
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
        return <GeolocationPrompt onLocationDetermined={handleLocationDetermined} />;
    }

    if (showOnboarding) {
        return <Onboarding detectedCity={city} error={locationError} onDismiss={handleDismissOnboarding} onRetry={onRetryFn} onLanguageChange={setLanguage} />;
    }

    if (showManualSelection) {
        // NOTE: The Onboarding component will now handle the flow after manual city selection
        return <ManualCitySelection onCitySelected={handleManualCitySelected} onRetry={onRetryFn} onLanguageChange={setLanguage} />;
    }

    if (showMainApp) {
        return <MainApp city={city} language={language} />;
    }

    return null;
}
