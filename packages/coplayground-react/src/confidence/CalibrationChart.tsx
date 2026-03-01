import type { CalibrationData } from '@coplayground/core';

export interface CalibrationChartProps {
  data: CalibrationData[];
  width?: number;
  height?: number;
}

const domainColors: Record<string, string> = {
  default: '#6b7280',
  medical: '#ef4444',
  legal: '#3b82f6',
  financial: '#10b981',
  technical: '#8b5cf6',
  general: '#f59e0b',
};

function getDomainColor(domain: string): string {
  return domainColors[domain.toLowerCase()] ?? domainColors.default;
}

export function CalibrationChart({
  data,
  width = 320,
  height = 240,
}: CalibrationChartProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const toX = (val: number) => padding.left + val * chartWidth;
  const toY = (val: number) => padding.top + (1 - val) * chartHeight;

  // Collect unique domains
  const domains = [...new Set(data.map((d) => d.domain))];

  // Grid lines at 0.25 intervals
  const gridValues = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div className="inline-block">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="bg-white rounded-lg border border-gray-200"
      >
        {/* Grid lines */}
        {gridValues.map((val) => (
          <g key={`grid-${val}`}>
            {/* Horizontal */}
            <line
              x1={padding.left}
              y1={toY(val)}
              x2={width - padding.right}
              y2={toY(val)}
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeDasharray={val === 0 || val === 1 ? 'none' : '4,4'}
            />
            {/* Vertical */}
            <line
              x1={toX(val)}
              y1={padding.top}
              x2={toX(val)}
              y2={height - padding.bottom}
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeDasharray={val === 0 || val === 1 ? 'none' : '4,4'}
            />
            {/* Y axis label */}
            <text
              x={padding.left - 8}
              y={toY(val) + 4}
              textAnchor="end"
              className="text-xs fill-gray-500"
              fontSize={10}
            >
              {val.toFixed(2)}
            </text>
            {/* X axis label */}
            <text
              x={toX(val)}
              y={height - padding.bottom + 16}
              textAnchor="middle"
              className="text-xs fill-gray-500"
              fontSize={10}
            >
              {val.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Perfect calibration line (diagonal) */}
        <line
          x1={toX(0)}
          y1={toY(0)}
          x2={toX(1)}
          y2={toY(1)}
          stroke="#d1d5db"
          strokeWidth={2}
          strokeDasharray="6,4"
        />
        <text
          x={toX(0.85)}
          y={toY(0.88)}
          className="fill-gray-400"
          fontSize={9}
          transform={`rotate(-${Math.atan(chartHeight / chartWidth) * (180 / Math.PI)}, ${toX(0.85)}, ${toY(0.88)})`}
        >
          Perfect
        </text>

        {/* Data points */}
        {data.map((point, idx) => {
          const cx = toX(point.predicted);
          const cy = toY(point.actual);
          const color = getDomainColor(point.domain);
          const radius = Math.max(3, Math.min(8, Math.sqrt(point.sampleSize) * 0.8));

          return (
            <g key={idx}>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={color}
                fillOpacity={0.7}
                stroke={color}
                strokeWidth={1.5}
              >
                <title>
                  {`${point.domain}: predicted=${point.predicted.toFixed(2)}, actual=${point.actual.toFixed(2)}, n=${point.sampleSize}`}
                </title>
              </circle>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={padding.left + chartWidth / 2}
          y={height - 4}
          textAnchor="middle"
          className="fill-gray-600"
          fontSize={11}
          fontWeight={500}
        >
          Predicted Confidence
        </text>
        <text
          x={14}
          y={padding.top + chartHeight / 2}
          textAnchor="middle"
          className="fill-gray-600"
          fontSize={11}
          fontWeight={500}
          transform={`rotate(-90, 14, ${padding.top + chartHeight / 2})`}
        >
          Actual Accuracy
        </text>
      </svg>

      {/* Legend */}
      {domains.length > 1 && (
        <div className="flex flex-wrap gap-3 mt-2 px-1">
          {domains.map((domain) => (
            <div key={domain} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: getDomainColor(domain) }}
              />
              <span className="capitalize">{domain}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
