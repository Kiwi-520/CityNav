"use client";

import { useState, useEffect } from "react";
import {
  FiDownload,
  FiTrash2,
  FiMapPin,
  FiWifi,
  FiWifiOff,
  FiNavigation,
  FiSettings,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiHardDrive,
  FiMap,
  FiGlobe,
  FiLayers,
} from "react-icons/fi";
import PageHeader from "@/components/PageHeader";
import { useLocation } from "@/hooks/useLiveLocation";
import LocationService from "@/services/location.service";
import styles from "./offline-onboarding.module.css";

interface CityPack {
  id: string;
  name: string;
  country: string;
  state?: string;
  size: string;
  lastUpdated: string;
  downloadStatus: "available" | "downloading" | "downloaded" | "error";
  downloadProgress?: number;
  lat: number;
  lon: number;
  distance?: number;
  type: "city" | "map-tiles" | "poi-data" | "routes";
}

interface OfflineCapability {
  id: string;
  name: string;
  description: string;
  isAvailable: boolean;
  cacheSize: string;
  lastUpdated?: string;
}

interface ServiceWorkerStatus {
  isRegistered: boolean;
  isActive: boolean;
  cacheNames: string[];
  storageUsed: number;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export default function OfflineOnboardingPage() {
  const { location, error, loading, requestLocation } = useLocation();
  const [isOnline, setIsOnline] = useState(true);
  const [availablePacks, setAvailablePacks] = useState<CityPack[]>([]);
  const [downloadedPacks, setDownloadedPacks] = useState<CityPack[]>([]);
  const [serviceWorkerStatus, setServiceWorkerStatus] =
    useState<ServiceWorkerStatus>({
      isRegistered: false,
      isActive: false,
      cacheNames: [],
      storageUsed: 0,
    });
  const [offlineCapabilities, setOfflineCapabilities] = useState<
    OfflineCapability[]
  >([
    {
      id: "service-worker",
      name: "Service Worker",
      description: "Background sync and offline functionality",
      isAvailable: false,
      cacheSize: "0 MB",
    },
    {
      id: "map-tiles",
      name: "Map Tiles Cache",
      description: "Offline maps for core city zones",
      isAvailable: false,
      cacheSize: "0 MB",
    },
    {
      id: "poi-data",
      name: "POI Data Cache",
      description: "Points of interest and essential locations",
      isAvailable: false,
      cacheSize: "0 MB",
    },
    {
      id: "routes-cache",
      name: "Routes Cache",
      description: "User's selected routes and navigation data",
      isAvailable: false,
      cacheSize: "0 MB",
    },
  ]);
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([
    {
      id: "service-worker",
      title: "Enable Offline Mode",
      description:
        "Set up service worker for offline functionality and background sync",
      completed: false,
      required: true,
    },
    {
      id: "location",
      title: "Enable Location Services",
      description:
        "Allow CityNav to access your location for personalized navigation",
      completed: false,
      required: true,
    },
    {
      id: "cache-essentials",
      title: "Cache Essential Data",
      description:
        "Download core app data, maps, and POI information for offline use",
      completed: false,
      required: false,
    },
    {
      id: "offline-maps",
      title: "Download Area Maps",
      description: "Download detailed maps for your specific area",
      completed: false,
      required: false,
    },
    {
      id: "preferences",
      title: "Set Preferences",
      description:
        "Choose your preferred navigation settings and offline features",
      completed: false,
      required: false,
    },
  ]);

  const locationService = LocationService.getInstance();

  // Check service worker status and cache information
  const checkServiceWorkerStatus = async () => {
    if ("serviceWorker" in navigator && "caches" in window) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const cacheNames = await caches.keys();

        // Calculate storage usage
        let totalSize = 0;
        if ("storage" in navigator && "estimate" in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          totalSize = estimate.usage || 0;
        }

        setServiceWorkerStatus({
          isRegistered: !!registration,
          isActive: !!registration?.active,
          cacheNames,
          storageUsed: totalSize,
        });

        // Update offline capabilities
        setOfflineCapabilities((prev) =>
          prev.map((cap) => {
            if (cap.id === "service-worker") {
              return {
                ...cap,
                isAvailable: !!registration,
                cacheSize: formatBytes(totalSize),
              };
            }
            return cap;
          })
        );

        // Update onboarding steps
        setOnboardingSteps((prev) =>
          prev.map((step) => {
            if (step.id === "service-worker") {
              return { ...step, completed: !!registration?.active };
            }
            if (step.id === "cache-essentials") {
              return { ...step, completed: cacheNames.length > 0 };
            }
            return step;
          })
        );
      } catch (error) {
        console.error("Error checking service worker status:", error);
      }
    }
  };

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Pre-cache essential resources
  const preCacheEssentials = async () => {
    if ("caches" in window) {
      try {
        const cache = await caches.open("citynav-essentials");

        const essentialResources = [
          "/",
          "/essential-maps",
          "/offline-onboarding",
          "/search-discovery",
          "/route-options",
          "/static/js/bundle.js",
          "/static/css/main.css",
        ];

        await cache.addAll(essentialResources);
        console.log("Essential resources cached");

        // Update cache status
        await checkServiceWorkerStatus();
      } catch (error) {
        console.error("Error pre-caching essentials:", error);
      }
    }
  };

  // Cache map tiles for current location
  const cacheMapTiles = async (
    lat: number,
    lon: number,
    zoomLevel: number = 13
  ) => {
    if ("caches" in window) {
      try {
        const cache = await caches.open("openstreetmap-tiles");
        const tileUrls = [];

        // Generate tile URLs for the area around the location
        const tileX = Math.floor(((lon + 180) / 360) * Math.pow(2, zoomLevel));
        const tileY = Math.floor(
          ((1 -
            Math.log(
              Math.tan((lat * Math.PI) / 180) +
                1 / Math.cos((lat * Math.PI) / 180)
            ) /
              Math.PI) /
            2) *
            Math.pow(2, zoomLevel)
        );

        // Cache tiles in a grid around the location
        for (let x = tileX - 2; x <= tileX + 2; x++) {
          for (let y = tileY - 2; y <= tileY + 2; y++) {
            tileUrls.push(
              `https://a.tile.openstreetmap.org/${zoomLevel}/${x}/${y}.png`
            );
          }
        }

        // Pre-fetch tiles
        const promises = tileUrls.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (error) {
            console.warn(`Failed to cache tile: ${url}`, error);
          }
        });

        await Promise.allSettled(promises);
        console.log(`Cached ${tileUrls.length} map tiles for location`);

        await checkServiceWorkerStatus();
      } catch (error) {
        console.error("Error caching map tiles:", error);
      }
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOnline(navigator.onLine);

    // Load saved packs
    const saved = localStorage.getItem("downloadedCityPacks");
    if (saved) {
      const savedPacks = JSON.parse(saved);
      setDownloadedPacks(savedPacks);
    }

    // Initialize service worker status
    checkServiceWorkerStatus();

    // Auto-cache essentials if service worker is available
    if ("serviceWorker" in navigator) {
      preCacheEssentials();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (location) {
      setOnboardingSteps((prev) =>
        prev.map((step) =>
          step.id === "location" ? { ...step, completed: true } : step
        )
      );

      const nearbyCities = generateNearbyCities(location);

      const packsWithDistance = nearbyCities
        .map((pack) => ({
          ...pack,
          distance: locationService.calculateDistance(
            location.lat,
            location.lon,
            pack.lat,
            pack.lon
          ),
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setAvailablePacks(packsWithDistance);

      // Auto-cache map tiles for current location
      cacheMapTiles(location.lat, location.lon);
    }
  }, [location, locationService]);

  const generateNearbyCities = (currentLocation: any): CityPack[] => {
    const cities = [
      {
        name: currentLocation.city,
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        isCurrentCity: true,
      },
      {
        name: "Nearby Area 1",
        lat: currentLocation.lat + 0.1,
        lon: currentLocation.lon + 0.1,
      },
      {
        name: "Nearby Area 2",
        lat: currentLocation.lat - 0.1,
        lon: currentLocation.lon - 0.1,
      },
      {
        name: "Nearby Area 3",
        lat: currentLocation.lat + 0.05,
        lon: currentLocation.lon - 0.05,
      },
    ];

    return cities.map((city, index) => ({
      id: city.name.toLowerCase().replace(/\s+/g, "-"),
      name: city.name,
      country: currentLocation.country || "Unknown",
      state: currentLocation.state,
      size: city.isCurrentCity ? "45 MB" : `${30 + index * 10} MB`,
      lastUpdated: "2025-01-01",
      downloadStatus: "available" as const,
      lat: city.lat,
      lon: city.lon,
      type: "city" as const,
    }));
  };

  const handleLocationRequest = async () => {
    try {
      await requestLocation();
    } catch (err) {
      console.error("Failed to get location:", err);
    }
  };

  const getCompletedSteps = () => {
    return onboardingSteps.filter((step) => step.completed).length;
  };

  const getOnboardingProgress = () => {
    return Math.round((getCompletedSteps() / onboardingSteps.length) * 100);
  };

  const getTotalDownloadedSize = () => {
    return downloadedPacks
      .reduce((total, pack) => {
        const size = parseFloat(pack.size.replace(" MB", ""));
        return total + size;
      }, 0)
      .toFixed(1);
  };

  const handleDownload = async (pack: CityPack) => {
    if (!isOnline) {
      alert("Internet connection required for downloads");
      return;
    }

    setAvailablePacks((prev) =>
      prev.map((p) =>
        p.id === pack.id
          ? { ...p, downloadStatus: "downloading", downloadProgress: 0 }
          : p
      )
    );

    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setAvailablePacks((prev) =>
        prev.map((p) =>
          p.id === pack.id ? { ...p, downloadProgress: progress } : p
        )
      );
    }

    const downloadedPack = { ...pack, downloadStatus: "downloaded" as const };
    setAvailablePacks((prev) =>
      prev.map((p) => (p.id === pack.id ? downloadedPack : p))
    );

    const newDownloadedPacks = [...downloadedPacks, downloadedPack];
    setDownloadedPacks(newDownloadedPacks);

    localStorage.setItem(
      "downloadedCityPacks",
      JSON.stringify(newDownloadedPacks)
    );

    setOnboardingSteps((prev) =>
      prev.map((step) =>
        step.id === "offline-maps" ? { ...step, completed: true } : step
      )
    );
  };

  const handleDelete = (packId: string) => {
    const updatedDownloaded = downloadedPacks.filter(
      (pack) => pack.id !== packId
    );
    setDownloadedPacks(updatedDownloaded);

    setAvailablePacks((prev) =>
      prev.map((pack) =>
        pack.id === packId ? { ...pack, downloadStatus: "available" } : pack
      )
    );

    localStorage.setItem(
      "downloadedCityPacks",
      JSON.stringify(updatedDownloaded)
    );

    if (updatedDownloaded.length === 0) {
      setOnboardingSteps((prev) =>
        prev.map((step) =>
          step.id === "offline-maps" ? { ...step, completed: false } : step
        )
      );
    }
  };

  return (
    <div className={styles.container}>
      <PageHeader title="Offline Onboarding" showBack backHref="/" />

      <div style={{ padding: "20px" }}>
        <div className={styles.progressCard}>
          <h2>Setup Progress</h2>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${getOnboardingProgress()}%` }}
            />
          </div>
          <p>
            {getCompletedSteps()} of {onboardingSteps.length} steps completed (
            {getOnboardingProgress()}%)
          </p>
        </div>

        <div className={styles.stepsContainer}>
          {onboardingSteps.map((step) => (
            <div
              key={step.id}
              className={`${styles.stepCard} ${
                step.completed ? styles.completed : ""
              }`}
            >
              <div className={styles.stepHeader}>
                <div className={styles.stepIcon}>
                  {step.completed ? (
                    <FiCheck className={styles.checkIcon} />
                  ) : step.id === "location" && loading ? (
                    <FiRefreshCw className={styles.loadingIcon} />
                  ) : step.id === "service-worker" ? (
                    <FiGlobe />
                  ) : step.id === "location" ? (
                    <FiNavigation />
                  ) : step.id === "cache-essentials" ? (
                    <FiHardDrive />
                  ) : step.id === "offline-maps" ? (
                    <FiMap />
                  ) : (
                    <FiSettings />
                  )}
                </div>
                <div className={styles.stepContent}>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                {step.required && !step.completed && (
                  <span className={styles.requiredBadge}>Required</span>
                )}
              </div>

              {step.id === "service-worker" && !step.completed && (
                <div className={styles.stepActions}>
                  <button
                    onClick={preCacheEssentials}
                    className={styles.actionButton}
                  >
                    Enable Offline Mode
                  </button>
                </div>
              )}

              {step.id === "location" && !step.completed && (
                <div className={styles.stepActions}>
                  {error && (
                    <div className={styles.errorMessage}>
                      <FiX className={styles.errorIcon} />
                      <span>{error.message}</span>
                    </div>
                  )}
                  <button
                    onClick={handleLocationRequest}
                    disabled={loading}
                    className={styles.actionButton}
                  >
                    {loading ? "Getting Location..." : "Enable Location"}
                  </button>
                </div>
              )}

              {step.id === "cache-essentials" && !step.completed && (
                <div className={styles.stepActions}>
                  <button
                    onClick={preCacheEssentials}
                    className={styles.actionButton}
                  >
                    Cache Essential Data
                  </button>
                </div>
              )}

              {step.id === "location" && step.completed && location && (
                <div className={styles.locationInfo}>
                  <div className={styles.connectionStatus}>
                    {isOnline ? (
                      <>
                        <FiWifi className={styles.onlineIcon} /> Online
                      </>
                    ) : (
                      <>
                        <FiWifiOff className={styles.offlineIcon} /> Offline
                      </>
                    )}
                  </div>
                  <div className={styles.locationDetails}>
                    <p>
                      <FiMapPin /> Current Location: {location.city},{" "}
                      {location.country}
                    </p>
                    {location.address && (
                      <p className={styles.addressText}>{location.address}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <h3>{serviceWorkerStatus.isActive ? "Active" : "Inactive"}</h3>
            <p>Service Worker</p>
          </div>
          <div className={styles.statCard}>
            <h3>{formatBytes(serviceWorkerStatus.storageUsed)}</h3>
            <p>Cache Storage</p>
          </div>
          <div className={styles.statCard}>
            <h3>{downloadedPacks.length}</h3>
            <p>Downloaded Areas</p>
          </div>
          <div className={styles.statCard}>
            <h3>{location ? location.city : "Unknown"}</h3>
            <p>Current Location</p>
          </div>
        </div>

        <section className={styles.section}>
          <h2>Offline Capabilities</h2>
          <div className={styles.packGrid}>
            {offlineCapabilities.map((capability) => (
              <div
                key={capability.id}
                className={`${styles.packCard} ${
                  capability.isAvailable ? styles.available : styles.unavailable
                }`}
              >
                <div className={styles.packInfo}>
                  <h3>{capability.name}</h3>
                  <p>{capability.description}</p>
                  <span className={styles.size}>{capability.cacheSize}</span>
                  {capability.lastUpdated && (
                    <span className={styles.lastUpdated}>
                      Updated: {capability.lastUpdated}
                    </span>
                  )}
                </div>
                <div className={styles.statusIcon}>
                  {capability.isAvailable ? (
                    <FiCheck className={styles.checkIcon} />
                  ) : (
                    <FiX className={styles.errorIcon} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {downloadedPacks.length > 0 && (
          <section className={styles.section}>
            <h2>Downloaded Maps</h2>
            <div className={styles.packGrid}>
              {downloadedPacks.map((pack) => (
                <div key={pack.id} className={styles.packCard}>
                  <div className={styles.packInfo}>
                    <h3>{pack.name}</h3>
                    <p>
                      {pack.state ? `${pack.state}, ` : ""}
                      {pack.country}
                    </p>
                    <span className={styles.size}>{pack.size}</span>
                    {pack.distance !== undefined && (
                      <span className={styles.distance}>
                        {pack.distance.toFixed(1)} km away
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(pack.id)}
                    className={styles.deleteButton}
                    title="Delete offline map"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {availablePacks.length > 0 && (
          <section className={styles.section}>
            <h2>Available Downloads {location && `near ${location.city}`}</h2>
            <div className={styles.packGrid}>
              {availablePacks
                .filter((pack) => pack.downloadStatus !== "downloaded")
                .map((pack) => (
                  <div key={pack.id} className={styles.packCard}>
                    <div className={styles.packInfo}>
                      <h3>{pack.name}</h3>
                      <p>
                        {pack.state ? `${pack.state}, ` : ""}
                        {pack.country}
                      </p>
                      <span className={styles.size}>{pack.size}</span>
                      {pack.distance !== undefined && (
                        <span className={styles.distance}>
                          {pack.distance.toFixed(1)} km away
                        </span>
                      )}
                    </div>

                    {pack.downloadStatus === "available" && (
                      <button
                        onClick={() => handleDownload(pack)}
                        className={styles.downloadButton}
                        disabled={!isOnline}
                        title={
                          !isOnline
                            ? "Internet connection required"
                            : "Download offline map"
                        }
                      >
                        <FiDownload />
                      </button>
                    )}

                    {pack.downloadStatus === "downloading" && (
                      <div className={styles.progressContainer}>
                        <div className={styles.downloadProgressBar}>
                          <div
                            className={styles.downloadProgressFill}
                            style={{ width: `${pack.downloadProgress}%` }}
                          />
                        </div>
                        <span className={styles.progressText}>
                          {pack.downloadProgress}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}

        {!location && !loading && (
          <div className={styles.emptyState}>
            <FiNavigation className={styles.emptyIcon} />
            <h3>Enable Location Services</h3>
            <p>Allow location access to see maps available for your area</p>
            <button
              onClick={handleLocationRequest}
              className={styles.actionButton}
            >
              Get My Location
            </button>
          </div>
        )}

        <div className={styles.infoSection}>
          <h3>About Offline Onboarding</h3>
          <ul>
            <li>
              Enable location services for personalized maps and navigation
            </li>
            <li>
              Download maps for your area to use without internet connection
            </li>
            <li>Maps include roads, landmarks, and navigation data</li>
            <li>Offline maps work with GPS for turn-by-turn navigation</li>
            <li>Update maps regularly for the latest information</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
