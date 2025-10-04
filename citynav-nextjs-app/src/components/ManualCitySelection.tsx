'use client';

import { useState } from 'react';

// Define the type for LanguageKey to ensure type consistency (assuming you export it from Onboarding)
type LanguageKey = 'en' | 'hi' | 'mr';

interface ManualCitySelectionProps {
    onCitySelected: (city: string) => void;
    // The onRetry function executes the refetch logic
    onRetry: () => void; 
    onLanguageChange: (lang: string) => void;
}

const cities = ['Pune', 'Mumbai', 'Delhi'];

const ManualCitySelection: React.FC<ManualCitySelectionProps> = ({ onCitySelected, onRetry, onLanguageChange }) => {
    const [selectedCity, setSelectedCity] = useState<string>('Pune');

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
        descriptionText: {
            color: '#000',
            marginBottom: '1rem',
        },
        selectInput: {
            padding: '0.5rem',
            marginBottom: '1rem',
            border: '1px solid #ccc',
            borderRadius: '5px',
            width: '100%',
            color: '#000',
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
            width: '100%',
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
            marginBottom: '0.5rem',
            transition: 'background-color 0.2s',
            width: '100%',
        },
    };

    return (
        <div style={styles.onboardingContainer}>
            <div style={styles.card}>
                <h1 style={styles.welcomeText}>Location Not Found</h1>
                <p style={styles.descriptionText}>We couldn't detect your location. Please select a city to continue.</p>
                <select 
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    style={styles.selectInput}
                >
                    {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
                
                {/* This button calls the onRetry prop, which is linked to refetch() in page.tsx */}
                <button style={styles.retryButton} onClick={onRetry}>
                    Retry Location Access
                </button>

                <button style={styles.dismissButton} onClick={() => onCitySelected(selectedCity)}>
                    Start Navigating
                </button>
            </div>
        </div>
    );
};

export default ManualCitySelection;