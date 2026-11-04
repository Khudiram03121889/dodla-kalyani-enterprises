import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../../context/StoreContext';
import { COMPANY_DETAILS } from '../../config/constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { printRouteSummary, shareRouteSummaryPdf } from '../../services/printService';
import { Route, Order } from '../../types';

export const DesktopRouteSummaryScreen: React.FC = () => {
  const { routes, orders } = useStore();

  const [selectedCompany, setSelectedCompany] = useState<'ALL' | 'Dodla' | 'Gopal Chips'>('ALL');

  const displayRoutes = React.useMemo(() => {
    if (selectedCompany === 'ALL') return routes;
    return routes.filter((r) => (r.company || 'Dodla') === selectedCompany);
  }, [routes, selectedCompany]);

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    displayRoutes.length > 0 ? displayRoutes[0].id : ''
  );
  const [isPrinting, setIsPrinting] = useState(false);

  // Keep selection valid if routes change
  React.useEffect(() => {
    if ((!selectedRouteId || !displayRoutes.some((r) => r.id === selectedRouteId)) && displayRoutes.length > 0) {
      setSelectedRouteId(displayRoutes[0].id);
    }
  }, [displayRoutes, selectedRouteId]);

  const activeRoute = displayRoutes.find((r) => r.id === selectedRouteId) || displayRoutes[0];
  const routeOrders = orders.filter((o) => {
    if (o.route_id !== selectedRouteId) return false;
    if (selectedCompany !== 'ALL' && (o.company || 'Dodla') !== selectedCompany) return false;
    return true;
  });
  const totalAmount = routeOrders.reduce((sum, o) => sum + o.grand_total, 0);
  const totalQty = routeOrders.reduce((sum, o) => sum + o.total_qty, 0);

  // Group party items across known category headers
  const categoryNamesSet = new Set<string>();
  routeOrders.forEach((o) => {
    o.items.forEach((it) => {
      if (it.category_name) {
        categoryNamesSet.add(it.category_name);
      }
    });
  });

  const categoryHeaders = Array.from(categoryNamesSet);
  if (categoryHeaders.length === 0) {
    categoryHeaders.push('Badam Milk', 'Soan Papdi', 'Gulab Jamun', 'Doodh Pedha');
  }

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

      {/* Route Selector & Action Bar */}
      <View style={styles.toolbar}>
        <View style={styles.routePillsContainer}>
          <View style={styles.routeHeaderRow}>
            <Text style={styles.selectLabel}>SELECT ROUTE:</Text>
            {/* Quick dropdown for instant 1-click selection */}
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              style={styles.routeDropdown as any}
            >
              {displayRoutes.map((r) => {
                const count = orders.filter((o) => {
                  if (o.route_id !== r.id) return false;
                  if (selectedCompany !== 'ALL' && (o.company || 'Dodla') !== selectedCompany) return false;
                  return true;
                }).length;
                return (
                  <option key={r.id} value={r.id}>
                    {r.name} ({count} bills)
                  </option>
                );
              })}
            </select>
          </View>

          {/* Fully visible wrapping route pills - no horizontal clipping */}
          <View style={styles.pillsWrapContainer}>
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
                    style={[
                      styles.routePillText,
                      isSelected && styles.routePillTextActive,
                    ]}
                  >
                    {r.name} ({count} bills)
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.toolbarActions}>
          <TouchableOpacity
            style={styles.printBtn}
            onPress={handlePrint}
            disabled={isPrinting || !activeRoute}
          >
            {isPrinting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.btnText}>🖨️ Print Route Summary</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={handleShare}
            disabled={isPrinting || !activeRoute}
          >
            <Text style={styles.btnText}>📥 Download / Save PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary KPI Highlights */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: '#1E3A8A' }]}>
          <Text style={styles.kpiLabel}>Active Route</Text>
          <Text style={styles.kpiValue}>{activeRoute?.name || 'No Route'}</Text>
          <Text style={styles.kpiSub}>Kalyani Enterprises Distribution</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#059669' }]}>
          <Text style={styles.kpiLabel}>Total Route Bills</Text>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>
            {routeOrders.length} Invoices
          </Text>
          <Text style={styles.kpiSub}>Punched for this route</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#0284C7' }]}>
          <Text style={styles.kpiLabel}>Total Route Quantity</Text>
          <Text style={[styles.kpiValue, { color: '#0284C7' }]}>
            {totalQty} Units
          </Text>
          <Text style={styles.kpiSub}>Dispatched quantity</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B' }]}>
          <Text style={styles.kpiLabel}>Consolidated Route Value</Text>
          <Text style={[styles.kpiValue, { color: '#D97706' }]}>
            {formatCurrency(totalAmount)}
          </Text>
          <Text style={styles.kpiSub}>Total collectible</Text>
        </View>
      </View>

      {/* Consolidated Route Sheet Presentation */}
      <View style={styles.sheetCard}>
        {/* Document Title Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.docTitle}>CONSOLIDATED ROUTE SUMMARY SHEET</Text>
          <Text style={styles.companyName}>{COMPANY_DETAILS.name}</Text>
          <Text style={styles.companySub}>
            {COMPANY_DETAILS.addressLine1} {COMPANY_DETAILS.addressLine2} • Mob: {COMPANY_DETAILS.phone}
          </Text>
          <View style={styles.routeBadgeLarge}>
            <Text style={styles.routeBadgeLargeText}>
              ROUTE: {activeRoute?.name || 'ALL'} • {routeOrders.length} PARTIES
            </Text>
          </View>
        </View>

        {/* Data Table */}
        <View style={styles.tableWrapper}>
          <View style={styles.sheetThRow}>
            <Text style={[styles.sheetTh, { width: 45 }]}>Sl</Text>
            <Text style={[styles.sheetTh, { flex: 1.8 }]}>Party / Shop Name</Text>
            <Text style={[styles.sheetTh, { width: 130 }]}>Incharge & Contact</Text>
            <Text style={[styles.sheetTh, { width: 120 }]}>Bill / Inv No</Text>
            {categoryHeaders.map((cat, i) => (
              <Text
                key={i}
                style={[styles.sheetTh, { width: 90, textAlign: 'center' }]}
                numberOfLines={1}
              >
                {cat}
              </Text>
            ))}
            <Text style={[styles.sheetTh, { width: 80, textAlign: 'center' }]}>Total Qty</Text>
            <Text style={[styles.sheetTh, { width: 110, textAlign: 'right' }]}>Amount (₹)</Text>
          </View>

          {routeOrders.length === 0 ? (
            <View style={styles.emptySheet}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Orders for {activeRoute?.name}</Text>
              <Text style={styles.emptySub}>
                Punched party orders for this route will appear here in the consolidated summary.
              </Text>
            </View>
          ) : (
            routeOrders.map((ord, idx) => {
              // Map qty per category for this order
              const catQtyMap: Record<string, number> = {};
              ord.items.forEach((it) => {
                const cat = it.category_name || 'General';
                catQtyMap[cat] = (catQtyMap[cat] || 0) + it.qty;
              });

              return (
                <View
                  key={ord.id}
                  style={[styles.sheetTdRow, idx % 2 === 1 && styles.sheetTdRowAlt]}
                >
                  <Text style={[styles.sheetTdMuted, { width: 45 }]}>{idx + 1}</Text>
                  <View style={{ flex: 1.8, paddingRight: 8 }}>
                    <Text style={styles.partyName}>{ord.shop_name}</Text>
                    {ord.shop_address && (
                      <Text style={styles.partyAddr} numberOfLines={1}>
                        {ord.shop_address}
                      </Text>
                    )}
                  </View>
                  <View style={{ width: 130 }}>
                    <Text style={styles.inchargeText}>{ord.shop_incharge || '-'}</Text>
                    <Text style={styles.phoneText}>{ord.shop_phone}</Text>
                  </View>
                  <View style={{ width: 120 }}>
                    <Text style={styles.invText}>{ord.invoice_no}</Text>
                    <Text style={styles.dateText}>{formatDateTime(ord.created_at)}</Text>
                  </View>
                  {categoryHeaders.map((cat, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.sheetTd,
                        { width: 90, textAlign: 'center', fontWeight: '700' },
                      ]}
                    >
                      {catQtyMap[cat] || '-'}
                    </Text>
                  ))}
                  <Text
                    style={[
                      styles.sheetTd,
                      { width: 80, textAlign: 'center', fontWeight: '800', color: '#1E3A8A' },
                    ]}
                  >
                    {ord.total_qty}
                  </Text>
                  <Text
                    style={[
                      styles.sheetTd,
                      { width: 110, textAlign: 'right', fontWeight: '800', color: '#0F172A' },
                    ]}
                  >
                    {formatCurrency(ord.grand_total)}
                  </Text>
                </View>
              );
            })
          )}

          {/* Table Footer Totals */}
          {routeOrders.length > 0 && (
            <View style={styles.sheetFooterRow}>
              <Text style={[styles.footerLabel, { width: 45 + 130 + 120, flex: 1.8 }]}>
                ROUTE TOTAL ({routeOrders.length} PARTIES):
              </Text>
              {categoryHeaders.map((cat, i) => {
                const totalCatQty = routeOrders.reduce((sum, o) => {
                  const match = o.items.filter((it) => it.category_name === cat);
                  return sum + match.reduce((s, m) => s + m.qty, 0);
                }, 0);

                return (
                  <Text
                    key={i}
                    style={[
                      styles.footerVal,
                      { width: 90, textAlign: 'center', fontWeight: '900' },
                    ]}
                  >
                    {totalCatQty || '-'}
                  </Text>
                );
              })}
              <Text
                style={[
                  styles.footerVal,
                  { width: 80, textAlign: 'center', fontWeight: '900', color: '#1E3A8A' },
                ]}
              >
                {totalQty}
              </Text>
              <Text
                style={[
                  styles.footerGrandVal,
                  { width: 110, textAlign: 'right', fontWeight: '900', color: '#1E3A8A' },
                ]}
              >
                {formatCurrency(totalAmount)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexWrap: 'wrap',
    gap: 14,
  },
  routePillsContainer: {
    flex: 1,
    minWidth: 320,
    gap: 10,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeDropdown: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  pillsWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  routePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routePillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  routePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  routePillTextActive: {
    color: '#FFFFFF',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  printBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 6,
  },
  kpiSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 16,
    marginBottom: 16,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#1E3A8A',
  },
  companyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  companySub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  routeBadgeLarge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  routeBadgeLargeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 1000,
  },
  sheetThRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    alignItems: 'center',
  },
  sheetTh: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  sheetTdRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  sheetTdRowAlt: {
    backgroundColor: '#FBFDFE',
  },
  sheetTdMuted: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  partyAddr: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  inchargeText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  phoneText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  invText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  dateText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  sheetTd: {
    fontSize: 12,
    color: '#334155',
    paddingHorizontal: 4,
  },
  sheetFooterRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 2,
    borderTopColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },
  footerVal: {
    fontSize: 13,
    color: '#0F172A',
    paddingHorizontal: 4,
  },
  footerGrandVal: {
    fontSize: 14,
    paddingHorizontal: 4,
  },
  emptySheet: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  companyDivisionBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 16,
    borderRadius: 8,
  },
  companyTabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
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
    fontSize: 13,
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
});
