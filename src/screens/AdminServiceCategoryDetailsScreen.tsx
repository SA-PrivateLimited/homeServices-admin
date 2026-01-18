import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {ServiceCategory, QuestionnaireQuestion} from '../services/serviceCategoriesAdminService';

interface Provider {
  id: string;
  name: string;
  serviceType?: string;
  specialization?: string;
  email: string;
  phone: string;
  experience?: number;
  profileImage?: string;
  verified?: boolean;
  approved?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rating?: number;
  // Vehicle info for drivers
  vehicleInfo?: {
    make?: string;
    model?: string;
    year?: string;
    plateNumber?: string;
    color?: string;
    type?: string; // car, bike, van, etc.
  };
}

interface AdminServiceCategoryDetailsScreenProps {
  route: {
    params: {
      category: ServiceCategory;
    };
  };
  navigation: any;
}

export default function AdminServiceCategoryDetailsScreen({
  route,
  navigation,
}: AdminServiceCategoryDetailsScreenProps) {
  const {category: categoryParam} = route.params;
  // Convert ISO strings back to Date objects if needed
  const category: ServiceCategory = {
    ...categoryParam,
    createdAt: categoryParam.createdAt ? (typeof categoryParam.createdAt === 'string' ? new Date(categoryParam.createdAt) : categoryParam.createdAt) : undefined,
    updatedAt: categoryParam.updatedAt ? (typeof categoryParam.updatedAt === 'string' ? new Date(categoryParam.updatedAt) : categoryParam.updatedAt) : undefined,
  };
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, [category?.name, category?.id]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      
      // Query providers by serviceType (new field)
      const serviceTypeSnapshot = await firestore()
        .collection('providers')
        .where('serviceType', '==', category.name)
        .get();

      // Also query by specialization (legacy field)
      const specializationSnapshot = await firestore()
        .collection('providers')
        .where('specialization', '==', category.name)
        .get();

      // Combine results and remove duplicates
      const allProviderIds = new Set<string>();
      const providersMap = new Map<string, Provider>();

      serviceTypeSnapshot.docs.forEach(doc => {
        allProviderIds.add(doc.id);
        providersMap.set(doc.id, {
          id: doc.id,
          ...doc.data(),
        } as Provider);
      });

      specializationSnapshot.docs.forEach(doc => {
        if (!allProviderIds.has(doc.id)) {
          allProviderIds.add(doc.id);
          providersMap.set(doc.id, {
            id: doc.id,
            ...doc.data(),
          } as Provider);
        }
      });

      const providersList = Array.from(providersMap.values());
      setProviders(providersList);
    } catch (error: any) {
      console.error('Error loading providers:', error);
      // Set empty array on error to stop loading state
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return 'text-fields';
      case 'number':
        return 'numbers';
      case 'select':
        return 'list';
      case 'multiselect':
        return 'checklist';
      case 'boolean':
        return 'toggle-on';
      default:
        return 'help';
    }
  };

  const renderQuestionnaireSection = () => {
    if (!category.questionnaire || category.questionnaire.length === 0) {
      return (
        <View style={[styles.section, {backgroundColor: theme.card}]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>Questionnaire</Text>
          <View style={styles.emptyState}>
            <Icon name="quiz" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
              No questionnaire defined for this category
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.section, {backgroundColor: theme.card}]}>
        <View style={styles.sectionHeader}>
          <Icon name="quiz" size={24} color={theme.primary} />
          <Text style={[styles.sectionTitle, {color: theme.text}]}>Questionnaire</Text>
          <View style={[styles.badge, {backgroundColor: theme.primary + '20'}]}>
            <Text style={[styles.badgeText, {color: theme.primary}]}>
              {category.questionnaire.length} {category.questionnaire.length === 1 ? 'Question' : 'Questions'}
            </Text>
          </View>
        </View>
        {category.questionnaire.map((question, index) => (
          <View key={question.id} style={[styles.questionCard, {backgroundColor: theme.background}]}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumber}>
                <Text style={[styles.questionNumberText, {color: theme.primary}]}>{index + 1}</Text>
              </View>
              <View style={styles.questionContent}>
                <Text style={[styles.questionText, {color: theme.text}]}>
                  {question.question}
                  {question.required && <Text style={styles.required}> *</Text>}
                </Text>
                {question.questionHi && (
                  <Text style={[styles.questionTextHi, {color: theme.textSecondary}]}>
                    (Hindi) {question.questionHi}
                  </Text>
                )}
                <View style={styles.questionMeta}>
                  <View style={[styles.typeBadge, {backgroundColor: category.color + '20'}]}>
                    <Icon name={getQuestionTypeIcon(question.type)} size={14} color={category.color} />
                    <Text style={[styles.typeText, {color: category.color}]}>{question.type}</Text>
                  </View>
                  {question.required && (
                    <View style={[styles.requiredBadge, {backgroundColor: '#FF3B30' + '20'}]}>
                      <Text style={[styles.requiredText, {color: '#FF3B30'}]}>Required</Text>
                    </View>
                  )}
                </View>
                {(question.placeholder || question.placeholderHi) && (
                  <View style={styles.placeholderContainer}>
                    {question.placeholder && (
                      <Text style={[styles.placeholder, {color: theme.textSecondary}]}>
                        Placeholder (EN): {question.placeholder}
                      </Text>
                    )}
                    {question.placeholderHi && (
                      <Text style={[styles.placeholder, {color: theme.textSecondary}]}>
                        Placeholder (HI): {question.placeholderHi}
                      </Text>
                    )}
                  </View>
                )}
                {(question.options && question.options.length > 0) || (question.optionsHi && question.optionsHi.length > 0) ? (
                  <View style={styles.optionsList}>
                    <Text style={[styles.optionsLabel, {color: theme.textSecondary}]}>Options (English):</Text>
                    {question.options?.map((option, optIdx) => (
                      <View key={optIdx} style={styles.optionItem}>
                        <Icon name="radio-button-checked" size={12} color={theme.textSecondary} />
                        <Text style={[styles.optionText, {color: theme.text}]}>
                          {option}
                          {question.optionsHi?.[optIdx] && (
                            <Text style={[styles.optionTextHi, {color: theme.textSecondary}]}>
                              {' '}({question.optionsHi[optIdx]})
                            </Text>
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderProviderCard = ({item}: {item: Provider}) => (
    <TouchableOpacity
      style={[styles.providerCard, {backgroundColor: theme.background}]}
      onPress={() => {
        // Navigate to provider details
        // Convert provider object to plain object for navigation (fixes serialization warning)
        const plainProvider = {
          id: item.id,
          name: item.name,
          email: item.email,
          phone: item.phone,
          specialization: item.specialization || item.serviceType,
          experience: item.experience,
          profileImage: item.profileImage,
          approvalStatus: item.approvalStatus,
          rating: item.rating,
          vehicleInfo: item.vehicleInfo,
        };
        navigation.navigate('ProviderDetails', {provider: plainProvider});
      }}>
      <View style={styles.providerHeader}>
        {item.profileImage ? (
          <Image source={{uri: item.profileImage}} style={styles.providerImage} />
        ) : (
          <View style={[styles.providerImagePlaceholder, {backgroundColor: category.color + '20'}]}>
            <Icon name="person" size={32} color={category.color} />
          </View>
        )}
        <View style={styles.providerInfo}>
          <Text style={[styles.providerName, {color: theme.text}]}>{item.name}</Text>
          <View style={styles.providerMeta}>
            <Icon name="email" size={14} color={theme.textSecondary} />
            <Text style={[styles.providerMetaText, {color: theme.textSecondary}]}>{item.email}</Text>
          </View>
          <View style={styles.providerMeta}>
            <Icon name="phone" size={14} color={theme.textSecondary} />
            <Text style={[styles.providerMetaText, {color: theme.textSecondary}]}>{item.phone}</Text>
          </View>
          {item.experience !== undefined && (
            <View style={styles.providerMeta}>
              <Icon name="work" size={14} color={theme.textSecondary} />
              <Text style={[styles.providerMetaText, {color: theme.textSecondary}]}>
                {item.experience} {item.experience === 1 ? 'year' : 'years'} experience
              </Text>
            </View>
          )}
        </View>
        <View style={styles.providerStatus}>
          {item.approvalStatus === 'approved' && (
            <View style={[styles.statusBadge, {backgroundColor: '#34C759' + '20'}]}>
              <Icon name="check-circle" size={16} color="#34C759" />
            </View>
          )}
          {item.approvalStatus === 'pending' && (
            <View style={[styles.statusBadge, {backgroundColor: '#FF9500' + '20'}]}>
              <Icon name="pending" size={16} color="#FF9500" />
            </View>
          )}
          {item.approvalStatus === 'rejected' && (
            <View style={[styles.statusBadge, {backgroundColor: '#FF3B30' + '20'}]}>
              <Icon name="cancel" size={16} color="#FF3B30" />
            </View>
          )}
          {item.rating !== undefined && item.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={16} color="#FFD700" />
              <Text style={[styles.ratingText, {color: theme.text}]}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Vehicle info for drivers */}
      {category.requiresVehicle && item.vehicleInfo && (
        <View style={[styles.vehicleInfo, {backgroundColor: theme.card}]}>
          <View style={styles.vehicleHeader}>
            <Icon name="directions-car" size={20} color={category.color} />
            <Text style={[styles.vehicleTitle, {color: theme.text}]}>Vehicle Information</Text>
          </View>
          <View style={styles.vehicleDetails}>
            {item.vehicleInfo.make && (
              <View style={styles.vehicleDetailRow}>
                <Text style={[styles.vehicleLabel, {color: theme.textSecondary}]}>Make:</Text>
                <Text style={[styles.vehicleValue, {color: theme.text}]}>{item.vehicleInfo.make}</Text>
              </View>
            )}
            {item.vehicleInfo.model && (
              <View style={styles.vehicleDetailRow}>
                <Text style={[styles.vehicleLabel, {color: theme.textSecondary}]}>Model:</Text>
                <Text style={[styles.vehicleValue, {color: theme.text}]}>{item.vehicleInfo.model}</Text>
              </View>
            )}
            {item.vehicleInfo.year && (
              <View style={styles.vehicleDetailRow}>
                <Text style={[styles.vehicleLabel, {color: theme.textSecondary}]}>Year:</Text>
                <Text style={[styles.vehicleValue, {color: theme.text}]}>{item.vehicleInfo.year}</Text>
              </View>
            )}
            {item.vehicleInfo.plateNumber && (
              <View style={styles.vehicleDetailRow}>
                <Text style={[styles.vehicleLabel, {color: theme.textSecondary}]}>Plate:</Text>
                <Text style={[styles.vehicleValue, {color: theme.text}]}>{item.vehicleInfo.plateNumber}</Text>
              </View>
            )}
            {item.vehicleInfo.color && (
              <View style={styles.vehicleDetailRow}>
                <Text style={[styles.vehicleLabel, {color: theme.textSecondary}]}>Color:</Text>
                <Text style={[styles.vehicleValue, {color: theme.text}]}>{item.vehicleInfo.color}</Text>
              </View>
            )}
            {item.vehicleInfo.type && (
              <View style={styles.vehicleDetailRow}>
                <Text style={[styles.vehicleLabel, {color: theme.textSecondary}]}>Type:</Text>
                <Text style={[styles.vehicleValue, {color: theme.text}]}>{item.vehicleInfo.type}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderProvidersSection = () => {
    return (
      <View style={[styles.section, {backgroundColor: theme.card}]}>
        <View style={styles.sectionHeader}>
          <Icon name="people" size={24} color={theme.primary} />
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            {category.name} Providers
          </Text>
          <View style={[styles.badge, {backgroundColor: theme.primary + '20'}]}>
            <Text style={[styles.badgeText, {color: theme.primary}]}>
              {providers.length}
            </Text>
          </View>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
              Loading providers...
            </Text>
          </View>
        ) : providers.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="person-off" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
              No providers found for this category
            </Text>
          </View>
        ) : (
          <FlatList
            data={providers}
            renderItem={renderProviderCard}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Category Header */}
        <View style={[styles.categoryHeader, {backgroundColor: category.color}]}>
          <View style={styles.categoryIconContainer}>
            <Icon name={category.icon} size={48} color="#fff" />
          </View>
          <Text style={styles.categoryName}>{category.name}</Text>
          {category.description && (
            <Text style={styles.categoryDescription}>{category.description}</Text>
          )}
          {category.requiresVehicle && (
            <View style={styles.vehicleBadge}>
              <Icon name="directions-car" size={16} color="#fff" />
              <Text style={styles.vehicleBadgeText}>Requires Vehicle</Text>
            </View>
          )}
        </View>

        {/* Questionnaire Section */}
        {renderQuestionnaireSection()}

        {/* Providers Section */}
        {renderProvidersSection()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  categoryHeader: {
    padding: 24,
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  categoryDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  vehicleBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  questionCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'currentColor',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 22,
  },
  questionTextHi: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  required: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  placeholderContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  questionMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '600',
  },
  placeholder: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  optionsList: {
    marginTop: 8,
  },
  optionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 13,
  },
  optionTextHi: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  providerCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  providerImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  providerImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    gap: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerMetaText: {
    fontSize: 12,
  },
  providerStatus: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleInfo: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  vehicleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleDetails: {
    gap: 6,
  },
  vehicleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleLabel: {
    fontSize: 13,
  },
  vehicleValue: {
    fontSize: 13,
    fontWeight: '500',
  },
});
