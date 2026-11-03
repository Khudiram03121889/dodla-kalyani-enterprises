import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  Alert,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';
import { COMPANY_DETAILS } from '../../config/constants';
import { formatDateTime } from '../../utils/formatters';
import { EditOrderModal } from './EditOrderModal';
import {
  printCombinedInvoicesPdf,
  shareCombinedInvoicesPdf,
} from '../../services/printService';

type SortColumn =
  | 'srNo'
  | 'orderNo'
  | 'date'
  | 'time'
  | 'routeName'
  | 'shopName'
  | 'incharge'
  | 'salesman'
  | 'items'
  | 'amount';

export const SalesDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { routes, orders, markOrderAsPrinted, refreshData, clearAllOrders } = useStore();

  // Filter & View States
  const [selectedRouteId, setSelectedRouteId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'printed'>('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Multi-Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Edit Order Modal State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Column Search Filters State
  const [columnFilters, setColumnFilters] = useState<{
    srNo: string;
    orderNo: string;
    date: string;
    time: string;
    routeName: string;
    shopName: string;
    incharge: string;
    salesman: string;
    items: string;
    amount: string;
  }>({
    srNo: '',
    orderNo: '',
    date: '',
    time: '',
    routeName: '',
    shopName: '',
    incharge: '',
    salesman: '',
    items: '',
    amount: '',
  });

  // Column Sorting State
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

  // Filter Orders by Route, Tab Status, and Column Searches
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // 1. Route Filter
        if (selectedRouteId !== 'ALL' && o.route_id !== selectedRouteId) {
          return false;
        }
        // 2. Status Tab Filter
        if (activeTab === 'pending' && o.status !== 'pending') return false;
        if (activeTab === 'printed' && o.status !== 'printed') return false;

        // 3. Column Search Filters
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
        if (columnFilters.time && !dateStr.includes(columnFilters.time.toLowerCase())) {
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
          !(o.shop_incharge && o.shop_incharge.toLowerCase().includes(columnFilters.incharge.toLowerCase()))
        ) {
          return false;
        }

        if (
          columnFilters.salesman &&
          !o.executive_name.toLowerCase().includes(columnFilters.salesman.toLowerCase())
        ) {
          return false;
        }

        if (
          columnFilters.items &&
          !String(o.total_qty).includes(columnFilters.items.trim())
        ) {
          return false;
        }

        if (
          columnFilters.amount &&
          !String(Math.round(o.grand_total)).includes(columnFilters.amount.trim())
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a.created_at;
        let valB: any = b.created_at;

        if (sortColumn === 'orderNo') {
          const numA = parseInt(a.invoice_no, 10);
          const numB = parseInt(b.invoice_no, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            valA = numA;
            valB = numB;
          } else {
            valA = a.invoice_no;
            valB = b.invoice_no;
          }
        } else if (sortColumn === 'date' || sortColumn === 'time') {
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
        } else if (sortColumn === 'routeName') {
          valA = a.route_name;
          valB = b.route_name;
        } else if (sortColumn === 'shopName') {
          valA = a.shop_name;
          valB = b.shop_name;
        } else if (sortColumn === 'incharge') {
          valA = a.shop_incharge || '';
          valB = b.shop_incharge || '';
        } else if (sortColumn === 'salesman') {
          valA = a.executive_name;
          valB = b.executive_name;
        } else if (sortColumn === 'items') {
          valA = a.total_qty;
          valB = b.total_qty;
        } else if (sortColumn === 'amount') {
          valA = a.grand_total;
          valB = b.grand_total;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [orders, selectedRouteId, activeTab, columnFilters, sortColumn, sortAsc]);

  // Totals calculations
  const totalItemsSum = filteredOrders.reduce((sum, o) => sum + o.total_qty, 0);
  const totalAmountSum = filteredOrders.reduce((sum, o) => sum + o.grand_total, 0);

  // Selection helpers
  const allFilteredIds = filteredOrders.map((o) => o.id);
  const isAllSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedOrderIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(allFilteredIds);
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter((item) => item !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  // Combined Invoices + 39th Page Route Summary PDF Generation
  const handleGenerateCombinedPdf = async (action: 'share' | 'print') => {
    const ordersToProcess =
      selectedOrderIds.length > 0
        ? orders.filter((o) => selectedOrderIds.includes(o.id))
        : filteredOrders;

    if (ordersToProcess.length === 0) {
      Alert.alert('No Orders Selected', 'Please select at least one order to generate PDF.');
      return;
    }

    const activeRoute = routes.find((r) => r.id === selectedRouteId);
    const routeLabel = activeRoute ? activeRoute.name : 'Consolidated Routes';

    try {
      setIsGeneratingPdf(true);
      if (action === 'share') {
        await shareCombinedInvoicesPdf(ordersToProcess, routeLabel);
      } else {
        await printCombinedInvoicesPdf(ordersToProcess, routeLabel);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate combined PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleMarkSelectedAsPrinted = async () => {
    if (selectedOrderIds.length === 0) return;
    for (const id of selectedOrderIds) {
      await markOrderAsPrinted(id);
    }
    Alert.alert(
      'Updated',
      `Marked ${selectedOrderIds.length} orders as Printed.`
    );
    setSelectedOrderIds([]);
  };

  const handleOpenInvoice = (order: Order) => {
    navigation.navigate('InvoicePreview', { orderId: order.id });
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: 12 },
        ]}
      >
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

      {/* Route Selector Horizontal Pills */}
      <View style={styles.routeSelectorBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routePillsScroll}>
          <TouchableOpacity
            style={[
              styles.routePill,
              selectedRouteId === 'ALL' && styles.routePillActive,
            ]}
            onPress={() => setSelectedRouteId('ALL')}
          >
            <Text
              style={[
                styles.routePillText,
                selectedRouteId === 'ALL' && styles.routePillTextActive,
              ]}
            >
              ALL ROUTES ({orders.length})
            </Text>
          </TouchableOpacity>

          {routes.map((r) => {
            const isSelected = r.id === selectedRouteId;
            const routeCount = orders.filter((o) => o.route_id === r.id).length;
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
                  {r.name} ({routeCount})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tabs & Batch Actions Bar */}
      <View style={styles.actionBarRow}>
        <View style={styles.statusTabs}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'all' && styles.tabBtnTextActive]}>
              All ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'pending' && styles.tabBtnTextActive]}>
              Pending ({orders.filter((o) => o.status === 'pending').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'printed' && styles.tabBtnActive]}
            onPress={() => setActiveTab('printed')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'printed' && styles.tabBtnTextActive]}>
              Printed ({orders.filter((o) => o.status === 'printed').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Combined PDF / Print Trigger Button */}
        <TouchableOpacity
          style={[styles.combinedPdfBtn, isGeneratingPdf && styles.btnDisabled]}
          onPress={() => handleGenerateCombinedPdf('share')}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.combinedPdfBtnText}>
              📄 {selectedOrderIds.length > 0 ? `PDF (${selectedOrderIds.length})` : 'PDF (All)'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Multi-Select Floating Toolbar */}
      {selectedOrderIds.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>
            ✓ {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''} selected
          </Text>
          <View style={styles.selectionBtnGroup}>
            <TouchableOpacity
              style={styles.selectionActionBtn}
              onPress={() => handleGenerateCombinedPdf('print')}
            >
              <Text style={styles.selectionActionBtnText}>🖨️ Print Batch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectionActionBtn, { backgroundColor: '#10B981' }]}
              onPress={handleMarkSelectedAsPrinted}
            >
              <Text style={styles.selectionActionBtnText}>✓ Mark Printed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectionActionBtn, { backgroundColor: '#6B7280' }]}
              onPress={() => setSelectedOrderIds([])}
            >
              <Text style={styles.selectionActionBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 13-Column Spreadsheet Table Grid */}
      <ScrollView
        style={styles.gridContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1E3A8A']}
            tintColor="#1E3A8A"
          />
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.table}>
            {/* Table Header Row */}
            <View style={styles.tableHeaderRow}>
              {/* Checkbox Column */}
              <TouchableOpacity
                style={[styles.thCell, styles.colCheck]}
                onPress={toggleSelectAll}
              >
                <View style={[styles.headerCheckbox, isAllSelected && styles.checkboxChecked]}>
                  {isAllSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>

              {/* Edit Column */}
              <View style={[styles.thCell, styles.colEdit]}>
                <Text style={styles.thText}>Edit</Text>
              </View>

              {/* Sr No */}
              <TouchableOpacity
                style={[styles.thCell, styles.colSr]}
                onPress={() => handleSort('srNo')}
              >
                <Text style={styles.thText}>Sr No. {sortColumn === 'srNo' ? (sortAsc ? '▲' : '▼') : '◆'}</Text>
              </TouchableOpacity>

              {/* Invoice No */}
              <TouchableOpacity
                style={[styles.thCell, styles.colOrderNo]}
                onPress={() => handleSort('orderNo')}
              >
                <Text style={styles.thText}>Invoice No {sortColumn === 'orderNo' ? (sortAsc ? '▲' : '▼') : '◆'}</Text>
              </TouchableOpacity>

              {/* Date */}
              <TouchableOpacity
                style={[styles.thCell, styles.colDate]}
                onPress={() => handleSort('date')}
              >
                <Text style={styles.thText}>Date {sortColumn === 'date' ? (sortAsc ? '▲' : '▼') : '◆'}</Text>
              </TouchableOpacity>

              {/* Time */}
              <TouchableOpacity
                style={[styles.thCell, styles.colTime]}
                onPress={() => handleSort('time')}
              >
                <Text style={styles.thText}>Time {sortColumn === 'time' ? (sortAsc ? '▲' : '▼') : '◆'}</Text>
              </TouchableOpacity>

              {/* Route Name */}
              <TouchableOpacity
                style={[styles.thCell, styles.colRoute]}
                onPress={() => handleSort('routeName')}
              >
                <Text style={styles.thText}>Route Name {sortColumn === 'routeName' ? (sortAsc ? '▲' : '▼') : '◆'}</Text>
              </TouchableOpacity>

              {/* Shop Name */}
              <TouchableOpacity
                style={[styles.thCell, styles.colShop]}
                onPress={() => handleSort('shopName')}
              >
                <Text style={styles.thText}>Shop Name {sortColumn === 'shopName' ? (sortAsc ? '▲' : '▼') : '◆'}</Text>
              </TouchableOpacity>

              {/* Incharge */}
              <TouchableOpacity
                style={[styles.thCell, styles.colIncharge]}
                onPress={() => handleSort('incharge')}
              >
                <Text style={styles.thText}>Incharge {sortColumn === 'incharge' ? (sortAsc ? '▲' : '▼') : '◆'}</Text>
              </TouchableOpacity>

              {/* Salesman */}
              <TouchableOpacity
                style={[styles.thCell, styles.colSalesman]}
                onPress={() => handleSort('salesman')}
              >
                <Text style={styles.thText}>Salesman {sortColumn === 'salesman' ? (sortAsc ? '▲' : '▼') : '◆'}</Text>
              </TouchableOpacity>

              {/* Items */}
              <TouchableOpacity
                style={[styles.thCell, styles.colItems]}
                onPress={() => handleSort('items')}
              >
                <Text style={styles.thText}>Items {sortColumn === 'items' ? (sortAsc ? '▲' : '▼') : '◆'}</Text>
              </TouchableOpacity>

              {/* Amount */}
              <TouchableOpacity
                style={[styles.thCell, styles.colAmount]}
                onPress={() => handleSort('amount')}
              >
                <Text style={styles.thText}>Amount {sortColumn === 'amount' ? (sortAsc ? '▲' : '▼') : '◆'}</Text>
              </TouchableOpacity>

              {/* Sale Bill */}
              <View style={[styles.thCell, styles.colBill]}>
                <Text style={styles.thText}>Sale Bill</Text>
              </View>
            </View>

            {/* Column Search Filter Row */}
            <View style={styles.tableFilterRow}>
              <View style={[styles.filterCell, styles.colCheck]} />
              <View style={[styles.filterCell, styles.colEdit]} />

              <View style={[styles.filterCell, styles.colSr]}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Searc"
                  placeholderTextColor="#9CA3AF"
                  value={columnFilters.srNo}
                  onChangeText={(txt) => setColumnFilters((p) => ({ ...p, srNo: txt }))}
                />
              </View>

              <View style={[styles.filterCell, styles.colOrderNo]}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search in Inv"
                  placeholderTextColor="#9CA3AF"
                  value={columnFilters.orderNo}
                  onChangeText={(txt) => setColumnFilters((p) => ({ ...p, orderNo: txt }))}
                />
              </View>

              <View style={[styles.filterCell, styles.colDate]}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search in Date"
                  placeholderTextColor="#9CA3AF"
                  value={columnFilters.date}
                  onChangeText={(txt) => setColumnFilters((p) => ({ ...p, date: txt }))}
                />
              </View>

              <View style={[styles.filterCell, styles.colTime]}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search in Time"
                  placeholderTextColor="#9CA3AF"
                  value={columnFilters.time}
                  onChangeText={(txt) => setColumnFilters((p) => ({ ...p, time: txt }))}
                />
              </View>

              <View style={[styles.filterCell, styles.colRoute]}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search in Ro"
                  placeholderTextColor="#9CA3AF"
                  value={columnFilters.routeName}
                  onChangeText={(txt) => setColumnFilters((p) => ({ ...p, routeName: txt }))}
                />
              </View>

              <View style={[styles.filterCell, styles.colShop]}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search in Shop Name"
                  placeholderTextColor="#9CA3AF"
                  value={columnFilters.shopName}
                  onChangeText={(txt) => setColumnFilters((p) => ({ ...p, shopName: txt }))}
                />
              </View>

              <View style={[styles.filterCell, styles.colIncharge]}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search in Incharge"
                  placeholderTextColor="#9CA3AF"
                  value={columnFilters.incharge}
                  onChangeText={(txt) => setColumnFilters((p) => ({ ...p, incharge: txt }))}
                />
              </View>

              <View style={[styles.filterCell, styles.colSalesman]}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search in Sales"
                  placeholderTextColor="#9CA3AF"
                  value={columnFilters.salesman}
                  onChangeText={(txt) => setColumnFilters((p) => ({ ...p, salesman: txt }))}
                />
              </View>

              <View style={[styles.filterCell, styles.colItems]}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search it"
                  placeholderTextColor="#9CA3AF"
                  value={columnFilters.items}
                  onChangeText={(txt) => setColumnFilters((p) => ({ ...p, items: txt }))}
                />
              </View>

              <View style={[styles.filterCell, styles.colAmount]}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Searc"
                  placeholderTextColor="#9CA3AF"
                  value={columnFilters.amount}
                  onChangeText={(txt) => setColumnFilters((p) => ({ ...p, amount: txt }))}
                />
              </View>

              <View style={[styles.filterCell, styles.colBill]} />
            </View>

            {/* Table Body Rows */}
            {filteredOrders.length === 0 ? (
              <View style={styles.emptyTableBox}>
                <Text style={styles.emptyTableText}>No punched orders match your filters.</Text>
              </View>
            ) : (
              filteredOrders.map((item, index) => {
                const isSelected = selectedOrderIds.includes(item.id);
                const formattedDate = formatDateTime(item.created_at);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.tableRow,
                      index % 2 === 1 && styles.tableRowAlt,
                      isSelected && styles.tableRowSelected,
                    ]}
                    onPress={() => toggleSelectRow(item.id)}
                    activeOpacity={0.8}
                  >
                    {/* Checkbox */}
                    <View style={[styles.tdCell, styles.colCheck]}>
                      <View style={[styles.rowCheckbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </View>

                    {/* Edit Action (Pencil Icon) */}
                    <TouchableOpacity
                      style={[styles.tdCell, styles.colEdit]}
                      onPress={() => setEditingOrder(item)}
                    >
                      <Text style={styles.editIcon}>✏️</Text>
                    </TouchableOpacity>

                    {/* Sr No. */}
                    <View style={[styles.tdCell, styles.colSr]}>
                      <Text style={styles.tdText}>{index + 1}</Text>
                    </View>

                    {/* Invoice No */}
                    <View style={[styles.tdCell, styles.colOrderNo]}>
                      <Text style={[styles.tdText, styles.orderNoLink]}>
                        {item.invoice_no}
                      </Text>
                    </View>

                    {/* Date */}
                    <View style={[styles.tdCell, styles.colDate]}>
                      <Text style={styles.tdText}>{formattedDate}</Text>
                    </View>

                    {/* Time */}
                    <View style={[styles.tdCell, styles.colTime]}>
                      <Text style={styles.tdText}>{formattedDate}</Text>
                    </View>

                    {/* Route Name */}
                    <View style={[styles.tdCell, styles.colRoute]}>
                      <Text style={styles.tdText}>{item.route_name.toUpperCase()}</Text>
                    </View>

                    {/* Shop Name */}
                    <View style={[styles.tdCell, styles.colShop]}>
                      <Text style={[styles.tdText, styles.shopNameText]} numberOfLines={1}>
                        {item.shop_name.toUpperCase()}
                      </Text>
                    </View>

                    {/* Incharge */}
                    <View style={[styles.tdCell, styles.colIncharge]}>
                      <Text style={styles.tdText} numberOfLines={1}>
                        {item.shop_incharge ? item.shop_incharge.toUpperCase() : '-'}
                      </Text>
                    </View>

                    {/* Salesman */}
                    <View style={[styles.tdCell, styles.colSalesman]}>
                      <Text style={styles.tdText} numberOfLines={1}>
                        {item.executive_name}
                      </Text>
                    </View>

                    {/* Items */}
                    <View style={[styles.tdCell, styles.colItems]}>
                      <Text style={[styles.tdText, { textAlign: 'right' }]}>{item.total_qty}</Text>
                    </View>

                    {/* Amount */}
                    <View style={[styles.tdCell, styles.colAmount]}>
                      <Text style={[styles.tdText, { textAlign: 'right', fontWeight: 'bold' }]}>
                        {item.grand_total.toLocaleString('en-IN')}
                      </Text>
                    </View>

                    {/* Sale Bill (Eye Icon) */}
                    <TouchableOpacity
                      style={[styles.tdCell, styles.colBill]}
                      onPress={() => handleOpenInvoice(item)}
                    >
                      <Text style={styles.eyeIcon}>👁️</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Bottom Total Footer Row */}
            <View style={styles.tableFooterRow}>
              <View style={styles.footerLeft}>
                <Text style={styles.footerRowCount}>{filteredOrders.length} rows</Text>
              </View>

              <View style={styles.footerRight}>
                <Text style={styles.footerTotalItems}>{totalItemsSum}</Text>
                <Text style={styles.footerTotalAmount}>{totalAmountSum.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* Edit Order Modal */}
      <EditOrderModal
        visible={!!editingOrder}
        order={editingOrder}
        onClose={() => setEditingOrder(null)}
        onOrderUpdated={(updated) => {
          setEditingOrder(null);
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
                <Text style={styles.menuItemSub}>Manage categories, items &amp; stock</Text>
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
                <Text style={styles.menuItemSub}>Consolidated party bills format</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert(
                  'Clear Punched Orders',
                  'Are you sure you want to delete all punched order history? Routes, shops, and products will remain untouched.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear All Orders',
                      style: 'destructive',
                      onPress: async () => {
                        await clearAllOrders();
                        Alert.alert('Orders Cleared', 'All punched order history has been deleted.');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.menuItemIcon}>🗑️</Text>
              <View>
                <Text style={[styles.menuItemLabel, { color: '#DC2626' }]}>Clear Order History</Text>
                <Text style={styles.menuItemSub}>Delete all punched records</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

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
    </View>
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
    width: 36,
    height: 36,
  },
  headerCompany: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerUser: {
    color: '#BFDBFE',
    fontSize: 12,
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  menuLine: {
    width: 20,
    height: 2.5,
    backgroundColor: '#FFFFFF',
    marginVertical: 2,
    borderRadius: 2,
  },
  routeSelectorBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  routePillsScroll: {
    paddingHorizontal: 12,
    gap: 6,
  },
  routePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  routePillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  routePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  routePillTextActive: {
    color: '#FFFFFF',
  },
  actionBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  tabBtnActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  combinedPdfBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  combinedPdfBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  selectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  selectionBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  selectionActionBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  selectionActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  gridContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  table: {
    minWidth: 1150,
    backgroundColor: '#FFFFFF',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
  },
  tableFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    minHeight: 34,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableRowSelected: {
    backgroundColor: '#D9E8FF',
  },
  thCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  filterCell: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    justifyContent: 'center',
  },
  filterInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 3,
    fontSize: 9.5,
    paddingVertical: 1,
    paddingHorizontal: 3,
    color: '#0F172A',
    textAlign: 'center',
    height: 22,
  },
  tdCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  tdText: {
    fontSize: 10.5,
    color: '#1E293B',
    textAlign: 'center',
  },
  orderNoLink: {
    color: '#0284C7',
    fontWeight: '700',
  },
  shopNameText: {
    fontWeight: '700',
    textAlign: 'left',
  },
  editIcon: {
    fontSize: 13,
    textAlign: 'center',
  },
  eyeIcon: {
    fontSize: 13,
    textAlign: 'center',
  },
  headerCheckbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: '#64748B',
    borderRadius: 3,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  rowCheckbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderRadius: 3,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  colCheck: { width: 34, alignItems: 'center' },
  colEdit: { width: 38, alignItems: 'center' },
  colSr: { width: 50 },
  colOrderNo: { width: 95 },
  colDate: { width: 135 },
  colTime: { width: 135 },
  colRoute: { width: 105 },
  colShop: { width: 200 },
  colIncharge: { width: 110 },
  colSalesman: { width: 105 },
  colItems: { width: 50 },
  colAmount: { width: 75 },
  colBill: { width: 60, alignItems: 'center' },
  tableFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2F6',
    borderTopWidth: 1.5,
    borderTopColor: '#CBD5E1',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  footerLeft: {
    justifyContent: 'center',
  },
  footerRowCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  footerRight: {
    flexDirection: 'row',
    gap: 20,
  },
  footerTotalItems: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    width: 45,
    textAlign: 'right',
  },
  footerTotalAmount: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
    width: 70,
    textAlign: 'right',
  },
  emptyTableBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 13,
    color: '#64748B',
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
  btnDisabled: {
    opacity: 0.6,
  },
});
