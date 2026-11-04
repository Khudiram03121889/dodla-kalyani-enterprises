import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../context/StoreContext';
import { COMPANY_DETAILS } from '../../config/constants';
import { printRouteSummary, shareRouteSummaryPdf } from '../../services/printService';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

export const RouteSummaryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { routes, orders } = useStore();

  const [selectedCompany, setSelectedCompany] = useState<'ALL' | 'Dodla' | 'Gopal Chips'>('ALL');

  const displayRoutes = React.useMemo(() => {
    if (selectedCompany === 'ALL') return routes;
    return routes.filter((r) => (r.company || 'Dodla') === selectedCompany);
  }, [routes, selectedCompany]);

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    displayRoutes.length > 0 ? displayRoutes[0].id : ''
  );

  React.useEffect(() => {
    if ((!selectedRouteId || !displayRoutes.some((r) => r.id === selectedRouteId)) && displayRoutes.length > 0) {
      setSelectedRouteId(displayRoutes[0].id);
    }
  }, [displayRoutes, selectedRouteId]);

  const [isPrinting, setIsPrinting] = useState(false);

  const activeRoute = displayRoutes.find((r) => r.id === selectedRouteId) || displayRoutes[0];
  const routeOrders = orders.filter((o) => {
    if (o.route_id !== selectedRouteId) return false;
    if (selectedCompany !== 'ALL' && (o.company || 'Dodla') !== selectedCompany) return false;
    return true;
  });
  const totalAmount = routeOrders.reduce((sum, o) => sum + o.grand_total, 0);

  const handlePrint = async () => {
    if (!activeRoute) return;
    setIsPrinting(true);
    await printRouteSummary(activeRoute, orders);
    setIsPrinting(false);
  };

  const handleShare = async () => {
    if (!activeRoute) return;
    setIsPrinting(true);
    await shareRouteSummaryPdf(activeRoute, orders);
    setIsPrinting(false);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View
        style={[
          styles.topBar,
          { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: 12 },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.topTitle}>Route Summary Sheet</Text>
          <Text style={styles.topSub}>Consolidated Party Bills (Page 39 Format)</Text>
        </View>
      </View>

      {/* Company Division Tabs */}
      <View style={styles.companyDivisionBar}>
        <TouchableOpacity
          style={[
            styles.companyTabBtn,
            selectedCompany === 'ALL' && styles.companyTabBtnActive,
          ]}
          onPress={() => setSelectedCompany('ALL')}
        >
          <Text
            style={[
              styles.companyTabBtnText,
              selectedCompany === 'ALL' && styles.companyTabBtnTextActive,
            ]}
          >
            All Divisions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.companyTabBtn,
            selectedCompany === 'Dodla' && styles.companyTabBtnActiveDodla,
          ]}
          onPress={() => setSelectedCompany('Dodla')}
        >
          <Text
            style={[
              styles.companyTabBtnText,
              selectedCompany === 'Dodla' && styles.companyTabBtnTextActiveDodla,
            ]}
          >
            🔵 Dodla
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.companyTabBtn,
            selectedCompany === 'Gopal Chips' && styles.companyTabBtnActiveGopal,
          ]}
          onPress={() => setSelectedCompany('Gopal Chips')}
        >
          <Text
            style={[
              styles.companyTabBtnText,
              selectedCompany === 'Gopal Chips' && styles.companyTabBtnTextActiveGopal,
            ]}
          >
            🟠 Gopal Chips
          </Text>
        </TouchableOpacity>
      </View>

      {/* Route Selector Pills */}
      <View style={styles.routeSelector}>
        <Text style={styles.routeSelectLabel}>SELECT ROUTE:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routeScroll}>
          {displayRoutes.map((r) => {
            const isSelected = r.id === selectedRouteId;
            const count = orders.filter((o) => {
              if (o.route_id !== r.id) return false;
              if (selectedCompany !== 'ALL' && (o.company || 'Dodla') !== selectedCompany) return false;
              return true;
            }).length;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.routePill, isSelected && styles.routePillActive]}
                onPress={() => setSelectedRouteId(r.id)}
              >
                <Text
                  style={[styles.routePillText, isSelected && styles.routePillTextActive]}
                >
                  {r.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary Sheet Document Preview */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.documentCard}>
          {/* Document Header */}
          <View style={styles.docHeader}>
            <Text style={styles.companyTitle}>{COMPANY_DETAILS.name}</Text>
            <Text style={styles.docMeta}>
              <Text style={{ fontWeight: 'bold' }}>Route Name:</Text> {activeRoute?.name || 'All Routes'}
            </Text>
            <Text style={styles.docMeta}>
              <Text style={{ fontWeight: 'bold' }}>Generated On:</Text> {formatDateTime(new Date())}
            </Text>
            <Text style={styles.docMeta}>
              <Text style={{ fontWeight: 'bold' }}>Total Bills Punched:</Text> {routeOrders.length}
            </Text>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: 30 }]}>No.</Text>
            <Text style={[styles.th, { width: 90 }]}>Bill No.</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'left' }]}>Party Name & Address</Text>
            <Text style={[styles.th, { width: 80 }]}>Mobile No.</Text>
            <Text style={[styles.th, { width: 70, textAlign: 'right' }]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {routeOrders.length === 0 ? (
            <View style={styles.emptyTable}>
              <Text style={styles.emptyText}>No orders punched for {activeRoute?.name || 'this route'}.</Text>
            </View>
          ) : (
            routeOrders.map((o, idx) => (
              <View key={o.id} style={styles.tableRow}>
                <Text style={[styles.td, { width: 30, textAlign: 'center' }]}>{idx + 1}</Text>
                <Text style={[styles.td, { width: 90, fontWeight: '700' }]}>{o.invoice_no}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: 'left' }]} numberOfLines={2}>
                  <Text style={{ fontWeight: '700' }}>{o.shop_name}</Text> - {o.shop_address}
                </Text>
                <Text style={[styles.td, { width: 80, textAlign: 'center' }]}>{o.shop_phone}</Text>
                <Text style={[styles.td, { width: 70, textAlign: 'right', fontWeight: '700' }]}>
                  ₹{o.grand_total.toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          )}

          {/* Total Summary Footer Row */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL ROUTE AMOUNT:</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View
        style={[
          styles.actionFooter,
          { paddingBottom: Math.max(insets.bottom, 12) + 8 },
        ]}
      >
        <TouchableOpacity
          style={[styles.btn, styles.shareBtn]}
          onPress={handleShare}
          disabled={isPrinting || routeOrders.length === 0}
        >
          <Text style={styles.shareBtnText}>📄 Share Summary PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.printBtn, routeOrders.length === 0 && styles.btnDisabled]}
          onPress={handlePrint}
          disabled={isPrinting || routeOrders.length === 0}
        >
          <Text style={styles.printBtnText}>🖨️ Print Route Summary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  companyDivisionBar: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  companyTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  companyTabBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  companyTabBtnActiveDodla: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  companyTabBtnActiveGopal: {
    backgroundColor: '#C2410C',
    borderColor: '#C2410C',
  },
  companyTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  companyTabBtnTextActive: {
    color: '#FFFFFF',
  },
  companyTabBtnTextActiveDodla: {
    color: '#FFFFFF',
  },
  companyTabBtnTextActiveGopal: {
    color: '#FFFFFF',
  },
  backBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  topSub: {
    color: '#BFDBFE',
    fontSize: 11,
  },
  routeSelector: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  routeSelectLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
  },
  routeScroll: {
    flexDirection: 'row',
  },
  routePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  routePillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  routePillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  routePillTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 100,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  docHeader: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    paddingBottom: 8,
    marginBottom: 10,
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 12,
    color: '#222',
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  th: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  td: {
    fontSize: 10,
    color: '#111',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: -1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
  emptyTable: {
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    borderTopWidth: 0,
  },
  emptyText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 6,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  shareBtnText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13.5,
  },
  printBtn: {
    backgroundColor: '#1E3A8A',
  },
  btnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  printBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
});
