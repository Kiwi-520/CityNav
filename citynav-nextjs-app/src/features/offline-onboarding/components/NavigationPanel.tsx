import React from 'react';

type Step = { maneuver?: string; name?: string; distance: number; duration: number };

type Props = {
  selectedDest: { lat: number; lon: number } | null;
  setSelectedDest: (d: { lat: number; lon: number } | null) => void;
  route?: { distance: number; duration: number; steps: Step[] } | null;
  routeLoading?: boolean;
  routeError?: string | null;
  isOnline?: boolean;
  fromCache?: boolean;
};

/** Format distance in a human-readable way */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Format duration in a human-readable way */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs} hr ${remainMins} min` : `${hrs} hr`;
}

/** Turn maneuver codes into readable text with appropriate icons */
function getManeuverInfo(maneuver?: string): { icon: string; label: string } {
  const map: Record<string, { icon: string; label: string }> = {
    'turn-left': { icon: '↰', label: 'Turn left' },
    'turn-right': { icon: '↱', label: 'Turn right' },
    'turn-slight-left': { icon: '↖', label: 'Slight left' },
    'turn-slight-right': { icon: '↗', label: 'Slight right' },
    'turn-sharp-left': { icon: '⤹', label: 'Sharp left' },
    'turn-sharp-right': { icon: '⤸', label: 'Sharp right' },
    'uturn-left': { icon: '↩', label: 'U-turn left' },
    'uturn-right': { icon: '↪', label: 'U-turn right' },
    'keep-left': { icon: '←', label: 'Keep left' },
    'keep-right': { icon: '→', label: 'Keep right' },
    'merge': { icon: '⇢', label: 'Merge' },
    'fork-left': { icon: '⑂', label: 'Fork left' },
    'fork-right': { icon: '⑂', label: 'Fork right' },
    'ramp-left': { icon: '↰', label: 'Take ramp left' },
    'ramp-right': { icon: '↱', label: 'Take ramp right' },
    'roundabout-left': { icon: '↺', label: 'Roundabout left' },
    'roundabout-right': { icon: '↻', label: 'Roundabout right' },
    'straight': { icon: '↑', label: 'Continue straight' },
    'depart': { icon: '🚀', label: 'Depart' },
    'arrive': { icon: '🏁', label: 'Arrive' },
    'DRIVING': { icon: '🚗', label: 'Drive' },
    'WALKING': { icon: '🚶', label: 'Walk' },
    'BICYCLING': { icon: '🚲', label: 'Cycle' },
    'TRANSIT': { icon: '🚌', label: 'Transit' },
  };
  if (maneuver && map[maneuver]) return map[maneuver];
  return { icon: '↑', label: 'Continue' };
}

/** Build the readable instruction text for a step */
function getStepInstruction(step: Step): string {
  // Prefer `name` (the stripped html_instructions from Google) as it's the real instruction
  if (step.name && step.name.trim().length > 0) {
    return step.name;
  }
  // Fallback: convert maneuver code to readable text
  const info = getManeuverInfo(step.maneuver);
  return info.label;
}

export default function NavigationPanel({ selectedDest, setSelectedDest, route, routeLoading, routeError, isOnline = true, fromCache = false }: Props) {
  if (!selectedDest) return null;
  const showingOffline = !isOnline || fromCache;
  
  return (
    <div className="relative z-[1001]">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-w-[400px] w-[92vw] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Offline banner */}
        {showingOffline && route && (
          <div className="bg-amber-500 dark:bg-amber-600 px-4 py-2 flex items-center gap-2 text-white text-xs font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M13 10V6m0 0L9.5 9.5M13 6l3.5 3.5" />
            </svg>
            <span>Offline Mode — Showing saved directions</span>
          </div>
        )}
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <h3 className="text-base font-semibold text-white">Navigation</h3>
            </div>
            <div className="text-xs text-indigo-100 font-mono mt-0.5 truncate">
              {selectedDest.lat.toFixed(5)}, {selectedDest.lon.toFixed(5)}
            </div>
          </div>
          <button 
            onClick={() => setSelectedDest(null)} 
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0 backdrop-blur-sm"
          >
            ✕ Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {routeLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-600 dark:text-slate-300">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm">Calculating route...</span>
            </div>
          )}
          
          {routeError && (
            <div className={`${!isOnline ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'} border rounded-lg p-3 text-sm`}>
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={!isOnline ? "M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M13 10V6m0 0L9.5 9.5M13 6l3.5 3.5" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                </svg>
                <div>
                  <div className="font-medium">{!isOnline ? 'You are offline' : 'Route Error'}</div>
                  <div className="text-xs mt-1 opacity-80">{!isOnline ? 'No saved route available for this destination. Routes are saved automatically when you navigate while online.' : routeError}</div>
                </div>
              </div>
            </div>
          )}
          
          {route && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/50 dark:to-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wide">Distance</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatDistance(route.distance)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/50 dark:to-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wide">ETA</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatDuration(route.duration)}
                  </div>
                </div>
              </div>

              {/* Turn-by-turn Directions */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Turn-by-Turn Directions
                    <span className="ml-auto px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">
                      {route.steps.length} steps
                    </span>
                  </div>
                </div>
                <div className="max-h-[280px] overflow-y-auto">
                  <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                    {route.steps.map((s, i) => {
                      const maneuverInfo = getManeuverInfo(s.maneuver);
                      const instruction = getStepInstruction(s);
                      const isFirst = i === 0;
                      const isLast = i === route.steps.length - 1;
                      return (
                        <li key={i} className={`flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isFirst ? 'bg-green-50/50 dark:bg-green-950/20' : ''} ${isLast ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                          {/* Step number + maneuver icon */}
                          <div className="flex flex-col items-center flex-shrink-0 gap-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${isFirst ? 'bg-green-500 text-white' : isLast ? 'bg-red-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'}`}>
                              {isFirst ? '🚀' : isLast ? '🏁' : (i + 1)}
                            </div>
                            <span className="text-lg leading-none" title={maneuverInfo.label}>
                              {!isFirst && !isLast && maneuverInfo.icon}
                            </span>
                          </div>
                          {/* Instruction text + distance/time */}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-slate-900 dark:text-slate-100 font-medium leading-snug">
                              {instruction}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                              <span className="inline-flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                {formatDistance(s.distance)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {formatDuration(s.duration)}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              {/* Offline availability notice */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                showingOffline
                  ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              }`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showingOffline ? "M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M13 10V6m0 0L9.5 9.5M13 6l3.5 3.5" : "M5 13l4 4L19 7"} />
                </svg>
                <span>{showingOffline ? 'Viewing saved offline directions' : 'Directions saved for offline access'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
