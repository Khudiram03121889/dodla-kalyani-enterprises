import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { Shop, Route } from '../../types';
import { AddRouteModal } from './AddRouteModal';
import { AddShopModal } from './AddShopModal';
import { formatDate } from '../../utils/formatters';

export const RouteSelectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout, switchRoleForDemo } = useAuth();
  const { routes, shops, refreshData } = useStore();

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    routes.length > 0 ? routes[0].id : ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [addRouteModalVisible, setAddRouteModalVisible] = useState(false);
  const [addShopModalVisible, setAddShopModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  // Default selection if route list changes
  React.useEffect(() => {
    if (!selectedRouteId && routes.length > 0) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  const filteredShops = shops
    .filter((s) => s.route_id === selectedRouteId)
    .filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.incharge && s.incharge.toLowerCase().includes(q))
      );
    });

  const handleSelectShop = (shop: Shop) => {
    navigation.navigate('PunchOrder', {
      shop,
      routeId: activeRoute?.id || selectedRouteId,
      routeName: activeRoute?.name || 'Default Route',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Sales Executive</Text>
          <Text style={styles.userName}>{user?.full_name || 'Bharath Kumar'}</Text>
          <Text style={styles.dateText}>📅 {formatDate(new Date())} &bull; Mob: {user?.phone}</Text>
        </View>

        {/* 3-Line Menu Button */}
        <TouchableOpacity
          style={styles.hamburgerBtn}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>
      </View>

      {/* Route Selector Horizontal Pills */}
      <View style={styles.routeSection}>
        <View style={styles.routeHeaderRow}>
          <Text style={styles.sectionTitle}>SELECT DELIVERY ROUTE</Text>
          <TouchableOpacity onPress={() => setAddRouteModalVisible(true)}>
            <Text style={styles.addRouteLink}>+ Add Route</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.routeList}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedRouteId;
            const shopCount = shops.filter((s) => s.route_id === item.id).length;
            return (
              <TouchableOpacity
                style={[styles.routeCard, isSelected && styles.routeCardActive]}
                onPress={() => setSelectedRouteId(item.id)}
              >
                <Text style={[styles.routeName, isSelected && styles.routeNameActive]}>
                  {item.name}
                </Text>
                <Text style={[styles.routeBadge, isSelected && styles.routeBadgeActive]}>
                  {shopCount} shops
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Search & Action Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search shops in ${activeRoute?.name || 'route'}...`}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.addShopBtn}
          onPress={() => setAddShopModalVisible(true)}
        >
          <Text style={styles.addShopBtnText}>+ New Shop</Text>
        </TouchableOpacity>
      </View>

      {/* Shops List */}
      <View style={styles.listContainer}>
        <Text style={styles.shopsCountHeader}>
          Shops in {activeRoute?.name || 'Selected Route'} ({filteredShops.length})
        </Text>

        {filteredShops.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyTitle}>No shops found in this route</Text>
            <Text style={styles.emptySub}>
              Tap below to register a new shop in {activeRoute?.name || 'this route'}.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setAddShopModalVisible(true)}
            >
              <Text style={styles.emptyAddBtnText}>+ Add First Shop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredShops}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.shopList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#1E3A8A']}
                tintColor="#1E3A8A"
              />
            }
            renderItem={({ item, index }) => (
              <View style={styles.shopCard}>
                <View style={styles.shopCardHeader}>
                  <View style={styles.shopNumberBadge}>
                    <Text style={styles.shopNumberText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopName}>{item.name}</Text>
                    {item.incharge && (
                      <Text style={styles.inchargeText}>Incharge: {item.incharge}</Text>
                    )}
                  </View>
                </View>

                <Text style={styles.shopAddress}>📍 {item.address}</Text>
                <Text style={styles.shopPhone}>📞 +91 {item.phone}</Text>

                <View style={styles.tagsRow}>
                  {item.gstin ? (
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagText}>GST: {item.gstin}</Text>
                    </View>
                  ) : null}
                  {item.fssai ? (
                    <View style={[styles.tagBadge, styles.fssaiBadge]}>
                      <Text style={styles.fssaiTagText}>FSSAI: {item.fssai}</Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.punchBtn}
                  onPress={() => handleSelectShop(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.punchBtnText}>⚡ Punch Order</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      {/* 3-Line Menu Drawer / Modal */}
      <Modal visible={menuVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Options & Actions</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Text style={styles.menuClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setAddRouteModalVisible(true);
              }}
            >
              <Text style={styles.menuItemIcon}>🗺️</Text>
              <View>
                <Text style={styles.menuItemLabel}>Add Route</Text>
                <Text style={styles.menuItemSub}>Create a new delivery route</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setAddShopModalVisible(true);
              }}
            >
              <Text style={styles.menuItemIcon}>🏪</Text>
              <View>
                <Text style={styles.menuItemLabel}>Add Shop</Text>
                <Text style={styles.menuItemSub}>Register a new shop in current route</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                switchRoleForDemo('owner');
              }}
            >
              <Text style={styles.menuItemIcon}>👑</Text>
              <View>
                <Text style={styles.menuItemLabel}>Switch to Owner Mode</Text>
                <Text style={styles.menuItemSub}>View Sales Dashboard & Godown Inventory</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={() => {
                setMenuVisible(false);
                logout();
              }}
            >
              <Text style={styles.menuItemIcon}>🚪</Text>
              <View>
                <Text style={[styles.menuItemLabel, { color: '#DC2626' }]}>Sign Out</Text>
                <Text style={styles.menuItemSub}>End your sales session</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modals for Add Route and Add Shop */}
      <AddRouteModal
        visible={addRouteModalVisible}
        onClose={() => setAddRouteModalVisible(false)}
        onRouteAdded={(id) => setSelectedRouteId(id)}
      />

      <AddShopModal
        visible={addShopModalVisible}
        onClose={() => setAddShopModalVisible(false)}
        selectedRouteId={selectedRouteId}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  greeting: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  dateText: {
    color: '#E0E7FF',
    fontSize: 12,
    marginTop: 2,
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  hamburgerLine: {
    width: 22,
    height: 2.5,
    backgroundColor: '#FFFFFF',
    marginVertical: 2.5,
    borderRadius: 2,
  },
  routeSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  routeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  addRouteLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  routeList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  routeCard: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  routeCardActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  routeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  routeNameActive: {
    color: '#FFFFFF',
  },
  routeBadge: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  routeBadgeActive: {
    color: '#BFDBFE',
  },
  searchBarContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  addShopBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addShopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  shopsCountHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  shopList: {
    paddingBottom: 20,
    gap: 10,
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  shopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  shopNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  shopName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  inchargeText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  shopAddress: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
    lineHeight: 18,
  },
  shopPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tagBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10.5,
    color: '#4B5563',
    fontWeight: '600',
  },
  fssaiBadge: {
    backgroundColor: '#FEF3C7',
  },
  fssaiTagText: {
    fontSize: 10.5,
    color: '#92400E',
    fontWeight: '600',
  },
  punchBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  punchBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyAddBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 55,
    paddingRight: 16,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    width: 270,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  menuClose: {
    fontSize: 14,
    color: '#6B7280',
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  menuItemIcon: {
    fontSize: 18,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
  logoutItem: {
    marginTop: 2,
  },
});
