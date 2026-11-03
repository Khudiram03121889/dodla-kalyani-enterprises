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
  Platform,
} from 'react-native';
import { useStore } from '../../context/StoreContext';
import { Category } from '../../types';

interface CategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  visible,
  onClose,
}) => {
  const { categories, products, addCategory, updateCategory, deleteCategory } = useStore();
  const [newCatName, setNewCatName] = useState('');
  const [newCatHsn, setNewCatHsn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatHsn, setEditingCatHsn] = useState('');

  const handleAddCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addCategory(trimmed, newCatHsn.trim() || undefined);
      setNewCatName('');
      setNewCatHsn('');
      setIsSubmitting(false);
      Alert.alert('Category Added', `"${trimmed}" has been created and synced with database.`);
    } catch (e: any) {
      setIsSubmitting(false);
      Alert.alert('Failed to Add', e.message || 'Error occurred while saving to database.');
    }
  };

  const startEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatHsn(cat.hsn_code || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCatId) return;
    const trimmed = editingCatName.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Category name cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateCategory(editingCatId, trimmed, editingCatHsn.trim());
      setEditingCatId(null);
      setEditingCatName('');
      setEditingCatHsn('');
      setIsSubmitting(false);
      Alert.alert('Success', `Category updated successfully.`);
    } catch (e: any) {
      setIsSubmitting(false);
      Alert.alert('Failed to Update', e.message || 'Error occurred while updating in database.');
    }
  };

  const handleDelete = (cat: Category) => {
    const linkedProducts = products.filter((p) => p.category_id === cat.id);
    const confirmMessage =
      linkedProducts.length > 0
        ? `"${cat.name}" has ${linkedProducts.length} product(s) in Godown inventory (including stock).\n\nDeleting this category will permanently delete all its products and their stock.\n\nAre you sure you want to proceed?`
        : `Are you sure you want to permanently delete "${cat.name}" from the database?`;

    const executeDelete = async () => {
      try {
        setIsSubmitting(true);
        await deleteCategory(cat.id);
        setIsSubmitting(false);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(`Category "${cat.name}" was removed successfully.`);
        } else {
          Alert.alert('Deleted', `Category "${cat.name}" was removed successfully.`);
        }
      } catch (err: any) {
        setIsSubmitting(false);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(err.message || 'Failed to delete category.');
        } else {
          Alert.alert('Cannot Delete Category', err.message || 'Failed to delete category.');
        }
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Delete Category',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: executeDelete,
          },
        ]
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Manage Categories</Text>
              <Text style={styles.sub}>
                Add, rename, or delete Godown categories ({categories.length} total)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Add Category Bar */}
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="Category Name..."
              placeholderTextColor="#9CA3AF"
              value={newCatName}
              onChangeText={setNewCatName}
            />
            <TextInput
              style={[styles.input, { flex: 1.2 }]}
              placeholder="HSN (e.g. 04012000)"
              placeholderTextColor="#9CA3AF"
              value={newCatHsn}
              onChangeText={setNewCatHsn}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[styles.addBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleAddCategory}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addBtnText}>+ Add</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Inline Edit Bar if editing */}
          {editingCatId && (
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Editing:</Text>
              <TextInput
                style={[styles.input, styles.editInput, { flex: 2 }]}
                value={editingCatName}
                onChangeText={setEditingCatName}
                placeholder="Category name"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />
              <TextInput
                style={[styles.input, styles.editInput, { flex: 1.2 }]}
                value={editingCatHsn}
                onChangeText={setEditingCatHsn}
                placeholder="HSN Code"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={styles.saveEditBtn}
                onPress={handleSaveEdit}
                disabled={isSubmitting}
              >
                <Text style={styles.saveEditBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={() => setEditingCatId(null)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelEditBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Existing Categories List */}
          <Text style={styles.listHeader}>Categories in Godown:</Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            style={styles.catList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const productCount = products.filter((p) => p.category_id === item.id).length;
              return (
                <View style={styles.catRow}>
                  <View style={styles.catInfo}>
                    <Text style={styles.catNum}>{index + 1}.</Text>
                    <View>
                      <Text style={styles.catName}>{item.name}</Text>
                      <Text style={styles.catSub}>
                        HSN: {item.hsn_code || '04012000'} • {productCount} item{productCount === 1 ? '' : 's'} assigned
                      </Text>
                    </View>
                  </View>

                  <View style={styles.catActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => startEdit(item)}
                    >
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.delBtn}
                      onPress={() => handleDelete(item)}
                    >
                      <Text style={styles.delBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
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
    marginBottom: 12,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  editInput: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
  },
  saveEditBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveEditBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelEditBtn: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelEditBtnText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    minWidth: 0,
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
  catList: {
    maxHeight: 260,
    marginBottom: 16,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  catInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catNum: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  catSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  catActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  editBtnText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  delBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
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
