"use client";

import React, { useState } from 'react';
import PackManagerPanel from '@/features/offline-onboarding/components/PackManagerPanel';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';
import type { PackManifest } from '@/features/offline-onboarding/lib/packManager';

type Props = {
  onPackSelect?: (manifest: PackManifest, pois: POI[]) => void;
  createPack?: () => Promise<void>;
  onPackCreated?: () => void;
};

export default function TopNav({ onPackSelect, createPack, onPackCreated }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 shadow-lg relative z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <h1 className="text-2xl font-bold text-white">Welcome to Offline On-boarding</h1>
          </div>
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-colors border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="font-medium">Menu</span>
          </button>
        </div>
      </div>

      {/* Pack Manager Slide-out Panel */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Slide-out Panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[9999] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between border-b border-white/10 z-10">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Pack Manager
              </h2>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
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
                  setIsMenuOpen(false);
                }}
                createPack={createPack}
                onPackCreated={() => {
                  if (onPackCreated) onPackCreated();
                }}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
