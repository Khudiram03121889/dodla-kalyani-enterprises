import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Order, Route, Category, Product, Shop } from '../../../types';
import { SalesTrendChart } from './SalesTrendChart';
import { RouteContributionChart } from './RouteContributionChart';
import { CategoryDistributionChart } from './CategoryDistributionChart';
import { TopShopsLeaderboard } from './TopShopsLeaderboard';

interface SalesAnalyticsSectionProps {
  orders: Order[];
  routes: Route[];
  categories: Category[];
  products: Product[];
  shops: Shop[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  selectedShopFilter: string;
  onSelectShop: (shopName: string) => void;
}

export const SalesAnalyticsSection: React.FC<SalesAnalyticsSectionProps> = ({
  orders,
  routes,
  categories,
  products,
  shops,
  selectedRouteId,
  onSelectRoute,
  selectedShopFilter,
  onSelectShop,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('7d');

  return (
    <View style={styles.container}>
      {/* Analytics Toolbar Header */}
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>📊 Business Analytics & Trends</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Live Figures</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Revenue velocity, route distribution, category breakdown & top retailers
          </Text>
        </View>

        <View style={styles.controlsRow}>
          {/* Timeframe Selector (Only active when expanded) */}
          {isExpanded && (
            <View style={styles.timeframeGroup}>
              {(['7d', '30d', 'all'] as const).map((t) => {
                const label = t === '7d' ? 'Last 7 Days' : t === '30d' ? 'Last 30 Days' : 'All Time';
                const isActive = timeframe === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.timeframeBtn, isActive && styles.timeframeBtnActive]}
                    onPress={() => setTimeframe(t)}
                  >
                    <Text style={[styles.timeframeBtnText, isActive && styles.timeframeBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Toggle Expand / Collapse Button */}
          <TouchableOpacity
            style={[styles.toggleBtn, !isExpanded && styles.toggleBtnCollapsed]}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleBtnText}>
              {isExpanded ? '▲ Hide Charts' : '▼ Show Charts'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Visual Analytics Grid */}
      {isExpanded && (
        <View style={styles.grid}>
          {/* Row 1: Daily Revenue Trend & Route Contribution */}
          <View style={styles.gridRow}>
            <SalesTrendChart orders={orders} timeframe={timeframe} />
            <RouteContributionChart
              orders={orders}
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={onSelectRoute}
            />
          </View>

          {/* Row 2: Category Mix & Top Retailers */}
          <View style={styles.gridRow}>
            <CategoryDistributionChart
              orders={orders}
              categories={categories}
              products={products}
            />
            <TopShopsLeaderboard
              orders={orders}
              shops={shops}
              selectedShopFilter={selectedShopFilter}
              onSelectShop={onSelectShop}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleCol: {
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeframeGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
  },
  timeframeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  timeframeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  timeframeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  timeframeBtnTextActive: {
    color: '#1E3A8A',
    fontWeight: '800',
  },
  toggleBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnCollapsed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  grid: {
    marginTop: 18,
    gap: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
});
