import { useState } from 'react';
import type { ConfidenceSignal, ConfidenceLevel } from '@coplayground/core';
import { ConfidenceBreakdown } from './ConfidenceBreakdown.js';

const levelColors: Record<ConfidenceLevel, { bar: string; text: string; bg: string }> = {
  high: { bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
  medium: { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  low: { bar: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' },
  uncertain: { bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
};

const sizeClasses = {
  sm: { height: 'h-2', text: 'text-xs', padding: 'p-2', gap: 'gap-1.5' },
  md: { height: 'h-3', text: 'text-sm', padding: 'p-3', gap: 'gap-2' },
  lg: { height: 'h-4', text: 'text-base', padding: 'p-4', gap: 'gap-3' },
} as const;

export interface ConfidenceMeterProps {
  signal: ConfidenceSignal;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showFactors?: boolean;
  onClick?: () => void;
}

export function ConfidenceMeter({
  signal,
  size = 'md',
  showLabel = true,
  showFactors = false,
  onClick,
}: ConfidenceMeterProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = levelColors[signal.level];
  const sz = sizeClasses[size];
  const percentage = Math.round(signal.overall * 100);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (showFactors) {
      setExpanded((prev) => !prev);
    }
  };

  const capitalizedLevel = signal.level.charAt(0).toUpperCase() + signal.level.slice(1);

  return (
    <div
      className={`rounded-lg border border-gray-200 ${sz.padding} ${colors.bg} ${onClick || showFactors ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
      onClick={handleClick}
      role={onClick || showFactors ? 'button' : undefined}
      tabIndex={onClick || showFactors ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && (onClick || showFactors)) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={`flex items-center ${sz.gap}`}>
        {/* Bar */}
        <div className={`flex-1 ${sz.height} bg-gray-200 rounded-full overflow-hidden`}>
          <div
            className={`${sz.height} ${colors.bar} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Label */}
        {showLabel && (
          <span className={`${sz.text} font-medium ${colors.text} whitespace-nowrap`}>
            {signal.overall.toFixed(2)} {capitalizedLevel}
          </span>
        )}

        {/* Expand indicator */}
        {showFactors && (
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Factor breakdown */}
      {showFactors && expanded && signal.factors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <ConfidenceBreakdown factors={signal.factors} expanded />
        </div>
      )}
    </div>
  );
}
