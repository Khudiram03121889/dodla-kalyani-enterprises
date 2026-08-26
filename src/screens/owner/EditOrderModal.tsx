import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useStore } from '../../context/StoreContext';
import { Order, Product } from '../../types';
import { calculateOrderTax } from '../../utils/taxCalculator';
import { formatCurrency } from '../../utils/formatters';
import { printInvoice } from '../../services/printService';

interface EditOrderModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

interface EditItemRow {
  product: Product;
  qty: number;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  visible,
  order,
  onClose,
  onOrderUpdated,
}) => {
  const { products, categories, updateOrder } = useStore();

  const [itemRows, setItemRows] = useState<EditItemRow[]>([]);
  const [showAddProductPicker, setShowAddProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize item rows whenever order changes
  useEffect(() => {
    if (order && visible) {
      const initialRows: EditItemRow[] = (order.items || []).map((oi) => {
        const existingProd = products.find((p) => p.id === oi.product_id) || {
          id: oi.product_id,
          name: oi.product_name,
          category_id: '',
          hsn_code: oi.hsn_code || '04029990',
          rate: oi.rate,
          stock_qty: 9999,
          gst_rate: oi.gst_rate || 5.0,
        };
        return {
          product: existingProd,
          qty: oi.qty,
        };
      });
      setItemRows(initialRows);
      setShowAddProductPicker(false);
      setProductSearch('');
    }
  }, [order, visible, products]);

  // Live order calculations
  const orderSummary = useMemo(() => {
    const activeItems = itemRows
      .filter((i) => i.qty > 0)
      .map((i) => ({
        qty: i.qty,
        rate: i.product.rate,
        gstRate: i.product.gst_rate || 5.0,
      }));
    return calculateOrderTax(activeItems);
  }, [itemRows]);

  const handleQtyChange = (productId: string, newQty: number) => {
    const clamped = Math.max(0, newQty);
    setItemRows((prev) =>
      prev.map((r) => (r.product.id === productId ? { ...r, qty: clamped } : r))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItemRows((prev) => prev.filter((r) => r.product.id !== productId));
  };

  const handleAddNewProduct = (prod: Product) => {
    const alreadyExists = itemRows.some((r) => r.product.id === prod.id);
    if (alreadyExists) {
      setItemRows((prev) =>
        prev.map((r) => (r.product.id === prod.id ? { ...r, qty: r.qty + 1 } : r))
      );
    } else {
      setItemRows((prev) => [...prev, { product: prod, qty: 1 }]);
    }
    setShowAddProductPicker(false);
    setProductSearch('');
  };

  const availableProductsToAdd = useMemo(() => {
    const selectedIds = new Set(itemRows.map((r) => r.product.id));
    return products.filter((p) => {
      if (selectedIds.has(p.id)) return false;
      if (!productSearch.trim()) return true;
      const q = productSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.hsn_code && p.hsn_code.includes(q));
    });
  }, [products, itemRows, productSearch]);

  const handleSave = async (shouldPrint = false) => {
    if (!order) return;

    const validItems = itemRows.filter((i) => i.qty > 0);
    if (validItems.length === 0) {
      Alert.alert('Empty Order', 'An order must contain at least 1 item with quantity > 0.');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateOrder(order.id, validItems);
      setIsSaving(false);

      if (onOrderUpdated) {
        onOrderUpdated(updated);
      }

      if (shouldPrint) {
        onClose();
        setTimeout(async () => {
          await printInvoice(updated);
        }, 300);
      } else {
        Alert.alert('Order Updated', `Changes to Invoice ${order.invoice_no} have been saved successfully.`);
        onClose();
      }
    } catch (err: any) {
      setIsSaving(false);
      Alert.alert('Save Failed', err?.message || 'Could not update order. Please try again.');
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Edit Order &bull; #{order.invoice_no}</Text>
              <Text style={styles.headerSub}>
                🏪 {order.shop_name} &bull; 📍 {order.route_name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Product Items List */}
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>ORDERED ITEMS ({itemRows.length})</Text>
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={() => setShowAddProductPicker(!showAddProductPicker)}
              >
                <Text style={styles.addItemBtnText}>
                  {showAddProductPicker ? '✕ Close Picker' : '+ Add Item'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Add Product Picker Dropdown */}
            {showAddProductPicker && (
              <View style={styles.pickerBox}>
                <TextInput
                  style={styles.pickerSearch}
                  placeholder="Search Godown items to add..."
                  placeholderTextColor="#9CA3AF"
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
                <FlatList
                  data={availableProductsToAdd}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 150 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.pickerItemRow}
                      onPress={() => handleAddNewProduct(item)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerItemName}>{item.name}</Text>
                        <Text style={styles.pickerItemSub}>
                          Rate: ₹{item.rate.toFixed(2)} &bull; Godown Stock: {item.stock_qty}
                        </Text>
                      </View>
                      <Text style={styles.pickerAddLink}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.pickerEmpty}>No additional products available</Text>
                  }
                />
              </View>
            )}

            {/* Item Rows */}
            {itemRows.length === 0 ? (
              <View style={styles.emptyItemsBox}>
                <Text style={styles.emptyItemsText}>No items in order. Tap "+ Add Item" above.</Text>
              </View>
            ) : (
              itemRows.map((row, idx) => {
                const lineTaxable = row.qty * row.product.rate;
                const lineTotal = lineTaxable * 1.05;
                const matchedCategory = categories.find((c) => c.id === row.product.category_id);

                return (
                  <View key={row.product.id || idx} style={styles.itemCard}>
                    <View style={styles.itemCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{row.product.name}</Text>
                        <Text style={styles.itemCategory}>
                          {matchedCategory?.name || 'Item'} &bull; ₹{row.product.rate.toFixed(2)} / unit
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveItem(row.product.id)}
                      >
                        <Text style={styles.removeBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.itemCardBottom}>
                      {/* Stepper Input */}
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          style={[styles.stepperBtn, row.qty === 0 && styles.stepperBtnDisabled]}
                          onPress={() => handleQtyChange(row.product.id, row.qty - 1)}
                          disabled={row.qty === 0}
                        >
                          <Text style={styles.stepperBtnText}>−</Text>
                        </TouchableOpacity>

                        <TextInput
                          style={styles.qtyInput}
                          keyboardType="number-pad"
                          value={row.qty > 0 ? String(row.qty) : '0'}
                          selectTextOnFocus
                          onChangeText={(txt) => {
                            const num = parseInt(txt.replace(/\D/g, ''), 10) || 0;
                            handleQtyChange(row.product.id, num);
                          }}
                        />

                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => handleQtyChange(row.product.id, row.qty + 1)}
                        >
                          <Text style={styles.stepperBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Calculation */}
                      <View style={styles.lineCalculation}>
                        <Text style={styles.calcSubText}>
                          {row.qty} × ₹{row.product.rate.toFixed(2)} = ₹{lineTaxable.toFixed(2)}
                        </Text>
                        <Text style={styles.calcGrandText}>₹{lineTotal.toFixed(2)} (inc GST)</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* Calculations Summary Box */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Units / Items:</Text>
                <Text style={styles.summaryValue}>{orderSummary.totalQty} units</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taxable Amount:</Text>
                <Text style={styles.summaryValue}>₹{orderSummary.taxableAmount.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>5% GST (CGST 2.5% + SGST 2.5%):</Text>
                <Text style={styles.summaryValue}>₹{orderSummary.totalGstAmount.toFixed(2)}</Text>
              </View>

              {orderSummary.roundOff !== 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Round Off:</Text>
                  <Text style={styles.summaryValue}>
                    {orderSummary.roundOff > 0 ? `+₹${orderSummary.roundOff.toFixed(2)}` : `-₹${Math.abs(orderSummary.roundOff).toFixed(2)}`}
                  </Text>
                </View>
              )}

              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Updated Grand Total:</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(orderSummary.grandTotal)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.btnDisabled]}
              onPress={() => handleSave(false)}
              disabled={isSaving || orderSummary.totalQty === 0}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>💾 Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.savePrintBtn, isSaving && styles.btnDisabled]}
              onPress={() => handleSave(true)}
              disabled={isSaving || orderSummary.totalQty === 0}
            >
              <Text style={styles.savePrintBtnText}>🖨️ Save &amp; Print</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 12,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    color: '#BFDBFE',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollBody: {
    padding: 14,
    paddingBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  addItemBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addItemBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  pickerBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
    marginBottom: 12,
  },
  pickerSearch: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#111827',
    marginBottom: 6,
  },
  pickerItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  pickerItemSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  pickerAddLink: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 8,
  },
  pickerEmpty: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 8,
  },
  emptyItemsBox: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  emptyItemsText: {
    color: '#6B7280',
    fontSize: 13,
  },
  itemCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    marginBottom: 8,
  },
  itemCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  itemCategory: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  removeBtn: {
    padding: 4,
  },
  removeBtnText: {
    fontSize: 14,
  },
  itemCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  stepperBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyInput: {
    width: 48,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    backgroundColor: '#FFFFFF',
    padding: 0,
  },
  lineCalculation: {
    alignItems: 'flex-end',
  },
  calcSubText: {
    fontSize: 11,
    color: '#6B7280',
  },
  calcGrandText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    marginTop: 6,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  footerActions: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 13,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  savePrintBtn: {
    flex: 1.2,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savePrintBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
