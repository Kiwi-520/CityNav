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
            
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                .then(response => response.json())
                .then(data => {
                    const city = data.address?.city || data.address?.town || data.address?.village || null;
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

        // This is the call that triggers the browser pop-up
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
    }, []);

    useEffect(() => {
        getLocation();
    }, [getLocation]);

    // The refetch function is returned here, ready to be called by the button
    return { detectedCity, error, loading, refetch: getLocation };
};