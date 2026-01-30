import React from 'react';
import { MultimodalRoute } from '@/types/multimodal';

interface QuickDecisionViewProps {
  routes: {
    fastest?: MultimodalRoute;
    cheapest?: MultimodalRoute;
    recommended?: MultimodalRoute;
    comfort?: MultimodalRoute;
  };
  onSelectRoute: (route: MultimodalRoute) => void;
}

export const QuickDecisionView: React.FC<QuickDecisionViewProps> = ({
  routes,
  onSelectRoute,
}) => {
  const cards = [
    {
      key: 'fastest',
      route: routes.fastest,
      title: 'Fastest',
      icon: '⚡',
      color: 'from-blue-500 to-blue-600',
      description: 'Minimum travel time',
    },
    {
      key: 'cheapest',
      route: routes.cheapest,
      title: 'Cheapest',
      icon: '💰',
      color: 'from-green-500 to-green-600',
      description: 'Lowest cost option',
    },
    {
      key: 'recommended',
      route: routes.recommended,
      title: 'Recommended',
      icon: '⭐',
      color: 'from-purple-500 to-purple-600',
      description: 'Best overall balance',
    },
    {
      key: 'comfort',
      route: routes.comfort,
      title: 'Comfortable',
      icon: '✨',
      color: 'from-pink-500 to-pink-600',
      description: 'Minimal transfers',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card) => {
        if (!card.route) return null;

        return (
          <div
            key={card.key}
            className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer"
            onClick={() => onSelectRoute(card.route!)}
          >
            <div className={`bg-gradient-to-r ${card.color} px-4 py-3`}>
              <div className="flex items-center gap-2 text-white">
                <span className="text-2xl">{card.icon}</span>
                <div>
                  <h3 className="font-bold text-lg">{card.title}</h3>
                  <p className="text-xs opacity-90">{card.description}</p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Time</div>
                  <div className="text-lg font-bold text-gray-900">
                    {card.route.totalDuration}
                    <span className="text-xs font-normal ml-1">min</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Cost</div>
                  <div className="text-lg font-bold text-green-600">
                    ₹{card.route.totalCost}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Changes</div>
                  <div className="text-lg font-bold text-gray-900">
                    {card.route.transferCount}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-center mb-3">
                {card.route.modesUsed.map((mode, idx) => {
                  const icons: Record<string, string> = {
                    walk: '🚶',
                    bus: '🚌',
                    metro: '🚇',
                    auto: '🛺',
                    cab: '🚗',
                  };
                  return (
                    <span key={idx} className="text-2xl">
                      {icons[mode]}
                    </span>
                  );
                })}
              </div>
              <p className="text-sm text-gray-600 text-center mb-3">
                {card.route.description}
              </p>
              <button
                onClick={() => onSelectRoute(card.route!)}
                className="w-full bg-gray-900 text-white py-2 rounded font-medium hover:bg-gray-800 transition"
              >
                Choose This Route
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
