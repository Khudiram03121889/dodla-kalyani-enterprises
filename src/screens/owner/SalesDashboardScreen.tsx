import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';
import { COMPANY_DETAILS } from '../../config/constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const SalesDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout, switchRoleForDemo } = useAuth();
  const { orders, markOrderAsPrinted, refreshData, isLoading } = useStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'printed'>('pending');
  const [menuVisible, setMenuVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  // Filter pending vs printed orders
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'pending'), [orders]);
  const printedOrders = useMemo(() => orders.filter((o) => o.status === 'printed'), [orders]);

  const displayedOrders = activeTab === 'pending' ? pendingOrders : printedOrders;

  // KPIs
  const totalPunchesCount = orders.length;
  const pendingCount = pendingOrders.length;
  const pendingTotalAmount = pendingOrders.reduce((sum, o) => sum + o.grand_total, 0);
  const printedCount = printedOrders.length;
  const printedTotalAmount = printedOrders.reduce((sum, o) => sum + o.grand_total, 0);
  const totalRevenue = orders.reduce((sum, o) => sum + o.grand_total, 0);

  const handleOpenInvoice = (order: Order) => {
    navigation.navigate('InvoicePreview', { orderId: order.id });
  };

  const handleQuickMarkPrinted = async (order: Order) => {
    await markOrderAsPrinted(order.id);
    Alert.alert('Marked as Printed', `Invoice ${order.invoice_no} has been moved to Printed History.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../../assets/kalyani_enterprise_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerCompany}>{COMPANY_DETAILS.name}</Text>
            <Text style={styles.headerUser}>Owner Dashboard &bull; {user?.full_name}</Text>
          </View>
        </View>

        {/* 3-line Menu Button */}
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <FlatList
        data={displayedOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1E3A8A']}
            tintColor="#1E3A8A"
          />
        }
        ListHeaderComponent={
          <View>
            {/* KPI Metric Cards */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, styles.kpiTotal]}>
                <Text style={styles.kpiTitle}>TOTAL PUNCHES</Text>
                <Text style={styles.kpiValue}>{totalPunchesCount}</Text>
                <Text style={styles.kpiSub}>Total orders received</Text>
              </View>

              <View style={[styles.kpiCard, styles.kpiRevenue]}>
                <Text style={styles.kpiTitle}>TOTAL REVENUE</Text>
                <Text style={styles.kpiValue}>{formatCurrency(totalRevenue)}</Text>
                <Text style={styles.kpiSub}>Incl. 5% GST</Text>
              </View>

              <View style={[styles.kpiCard, styles.kpiPending]}>
                <Text style={styles.kpiTitle}>PENDING PRINT</Text>
                <Text style={[styles.kpiValue, { color: '#D97706' }]}>{pendingCount}</Text>
                <Text style={styles.kpiSub}>{formatCurrency(pendingTotalAmount)}</Text>
              </View>

              <View style={[styles.kpiCard, styles.kpiPrinted]}>
                <Text style={styles.kpiTitle}>ALREADY PRINTED</Text>
                <Text style={[styles.kpiValue, { color: '#059669' }]}>{printedCount}</Text>
                <Text style={styles.kpiSub}>{formatCurrency(printedTotalAmount)}</Text>
              </View>
            </View>

            {/* Quick Action: Route Summary Sheet */}
            <TouchableOpacity
              style={styles.summaryBanner}
              onPress={() => navigation.navigate('RouteSummary')}
              activeOpacity={0.85}
            >
              <View style={styles.summaryBannerLeft}>
                <Text style={styles.summaryBannerIcon}>📋</Text>
                <View>
                  <Text style={styles.summaryBannerTitle}>
                    Route Summary Sheet (Page 39 Format)
                  </Text>
                  <Text style={styles.summaryBannerSub}>
                    Consolidate route orders for drivers & print total sheets
                  </Text>
                </View>
              </View>
              <Text style={styles.summaryBannerArrow}>→</Text>
            </TouchableOpacity>

            {/* Tabs: Pending vs Printed */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
                onPress={() => setActiveTab('pending')}
              >
                <Text
                  style={[styles.tabBtnText, activeTab === 'pending' && styles.tabBtnTextActive]}
                >
                  Pending to Print ({pendingCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'printed' && styles.tabBtnActive]}
                onPress={() => setActiveTab('printed')}
              >
                <Text
                  style={[styles.tabBtnText, activeTab === 'printed' && styles.tabBtnTextActive]}
                >
                  Printed History ({printedCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {activeTab === 'pending' ? '✨' : '📂'}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending'
                ? 'All caught up! No pending bills to print.'
                : 'No printed invoices in history.'}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === 'pending'
                ? 'When executives punch orders in the field, they will appear here instantly.'
                : 'Invoices you mark as printed will be archived here for re-printing.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isPending = item.status === 'pending';

          return (
            <View style={styles.orderCard}>
              <View style={styles.orderCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invoiceNo}>{item.invoice_no}</Text>
                  <Text style={styles.orderNo}>Order Ref: {item.order_no}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    isPending ? styles.statusPending : styles.statusPrinted,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isPending ? styles.statusTextPending : styles.statusTextPrinted,
                    ]}
                  >
                    {isPending ? 'PENDING' : 'PRINTED'}
                  </Text>
                </View>
              </View>

              <View style={styles.orderBody}>
                <Text style={styles.shopName}>🏪 {item.shop_name}</Text>
                <Text style={styles.routeText}>📍 Route: {item.route_name}</Text>
                <Text style={styles.execText}>
                  👤 Executive: {item.executive_name} ({item.executive_phone})
                </Text>
                <Text style={styles.dateText}>🕒 {formatDateTime(item.created_at)}</Text>
              </View>

              <View style={styles.orderFooter}>
                <View>
                  <Text style={styles.qtyLabel}>{item.total_qty} units ordered</Text>
                  <Text style={styles.grandTotal}>
                    {formatCurrency(item.grand_total)}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  {isPending && (
                    <TouchableOpacity
                      style={styles.markDoneBtn}
                      onPress={() => handleQuickMarkPrinted(item)}
                    >
                      <Text style={styles.markDoneBtnText}>✓ Mark Printed</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.viewPrintBtn}
                    onPress={() => handleOpenInvoice(item)}
                  >
                    <Text style={styles.viewPrintBtnText}>🖨️ View & Print</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* 3-Line Menu Drawer / Modal */}
      <Modal visible={menuVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Owner Menu</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Text style={styles.menuClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Inventory');
              }}
            >
              <Text style={styles.menuItemIcon}>📦</Text>
              <View>
                <Text style={styles.menuItemLabel}>Godown Inventory</Text>
                <Text style={styles.menuItemSub}>Manage categories, items & stock</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('RouteSummary');
              }}
            >
              <Text style={styles.menuItemIcon}>📋</Text>
              <View>
                <Text style={styles.menuItemLabel}>Route Summary Sheet</Text>
                <Text style={styles.menuItemSub}>Page 39 consolidated billing</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                switchRoleForDemo('executive');
              }}
            >
              <Text style={styles.menuItemIcon}>🚚</Text>
              <View>
                <Text style={styles.menuItemLabel}>Switch to Executive Mode</Text>
                <Text style={styles.menuItemSub}>Punch field orders</Text>
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
                <Text style={styles.menuItemSub}>End your owner session</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
  },
  headerCompany: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerUser: {
    color: '#BFDBFE',
    fontSize: 12,
    marginTop: 1,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  menuLine: {
    width: 20,
    height: 2.5,
    backgroundColor: '#FFFFFF',
    marginVertical: 2,
    borderRadius: 2,
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
    gap: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiTotal: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  kpiRevenue: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  kpiPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  kpiPrinted: {
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  kpiTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  summaryBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  summaryBannerIcon: {
    fontSize: 24,
  },
  summaryBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E40AF',
  },
  summaryBannerSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },
  summaryBannerArrow: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E40AF',
    paddingLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 4,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
  },
  invoiceNo: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  orderNo: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPrinted: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusTextPending: {
    color: '#B45309',
  },
  statusTextPrinted: {
    color: '#15803D',
  },
  orderBody: {
    paddingVertical: 10,
    gap: 3,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  routeText: {
    fontSize: 12,
    color: '#4B5563',
  },
  execText: {
    fontSize: 12,
    color: '#4B5563',
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 4,
  },
  qtyLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  grandTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  markDoneBtn: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  markDoneBtnText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  viewPrintBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  viewPrintBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
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
