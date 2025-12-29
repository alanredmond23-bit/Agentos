/**
 * AgentOS Ops Console - Stats Card Component
 * Metric display cards for dashboards
 */

import React from 'react';
import { cn, formatNumber, formatCompactNumber, formatCurrency, formatPercentage } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================
// Stats Card Types
// ============================================

type TrendDirection = 'up' | 'down' | 'neutral';
type ValueFormat = 'number' | 'compact' | 'currency' | 'percentage';

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: number;
  previousValue?: number;
  format?: ValueFormat;
  currency?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: TrendDirection;
    label?: string;
  };
  loading?: boolean;
  sparkline?: number[];
  footer?: React.ReactNode;
}

// ============================================
// Stats Card Component
// ============================================

export function StatsCard({
  className,
  title,
  value,
  previousValue,
  format = 'number',
  currency = 'USD',
  icon,
  trend,
  loading = false,
  sparkline,
  footer,
  ...props
}: StatsCardProps) {
  // Calculate trend from previous value if not provided
  const calculatedTrend = React.useMemo(() => {
    if (trend) return trend;
    if (previousValue === undefined || previousValue === 0) return null;

    const change = ((value - previousValue) / previousValue) * 100;
    return {
      value: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' as TrendDirection,
    };
  }, [trend, value, previousValue]);

  // Format value based on type
  const formattedValue = React.useMemo(() => {
    switch (format) {
      case 'compact':
        return formatCompactNumber(value);
      case 'currency':
        return formatCurrency(value, currency);
      case 'percentage':
        return formatPercentage(value);
      default:
        return formatNumber(value);
    }
  }, [value, format, currency]);

  if (loading) {
    return (
      <div className={cn('stats-card', className)} {...props}>
        <div className="flex items-start justify-between gap-4">
          <div className="skeleton h-5 w-24" />
          {icon && <div className="skeleton w-10 h-10 rounded-lg" />}
        </div>
        <div className="skeleton h-9 w-32 mt-3" />
        <div className="skeleton h-4 w-20 mt-2" />
      </div>
    );
  }

  return (
    <div className={cn('stats-card', className)} {...props}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-medium text-slate-500 dark:text-dark-text-tertiary">
          {title}
        </span>
        {icon && (
          <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="stats-card-value mt-2">{formattedValue}</div>

      {/* Trend */}
      {calculatedTrend && (
        <div
          className={cn(
            'stats-card-trend',
            calculatedTrend.direction === 'up' && 'positive',
            calculatedTrend.direction === 'down' && 'negative',
            calculatedTrend.direction === 'neutral' &&
              'text-slate-500 dark:text-dark-text-tertiary'
          )}
        >
          {calculatedTrend.direction === 'up' && (
            <TrendingUp className="w-4 h-4" />
          )}
          {calculatedTrend.direction === 'down' && (
            <TrendingDown className="w-4 h-4" />
          )}
          {calculatedTrend.direction === 'neutral' && (
            <Minus className="w-4 h-4" />
          )}
          <span>
            {formatPercentage(calculatedTrend.value)}
            {calculatedTrend.label && (
              <span className="text-slate-500 dark:text-dark-text-tertiary ml-1">
                {calculatedTrend.label}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (
        <div className="mt-4">
          <Sparkline data={sparkline} />
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-dark-border-primary">
          {footer}
        </div>
      )}
    </div>
  );
}

// ============================================
// Mini Stats Card Component
// ============================================

interface MiniStatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: TrendDirection;
  className?: string;
}

export function MiniStatsCard({
  title,
  value,
  icon,
  trend,
  className,
}: MiniStatsCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary',
        className
      )}
    >
      {icon && (
        <div className="p-2 rounded-md bg-white dark:bg-dark-bg-elevated shadow-sm">
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
          {title}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                'w-4 h-4',
                trend === 'up' && 'text-emerald-500',
                trend === 'down' && 'text-red-500',
                trend === 'neutral' && 'text-slate-400'
              )}
            >
              {trend === 'up' && <TrendingUp className="w-4 h-4" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4" />}
              {trend === 'neutral' && <Minus className="w-4 h-4" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sparkline Component
// ============================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  className,
}: SparklineProps) {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  // Determine color based on trend
  const isPositive = data[data.length - 1]! >= data[0]!;
  const strokeColor = isPositive
    ? 'stroke-emerald-500'
    : 'stroke-red-500';
  const fillColor = isPositive
    ? 'fill-emerald-500/10'
    : 'fill-red-500/10';

  // Create area path
  const areaPath = `M0,${height} L${points} L${width},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
    >
      {/* Area fill */}
      <path d={areaPath} className={fillColor} />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        className={cn(strokeColor, 'stroke-[1.5]')}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1]! - min) / range) * height}
        r="3"
        className={cn(
          'fill-white stroke-[2]',
          strokeColor
        )}
      />
    </svg>
  );
}

export default StatsCard;
