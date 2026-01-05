import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {
  fetchAllServiceCategories,
  addServiceCategory,
  deleteServiceCategory,
  updateServiceCategory,
  ServiceCategory,
} from '../services/serviceCategoriesAdminService';

// Common Material Icons for service categories
const COMMON_ICONS = [
  'plumbing',
  'electrical-services',
  'carpenter',
  'ac-unit',
  'kitchen',
  'format-paint',
  'cleaning-services',
  'bug-report',
  'construction',
  'build',
  'handyman',
  'home',
  'room-service',
  'local-laundry-service',
  'garage',
];

const COMMON_COLORS = [
  '#3498db',
  '#f39c12',
  '#95a5a6',
  '#1abc9c',
  '#9b59b6',
  '#e74c3c',
  '#16a085',
  '#c0392b',
  '#7f8c8d',
  '#34495e',
  '#FF9500',
  '#4CAF50',
  '#2196F3',
  '#FF5722',
  '#9C27B0',
];

export default function AdminServiceCategoriesScreen({navigation}: any) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('handyman');
  const [color, setColor] = useState('#FF9500');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState('1');
  const [requiresVehicle, setRequiresVehicle] = useState(false);
  const [questionnaire, setQuestionnaire] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Track which modal to re-open after questionnaire editor
  const [pendingModalReopen, setPendingModalReopen] = useState<'add' | 'edit' | null>(null);

  // Custom alert modal state
  const [alertModal, setAlertModal] = useState({
    visible: false,
    type: 'info' as 'info' | 'success' | 'error' | 'confirm',
    title: '',
    message: '',
    buttons: [] as Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>,
  });

  const showAlert = (
    title: string,
    message: string,
    buttons?: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>,
    type: 'info' | 'success' | 'error' | 'confirm' = 'info'
  ) => {
    setAlertModal({
      visible: true,
      type,
      title,
      message,
      buttons: buttons || [{text: 'OK', onPress: () => setAlertModal(prev => ({...prev, visible: false}))}],
    });
  };

  const hideAlert = () => {
    setAlertModal(prev => ({...prev, visible: false}));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Handle navigation focus to re-open modal after returning from questionnaire editor
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (pendingModalReopen === 'add') {
        setShowAddModal(true);
        setPendingModalReopen(null);
      } else if (pendingModalReopen === 'edit') {
        setShowEditModal(true);
        setPendingModalReopen(null);
      }
    });

    return unsubscribe;
  }, [navigation, pendingModalReopen]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchAllServiceCategories();
      setCategories(data);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load service categories', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setName('');
    setIcon('handyman');
    setColor('#FF9500');
    setDescription('');
    setIsActive(true);
    setOrder(String(categories.length + 1));
    setRequiresVehicle(false);
    setQuestionnaire([]);
    setShowAddModal(true);
  };

  const handleEdit = (category: ServiceCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
    setColor(category.color);
    setDescription(category.description || '');
    setIsActive(category.isActive);
    setOrder(String(category.order));
    setRequiresVehicle(category.requiresVehicle || false);
    setQuestionnaire(category.questionnaire || []);
    setShowEditModal(true);
  };

  const handleDelete = (category: ServiceCategory) => {
    showAlert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel', onPress: hideAlert},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            hideAlert();
            try {
              await deleteServiceCategory(category.id);
              showAlert('Success', 'Category deleted successfully', undefined, 'success');
              loadCategories();
            } catch (error: any) {
              showAlert('Error', error.message || 'Failed to delete category', undefined, 'error');
            }
          },
        },
      ],
      'confirm'
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Error', 'Please enter a category name', undefined, 'error');
      return;
    }

    const orderNum = parseInt(order, 10);
    if (isNaN(orderNum) || orderNum < 1) {
      showAlert('Error', 'Please enter a valid order number (1 or higher)', undefined, 'error');
      return;
    }

    try {
      setSaving(true);
      const categoryData: any = {
        name: name.trim(),
        icon,
        color,
        description: description.trim() || undefined,
        isActive,
        order: orderNum,
        requiresVehicle,
      };

      // Only include questionnaire if it has questions, otherwise it will be deleted
      if (questionnaire.length > 0) {
        categoryData.questionnaire = questionnaire;
      } else {
        // Explicitly set to undefined so the service can delete the field
        categoryData.questionnaire = undefined;
      }

      if (showAddModal) {
        await addServiceCategory(categoryData);
        showAlert('Success', 'Category added successfully', undefined, 'success');
        setShowAddModal(false);
      } else if (editingCategory) {
        await updateServiceCategory(editingCategory.id, categoryData);
        showAlert('Success', 'Category updated successfully', undefined, 'success');
        setShowEditModal(false);
        setEditingCategory(null);
      }

      loadCategories();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save category', undefined, 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderCategory = ({item}: {item: ServiceCategory}) => {
    // Convert Date objects to ISO strings for navigation (fixes serialization warning)
    const serializableCategory = {
      ...item,
      createdAt: item.createdAt ? item.createdAt.toISOString() : undefined,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : undefined,
    };
    
    return (
      <TouchableOpacity
        style={[styles.categoryCard, {backgroundColor: theme.card}]}
        onPress={() => navigation.navigate('AdminServiceCategoryDetails', {category: serializableCategory})}
        activeOpacity={0.7}>
      <View style={styles.categoryHeader}>
        <View style={[styles.iconContainer, {backgroundColor: item.color + '20'}]}>
          <Icon name={item.icon} size={32} color={item.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, {color: theme.text}]}>{item.name}</Text>
          {item.description && (
            <Text style={[styles.categoryDescription, {color: theme.textSecondary}]}>
              {item.description}
            </Text>
          )}
          <View style={styles.categoryMeta}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, {color: theme.textSecondary}]}>
                Order: {item.order}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: item.isActive ? '#4CAF50' + '20' : '#ccc' + '20'},
                ]}>
                <Text
                  style={[
                    styles.statusText,
                    {color: item.isActive ? '#4CAF50' : theme.textSecondary},
                  ]}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              {item.questionnaire && item.questionnaire.length > 0 && (
                <View style={[styles.questionBadge, {backgroundColor: theme.primary + '20', borderColor: theme.primary}]}>
                  <Icon name="quiz" size={14} color={theme.primary} />
                  <Text style={[styles.questionBadgeText, {color: theme.primary}]}>
                    {item.questionnaire.length} {item.questionnaire.length === 1 ? 'Question' : 'Questions'}
                  </Text>
                </View>
              )}
              {item.requiresVehicle && (
                <View style={[styles.vehicleBadge, {backgroundColor: '#FF9500' + '20', borderColor: '#FF9500'}]}>
                  <Icon name="directions-car" size={14} color="#FF9500" />
                  <Text style={[styles.vehicleBadgeText, {color: '#FF9500'}]}>Vehicle Required</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.primary + '20'}]}
          onPress={(e) => {
            e.stopPropagation();
            handleEdit(item);
          }}>
          <Icon name="edit" size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: '#FF3B30' + '20'}]}
          onPress={(e) => {
            e.stopPropagation();
            handleDelete(item);
          }}>
          <Icon name="delete" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    );
  };

  const renderModal = () => {
    const isEdit = showEditModal;
    return (
      <Modal
        visible={showAddModal || showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingCategory(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                {isEdit ? 'Edit Category' : 'Add Category'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingCategory(null);
                }}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}>
              <Text style={[styles.label, {color: theme.text}]}>Name *</Text>
              <TextInput
                style={[styles.input, {backgroundColor: theme.background, color: theme.text}]}
                value={name}
                onChangeText={setName}
                placeholder="Category name"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.label, {color: theme.text}]}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconList}>
                {COMMON_ICONS.map(iconName => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconOption,
                      icon === iconName && {backgroundColor: theme.primary + '20', borderColor: theme.primary},
                    ]}
                    onPress={() => setIcon(iconName)}>
                    <Icon name={iconName} size={24} color={icon === iconName ? theme.primary : theme.textSecondary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, {color: theme.text}]}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorList}>
                {COMMON_COLORS.map(colorValue => (
                  <TouchableOpacity
                    key={colorValue}
                    style={[
                      styles.colorOption,
                      {backgroundColor: colorValue},
                      color === colorValue && styles.colorOptionSelected,
                    ]}
                    onPress={() => setColor(colorValue)}
                  />
                ))}
              </ScrollView>

              <Text style={[styles.label, {color: theme.text}]}>Description</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {backgroundColor: theme.background, color: theme.text},
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Category description (optional)"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.label, {color: theme.text}]}>Order *</Text>
              <TextInput
                style={[styles.input, {backgroundColor: theme.background, color: theme.text}]}
                value={order}
                onChangeText={setOrder}
                placeholder="Display order (1, 2, 3...)"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />

              <View style={styles.switchContainer}>
                <View style={styles.switchLabelContainer}>
                  <Text style={[styles.label, {color: theme.text, marginTop: 0}]}>Active Status</Text>
                  <Text style={[styles.switchSubtext, {color: theme.textSecondary}]}>
                    {isActive ? 'Category will be visible to users' : 'Category will be hidden'}
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{false: theme.border, true: theme.primary}}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.border}
                />
              </View>

              <View style={styles.switchContainer}>
                <View style={styles.switchLabelContainer}>
                  <Text style={[styles.label, {color: theme.text, marginTop: 0}]}>Requires Vehicle</Text>
                  <Text style={[styles.switchSubtext, {color: theme.textSecondary}]}>
                    {requiresVehicle ? 'Providers must have vehicle info' : 'No vehicle required'}
                  </Text>
                </View>
                <Switch
                  value={requiresVehicle}
                  onValueChange={setRequiresVehicle}
                  trackColor={{false: theme.border, true: theme.primary}}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.border}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.questionnaireSection}>
                <Text style={[styles.label, {color: theme.text}]}>Questionnaire</Text>
                <Text style={[styles.switchSubtext, {color: theme.textSecondary, marginBottom: 12}]}>
                  {questionnaire.length} {questionnaire.length === 1 ? 'question' : 'questions'} added
                </Text>
                <TouchableOpacity
                  style={[styles.addQuestionButton, {borderColor: theme.primary}]}
                  onPress={() => {
                    // Set pending modal reopen before navigating
                    setPendingModalReopen(isEdit ? 'edit' : 'add');

                    // Close current modal
                    setShowAddModal(false);
                    setShowEditModal(false);

                    // Navigate to questionnaire editor
                    navigation.navigate('AdminCategoryQuestionnaireEditor', {
                      categoryName: name || 'Category',
                      questionnaire: questionnaire,
                      onSave: (updatedQuestionnaire: any[]) => {
                        setQuestionnaire(updatedQuestionnaire);
                      },
                    });
                  }}>
                  <Icon name="add-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.addQuestionText, {color: theme.primary}]}>
                    {questionnaire.length > 0 ? 'Edit Questionnaire' : 'Add Questions'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, {borderColor: theme.border}]}
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingCategory(null);
                }}>
                <Text style={[styles.buttonText, {color: theme.text}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, {backgroundColor: theme.primary}]}
                onPress={handleSave}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonTextWhite}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
          Loading categories...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="category" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
              No service categories found
            </Text>
            <Text style={[styles.emptySubtext, {color: theme.textSecondary}]}>
              Tap the + button to add a new category
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, {backgroundColor: theme.primary}]}
        onPress={handleAdd}>
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {renderModal()}

      {/* Custom Alert Modal */}
      <Modal
        visible={alertModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideAlert}>
        <View style={styles.alertOverlay}>
          <View style={[styles.alertContainer, {backgroundColor: theme.card}]}>
            {/* Alert Icon */}
            <View style={[
              styles.alertIconContainer,
              {backgroundColor:
                alertModal.type === 'success' ? '#4CAF50' + '20' :
                alertModal.type === 'error' ? '#FF3B30' + '20' :
                alertModal.type === 'confirm' ? '#FF9500' + '20' :
                theme.primary + '20'
              }
            ]}>
              <Icon
                name={
                  alertModal.type === 'success' ? 'check-circle' :
                  alertModal.type === 'error' ? 'error' :
                  alertModal.type === 'confirm' ? 'warning' :
                  'info'
                }
                size={48}
                color={
                  alertModal.type === 'success' ? '#4CAF50' :
                  alertModal.type === 'error' ? '#FF3B30' :
                  alertModal.type === 'confirm' ? '#FF9500' :
                  theme.primary
                }
              />
            </View>

            {/* Alert Title */}
            <Text style={[styles.alertTitle, {color: theme.text}]}>
              {alertModal.title}
            </Text>

            {/* Alert Message */}
            <Text style={[styles.alertMessage, {color: theme.textSecondary}]}>
              {alertModal.message}
            </Text>

            {/* Alert Buttons */}
            <View style={styles.alertButtons}>
              {alertModal.buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertButton,
                    button.style === 'cancel' && {backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border},
                    button.style === 'destructive' && {backgroundColor: '#FF3B30'},
                    button.style === 'default' && {backgroundColor: theme.primary},
                    !button.style && {backgroundColor: theme.primary},
                  ]}
                  onPress={() => {
                    if (button.onPress) {
                      button.onPress();
                    } else {
                      hideAlert();
                    }
                  }}>
                  <Text
                    style={[
                      styles.alertButtonText,
                      button.style === 'cancel' && {color: theme.text},
                      (button.style === 'destructive' || button.style === 'default' || !button.style) && {color: '#fff'},
                    ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  categoryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  categoryMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
  },
  questionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
  },
  vehicleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    maxHeight: 400,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  iconList: {
    marginVertical: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorList: {
    marginVertical: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#000',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
    backgroundColor: 'transparent',
    flexShrink: 0,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  questionnaireSection: {
    marginBottom: 16,
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 8,
  },
  addQuestionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Custom Alert Modal Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  alertIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  alertButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

