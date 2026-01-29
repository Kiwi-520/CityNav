import React from 'react';

type Step = { maneuver?: string; name?: string; distance: number; duration: number };

type Props = {
  selectedDest: { lat: number; lon: number } | null;
  setSelectedDest: (d: { lat: number; lon: number } | null) => void;
  route?: { distance: number; duration: number; steps: Step[] } | null;
  routeLoading?: boolean;
  routeError?: string | null;
};

export default function NavigationPanel({ selectedDest, setSelectedDest, route, routeLoading, routeError }: Props) {
  if (!selectedDest) return null;
  
  return (
    <div className="relative z-[1001]">
      <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl max-w-[360px] w-[92vw] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-white px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <h3 className="text-base font-semibold text-slate-900">Navigation</h3>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 truncate">
              {selectedDest.lat.toFixed(5)}, {selectedDest.lon.toFixed(5)}
            </div>
          </div>
          <button 
            onClick={() => setSelectedDest(null)} 
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex-shrink-0"
          >
            Cancel
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {routeLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm">Calculating route...</span>
            </div>
          )}
          
          {routeError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>{routeError}</div>
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
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{(route.distance/1000).toFixed(2)} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">km</span></div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/50 dark:to-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold uppercase tracking-wide">ETA</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{Math.ceil(route.duration/60)} <span className="text-sm text-slate-500 dark:text-slate-400 font-normal">min</span></div>
                </div>
              </div>

              {/* Directions */}
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Turn-by-turn directions
                    <span className="ml-auto px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                      {route.steps.length} steps
                    </span>
                  </div>
                </div>
                <div className="max-h-[220px] overflow-y-auto p-4">
                  <ol className="space-y-3">
                    {route.steps.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-semibold">
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-slate-900 font-medium capitalize">
                            {s.maneuver || s.name || 'Continue'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{(s.distance/1000).toFixed(2)} km</span>
                            <span className="text-slate-300">•</span>
                            <span>{Math.ceil(s.duration/60)} min</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
