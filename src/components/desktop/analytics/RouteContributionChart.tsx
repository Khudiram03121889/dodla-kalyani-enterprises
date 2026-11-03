import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Order, Route } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

interface RouteContributionChartProps {
  orders: Order[];
  routes: Route[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
}

const ROUTE_COLORS = [
  '#1E3A8A', // Dodla Deep Blue
  '#0284C7', // Sky Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Purple
  '#DB2777', // Pink
];

export const RouteContributionChart: React.FC<RouteContributionChartProps> = ({
  orders,
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  const { routeStats, grandTotalRevenue } = useMemo(() => {
    const totalRev = orders.reduce((acc, o) => acc + (o.grand_total || 0), 0);

    const statsMap: Record<string, { id: string; name: string; revenue: number; bills: number }> = {};

    // Initialize with all existing routes
    routes.forEach((r) => {
      statsMap[r.id] = { id: r.id, name: r.name, revenue: 0, bills: 0 };
    });

    // Accumulate from orders
    orders.forEach((o) => {
      if (statsMap[o.route_id]) {
        statsMap[o.route_id].revenue += o.grand_total || 0;
        statsMap[o.route_id].bills += 1;
      } else if (o.route_id) {
        statsMap[o.route_id] = {
          id: o.route_id,
          name: o.route_name || 'Other Route',
          revenue: o.grand_total || 0,
          bills: 1,
        };
      }
    });

    // Sort descending by revenue, then by bills
    const list = Object.values(statsMap).sort((a, b) => b.revenue - a.revenue || b.bills - a.bills);

    return {
      routeStats: list,
      grandTotalRevenue: totalRev,
    };
  }, [orders, routes]);

  const maxRouteRevenue = Math.max(...routeStats.map((r) => r.revenue), 1);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>🚚 Route-Wise Sales Contribution</Text>
          <Text style={styles.cardSub}>Click a route bar to filter invoices below</Text>
        </View>
        {selectedRouteId !== 'ALL' && (
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => onSelectRoute('ALL')}
          >
            <Text style={styles.clearFilterText}>Reset Route Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.routesList}>
        {routeStats.map((route, idx) => {
          const isSelected = selectedRouteId === route.id;
          const percentage = grandTotalRevenue > 0 ? (route.revenue / grandTotalRevenue) * 100 : 0;
          const barWidthPercent = maxRouteRevenue > 0 ? (route.revenue / maxRouteRevenue) * 100 : 0;
          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];

          return (
            <TouchableOpacity
              key={route.id}
              style={[styles.routeRow, isSelected && styles.routeRowSelected]}
              onPress={() => onSelectRoute(isSelected ? 'ALL' : route.id)}
              activeOpacity={0.7}
            >
              {/* Route Label & Bill Count */}
              <View style={styles.routeInfo}>
                <View style={styles.nameBadgeRow}>
                  <View style={[styles.colorIndicator, { backgroundColor: color }]} />
                  <Text style={[styles.routeName, isSelected && styles.routeNameActive]}>
                    {route.name}
                  </Text>
                </View>
                <Text style={styles.billCountText}>
                  {route.bills} {route.bills === 1 ? 'bill' : 'bills'}
                </Text>
              </View>

              {/* Progress Bar Track */}
              <View style={styles.barContainer}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.max(barWidthPercent, route.revenue > 0 ? 4 : 0)}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Amount and Percentage */}
              <View style={styles.amountCol}>
                <Text style={styles.revenueAmount}>{formatCurrency(route.revenue)}</Text>
                <Text style={styles.percentageText}>{percentage.toFixed(1)}%</Text>
              </View>
            </TouchableOpacity>
          );
        })}
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
    marginBottom: 16,
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
  clearFilterBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  routesList: {
    gap: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  routeRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  routeInfo: {
    width: 140,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  routeNameActive: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  billCountText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginLeft: 14,
  },
  barContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  barTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  amountCol: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  revenueAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  percentageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
});
