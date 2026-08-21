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
  const { categories, addCategory, deleteCategory } = useStore();
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addCategory(newCatName.trim());
      setNewCatName('');
      setIsSubmitting(false);
    } catch (e) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to add category.');
    }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(cat.id);
            } catch (err: any) {
              Alert.alert('Cannot Delete Category', err.message || 'Failed to delete category.');
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
            <Text style={styles.title}>Manage Categories</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sub}>
            Create and organize product categories in your Godown (e.g. Milk & Curd, Ghee & Butter, Sweets).
          </Text>

          {/* Add Category Bar */}
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="New Category Name (e.g. Dodla Sweets)"
              placeholderTextColor="#9CA3AF"
              value={newCatName}
              onChangeText={setNewCatName}
            />
            <TouchableOpacity
              style={[styles.addBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleAddCategory}
              disabled={isSubmitting}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {/* Existing Categories List */}
          <Text style={styles.listHeader}>Current Categories ({categories.length}):</Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            style={styles.catList}
            renderItem={({ item, index }) => (
              <View style={styles.catRow}>
                <View style={styles.catInfo}>
                  <Text style={styles.catNum}>{index + 1}.</Text>
                  <Text style={styles.catName}>{item.name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.delBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.delBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close</Text>
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
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
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
    marginBottom: 16,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
    maxHeight: 250,
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
    gap: 8,
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
  delBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  delBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
});
