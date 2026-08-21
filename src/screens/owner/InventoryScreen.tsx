import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  Alert,
  SafeAreaView,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { CategoryManagerModal } from './CategoryManagerModal';
import { AddProductModal } from './AddProductModal';

export const InventoryScreen: React.FC = () => {
  const { categories, products, updateStock, deleteProduct, refreshData } = useStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  // Quick Restock state
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategoryId === 'ALL' || p.category_id === selectedCategoryId;
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.hsn_code && p.hsn_code.includes(q));
    });
  }, [products, selectedCategoryId, searchQuery]);

  const handleApplyRestock = async () => {
    if (!restockProduct) return;
    const num = parseInt(restockQty, 10);
    if (isNaN(num)) {
      Alert.alert('Invalid Number', 'Please enter a valid stock adjustment quantity.');
      return;
    }
    const newTotal = Math.max(0, restockProduct.stock_qty + num);
    await updateStock(restockProduct.id, newTotal);
    setRestockProduct(null);
    setRestockQty('');
    Alert.alert('Stock Updated', `Updated stock for "${restockProduct.name}" to ${newTotal} units.`);
  };

  const handleDeleteProduct = (p: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to remove "${p.name}" from Godown inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProduct(p.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Action Header */}
      <View style={styles.topActions}>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => setCategoryModalVisible(true)}
        >
          <Text style={styles.headerActionText}>📁 Manage Categories ({categories.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerActionBtn, styles.addProductBtn]}
          onPress={() => setAddProductModalVisible(true)}
        >
          <Text style={[styles.headerActionText, styles.addProductText]}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categorySection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'ALL', name: 'All Categories' }, ...categories]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategoryId === item.id;
            return (
              <TouchableOpacity
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategoryId(item.id)}
              >
                <Text
                  style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items in Godown..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Products List */}
      <View style={styles.listContainer}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>
            Godown Inventory ({filteredProducts.length} items)
          </Text>
          <Text style={styles.listHeaderSubtitle}>Uniform 5% GST Applied</Text>
        </View>

        {filteredProducts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No items in this category</Text>
            <Text style={styles.emptySub}>
              Tap "+ Add Product" above to create items in this category.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.productsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#1E3A8A']}
                tintColor="#1E3A8A"
              />
            }
            renderItem={({ item }) => {
              const matchedCat = categories.find((c) => c.id === item.category_id);
              const isLowStock = item.stock_qty <= 10;

              return (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.categoryName}>
                        {matchedCat?.name || 'Dairy'} &bull; HSN: {item.hsn_code}
                      </Text>
                    </View>

                    {/* Stock Status Badge */}
                    <View
                      style={[
                        styles.stockBadge,
                        item.stock_qty === 0
                          ? styles.stockZero
                          : isLowStock
                          ? styles.stockLow
                          : styles.stockOk,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stockBadgeText,
                          item.stock_qty === 0
                            ? styles.stockZeroText
                            : isLowStock
                            ? styles.stockLowText
                            : styles.stockOkText,
                        ]}
                      >
                        Stock: {item.stock_qty}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBottom}>
                    <View>
                      <Text style={styles.priceText}>₹{item.rate.toFixed(2)}</Text>
                      <Text style={styles.gstTag}>Rate + 5% GST</Text>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.restockBtn}
                        onPress={() => setRestockProduct(item)}
                      >
                        <Text style={styles.restockBtnText}>📦 Restock / Adjust</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteProduct(item)}
                      >
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Restock / Quick Stock Adjustment Modal */}
      {restockProduct && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.restockCard}>
              <Text style={styles.restockTitle}>Restock / Adjust Godown Stock</Text>
              <Text style={styles.restockName}>{restockProduct.name}</Text>
              <Text style={styles.restockCurrent}>
                Current Stock: <Text style={{ fontWeight: 'bold' }}>{restockProduct.stock_qty} units</Text>
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Quantity to Add or Deduct (+/-):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +50 or -10"
                  placeholderTextColor="#9CA3AF"
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                  value={restockQty}
                  onChangeText={setRestockQty}
                  autoFocus
                />
              </View>

              <View style={styles.quickAddRow}>
                <TouchableOpacity
                  style={styles.quickAddChip}
                  onPress={() => setRestockQty('+25')}
                >
                  <Text style={styles.quickAddText}>+25</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAddChip}
                  onPress={() => setRestockQty('+50')}
                >
                  <Text style={styles.quickAddText}>+50</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAddChip}
                  onPress={() => setRestockQty('+100')}
                >
                  <Text style={styles.quickAddText}>+100</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setRestockProduct(null);
                    setRestockQty('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.applyBtn} onPress={handleApplyRestock}>
                  <Text style={styles.applyBtnText}>Update Stock</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Modals */}
      <CategoryManagerModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
      />

      <AddProductModal
        visible={addProductModalVisible}
        onClose={() => setAddProductModalVisible(false)}
        defaultCategoryId={selectedCategoryId}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  topActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerActionBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  headerActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  addProductBtn: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  addProductText: {
    color: '#FFFFFF',
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  categoryPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
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
    paddingVertical: 6,
    fontSize: 13,
    color: '#111827',
  },
  clearSearch: {
    padding: 6,
  },
  clearSearchText: {
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  listHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  listHeaderSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  productsList: {
    paddingBottom: 20,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  productName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#111827',
  },
  categoryName: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stockOk: {
    backgroundColor: '#DCFCE7',
  },
  stockOkText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  stockLow: {
    backgroundColor: '#FEF3C7',
  },
  stockLowText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  stockZero: {
    backgroundColor: '#FEE2E2',
  },
  stockZeroText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  gstTag: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restockBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  restockBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  restockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  restockTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  restockName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    marginTop: 4,
  },
  restockCurrent: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickAddChip: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  quickAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 14,
  },
  applyBtn: {
    flex: 2,
    backgroundColor: '#1E3A8A',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
