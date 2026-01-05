import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import AlertModal from '../components/AlertModal';

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

export default function AdminJobCardsListScreen({navigation}: any) {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JobCard['status']>('all');
  const {currentUser} = useStore();
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
  const [jobCardDetailsModal, setJobCardDetailsModal] = useState<{
    visible: boolean;
    jobCard: JobCard | null;
  }>({
    visible: false,
    jobCard: null,
  });

  useEffect(() => {
    // SECURITY: Verify current user is admin
    if (currentUser?.role !== 'admin') {
      setAlertModal({
        visible: true,
        title: 'Access Denied',
        message: 'Only administrators can access this screen.',
        type: 'error',
      });
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
      return;
    }

    const unsubscribe = firestore()
      .collection('jobCards')
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

          setJobCards(cardsList);
          setLoading(false);
        },
        error => {
          console.error('Error loading job cards:', error);
          setAlertModal({
            visible: true,
            title: 'Error',
            message: 'Failed to load job cards. Please try again.',
            type: 'error',
          });
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, [currentUser, navigation]);

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

  const filteredJobCards = jobCards.filter(card => {
    const matchesSearch =
      card.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.providerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.serviceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.customerPhone?.includes(searchQuery) ||
      card.problem?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || card.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const renderJobCard = ({item}: {item: JobCard}) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => {
          setJobCardDetailsModal({
            visible: true,
            jobCard: item,
          });
        }}>
        <View style={styles.jobCardHeader}>
          <View style={styles.jobCardInfo}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.providerName}>
              <Icon name="handyman" size={14} color="#666" /> {item.providerName}
            </Text>
            <Text style={styles.serviceType}>
              <Icon name="build" size={14} color="#007AFF" /> {item.serviceType}
            </Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
            <Icon name={statusIcon} size={18} color={statusColor} />
            <Text style={[styles.statusText, {color: statusColor}]}>
              {item.status === 'in-progress' ? 'In Progress' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {item.problem && (
          <View style={styles.problemContainer}>
            <Icon name="info" size={16} color="#666" />
            <Text style={styles.problemText} numberOfLines={2}>
              {item.problem}
            </Text>
          </View>
        )}

        <View style={styles.jobCardDetails}>
          <View style={styles.detailRow}>
            <Icon name="phone" size={14} color="#666" />
            <Text style={styles.detailText}>{item.customerPhone}</Text>
          </View>
          {item.customerAddress && (
            <View style={styles.detailRow}>
              <Icon name="location-on" size={14} color="#666" />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.customerAddress.address}, {item.customerAddress.pincode}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Icon name="access-time" size={14} color="#666" />
            <Text style={styles.detailText}>
              Created: {item.createdAt.toLocaleDateString()} {item.createdAt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>Loading job cards...</Text>
      </View>
    );
  }

  const statusCounts = {
    all: jobCards.length,
    pending: jobCards.filter(c => c.status === 'pending').length,
    accepted: jobCards.filter(c => c.status === 'accepted').length,
    'in-progress': jobCards.filter(c => c.status === 'in-progress').length,
    completed: jobCards.filter(c => c.status === 'completed').length,
    cancelled: jobCards.filter(c => c.status === 'cancelled').length,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Cards</Text>
        <Text style={styles.headerSubtitle}>{jobCards.length} total job cards</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer, provider, service..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'pending', 'accepted', 'in-progress', 'completed', 'cancelled'] as const).map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(status)}>
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}>
                {status === 'all' ? 'All' : status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && ` (${statusCounts[status]})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Job Cards List */}
      {filteredJobCards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="assignment" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery || statusFilter !== 'all'
              ? 'No job cards found'
              : 'No job cards yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobCards}
          renderItem={renderJobCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={() => {
            setLoading(true);
            // The useEffect will reload
          }}
        />
      )}

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({...alertModal, visible: false})}
      />

      {/* Job Card Details Modal */}
      {jobCardDetailsModal.jobCard && (
        <AlertModal
          visible={jobCardDetailsModal.visible}
          title="Job Card Details"
          message={`Customer: ${jobCardDetailsModal.jobCard.customerName}\nProvider: ${jobCardDetailsModal.jobCard.providerName}\nService: ${jobCardDetailsModal.jobCard.serviceType}\nStatus: ${jobCardDetailsModal.jobCard.status}${jobCardDetailsModal.jobCard.problem ? `\nProblem: ${jobCardDetailsModal.jobCard.problem}` : ''}`}
          type="info"
          onClose={() => setJobCardDetailsModal({visible: false, jobCard: null})}
        />
      )}
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
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 5,
  },
  filterChipActive: {
    backgroundColor: '#FF9500',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobCardInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  serviceType: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  problemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  problemText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  jobCardDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
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
});

