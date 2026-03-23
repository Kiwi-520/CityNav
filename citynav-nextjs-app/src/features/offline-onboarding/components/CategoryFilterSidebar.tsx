"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';

type Props = {
  pois: POI[] | null;
  poisLoading: boolean;
  onNavigate: (poi: POI) => void;
  onRoutePopup?: (poi: POI) => void;
  userPosition: [number, number] | null;
  activeSections: Record<string, boolean>;
  onSectionToggle: (sectionTitle: string, categories: string[]) => void;
  onClearAll: () => void;
};

type Section = {
  title: string;
  icon: string;
  categories: string[];
  color: string;
};

const sections: Section[] = [
  {
    title: 'Tourist Attractions',
    icon: '🎭',
    categories: ['tourist_attraction', 'museum', 'monument', 'viewpoint'],
    color: 'purple',
  },
  {
    title: 'Healthcare',
    icon: '🏥',
    categories: ['hospital', 'clinic', 'pharmacy'],
    color: 'red',
  },
  {
    title: 'Transportation',
    icon: '🚆',
    categories: ['railway', 'bus_stop'],
    color: 'blue',
  },
  {
    title: 'Finance',
    icon: '🏦',
    categories: ['bank', 'atm'],
    color: 'green',
  },
  {
    title: 'Food & Stay',
    icon: '🏨',
    categories: ['hotel', 'restaurant', 'cafe'],
    color: 'amber',
  },
  {
    title: 'Services & More',
    icon: '🏪',
    categories: ['park', 'fuel', 'shopping', 'police', 'education', 'toilet'],
    color: 'teal',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; hover: string; activeBg: string }> = {
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/40', activeBg: 'bg-purple-600' },
  red: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', hover: 'hover:bg-red-100 dark:hover:bg-red-900/40', activeBg: 'bg-red-600' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40', activeBg: 'bg-blue-600' },
  green: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', hover: 'hover:bg-green-100 dark:hover:bg-green-900/40', activeBg: 'bg-green-600' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/40', activeBg: 'bg-amber-600' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', hover: 'hover:bg-teal-100 dark:hover:bg-teal-900/40', activeBg: 'bg-teal-600' },
};

const categoryIcons: Record<string, string> = {
  tourist_attraction: '🎭',
  museum: '🏛️',
  monument: '🗿',
  viewpoint: '👁️',
  hospital: '🏥',
  clinic: '⚕️',
  pharmacy: '💊',
  railway: '🚆',
  bus_stop: '🚌',
  bank: '🏦',
  atm: '🏧',
  hotel: '🏨',
  restaurant: '🍽️',
  cafe: '☕',
  park: '🌳',
  fuel: '⛽',
  shopping: '🛒',
  police: '🚔',
  education: '🎓',
  toilet: '🚻',
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function CategoryFilterSidebar({ pois, poisLoading, onNavigate, onRoutePopup, userPosition, activeSections, onSectionToggle, onClearAll }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileSheetHeight, setMobileSheetHeight] = useState(320);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const SHEET_MIN = 80;
  const SHEET_MAX = typeof window !== 'undefined' ? window.innerHeight - 120 : 600;

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionTitle]: !prev[sectionTitle] }));
  };

  const handleSectionSelect = (section: Section) => {
    onSectionToggle(section.title, section.categories);
    if (!activeSections[section.title]) {
      setExpandedSections((prev) => ({ ...prev, [section.title]: true }));
    }
    if (isMobile) {
      setMobileSheetOpen(true);
      setMobileSheetHeight(380);
    }
  };

  const hasAnyActive = Object.values(activeSections).some(Boolean);

  const handleNavigateToRoute = (poi: POI) => {
    if (onRoutePopup) {
      onRoutePopup(poi);
      return;
    }
    const sourceLat = userPosition ? userPosition[0] : 28.6139;
    const sourceLng = userPosition ? userPosition[1] : 77.2090;
    const params = new URLSearchParams({
      destination: poi.name || poi.category,
      sourceLat: sourceLat.toString(),
      sourceLng: sourceLng.toString(),
      destLat: poi.lat.toString(),
      destLng: poi.lon.toString(),
    });
    router.push(`/route-options?${params.toString()}`);
  };

  // Drag handlers for mobile bottom sheet
  const onDragStart = useCallback((clientY: number) => {
    dragRef.current = { startY: clientY, startHeight: mobileSheetHeight };
  }, [mobileSheetHeight]);

  const onDragMove = useCallback((clientY: number) => {
    if (!dragRef.current) return;
    const diff = dragRef.current.startY - clientY;
    setMobileSheetHeight(Math.min(SHEET_MAX, Math.max(SHEET_MIN, dragRef.current.startHeight + diff)));
  }, [SHEET_MAX]);

  const onDragEnd = useCallback(() => {
    if (!dragRef.current) return;
    if (mobileSheetHeight < 120) setMobileSheetOpen(false);
    dragRef.current = null;
  }, [mobileSheetHeight]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => { onDragStart(e.touches[0].clientY); }, [onDragStart]);
  const handleTouchMove = useCallback((e: React.TouchEvent) => { onDragMove(e.touches[0].clientY); }, [onDragMove]);
  const handleTouchEnd = useCallback(() => { onDragEnd(); }, [onDragEnd]);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e.clientY);
    const move = (ev: MouseEvent) => onDragMove(ev.clientY);
    const up = () => { onDragEnd(); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [onDragStart, onDragMove, onDragEnd]);

  // Group POIs by category
  const groupedPois: Record<string, POI[]> = {};
  if (pois) {
    pois.forEach((poi) => {
      if (!groupedPois[poi.category]) groupedPois[poi.category] = [];
      groupedPois[poi.category].push(poi);
    });
  }

  // Get POIs for currently active sections
  const activePois = sections
    .filter(s => activeSections[s.title])
    .flatMap(s => s.categories.flatMap(cat => groupedPois[cat] || []));

  // --- MOBILE LAYOUT ---
  if (isMobile) {
    return (
      <>
        {/* Horizontal scrollable filter chips - overlaid on map */}
        <div className="absolute top-0 left-0 right-0 z-[500] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2.5 overflow-x-auto no-scrollbar">
            {hasAnyActive && (
              <button
                onClick={onClearAll}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 active:scale-95 transition-transform"
              >
                ✕ Clear
              </button>
            )}
            {sections.map((section) => {
              const isSectionActive = !!activeSections[section.title];
              const poisInSection = section.categories.flatMap(cat => groupedPois[cat] || []);
              const colors = colorMap[section.color] || colorMap.blue;
              return (
                <button
                  key={section.title}
                  onClick={() => handleSectionSelect(section)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 border ${
                    isSectionActive
                      ? `${colors.activeBg} text-white border-transparent shadow-md`
                      : `bg-white dark:bg-slate-800 ${colors.text} ${colors.border}`
                  }`}
                >
                  <span className="text-sm">{section.icon}</span>
                  <span className="whitespace-nowrap">{section.title}</span>
                  {poisInSection.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSectionActive 
                        ? 'bg-white/30 text-white' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {poisInSection.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile bottom sheet for POI list */}
        {mobileSheetOpen && hasAnyActive && (
          <div
            style={{
              position: 'fixed',
              bottom: 64,
              left: 0,
              right: 0,
              height: mobileSheetHeight,
              zIndex: 1500,
              display: 'flex',
              flexDirection: 'column',
              background: 'white',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
              transition: dragRef.current ? 'none' : 'height 0.2s ease',
              overflow: 'hidden',
            }}
            className="dark:!bg-slate-900"
          >
            {/* Drag handle */}
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="flex flex-col items-center pt-2.5 pb-1.5 cursor-grab"
              style={{ touchAction: 'none', userSelect: 'none' }}
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 m-0">
                {activePois.length} Places Found
              </h4>
              <button
                onClick={() => setMobileSheetOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* POI list */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {poisLoading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Loading...</span>
                </div>
              ) : activePois.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">No places found for selected categories</div>
              ) : (
                <div className="space-y-2">
                  {activePois.map((poi) => {
                    const distance = userPosition
                      ? calculateDistance(userPosition[0], userPosition[1], poi.lat, poi.lon)
                      : null;
                    const sectionForPoi = sections.find(s => s.categories.includes(poi.category));
                    const colors = colorMap[sectionForPoi?.color || 'blue'];
                    return (
                      <div
                        key={poi.id}
                        className={`${colors.bg} border ${colors.border} rounded-xl p-3 active:scale-[0.98] transition-transform`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl flex-shrink-0">
                            {categoryIcons[poi.category] || '📍'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold ${colors.text} truncate`}>
                              {poi.name || 'Unnamed location'}
                            </div>
                            {distance != null && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {distance < 1000 ? `${Math.round(distance)}m away` : `${(distance / 1000).toFixed(1)}km away`}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleNavigateToRoute(poi)}
                            className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                          >
                            Go
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating button to open sheet when hidden but filters active */}
        {!mobileSheetOpen && hasAnyActive && activePois.length > 0 && (
          <button
            onClick={() => { setMobileSheetOpen(true); setMobileSheetHeight(380); }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1500] flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-full shadow-lg active:scale-95 transition-transform text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            {activePois.length} Places
          </button>
        )}

        {/* CSS for hiding scrollbar */}
        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </>
    );
  }

  // --- DESKTOP LAYOUT (original sidebar) ---
  return (
    <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-sm overflow-y-auto">
      <div className="sticky top-0 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-700 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Nearby Places
          </h3>
          {hasAnyActive && (
            <button
              onClick={onClearAll}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
            >
              Clear All
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select a category to show on map</p>
      </div>

      {poisLoading && (
        <div className="p-4">
          <div className="flex items-center justify-center gap-2 py-8">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-sm text-slate-600">Loading places...</span>
          </div>
        </div>
      )}

      {!poisLoading && (
        <div className="p-3">
          {sections.map((section) => {
            const isExpanded = expandedSections[section.title];
            const isSectionActive = !!activeSections[section.title];
            const poisInSection = section.categories.flatMap(cat => groupedPois[cat] || []);
            const colors = colorMap[section.color] || colorMap.blue;
            
            return (
              <div key={section.title} className="mb-3">
                {/* Section Header */}
                <div className="flex items-center gap-1 mb-2">
                  {/* Map toggle button */}
                  <button
                    onClick={() => handleSectionSelect(section)}
                    className={`flex-1 flex items-center justify-between px-3 py-2.5 border rounded-lg transition-all duration-200 ${
                      isSectionActive
                        ? `${colors.bg} ${colors.border} ring-2 ring-offset-1 ring-${section.color}-400 dark:ring-${section.color}-600 shadow-md`
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                    title={isSectionActive ? `Hide ${section.title} from map` : `Show ${section.title} on map`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{section.icon}</span>
                      <span className={`text-sm font-semibold ${
                        isSectionActive ? colors.text : 'text-slate-600 dark:text-slate-400'
                      }`}>{section.title}</span>
                      {poisInSection.length > 0 ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isSectionActive
                            ? `bg-white dark:bg-slate-800 ${colors.text}`
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          {poisInSection.length}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          0
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isSectionActive && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-800/80">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">On Map</span>
                        </div>
                      )}
                    </div>
                  </button>
                  {/* Expand/collapse chevron */}
                  <button
                    onClick={() => toggleSection(section.title)}
                    className={`flex-shrink-0 p-2 rounded-lg border transition-colors ${
                      isSectionActive
                        ? `${colors.bg} ${colors.border}`
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                    title={isExpanded ? 'Collapse list' : 'Expand list'}
                  >
                    <svg
                      className={`w-4 h-4 ${
                        isSectionActive ? colors.text : 'text-slate-500 dark:text-slate-400'
                      } transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Unavailable sub-categories shown below header (collapsed) */}
                {!isExpanded && (() => {
                  const unavailable = section.categories.filter(cat => !(groupedPois[cat]?.length));
                  if (unavailable.length === 0) return null;
                  if (unavailable.length === section.categories.length) {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1">
                        <svg className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <span className="text-[11px] font-medium text-red-500 dark:text-red-400">Not available nearby</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-wrap gap-1 px-2 mb-1">
                      {unavailable.map(cat => {
                        const label = cat === 'bus_stop' ? 'Bus Stop' : cat === 'tourist_attraction' ? 'Attractions' : cat.charAt(0).toUpperCase() + cat.slice(1);
                        return (
                          <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800">
                            {categoryIcons[cat] || '📍'} {label} — N/A
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Section Content - POI List */}
                {isExpanded && (
                  <div className="space-y-1.5 pl-1">
                    {poisInSection.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          <span className="text-xs font-semibold">Not available nearby</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">No {section.title.toLowerCase()} found within range</p>
                      </div>
                    ) : (
                      poisInSection.map((poi) => {
                        const distance = userPosition 
                          ? calculateDistance(userPosition[0], userPosition[1], poi.lat, poi.lon)
                          : null;
                        
                        return (
                          <div
                            key={poi.id}
                            className={`${colors.bg} border ${colors.border} rounded-lg p-2.5 ${colors.hover} transition-colors`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-base flex-shrink-0 mt-0.5">
                                {categoryIcons[poi.category] || '📍'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium ${colors.text} truncate`}>
                                  {poi.name || 'Unnamed location'}
                                </div>
                                {distance != null && (
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {distance < 1000 
                                      ? `${Math.round(distance)}m away`
                                      : `${(distance / 1000).toFixed(1)}km away`
                                    }
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleNavigateToRoute(poi)}
                                className="flex-shrink-0 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded shadow-sm transition-colors"
                                title="Get directions and compare routes"
                              >
                                Go
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
