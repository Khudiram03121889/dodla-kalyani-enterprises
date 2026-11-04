import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../../context/StoreContext';
import { Order, Route } from '../../types';
import { COMPANY_DETAILS } from '../../config/constants';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { numberToWordsIndian } from '../../utils/taxCalculator';
import { getCategoryHsn } from '../../services/pdfGenerator';
import {
  printInvoice,
  shareInvoicePdf,
  printCombinedInvoicesPdf,
  shareCombinedInvoicesPdf,
} from '../../services/printService';
import { EditOrderModal } from '../../screens/owner/EditOrderModal';
import { SalesAnalyticsSection } from './analytics/SalesAnalyticsSection';

type SortColumn =
  | 'srNo'
  | 'orderNo'
  | 'date'
  | 'routeName'
  | 'shopName'
  | 'incharge'
  | 'salesman'
  | 'items'
  | 'amount';

export const DesktopSalesDashboard: React.FC = () => {
  const { routes, orders, categories, products, shops, markOrderAsPrinted, refreshData, clearAllOrders } = useStore();

  const [selectedCompany, setSelectedCompany] = useState<'ALL' | 'Dodla' | 'Gopal Chips'>('ALL');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'printed'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Modals
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Column Filters
  const [columnFilters, setColumnFilters] = useState({
    orderNo: '',
    date: '',
    routeName: '',
    shopName: '',
    incharge: '',
    salesman: '',
    items: '',
    amount: '',
  });

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>('srNo');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(col);
      setSortAsc(true);
    }
  };

  const companyScopedOrders = useMemo(() => {
    if (selectedCompany === 'ALL') return orders;
    return orders.filter((o) => (o.company || 'Dodla') === selectedCompany);
  }, [orders, selectedCompany]);

  const displayRoutes = useMemo(() => {
    if (selectedCompany === 'ALL') return routes;
    return routes.filter((r) => (r.company || 'Dodla') === selectedCompany);
  }, [routes, selectedCompany]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalOrders = companyScopedOrders.length;
    const totalRevenue = companyScopedOrders.reduce((sum, o) => sum + o.grand_total, 0);
    const pendingOrders = companyScopedOrders.filter((o) => o.status === 'pending').length;
    const printedOrders = companyScopedOrders.filter((o) => o.status === 'printed').length;
    return { totalOrders, totalRevenue, pendingOrders, printedOrders };
  }, [companyScopedOrders]);

  // Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => {
      if (selectedCompany !== 'ALL' && (o.company || 'Dodla') !== selectedCompany) return false;
      if (selectedRouteId !== 'ALL' && o.route_id !== selectedRouteId) return false;
      if (activeTab === 'pending' && o.status !== 'pending') return false;
      if (activeTab === 'printed' && o.status !== 'printed') return false;

      if (
        columnFilters.orderNo &&
        !o.invoice_no.toLowerCase().includes(columnFilters.orderNo.toLowerCase()) &&
        !o.order_no.toLowerCase().includes(columnFilters.orderNo.toLowerCase())
      ) {
        return false;
      }

      const dateStr = formatDateTime(o.created_at).toLowerCase();
      if (columnFilters.date && !dateStr.includes(columnFilters.date.toLowerCase())) {
        return false;
      }

      if (
        columnFilters.routeName &&
        !o.route_name.toLowerCase().includes(columnFilters.routeName.toLowerCase())
      ) {
        return false;
      }

      if (
        columnFilters.shopName &&
        !o.shop_name.toLowerCase().includes(columnFilters.shopName.toLowerCase())
      ) {
        return false;
      }

      if (
        columnFilters.incharge &&
        (!o.shop_incharge ||
          !o.shop_incharge.toLowerCase().includes(columnFilters.incharge.toLowerCase()))
      ) {
        return false;
      }

      if (
        columnFilters.salesman &&
        !o.executive_name.toLowerCase().includes(columnFilters.salesman.toLowerCase())
      ) {
        return false;
      }

      if (columnFilters.items) {
        const itemMatch = o.items.some((it) =>
          it.product_name.toLowerCase().includes(columnFilters.items.toLowerCase())
        );
        if (!itemMatch) return false;
      }

      if (columnFilters.amount && !o.grand_total.toString().includes(columnFilters.amount)) {
        return false;
      }

      return true;
    });

    result.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortColumn) {
        case 'orderNo':
          valA = a.invoice_no;
          valB = b.invoice_no;
          break;
        case 'date':
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
          break;
        case 'routeName':
          valA = a.route_name;
          valB = b.route_name;
          break;
        case 'shopName':
          valA = a.shop_name;
          valB = b.shop_name;
          break;
        case 'incharge':
          valA = a.shop_incharge || '';
          valB = b.shop_incharge || '';
          break;
        case 'salesman':
          valA = a.executive_name;
          valB = b.executive_name;
          break;
        case 'items':
          valA = a.total_qty;
          valB = b.total_qty;
          break;
        case 'amount':
          valA = a.grand_total;
          valB = b.grand_total;
          break;
        case 'srNo':
        default:
          valA = new Date(b.created_at).getTime();
          valB = new Date(a.created_at).getTime();
          return sortAsc ? valA - valB : valB - valA;
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [orders, selectedCompany, selectedRouteId, activeTab, columnFilters, sortColumn, sortAsc]);

  // Multi-Selection Handlers
  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleBatchPrint = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsGeneratingPdf(true);
    const targetOrders = orders.filter((o) => selectedOrderIds.includes(o.id));
    await printCombinedInvoicesPdf(targetOrders);
    for (const ord of targetOrders) {
      if (ord.status !== 'printed') {
        await markOrderAsPrinted(ord.id);
      }
    }
    setIsGeneratingPdf(false);
  };

  const handleBatchExport = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsGeneratingPdf(true);
    const targetOrders = orders.filter((o) => selectedOrderIds.includes(o.id));
    await shareCombinedInvoicesPdf(targetOrders);
    for (const ord of targetOrders) {
      if (ord.status !== 'printed') {
        await markOrderAsPrinted(ord.id);
      }
    }
    setIsGeneratingPdf(false);
  };

  const handleClearOrders = () => {
    if (typeof window !== 'undefined') {
      if (
        window.confirm(
          'Are you sure you want to clear all orders? This will remove orders from the database.'
        )
      ) {
        clearAllOrders();
      }
    } else {
      Alert.alert(
        'Clear All Orders',
        'Are you sure you want to permanently clear all orders?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear All', style: 'destructive', onPress: clearAllOrders },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Company Division Filter Tabs */}
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
            All Bills ({orders.length})
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
            🔵 Dodla Bills ({orders.filter((o) => (o.company || 'Dodla') === 'Dodla').length})
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
            🟠 Gopal Chips Bills ({orders.filter((o) => o.company === 'Gopal Chips').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top KPI Summary Cards */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: '#1E3A8A' }]}>
          <Text style={styles.kpiLabel}>Total Orders</Text>
          <Text style={styles.kpiValue}>{kpis.totalOrders}</Text>
          <Text style={styles.kpiSub}>All punched bills</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#10B981' }]}>
          <Text style={styles.kpiLabel}>Total Sales Revenue</Text>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>
            {formatCurrency(kpis.totalRevenue)}
          </Text>
          <Text style={styles.kpiSub}>Cumulative value</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B' }]}>
          <Text style={styles.kpiLabel}>Pending Bills</Text>
          <Text style={[styles.kpiValue, { color: '#D97706' }]}>
            {kpis.pendingOrders}
          </Text>
          <Text style={styles.kpiSub}>Awaiting printing / delivery</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#3B82F6' }]}>
          <Text style={styles.kpiLabel}>Printed & Dispatched</Text>
          <Text style={[styles.kpiValue, { color: '#2563EB' }]}>
            {kpis.printedOrders}
          </Text>
          <Text style={styles.kpiSub}>Invoices generated</Text>
        </View>
      </View>

      {/* Visual Business Analytics & Performance Charts */}
      <SalesAnalyticsSection
        orders={companyScopedOrders}
        routes={displayRoutes}
        categories={categories}
        products={products}
        shops={shops}
        selectedRouteId={selectedRouteId}
        onSelectRoute={(rId) => setSelectedRouteId(rId)}
        selectedShopFilter={columnFilters.shopName}
        onSelectShop={(sName) => setColumnFilters((prev) => ({ ...prev, shopName: sName }))}
      />

      {/* Action Toolbar */}
      <View style={styles.toolbar}>
        {/* Left: Route Picker & Status Tabs */}
        <View style={styles.toolbarLeft}>
          {/* Status Tabs */}
          <View style={styles.tabGroup}>
            <TouchableOpacity
              style={[styles.statusTab, activeTab === 'all' && styles.statusTabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text
                style={[
                  styles.statusTabText,
                  activeTab === 'all' && styles.statusTabTextActive,
                ]}
              >
                All ({companyScopedOrders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusTab, activeTab === 'pending' && styles.statusTabActive]}
              onPress={() => setActiveTab('pending')}
            >
              <Text
                style={[
                  styles.statusTabText,
                  activeTab === 'pending' && styles.statusTabTextActive,
                ]}
              >
                Pending ({kpis.pendingOrders})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusTab, activeTab === 'printed' && styles.statusTabActive]}
              onPress={() => setActiveTab('printed')}
            >
              <Text
                style={[
                  styles.statusTabText,
                  activeTab === 'printed' && styles.statusTabTextActive,
                ]}
              >
                Printed ({kpis.printedOrders})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Route Filter Dropdown / Selector */}
          <View style={styles.routeSelector}>
            <Text style={styles.filterLabel}>Route:</Text>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              style={styles.nativeSelect as any}
            >
              <option value="ALL">All Routes ({displayRoutes.length})</option>
              {displayRoutes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </View>
        </View>

        {/* Right: Batch Actions & Refresh */}
        <View style={styles.toolbarRight}>
          {selectedOrderIds.length > 0 && (
            <View style={styles.batchActions}>
              <TouchableOpacity
                style={styles.batchPrintBtn}
                onPress={handleBatchPrint}
                disabled={isGeneratingPdf}
              >
                <Text style={styles.batchBtnText}>
                  🖨️ Print Selected ({selectedOrderIds.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.batchExportBtn}
                onPress={handleBatchExport}
                disabled={isGeneratingPdf}
              >
                <Text style={styles.batchBtnText}>
                  📥 Export PDF ({selectedOrderIds.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#1E3A8A" />
            ) : (
              <Text style={styles.refreshBtnText}>🔄 Refresh Data</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearBtn} onPress={handleClearOrders}>
            <Text style={styles.clearBtnText}>🗑️ Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Desktop Data Table */}
      <View style={styles.tableCard}>
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <View style={[styles.thCell, { width: 45 }]}>
              <input
                type="checkbox"
                checked={
                  filteredOrders.length > 0 &&
                  selectedOrderIds.length === filteredOrders.length
                }
                onChange={handleSelectAll}
                style={{ cursor: 'pointer' }}
              />
            </View>
            <TouchableOpacity
              style={[styles.thCell, { width: 50 }]}
              onPress={() => handleSort('srNo')}
            >
              <Text style={styles.thText}>Sr {sortColumn === 'srNo' ? (sortAsc ? '▲' : '▼') : ''}</Text>
            </TouchableOpacity>
            <View style={[styles.thCell, { width: 95, justifyContent: 'center' }]}>
              <Text style={styles.thText}>Division</Text>
            </View>
            <TouchableOpacity
              style={[styles.thCell, { width: 140 }]}
              onPress={() => handleSort('orderNo')}
            >
              <Text style={styles.thText}>Invoice No {sortColumn === 'orderNo' ? (sortAsc ? '▲' : '▼') : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.thCell, { width: 130 }]}
              onPress={() => handleSort('date')}
            >
              <Text style={styles.thText}>Date & Time {sortColumn === 'date' ? (sortAsc ? '▲' : '▼') : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.thCell, { width: 130 }]}
              onPress={() => handleSort('routeName')}
            >
              <Text style={styles.thText}>Route {sortColumn === 'routeName' ? (sortAsc ? '▲' : '▼') : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.thCell, { flex: 1.5, minWidth: 160 }]}
              onPress={() => handleSort('shopName')}
            >
              <Text style={styles.thText}>Party / Shop Name {sortColumn === 'shopName' ? (sortAsc ? '▲' : '▼') : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.thCell, { width: 110 }]}
              onPress={() => handleSort('incharge')}
            >
              <Text style={styles.thText}>Incharge {sortColumn === 'incharge' ? (sortAsc ? '▲' : '▼') : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.thCell, { width: 110 }]}
              onPress={() => handleSort('salesman')}
            >
              <Text style={styles.thText}>Executive {sortColumn === 'salesman' ? (sortAsc ? '▲' : '▼') : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.thCell, { flex: 1.2, minWidth: 140 }]}
              onPress={() => handleSort('items')}
            >
              <Text style={styles.thText}>Items & Qty {sortColumn === 'items' ? (sortAsc ? '▲' : '▼') : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.thCell, { width: 110, justifyContent: 'flex-end' }]}
              onPress={() => handleSort('amount')}
            >
              <Text style={[styles.thText, { textAlign: 'right' }]}>
                Total (₹) {sortColumn === 'amount' ? (sortAsc ? '▲' : '▼') : ''}
              </Text>
            </TouchableOpacity>
            <View style={[styles.thCell, { width: 90, justifyContent: 'center' }]}>
              <Text style={styles.thText}>Status</Text>
            </View>
            <View style={[styles.thCell, { width: 130, justifyContent: 'center' }]}>
              <Text style={styles.thText}>Actions</Text>
            </View>
          </View>

          {/* Search Inputs Row */}
          <View style={styles.searchFilterRow}>
            <View style={[styles.searchCell, { width: 45 }]} />
            <View style={[styles.searchCell, { width: 50 }]} />
            <View style={[styles.searchCell, { width: 95 }]} />
            <View style={[styles.searchCell, { width: 140 }]}>
              <TextInput
                style={styles.columnSearchInput}
                placeholder="Search..."
                value={columnFilters.orderNo}
                onChangeText={(t) => setColumnFilters((p) => ({ ...p, orderNo: t }))}
              />
            </View>
            <View style={[styles.searchCell, { width: 130 }]}>
              <TextInput
                style={styles.columnSearchInput}
                placeholder="Date..."
                value={columnFilters.date}
                onChangeText={(t) => setColumnFilters((p) => ({ ...p, date: t }))}
              />
            </View>
            <View style={[styles.searchCell, { width: 130 }]}>
              <TextInput
                style={styles.columnSearchInput}
                placeholder="Route..."
                value={columnFilters.routeName}
                onChangeText={(t) => setColumnFilters((p) => ({ ...p, routeName: t }))}
              />
            </View>
            <View style={[styles.searchCell, { flex: 1.5, minWidth: 160 }]}>
              <TextInput
                style={styles.columnSearchInput}
                placeholder="Search Shop..."
                value={columnFilters.shopName}
                onChangeText={(t) => setColumnFilters((p) => ({ ...p, shopName: t }))}
              />
            </View>
            <View style={[styles.searchCell, { width: 110 }]}>
              <TextInput
                style={styles.columnSearchInput}
                placeholder="Incharge..."
                value={columnFilters.incharge}
                onChangeText={(t) => setColumnFilters((p) => ({ ...p, incharge: t }))}
              />
            </View>
            <View style={[styles.searchCell, { width: 110 }]}>
              <TextInput
                style={styles.columnSearchInput}
                placeholder="Exec..."
                value={columnFilters.salesman}
                onChangeText={(t) => setColumnFilters((p) => ({ ...p, salesman: t }))}
              />
            </View>
            <View style={[styles.searchCell, { flex: 1.2, minWidth: 140 }]}>
              <TextInput
                style={styles.columnSearchInput}
                placeholder="Item..."
                value={columnFilters.items}
                onChangeText={(t) => setColumnFilters((p) => ({ ...p, items: t }))}
              />
            </View>
            <View style={[styles.searchCell, { width: 110 }]}>
              <TextInput
                style={[styles.columnSearchInput, { textAlign: 'right' }]}
                placeholder="Amt..."
                value={columnFilters.amount}
                onChangeText={(t) => setColumnFilters((p) => ({ ...p, amount: t }))}
              />
            </View>
            <View style={[styles.searchCell, { width: 90 }]} />
            <View style={[styles.searchCell, { width: 130 }]} />
          </View>

          {/* Table Body */}
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyTable}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No Invoices Found</Text>
              <Text style={styles.emptySub}>
                No orders match your selected filters or routes.
              </Text>
            </View>
          ) : (
            filteredOrders.map((ord, idx) => {
              const isSelected = selectedOrderIds.includes(ord.id);
              const isPending = ord.status === 'pending';

              return (
                <View
                  key={ord.id}
                  style={[
                    styles.tableRow,
                    idx % 2 === 1 && styles.tableRowAlt,
                    isSelected && styles.tableRowSelected,
                  ]}
                >
                  <View style={[styles.tdCell, { width: 45 }]}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOrder(ord.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </View>
                  <View style={[styles.tdCell, { width: 50 }]}>
                    <Text style={styles.tdMuted}>{idx + 1}</Text>
                  </View>
                  <View style={[styles.tdCell, { width: 95, alignItems: 'center', justifyContent: 'center' }]}>
                    <View
                      style={[
                        styles.companyBadge,
                        ord.company === 'Gopal Chips'
                          ? styles.companyBadgeGopal
                          : styles.companyBadgeDodla,
                      ]}
                    >
                      <Text
                        style={[
                          styles.companyBadgeText,
                          ord.company === 'Gopal Chips'
                            ? styles.companyBadgeTextGopal
                            : styles.companyBadgeTextDodla,
                        ]}
                      >
                        {ord.company === 'Gopal Chips' ? 'Gopal' : 'Dodla'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tdCell, { width: 140 }]}>
                    <Text style={styles.tdInvoiceNo}>{ord.invoice_no}</Text>
                    <Text style={styles.tdSub}>{ord.order_no}</Text>
                  </View>
                  <View style={[styles.tdCell, { width: 130 }]}>
                    <Text style={styles.tdText}>{formatDateTime(ord.created_at)}</Text>
                  </View>
                  <View style={[styles.tdCell, { width: 130 }]}>
                    <View style={styles.routeBadge}>
                      <Text style={styles.routeBadgeText} numberOfLines={1}>
                        {ord.route_name}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tdCell, { flex: 1.5, minWidth: 160 }]}>
                    <Text style={styles.tdShopName} numberOfLines={1}>
                      {ord.shop_name}
                    </Text>
                    {ord.shop_address && (
                      <Text style={styles.tdSub} numberOfLines={1}>
                        {ord.shop_address}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.tdCell, { width: 110 }]}>
                    <Text style={styles.tdText} numberOfLines={1}>
                      {ord.shop_incharge || '-'}
                    </Text>
                  </View>
                  <View style={[styles.tdCell, { width: 110 }]}>
                    <Text style={styles.tdText} numberOfLines={1}>
                      {ord.executive_name}
                    </Text>
                  </View>
                  <View style={[styles.tdCell, { flex: 1.2, minWidth: 140 }]}>
                    <Text style={styles.tdItemsText} numberOfLines={2}>
                      {ord.items.map((it) => `${it.product_name} (${it.qty})`).join(', ')}
                    </Text>
                    <Text style={styles.tdSub}>{ord.total_qty} total items</Text>
                  </View>
                  <View style={[styles.tdCell, { width: 110, justifyContent: 'flex-end' }]}>
                    <Text style={styles.tdAmount}>
                      {formatCurrency(ord.grand_total)}
                    </Text>
                  </View>
                  <View style={[styles.tdCell, { width: 90, justifyContent: 'center' }]}>
                    <View
                      style={[
                        styles.statusBadge,
                        isPending ? styles.statusBadgePending : styles.statusBadgePrinted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isPending
                            ? styles.statusBadgeTextPending
                            : styles.statusBadgeTextPrinted,
                        ]}
                      >
                        {isPending ? 'Pending' : 'Printed'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tdCell, { width: 130, justifyContent: 'center', gap: 6 }]}>
                    <TouchableOpacity
                      style={styles.actionViewBtn}
                      onPress={() => setPreviewOrder(ord)}
                    >
                      <Text style={styles.actionBtnText}>👁️ View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionEditBtn}
                      onPress={() => setEditingOrder(ord)}
                    >
                      <Text style={styles.actionBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* Desktop Invoice Preview Modal */}
      {previewOrder && (
        <Modal
          visible={!!previewOrder}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewOrder(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.invoiceModalContent}>
              {/* Modal Header */}
              <View style={styles.invoiceModalHeader}>
                <View>
                  <Text style={styles.invoiceModalTitle}>
                    Tax Invoice Preview - {previewOrder.invoice_no}
                  </Text>
                  <Text style={styles.invoiceModalSub}>
                    {previewOrder.shop_name} • {previewOrder.route_name}
                  </Text>
                </View>
                <View style={styles.modalHeaderActions}>
                  <TouchableOpacity
                    style={styles.printActionBtn}
                    onPress={async () => {
                      await printInvoice(previewOrder);
                      if (previewOrder.status !== 'printed') {
                        await markOrderAsPrinted(previewOrder.id);
                      }
                    }}
                  >
                    <Text style={styles.printActionBtnText}>🖨️ Print Invoice</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.downloadActionBtn}
                    onPress={async () => {
                      await shareInvoicePdf(previewOrder);
                      if (previewOrder.status !== 'printed') {
                        await markOrderAsPrinted(previewOrder.id);
                      }
                    }}
                  >
                    <Text style={styles.downloadActionBtnText}>📥 Download PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setPreviewOrder(null)}
                  >
                    <Text style={styles.modalCloseBtnText}>✕ Close</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Invoice Sheet Presentation */}
              <ScrollView style={styles.invoiceScrollBody} contentContainerStyle={{ padding: 20 }}>
                <View style={styles.a5SheetPreview}>
                  {/* Header */}
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetDocTitle}>TAX INVOICE</Text>
                    <Text style={styles.sheetCompanyName}>{COMPANY_DETAILS.name}</Text>
                    <Text style={styles.sheetCompanySub}>
                      {COMPANY_DETAILS.addressLine1} {COMPANY_DETAILS.addressLine2} • Mob: {COMPANY_DETAILS.phone}
                    </Text>
                    <Text style={styles.sheetGstin}>
                      GSTIN: {COMPANY_DETAILS.gstin} | FSSAI: {COMPANY_DETAILS.fssai}
                    </Text>
                  </View>

                  {/* Metadata Row */}
                  <View style={styles.sheetMetaRow}>
                    <View style={styles.metaLeft}>
                      <Text style={styles.metaLabel}>
                        <Text style={{ fontWeight: '700' }}>Invoice No: </Text>
                        {previewOrder.invoice_no}
                      </Text>
                      <Text style={styles.metaLabel}>
                        <Text style={{ fontWeight: '700' }}>Date & Time: </Text>
                        {formatDateTime(previewOrder.created_at)}
                      </Text>
                      <Text style={styles.metaLabel}>
                        <Text style={{ fontWeight: '700' }}>Route: </Text>
                        {previewOrder.route_name}
                      </Text>
                    </View>
                    <View style={styles.metaRight}>
                      <Text style={styles.metaLabel}>
                        <Text style={{ fontWeight: '700' }}>Party Name: </Text>
                        {previewOrder.shop_name}
                      </Text>
                      <Text style={styles.metaLabel}>
                        <Text style={{ fontWeight: '700' }}>Incharge: </Text>
                        {previewOrder.shop_incharge || '-'} ({previewOrder.shop_phone})
                      </Text>
                      <Text style={styles.metaLabel}>
                        <Text style={{ fontWeight: '700' }}>Address: </Text>
                        {previewOrder.shop_address}
                      </Text>
                    </View>
                  </View>

                  {/* Items Table */}
                  <View style={styles.sheetTable}>
                    <View style={styles.sheetThRow}>
                      <Text style={[styles.sheetTh, { width: 35 }]}>#</Text>
                      <Text style={[styles.sheetTh, { flex: 2 }]}>Product Description</Text>
                      <Text style={[styles.sheetTh, { width: 50, textAlign: 'center' }]}>Qty</Text>
                      <Text style={[styles.sheetTh, { width: 70, textAlign: 'right' }]}>Rate (₹)</Text>
                      <Text style={[styles.sheetTh, { width: 70, textAlign: 'right' }]}>Taxable</Text>
                      <Text style={[styles.sheetTh, { width: 45, textAlign: 'center' }]}>GST%</Text>
                      <Text style={[styles.sheetTh, { width: 60, textAlign: 'right' }]}>GST Amt</Text>
                      <Text style={[styles.sheetTh, { width: 80, textAlign: 'right' }]}>Total (₹)</Text>
                    </View>
                    {previewOrder.items.map((it, i) => (
                      <View key={i} style={styles.sheetTdRow}>
                        <Text style={[styles.sheetTd, { width: 35 }]}>{i + 1}</Text>
                        <Text style={[styles.sheetTd, { flex: 2, fontWeight: '600' }]}>
                          {it.product_name} ({it.hsn_code || getCategoryHsn(it.category_name)})
                        </Text>
                        <Text style={[styles.sheetTd, { width: 50, textAlign: 'center' }]}>{it.qty}</Text>
                        <Text style={[styles.sheetTd, { width: 70, textAlign: 'right' }]}>{it.rate.toFixed(2)}</Text>
                        <Text style={[styles.sheetTd, { width: 70, textAlign: 'right' }]}>{it.taxable_amount.toFixed(2)}</Text>
                        <Text style={[styles.sheetTd, { width: 45, textAlign: 'center' }]}>{it.gst_rate}%</Text>
                        <Text style={[styles.sheetTd, { width: 60, textAlign: 'right' }]}>{it.gst_amount.toFixed(2)}</Text>
                        <Text style={[styles.sheetTd, { width: 80, textAlign: 'right', fontWeight: '700' }]}>
                          {it.total_amount.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Calculations & Total */}
                  <View style={styles.sheetTotals}>
                    <View style={styles.wordsBox}>
                      <Text style={styles.wordsLabel}>Amount in Words:</Text>
                      <Text style={styles.wordsText}>
                        {numberToWordsIndian(previewOrder.grand_total)}
                      </Text>
                      <View style={{ marginTop: 12 }}>
                        <Text style={styles.termsHeading}>Terms & Conditions:</Text>
                        <Text style={styles.termsText}>• Check out the goods.</Text>
                        <Text style={styles.termsText}>• Tax payable on RCM basis: NO.</Text>
                        <Text style={styles.termsText}>• Subject to BALLARI city Jurisdiction.</Text>
                      </View>
                    </View>

                    <View style={styles.calcBox}>
                      <View style={styles.calcLine}>
                        <Text style={styles.calcLabel}>Total Quantity:</Text>
                        <Text style={styles.calcVal}>{previewOrder.total_qty} units</Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={styles.calcLabel}>Taxable Subtotal:</Text>
                        <Text style={styles.calcVal}>₹{previewOrder.taxable_amount.toFixed(2)}</Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={styles.calcLabel}>CGST (2.5%):</Text>
                        <Text style={styles.calcVal}>₹{previewOrder.cgst_amount.toFixed(2)}</Text>
                      </View>
                      <View style={styles.calcLine}>
                        <Text style={styles.calcLabel}>SGST (2.5%):</Text>
                        <Text style={styles.calcVal}>₹{previewOrder.sgst_amount.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.calcLine, styles.grandLine]}>
                        <Text style={styles.grandLabel}>Grand Total:</Text>
                        <Text style={styles.grandVal}>
                          {formatCurrency(previewOrder.grand_total)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Desktop Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          visible={!!editingOrder}
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 20,
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
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 6,
  },
  kpiSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  tabGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  statusTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statusTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  statusTabTextActive: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  routeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  nativeSelect: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    cursor: 'pointer',
  } as any,
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  batchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchPrintBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  batchExportBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  batchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  refreshBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '700',
  },
  clearBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  tableContainer: {
    minWidth: 1100,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  thCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  thText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#FAFCFE',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  searchCell: {
    paddingHorizontal: 4,
  },
  columnSearchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    color: '#1E293B',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FBFDFE',
  },
  tableRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  tdCell: {
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  tdMuted: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tdInvoiceNo: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  tdShopName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  tdText: {
    fontSize: 12,
    color: '#334155',
  },
  tdSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tdItemsText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
  },
  tdAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  routeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  routeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'center',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgePrinted: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextPending: {
    color: '#B45309',
  },
  statusBadgeTextPrinted: {
    color: '#15803D',
  },
  actionViewBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionEditBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  emptyTable: {
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  invoiceModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 900,
    maxHeight: '90vh' as any,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  invoiceModalHeader: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  invoiceModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  invoiceModalSub: {
    fontSize: 12,
    color: '#93C5FD',
    marginTop: 2,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  printActionBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  printActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  downloadActionBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  invoiceScrollBody: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  a5SheetPreview: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 24,
    maxWidth: 780,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 12,
  },
  sheetDocTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#1E3A8A',
  },
  sheetCompanyName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  sheetCompanySub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  sheetGstin: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 2,
  },
  sheetMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  metaLeft: {
    flex: 1,
    gap: 4,
  },
  metaRight: {
    flex: 1,
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: '#334155',
  },
  sheetTable: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sheetThRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  sheetTh: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  sheetTdRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  sheetTd: {
    fontSize: 11,
    color: '#1E293B',
  },
  sheetTotals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 20,
  },
  wordsBox: {
    flex: 1.2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  wordsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  wordsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
  },
  termsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  termsText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  calcBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  calcLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  calcVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  grandLine: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 8,
    marginTop: 4,
  },
  grandLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  grandVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E3A8A',
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
  companyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  companyBadgeDodla: {
    backgroundColor: '#DBEAFE',
  },
  companyBadgeGopal: {
    backgroundColor: '#FFEDD5',
  },
  companyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  companyBadgeTextDodla: {
    color: '#1E40AF',
  },
  companyBadgeTextGopal: {
    color: '#9A3412',
  },
});
