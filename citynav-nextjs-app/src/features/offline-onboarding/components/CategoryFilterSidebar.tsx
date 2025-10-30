"use client";

import React, { useState } from 'react';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';

type Props = {
  pois: POI[] | null;
  poisLoading: boolean;
  onNavigate: (poi: POI) => void;
  userPosition: [number, number] | null;
};

type Section = {
  title: string;
  icon: string;
  categories: string[];
  color: string;
};

const sections: Section[] = [
  {
    title: 'Healthcare',
    icon: '🏥',
    categories: ['hospital', 'clinic'],
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
    title: 'Hospitality',
    icon: '🏨',
    categories: ['hotel', 'restaurant'],
    color: 'amber',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', hover: 'hover:bg-red-100' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:bg-blue-100' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', hover: 'hover:bg-green-100' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hover: 'hover:bg-amber-100' },
};

const categoryIcons: Record<string, string> = {
  hospital: '🏥',
  clinic: '⚕️',
  railway: '🚆',
  bus_stop: '🚌',
  bank: '🏦',
  atm: '🏧',
  hotel: '🏨',
  restaurant: '🍽️',
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

export default function CategoryFilterSidebar({ pois, poisLoading, onNavigate, userPosition }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Healthcare: true,
    Transportation: true,
    Finance: true,
    Hospitality: true,
  });

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionTitle]: !prev[sectionTitle] }));
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
    <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 shadow-sm overflow-y-auto">
      <div className="sticky top-0 bg-gradient-to-r from-slate-50 to-white px-4 py-4 border-b border-slate-200 z-10">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Nearby Places
        </h3>
        <p className="text-xs text-slate-500 mt-1">Explore places around you</p>
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
            const poisInSection = section.categories.flatMap(cat => groupedPois[cat] || []);
            const colors = colorMap[section.color] || colorMap.blue;
            
            return (
              <div key={section.title} className="mb-3">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 ${colors.bg} ${colors.border} border rounded-lg transition-colors mb-2`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{section.icon}</span>
                    <span className={`text-sm font-semibold ${colors.text}`}>{section.title}</span>
                    {poisInSection.length > 0 && (
                      <span className={`px-2 py-0.5 bg-white ${colors.text} rounded-full text-xs font-medium`}>
                        {poisInSection.length}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 ${colors.text} transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

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
                                onClick={() => onNavigate(poi)}
                                className="flex-shrink-0 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded shadow-sm transition-colors"
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
