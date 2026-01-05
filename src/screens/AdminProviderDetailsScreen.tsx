import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';

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
  address?: {
    type: 'home' | 'office';
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  documents?: {
    idProof?: string;
    addressProof?: string;
    certificate?: string;
    idProofVerified?: boolean;
    addressProofVerified?: boolean;
    certificateVerified?: boolean;
  };
}

interface AdminProviderDetailsScreenProps {
  route: {
    params: {
      provider: Provider;
    };
  };
  navigation: any;
}

export default function AdminProviderDetailsScreen({
  route,
  navigation,
}: AdminProviderDetailsScreenProps) {
  const {provider: providerParam} = route.params;
  const [provider, setProvider] = useState<Provider>(providerParam);
  const [loading, setLoading] = useState(true);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Fetch fresh provider data including documents
  useEffect(() => {
    const fetchProviderData = async () => {
      try {
        setLoading(true);
        const providerDoc = await firestore()
          .collection('providers')
          .doc(providerParam.id)
          .get();

        if (providerDoc.exists) {
          const providerData = {
            id: providerDoc.id,
            ...providerDoc.data(),
          } as Provider;
          
          // Debug: Log documents to verify they're being fetched
          console.log('Provider documents:', providerData.documents);
          console.log('Provider data keys:', Object.keys(providerData));
          
          setProvider(providerData);
        } else {
          console.warn('Provider document not found:', providerParam.id);
        }
      } catch (error: any) {
        console.error('Error fetching provider data:', error);
        Alert.alert('Error', 'Failed to load provider details');
      } finally {
        setLoading(false);
      }
    };

    fetchProviderData();
  }, [providerParam.id]);

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
    setImageLoading(true);
  };

  const closeImageModal = () => {
    setImageModalVisible(false);
    setSelectedImage(null);
    setImageLoading(false);
  };

  const formatAddress = () => {
    if (!provider.address) return 'Not provided';
    const addr = provider.address;
    const parts = [
      addr.address,
      addr.city,
      addr.state,
      addr.pincode,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const hasDocuments = () => {
    return (
      provider.documents?.idProof ||
      provider.documents?.addressProof ||
      provider.documents?.certificate
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading provider details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        {provider.profileImage ? (
          <Image
            source={{uri: provider.profileImage}}
            style={styles.profileImage}
            onError={() => {
              // Image failed to load, will show placeholder
            }}
          />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.initialsText}>
              {provider.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.providerName}>{provider.name}</Text>
            {provider.verified && (
              <Icon name="verified" size={20} color="#4CAF50" />
            )}
            {provider.approved && (
              <Icon name="check-circle" size={20} color="#2196F3" />
            )}
          </View>
          <Text style={styles.serviceType}>{provider.serviceType || 'General Service'}</Text>
          {provider.experience && (
            <Text style={styles.experience}>{provider.experience} years experience</Text>
          )}
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoRow}>
          <Icon name="phone" size={20} color="#666" />
          <Text style={styles.infoText}>{provider.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="email" size={20} color="#666" />
          <Text style={styles.infoText}>{provider.email}</Text>
        </View>
      </View>

      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <View style={styles.infoRow}>
          <Icon name="location-on" size={20} color="#666" />
          <View style={styles.addressContainer}>
            <Text style={styles.infoText}>
              {provider.address?.type === 'home' ? 'Home' : 'Office'}
            </Text>
            <Text style={styles.addressText}>{formatAddress()}</Text>
          </View>
        </View>
      </View>

      {/* Documents Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verification Documents</Text>
        {!hasDocuments() ? (
          <View style={styles.noDocumentsContainer}>
            <Icon name="description" size={48} color="#ccc" />
            <Text style={styles.noDocumentsText}>No documents uploaded</Text>
          </View>
        ) : (
          <View style={styles.documentsContainer}>
            {/* ID Proof */}
            {provider.documents?.idProof && (
              <TouchableOpacity
                style={styles.documentCard}
                onPress={() => {
                  if (!imageErrors.has('idProof') && provider.documents?.idProof) {
                    openImageModal(provider.documents.idProof);
                  } else {
                    Alert.alert('Error', 'Image not available. The file may have been deleted.');
                  }
                }}
                disabled={imageErrors.has('idProof')}>
                <View style={styles.documentHeader}>
                  <Icon name="badge" size={24} color="#007AFF" />
                  <Text style={styles.documentTitle}>ID Proof</Text>
                  {provider.documents?.idProofVerified && (
                    <View style={styles.verifiedBadge}>
                      <Icon name="verified" size={18} color="#4CAF50" />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  )}
                </View>
                {!imageErrors.has('idProof') ? (
                  <Image
                    source={{uri: provider.documents.idProof}}
                    style={styles.documentThumbnail}
                    resizeMode="cover"
                    onError={() => {
                      setImageErrors(prev => new Set(prev).add('idProof'));
                    }}
                  />
                ) : (
                  <View style={styles.documentError}>
                    <Icon name="error-outline" size={48} color="#FF3B30" />
                    <Text style={styles.documentErrorText}>Failed to load image</Text>
                  </View>
                )}
                <View style={styles.documentFooter}>
                  <Text style={[styles.viewText, imageErrors.has('idProof') && styles.viewTextDisabled]}>
                    {imageErrors.has('idProof') ? 'Image unavailable' : 'Tap to view'}
                  </Text>
                  {!imageErrors.has('idProof') && (
                    <Icon name="chevron-right" size={20} color="#007AFF" />
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* Address Proof */}
            {provider.documents?.addressProof && (
              <TouchableOpacity
                style={styles.documentCard}
                onPress={() => {
                  if (!imageErrors.has('addressProof') && provider.documents?.addressProof) {
                    openImageModal(provider.documents.addressProof);
                  } else {
                    Alert.alert('Error', 'Image not available. The file may have been deleted.');
                  }
                }}
                disabled={imageErrors.has('addressProof')}>
                <View style={styles.documentHeader}>
                  <Icon name="home" size={24} color="#4CAF50" />
                  <Text style={styles.documentTitle}>Address Proof</Text>
                  {provider.documents?.addressProofVerified && (
                    <View style={styles.verifiedBadge}>
                      <Icon name="verified" size={18} color="#4CAF50" />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  )}
                </View>
                {!imageErrors.has('addressProof') ? (
                  <Image
                    source={{uri: provider.documents.addressProof}}
                    style={styles.documentThumbnail}
                    resizeMode="cover"
                    onError={() => {
                      setImageErrors(prev => new Set(prev).add('addressProof'));
                    }}
                  />
                ) : (
                  <View style={styles.documentError}>
                    <Icon name="error-outline" size={48} color="#FF3B30" />
                    <Text style={styles.documentErrorText}>Failed to load image</Text>
                  </View>
                )}
                <View style={styles.documentFooter}>
                  <Text style={[styles.viewText, imageErrors.has('addressProof') && styles.viewTextDisabled]}>
                    {imageErrors.has('addressProof') ? 'Image unavailable' : 'Tap to view'}
                  </Text>
                  {!imageErrors.has('addressProof') && (
                    <Icon name="chevron-right" size={20} color="#4CAF50" />
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* Certificate */}
            {provider.documents?.certificate && (
              <TouchableOpacity
                style={styles.documentCard}
                onPress={() => {
                  if (!imageErrors.has('certificate') && provider.documents?.certificate) {
                    openImageModal(provider.documents.certificate);
                  } else {
                    Alert.alert('Error', 'Image not available. The file may have been deleted.');
                  }
                }}
                disabled={imageErrors.has('certificate')}>
                <View style={styles.documentHeader}>
                  <Icon name="school" size={24} color="#FF9500" />
                  <Text style={styles.documentTitle}>Certificate</Text>
                  {provider.documents?.certificateVerified && (
                    <View style={styles.verifiedBadge}>
                      <Icon name="verified" size={18} color="#4CAF50" />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  )}
                </View>
                {!imageErrors.has('certificate') ? (
                  <Image
                    source={{uri: provider.documents.certificate}}
                    style={styles.documentThumbnail}
                    resizeMode="cover"
                    onError={() => {
                      setImageErrors(prev => new Set(prev).add('certificate'));
                    }}
                  />
                ) : (
                  <View style={styles.documentError}>
                    <Icon name="error-outline" size={48} color="#FF3B30" />
                    <Text style={styles.documentErrorText}>Failed to load image</Text>
                  </View>
                )}
                <View style={styles.documentFooter}>
                  <Text style={[styles.viewText, imageErrors.has('certificate') && styles.viewTextDisabled]}>
                    {imageErrors.has('certificate') ? 'Image unavailable' : 'Tap to view'}
                  </Text>
                  {!imageErrors.has('certificate') && (
                    <Icon name="chevron-right" size={20} color="#FF9500" />
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={closeImageModal}>
            <Icon name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {imageLoading && (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
          {selectedImage && (
            <Image
              source={{uri: selectedImage}}
              style={styles.modalImage}
              resizeMode="contain"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                Alert.alert('Error', 'Failed to load image. The file may have been deleted or is not accessible.');
                closeImageModal();
              }}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  initialsText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  providerName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 8,
  },
  serviceType: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 4,
  },
  experience: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  addressContainer: {
    marginLeft: 12,
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  documentsContainer: {
    gap: 15,
  },
  documentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333',
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  documentThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  viewText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  noDocumentsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noDocumentsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalLoadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  documentErrorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
  },
  viewTextDisabled: {
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

