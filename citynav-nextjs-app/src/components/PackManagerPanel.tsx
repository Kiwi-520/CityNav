import React, { useEffect, useState } from 'react';
import { listPacks, deletePack, getPackText } from '@/lib/packManager';
import type { PackManifest } from '@/lib/packManager';
import logger from '@/lib/logger';
import { POI } from '@/hooks/useNearbyPOIs';
// Tailwind-first styling: remove dependency on CSS module and use utility classes

type Props = {
  onSelect?: (manifest: PackManifest, pois: POI[]) => void;
  createPack?: () => Promise<void>;
  onPackCreated?: () => void;
};

export default function PackManagerPanel(props: Props) {
  const { onSelect, createPack, onPackCreated } = props;
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

  useEffect(() => { load(); }, []);

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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-900">Pack manager</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-500">{loading ? 'Refreshing…' : 'Refresh'}</button>
          {typeof createPack === 'function' && (
            <button
              onClick={async () => {
                try {
                  await createPack();
                  // reload local listing
                  await load();
                  if (onPackCreated) onPackCreated();
                } catch (err) {
                  console.error('create pack from panel failed', err);
                  alert('Pack creation failed: ' + (err as any)?.message);
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-500"
            >
              Create pack
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        {packs.length === 0 ? (
          <div className="text-sm text-slate-500">{loading ? 'Loading packs…' : 'No packs stored'}</div>
        ) : (
          packs.map((m) => {
            const friendly = (() => {
              if (m.categories && m.categories.length > 0) return `${m.categories[0]} pack`;
              if (m.id.startsWith('dev-pack')) return 'Developer pack';
              if (m.id.startsWith('pack_')) return 'Auto pack';
              return m.id.split('-').slice(0,2).join('-');
            })();
            const created = m.createdAt ? new Date(m.createdAt).toLocaleString() : '';
            return (
              <div key={m.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{friendly} <span className="text-slate-500 font-medium">· {m.id.slice(0,20)}{m.id.length>20?'…':''}</span></div>
                  <div className="text-xs text-slate-500 mt-1">
                    <span className="mr-2">{m.itemCount} items</span>
                    <span className="text-slate-300">•</span>
                    <span className="ml-2">{Math.round((m.compressedBytes || m.sizeBytes || 0) / 1024)} KB</span>
                    {created && <span className="ml-2 text-slate-300">• {created}</span>}
                  </div>
                  {m.categories && m.categories.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {m.categories.map(c => (
                        <span key={c} className="inline-flex items-center px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">{c}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  <button onClick={async () => {
                    try {
                      const txt = await getPackText(m.id);
                      if (!txt) return alert('No pack text available');
                      const lines = txt.split('\n').filter(Boolean);
                      const parsed = lines.map(l => JSON.parse(l) as POI);
                      if (onSelect) onSelect(m, parsed);
                    } catch (err) {
                      console.error('load pack failed', err);
                      alert('Load failed: ' + (err as any)?.message);
                    }
                  }} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm shadow hover:bg-emerald-500">Load</button>

                  <button onClick={async () => {
                    try {
                      const txt = await getPackText(m.id);
                      if (!txt) return alert('No pack text available');
                      const lines = txt.split('\n').filter(Boolean);
                      const parsed = lines.map(l => JSON.parse(l));
                      setPreviewJson(JSON.stringify(parsed, null, 2));
                    } catch (err) {
                      console.error('preview failed', err);
                      alert('Preview failed: ' + (err as any)?.message);
                    }
                  }} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm shadow hover:bg-indigo-500">Preview</button>

                  <button onClick={() => removePack(m.id)} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm shadow hover:bg-red-400">Delete</button>
                </div>
              </div>
            );
          })
        )}
      </div>
      {previewJson && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.6)', zIndex: 10000 }}>
          <div style={{ width: 'min(900px, 96%)', maxHeight: '86vh', background: 'white', borderRadius: 12, padding: 14, overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Pack preview</div>
              <button onClick={() => setPreviewJson(null)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 8 }}>Close</button>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#0f172a' }}>{previewJson}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
