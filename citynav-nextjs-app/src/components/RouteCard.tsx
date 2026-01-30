import React, { useState } from 'react';
import { MultimodalRoute, RouteSegment } from '@/types/multimodal';

interface RouteCardProps {
  route: MultimodalRoute;
  rank: number;
  onSelect: (route: MultimodalRoute) => void;
  isSelected?: boolean;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  rank,
  onSelect,
  isSelected = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getRouteTypeBadge = (type: MultimodalRoute['type']) => {
    const badges = {
      fastest: { text: '⚡ Fastest', color: 'bg-blue-500' },
      cheapest: { text: '💰 Cheapest', color: 'bg-green-500' },
      balanced: { text: '⭐ Recommended', color: 'bg-purple-500' },
      comfort: { text: '✨ Comfortable', color: 'bg-pink-500' },
    };
    return badges[type] || badges.balanced;
  };

  const getCarbonBadge = (footprint: string) => {
    const colors = {
      low: 'text-green-600 bg-green-50',
      medium: 'text-yellow-600 bg-yellow-50',
      high: 'text-red-600 bg-red-50',
    };
    return colors[footprint as keyof typeof colors] || colors.medium;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const badge = getRouteTypeBadge(route.type);

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'shadow hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">#{rank}</span>
            <span className={`px-2 py-1 rounded text-white text-xs font-medium ${badge.color}`}>
              {badge.text}
            </span>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${getCarbonBadge(route.carbonFootprint || 'medium')}`}>
            🌱 {route.carbonFootprint || 'medium'} carbon
          </div>
        </div>

        {/* Route Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{route.name}</h3>

        {/* Mode Badges */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {route.modesUsed.map((mode, idx) => {
            const modeIcons: Record<string, string> = {
              walk: '🚶',
              bus: '🚌',
              metro: '🚇',
              auto: '🛺',
              cab: '🚗',
              bike: '🚲',
            };
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
              >
                <span>{modeIcons[mode]}</span>
                <span className="capitalize">{mode}</span>
              </span>
            );
          })}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-500">Duration</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDuration(route.totalDuration)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Cost</div>
            <div className="text-lg font-semibold text-green-600">₹{route.totalCost}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Transfers</div>
            <div className="text-lg font-semibold text-gray-900">{route.transferCount}</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3">{route.description}</p>

        {/* Warnings */}
        {route.warnings && route.warnings.length > 0 && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            {route.warnings.map((warning, idx) => (
              <div key={idx} className="text-xs text-yellow-800 flex items-start gap-1">
                <span>⚠️</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onSelect(route)}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition"
          >
            Start Navigation
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
          >
            {isExpanded ? '▲ Less' : '▼ Details'}
          </button>
        </div>
      </div>

      {/* Expanded Segment Details */}
      {isExpanded && (
        <div className="bg-gray-50 p-4 border-t">
          <h4 className="font-semibold text-gray-900 mb-3">Route Breakdown</h4>
          <div className="space-y-3">
            {route.segments.map((segment, idx) => (
              <SegmentCard key={segment.id} segment={segment} index={idx + 1} />
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Distance:</span>
                <span className="ml-2 font-medium">{(route.totalDistance / 1000).toFixed(1)} km</span>
              </div>
              <div>
                <span className="text-gray-500">Comfort Level:</span>
                <span className="ml-2 font-medium capitalize">{route.comfortLevel || 'medium'}</span>
              </div>
              <div>
                <span className="text-gray-500">Reliability:</span>
                <span className="ml-2 font-medium">{route.reliabilityScore || 70}/100</span>
              </div>
              <div>
                <span className="text-gray-500">Score:</span>
                <span className="ml-2 font-medium">{((route.score || 0) * 100).toFixed(0)}/100</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SegmentCardProps {
  segment: RouteSegment;
  index: number;
}

const SegmentCard: React.FC<SegmentCardProps> = ({ segment, index }) => {
  const modeColors: Record<string, string> = {
    walk: 'bg-green-100 text-green-800',
    bus: 'bg-orange-100 text-orange-800',
    metro: 'bg-blue-100 text-blue-800',
    auto: 'bg-yellow-100 text-yellow-800',
    cab: 'bg-purple-100 text-purple-800',
    bike: 'bg-teal-100 text-teal-800',
  };

  const modeIcons: Record<string, string> = {
    walk: '🚶',
    bus: '🚌',
    metro: '🚇',
    auto: '🛺',
    cab: '🚗',
    bike: '🚲',
  };

  return (
    <div className="bg-white p-3 rounded border border-gray-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${modeColors[segment.mode]}`}>
            {index}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{modeIcons[segment.mode]}</span>
            <span className="font-semibold capitalize text-gray-900">{segment.mode}</span>
            {segment.routeInfo && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{segment.routeInfo}</span>
            )}
          </div>
          <p className="text-sm text-gray-700 mb-2">{segment.instruction}</p>
          <div className="flex gap-4 text-xs text-gray-500">
            <span>📏 {(segment.distance / 1000).toFixed(1)} km</span>
            <span>⏱️ {segment.duration} min</span>
            {segment.cost > 0 && <span>💰 ₹{segment.cost}</span>}
            {segment.waitTime && <span>⏳ Wait: {segment.waitTime} min</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
