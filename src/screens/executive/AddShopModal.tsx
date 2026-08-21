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

interface AddShopModalProps {
  visible: boolean;
  onClose: () => void;
  selectedRouteId: string;
  onShopAdded?: (shopId: string) => void;
}

export const AddShopModal: React.FC<AddShopModalProps> = ({
  visible,
  onClose,
  selectedRouteId,
  onShopAdded,
}) => {
  const { routes, addShop } = useStore();
  const [routeId, setRouteId] = useState(selectedRouteId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [incharge, setIncharge] = useState('');
  const [gstin, setGstin] = useState('');
  const [fssai, setFssai] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync routeId when modal opens with selected route
  React.useEffect(() => {
    if (visible) {
      if (selectedRouteId) {
        setRouteId(selectedRouteId);
      } else if (routes.length > 0) {
        setRouteId(routes[0].id);
      }
    }
  }, [visible, selectedRouteId, routes]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter the Shop / Party name.');
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert('Required Field', 'Please enter a valid 10-digit mobile number for the shop.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Required Field', 'Please enter the shop address and locality.');
      return;
    }
    if (!routeId) {
      Alert.alert('Required Field', 'Please select a route for this shop.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newShop = await addShop({
        route_id: routeId,
        name: name.trim().toUpperCase(),
        phone: cleanPhone,
        address: address.trim(),
        incharge: incharge.trim() || undefined,
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
        fssai: fssai.trim() || undefined,
      });

      setName('');
      setPhone('');
      setAddress('');
      setIncharge('');
      setGstin('');
      setFssai('');
      setIsSubmitting(false);
      onClose();

      if (onShopAdded) {
        onShopAdded(newShop.id);
      }
      Alert.alert('Success', `Shop "${newShop.name}" added successfully!`);
    } catch (err) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to add shop. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Add New Shop</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sub}>Enter party details to register in your delivery route</Text>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Route Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select Route *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routePills}>
                {routes.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.routePill, routeId === r.id && styles.routePillActive]}
                    onPress={() => setRouteId(r.id)}
                  >
                    <Text
                      style={[
                        styles.routePillText,
                        routeId === r.id && styles.routePillTextActive,
                      ]}
                    >
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Shop Name (Mandatory) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop / Party Name * (Mandatory)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SRI RAJESWARY HOT CHIPS"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCapitalize="characters"
              />
            </View>

            {/* Phone (Mandatory) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Mobile Number * (Mandatory)</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* Address (Mandatory) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Address & Landmark * (Mandatory)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. COWL BAZAR, FIRST GATE - 583101"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* Incharge Name (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Person / Incharge (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. GADHILINGA"
                placeholderTextColor="#9CA3AF"
                value={incharge}
                onChangeText={setIncharge}
                autoCapitalize="words"
              />
            </View>

            {/* GSTIN (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>GSTIN Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 29ABCDE1234F1Z5"
                placeholderTextColor="#9CA3AF"
                value={gstin}
                onChangeText={setGstin}
                autoCapitalize="characters"
              />
            </View>

            {/* Food License / FSSAI (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Food License / FSSAI (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 20250930107794088"
                placeholderTextColor="#9CA3AF"
                value={fssai}
                onChangeText={setFssai}
              />
            </View>
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
            >
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
                <Text style={styles.submitBtnText}>Save Shop</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
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
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  sub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 14,
  },
  formScroll: {
    maxHeight: 400,
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
  routePills: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  routePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    marginRight: 8,
  },
  routePillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  routePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  routePillTextActive: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  textArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
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
