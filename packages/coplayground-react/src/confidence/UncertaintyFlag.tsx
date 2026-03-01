import { useState, type ReactNode } from 'react';
import type { ConfidenceLevel } from '@coplayground/core';

export interface UncertaintyFlagProps {
  level: ConfidenceLevel;
  message?: string;
  children: ReactNode;
}

const WarningIcon = () => (
  <svg className="w-4 h-4 inline-block flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-4 h-4 inline-block flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export function UncertaintyFlag({ level, message, children }: UncertaintyFlagProps) {
  const [expanded, setExpanded] = useState(false);

  if (level === 'high') {
    return <>{children}</>;
  }

  if (level === 'medium') {
    return (
      <div className="border-l-2 border-amber-400 pl-3">
        {children}
      </div>
    );
  }

  if (level === 'low') {
    return (
      <div
        className="border border-dashed border-yellow-400 rounded-md p-2 cursor-pointer"
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
      >
        <div className="flex items-start gap-1.5">
          <span className="text-yellow-600 mt-0.5">
            <InfoIcon />
          </span>
          <div className="flex-1">{children}</div>
        </div>
        {expanded && message && (
          <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1">
            {message}
          </p>
        )}
      </div>
    );
  }

  // uncertain
  return (
    <div
      className="bg-red-50 border border-red-200 rounded-md p-2 cursor-pointer"
      onClick={() => setExpanded((prev) => !prev)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((prev) => !prev);
        }
      }}
    >
      <div className="flex items-start gap-1.5">
        <span className="text-red-500 mt-0.5">
          <WarningIcon />
        </span>
        <div className="flex-1">{children}</div>
      </div>
      {expanded && message && (
        <p className="mt-2 text-xs text-red-700 bg-red-100 rounded px-2 py-1">
          {message}
        </p>
      )}
      {!expanded && message && (
        <p className="mt-1 text-xs text-red-500 truncate">
          {message}
        </p>
      )}
    </div>
  );
}
