import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { Shop, Product, Order } from '../../types';
import { calculateOrderTax } from '../../utils/taxCalculator';
import { formatCurrency } from '../../utils/formatters';

export const PunchOrderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { categories, products, punchOrder } = useStore();

  const { shop, routeId, routeName } = route.params as {
    shop: Shop;
    routeId: string;
    routeName: string;
  };

  // State: selected category filter (or 'ALL')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  // Map of productId -> order quantity
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [isPunching, setIsPunching] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category_id === selectedCategory;
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.hsn_code && p.hsn_code.includes(q));
    });
  }, [products, selectedCategory, searchQuery]);

  // Live order calculations
  const orderSummary = useMemo(() => {
    const activeItems = Object.entries(orderQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const prod = products.find((p) => p.id === productId);
        return {
          qty,
          rate: prod?.rate || 0,
          gstRate: prod?.gst_rate || 5.0,
        };
      });

    return calculateOrderTax(activeItems);
  }, [orderQuantities, products]);

  const handleQuantityChange = (product: Product, newQty: number) => {
    const clampedQty = Math.max(0, newQty);

    // CRITICAL ENFORCEMENT: Order quantity cannot exceed Godown stock
    if (clampedQty > product.stock_qty) {
      Alert.alert(
        'Stock Limit Reached',
        `Cannot order ${clampedQty} units of "${product.name}".\n\nOnly ${product.stock_qty} units are currently available in the Godown.`
      );
      setOrderQuantities((prev) => ({
        ...prev,
        [product.id]: product.stock_qty,
      }));
      return;
    }

    setOrderQuantities((prev) => ({
      ...prev,
      [product.id]: clampedQty,
    }));
  };

  const handlePunch = async () => {
    const itemsToPunch = Object.entries(orderQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId)!;
        return { product, qty };
      });

    if (itemsToPunch.length === 0) {
      Alert.alert('Empty Order', 'Please enter quantity for at least one item before punching.');
      return;
    }

    // Verify stock one more time before submitting
    for (const item of itemsToPunch) {
      if (item.qty > item.product.stock_qty) {
        Alert.alert(
          'Stock Violation',
          `Cannot punch order. "${item.product.name}" quantity (${item.qty}) exceeds available stock (${item.product.stock_qty}).`
        );
        return;
      }
    }

    try {
      setIsPunching(true);
      const createdOrder = await punchOrder({
        routeId,
        routeName,
        shop,
        executiveId: user?.id || 'exec_default',
        executiveName: user?.full_name || 'Bharath Kumar',
        executivePhone: user?.phone || '9538344788',
        items: itemsToPunch,
      });

      setIsPunching(false);
      setSuccessOrder(createdOrder);
    } catch (err) {
      setIsPunching(false);
      Alert.alert('Punch Failed', 'Could not punch order. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: 12 },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopTitle} numberOfLines={1}>
            {shop.name}
          </Text>
          <Text style={styles.shopSub}>
            📍 {routeName} &bull; 📞 {shop.phone}
          </Text>
        </View>
      </View>

      {/* Category Pills (Dynamic from Godown) */}
      <View style={styles.categorySection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'ALL', name: 'All Items' }, ...categories]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(item.id)}
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

      {/* Search Filter */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter Godown items by name..."
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

      {/* Products Inventory List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.productList,
          { paddingBottom: 220 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const qty = orderQuantities[item.id] || 0;
          const isOutOfStock = item.stock_qty <= 0;
          const isMaxReached = qty >= item.stock_qty;
          const remainingStockAfterOrder = Math.max(0, item.stock_qty - qty);
          const matchedCategory = categories.find((c) => c.id === item.category_id);

          return (
            <View style={[styles.productCard, isOutOfStock && styles.productCardDisabled]}>
              {/* Product Header */}
              <View style={styles.productTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.categoryTag}>
                    {matchedCategory?.name || 'Dairy'} &bull; HSN: {item.hsn_code}
                  </Text>
                </View>

                <View style={styles.priceContainer}>
                  <Text style={styles.rateText}>₹{item.rate.toFixed(2)}</Text>
                  <Text style={styles.gstNote}>+5% GST</Text>
                </View>
              </View>

              {/* Godown Stock Display - Always visible right at the input */}
              <View
                style={[
                  styles.stockStatusBar,
                  isOutOfStock
                    ? styles.stockStatusOutOfStock
                    : isMaxReached
                    ? styles.stockStatusMax
                    : qty > 0
                    ? styles.stockStatusActive
                    : styles.stockStatusNormal,
                ]}
              >
                <Text
                  style={[
                    styles.stockStatusText,
                    isOutOfStock
                      ? styles.stockStatusTextOutOfStock
                      : isMaxReached
                      ? styles.stockStatusTextMax
                      : qty > 0
                      ? styles.stockStatusTextActive
                      : styles.stockStatusTextNormal,
                  ]}
                >
                  {isOutOfStock
                    ? '❌ Out of Stock in Godown (0 available)'
                    : isMaxReached
                    ? `⚠️ Max available stock selected: ${item.stock_qty} units (0 left)`
                    : qty > 0
                    ? `📦 Godown Stock: ${item.stock_qty} left  ➜  After Order: ${remainingStockAfterOrder} left`
                    : `📦 Godown Stock: ${item.stock_qty} units available`}
                </Text>
              </View>

              {/* Stepper Controls: Typing Field + / - Buttons */}
              <View style={styles.productBottomRow}>
                <View style={styles.inputHelperLabel}>
                  <Text style={styles.qtyPromptText}>Order Qty:</Text>
                </View>

                {/* Stepper & Direct Typing Input */}
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, (qty === 0 || isOutOfStock) && styles.stepperBtnDisabled]}
                    onPress={() => handleQuantityChange(item, qty - 1)}
                    disabled={qty === 0 || isOutOfStock}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>

                  <TextInput
                    style={[
                      styles.qtyInput,
                      qty > 0 && styles.qtyInputActive,
                      isOutOfStock && styles.qtyInputDisabled,
                    ]}
                    keyboardType="number-pad"
                    value={qty > 0 ? String(qty) : ''}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    editable={!isOutOfStock}
                    selectTextOnFocus
                    onChangeText={(txt) => {
                      const num = parseInt(txt.replace(/\D/g, ''), 10) || 0;
                      handleQuantityChange(item, num);
                    }}
                  />

                  <TouchableOpacity
                    style={[
                      styles.stepperBtn,
                      (isMaxReached || isOutOfStock) && styles.stepperBtnDisabled,
                    ]}
                    onPress={() => handleQuantityChange(item, qty + 1)}
                    disabled={isMaxReached || isOutOfStock}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Line Calculation if Qty > 0 */}
              {qty > 0 && (
                <View style={styles.itemLineTotal}>
                  <Text style={styles.itemLineTotalText}>
                    {qty} × ₹{item.rate.toFixed(2)} = <Text style={styles.itemLineTaxable}>₹{(qty * item.rate).toFixed(2)}</Text> (+5% GST = <Text style={styles.itemLineGrand}>₹{(qty * item.rate * 1.05).toFixed(2)}</Text>)
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Live Order Calculation Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.footerSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Items:</Text>
            <Text style={styles.summaryValue}>
              {orderSummary.totalQty} units ({Object.values(orderQuantities).filter((q) => q > 0).length} products)
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxable Subtotal:</Text>
            <Text style={styles.summaryValue}>₹{orderSummary.taxableAmount.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>5% GST (CGST 2.5% + SGST 2.5%):</Text>
            <Text style={styles.summaryValue}>₹{orderSummary.totalGstAmount.toFixed(2)}</Text>
          </View>

          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total (Incl. GST):</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(orderSummary.grandTotal)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.punchOrderBtn, (orderSummary.totalQty === 0 || isPunching) && styles.punchBtnDisabled]}
          onPress={handlePunch}
          disabled={orderSummary.totalQty === 0 || isPunching}
          activeOpacity={0.85}
        >
          {isPunching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.punchOrderBtnText}>⚡ PUNCH ORDER</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Order Success Modal */}
      {successOrder && (
        <Modal visible transparent animationType="slide">
          <View style={styles.successOverlay}>
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successTitle}>Order Punched Successfully!</Text>
              <Text style={styles.successSub}>
                The bill has been created and sent to the Owner's Sales Dashboard.
              </Text>

              <View style={styles.successDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Invoice No:</Text>
                  <Text style={[styles.detailVal, { fontWeight: '800' }]}>{successOrder.invoice_no}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Shop:</Text>
                  <Text style={styles.detailVal}>{successOrder.shop_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Total Items:</Text>
                  <Text style={styles.detailVal}>{successOrder.total_qty} units</Text>
                </View>
                <View style={[styles.detailRow, { borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[styles.detailKey, { fontWeight: '700' }]}>Grand Total:</Text>
                  <Text style={[styles.detailVal, { fontSize: 16, fontWeight: '800', color: '#1E3A8A' }]}>
                    ₹{successOrder.grand_total.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => {
                  setSuccessOrder(null);
                  navigation.goBack();
                }}
              >
                <Text style={styles.doneBtnText}>Back to Shop List</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  shopTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  shopSub: {
    color: '#BFDBFE',
    fontSize: 12,
    marginTop: 2,
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  categoryPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  categoryPillText: {
    fontSize: 13,
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
  productList: {
    padding: 12,
    paddingBottom: 160,
    gap: 10,
  },
  productCard: {
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
  productCardDisabled: {
    opacity: 0.55,
    backgroundColor: '#F9FAFB',
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  categoryTag: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  rateText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  gstNote: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '600',
  },
  stockStatusBar: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  stockStatusNormal: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  stockStatusActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  stockStatusMax: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  stockStatusOutOfStock: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  stockStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  stockStatusTextNormal: {
    color: '#15803D',
  },
  stockStatusTextActive: {
    color: '#1D4ED8',
  },
  stockStatusTextMax: {
    color: '#B45309',
  },
  stockStatusTextOutOfStock: {
    color: '#DC2626',
  },
  productBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
  },
  inputHelperLabel: {
    flex: 1,
  },
  qtyPromptText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  stepperBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  qtyInput: {
    width: 58,
    height: 38,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    backgroundColor: '#FFFFFF',
    padding: 0,
  },
  qtyInputActive: {
    borderColor: '#1E3A8A',
    backgroundColor: '#EFF6FF',
    color: '#1E3A8A',
  },
  qtyInputDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    color: '#9CA3AF',
  },
  itemLineTotal: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemLineTotalText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'right',
  },
  itemLineTaxable: {
    fontWeight: '700',
    color: '#111827',
  },
  itemLineGrand: {
    fontWeight: '800',
    color: '#059669',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  footerSummary: {
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  grandTotalRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  punchOrderBtn: {
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  punchBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  punchOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  successDetails: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    gap: 6,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailKey: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  doneBtn: {
    backgroundColor: '#1E3A8A',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
