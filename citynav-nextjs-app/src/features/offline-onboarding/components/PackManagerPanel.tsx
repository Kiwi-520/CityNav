import React, { useEffect, useState } from 'react';
import { listPacks, deletePack, getPackText } from '@/features/offline-onboarding/lib/packManager';
import type { PackManifest } from '@/features/offline-onboarding/lib/packManager';
import logger from '@/features/offline-onboarding/lib/logger';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';

type Props = {
  onSelect?: (manifest: PackManifest, pois: POI[]) => void;
  createPack?: () => Promise<void>;
  onPackCreated?: () => void;
};

export default function PackManagerPanel({ onSelect, createPack, onPackCreated }: Props) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removePack(id: string) {
    // eslint-disable-next-line no-restricted-globals
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900">Offline Packs</h3>
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
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Pack
            </button>
          )}
        </div>
      </div>

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
              <div key={m.id} className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="text-sm font-semibold text-slate-900">{friendly}</div>
                      <div className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                        {m.id.slice(0, 12)}...
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {m.itemCount} items
                      </div>
                      <span className="text-slate-300">•</span>
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
                          <span key={c} className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium capitalize">
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
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <h4 className="text-lg font-semibold text-slate-900">Pack Preview</h4>
              <button
                onClick={() => setPreviewJson(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap break-words bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                {previewJson}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
