import { useState } from 'react';
import type { SourceReference } from '@coplayground/core';

export interface SourceBadgeProps {
  source: SourceReference;
  compact?: boolean;
  onClick?: (source: SourceReference) => void;
}

const typeConfig: Record<
  SourceReference['type'],
  { color: string; hoverColor: string; icon: string }
> = {
  document: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    hoverColor: 'hover:bg-blue-200',
    icon: '\u{1F4C4}',
  },
  database: {
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    hoverColor: 'hover:bg-purple-200',
    icon: '\u{1F5C3}',
  },
  api: {
    color: 'bg-green-100 text-green-700 border-green-200',
    hoverColor: 'hover:bg-green-200',
    icon: '\u{1F310}',
  },
  model_knowledge: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    hoverColor: 'hover:bg-gray-200',
    icon: '\u{1F9E0}',
  },
  user_input: {
    color: 'bg-teal-100 text-teal-700 border-teal-200',
    hoverColor: 'hover:bg-teal-200',
    icon: '\u{1F464}',
  },
};

const DocumentIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const ApiIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const ModelIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

function SourceTypeIcon({ type }: { type: SourceReference['type'] }) {
  switch (type) {
    case 'document':
      return <DocumentIcon />;
    case 'database':
      return <DatabaseIcon />;
    case 'api':
      return <ApiIcon />;
    case 'model_knowledge':
      return <ModelIcon />;
    case 'user_input':
      return <UserIcon />;
  }
}

export function SourceBadge({ source, compact = false, onClick }: SourceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = typeConfig[source.type];

  const handleClick = () => {
    onClick?.(source);
  };

  if (compact) {
    return (
      <span className="relative inline-block">
        <button
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium border ${config.color} ${config.hoverColor} transition-colors`}
          onClick={handleClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <SourceTypeIcon type={source.type} />
          <span>{source.id}</span>
        </button>
        {showTooltip && source.excerpt && (
          <div className="absolute z-20 bottom-full left-0 mb-1 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg max-w-xs whitespace-normal">
            <p className="font-medium mb-1">{source.title}</p>
            <p className="text-gray-300 italic">{source.excerpt}</p>
          </div>
        )}
      </span>
    );
  }

  return (
    <span className="relative inline-block">
      <button
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm border ${config.color} ${config.hoverColor} transition-colors`}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <SourceTypeIcon type={source.type} />
        <span className="font-medium truncate max-w-[200px]">{source.title}</span>
        <span className="text-xs opacity-70">
          {Math.round(source.relevanceScore * 100)}%
        </span>
      </button>
      {showTooltip && source.excerpt && (
        <div className="absolute z-20 bottom-full left-0 mb-1 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg max-w-xs whitespace-normal">
          <p className="text-gray-300 italic">{source.excerpt}</p>
          {source.location && (
            <p className="mt-1 text-gray-400">Location: {source.location}</p>
          )}
        </div>
      )}
    </span>
  );
}
