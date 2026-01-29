"use client";

import React, { useState } from 'react';
import PackManagerPanel from '@/features/offline-onboarding/components/PackManagerPanel';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';
import type { PackManifest } from '@/features/offline-onboarding/lib/packManager';

type Props = {
  onPackSelect?: (manifest: PackManifest, pois: POI[]) => void;
  createPack?: () => Promise<void>;
  onPackCreated?: () => void;
  onUnloadAndGoLive?: () => void;
  isPackLoaded?: boolean;
};

export default function EssentialsNavSidebar({ 
  onPackSelect, 
  createPack, 
  onPackCreated,
  onUnloadAndGoLive,
  isPackLoaded = false 
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-[72px] right-6 z-[999] flex items-center gap-2.5 px-5 py-3 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 backdrop-blur-sm text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] border border-white/20"
        title="Open Pack Manager"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span className="font-medium text-sm">Offline Packs</span>
        {isPackLoaded && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Pack loaded" />
            <span className="text-xs font-bold">OFFLINE</span>
          </div>
        )}
      </button>

      {/* Sidebar Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[998]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Slide-out Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-[999] overflow-y-auto animate-slide-in">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-800 px-6 py-4 flex items-center justify-between border-b border-white/10 z-10 shadow-md">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Offline Pack Manager
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <PackManagerPanel
                onSelect={(manifest, pois) => {
                  if (onPackSelect) onPackSelect(manifest, pois);
                  setIsOpen(false);
                }}
                createPack={createPack}
                onPackCreated={() => {
                  if (onPackCreated) onPackCreated();
                }}
                onUnloadAndGoLive={onUnloadAndGoLive}
              />
            </div>
          </div>
        </>
      )}
      
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
