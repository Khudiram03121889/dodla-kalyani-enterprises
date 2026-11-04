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
import { CompanyDivision, GOPAL_CHIPS_HSN_OPTIONS } from '../../types';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  defaultCategoryId?: string;
  targetCompany?: CompanyDivision;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  visible,
  onClose,
  defaultCategoryId,
  targetCompany,
}) => {
  const { categories, addProduct } = useStore();
  const [categoryId, setCategoryId] = useState<string>(defaultCategoryId || '');
  const [name, setName] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [rate, setRate] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter categories to only those belonging to the target company
  const availableCategories = React.useMemo(() => {
    if (!targetCompany) return categories;
    return categories.filter((c) => (c.company || 'Dodla') === targetCompany);
  }, [categories, targetCompany]);

  const selectedCategoryObj = categories.find((c) => c.id === categoryId);
  const effectiveCompany = targetCompany || selectedCategoryObj?.company || 'Dodla';

  const getHsnForCategory = (catId: string): string => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return effectiveCompany === 'Gopal Chips' ? '20052000' : '21069099';
    if (cat.hsn_code) return cat.hsn_code;
    const catName = cat.name.toLowerCase();
    if (catName.includes('badam') || catName.includes('milk') || catName.includes('beverage')) return '22029990';
    return effectiveCompany === 'Gopal Chips' ? '20052000' : '21069099';
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
    } else if (availableCategories.length > 0 && (!categoryId || !availableCategories.some(c => c.id === categoryId))) {
      setCategoryId(availableCategories[0].id);
      const autoHsn = getHsnForCategory(availableCategories[0].id);
      if (autoHsn) setHsnCode(autoHsn);
    }
  }, [defaultCategoryId, availableCategories]);

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
        hsn_code: hsnCode.trim() || (effectiveCompany === 'Gopal Chips' ? '20052000' : '21069099'),
        rate: numRate,
        stock_qty: numStock,
        gst_rate: 5.0, // Fixed 5% GST
        company: effectiveCompany,
      });

      setName('');
      setRate('');
      setStockQty('');
      setIsSubmitting(false);
      onClose();
      Alert.alert('Success', `Product "${name.trim()}" added to Godown!`);
    } catch (e: any) {
      setIsSubmitting(false);
      Alert.alert('Error', e.message || 'Failed to add product.');
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
                placeholder={effectiveCompany === 'Gopal Chips' ? 'e.g. Potato Wafers Salted 40g' : 'e.g. Badam Milk 200ml or Soan Papdi 500g'}
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* HSN Code Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select HSN Number (for Invoice) *</Text>
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
                placeholder={effectiveCompany === 'Gopal Chips' ? 'HSN Code (e.g. 20052000 or 21069099)' : 'HSN Code (e.g. 22029990 or 21069099)'}
                placeholderTextColor="#9CA3AF"
                value={hsnCode}
                onChangeText={setHsnCode}
                keyboardType="number-pad"
              />
            </View>

            {/* Rate & Initial Stock */}
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
  hsnPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  hsnPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  hsnPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  hsnPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#374151',
  },
  hsnPillTextActive: {
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
