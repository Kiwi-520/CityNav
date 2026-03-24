"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { multimodalEngine } from '@/services/multimodal.service';
import { enhancedMultimodalEngine } from '@/services/enhanced-multimodal.service';
import { MultimodalRoute, RouteRequest } from '@/types/multimodal';
import { getAllCachedRoutes, type CachedRouteEntry } from '@/features/offline-onboarding/hooks/useRoute';

type Props = {
  sourceCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
  destName: string;
  onClose: () => void;
  onStartNavigation?: (route: MultimodalRoute) => void;
};

const getModeDisplay = (mode: string) => {
  const displays: Record<string, { icon: string; color: string; label: string }> = {
    walk: { icon: '🚶', color: '#22c55e', label: 'Walk' },
    bus: { icon: '🚌', color: '#f59e0b', label: 'Bus' },
    metro: { icon: '🚇', color: '#3b82f6', label: 'Metro' },
    auto: { icon: '🛺', color: '#eab308', label: 'Auto' },
    cab: { icon: '🚗', color: '#8b5cf6', label: 'Cab' },
  };
  return displays[mode] || displays.walk;
};

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export default function DraggableRoutePopup({ sourceCoords, destCoords, destName, onClose, onStartNavigation }: Props) {
  const [routes, setRoutes] = useState<MultimodalRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState('Your Location');

  // Draggable state
  const [height, setHeight] = useState(420);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const MIN_HEIGHT = 180;
  const MAX_HEIGHT = typeof window !== 'undefined' ? window.innerHeight - 80 : 700;

  // Drag handlers
  const onDragStart = useCallback((clientY: number) => {
    dragRef.current = { startY: clientY, startHeight: height };
  }, [height]);

  const onDragMove = useCallback((clientY: number) => {
    if (!dragRef.current) return;
    const diff = dragRef.current.startY - clientY;
    const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragRef.current.startHeight + diff));
    setHeight(newH);
  }, [MAX_HEIGHT]);

  const onDragEnd = useCallback(() => {
    if (!dragRef.current) return;
    // Snap: if dragged below 120px, close
    if (height < 120) {
      onClose();
    }
    dragRef.current = null;
  }, [height, onClose]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e.clientY);
    const handleMouseMove = (ev: MouseEvent) => onDragMove(ev.clientY);
    const handleMouseUp = () => {
      onDragEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onDragStart, onDragMove, onDragEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    onDragStart(e.touches[0].clientY);
  }, [onDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    onDragMove(e.touches[0].clientY);
  }, [onDragMove]);

  const handleTouchEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  const [isOffline, setIsOffline] = useState(false);

  // Track online/offline status
  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  // Fetch source name (only when online)
  useEffect(() => {
    if (isOffline) return;
    (async () => {
      try {
        const res = await fetch(`/api/google-geocode?lat=${sourceCoords.lat}&lng=${sourceCoords.lng}`);
        if (res.ok) {
          const data = await res.json();
          if (data.results?.[0]) {
            const components = data.results[0].address_components || [];
            const get = (t: string) => components.find((c: any) => c.types.includes(t))?.long_name || '';
            const name = get('neighborhood') || get('sublocality_level_1') || get('locality') || '';
            if (name) setSourceName(name);
          }
        }
      } catch { /* use default */ }
    })();
  }, [sourceCoords, isOffline]);

  // Fetch routes (online) or load from cache (offline)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // When offline, try to load cached routes from IndexedDB
      if (isOffline) {
        try {
          const cached = await getAllCachedRoutes();
          if (cancelled) return;
          // Find cached routes matching this destination (within ~500m)
          const matching = cached.filter(entry => {
            if (entry.toLat == null || entry.toLon == null) {
              // Try to parse from key
              const parts = entry.key.split(':');
              if (parts.length !== 2) return false;
              const [toLat, toLon] = parts[1].split(',').map(Number);
              if (isNaN(toLat) || isNaN(toLon)) return false;
              const dist = Math.sqrt((toLat - destCoords.lat) ** 2 + (toLon - destCoords.lng) ** 2);
              return dist < 0.005; // ~500m
            }
            const dist = Math.sqrt((entry.toLat - destCoords.lat) ** 2 + (entry.toLon - destCoords.lng) ** 2);
            return dist < 0.005;
          });

          if (matching.length > 0 && !cancelled) {
            // Convert cached RouteResult entries to MultimodalRoute format
            const offlineRoutes: MultimodalRoute[] = matching.map((entry, i) => ({
              id: `offline-${i}`,
              type: 'balanced' as const,
              name: i === 0 ? 'Saved Route' : `Saved Route ${i + 1}`,
              segments: entry.route.steps.map((step, si) => ({
                id: `seg-${si}`,
                mode: 'walk' as const,
                from: { lat: 0, lng: 0 },
                to: { lat: 0, lng: 0 },
                distance: step.distance,
                duration: step.duration / 60, // convert seconds to minutes
                cost: 0,
                instruction: step.name || step.maneuver || 'Continue',
              })),
              totalDistance: entry.route.distance,
              totalDuration: entry.route.duration / 60, // convert seconds to minutes
              totalCost: 0,
              transferCount: 0,
              modesUsed: ['walk'],
              description: 'Saved offline route',
              warnings: ['📶 Offline — showing saved directions'],
            }));
            setRoutes(offlineRoutes);
            setLoading(false);
            return;
          }
        } catch { /* fall through */ }
        if (!cancelled) {
          setRoutes([]);
          setLoading(false);
        }
        return;
      }

      const request: RouteRequest = {
        source: { lat: sourceCoords.lat, lng: sourceCoords.lng, name: sourceName },
        destination: { lat: destCoords.lat, lng: destCoords.lng, name: destName },
        preferences: { prioritize: 'time', maxWalkingDistance: 1000 },
      };
      try {
        const response = await enhancedMultimodalEngine.calculateRoutesWithStops(request);
        if (!cancelled) setRoutes(response.routes);
      } catch {
        try {
          const fallback = await multimodalEngine.calculateRoutes(request);
          if (!cancelled) setRoutes(fallback.routes);
        } catch {
          if (!cancelled) setRoutes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sourceCoords, destCoords, destName, sourceName, isOffline]);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: 64,
        left: 0,
        right: 0,
        height,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
        transition: dragRef.current ? 'none' : 'height 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          padding: '10px 0 6px',
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 3, background: '#d1d5db' }} />
      </div>

      {/* Header */}
      <div style={{
        padding: '4px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f1f5f9',
        flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
            🧭 Routes to {destName}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            From {sourceName}{isOffline ? ' · 📶 Offline' : ''}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid #e2e8f0', background: '#f8fafc',
            cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>🔄</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{isOffline ? 'Checking saved routes...' : 'Fetching routes...'}</div>
            <div style={{ fontSize: 12, marginTop: 4, color: '#94a3b8' }}>{isOffline ? 'Looking in offline cache' : 'Getting live traffic data'}</div>
          </div>
        ) : routes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>{isOffline ? '📶' : '😕'}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{isOffline ? 'You are offline' : 'No routes found'}</div>
            {isOffline && (
              <div style={{ fontSize: 12, marginTop: 6, color: '#94a3b8', lineHeight: 1.5 }}>
                No saved directions for this destination.<br/>Routes are cached when you navigate online.
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Quick stat pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {(() => {
                const fastest = [...routes].sort((a, b) => a.totalDuration - b.totalDuration)[0];
                const cheapest = [...routes].sort((a, b) => a.totalCost - b.totalCost)[0];
                return (
                  <>
                    <div style={{
                      flexShrink: 0, padding: '6px 12px', borderRadius: 20,
                      background: '#ecfdf5', border: '1px solid #bbf7d0',
                      fontSize: 12, fontWeight: 600, color: '#15803d', whiteSpace: 'nowrap',
                    }}>
                      ⚡ Fastest: {formatTime(fastest.totalDuration)}
                    </div>
                    <div style={{
                      flexShrink: 0, padding: '6px 12px', borderRadius: 20,
                      background: '#fefce8', border: '1px solid #fde68a',
                      fontSize: 12, fontWeight: 600, color: '#a16207', whiteSpace: 'nowrap',
                    }}>
                      💰 Cheapest: ₹{cheapest.totalCost}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Route cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {routes.map((route, i) => {
                const primary = getModeDisplay(route.modesUsed[0]);
                const isExpanded = expandedRouteId === route.id;
                return (
                  <div key={route.id} style={{
                    border: `1.5px solid ${i === 0 ? '#a5b4fc' : '#e2e8f0'}`,
                    borderRadius: 14,
                    background: i === 0 ? '#f5f3ff' : 'white',
                    overflow: 'hidden',
                  }}>
                    {/* Route summary row */}
                    <button
                      onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                      style={{
                        width: '100%', padding: '12px 14px', border: 'none', cursor: 'pointer',
                        background: 'transparent', display: 'flex', alignItems: 'center', gap: 10,
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{primary.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                          {route.name}
                          {i === 0 && (
                            <span style={{
                              marginLeft: 8, fontSize: 10, background: '#10b981', color: 'white',
                              padding: '2px 6px', borderRadius: 6, fontWeight: 700, verticalAlign: 'middle',
                            }}>BEST</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          <span>⏱️ {formatTime(route.totalDuration)}</span>
                          <span>💰 ₹{route.totalCost}</span>
                          <span>📏 {formatDistance(route.totalDistance)}</span>
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' }}>
                        {/* Mode badges */}
                        <div style={{ display: 'flex', gap: 6, padding: '10px 0', flexWrap: 'wrap' }}>
                          {route.modesUsed.map(mode => {
                            const m = getModeDisplay(mode);
                            return (
                              <span key={mode} style={{
                                padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                background: `${m.color}18`, color: m.color, border: `1px solid ${m.color}40`,
                              }}>
                                {m.icon} {m.label}
                              </span>
                            );
                          })}
                        </div>

                        {/* Segments */}
                        {route.segments && route.segments.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            {route.segments.map((seg, si) => {
                              const sm = getModeDisplay(seg.mode);
                              return (
                                <div key={si} style={{
                                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0',
                                  borderBottom: si < route.segments.length - 1 ? '1px solid #f1f5f9' : 'none',
                                }}>
                                  <span style={{ fontSize: 16, marginTop: 2 }}>{sm.icon}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>
                                      {seg.instruction || `${sm.label} - ${formatDistance(seg.distance)}`}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                      {formatTime(seg.duration)} · {formatDistance(seg.distance)}
                                      {seg.cost > 0 && ` · ₹${seg.cost}`}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Navigate button */}
                        <button
                          onClick={() => onStartNavigation?.(route)}
                          style={{
                            width: '100%', marginTop: 10, padding: '10px 16px',
                            border: 'none', borderRadius: 10,
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                          }}
                        >
                          🧭 Start Navigation
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
