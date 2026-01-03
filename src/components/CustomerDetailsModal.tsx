import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import type {User} from '../types/consultation';

interface Customer extends User {
  role?: 'customer';
  phoneVerified?: boolean;
  secondaryPhone?: string;
  secondaryPhoneVerified?: boolean;
  address?: {
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    verified?: boolean;
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

interface CustomerDetailsModalProps {
  visible: boolean;
  customer: Customer | null;
  onClose: () => void;
}

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

const DetailRow: React.FC<{icon: string; label: string; value?: string | null | Date; showIfEmpty?: boolean}> = ({
  icon,
  label,
  value,
  showIfEmpty = false,
}) => {
  if (!value && !showIfEmpty) return null;
  
  const displayValue = value instanceof Date 
    ? value.toLocaleDateString() + ' ' + value.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
    : value 
      ? String(value)
      : 'Not provided';
    
  return (
    <View style={modalStyles.detailRow}>
      <Icon name={icon} size={18} color="#666" style={modalStyles.detailIcon} />
      <Text style={modalStyles.detailLabel}>{label}:</Text>
      <Text style={[modalStyles.detailValue, !value && showIfEmpty && modalStyles.emptyValue]}>{displayValue}</Text>
    </View>
  );
};

const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  visible,
  customer,
  onClose,
}) => {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loadingJobCards, setLoadingJobCards] = useState(false);

  useEffect(() => {
    if (visible && customer?.id) {
      loadJobCards();
    } else {
      setJobCards([]);
    }
  }, [visible, customer?.id]);

  const loadJobCards = async () => {
    if (!customer?.id) return;
    
    setLoadingJobCards(true);
    try {
      const snapshot = await firestore()
        .collection('jobCards')
        .where('customerId', '==', customer.id)
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

      setJobCards(cards);
    } catch (error) {
      console.error('Error loading job cards:', error);
    } finally {
      setLoadingJobCards(false);
    }
  };

  if (!customer) {
    console.log('CustomerDetailsModal: customer is null');
    return null;
  }

  console.log('CustomerDetailsModal: Rendering customer', {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
  });

  const renderJobCard = ({item}: {item: JobCard}) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <View style={modalStyles.jobCard}>
        <View style={modalStyles.jobCardHeader}>
          <View style={modalStyles.jobCardInfo}>
            <Text style={modalStyles.jobCardService}>{item.serviceType}</Text>
            <Text style={modalStyles.jobCardProvider}>
              <Icon name="handyman" size={14} color="#666" /> {item.providerName}
            </Text>
          </View>
          <View style={[modalStyles.jobCardStatusBadge, {backgroundColor: statusColor + '20'}]}>
            <Icon name={statusIcon} size={14} color={statusColor} />
            <Text style={[modalStyles.jobCardStatusText, {color: statusColor}]}>
              {item.status === 'in-progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        
        {item.problem && (
          <Text style={modalStyles.jobCardProblem} numberOfLines={2}>
            {item.problem}
          </Text>
        )}
        
        <View style={modalStyles.jobCardMeta}>
          <Text style={modalStyles.jobCardDate}>
            Created: {item.createdAt.toLocaleDateString()} {item.createdAt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContent}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Customer Details</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={modalStyles.scrollView} 
            contentContainerStyle={modalStyles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Customer Information Section */}
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionTitle}>Customer Information</Text>
              
              <DetailRow icon="fingerprint" label="Customer ID" value={customer.id || ''} showIfEmpty={true} />
              <DetailRow icon="person" label="Name" value={customer.name || ''} showIfEmpty={true} />
              <DetailRow icon="email" label="Email" value={customer.email || ''} showIfEmpty={true} />
              <DetailRow icon="phone" label="Phone" value={customer.phone || ''} showIfEmpty={true} />
              
              {customer.secondaryPhone && (
                <View style={modalStyles.detailRow}>
                  <Icon name="phone" size={18} color="#666" style={modalStyles.detailIcon} />
                  <Text style={modalStyles.detailLabel}>Secondary Phone:</Text>
                  <View style={modalStyles.verifiedRow}>
                    <Text style={modalStyles.detailValue}>{customer.secondaryPhone}</Text>
                    {customer.secondaryPhoneVerified && (
                      <Icon name="verified" size={16} color="#4CAF50" style={modalStyles.verifiedIcon} />
                    )}
                  </View>
                </View>
              )}
              
              <View style={modalStyles.detailRow}>
                <Icon name="verified-user" size={18} color="#666" style={modalStyles.detailIcon} />
                <Text style={modalStyles.detailLabel}>Phone Verified:</Text>
                <View style={modalStyles.verifiedRow}>
                  {customer.phoneVerified ? (
                    <>
                      <Icon name="check-circle" size={18} color="#4CAF50" />
                      <Text style={[modalStyles.detailValue, {color: '#4CAF50', marginLeft: 5}]}>Yes</Text>
                    </>
                  ) : (
                    <>
                      <Icon name="cancel" size={18} color="#FF3B30" />
                      <Text style={[modalStyles.detailValue, {color: '#FF3B30', marginLeft: 5}]}>No</Text>
                    </>
                  )}
                </View>
              </View>

              {customer.address && (
                <View style={modalStyles.detailRow}>
                  <Icon name="location-on" size={18} color="#666" style={modalStyles.detailIcon} />
                  <Text style={modalStyles.detailLabel}>Address:</Text>
                  <View style={modalStyles.addressContainer}>
                    <Text style={modalStyles.detailValue}>
                      {customer.address.address}
                      {customer.address.city && `, ${customer.address.city}`}
                      {customer.address.state && `, ${customer.address.state}`}
                      {customer.address.pincode && ` - ${customer.address.pincode}`}
                    </Text>
                    {customer.address.verified && (
                      <View style={modalStyles.verifiedBadge}>
                        <Icon name="verified" size={12} color="#4CAF50" />
                        <Text style={modalStyles.verifiedBadgeText}>Verified</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {customer.location && (
                <>
                  {customer.location.pincode && (
                    <DetailRow icon="pin" label="Pincode" value={customer.location.pincode} />
                  )}
                  {customer.location.city && (
                    <DetailRow icon="location-city" label="City" value={customer.location.city} />
                  )}
                  {customer.location.state && (
                    <DetailRow icon="map" label="State" value={customer.location.state} />
                  )}
                </>
              )}

              {customer.createdAt && (
                <DetailRow icon="event" label="Joined" value={customer.createdAt} />
              )}

              {customer.profileImage && (
                <View style={modalStyles.detailRow}>
                  <Icon name="image" size={18} color="#666" style={modalStyles.detailIcon} />
                  <Text style={modalStyles.detailLabel}>Profile Image:</Text>
                  <Text style={[modalStyles.detailValue, {color: '#007AFF'}]}>Available</Text>
                </View>
              )}
            </View>

            {/* Job Cards Section */}
            <View style={modalStyles.section}>
              <View style={modalStyles.sectionHeader}>
                <Text style={modalStyles.sectionTitle}>Job Cards ({jobCards.length})</Text>
                {loadingJobCards && (
                  <ActivityIndicator size="small" color="#FF9500" style={modalStyles.loadingIndicator} />
                )}
              </View>

              {loadingJobCards ? (
                <View style={modalStyles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF9500" />
                  <Text style={modalStyles.loadingText}>Loading job cards...</Text>
                </View>
              ) : jobCards.length === 0 ? (
                <View style={modalStyles.emptyContainer}>
                  <Icon name="assignment" size={48} color="#ccc" />
                  <Text style={modalStyles.emptyText}>No job cards found</Text>
                </View>
              ) : (
                <FlatList
                  data={jobCards}
                  renderItem={renderJobCard}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                />
              )}
            </View>
          </ScrollView>

          <View style={modalStyles.footer}>
            <TouchableOpacity style={modalStyles.okButton} onPress={onClose}>
              <Text style={modalStyles.okButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    minHeight: 300,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
    minHeight: 200,
  },
  scrollContent: {
    paddingBottom: 10,
    flexGrow: 1,
  },
  section: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  loadingIndicator: {
    marginLeft: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  detailIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    width: 130,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  emptyValue: {
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  addressContainer: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8E8E93',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
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
    fontSize: 16,
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
  footer: {
    padding: 15,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  okButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  okButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomerDetailsModal;

