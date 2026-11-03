import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Order } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

interface SalesTrendChartProps {
  orders: Order[];
  timeframe: '7d' | '30d' | 'all';
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ orders, timeframe }) => {
  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string;
    label: string;
    revenue: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Calculate daily data
  const { chartData, maxRevenue, totalPeriodRevenue, avgDailyRevenue, peakDay } = useMemo(() => {
    const daysCount = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 30;
    const now = new Date();
    const dataMap: Record<string, { label: string; dateStr: string; revenue: number; count: number }> = {};

    // Generate date keys backwards
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dataMap[key] = { label, dateStr: key, revenue: 0, count: 0 };
    }

    // Aggregate orders into day buckets
    orders.forEach((o) => {
      if (!o.created_at) return;
      const orderDate = o.created_at.split('T')[0];
      if (dataMap[orderDate]) {
        dataMap[orderDate].revenue += o.grand_total || 0;
        dataMap[orderDate].count += 1;
      }
    });

    const list = Object.values(dataMap);
    const maxRev = Math.max(...list.map((d) => d.revenue), 1000);
    const totRev = list.reduce((acc, d) => acc + d.revenue, 0);
    const avgRev = totRev / (list.length || 1);
    const peak = [...list].sort((a, b) => b.revenue - a.revenue)[0];

    return {
      chartData: list,
      maxRevenue: maxRev,
      totalPeriodRevenue: totRev,
      avgDailyRevenue: avgRev,
      peakDay: peak,
    };
  }, [orders, timeframe]);

  const svgWidth = 520;
  const svgHeight = 180;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;

  const chartInnerWidth = svgWidth - paddingLeft - paddingRight;
  const chartInnerHeight = svgHeight - paddingTop - paddingBottom;
  const barWidth = Math.max(8, Math.min(28, (chartInnerWidth / chartData.length) * 0.65));
  const step = chartInnerWidth / (chartData.length || 1);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>📈 Daily Sales & Bill Volume</Text>
          <Text style={styles.cardSub}>Turnover trends over the selected period</Text>
        </View>
        <View style={styles.periodBadge}>
          <Text style={styles.periodBadgeText}>
            Period Total: <Text style={{ fontWeight: '800' }}>{formatCurrency(totalPeriodRevenue)}</Text>
          </Text>
        </View>
      </View>

      {/* SVG Chart Container */}
      <View style={styles.chartWrapper}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* Y-Axis Grid Lines & Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + chartInnerHeight * (1 - ratio);
            const val = maxRevenue * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={ratio === 0 ? undefined : '3,3'}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94A3B8"
                  fontWeight="600"
                >
                  {val >= 1000 ? `₹${(val / 1000).toFixed(1)}k` : `₹${Math.round(val)}`}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {chartData.map((d, index) => {
            const x = paddingLeft + index * step + (step - barWidth) / 2;
            const barH = (d.revenue / maxRevenue) * chartInnerHeight;
            const y = paddingTop + chartInnerHeight - barH;
            const isHovered = hoveredDay?.dateStr === d.dateStr;
            const hasSales = d.revenue > 0;

            // Show label on every bar for 7d, or every 4th bar for 30d
            const showLabel = chartData.length <= 10 || index % 4 === 0 || index === chartData.length - 1;

            return (
              <g
                key={d.dateStr}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() =>
                  setHoveredDay({
                    dateStr: d.dateStr,
                    label: d.label,
                    revenue: d.revenue,
                    count: d.count,
                    x: x + barWidth / 2,
                    y,
                  })
                }
                onMouseLeave={() => setHoveredDay(null)}
              >
                {/* Background hover column track */}
                <rect
                  x={paddingLeft + index * step}
                  y={paddingTop}
                  width={step}
                  height={chartInnerHeight}
                  fill={isHovered ? 'rgba(59, 130, 246, 0.05)' : 'transparent'}
                />

                {/* Visible Data Bar */}
                <rect
                  x={x}
                  y={hasSales ? y : paddingTop + chartInnerHeight - 2}
                  width={barWidth}
                  height={hasSales ? Math.max(barH, 3) : 2}
                  rx={3}
                  ry={3}
                  fill={isHovered ? '#1E3A8A' : hasSales ? '#2563EB' : '#CBD5E1'}
                  style={{ transition: 'all 0.2s ease' }}
                />

                {/* Bill count dot indicator if orders exist */}
                {hasSales && (
                  <circle
                    cx={x + barWidth / 2}
                    cy={y - 5}
                    r={3}
                    fill={isHovered ? '#F59E0B' : '#10B981'}
                  />
                )}

                {/* X-axis date labels */}
                {showLabel && (
                  <text
                    x={x + barWidth / 2}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fontSize="9"
                    fill={isHovered ? '#1E3A8A' : '#64748B'}
                    fontWeight={isHovered ? '700' : '500'}
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Interactive Tooltip Callout */}
          {hoveredDay && (
            <g
              transform={`translate(${Math.min(
                Math.max(hoveredDay.x - 60, paddingLeft),
                svgWidth - paddingRight - 120
              )}, ${Math.max(10, hoveredDay.y - 48)})`}
              style={{ pointerEvents: 'none' }}
            >
              <rect
                x="0"
                y="0"
                width="120"
                height="42"
                rx="6"
                fill="#0F172A"
                opacity="0.95"
              />
              <text x="60" y="16" textAnchor="middle" fontSize="10" fill="#94A3B8" fontWeight="600">
                {hoveredDay.label}
              </text>
              <text x="60" y="32" textAnchor="middle" fontSize="12" fill="#38BDF8" fontWeight="800">
                {formatCurrency(hoveredDay.revenue)} ({hoveredDay.count} bills)
              </text>
            </g>
          )}
        </svg>
      </View>

      {/* Metric Micro-Footer */}
      <View style={styles.metricsFooter}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Daily Average</Text>
          <Text style={styles.metricVal}>{formatCurrency(avgDailyRevenue)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Peak Sales Day</Text>
          <Text style={styles.metricVal}>
            {peakDay?.revenue ? `${peakDay.label} (${formatCurrency(peakDay.revenue)})` : 'None'}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Status Indicator</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.metricVal, { color: '#059669' }]}>Active Sales Flow</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    flex: 1,
    minWidth: 340,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  periodBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  periodBadgeText: {
    fontSize: 12,
    color: '#1E40AF',
  },
  chartWrapper: {
    height: 190,
    width: '100%',
  },
  metricsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
