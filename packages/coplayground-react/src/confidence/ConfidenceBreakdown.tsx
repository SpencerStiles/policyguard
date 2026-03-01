import { useState } from 'react';
import type { ConfidenceFactor } from '@coplayground/core';

type SortKey = 'score' | 'weight';

export interface ConfidenceBreakdownProps {
  factors: ConfidenceFactor[];
  expanded?: boolean;
}

function getBarColor(score: number): string {
  if (score >= 0.8) return 'bg-green-500';
  if (score >= 0.6) return 'bg-amber-500';
  if (score >= 0.4) return 'bg-yellow-500';
  return 'bg-red-500';
}

function formatFactorName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ConfidenceBreakdown({
  factors,
  expanded = false,
}: ConfidenceBreakdownProps) {
  const [sortBy, setSortBy] = useState<SortKey>('score');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const sortedFactors = [...factors].sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score;
    return b.weight - a.weight;
  });

  if (!expanded) {
    return (
      <div className="flex gap-1">
        {factors.map((factor) => (
          <div
            key={factor.name}
            className={`h-1.5 rounded-full flex-1 ${getBarColor(factor.score)}`}
            title={`${formatFactorName(factor.name)}: ${factor.score.toFixed(2)}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Sort controls */}
      <div className="flex gap-2 text-xs text-gray-500">
        <span>Sort by:</span>
        <button
          className={`hover:text-gray-800 ${sortBy === 'score' ? 'text-gray-800 font-medium underline' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setSortBy('score');
          }}
        >
          Score
        </button>
        <button
          className={`hover:text-gray-800 ${sortBy === 'weight' ? 'text-gray-800 font-medium underline' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setSortBy('weight');
          }}
        >
          Weight
        </button>
      </div>

      {/* Factor rows */}
      {sortedFactors.map((factor, idx) => (
        <div
          key={factor.name}
          className="relative group"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <div className="flex items-center gap-3">
            {/* Factor name */}
            <span className="text-xs text-gray-600 w-28 truncate flex-shrink-0" title={formatFactorName(factor.name)}>
              {formatFactorName(factor.name)}
            </span>

            {/* Mini progress bar */}
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getBarColor(factor.score)}`}
                style={{ width: `${Math.round(factor.score * 100)}%` }}
              />
            </div>

            {/* Score */}
            <span className="text-xs font-mono text-gray-700 w-10 text-right flex-shrink-0">
              {factor.score.toFixed(2)}
            </span>
          </div>

          {/* Evidence tooltip */}
          {hoveredIndex === idx && factor.evidence && (
            <div className="absolute z-10 left-0 top-full mt-1 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg max-w-xs">
              <p>{factor.evidence}</p>
              {factor.source && (
                <p className="mt-1 text-gray-400 italic">Source: {factor.source}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
