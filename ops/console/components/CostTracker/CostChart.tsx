/**
 * AgentOS Ops Console - Cost Chart Component
 * Time-series visualization for cost data
 */

'use client';

import React, { useState } from 'react';
import { cn, formatCurrency, formatDate, formatCompactNumber } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { BarChart3, LineChart, TrendingUp } from 'lucide-react';
import type { TimeSeriesPoint } from './useCostData';

// ============================================
// Types
// ============================================

interface CostChartProps {
  data: TimeSeriesPoint[];
  loading?: boolean;
}

type ChartView = 'cost' | 'tokens' | 'combined';
type ChartType = 'bar' | 'line';

// ============================================
// Component
// ============================================

export function CostChart({ data, loading = false }: CostChartProps) {
  const [view, setView] = useState<ChartView>('cost');
  const [chartType, setChartType] = useState<ChartType>('bar');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 skeleton rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.amount));
  const maxTokens = Math.max(...data.map(d => d.tokens));

  return (
    <Card>
      <CardHeader
        action={
          <div className="flex items-center gap-2">
            <ButtonGroup attached>
              <Button
                variant={view === 'cost' ? 'primary' : 'secondary'}
                size="xs"
                onClick={() => setView('cost')}
              >
                Cost
              </Button>
              <Button
                variant={view === 'tokens' ? 'primary' : 'secondary'}
                size="xs"
                onClick={() => setView('tokens')}
              >
                Tokens
              </Button>
            </ButtonGroup>
            <ButtonGroup attached>
              <Button
                variant={chartType === 'bar' ? 'primary' : 'secondary'}
                size="xs"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={chartType === 'line' ? 'primary' : 'secondary'}
                size="xs"
                onClick={() => setChartType('line')}
              >
                <LineChart className="w-3.5 h-3.5" />
              </Button>
            </ButtonGroup>
          </div>
        }
      >
        <CardTitle>Cost Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end gap-1">
          {chartType === 'bar' ? (
            <BarChartView data={data} view={view} maxAmount={maxAmount} maxTokens={maxTokens} />
          ) : (
            <LineChartView data={data} view={view} maxAmount={maxAmount} maxTokens={maxTokens} />
          )}
        </div>
        <div className="flex justify-between mt-4 text-xs text-slate-500 dark:text-dark-text-tertiary">
          <span>{formatDate(data[0]?.date || '')}</span>
          <span>{formatDate(data[data.length - 1]?.date || '')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Bar Chart View
// ============================================

function BarChartView({
  data,
  view,
  maxAmount,
  maxTokens,
}: {
  data: TimeSeriesPoint[];
  view: ChartView;
  maxAmount: number;
  maxTokens: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <>
      {data.map((point, index) => {
        const value = view === 'tokens' ? point.tokens : point.amount;
        const max = view === 'tokens' ? maxTokens : maxAmount;
        const height = (value / max) * 100;
        const isHovered = hoveredIndex === index;

        return (
          <div
            key={point.date}
            className="relative flex-1 flex flex-col items-center group"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className={cn(
                'w-full rounded-t transition-all duration-200',
                view === 'tokens'
                  ? 'bg-purple-500 dark:bg-purple-400'
                  : 'bg-brand-500 dark:bg-brand-400',
                isHovered && 'opacity-80'
              )}
              style={{ height: `${height}%`, minHeight: value > 0 ? '4px' : '0' }}
            />
            {isHovered && (
              <div className="absolute bottom-full mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                <p className="font-medium">{formatDate(point.date, 'MMM d')}</p>
                <p>
                  {view === 'tokens'
                    ? formatCompactNumber(point.tokens) + ' tokens'
                    : formatCurrency(point.amount)}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ============================================
// Line Chart View
// ============================================

function LineChartView({
  data,
  view,
  maxAmount,
  maxTokens,
}: {
  data: TimeSeriesPoint[];
  view: ChartView;
  maxAmount: number;
  maxTokens: number;
}) {
  const width = 100;
  const height = 100;
  const max = view === 'tokens' ? maxTokens : maxAmount;

  const points = data
    .map((point, index) => {
      const value = view === 'tokens' ? point.tokens : point.amount;
      const x = (index / (data.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPath = `M0,${height} L${points} L${width},${height} Z`;
  const strokeColor = view === 'tokens' ? '#a855f7' : '#3b82f6';
  const fillColor = view === 'tokens' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(59, 130, 246, 0.1)';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <path d={areaPath} fill={fillColor} />
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default CostChart;
