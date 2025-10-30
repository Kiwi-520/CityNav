import React from 'react';
import PackManagerPanel from '@/features/offline-onboarding/components/PackManagerPanel';
import packManager from '@/features/offline-onboarding/lib/packManager';
import logger from '@/features/offline-onboarding/lib/logger';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';

type ActiveCategories = Record<string, boolean>;
type SetActiveCategories = (updater: ActiveCategories | ((prev: ActiveCategories) => ActiveCategories)) => void;

type Props = {
  pos: [number, number] | null;
  isOnline: boolean;
  storedLocation: any;
  activeCategories: ActiveCategories;
  setActiveCategories: SetActiveCategories;
  pois: POI[] | null;
  poisLoading: boolean;
  poisError: any;
  refreshPOIs: () => void;
  displayPosition: [number, number] | null;
  center: [number, number];
  setPackPois: (p: POI[] | null) => void;
  setSelectedPackId: (id: string | null) => void;
  setForcedCenter: (c: [number, number] | null) => void;
  setSelectedDest: (d: { lat: number; lon: number } | null) => void;
  displayPois: POI[];
  compressedPreview: { bytes: number; gzipped: boolean } | null;
};

export default function EssentialsPanel(props: Props) {
  const { pos, isOnline, storedLocation, activeCategories, setActiveCategories, pois, poisLoading, poisError, refreshPOIs, displayPosition, center, setPackPois, setSelectedPackId, setForcedCenter, setSelectedDest, displayPois, compressedPreview } = props;

  return (
    <div className="flex-0 basis-[40%] max-w-[40%] px-4 space-y-4">
      {/* Status Card */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${pos ? 'bg-emerald-500' : isOnline ? 'bg-amber-500' : 'bg-red-500'} shadow-sm`} />
              <div>
                <div className="font-semibold text-slate-900">Location Status</div>
                <div className="text-sm text-slate-600">{pos ? 'Live GPS' : (!isOnline && storedLocation ? 'Cached' : 'Default')}</div>
              </div>
            </div>
            {!isOnline && (
              <div className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                Offline
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Category Filters</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'hospital', label: 'Hospital/Clinic', color: '#dc2626' },
              { key: 'railway', label: 'Railway', color: '#0ea5e9' },
              { key: 'bus_stop', label: 'Bus Stop', color: '#16a34a' },
              { key: 'bank', label: 'Bank/ATM', color: '#7c3aed' },
              { key: 'hotel', label: 'Hotel', color: '#f59e0b' },
              { key: 'restaurant', label: 'Restaurant', color: '#ef4444' },
            ].map((item) => {
              const enabled = !!activeCategories[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveCategories(s => ({ ...s, [item.key]: !s[item.key] }))}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all ${
                    enabled 
                      ? 'bg-white border-slate-300 shadow-sm' 
                      : 'bg-slate-50 border-slate-100 opacity-50 hover:opacity-75'
                  }`}
                  title={enabled ? `Hide ${item.label}` : `Show ${item.label}`}
                >
                  <div 
                    className="w-4 h-4 rounded-md shadow-sm flex-shrink-0" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-slate-700 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">📡</span>
            <div className="text-sm text-amber-900">
              <span className="font-medium">Offline Mode:</span> Showing {storedLocation ? 'last known location' : 'default location'}
            </div>
          </div>
        </div>
      )}

      {/* Nearby Services Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Nearby Services</h3>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
              {poisLoading ? 'Loading...' : `${pois ? pois.length : 0} found`}
            </span>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => refreshPOIs()} 
              disabled={poisLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={async () => {
                try {
                  const id = `dev-pack-${Date.now()}`;
                  const latC = displayPosition ? displayPosition[0] : center[0];
                  const lonC = displayPosition ? displayPosition[1] : center[1];
                  const categories = Object.keys(activeCategories).filter(k => !!activeCategories[k]);

                  let toPack = (pois || []).filter(p => activeCategories[p.category]);
                  if (!toPack || toPack.length === 0) {
                    toPack = [{ id: 'node:dev:1', lat: latC, lon: lonC, name: 'DEV POI', category: 'hospital', tags: {} } as POI];
                  }

                  const ndjson = toPack.map(p => JSON.stringify(p)).join('\n') + '\n';
                  const blob = new Blob([ndjson], { type: 'application/x-ndjson' });

                  const manifest = {
                    id,
                    bbox: [lonC - 0.01, latC - 0.01, lonC + 0.01, latC + 0.01],
                    center: [lonC, latC],
                    radiusMeters: 1000,
                    categories,
                    createdAt: new Date().toISOString(),
                    sizeBytes: blob.size,
                    itemCount: toPack.length,
                  };

                  await packManager.createPack(manifest as any, blob);
                  const packs = await packManager.listPacks();
                  logger.debug('packs after create:', packs);
                  if (process.env.NODE_ENV === 'development') alert(`Pack ${id} created — open DevTools > Application > IndexedDB > citynav-packs to inspect.`);
                } catch (err) {
                  logger.error('create pack failed', err);
                  alert('Pack creation failed: ' + (err as any)?.message);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Pack
            </button>
            {compressedPreview && (
              <div className="text-xs text-slate-600 px-3 py-1.5 bg-slate-100 rounded-lg">
                {compressedPreview.gzipped ? '📦 ' : '💾 '}
                {(compressedPreview.bytes / 1024).toFixed(1)} KB
                {compressedPreview.gzipped && ' (gzipped)'}
              </div>
            )}
          </div>

          {/* POI List */}
          <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-2">
            {displayPois && displayPois.length > 0 ? (
              displayPois.filter(p => activeCategories[p.category]).slice(0, 30).map((p) => (
                <div 
                  key={p.id} 
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-slate-900 truncate">{p.name || p.category}</div>
                    <div className="text-xs text-slate-500 capitalize mt-0.5">{p.category.replace('_', ' ')}</div>
                  </div>
                  <button 
                    onClick={() => setSelectedDest({ lat: p.lat, lon: p.lon })} 
                    className="ml-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
                  >
                    Navigate
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-slate-500">
                {poisLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                    Loading nearby services...
                  </div>
                ) : (
                  'No nearby services found.'
                )}
              </div>
            )}
            {poisError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                Error: {poisError}
              </div>
            )}
          </div>
        </div>

        <PackManagerPanel onSelect={(manifest: { id: string; center?: any[] | null }, poisFromPack: POI[] | null) => {
          setPackPois(poisFromPack);
          setSelectedPackId(manifest.id);
          if (manifest.center && Array.isArray(manifest.center) && manifest.center.length >= 2) {
            setForcedCenter([manifest.center[1], manifest.center[0]]);
          }
        }} />
      </div>
    </div>
  );
}
