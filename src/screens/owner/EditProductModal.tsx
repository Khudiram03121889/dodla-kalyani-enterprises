import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useStore } from '../../context/StoreContext';
import { Product, CompanyDivision, GOPAL_CHIPS_HSN_OPTIONS, ProductUom, UOM_OPTIONS } from '../../types';

interface EditProductModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  visible,
  product,
  onClose,
  onSuccess,
}) => {
  const { categories, updateProduct } = useStore();

  const [categoryId, setCategoryId] = useState<string>('');
  const [name, setName] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [uom, setUom] = useState<ProductUom>('box');
  const [rate, setRate] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form state whenever product changes
  useEffect(() => {
    if (product) {
      setCategoryId(product.category_id || '');
      setName(product.name || '');
      setHsnCode(product.hsn_code || '');
      setUom((product.uom as ProductUom) || 'box');
      setRate(product.rate !== undefined ? String(product.rate) : '');
      setStockQty(product.stock_qty !== undefined ? String(product.stock_qty) : '');
    }
  }, [product]);

  const effectiveCompany: CompanyDivision = product?.company || 'Dodla';

  // Filter categories to only those belonging to the product's division
  const availableCategories = useMemo(() => {
    return categories.filter((c) => (c.company || 'Dodla') === effectiveCompany);
  }, [categories, effectiveCompany]);

  const handleSelectCategory = (catId: string) => {
    setCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat?.hsn_code && !hsnCode) {
      setHsnCode(cat.hsn_code);
    }
  };

  const handleSave = async () => {
    if (!product) return;

    if (!name.trim()) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please enter a product name.');
      } else {
        Alert.alert('Required', 'Please enter a product name.');
      }
      return;
    }
    if (!categoryId) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please select a category.');
      } else {
        Alert.alert('Required', 'Please select a category.');
      }
      return;
    }
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate <= 0) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please enter a valid selling rate (e.g. 35.00).');
      } else {
        Alert.alert('Required', 'Please enter a valid selling rate (e.g. 35.00).');
      }
      return;
    }
    const numStock = parseInt(stockQty.replace(/\D/g, ''), 10);
    if (isNaN(numStock) || numStock < 0) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Please enter a valid Godown stock quantity.');
      } else {
        Alert.alert('Required', 'Please enter a valid Godown stock quantity.');
      }
      return;
    }

    try {
      setIsSubmitting(true);
      await updateProduct(product.id, {
        category_id: categoryId,
        name: name.trim(),
        hsn_code: hsnCode.trim() || (effectiveCompany === 'Gopal Chips' ? '20052000' : '21069099'),
        uom: uom,
        rate: numRate,
        stock_qty: numStock,
      });

      setIsSubmitting(false);
      onClose();
      if (onSuccess) onSuccess();

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Product "${name.trim()}" updated successfully!`);
      } else {
        Alert.alert('Success', `Product "${name.trim()}" updated successfully!`);
      }
    } catch (e: any) {
      setIsSubmitting(false);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(e.message || 'Failed to update product.');
      } else {
        Alert.alert('Error', e.message || 'Failed to update product.');
      }
    }
  };

  if (!product) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Edit Product Details</Text>
              <View style={styles.companyBadgeRow}>
                <View
                  style={[
                    styles.companyBadge,
                    {
                      backgroundColor:
                        effectiveCompany === 'Gopal Chips' ? '#FFEDD5' : '#DBEAFE',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: effectiveCompany === 'Gopal Chips' ? '#C2410C' : '#1E40AF',
                    }}
                  >
                    {effectiveCompany}
                  </Text>
                </View>
                <Text style={styles.productIdText}>ID: {product.id.slice(0, 8)}...</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sub}>
            Update product name, category, HSN code, UOM, rate, and inventory stock.
          </Text>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Category Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catPills}>
                {availableCategories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catPill, categoryId === c.id && styles.catPillActive]}
                    onPress={() => handleSelectCategory(c.id)}
                  >
                    <Text
                      style={[
                        styles.catPillText,
                        categoryId === c.id && styles.catPillTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Product Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Product Name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* HSN Code Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>HSN Number (for Invoices) *</Text>
              <View style={styles.hsnPillsRow}>
                {effectiveCompany === 'Gopal Chips' ? (
                  GOPAL_CHIPS_HSN_OPTIONS.map((code) => (
                    <TouchableOpacity
                      key={code}
                      style={[styles.hsnPill, hsnCode === code && styles.hsnPillActive]}
                      onPress={() => setHsnCode(code)}
                    >
                      <Text style={[styles.hsnPillText, hsnCode === code && styles.hsnPillTextActive]}>
                        {code}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.hsnPill, hsnCode === '22029990' && styles.hsnPillActive]}
                      onPress={() => setHsnCode('22029990')}
                    >
                      <Text style={[styles.hsnPillText, hsnCode === '22029990' && styles.hsnPillTextActive]}>
                        22029990 (Badam Milk)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.hsnPill, hsnCode === '21069099' && styles.hsnPillActive]}
                      onPress={() => setHsnCode('21069099')}
                    >
                      <Text style={[styles.hsnPillText, hsnCode === '21069099' && styles.hsnPillTextActive]}>
                        21069099 (Sweets)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.hsnPill, hsnCode === '04012000' && styles.hsnPillActive]}
                      onPress={() => setHsnCode('04012000')}
                    >
                      <Text style={[styles.hsnPillText, hsnCode === '04012000' && styles.hsnPillTextActive]}>
                        04012000 (Milk & Curd)
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder="HSN Code"
                placeholderTextColor="#9CA3AF"
                value={hsnCode}
                onChangeText={setHsnCode}
                keyboardType="number-pad"
              />
            </View>

            {/* Unit of Measurement (UOM) Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Unit of Measurement (UOM) *</Text>
              <View style={styles.uomPillsRow}>
                {UOM_OPTIONS.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.uomPill, uom === unit && styles.uomPillActive]}
                    onPress={() => setUom(unit)}
                  >
                    <Text style={[styles.uomPillText, uom === unit && styles.uomPillTextActive]}>
                      {unit === 'box' ? '📦 Box' : unit === 'pkt' ? '🛍️ Packet (pkt)' : '📦 Case'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rate & Stock */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Unit Rate (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 35.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={rate}
                  onChangeText={setRate}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Godown Stock *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 100"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={stockQty}
                  onChangeText={setStockQty}
                />
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  companyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productIdText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  sub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  close: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  formScroll: {
    maxHeight: 440,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  catPills: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  catPillText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  hsnPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  hsnPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hsnPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  hsnPillText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
  hsnPillTextActive: {
    color: '#FFFFFF',
  },
  uomPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  uomPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uomPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  uomPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  uomPillTextActive: {
    color: '#1E40AF',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
  },
  saveText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
