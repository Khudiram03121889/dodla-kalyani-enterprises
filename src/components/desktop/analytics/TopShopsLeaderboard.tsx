import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Order, Shop } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

interface TopShopsLeaderboardProps {
  orders: Order[];
  shops: Shop[];
  onSelectShop: (shopName: string) => void;
  selectedShopFilter: string;
}

const RANK_BADGES = [
  { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', icon: '🥇' },
  { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', icon: '🥈' },
  { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA', icon: '🥉' },
  { bg: '#EFF6FF', text: '#2563EB', border: '#DBEAFE', icon: '4️⃣' },
  { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE', icon: '5️⃣' },
];

export const TopShopsLeaderboard: React.FC<TopShopsLeaderboardProps> = ({
  orders,
  shops,
  onSelectShop,
  selectedShopFilter,
}) => {
  const topShops = useMemo(() => {
    const map: Record<string, { id: string; name: string; routeName: string; totalSpend: number; bills: number }> = {};

    orders.forEach((o) => {
      const shopKey = o.shop_name || o.shop_id || 'Unknown Shop';
      if (!map[shopKey]) {
        map[shopKey] = {
          id: o.shop_id,
          name: o.shop_name || 'Retail Party',
          routeName: o.route_name || 'Route',
          totalSpend: 0,
          bills: 0,
        };
      }
      map[shopKey].totalSpend += o.grand_total || 0;
      map[shopKey].bills += 1;
    });

    const list = Object.values(map).sort((a, b) => b.totalSpend - a.totalSpend);
    return list.slice(0, 5);
  }, [orders]);

  const maxSpend = topShops[0]?.totalSpend || 1;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>🏬 Top 5 Retail Parties</Text>
          <Text style={styles.cardSub}>Highest revenue generating shops</Text>
        </View>
        {selectedShopFilter && (
          <TouchableOpacity
            style={styles.clearFilterBtn}
            onPress={() => onSelectShop('')}
          >
            <Text style={styles.clearFilterText}>Clear Shop Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.list}>
        {topShops.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No orders punched yet.</Text>
          </View>
        ) : (
          topShops.map((item, idx) => {
            const badge = RANK_BADGES[idx] || RANK_BADGES[3];
            const isSelected = selectedShopFilter.toLowerCase() === item.name.toLowerCase();
            const barWidth = (item.totalSpend / maxSpend) * 100;

            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                onPress={() => onSelectShop(isSelected ? '' : item.name)}
                activeOpacity={0.7}
              >
                {/* Rank Badge */}
                <View style={[styles.rankPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <Text style={[styles.rankText, { color: badge.text }]}>#{idx + 1}</Text>
                </View>

                {/* Party Details */}
                <View style={styles.detailsCol}>
                  <View style={styles.titleLine}>
                    <Text style={[styles.shopName, isSelected && styles.shopNameActive]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.routeTag}>
                      <Text style={styles.routeTagText}>{item.routeName}</Text>
                    </View>
                  </View>

                  {/* Relative bar */}
                  <View style={styles.miniBarTrack}>
                    <View style={[styles.miniBarFill, { width: `${Math.max(barWidth, 5)}%` }]} />
                  </View>
                </View>

                {/* Volume & Value */}
                <View style={styles.valueCol}>
                  <Text style={styles.spendText}>{formatCurrency(item.totalSpend)}</Text>
                  <Text style={styles.billsText}>
                    {item.bills} {item.bills === 1 ? 'bill' : 'bills'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
  list: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  rankPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailsCol: {
    flex: 1,
    paddingRight: 12,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  shopName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
  },
  shopNameActive: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  routeTag: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  routeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  miniBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 3,
  },
  valueCol: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  spendText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  billsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  emptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});
