'use client';

import { useState } from 'react';
import onboardingContent from '../data/onboarding-content.json';

export type LanguageKey = 'en' | 'hi' | 'mr';

type CityContent = {
    [key in LanguageKey]: {
        welcome: string;
        tipsTitle: string;
        tips: string;
        emergencyTitle: string;
        emergencyNumbers: string;
        dismissButton: string;
    };
};

type OnboardingContentMap = {
    [key: string]: CityContent;
};

interface OnboardingProps {
    detectedCity: string | null;
    error: string | null;
    onDismiss: (selectedCity: string, selectedLanguage: LanguageKey) => void;
    onRetry: () => void;
    onLanguageChange: (language: LanguageKey) => void;
}

const cities = ['Pune', 'Mumbai', 'Delhi'];

const Onboarding: React.FC<OnboardingProps> = ({ detectedCity, error, onDismiss, onRetry, onLanguageChange }) => {
    const [language, setLanguage] = useState<LanguageKey>('en');

    const cityToDisplay = detectedCity || 'Pune';
    const cityKey = cityToDisplay?.toLowerCase() || 'pune';

    const cityContent = (onboardingContent as OnboardingContentMap)[cityKey] || onboardingContent.pune;
    const content = cityContent[language];

    if (!content) return null;

    const styles: Record<string, React.CSSProperties> = {
        onboardingContainer: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f0f2f5',
            fontFamily: 'Arial, sans-serif',
        },
        card: {
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '10px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            maxWidth: '400px',
            textAlign: 'center',
        },
        welcomeText: {
            color: '#333',
            marginBottom: '1rem',
        },
        languageToggle: {
            marginBottom: '1.5rem',
        },
        languageButton: {
            backgroundColor: '#e0e0e0',
            border: 'none',
            padding: '0.5rem 1rem',
            margin: '0 0.25rem',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
        },
        languageButtonActive: {
            backgroundColor: '#0070f3',
            color: 'white',
        },
        section: {
            marginBottom: '1.5rem',
            textAlign: 'left',
        },
        sectionHeading: {
            marginTop: '0',
            color: '#555',
            borderBottom: '1px solid #eee',
            paddingBottom: '0.5rem',
        },
        sectionText: {
            whiteSpace: 'pre-wrap',
            color: '#666',
        },
        dismissButton: {
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'background-color 0.2s',
        },
        retryButton: {
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '1rem',
            marginTop: '1rem',
            transition: 'background-color 0.2s',
        },
        errorMessage: {
            color: '#dc3545',
            fontSize: '0.8rem',
            marginBottom: '1rem',
        },
        selectInput: {
            padding: '0.5rem',
            marginBottom: '1rem',
            border: '1px solid #ccc',
            borderRadius: '5px',
            width: '100%',
        },
    };

    const handleLanguageClick = (lang: LanguageKey) => {
        setLanguage(lang);
        onLanguageChange(lang);
    };

    return (
        <div style={styles.onboardingContainer}>
            <div style={styles.card}>
                {detectedCity ? (
                    <h1 style={styles.welcomeText}>{content.welcome}</h1>
                ) : (
                    <>
                        <h1 style={styles.welcomeText}>{content.welcome}</h1>
                        <p>We need your location to get started. Please allow access or select a city below.</p>
                        <select
                            value={detectedCity || 'Pune'}
                            onChange={(e) => {}}
                            style={styles.selectInput}
                        >
                            {cities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </>
                )}
                
                {error && <p style={styles.errorMessage}>{error}</p>}

                <div style={styles.languageToggle}>
                    <button
                        style={{ ...styles.languageButton, ...(language === 'en' && styles.languageButtonActive) }}
                        onClick={() => handleLanguageClick('en')}>
                        English
                    </button>
                    <button
                        style={{ ...styles.languageButton, ...(language === 'hi' && styles.languageButtonActive) }}
                        onClick={() => handleLanguageClick('hi')}>
                        हिन्दी
                    </button>
                    <button
                        style={{ ...styles.languageButton, ...(language === 'mr' && styles.languageButtonActive) }}
                        onClick={() => handleLanguageClick('mr')}>
                        मराठी
                    </button>
                </div>
                
                <div style={styles.section}>
                    <h3 style={styles.sectionHeading}>{content.tipsTitle}</h3>
                    <p style={styles.sectionText}>{content.tips}</p>
                </div>

                <div style={styles.section}>
                    <h3 style={styles.sectionHeading}>{content.emergencyTitle}</h3>
                    <pre style={styles.sectionText}>{content.emergencyNumbers}</pre>
                </div>
                
                {error && (
                    <button style={styles.retryButton} onClick={onRetry}>
                        Retry Location Access
                    </button>
                )}

                <button style={styles.dismissButton} onClick={() => onDismiss(cityToDisplay || 'Pune', language)}>
                    {content.dismissButton}
                </button>
            </div>
        </div>
    );
};

export default Onboarding;