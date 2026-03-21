import { useState, useEffect, useCallback } from 'react';

interface GeolocationResult {
    detectedCity: string | null;
    error: string | null;
    loading: boolean;
    refetch: () => void;
}

export const useGeolocation = (): GeolocationResult => {
    const [detectedCity, setDetectedCity] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const getLocation = useCallback(() => {
        setLoading(true);
        setError(null);
        setDetectedCity(null);

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            setLoading(false);
            return;
        }

        const handleSuccess = (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords;
            
            fetch(`/api/google-geocode?lat=${latitude}&lng=${longitude}`)
                .then(response => response.json())
                .then(data => {
                    let city: string | null = null;
                    if (data.results && data.results.length > 0) {
                        const components = data.results[0].address_components || [];
                        const localityComp = components.find((c: any) => c.types.includes('locality'));
                        const townComp = components.find((c: any) => c.types.includes('administrative_area_level_2'));
                        city = localityComp?.long_name || townComp?.long_name || null;
                    }
                    setDetectedCity(city);
                    setLoading(false);
                })
                .catch(err => {
                    setError('Failed to get city name. Please select your city manually.');
                    setLoading(false);
                });
        };

        const handleError = (err: GeolocationPositionError) => {
            setError(err.message || 'Geolocation permission denied.');
            setLoading(false);
        };

        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
        });
    }, []);

    useEffect(() => {
        getLocation();
    }, [getLocation]);

    return { detectedCity, error, loading, refetch: getLocation };
};