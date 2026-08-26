import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useStore } from '../../context/StoreContext';
import { Route } from '../../types';

interface ManageRoutesModalProps {
  visible: boolean;
  onClose: () => void;
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
}

export const ManageRoutesModal: React.FC<ManageRoutesModalProps> = ({
  visible,
  onClose,
  selectedRouteId,
  onSelectRoute,
}) => {
  const { routes, shops, addRoute, deleteRoute } = useStore();
  const [newRouteName, setNewRouteName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    const trimmed = newRouteName.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a route name.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await addRoute(trimmed);
      setNewRouteName('');
      setIsSubmitting(false);
      onSelectRoute(created.id);
      Alert.alert('Route Created', '"' + created.name + '" has been added and synced with the database.');
    } catch (e: any) {
      setIsSubmitting(false);
      Alert.alert('Error', e.message || 'Failed to add route in database.');
    }
  };

  const handleDelete = (route: Route) => {
    const routeShops = shops.filter((s) => s.route_id === route.id);
    Alert.alert(
      'Delete Route',
      'Are you sure you want to permanently delete route "' + route.name + '"' +
        (routeShops.length > 0
          ? ' and all its ' + routeShops.length + ' registered shop(s)'
          : '') +
      '?\n\nThis will sync with the database immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Route',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await deleteRoute(route.id);
              setIsSubmitting(false);

              // Switch active route if current was deleted
              const remaining = routes.filter((r) => r.id !== route.id);
              if (remaining.length > 0) {
                onSelectRoute(remaining[0].id);
              } else {
                onSelectRoute('');
              }

              Alert.alert('Route Deleted', '"' + route.name + '" was removed successfully.');
            } catch (err: any) {
              setIsSubmitting(false);
              Alert.alert('Cannot Delete Route', err.message || 'Failed to delete route in database.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Manage Delivery Routes</Text>
              <Text style={styles.sub}>
                Add or delete routes ({routes.length} total active)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Add Route Bar */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="New Route Name (e.g. STATION ROAD)"
              placeholderTextColor="#9CA3AF"
              value={newRouteName}
              onChangeText={setNewRouteName}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.addBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleAdd}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addBtnText}>+ Add</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Routes List */}
          <Text style={styles.listHeader}>Available Routes:</Text>
          <FlatList
            data={routes}
            keyExtractor={(item) => item.id}
            style={styles.routeList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const shopCount = shops.filter((s) => s.route_id === item.id).length;
              const isSelected = item.id === selectedRouteId;

              return (
                <View style={[styles.routeRow, isSelected && styles.routeRowSelected]}>
                  <TouchableOpacity
                    style={styles.routeInfo}
                    onPress={() => {
                      onSelectRoute(item.id);
                    }}
                  >
                    <Text style={styles.routeNum}>{index + 1}.</Text>
                    <View>
                      <Text style={[styles.routeName, isSelected && styles.routeNameSelected]}>
                        {item.name} {isSelected && ' (Active)'}
                      </Text>
                      <Text style={styles.routeSub}>{shopCount} registered shops</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.delBtn}
                    onPress={() => handleDelete(item)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.delBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
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
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  close: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
    padding: 4,
  },
  sub: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: 2,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },
  routeList: {
    maxHeight: 260,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderRadius: 8,
  },
  routeRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  routeNum: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  routeNameSelected: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  routeSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  delBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  delBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
