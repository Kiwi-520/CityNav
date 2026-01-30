import React from 'react';
import { MultimodalRoute } from '@/types/multimodal';

interface RouteComparisonProps {
  routes: MultimodalRoute[];
  onSelectRoute: (route: MultimodalRoute) => void;
}

export const RouteComparison: React.FC<RouteComparisonProps> = ({
  routes,
  onSelectRoute,
}) => {
  if (routes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No routes available for comparison
      </div>
    );
  }
  const fastest = routes.reduce((min, r) => 
    r.totalDuration < min.totalDuration ? r : min
  );
  const cheapest = routes.reduce((min, r) =>
    r.totalCost < min.totalCost ? r : min
  );

  const metrics = [
    { label: 'Duration', key: 'totalDuration', unit: 'min', format: (v: number) => v },
    { label: 'Cost', key: 'totalCost', unit: '₹', format: (v: number) => v },
    { label: 'Transfers', key: 'transferCount', unit: '', format: (v: number) => v },
    { label: 'Distance', key: 'totalDistance', unit: 'km', format: (v: number) => (v / 1000).toFixed(1) },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">Route Comparison</h2>
        <p className="text-blue-100 text-sm">Compare all options side by side</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metric
              </th>
              {routes.map((route, idx) => (
                <th
                  key={route.id}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Route {idx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Route Names */}
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-700">Name</td>
              {routes.map((route) => (
                <td key={route.id} className="px-4 py-3 text-center text-sm font-semibold">
                  {route.name}
                </td>
              ))}
            </tr>

            {/* Metrics */}
            {metrics.map((metric) => (
              <tr key={metric.label}>
                <td className="px-4 py-3 text-sm font-medium text-gray-700">
                  {metric.label}
                </td>
                {routes.map((route) => {
                  const value = route[metric.key as keyof MultimodalRoute] as number;
                  const formattedValue = metric.format(value);
                  const isBest = 
                    (metric.key === 'totalDuration' && route.id === fastest.id) ||
                    (metric.key === 'totalCost' && route.id === cheapest.id);
                  
                  return (
                    <td
                      key={route.id}
                      className={`px-4 py-3 text-center text-sm ${
                        isBest ? 'bg-green-50 font-bold text-green-700' : ''
                      }`}
                    >
                      {formattedValue} {metric.unit}
                      {isBest && <span className="ml-1">🏆</span>}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Modes Used */}
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-700">Modes</td>
              {routes.map((route) => (
                <td key={route.id} className="px-4 py-3 text-center">
                  <div className="flex flex-wrap justify-center gap-1">
                    {route.modesUsed.map((mode, idx) => {
                      const icons: Record<string, string> = {
                        walk: '🚶',
                        bus: '🚌',
                        metro: '🚇',
                        auto: '🛺',
                        cab: '🚗',
                      };
                      return (
                        <span key={idx} className="text-lg">
                          {icons[mode]}
                        </span>
                      );
                    })}
                  </div>
                </td>
              ))}
            </tr>

            {/* Carbon Footprint */}
            <tr>
              <td className="px-4 py-3 text-sm font-medium text-gray-700">Carbon</td>
              {routes.map((route) => {
                const colors = {
                  low: 'text-green-600',
                  medium: 'text-yellow-600',
                  high: 'text-red-600',
                };
                const color = colors[route.carbonFootprint as keyof typeof colors] || colors.medium;
                return (
                  <td key={route.id} className={`px-4 py-3 text-center text-sm font-medium ${color}`}>
                    {route.carbonFootprint || 'medium'}
                  </td>
                );
              })}
            </tr>

            {/* Action Buttons */}
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-700">Action</td>
              {routes.map((route) => (
                <td key={route.id} className="px-4 py-3 text-center">
                  <button
                    onClick={() => onSelectRoute(route)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                  >
                    Select
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
