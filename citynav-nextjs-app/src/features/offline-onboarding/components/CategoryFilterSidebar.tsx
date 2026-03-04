"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';

type Props = {
  pois: POI[] | null;
  poisLoading: boolean;
  onNavigate: (poi: POI) => void;
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
    categories: ['park', 'fuel', 'shopping', 'police', 'education'],
    color: 'teal',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/40' },
  red: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', hover: 'hover:bg-red-100 dark:hover:bg-red-900/40' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40' },
  green: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', hover: 'hover:bg-green-100 dark:hover:bg-green-900/40' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/40' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', hover: 'hover:bg-teal-100 dark:hover:bg-teal-900/40' },
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
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function CategoryFilterSidebar({ pois, poisLoading, onNavigate, userPosition, activeSections, onSectionToggle, onClearAll }: Props) {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionTitle]: !prev[sectionTitle] }));
  };

  const handleSectionSelect = (section: Section) => {
    // Toggle this section for map display
    onSectionToggle(section.title, section.categories);
    // Auto-expand when selecting, auto-collapse when deselecting
    if (!activeSections[section.title]) {
      setExpandedSections((prev) => ({ ...prev, [section.title]: true }));
    }
  };

  const hasAnyActive = Object.values(activeSections).some(Boolean);

  const handleNavigateToRoute = (poi: POI) => {
    // Get source coordinates
    const sourceLat = userPosition ? userPosition[0] : 28.6139;
    const sourceLng = userPosition ? userPosition[1] : 77.2090;
    
    // Navigate to route-options page
    const params = new URLSearchParams({
      destination: poi.name || poi.category,
      sourceLat: sourceLat.toString(),
      sourceLng: sourceLng.toString(),
      destLat: poi.lat.toString(),
      destLng: poi.lon.toString(),
    });
    
    router.push(`/route-options?${params.toString()}`);
  };

  // Group POIs by category
  const groupedPois: Record<string, POI[]> = {};
  if (pois) {
    pois.forEach((poi) => {
      if (!groupedPois[poi.category]) {
        groupedPois[poi.category] = [];
      }
      groupedPois[poi.category].push(poi);
    });
  }

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
                      {poisInSection.length > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isSectionActive
                            ? `bg-white dark:bg-slate-800 ${colors.text}`
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          {poisInSection.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Active indicator */}
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

                {/* Section Content - POI List */}
                {isExpanded && (
                  <div className="space-y-1.5 pl-1">
                    {poisInSection.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-slate-400">
                        No {section.title.toLowerCase()} places nearby
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
