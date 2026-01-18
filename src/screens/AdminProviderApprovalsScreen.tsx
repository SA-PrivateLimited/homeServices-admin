import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import ConfirmationModal from '../components/ConfirmationModal';
import AlertModal from '../components/AlertModal';
import useTranslation from '../hooks/useTranslation';

interface Provider {
  id: string;
  name: string;
  serviceType?: string;
  email: string;
  phone: string;
  experience?: number;
  profileImage?: string;
  verified?: boolean;
  approved?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
  approvedAt?: Date;
}

export default function AdminProviderApprovalsScreen({navigation}: any) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [providerToApprove, setProviderToApprove] = useState<{id: string; name: string} | null>(null);
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
  const {currentUser} = useStore();
  const {t} = useTranslation();

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('providers')
      .onSnapshot(
        snapshot => {
          const providersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            approvedAt: doc.data().approvedAt?.toDate(),
          })) as Provider[];

          setProviders(providersList);
          setLoading(false);
        },
        error => {
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, []);

  const handleApprove = (providerId: string, providerName: string) => {
    setProviderToApprove({id: providerId, name: providerName});
    setApproveModalVisible(true);
  };

  const confirmApprove = async () => {
    if (!providerToApprove) return;

    try {
      const adminId = auth().currentUser?.uid || currentUser?.id;
      await firestore().collection('providers').doc(providerToApprove.id).update({
        approvalStatus: 'approved',
        approved: true,
        verified: true,
        approvedBy: adminId,
        approvedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      setApproveModalVisible(false);
      setProviderToApprove(null);
      setAlertModal({
        visible: true,
        title: t('common.success'),
        message: t('providers.providerApproved'),
        type: 'success',
      });
    } catch (error: any) {
      setApproveModalVisible(false);
      setProviderToApprove(null);
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('providers.failedToApprove'),
        type: 'error',
      });
    }
  };

  const handleReject = (provider: Provider) => {
    setSelectedProvider(provider);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!selectedProvider) return;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('providers.rejectionReasonRequired'),
        type: 'error',
      });
      return;
    }

    try {
      const adminId = auth().currentUser?.uid || currentUser?.id;
      await firestore().collection('providers').doc(selectedProvider.id).update({
        approvalStatus: 'rejected',
        approved: false,
        rejectionReason: rejectionReason.trim(),
        verified: false,
        approvedBy: adminId,
        approvedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      setRejectModalVisible(false);
      setSelectedProvider(null);
      setRejectionReason('');
      setAlertModal({
        visible: true,
        title: t('common.success'),
        message: t('providers.providerRejected'),
        type: 'success',
      });
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('providers.failedToReject'),
        type: 'error',
      });
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'pending':
      default:
        return '#FF9500';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'check-circle';
      case 'rejected':
        return 'cancel';
      case 'pending':
      default:
        return 'hourglass-empty';
    }
  };

  const filteredProviders = providers.filter(provider => {
    if (filter === 'all') return true;
    const status = provider.approvalStatus || (provider.approved ? 'approved' : 'pending');
    return status === filter || (!provider.approvalStatus && !provider.approved && filter === 'pending');
  });

  const renderProvider = ({item}: {item: Provider}) => {
    const status = item.approvalStatus || (item.approved ? 'approved' : 'pending');
    const statusColor = getStatusColor(status);
    const statusIcon = getStatusIcon(status);

    return (
      <View style={styles.providerCard}>
        <View style={styles.providerHeader}>
          {item.profileImage ? (
            <Image source={{uri: item.profileImage}} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={30} color="#666" />
            </View>
          )}
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{item.name}</Text>
            <Text style={styles.providerServiceType}>{item.serviceType || t('providers.generalService')}</Text>
            <Text style={styles.providerEmail}>{item.email}</Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
            <Icon name={statusIcon} size={20} color={statusColor} />
            <Text style={[styles.statusText, {color: statusColor}]}>
              {t(`common.${status}`)}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Icon name="phone" size={16} color="#666" />
            <Text style={styles.detailText}>{item.phone}</Text>
          </View>
          {item.experience && (
            <View style={styles.detailRow}>
              <Icon name="work" size={16} color="#666" />
              <Text style={styles.detailText}>
                {t('providers.yearsExperience', {years: item.experience})}
              </Text>
            </View>
          )}
        </View>

        {status === 'rejected' && item.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Icon name="info" size={16} color="#FF3B30" />
            <Text style={styles.rejectionText}>
              {t('providers.rejectionReasonLabel')}: {item.rejectionReason}
            </Text>
          </View>
        )}

        {status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item.id, item.name)}>
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('common.approve')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item)}>
              <Icon name="close" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('common.reject')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'rejected' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton, styles.fullWidth]}
            onPress={() => handleApprove(item.id, item.name)}>
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>{t('providers.reApprove')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>{t('providers.loadingApprovals')}</Text>
      </View>
    );
  }

  const pendingCount = providers.filter(p => !p.approvalStatus && !p.approved).length;
  const approvedCount = providers.filter(p => p.approvalStatus === 'approved' || p.approved).length;
  const rejectedCount = providers.filter(p => p.approvalStatus === 'rejected').length;

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {t(`common.${f}`)}
                {f === 'pending' && ` (${pendingCount})`}
                {f === 'approved' && ` (${approvedCount})`}
                {f === 'rejected' && ` (${rejectedCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Providers List */}
      {filteredProviders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="handyman" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {filter === 'pending'
              ? t('providers.noPendingApprovals')
              : t('providers.noProvidersForFilter', {filter: t(`common.${filter}`)})}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          renderItem={renderProvider}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('providers.rejectProviderTitle')}</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedProvider?.name
                ? t('providers.rejectProviderSubtitle', {name: selectedProvider.name})
                : t('providers.rejectProviderSubtitle', {name: ''})}
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder={t('providers.rejectionReasonPlaceholder')}
              placeholderTextColor="#999"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRejectModalVisible(false);
                  setSelectedProvider(null);
                  setRejectionReason('');
                }}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalRejectButton]}
                onPress={confirmReject}>
                <Text style={styles.modalRejectButtonText}>{t('common.reject')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Approve Confirmation Modal */}
      <ConfirmationModal
        visible={approveModalVisible}
        title={t('providers.approveProviderTitle')}
        message={
          providerToApprove
            ? t('providers.approveProviderConfirmWithName', {name: providerToApprove.name})
            : t('providers.approveProviderConfirm')
        }
        confirmText={t('common.approve')}
        cancelText={t('common.cancel')}
        onConfirm={confirmApprove}
        onCancel={() => {
          setApproveModalVisible(false);
          setProviderToApprove(null);
        }}
        type="success"
        icon="checkmark-circle"
      />

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() =>
          setAlertModal({
            visible: false,
            title: '',
            message: '',
            type: 'info',
          })
        }
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
    color: '#666',
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
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  providerServiceType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  providerEmail: {
    fontSize: 12,
    color: '#999',
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
  details: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  rejectionText: {
    flex: 1,
    fontSize: 12,
    color: '#FF3B30',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  fullWidth: {
    flex: 1,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  reasonInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalRejectButton: {
    backgroundColor: '#FF3B30',
  },
  modalRejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

