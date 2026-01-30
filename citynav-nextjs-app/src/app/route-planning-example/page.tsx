'use client';

import React, { useState } from 'react';
import { RouteRequest, MultimodalRoute } from '@/types/multimodal';
import { useOfflineRouting } from '@/hooks/useOfflineRouting';
import { RouteCard } from '@/components/RouteCard';
import { QuickDecisionView } from '@/components/QuickDecisionView';
import { RouteComparison } from '@/components/RouteComparison';
import { RouteScoringEngine } from '@/services/route-scoring.service';

type ViewMode = 'cards' | 'quick' | 'comparison';

export default function RoutePlanningExample() {
  const [routes, setRoutes] = useState<MultimodalRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<MultimodalRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('quick');

  const { isOnline, calculateRoutes, favoriteRoutes } = useOfflineRouting();

  // Example: Calculate routes
  const handleCalculateRoutes = async () => {
    setLoading(true);
    try {
      const request: RouteRequest = {
        source: {
          lat: 28.6139,
          lng: 77.2090,
          name: 'Connaught Place',
        },
        destination: {
          lat: 28.4595,
          lng: 77.0266,
          name: 'Gurugram Cyber City',
        },
        preferences: {
          prioritize: 'time',
          maxCost: 500,
        },
        context: {
          timeOfDay: new Date(),
          weatherCondition: 'clear',
        },
      };

      const response = await calculateRoutes(request);
      setRoutes(response.routes);
    } catch (error) {
      console.error('Failed to calculate routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRoute = (route: MultimodalRoute) => {
    setSelectedRoute(route);
    // Navigate to navigation page or show navigation UI
    console.log('Selected route:', route);
    alert(`Starting navigation for: ${route.name}`);
  };

  // Get best routes for quick view
  const bestRoutes = routes.length > 0 
    ? RouteScoringEngine.selectTopRoutes(routes)
    : {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Route Planning</h1>
              <p className="text-gray-600 mt-1">
                Find the best way to reach your destination
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {isOnline ? '🟢 Online' : '🟡 Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Demo Button */}
        <div className="mb-6">
          <button
            onClick={handleCalculateRoutes}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? '🔄 Calculating Routes...' : '🗺️ Calculate Example Routes'}
          </button>
        </div>

        {/* View Mode Selector */}
        {routes.length > 0 && (
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setViewMode('quick')}
              className={`px-4 py-2 rounded font-medium transition ${
                viewMode === 'quick'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
            >
              ⚡ Quick Decision
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded font-medium transition ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
            >
              📋 Detailed Cards
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-4 py-2 rounded font-medium transition ${
                viewMode === 'comparison'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
            >
              📊 Comparison Table
            </button>
          </div>
        )}

        {/* Routes Display */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Calculating optimal routes...</p>
          </div>
        )}

        {!loading && routes.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Routes Yet
            </h3>
            <p className="text-gray-600">
              Click the button above to see example routes from Connaught Place to Gurugram
            </p>
          </div>
        )}

        {!loading && routes.length > 0 && (
          <>
            {viewMode === 'quick' && (
              <QuickDecisionView
                routes={bestRoutes}
                onSelectRoute={handleSelectRoute}
              />
            )}

            {viewMode === 'cards' && (
              <div className="space-y-4">
                {routes.map((route, idx) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    rank={idx + 1}
                    onSelect={handleSelectRoute}
                    isSelected={selectedRoute?.id === route.id}
                  />
                ))}
              </div>
            )}

            {viewMode === 'comparison' && (
              <RouteComparison
                routes={routes}
                onSelectRoute={handleSelectRoute}
              />
            )}
          </>
        )}

        {/* Favorite Routes Section */}
        {favoriteRoutes.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ⭐ Favorite Routes
            </h2>
            <div className="bg-white rounded-lg shadow divide-y">
              {favoriteRoutes.map((fav) => (
                <div key={fav.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{fav.name}</h3>
                      <p className="text-sm text-gray-600">
                        {fav.source.name} → {fav.destination.name}
                      </p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700">
                      Calculate →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
