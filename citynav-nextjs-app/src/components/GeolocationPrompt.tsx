'use client';

import { useEffect } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';

interface GeolocationPromptProps {
    onLocationDetermined: (city: string | null, error: string | null, refetch: () => void) => void;
}

const GeolocationPrompt: React.FC<GeolocationPromptProps> = ({ onLocationDetermined }) => {
    const { detectedCity, error, loading, refetch } = useGeolocation();

    useEffect(() => {
        if (!loading) {
            onLocationDetermined(detectedCity, error, refetch);
        }
    }, [loading, detectedCity, error, refetch, onLocationDetermined]);

    return (
        <div style={{ textAlign: 'center', paddingTop: '50px' }}>
            <p>Loading your location...</p>
        </div>
    );
};

export default GeolocationPrompt;