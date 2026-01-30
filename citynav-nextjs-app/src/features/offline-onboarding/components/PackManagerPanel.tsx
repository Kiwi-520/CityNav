import React, { useEffect, useState } from 'react';
import { listPacks, deletePack, getPackText } from '@/features/offline-onboarding/lib/packManager';
import type { PackManifest } from '@/features/offline-onboarding/lib/packManager';
import logger from '@/features/offline-onboarding/lib/logger';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';

type Props = {
  onSelect?: (manifest: PackManifest, pois: POI[]) => void;
  createPack?: () => Promise<void>;
  onPackCreated?: () => void;
  onUnloadAndGoLive?: () => void;
};

export default function PackManagerPanel({ onSelect, createPack, onPackCreated, onUnloadAndGoLive }: Props) {
  const [packs, setPacks] = useState<PackManifest[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewJson, setPreviewJson] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const list = await listPacks();
      setPacks(list || []);
    } catch (err) {
      logger.error('list packs failed', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removePack(id: string) {
    if (!confirm(`Delete pack ${id}? This cannot be undone.`)) return;
    try {
      await deletePack(id);
      await load();
    } catch (err) {
      logger.error('delete pack failed', err);
      alert('Delete failed: ' + (err as any)?.message);
    }
  }

  const sortedPacks = [...packs].sort((a, b) => {
    const parseCreated = (pm: PackManifest) => {
      if (pm.createdAt) {
        const t = Date.parse(pm.createdAt);
        if (!Number.isNaN(t)) return t;
      }
      const match = pm.id.match(/_(\d{10,13})$/);
      if (match) {
        const n = Number(match[1]);
        return match[1].length === 10 ? n * 1000 : n;
      }
      return 0;
    };
    return parseCreated(b) - parseCreated(a);
  });

  return (
    <div className="p-4">
      {/* Description */}
      <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/50 border border-indigo-100 dark:border-indigo-800 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-1">Offline Access</h4>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
              Create packs based on your current location to access essential places offline. 
              Download maps and POIs when online, then use them anywhere without internet.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Your Packs</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          {createPack && (
            <button
              onClick={async () => {
                try {
                  await createPack();
                  await load();
                  onPackCreated?.();
                } catch (err) {
                  logger.error('create pack from panel failed', err);
                  alert('Pack creation failed: ' + (err as any)?.message);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              title="Create a new pack based on your current location"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Pack
            </button>
          )}
        </div>
      </div>

      {/* Load All Essentials Button */}
      {packs.length > 0 && (
        <div className="mb-4">
          <button
            onClick={async () => {
              if (!onSelect) return;
              try {
                // Load the most recent pack automatically
                const mostRecent = sortedPacks[0];
                if (mostRecent) {
                  const txt = await getPackText(mostRecent.id);
                  if (!txt) {
                    alert('Could not load pack data');
                    return;
                  }
                  const lines = txt.split('\n').filter(Boolean);
                  const parsed = lines.map((l) => JSON.parse(l) as POI);
                  onSelect(mostRecent, parsed);
                }
              } catch (err) {
                logger.error('Load all essentials failed', err);
                alert('Failed to load essentials: ' + (err as any)?.message);
              }
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <div className="flex flex-col items-start">
              <span>Load Latest Pack</span>
              <span className="text-xs font-normal opacity-90">Access all essentials offline</span>
            </div>
          </button>
        </div>
      )}

      <div className="space-y-3">
        {packs.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                Loading packs...
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl">📦</div>
                <div>No packs stored yet</div>
              </div>
            )}
          </div>
        ) : (
          sortedPacks.map((m) => {
            const friendly = (() => {
              if (m.name && m.name.trim().length > 0) return m.name;
              if (m.id.startsWith('auto_')) return 'Auto pack';
              if (m.id.startsWith('manual_')) return 'Manual pack';
              if (m.id.startsWith('dev-pack')) return 'Developer pack';
              if (m.categories && m.categories.length > 0) return `${m.categories[0]} pack`;
              if (m.id.startsWith('pack_')) return 'Pack'; // legacy
              return m.id.split('-').slice(0, 2).join('-');
            })();
            const created = m.createdAt ? new Date(m.createdAt).toLocaleString() : '';
            return (
              <div key={m.id} className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-850 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{friendly}</div>
                      <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-mono">
                        {m.id.slice(0, 12)}...
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {m.itemCount} items
                      </div>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        {Math.round((m.compressedBytes || m.sizeBytes || 0) / 1024)} KB
                      </div>
                      {created && (
                        <>
                          <span className="text-slate-300">•</span>
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {created}
                          </div>
                        </>
                      )}
                    </div>
                    {m.categories && m.categories.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {m.categories.map((c) => (
                          <span key={c} className="inline-flex items-center px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-medium capitalize">
                            {c.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const txt = await getPackText(m.id);
                          if (!txt) return alert('No pack text available');
                          const lines = txt.split('\n').filter(Boolean);
                          const parsed = lines.map((l) => JSON.parse(l) as POI);
                          onSelect?.(m, parsed);
                        } catch (err) {
                          logger.error('load pack failed', err);
                          alert('Load failed: ' + (err as any)?.message);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const txt = await getPackText(m.id);
                          if (!txt) return alert('No pack text available');
                          const lines = txt.split('\n').filter(Boolean);
                          const parsed = lines.map((l) => JSON.parse(l));
                          setPreviewJson(JSON.stringify(parsed, null, 2));
                        } catch (err) {
                          logger.error('preview failed', err);
                          alert('Preview failed: ' + (err as any)?.message);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-colors"
                    >
                      Preview
                    </button>
                    {onUnloadAndGoLive && (
                      <button
                        onClick={() => {
                          if (confirm('Unload this pack and switch to live mode?')) {
                            onUnloadAndGoLive();
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-sm transition-colors"
                      >
                        Go Live
                      </button>
                    )}
                    <button
                      onClick={() => removePack(m.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium shadow-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {previewJson && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pack Preview</h4>
              <button
                onClick={() => setPreviewJson(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-950">
              <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                {previewJson}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
