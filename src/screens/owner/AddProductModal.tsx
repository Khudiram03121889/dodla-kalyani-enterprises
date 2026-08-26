import React, { useState } from 'react';
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
} from 'react-native';
import { useStore } from '../../context/StoreContext';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  defaultCategoryId?: string;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  visible,
  onClose,
  defaultCategoryId,
}) => {
  const { categories, addProduct } = useStore();
  const [categoryId, setCategoryId] = useState<string>(defaultCategoryId || '');
  const [name, setName] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [rate, setRate] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getHsnForCategory = (catId: string): string => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return '';
    const catName = cat.name.toLowerCase();
    if (catName.includes('badam milk')) return '04029990';
    if (catName.includes('soan papdi') || catName.includes('doodh pedha') || catName.includes('doodh peda')) return '21069099';
    return '';
  };

  const handleSelectCategory = (catId: string) => {
    setCategoryId(catId);
    const autoHsn = getHsnForCategory(catId);
    if (autoHsn) {
      setHsnCode(autoHsn);
    }
  };

  React.useEffect(() => {
    if (defaultCategoryId && defaultCategoryId !== 'ALL') {
      setCategoryId(defaultCategoryId);
      const autoHsn = getHsnForCategory(defaultCategoryId);
      if (autoHsn) setHsnCode(autoHsn);
    } else if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
      const autoHsn = getHsnForCategory(categories[0].id);
      if (autoHsn) setHsnCode(autoHsn);
    }
  }, [defaultCategoryId, categories]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a product name.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Required', 'Please select a category.');
      return;
    }
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate <= 0) {
      Alert.alert('Required', 'Please enter a valid selling rate (e.g. 35.00).');
      return;
    }
    const numStock = parseInt(stockQty.replace(/\D/g, ''), 10);
    if (isNaN(numStock) || numStock < 0) {
      Alert.alert('Required', 'Please enter Godown stock quantity (e.g. 50).');
      return;
    }

    try {
      setIsSubmitting(true);
      await addProduct({
        category_id: categoryId,
        name: name.trim(),
        hsn_code: hsnCode.trim() || '21069099',
        rate: numRate,
        stock_qty: numStock,
        gst_rate: 5.0, // Fixed 5% GST
      });

      setName('');
      setRate('');
      setStockQty('');
      setIsSubmitting(false);
      onClose();
      Alert.alert('Success', `Product "${name.trim()}" added to Godown!`);
    } catch (e) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to add product.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Item to Godown</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sub}>
            Add a new product with rate and godown stock. Uniform 5% GST is applied.
          </Text>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Category Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catPills}>
                {categories.map((c) => (
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
                placeholder="e.g. Dodla Pure Cow Ghee 500ml"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* HSN Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>HSN / SAC Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 04059020 or 21069099"
                placeholderTextColor="#9CA3AF"
                value={hsnCode}
                onChangeText={setHsnCode}
              />
            </View>

            {/* Rate & Initial Stock */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Unit Rate (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 48.57"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={rate}
                  onChangeText={setRate}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Godown Stock Qty *</Text>
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

            {/* GST Rate Notice */}
            <View style={styles.gstNoticeBox}>
              <Text style={styles.gstNoticeTitle}>🧾 GST Rate: 5% (Fixed)</Text>
              <Text style={styles.gstNoticeSub}>
                All products carry 5% GST (2.5% CGST + 2.5% SGST) calculated automatically at billing.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Save Product</Text>
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
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  close: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
    padding: 4,
  },
  sub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 14,
  },
  formScroll: {
    maxHeight: 380,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  catPills: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  catPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  gstNoticeBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    marginTop: 4,
    marginBottom: 10,
  },
  gstNoticeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E40AF',
  },
  gstNoticeSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
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
  submitBtn: {
    flex: 2,
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
