import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Order, Category, Product } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

interface CategoryDistributionChartProps {
  orders: Order[];
  categories: Category[];
  products: Product[];
}

const CATEGORY_PALETTE = [
  '#2563EB', // Blue
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({
  orders,
  categories,
  products,
}) => {
  const [metric, setMetric] = useState<'revenue' | 'quantity'>('revenue');

  // Map category stats
  const { catList, totalRevenue, totalQuantity } = useMemo(() => {
    // Map product id -> category name
    const prodCatMap: Record<string, string> = {};
    const catIdNameMap: Record<string, string> = {};

    categories.forEach((c) => {
      catIdNameMap[c.id] = c.name;
    });

    products.forEach((p) => {
      prodCatMap[p.id] = catIdNameMap[p.category_id] || 'General';
    });

    const statsMap: Record<string, { name: string; revenue: number; quantity: number }> = {};

    // Initialize with known categories
    categories.forEach((c) => {
      statsMap[c.name] = { name: c.name, revenue: 0, quantity: 0 };
    });

    // Accumulate from order items
    orders.forEach((o) => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((item) => {
          // Detect category from item or fallback
          let catName = item.category_name || prodCatMap[item.product_id];
          if (!catName) {
            // Check keyword in product name
            const pName = (item.product_name || '').toLowerCase();
            if (pName.includes('badam')) catName = 'Badam Milk';
            else if (pName.includes('soan')) catName = 'Soan Papdi';
            else if (pName.includes('jamun')) catName = 'Gulab Jamun';
            else if (pName.includes('pedha') || pName.includes('peda')) catName = 'Doodh Pedha';
            else catName = 'Other Sweets';
          }

          if (!statsMap[catName]) {
            statsMap[catName] = { name: catName, revenue: 0, quantity: 0 };
          }
          const itemRev = item.total_amount || (item.qty || 0) * (item.rate || 0);
          statsMap[catName].revenue += itemRev;
          statsMap[catName].quantity += item.qty || 0;
        });
      }
    });

    const list = Object.values(statsMap).filter((c) => c.revenue > 0 || c.quantity > 0);
    // If no order items recorded yet, fallback to show categories with 0
    const finalDisplay = list.length > 0 ? list : categories.map((c) => ({ name: c.name, revenue: 0, quantity: 0 }));

    const totRev = finalDisplay.reduce((acc, c) => acc + c.revenue, 0);
    const totQty = finalDisplay.reduce((acc, c) => acc + c.quantity, 0);

    finalDisplay.sort((a, b) => (metric === 'revenue' ? b.revenue - a.revenue : b.quantity - a.quantity));

    return {
      catList: finalDisplay,
      totalRevenue: totRev,
      totalQuantity: totQty,
    };
  }, [orders, categories, products, metric]);

  // Donut chart calculations
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const totalVal = metric === 'revenue' ? totalRevenue : totalQuantity;

  let accumulatedPercent = 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>🥛 Product Category Breakdown</Text>
          <Text style={styles.cardSub}>Turnover split across product lines</Text>
        </View>

        {/* Metric Switcher */}
        <View style={styles.toggleGroup}>
          <TouchableOpacity
            style={[styles.toggleBtn, metric === 'revenue' && styles.toggleBtnActive]}
            onPress={() => setMetric('revenue')}
          >
            <Text style={[styles.toggleBtnText, metric === 'revenue' && styles.toggleBtnTextActive]}>
              Revenue (₹)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, metric === 'quantity' && styles.toggleBtnActive]}
            onPress={() => setMetric('quantity')}
          >
            <Text style={[styles.toggleBtnText, metric === 'quantity' && styles.toggleBtnTextActive]}>
              Units Sold
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content: Donut + Legend */}
      <View style={styles.chartRow}>
        {/* SVG Donut */}
        <View style={styles.donutWrapper}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background Empty Ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {totalVal > 0 ? (
              catList.map((cat, idx) => {
                const val = metric === 'revenue' ? cat.revenue : cat.quantity;
                const percent = val / totalVal;
                const dashArray = `${percent * circumference} ${circumference}`;
                const dashOffset = -accumulatedPercent * circumference;
                accumulatedPercent += percent;
                const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];

                return (
                  <circle
                    key={cat.name}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dasharray 0.3s ease' }}
                  />
                );
              })
            ) : (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#E2E8F0"
                strokeWidth={strokeWidth}
              />
            )}
          </svg>

          {/* Center Callout */}
          <View style={styles.donutCenter}>
            <Text style={styles.donutCenterLabel}>
              {metric === 'revenue' ? 'Total Sales' : 'Total Units'}
            </Text>
            <Text style={styles.donutCenterVal}>
              {metric === 'revenue' ? formatCurrency(totalRevenue) : `${totalQuantity} Units`}
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendCol}>
          {catList.map((cat, idx) => {
            const val = metric === 'revenue' ? cat.revenue : cat.quantity;
            const percent = totalVal > 0 ? (val / totalVal) * 100 : 0;
            const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];

            return (
              <View key={cat.name} style={styles.legendItem}>
                <View style={styles.legendHeader}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendName}>{cat.name}</Text>
                  <Text style={styles.legendPercent}>{percent.toFixed(1)}%</Text>
                </View>
                <View style={styles.legendDetailRow}>
                  <Text style={styles.legendSubtext}>
                    {cat.quantity} units • {formatCurrency(cat.revenue)}
                  </Text>
                </View>
              </View>
            );
          })}
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
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#1E3A8A',
    fontWeight: '800',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 8,
  },
  donutWrapper: {
    position: 'relative',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
  },
  donutCenterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  donutCenterVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    textAlign: 'center',
  },
  legendCol: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  legendDetailRow: {
    marginTop: 2,
    paddingLeft: 14,
  },
  legendSubtext: {
    fontSize: 11,
    color: '#64748B',
  },
});
