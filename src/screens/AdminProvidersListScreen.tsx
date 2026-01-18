import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import useTranslation from '../hooks/useTranslation';
import AlertModal from '../components/AlertModal';
import ConfirmationModal from '../components/ConfirmationModal';
import {providersApi, Provider as ApiProvider} from '../services/api/providersApi';

type Provider = ApiProvider & {
  id: string;
  name: string;
  serviceType?: string;
  phone: string;
  address?: {
    type: 'home' | 'office';
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
};

export default function AdminProvidersListScreen({navigation}: any) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
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
  
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const providersList = await providersApi.getAll();
      // Map API response to component format
      const mappedProviders: Provider[] = providersList.map(provider => ({
        ...provider,
        id: provider._id || provider.id || '',
        name: provider.name || provider.displayName || '',
        serviceType: provider.serviceType || provider.specialization || provider.serviceCategories?.[0] || '',
        phone: provider.phone || provider.phoneNumber || '',
        address: provider.address || provider.location ? {
          type: (provider.address?.type || 'home') as 'home' | 'office',
          address: provider.address?.address || provider.location?.address || '',
          city: provider.address?.city || provider.location?.city,
          state: provider.address?.state || provider.location?.state,
          pincode: provider.address?.pincode || provider.location?.pincode || '',
          latitude: provider.address?.latitude || provider.location?.latitude,
          longitude: provider.address?.longitude || provider.location?.longitude,
        } : undefined,
      }));
      setProviders(mappedProviders);
      setLoading(false);
      setError(null);
    } catch (error: any) {
      console.error('Error loading providers:', error);
      setError(error.message || t('providers.failedToLoad'));
      setLoading(false);
    }
  };

  const handleDelete = (providerId: string, providerName: string) => {
    // Note: DELETE endpoint not yet implemented in backend
    // For now, we can reject/approve providers instead
    setAlertModal({
      visible: true,
      title: t('common.info'),
      message: 'Provider deletion is not yet available. Please use the approval status to manage providers.',
      type: 'info',
    });
  };

  const getInitials = (name: string): string => {
    if (!name || name.trim() === '') return '';
    
    const nameParts = name.trim().split(/\s+/);
    
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
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

  const renderProvider = ({item}: {item: Provider}) => {
    const serviceType = item.serviceType || t('providers.generalService');
    const photo = item.profileImage;
    const rating = item.rating || 0;
    const status = item.approvalStatus || (item.approved ? 'approved' : 'pending');
    const statusColor = getStatusColor(status);
    const statusIcon = getStatusIcon(status);
    
    const hasValidImage = photo && 
      typeof photo === 'string' && 
      photo.trim() !== '' &&
      (photo.startsWith('http://') || photo.startsWith('https://')) &&
      !imageErrors.has(item.id);

    const handleImageError = () => {
      setImageErrors(prev => new Set(prev).add(item.id));
    };

    return (
      <TouchableOpacity
        style={styles.providerCard}
        onPress={() => navigation.navigate('ProviderDetails', {provider: item})}
        activeOpacity={0.7}>
        {hasValidImage ? (
          <Image 
            source={{uri: photo}} 
            style={styles.providerImage}
            onError={handleImageError}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.providerImage, styles.providerImagePlaceholder]}>
            <Text style={styles.initialsText}>
              {getInitials(item.name)}
            </Text>
          </View>
        )}
        <View style={styles.providerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName}>{item.name}</Text>
            {item.verified && (
              <Icon name="verified" size={18} color="#4CAF50" style={styles.verifiedIcon} />
            )}
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.serviceType}>{serviceType}</Text>
            <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
              <Icon name={statusIcon} size={12} color={statusColor} />
              <Text style={[styles.statusText, {color: statusColor}]}>
                {t(`common.${status}`)}
              </Text>
            </View>
          </View>
          {item.experience && (
            <Text style={styles.detail}>
              {t('providers.yearsExperience', {years: item.experience})}
            </Text>
          )}
          <Text style={styles.detail}>{t('providers.phone')}: {item.phone}</Text>
          {item.email && (
            <Text style={styles.detail}>{t('providers.email')}: {item.email}</Text>
          )}
          {item.address && (
            <View style={styles.addressRow}>
              <Icon name="location-on" size={14} color="#666" />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.address.address}, {item.address.pincode}
              </Text>
            </View>
          )}
          {rating > 0 && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProvider', {provider: item})}
            style={styles.actionButton}>
            <Icon name="edit" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.name)}
            style={styles.actionButton}>
            <Icon name="delete" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('providers.loading')}</Text>
      </View>
    );
  }

  const handleRetry = () => {
    loadProviders();
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{t('providers.errorLoading')}</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={providers}
        renderItem={renderProvider}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="handyman" size={64} color="#ccc" />
            <Text style={styles.emptyText}>{t('providers.noProvidersYet')}</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProvider')}>
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>
      
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({visible: false, title: '', message: '', type: 'info'})}
      />
      
      <ConfirmationModal
        visible={confirmationModal.visible}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={() => confirmationModal.onConfirm()}
        onCancel={() => setConfirmationModal({visible: false, title: '', message: '', onConfirm: () => {}})}
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
  listContainer: {
    padding: 15,
  },
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  providerImagePlaceholder: {
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  initialsText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
  },
  providerInfo: {
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  addressText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 5,
  },
  verifiedIcon: {
    marginRight: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 8,
  },
  serviceType: {
    fontSize: 14,
    color: '#007AFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  rating: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  actions: {
    justifyContent: 'space-around',
  },
  actionButton: {
    padding: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 15,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

