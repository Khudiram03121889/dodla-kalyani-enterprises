import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Shop, Product, Order } from '../../types';
import { calculateOrderTax } from '../../utils/taxCalculator';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { printInvoice, shareInvoicePdf } from '../../services/printService';
import { AddShopModal } from '../../screens/executive/AddShopModal';
import { AddRouteModal } from '../../screens/executive/AddRouteModal';
import { ManageRoutesModal } from '../../screens/executive/ManageRoutesModal';

export const DesktopPunchOrderScreen: React.FC = () => {
  const { user } = useAuth();
  const { routes, shops, products, categories, punchOrder, markOrderAsPrinted } = useStore();

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    routes.length > 0 ? routes[0].id : ''
  );
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [isPunching, setIsPunching] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // Modals
  const [addShopVisible, setAddShopVisible] = useState(false);
  const [addRouteVisible, setAddRouteVisible] = useState(false);
  const [manageRoutesVisible, setManageRoutesVisible] = useState(false);

  // Keep route and shop valid
  React.useEffect(() => {
    if (!selectedRouteId && routes.length > 0) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const routeShops = shops.filter((s) => s.route_id === selectedRouteId);

  React.useEffect(() => {
    if (routeShops.length > 0) {
      if (!selectedShopId || !routeShops.some((s) => s.id === selectedShopId)) {
        setSelectedShopId(routeShops[0].id);
      }
    } else {
      setSelectedShopId('');
    }
  }, [routeShops, selectedShopId]);

  const activeShop = routeShops.find((s) => s.id === selectedShopId) || routeShops[0];

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category_id === selectedCategory;
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
  }, [products, categories, selectedCategory, searchQuery]);

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

    if (clampedQty > product.stock_qty) {
      if (typeof window !== 'undefined') {
        window.alert(
          `Stock limit: Only ${product.stock_qty} units of "${product.name}" are currently available in the Godown.`
        );
      } else {
        Alert.alert(
          'Stock Limit Reached',
          `Cannot order ${clampedQty} units of "${product.name}".\n\nOnly ${product.stock_qty} units are available in the Godown.`
        );
      }
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
    if (!activeShop) {
      if (typeof window !== 'undefined') window.alert('Please select a party/shop first.');
      else Alert.alert('Select Shop', 'Please select a shop before punching an order.');
      return;
    }

    const itemsToPunch = Object.entries(orderQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId)!;
        return { product, qty };
      });

    if (itemsToPunch.length === 0) {
      if (typeof window !== 'undefined') window.alert('Please add at least one item to the order.');
      else Alert.alert('Empty Order', 'Please enter quantity for at least one item before punching.');
      return;
    }

    setIsPunching(true);
    try {
      const order = await punchOrder({
        routeId: activeRoute?.id || selectedRouteId,
        routeName: activeRoute?.name || 'Default Route',
        shop: activeShop,
        executiveId: user?.id || 'exec-web-01',
        executiveName: user?.full_name || 'Bharath Kumar',
        executivePhone: user?.phone || '9980989148',
        items: itemsToPunch,
      });

      setSuccessOrder(order);
      setOrderQuantities({});
    } catch (err: any) {
      if (typeof window !== 'undefined') window.alert(`Error punching order: ${err.message || err}`);
      else Alert.alert('Punch Failed', err.message || 'Could not record order.');
    } finally {
      setIsPunching(false);
    }
  };

  const cartItems = Object.entries(orderQuantities)
    .filter(([_, qty]) => qty > 0)
    .map(([productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      return { product, qty };
    })
    .filter((item): item is { product: Product; qty: number } => !!item.product);

  return (
    <View style={styles.container}>
      {/* Route & Shop Selector Bar */}
      <View style={styles.selectorBar}>
        <View style={styles.selectorGroup}>
          <Text style={styles.selectorLabel}>Route:</Text>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            style={styles.selectInput as any}
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <TouchableOpacity
            style={styles.smallAddBtn}
            onPress={() => setAddRouteVisible(true)}
          >
            <Text style={styles.smallAddBtnText}>+ Route</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.smallAddBtn}
            onPress={() => setManageRoutesVisible(true)}
          >
            <Text style={styles.smallAddBtnText}>📁 Manage Routes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.selectorGroup}>
          <Text style={styles.selectorLabel}>Party / Shop:</Text>
          {routeShops.length === 0 ? (
            <Text style={styles.noShopsNotice}>No shops on this route yet.</Text>
          ) : (
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              style={styles.selectInput as any}
            >
              {routeShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.incharge || s.phone})
                </option>
              ))}
            </select>
          )}
          <TouchableOpacity
            style={styles.smallAddBtn}
            onPress={() => setAddShopVisible(true)}
          >
            <Text style={styles.smallAddBtnText}>+ Shop</Text>
          </TouchableOpacity>
        </View>

        {activeShop && (
          <View style={styles.shopDetailPill}>
            <Text style={styles.shopDetailText}>
              Incharge: <Text style={{ fontWeight: '700' }}>{activeShop.incharge || '-'}</Text> •
              Mob: <Text style={{ fontWeight: '700' }}>{activeShop.phone}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* Main 2-Column Workstation */}
      <View style={styles.workstation}>
        {/* Left Column: Product Catalog & Category Tabs */}
        <View style={styles.catalogColumn}>
          {/* Category Bar & Search */}
          <View style={styles.catalogToolbar}>
            <View style={styles.categoryPills}>
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  selectedCategory === 'ALL' && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory('ALL')}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategory === 'ALL' && styles.categoryPillTextActive,
                  ]}
                >
                  All ({products.length})
                </Text>
              </TouchableOpacity>

              {categories.map((c) => {
                const count = products.filter((p) => p.category_id === c.id).length;
                const isSelected = selectedCategory === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                    onPress={() => setSelectedCategory(c.id)}
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

            <TextInput
              style={styles.searchInput}
              placeholder="Search product..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Product Grid / List */}
          <View style={styles.productGrid}>
            {filteredProducts.length === 0 ? (
              <View style={styles.emptyProducts}>
                <Text style={{ fontSize: 32 }}>📦</Text>
                <Text style={{ fontWeight: '700', color: '#64748B', marginTop: 8 }}>
                  No products found in this category.
                </Text>
              </View>
            ) : (
              filteredProducts.map((p) => {
                const currentQty = orderQuantities[p.id] || 0;
                const isOut = p.stock_qty === 0;

                return (
                  <View
                    key={p.id}
                    style={[
                      styles.productCard,
                      currentQty > 0 && styles.productCardActive,
                      isOut && styles.productCardDisabled,
                    ]}
                  >
                    <View style={styles.productCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productCardTitle}>{p.name}</Text>
                        <Text style={styles.productCardMeta}>
                          {categories.find((c) => c.id === p.category_id)?.name || 'General'} • HSN: {p.hsn_code || '-'}
                        </Text>
                      </View>
                      <View style={styles.rateBadge}>
                        <Text style={styles.rateBadgeText}>₹{p.rate.toFixed(2)}</Text>
                      </View>
                    </View>

                    <View style={styles.productCardFooter}>
                      <View style={styles.stockNotice}>
                        <View
                          style={[
                            styles.stockDot,
                            { backgroundColor: isOut ? '#EF4444' : '#10B981' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.stockNoticeText,
                            isOut && { color: '#EF4444', fontWeight: '700' },
                          ]}
                        >
                          {isOut ? 'Out of stock' : `${p.stock_qty} in godown`}
                        </Text>
                      </View>

                      {/* Quantity Controller */}
                      <View style={styles.qtyController}>
                        <TouchableOpacity
                          style={[styles.qtyBtn, currentQty === 0 && styles.qtyBtnDisabled]}
                          onPress={() => handleQuantityChange(p, currentQty - 1)}
                          disabled={currentQty === 0 || isOut}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </TouchableOpacity>

                        <TextInput
                          style={styles.qtyInput}
                          keyboardType="numeric"
                          value={currentQty > 0 ? String(currentQty) : ''}
                          placeholder="0"
                          onChangeText={(t) => {
                            const val = parseInt(t.replace(/\D/g, ''), 10) || 0;
                            handleQuantityChange(p, val);
                          }}
                          editable={!isOut}
                        />

                        <TouchableOpacity
                          style={[
                            styles.qtyBtn,
                            currentQty >= p.stock_qty && styles.qtyBtnDisabled,
                          ]}
                          onPress={() => handleQuantityChange(p, currentQty + 1)}
                          disabled={currentQty >= p.stock_qty || isOut}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Right Column: Live Order Cart & Summary */}
        <View style={styles.cartColumn}>
          <View style={styles.cartCard}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>🛒 Current Order Cart</Text>
              <Text style={styles.cartPartyName}>
                {activeShop ? activeShop.name : 'Select a party'}
              </Text>
            </View>

            <ScrollView style={styles.cartItemList} showsVerticalScrollIndicator={false}>
              {cartItems.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Text style={styles.emptyCartIcon}>🛍️</Text>
                  <Text style={styles.emptyCartText}>No items added yet.</Text>
                  <Text style={styles.emptyCartSub}>
                    Select quantities from the product catalog on the left to build the party's order.
                  </Text>
                </View>
              ) : (
                cartItems.map(({ product, qty }) => (
                  <View key={product.id} style={styles.cartItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>{product.name}</Text>
                      <Text style={styles.cartItemSub}>
                        {qty} × ₹{product.rate.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.cartItemTotal}>
                      ₹{(qty * product.rate).toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      style={styles.cartRemoveBtn}
                      onPress={() => handleQuantityChange(product, 0)}
                    >
                      <Text style={styles.cartRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Calculations Breakdown */}
            <View style={styles.cartCalculations}>
              <View style={styles.calcRow}>
                 <Text style={styles.calcLabel}>Total Quantity:</Text>
                 <Text style={styles.calcValue}>{orderSummary.totalQty} Units</Text>
              </View>
              <View style={styles.calcRow}>
                 <Text style={styles.calcLabel}>Taxable Subtotal:</Text>
                 <Text style={styles.calcValue}>₹{orderSummary.taxableAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.calcRow}>
                 <Text style={styles.calcLabel}>CGST (2.5%):</Text>
                 <Text style={styles.calcValue}>₹{orderSummary.cgstAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.calcRow}>
                 <Text style={styles.calcLabel}>SGST (2.5%):</Text>
                 <Text style={styles.calcValue}>₹{orderSummary.sgstAmount.toFixed(2)}</Text>
              </View>
              <View style={[styles.calcRow, styles.grandTotalRow]}>
                 <Text style={styles.grandTotalLabel}>Grand Total (Incl. 5% GST):</Text>
                 <Text style={styles.grandTotalValue}>
                   {formatCurrency(orderSummary.grandTotal)}
                 </Text>
              </View>
            </View>

            {/* Punch Order Button */}
            <TouchableOpacity
              style={[
                styles.punchBtn,
                (cartItems.length === 0 || isPunching || !activeShop) && styles.punchBtnDisabled,
              ]}
              onPress={handlePunch}
              disabled={cartItems.length === 0 || isPunching || !activeShop}
            >
              {isPunching ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.punchBtnText}>
                  ⚡ Punch Order & Generate Bill
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Success Modal */}
      {successOrder && (
        <Modal visible={!!successOrder} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.successModal}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Order Punched Successfully!</Text>
              <Text style={styles.successInvoiceNo}>{successOrder.invoice_no}</Text>
              <Text style={styles.successShopName}>
                {successOrder.shop_name} • {successOrder.route_name}
              </Text>
              <Text style={styles.successAmount}>
                {formatCurrency(successOrder.grand_total)}
              </Text>

              <View style={styles.successActions}>
                <TouchableOpacity
                  style={styles.successPrintBtn}
                  onPress={async () => {
                    await printInvoice(successOrder);
                    await markOrderAsPrinted(successOrder.id);
                  }}
                >
                  <Text style={styles.successBtnText}>🖨️ Print Invoice</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.successDownloadBtn}
                  onPress={async () => {
                    await shareInvoicePdf(successOrder);
                    await markOrderAsPrinted(successOrder.id);
                  }}
                >
                  <Text style={styles.successBtnText}>📥 Download PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.successNextBtn}
                  onPress={() => setSuccessOrder(null)}
                >
                  <Text style={styles.successNextBtnText}>Punch Next Order</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Route Modal */}
      {addRouteVisible && (
        <AddRouteModal
          visible={addRouteVisible}
          onClose={() => setAddRouteVisible(false)}
          onRouteAdded={(id) => setSelectedRouteId(id)}
        />
      )}

      {/* Add Shop Modal */}
      {addShopVisible && (
        <AddShopModal
          visible={addShopVisible}
          onClose={() => setAddShopVisible(false)}
          selectedRouteId={selectedRouteId}
          onShopAdded={(id) => setSelectedShopId(id)}
        />
      )}

      {/* Manage Routes Modal */}
      {manageRoutesVisible && (
        <ManageRoutesModal
          visible={manageRoutesVisible}
          onClose={() => setManageRoutesVisible(false)}
          selectedRouteId={selectedRouteId}
          onSelectRoute={(id) => setSelectedRouteId(id)}
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
  selectorBar: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  selectorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  selectInput: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    minWidth: 180,
    cursor: 'pointer',
  } as any,
  smallAddBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  noShopsNotice: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  shopDetailPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shopDetailText: {
    fontSize: 12,
    color: '#475569',
  },
  workstation: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  catalogColumn: {
    flex: 1.6,
    gap: 16,
  },
  catalogToolbar: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  categoryPills: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
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
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    minWidth: 180,
    color: '#1E293B',
  },
  productGrid: {
    gap: 12,
  },
  emptyProducts: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  productCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#F8FAFC',
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  productCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  productCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  productCardMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rateBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rateBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  productCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockNoticeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  qtyController: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  qtyBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  qtyInput: {
    width: 48,
    height: 32,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  cartColumn: {
    flex: 1,
    minWidth: 320,
  },
  cartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cartHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 14,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  cartPartyName: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '700',
    marginTop: 2,
  },
  cartItemList: {
    maxHeight: 260,
    marginVertical: 12,
  },
  emptyCart: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCartIcon: {
    fontSize: 32,
  },
  emptyCartText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 6,
  },
  emptyCartSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  cartItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  cartItemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  cartItemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  cartRemoveBtn: {
    padding: 4,
  },
  cartRemoveText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  cartCalculations: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  calcValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  punchBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  punchBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  punchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    maxWidth: 440,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  successIcon: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
  },
  successInvoiceNo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E3A8A',
    marginTop: 4,
  },
  successShopName: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  successAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    marginTop: 8,
  },
  successActions: {
    width: '100%',
    gap: 10,
    marginTop: 24,
  },
  successPrintBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  successDownloadBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  successBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  successNextBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  successNextBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
});
