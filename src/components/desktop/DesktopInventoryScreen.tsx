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
import { useAuth } from '../../context/AuthContext';
import { Product, Category, CompanyDivision } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { CategoryManagerModal } from '../../screens/owner/CategoryManagerModal';
import { AddProductModal } from '../../screens/owner/AddProductModal';

export const DesktopInventoryScreen: React.FC = () => {
  const { user, role } = useAuth();
  const { categories, products, updateStock, deleteProduct, refreshData } = useStore();

  const isExecutive = role === 'executive';
  const executiveCompany: CompanyDivision = (user?.company as CompanyDivision) || 'Dodla';

  const [selectedCompany, setSelectedCompany] = useState<'ALL' | CompanyDivision>(
    isExecutive ? executiveCompany : 'ALL'
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockAdjustment, setRestockAdjustment] = useState('');

  // Sync executive company
  React.useEffect(() => {
    if (isExecutive) {
      setSelectedCompany(executiveCompany);
    }
  }, [isExecutive, executiveCompany]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const visibleCategories = useMemo(() => {
    if (isExecutive) {
      return categories.filter((c) => (c.company || 'Dodla') === executiveCompany);
    }
    if (selectedCompany !== 'ALL') {
      return categories.filter((c) => (c.company || 'Dodla') === selectedCompany);
    }
    return categories;
  }, [categories, isExecutive, executiveCompany, selectedCompany]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const pComp = p.company || 'Dodla';
      if (isExecutive && pComp !== executiveCompany) return false;
      if (!isExecutive && selectedCompany !== 'ALL' && pComp !== selectedCompany) return false;

      const matchCat = selectedCategoryId === 'ALL' || p.category_id === selectedCategoryId;
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const cat = categories.find((c) => c.id === p.category_id);
      return (
        p.name.toLowerCase().includes(q) ||
        (p.hsn_code && p.hsn_code.includes(q)) ||
        (cat && cat.name.toLowerCase().includes(q))
      );
    });
  }, [products, categories, isExecutive, executiveCompany, selectedCompany, selectedCategoryId, searchQuery]);

  const handleApplyRestock = async () => {
    if (!restockProduct) return;
    const num = parseInt(restockAdjustment, 10);
    if (isNaN(num)) {
      if (typeof window !== 'undefined') {
        window.alert('Please enter a valid number (e.g. +50 or -10)');
      } else {
        Alert.alert('Invalid Number', 'Please enter a valid stock adjustment quantity.');
      }
      return;
    }
    const newTotal = Math.max(0, restockProduct.stock_qty + num);
    await updateStock(restockProduct.id, newTotal);
    setRestockProduct(null);
    setRestockAdjustment('');
  };

  const handleDelete = async (p: Product) => {
    const confirmMessage = `Are you sure you want to permanently delete "${p.name}" (Current Stock: ${p.stock_qty}) from Godown inventory?`;
    if (typeof window !== 'undefined') {
      if (window.confirm(confirmMessage)) {
        try {
          await deleteProduct(p.id);
          window.alert(`Product "${p.name}" was removed successfully.`);
        } catch (err: any) {
          window.alert(err.message || 'Failed to delete product.');
        }
      }
    } else {
      Alert.alert(
        'Delete Product',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteProduct(p.id);
                Alert.alert('Deleted', `Product "${p.name}" was removed successfully.`);
              } catch (err: any) {
                Alert.alert('Cannot Delete Product', err.message || 'Failed to delete product.');
              }
            },
          },
        ]
      );
    }
  };

  // Inventory KPI counts
  const totalItems = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock_qty, 0);
  const totalStockValuation = products.reduce((sum, p) => sum + p.stock_qty * p.rate, 0);
  const lowStockCount = products.filter((p) => p.stock_qty > 0 && p.stock_qty <= 20).length;
  const outOfStockCount = products.filter((p) => p.stock_qty === 0).length;

  return (
    <View style={styles.container}>
      {/* Company Division Tabs (Owner) or Division Header (Executive) */}
      {!isExecutive ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['ALL', 'Dodla', 'Gopal Chips'] as const).map((comp) => {
            const isSelected = selectedCompany === comp;
            return (
              <TouchableOpacity
                key={comp}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isSelected
                    ? comp === 'Gopal Chips'
                      ? '#EA580C'
                      : comp === 'Dodla'
                      ? '#1E3A8A'
                      : '#1E293B'
                    : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSelected ? 'transparent' : '#CBD5E1',
                }}
                onPress={() => {
                  setSelectedCompany(comp);
                  setSelectedCategoryId('ALL');
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#FFFFFF' : '#475569' }}>
                  {comp === 'ALL' ? '🏢 All Divisions' : comp === 'Dodla' ? 'Dodla' : 'Gopal Chips'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: executiveCompany === 'Gopal Chips' ? '#C2410C' : '#1E40AF',
            }}
          >
            {executiveCompany === 'Gopal Chips' ? 'Gopal Chips Inventory Workstation' : 'Dodla Dairy Inventory Workstation'}
          </Text>
        </View>
      )}

      {/* Top Inventory Metrics */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderLeftColor: '#1E3A8A' }]}>
          <Text style={styles.kpiLabel}>Total Products</Text>
          <Text style={styles.kpiValue}>{filteredProducts.length}</Text>
          <Text style={styles.kpiSub}>Across {visibleCategories.length} categories</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#059669' }]}>
          <Text style={styles.kpiLabel}>Total Stock Units</Text>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>{filteredProducts.reduce((sum, p) => sum + p.stock_qty, 0)}</Text>
          <Text style={styles.kpiSub}>Available in Godown</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#0284C7' }]}>
          <Text style={styles.kpiLabel}>Godown Inventory Valuation</Text>
          <Text style={[styles.kpiValue, { color: '#0284C7' }]}>
            {formatCurrency(filteredProducts.reduce((sum, p) => sum + p.stock_qty * p.rate, 0))}
          </Text>
          <Text style={styles.kpiSub}>Wholesale value</Text>
        </View>

        <View style={[styles.kpiCard, { borderLeftColor: '#EF4444' }]}>
          <Text style={styles.kpiLabel}>Low / Out of Stock</Text>
          <Text style={[styles.kpiValue, { color: filteredProducts.filter((p) => p.stock_qty === 0).length > 0 ? '#DC2626' : '#D97706' }]}>
            {filteredProducts.filter((p) => p.stock_qty === 0).length} out / {filteredProducts.filter((p) => p.stock_qty > 0 && p.stock_qty <= 20).length} low
          </Text>
          <Text style={styles.kpiSub}>Requires restock</Text>
        </View>
      </View>

      {/* Action Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          {/* Category Filter Dropdown */}
          <View style={styles.categoryPills}>
            <TouchableOpacity
              style={[
                styles.categoryPill,
                selectedCategoryId === 'ALL' && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategoryId('ALL')}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategoryId === 'ALL' && styles.categoryPillTextActive,
                ]}
              >
                All Categories ({filteredProducts.length})
              </Text>
            </TouchableOpacity>

            {visibleCategories.map((c) => {
              const count = products.filter((p) => p.category_id === c.id).length;
              const isSelected = selectedCategoryId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                  onPress={() => setSelectedCategoryId(c.id)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && styles.categoryPillTextActive,
                    ]}
                  >
                    {c.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.toolbarRight}>
          {/* Search Box */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search product name or HSN..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Manage Categories */}
          <TouchableOpacity
            style={styles.categoryBtn}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text style={styles.categoryBtnText}>📁 Manage Categories ({categories.length})</Text>
          </TouchableOpacity>

          {/* Add Product */}
          <TouchableOpacity
            style={styles.addProductBtn}
            onPress={() => setAddProductModalVisible(true)}
          >
            <Text style={styles.addProductBtnText}>+ Add Product</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#1E3A8A" />
            ) : (
              <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Stock Data Table */}
      <View style={styles.tableCard}>
        <View style={styles.tableContainer}>
          {/* Header */}
          <View style={styles.thRow}>
            <Text style={[styles.th, { width: 45 }]}>#</Text>
            <Text style={[styles.th, { flex: 2 }]}>Product Name</Text>
            <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>Division</Text>
            <Text style={[styles.th, { width: 140 }]}>Category</Text>
            <Text style={[styles.th, { width: 100 }]}>HSN Code</Text>
            <Text style={[styles.th, { width: 110, textAlign: 'right' }]}>Rate (₹)</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>GST %</Text>
            <Text style={[styles.th, { width: 110, textAlign: 'center' }]}>Stock Qty</Text>
            <Text style={[styles.th, { width: 120, textAlign: 'center' }]}>Stock Status</Text>
            <Text style={[styles.th, { width: 170, textAlign: 'center' }]}>Quick Adjust</Text>
            <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>Action</Text>
          </View>

          {/* Rows */}
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyTable}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your category filter or search keywords.
              </Text>
            </View>
          ) : (
            filteredProducts.map((p, idx) => {
              const isOut = p.stock_qty === 0;
              const isLow = p.stock_qty > 0 && p.stock_qty <= 20;

              return (
                <View
                  key={p.id}
                  style={[styles.tdRow, idx % 2 === 1 && styles.tdRowAlt]}
                >
                  <Text style={[styles.tdMuted, { width: 45 }]}>{idx + 1}</Text>
                  <View style={{ flex: 2, paddingRight: 10 }}>
                    <Text style={styles.prodName}>{p.name}</Text>
                  </View>
                  <View style={{ width: 100, alignItems: 'center' }}>
                    <View
                      style={{
                        backgroundColor: (p.company || 'Dodla') === 'Gopal Chips' ? '#FFEDD5' : '#DBEAFE',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: (p.company || 'Dodla') === 'Gopal Chips' ? '#C2410C' : '#1E40AF',
                        }}
                      >
                        {p.company || 'Dodla'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tdText, { width: 140 }]} numberOfLines={1}>
                    {categories.find((c) => c.id === p.category_id)?.name || '-'}
                  </Text>
                  <Text style={[styles.tdText, { width: 100 }]}>{p.hsn_code || '-'}</Text>
                  <Text style={[styles.tdRate, { width: 110, textAlign: 'right' }]}>
                    ₹{p.rate.toFixed(2)}
                  </Text>
                  <Text style={[styles.tdText, { width: 80, textAlign: 'center' }]}>
                    {p.gst_rate}%
                  </Text>
                  <Text
                    style={[
                      styles.tdStockQty,
                      { width: 110, textAlign: 'center' },
                      isOut ? styles.stockOutText : isLow ? styles.stockLowText : null,
                    ]}
                  >
                    {p.stock_qty} units
                  </Text>
                  <View style={{ width: 120, alignItems: 'center' }}>
                    <View
                      style={[
                        styles.statusBadge,
                        isOut
                          ? styles.statusBadgeOut
                          : isLow
                          ? styles.statusBadgeLow
                          : styles.statusBadgeOk,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isOut
                            ? styles.statusTextOut
                            : isLow
                            ? styles.statusTextLow
                            : styles.statusTextOk,
                        ]}
                      >
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      width: 170,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <TouchableOpacity
                      style={styles.quickAddChip}
                      onPress={() => updateStock(p.id, p.stock_qty + 10)}
                    >
                      <Text style={styles.quickChipText}>+10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickAddChip}
                      onPress={() => updateStock(p.id, p.stock_qty + 50)}
                    >
                      <Text style={styles.quickChipText}>+50</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.restockModalTrigger}
                      onPress={() => {
                        setRestockProduct(p);
                        setRestockAdjustment('');
                      }}
                    >
                      <Text style={styles.restockTriggerText}>Custom</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: 80, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(p)}
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* Custom Restock Modal */}
      {restockProduct && (
        <Modal
          visible={!!restockProduct}
          transparent
          animationType="fade"
          onRequestClose={() => setRestockProduct(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalDialog}>
              <Text style={styles.modalTitle}>Adjust Godown Stock</Text>
              <Text style={styles.modalSub}>
                Product: <Text style={{ fontWeight: '700' }}>{restockProduct.name}</Text>
              </Text>
              <Text style={styles.modalSub}>
                Current Stock:{' '}
                <Text style={{ fontWeight: '700', color: '#1E3A8A' }}>
                  {restockProduct.stock_qty} units
                </Text>
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Quantity Adjustment (positive to add, negative to reduce):
                </Text>
                <TextInput
                  style={styles.dialogInput}
                  placeholder="e.g. +25 or -10"
                  value={restockAdjustment}
                  onChangeText={setRestockAdjustment}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              <View style={styles.dialogButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setRestockProduct(null)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleApplyRestock}>
                  <Text style={styles.confirmBtnText}>Save Stock</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Category Manager Modal */}
      {categoryModalVisible && (
        <CategoryManagerModal
          visible={categoryModalVisible}
          onClose={() => setCategoryModalVisible(false)}
          targetCompany={isExecutive ? executiveCompany : (selectedCompany === 'ALL' ? 'Dodla' : selectedCompany)}
        />
      )}

      {/* Add Product Modal */}
      {addProductModalVisible && (
        <AddProductModal
          visible={addProductModalVisible}
          onClose={() => setAddProductModalVisible(false)}
          targetCompany={isExecutive ? executiveCompany : (selectedCompany === 'ALL' ? 'Dodla' : selectedCompany)}
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
    flex: 1,
  },
  categoryPills: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    minWidth: 240,
    color: '#1E293B',
  },
  categoryBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  categoryBtnText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
  },
  addProductBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addProductBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  refreshBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableContainer: {
    minWidth: 980,
  },
  thRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  th: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
  },
  tdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdRowAlt: {
    backgroundColor: '#FBFDFE',
  },
  tdMuted: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    paddingHorizontal: 6,
  },
  prodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  tdText: {
    fontSize: 12,
    color: '#334155',
    paddingHorizontal: 6,
  },
  tdRate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 6,
  },
  tdStockQty: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    paddingHorizontal: 6,
  },
  stockOutText: {
    color: '#DC2626',
  },
  stockLowText: {
    color: '#D97706',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeOk: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeLow: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeOut: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextOk: {
    color: '#15803D',
  },
  statusTextLow: {
    color: '#B45309',
  },
  statusTextOut: {
    color: '#B91C1C',
  },
  quickAddChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  restockModalTrigger: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  restockTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
  },
  deleteBtnText: {
    fontSize: 14,
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalSub: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  inputGroup: {
    marginTop: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  dialogInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
