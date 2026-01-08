import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import useTranslation from '../hooks/useTranslation';
import AlertModal from '../components/AlertModal';
import type {User} from '../types/consultation';

interface Customer extends User {
  role?: 'customer';
  phoneVerified?: boolean;
  secondaryPhone?: string;
  secondaryPhoneVerified?: boolean;
  homeAddress?: {
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  officeAddress?: {
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  savedAddresses?: Array<{
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
  }>;
}

interface JobCard {
  id: string;
  providerId: string;
  providerName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  problem?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  scheduledTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  customerAddress?: {
    address: string;
    city?: string;
    state?: string;
    pincode: string;
  };
}

export default function AdminCustomersListScreen({navigation}: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [customerJobCards, setCustomerJobCards] = useState<{[key: string]: JobCard[]}>({});
  const [loadingJobCards, setLoadingJobCards] = useState<{[key: string]: boolean}>({});
  const [expandedJobCards, setExpandedJobCards] = useState<string | null>(null);
  const {currentUser} = useStore();
  const {t} = useTranslation();
  
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    // SECURITY: Verify current user is admin
    if (currentUser?.role !== 'admin') {
      setAlertModal({
        visible: true,
        title: t('common.accessDenied'),
        message: t('common.onlyAdminAccess'),
        type: 'error',
      });
      navigation.goBack();
      return;
    }

    const unsubscribe = firestore()
      .collection('users')
      .where('role', '==', 'customer')
      .onSnapshot(
        snapshot => {
          const customersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
          })) as Customer[];

          setCustomers(customersList);
          setLoading(false);
        },
        error => {
          // If index doesn't exist, fallback to fetching all users and filtering
          console.warn('Index error, falling back to full query:', error);
          const fallbackUnsubscribe = firestore()
            .collection('users')
            .onSnapshot(
              snapshot => {
                const allUsers = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  createdAt: doc.data().createdAt?.toDate(),
                })) as Customer[];

                const customersList = allUsers.filter(user => user.role === 'customer');
                setCustomers(customersList);
                setLoading(false);
              },
              error => {
                setAlertModal({
                  visible: true,
                  title: t('common.error'),
                  message: t('customers.failedToLoad'),
                  type: 'error',
                });
                setLoading(false);
              },
            );
          return fallbackUnsubscribe;
        },
      );

    return () => unsubscribe();
  }, [currentUser, navigation]);

  // Fetch job cards when customer is expanded
  useEffect(() => {
    if (expandedCustomerId) {
      if (!customerJobCards[expandedCustomerId] && !loadingJobCards[expandedCustomerId]) {
        setLoadingJobCards(prev => ({...prev, [expandedCustomerId]: true}));
        const unsubscribe = firestore()
          .collection('jobCards')
          .where('customerId', '==', expandedCustomerId)
          .orderBy('createdAt', 'desc')
          .onSnapshot(
            snapshot => {
              const cardsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
                scheduledTime: doc.data().scheduledTime?.toDate(),
              })) as JobCard[];

              setCustomerJobCards(prev => ({...prev, [expandedCustomerId]: cardsList}));
              setLoadingJobCards(prev => ({...prev, [expandedCustomerId]: false}));
            },
            error => {
              console.error('Error loading job cards:', error);
              setCustomerJobCards(prev => ({...prev, [expandedCustomerId]: []}));
              setLoadingJobCards(prev => ({...prev, [expandedCustomerId]: false}));
            },
          );

        return () => unsubscribe();
      }
    }
  }, [expandedCustomerId]);

  const getStatusColor = (status: JobCard['status']) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'in-progress':
        return '#007AFF';
      case 'accepted':
        return '#FF9500';
      case 'cancelled':
        return '#FF3B30';
      case 'pending':
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (status: JobCard['status']) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'in-progress':
        return 'build';
      case 'accepted':
        return 'check';
      case 'cancelled':
        return 'cancel';
      case 'pending':
      default:
        return 'hourglass-empty';
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch =
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery);
    return matchesSearch;
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>{t('customers.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('customers.customerManagement')}</Text>
        <Text style={styles.headerSubtitle}>{t('customers.totalCustomers', {count: customers.length})}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('customers.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>
      </View>

      {/* Customers List */}
      <ScrollView style={styles.customersList}>
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>{t('customers.noCustomersFound')}</Text>
          </View>
        ) : (
          filteredCustomers.map(customer => {
            const isExpanded = expandedCustomerId === customer.id;
            return (
              <TouchableOpacity
                key={customer.id}
                style={styles.customerCard}
                onPress={() => setExpandedCustomerId(isExpanded ? null : customer.id)}
                activeOpacity={0.7}>
                <View style={styles.customerInfo}>
                  <View style={[styles.roleBadge, {backgroundColor: '#4A90E220'}]}>
                    <Icon name="person" size={20} color="#4A90E2" />
                  </View>
                  <View style={styles.customerDetails}>
                    <View style={styles.customerHeader}>
                      <Text style={styles.customerName}>{customer.name || t('customers.noName')}</Text>
                      <Icon
                        name={isExpanded ? "expand-less" : "expand-more"}
                        size={24}
                        color="#8E8E93"
                      />
                    </View>
                    
                    {/* Collapsed View - Show essential info */}
                    {!isExpanded && (
                      <>
                        {customer.email && (
                          <Text style={styles.customerEmail}>{customer.email}</Text>
                        )}
                        {customer.phone && (
                          <View style={styles.phoneRow}>
                            <Text style={styles.customerPhone}>{customer.phone}</Text>
                            <Icon
                              name={customer.phoneVerified ? "check-circle" : "cancel"}
                              size={16}
                              color={customer.phoneVerified ? "#4CAF50" : "#FF3B30"}
                              style={styles.verifiedIconInline}
                            />
                          </View>
                        )}
                        {customer.secondaryPhone && (
                          <View style={styles.phoneRow}>
                            <Text style={styles.customerPhone}>
                              {t('customers.secondary')}: {customer.secondaryPhone}
                            </Text>
                            {customer.secondaryPhoneVerified && (
                              <Icon
                                name="verified"
                                size={14}
                                color="#4CAF50"
                                style={styles.verifiedIconInline}
                              />
                            )}
                          </View>
                        )}
                        {customer.homeAddress && (
                          <Text style={styles.customerAddress} numberOfLines={1}>
                            Home: {customer.homeAddress.address}
                          </Text>
                        )}
                        {customer.officeAddress && (
                          <Text style={styles.customerAddress} numberOfLines={1}>
                            Office: {customer.officeAddress.address}
                          </Text>
                        )}
                        {!customer.homeAddress && !customer.officeAddress && customer.savedAddresses && customer.savedAddresses.length > 0 && (
                          <Text style={styles.customerAddress} numberOfLines={1}>
                            {customer.savedAddresses[0].address}
                          </Text>
                        )}
                      </>
                    )}

                    {/* Expanded View - Show all details */}
                    {isExpanded && (
                      <>
                        {customer.email && (
                          <View style={styles.detailRow}>
                            <Icon name="email" size={16} color="#8E8E93" />
                            <Text style={styles.detailText}>{customer.email}</Text>
                          </View>
                        )}
                        {customer.phone && (
                          <View style={styles.detailRow}>
                            <Icon name="phone" size={16} color="#8E8E93" />
                            <Text style={styles.detailText}>{customer.phone}</Text>
                            <Icon
                              name={customer.phoneVerified ? "check-circle" : "cancel"}
                              size={16}
                              color={customer.phoneVerified ? "#4CAF50" : "#FF3B30"}
                              style={styles.verifiedIconInline}
                            />
                          </View>
                        )}
                        {customer.secondaryPhone && (
                          <View style={styles.detailRow}>
                            <Icon name="phone" size={16} color="#8E8E93" />
                            <Text style={styles.detailText}>
                              {t('customers.secondary')}: {customer.secondaryPhone}
                            </Text>
                            {customer.secondaryPhoneVerified && (
                              <Icon
                                name="verified"
                                size={14}
                                color="#4CAF50"
                                style={styles.verifiedIconInline}
                              />
                            )}
                          </View>
                        )}
                        {customer.homeAddress && (
                          <View style={styles.detailRow}>
                            <Icon name="home" size={16} color="#8E8E93" />
                            <Text style={styles.detailText}>
                              {t('customers.home')}: {customer.homeAddress.address}
                              {customer.homeAddress.city && `, ${customer.homeAddress.city}`}
                              {customer.homeAddress.pincode && ` - ${customer.homeAddress.pincode}`}
                            </Text>
                          </View>
                        )}
                        {customer.officeAddress && (
                          <View style={styles.detailRow}>
                            <Icon name="business" size={16} color="#8E8E93" />
                            <Text style={styles.detailText}>
                              {t('customers.office')}: {customer.officeAddress.address}
                              {customer.officeAddress.city && `, ${customer.officeAddress.city}`}
                              {customer.officeAddress.pincode && ` - ${customer.officeAddress.pincode}`}
                            </Text>
                          </View>
                        )}
                        {customer.savedAddresses && customer.savedAddresses.length > 0 && (
                          <View style={styles.detailRow}>
                            <Icon name="location-on" size={16} color="#8E8E93" />
                            <Text style={styles.detailText}>
                              {customer.savedAddresses.length} saved address(es)
                            </Text>
                          </View>
                        )}
                        {customer.createdAt && (
                          <View style={styles.detailRow}>
                            <Icon name="calendar-today" size={16} color="#8E8E93" />
                            <Text style={styles.detailText}>
                              Joined: {customer.createdAt.toLocaleDateString()}
                            </Text>
                          </View>
                        )}

                        {/* Job Cards Section */}
                        <View style={styles.jobCardsSection}>
                          <TouchableOpacity
                            style={styles.jobCardsHeader}
                            onPress={() => setExpandedJobCards(
                              expandedJobCards === customer.id ? null : customer.id
                            )}
                            activeOpacity={0.7}>
                            <View style={styles.jobCardsHeaderLeft}>
                              <Icon name="work" size={18} color="#FF9500" />
                              <Text style={styles.jobCardsTitle}>
                                {t('customers.jobCards')} ({customerJobCards[customer.id]?.length || 0})
                              </Text>
                            </View>
                            <Icon
                              name={expandedJobCards === customer.id ? "expand-less" : "expand-more"}
                              size={24}
                              color="#8E8E93"
                            />
                          </TouchableOpacity>

                          {expandedJobCards === customer.id && (
                            <View style={styles.jobCardsList}>
                              {loadingJobCards[customer.id] ? (
                                <View style={styles.jobCardsLoading}>
                                  <ActivityIndicator size="small" color="#FF9500" />
                                  <Text style={styles.jobCardsLoadingText}>{t('jobCards.loading')}</Text>
                                </View>
                              ) : customerJobCards[customer.id]?.length > 0 ? (
                                customerJobCards[customer.id].map(jobCard => {
                                  const statusColor = getStatusColor(jobCard.status);
                                  const statusIcon = getStatusIcon(jobCard.status);
                                  return (
                                    <View key={jobCard.id} style={styles.jobCardItem}>
                                      <View style={styles.jobCardHeader}>
                                        <View style={styles.jobCardHeaderLeft}>
                                          <Text style={styles.jobCardServiceType}>
                                            {jobCard.serviceType}
                                          </Text>
                                          <View style={[styles.jobCardStatusBadge, {backgroundColor: statusColor + '20'}]}>
                                            <Icon name={statusIcon} size={14} color={statusColor} />
                                            <Text style={[styles.jobCardStatusText, {color: statusColor}]}>
                                              {jobCard.status === 'in-progress' ? t('jobCards.inProgress') : t(`jobCards.${jobCard.status}`)}
                                            </Text>
                                          </View>
                                        </View>
                                      </View>
                                      {jobCard.providerName && (
                                        <Text style={styles.jobCardDetail}>
                                          {t('jobCards.providerName')}: {jobCard.providerName}
                                        </Text>
                                      )}
                                      {jobCard.problem && (
                                        <Text style={styles.jobCardDetail}>
                                          {t('jobCards.problem')}: {jobCard.problem}
                                        </Text>
                                      )}
                                      {jobCard.customerAddress && (
                                        <Text style={styles.jobCardDetail}>
                                          {t('customers.address')}: {jobCard.customerAddress.address}
                                          {jobCard.customerAddress.city && `, ${jobCard.customerAddress.city}`}
                                          {jobCard.customerAddress.pincode && ` - ${jobCard.customerAddress.pincode}`}
                                        </Text>
                                      )}
                                      {jobCard.createdAt && (
                                        <Text style={styles.jobCardDate}>
                                          {t('jobCards.created')}: {jobCard.createdAt.toLocaleDateString()} {jobCard.createdAt.toLocaleTimeString()}
                                        </Text>
                                      )}
                                    </View>
                                  );
                                })
                              ) : (
                                <Text style={styles.jobCardsEmpty}>{t('jobCards.noJobCards')}</Text>
                              )}
                            </View>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({visible: false, title: '', message: '', type: 'info'})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  customersList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#8E8E93',
  },
  customerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  roleBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  customerEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 6,
  },
  customerAddress: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  verifiedIconInline: {
    marginLeft: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    flex: 1,
  },
  jobCardsSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  jobCardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobCardsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobCardsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  jobCardsList: {
    marginTop: 8,
  },
  jobCardsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'center',
  },
  jobCardsLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8E8E93',
  },
  jobCardsEmpty: {
    padding: 12,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  jobCardItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  jobCardServiceType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  jobCardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  jobCardStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobCardDetail: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  jobCardDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

