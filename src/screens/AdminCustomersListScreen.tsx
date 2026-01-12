import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import type {User} from '../types/consultation';

interface CustomerAddress {
  address: string;
  city?: string;
  state?: string;
  pincode: string;
  verified?: boolean;
  type?: 'home' | 'office';
  latitude?: number;
  longitude?: number;
}

interface Customer extends User {
  role?: 'customer';
  phoneVerified?: boolean;
  secondaryPhone?: string;
  secondaryPhoneVerified?: boolean;
  address?: CustomerAddress;
  homeAddress?: CustomerAddress;
  officeAddress?: CustomerAddress;
  savedAddresses?: CustomerAddress[];
  documents?: {
    idProof?: string;
    addressProof?: string;
    certificate?: string;
    [key: string]: string | undefined;
  };
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
  const [expandedJobCards, setExpandedJobCards] = useState<Set<string>>(new Set());
  const [customerJobCards, setCustomerJobCards] = useState<{[customerId: string]: JobCard[]}>({});
  const [loadingJobCards, setLoadingJobCards] = useState<{[customerId: string]: boolean}>({});
  const {currentUser} = useStore();

  useEffect(() => {
    // SECURITY: Verify current user is admin
    if (currentUser?.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can access this screen.');
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
                Alert.alert('Error', 'Failed to load customers. Please try again.');
                setLoading(false);
              },
            );
          return fallbackUnsubscribe;
        },
      );

    return () => unsubscribe();
  }, [currentUser, navigation]);

  const loadJobCards = async (customerId: string) => {
    if (customerJobCards[customerId]) {
      return; // Already loaded
    }

    setLoadingJobCards(prev => ({...prev, [customerId]: true}));
    try {
      const snapshot = await firestore()
        .collection('jobCards')
        .where('customerId', '==', customerId)
        .get();

      const cards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        scheduledTime: doc.data().scheduledTime?.toDate(),
      })) as JobCard[];

      // Sort by createdAt descending
      cards.sort((a, b) => {
        const dateA = a.createdAt.getTime();
        const dateB = b.createdAt.getTime();
        return dateB - dateA;
      });

      setCustomerJobCards(prev => ({...prev, [customerId]: cards}));
    } catch (error) {
      console.error('Error loading job cards:', error);
    } finally {
      setLoadingJobCards(prev => ({...prev, [customerId]: false}));
    }
  };

  const toggleCustomerExpansion = (customerId: string) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
      setExpandedJobCards(new Set());
    } else {
      setExpandedCustomerId(customerId);
      loadJobCards(customerId);
    }
  };

  const toggleJobCardsExpansion = (customerId: string) => {
    const newExpanded = new Set(expandedJobCards);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedJobCards(newExpanded);
  };

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

  const renderJobCard = (jobCard: JobCard) => {
    const statusColor = getStatusColor(jobCard.status);
    const statusIcon = getStatusIcon(jobCard.status);

    return (
      <View key={jobCard.id} style={styles.jobCard}>
        <View style={styles.jobCardHeader}>
          <View style={styles.jobCardInfo}>
            <Text style={styles.jobCardService}>{jobCard.serviceType}</Text>
            <Text style={styles.jobCardProvider}>
              <Icon name="handyman" size={14} color="#666" /> {jobCard.providerName}
            </Text>
          </View>
          <View style={[styles.jobCardStatusBadge, {backgroundColor: statusColor + '20'}]}>
            <Icon name={statusIcon} size={14} color={statusColor} />
            <Text style={[styles.jobCardStatusText, {color: statusColor}]}>
              {jobCard.status === 'in-progress' ? 'In Progress' : jobCard.status.charAt(0).toUpperCase() + jobCard.status.slice(1)}
            </Text>
          </View>
        </View>
        
        {jobCard.problem && (
          <Text style={styles.jobCardProblem} numberOfLines={2}>
            {jobCard.problem}
          </Text>
        )}
        
        <View style={styles.jobCardMeta}>
          <Text style={styles.jobCardDate}>
            Created: {jobCard.createdAt.toLocaleDateString()} {jobCard.createdAt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
          </Text>
        </View>
      </View>
    );
  };

  const renderCustomerCard = (customer: Customer) => {
    const isExpanded = expandedCustomerId === customer.id;
    const jobCards = customerJobCards[customer.id] || [];
    const isJobCardsExpanded = expandedJobCards.has(customer.id);
    const isLoadingJobCards = loadingJobCards[customer.id];

    return (
      <View key={customer.id} style={styles.customerCard}>
        {/* Customer Header - Always Visible */}
        <TouchableOpacity
          style={styles.customerHeader}
          onPress={() => toggleCustomerExpansion(customer.id)}
          activeOpacity={0.7}>
          <View style={styles.customerInfo}>
            <View style={[styles.roleBadge, {backgroundColor: '#4A90E220'}]}>
              <Icon name="person" size={20} color="#4A90E2" />
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{customer.name || 'No name'}</Text>
              
              {customer.email && (
                <View style={styles.infoRow}>
                  <Icon name="email" size={14} color="#8E8E93" />
                  <Text style={styles.customerInfoText}>{customer.email}</Text>
                </View>
              )}
              
              {customer.phone && (
                <View style={styles.infoRow}>
                  <Icon name="phone" size={14} color="#8E8E93" />
                  <Text style={styles.customerInfoText}>{customer.phone}</Text>
                  <Icon
                    name={customer.phoneVerified ? "check-circle" : "cancel"}
                    size={14}
                    color={customer.phoneVerified ? "#4CAF50" : "#FF3B30"}
                    style={styles.verifiedIconInline}
                  />
                </View>
              )}
              
              {(() => {
                // Show home address first, then office address
                const homeAddr = customer.homeAddress || (customer.savedAddresses?.find(addr => addr.type === 'home'));
                const officeAddr = customer.officeAddress || (customer.savedAddresses?.find(addr => addr.type === 'office'));
                const defaultAddr = customer.address;
                
                return (
                  <>
                    {homeAddr && (
                      <View style={styles.infoRow}>
                        <Icon name="home" size={14} color="#8E8E93" />
                        <Text style={styles.customerInfoText} numberOfLines={1}>
                          Home: {homeAddr.address}
                          {homeAddr.city && `, ${homeAddr.city}`}
                          {homeAddr.pincode && ` - ${homeAddr.pincode}`}
                        </Text>
                      </View>
                    )}
                    {officeAddr && (
                      <View style={styles.infoRow}>
                        <Icon name="business" size={14} color="#8E8E93" />
                        <Text style={styles.customerInfoText} numberOfLines={1}>
                          Office: {officeAddr.address}
                          {officeAddr.city && `, ${officeAddr.city}`}
                          {officeAddr.pincode && ` - ${officeAddr.pincode}`}
                        </Text>
                      </View>
                    )}
                    {defaultAddr && !homeAddr && !officeAddr && (
                      <View style={styles.infoRow}>
                        <Icon name="location-on" size={14} color="#8E8E93" />
                        <Text style={styles.customerInfoText} numberOfLines={1}>
                          {defaultAddr.address}
                          {defaultAddr.city && `, ${defaultAddr.city}`}
                          {defaultAddr.pincode && ` - ${defaultAddr.pincode}`}
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </View>
          <Icon
            name={isExpanded ? "expand-less" : "expand-more"}
            size={24}
            color="#8E8E93"
          />
        </TouchableOpacity>

        {/* Expanded Customer Details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Customer Information */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Customer Information</Text>
              
              <View style={styles.detailRow}>
                <Icon name="fingerprint" size={16} color="#666" style={styles.detailIcon} />
                <Text style={styles.detailLabel}>ID:</Text>
                <Text style={styles.detailValue}>{customer.id}</Text>
              </View>

              {customer.email && (
                <View style={styles.detailRow}>
                  <Icon name="email" size={16} color="#666" style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{customer.email}</Text>
                </View>
              )}

              {customer.secondaryPhone && (
                <View style={styles.detailRow}>
                  <Icon name="phone" size={16} color="#666" style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>Secondary Phone:</Text>
                  <View style={styles.verifiedRow}>
                    <Text style={styles.detailValue}>{customer.secondaryPhone}</Text>
                    {customer.secondaryPhoneVerified && (
                      <Icon name="verified" size={14} color="#4CAF50" style={styles.verifiedIcon} />
                    )}
                  </View>
                </View>
              )}

              {(() => {
                const homeAddr = customer.homeAddress || (customer.savedAddresses?.find(addr => addr.type === 'home'));
                const officeAddr = customer.officeAddress || (customer.savedAddresses?.find(addr => addr.type === 'office'));
                const defaultAddr = customer.address;
                
                return (
                  <>
                    {homeAddr && (
                      <View style={styles.detailRow}>
                        <Icon name="home" size={16} color="#666" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Home Address:</Text>
                        <View style={styles.addressContainer}>
                          <Text style={styles.detailValue}>
                            {homeAddr.address}
                            {homeAddr.city && `, ${homeAddr.city}`}
                            {homeAddr.state && `, ${homeAddr.state}`}
                            {homeAddr.pincode && ` - ${homeAddr.pincode}`}
                          </Text>
                          {homeAddr.verified && (
                            <View style={styles.verifiedBadge}>
                              <Icon name="verified" size={10} color="#4CAF50" />
                              <Text style={styles.verifiedBadgeText}>Verified</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                    
                    {officeAddr && (
                      <View style={styles.detailRow}>
                        <Icon name="business" size={16} color="#666" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Office Address:</Text>
                        <View style={styles.addressContainer}>
                          <Text style={styles.detailValue}>
                            {officeAddr.address}
                            {officeAddr.city && `, ${officeAddr.city}`}
                            {officeAddr.state && `, ${officeAddr.state}`}
                            {officeAddr.pincode && ` - ${officeAddr.pincode}`}
                          </Text>
                          {officeAddr.verified && (
                            <View style={styles.verifiedBadge}>
                              <Icon name="verified" size={10} color="#4CAF50" />
                              <Text style={styles.verifiedBadgeText}>Verified</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                    
                    {defaultAddr && !homeAddr && !officeAddr && (
                      <View style={styles.detailRow}>
                        <Icon name="location-on" size={16} color="#666" style={styles.detailIcon} />
                        <Text style={styles.detailLabel}>Address:</Text>
                        <View style={styles.addressContainer}>
                          <Text style={styles.detailValue}>
                            {defaultAddr.address}
                            {defaultAddr.city && `, ${defaultAddr.city}`}
                            {defaultAddr.state && `, ${defaultAddr.state}`}
                            {defaultAddr.pincode && ` - ${defaultAddr.pincode}`}
                          </Text>
                          {defaultAddr.verified && (
                            <View style={styles.verifiedBadge}>
                              <Icon name="verified" size={10} color="#4CAF50" />
                              <Text style={styles.verifiedBadgeText}>Verified</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </>
                );
              })()}

              {customer.location && (
                <>
                  {customer.location.pincode && (
                    <View style={styles.detailRow}>
                      <Icon name="pin" size={16} color="#666" style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Pincode:</Text>
                      <Text style={styles.detailValue}>{customer.location.pincode}</Text>
                    </View>
                  )}
                  {customer.location.city && (
                    <View style={styles.detailRow}>
                      <Icon name="location-city" size={16} color="#666" style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>City:</Text>
                      <Text style={styles.detailValue}>{customer.location.city}</Text>
                    </View>
                  )}
                </>
              )}

              {customer.createdAt && (
                <View style={styles.detailRow}>
                  <Icon name="event" size={16} color="#666" style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>Joined:</Text>
                  <Text style={styles.detailValue}>
                    {customer.createdAt.toLocaleDateString()} {customer.createdAt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </Text>
                </View>
              )}
            </View>

            {/* Documents Section */}
            {customer.documents && Object.keys(customer.documents).length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Documents</Text>
                <View style={styles.documentsContainer}>
                  {customer.documents.idProof && (
                    <TouchableOpacity
                      style={styles.documentItem}
                      onPress={async () => {
                        if (customer.documents?.idProof) {
                          try {
                            const canOpen = await Linking.canOpenURL(customer.documents.idProof);
                            if (canOpen) {
                              await Linking.openURL(customer.documents.idProof);
                            } else {
                              Alert.alert('ID Proof', 'Document URL: ' + customer.documents.idProof);
                            }
                          } catch (error) {
                            Alert.alert('Error', 'Could not open document URL');
                          }
                        }
                      }}>
                      <Icon name="badge" size={20} color="#FF9500" />
                      <Text style={styles.documentLabel}>ID Proof</Text>
                      <Icon name="open-in-new" size={16} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                  
                  {customer.documents.addressProof && (
                    <TouchableOpacity
                      style={styles.documentItem}
                      onPress={async () => {
                        if (customer.documents?.addressProof) {
                          try {
                            const canOpen = await Linking.canOpenURL(customer.documents.addressProof);
                            if (canOpen) {
                              await Linking.openURL(customer.documents.addressProof);
                            } else {
                              Alert.alert('Address Proof', 'Document URL: ' + customer.documents.addressProof);
                            }
                          } catch (error) {
                            Alert.alert('Error', 'Could not open document URL');
                          }
                        }
                      }}>
                      <Icon name="home" size={20} color="#FF9500" />
                      <Text style={styles.documentLabel}>Address Proof</Text>
                      <Icon name="open-in-new" size={16} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                  
                  {customer.documents.certificate && (
                    <TouchableOpacity
                      style={styles.documentItem}
                      onPress={async () => {
                        if (customer.documents?.certificate) {
                          try {
                            const canOpen = await Linking.canOpenURL(customer.documents.certificate);
                            if (canOpen) {
                              await Linking.openURL(customer.documents.certificate);
                            } else {
                              Alert.alert('Certificate', 'Document URL: ' + customer.documents.certificate);
                            }
                          } catch (error) {
                            Alert.alert('Error', 'Could not open document URL');
                          }
                        }
                      }}>
                      <Icon name="school" size={20} color="#FF9500" />
                      <Text style={styles.documentLabel}>Certificate</Text>
                      <Icon name="open-in-new" size={16} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                  
                  {/* Show any other documents */}
                  {Object.keys(customer.documents).map(key => {
                    if (key !== 'idProof' && key !== 'addressProof' && key !== 'certificate' && customer.documents?.[key]) {
                      return (
                        <TouchableOpacity
                          key={key}
                          style={styles.documentItem}
                          onPress={async () => {
                            if (customer.documents?.[key]) {
                              try {
                                const canOpen = await Linking.canOpenURL(customer.documents[key]!);
                                if (canOpen) {
                                  await Linking.openURL(customer.documents[key]!);
                                } else {
                                  Alert.alert(key.charAt(0).toUpperCase() + key.slice(1), 'Document URL: ' + customer.documents[key]);
                                }
                              } catch (error) {
                                Alert.alert('Error', 'Could not open document URL');
                              }
                            }
                          }}>
                          <Icon name="description" size={20} color="#FF9500" />
                          <Text style={styles.documentLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                          <Icon name="open-in-new" size={16} color="#8E8E93" />
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })}
                </View>
              </View>
            )}

            {/* Job Cards Section */}
            <View style={styles.detailsSection}>
              <TouchableOpacity
                style={styles.jobCardsHeader}
                onPress={() => toggleJobCardsExpansion(customer.id)}
                activeOpacity={0.7}>
                <View style={styles.jobCardsHeaderLeft}>
                  <Icon name="assignment" size={18} color="#FF9500" />
                  <Text style={styles.jobCardsTitle}>
                    Job Cards ({jobCards.length})
                  </Text>
                </View>
                <Icon
                  name={isJobCardsExpanded ? "expand-less" : "expand-more"}
                  size={20}
                  color="#8E8E93"
                />
              </TouchableOpacity>

              {isJobCardsExpanded && (
                <View style={styles.jobCardsContent}>
                  {isLoadingJobCards ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#FF9500" />
                      <Text style={styles.loadingText}>Loading job cards...</Text>
                    </View>
                  ) : jobCards.length === 0 ? (
                    <View style={styles.emptyJobCardsContainer}>
                      <Icon name="assignment" size={32} color="#ccc" />
                      <Text style={styles.emptyJobCardsText}>No job cards found</Text>
                    </View>
                  ) : (
                    jobCards.map(jobCard => renderJobCard(jobCard))
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customer Management</Text>
        <Text style={styles.headerSubtitle}>{customers.length} total customers</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
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
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        ) : (
          filteredCustomers.map(customer => renderCustomerCard(customer))
        )}
      </ScrollView>
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
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
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
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  customerInfoText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 15,
  },
  detailsSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  detailIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  verifiedIconInline: {
    marginLeft: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    gap: 3,
  },
  verifiedBadgeText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },
  addressContainer: {
    flex: 1,
  },
  jobCardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  jobCardsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobCardsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  jobCardsContent: {
    marginTop: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyJobCardsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyJobCardsText: {
    marginTop: 8,
    color: '#8E8E93',
    fontSize: 14,
  },
  jobCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobCardInfo: {
    flex: 1,
  },
  jobCardService: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  jobCardProvider: {
    fontSize: 13,
    color: '#666',
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
    fontSize: 11,
    fontWeight: '600',
  },
  jobCardProblem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  jobCardMeta: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  jobCardDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  documentsContainer: {
    gap: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 10,
  },
  documentLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
