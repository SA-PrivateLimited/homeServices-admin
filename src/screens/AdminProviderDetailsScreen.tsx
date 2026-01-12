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
  rating?: number;
  totalReviews?: number;
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

interface Review {
  id: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  serviceType: string;
  rating: number;
  comment?: string;
  createdAt: Date;
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
  const {provider: initialProvider} = route.params;
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [verifyingDoc, setVerifyingDoc] = useState<string | null>(null);

  useEffect(() => {
    // Listen for provider updates
    const unsubscribe = firestore()
      .collection('providers')
      .doc(provider.id)
      .onSnapshot(
        doc => {
          if (doc.exists) {
            setProvider({
              id: doc.id,
              ...doc.data(),
            } as Provider);
          }
        },
        error => {
          console.error('Error listening to provider updates:', error);
        },
      );

    return () => unsubscribe();
  }, [provider.id]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    loadReviews();
  }, [provider.id]);

  const loadReviews = async () => {
    try {
      setLoadingReviews(true);
      const snapshot = await firestore()
        .collection('reviews')
        .where('providerId', '==', provider.id)
        .get();

      const reviewsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Review[];

      // Sort by createdAt descending
      reviewsList.sort((a, b) => {
        const dateA = a.createdAt.getTime();
        const dateB = b.createdAt.getTime();
        return dateB - dateA;
      });

      setReviews(reviewsList);
      setTotalReviews(reviewsList.length);

      // Calculate average rating
      if (reviewsList.length > 0) {
        const totalRating = reviewsList.reduce((sum, r) => sum + r.rating, 0);
        setAverageRating(totalRating / reviewsList.length);
      } else {
        setAverageRating(provider.rating || 0);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5
    const fullStars = Math.floor(roundedRating);
    const hasHalfStar = roundedRating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Icon key={i} name="star" size={16} color="#FFD700" />);
    }
    if (hasHalfStar) {
      // Use star with reduced opacity for half star effect
      stars.push(<Icon key="half" name="star" size={16} color="#FFD700" style={{opacity: 0.5}} />);
    }
    const emptyStars = 5 - Math.ceil(roundedRating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Icon key={`empty-${i}`} name="star-border" size={16} color="#ccc" />);
    }
    return stars;
  };

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

  const verifyDocument = async (docType: 'idProof' | 'addressProof' | 'certificate') => {
    try {
      setVerifyingDoc(docType);
      const isCurrentlyVerified = provider.documents?.[`${docType}Verified` as keyof typeof provider.documents] as boolean;
      const newVerifiedStatus = !isCurrentlyVerified;

      await firestore()
        .collection('providers')
        .doc(provider.id)
        .update({
          [`documents.${docType}Verified`]: newVerifiedStatus,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert(
        'Success',
        `${docType === 'idProof' ? 'ID Proof' : docType === 'addressProof' ? 'Address Proof' : 'Certificate'} ${newVerifiedStatus ? 'verified' : 'verification removed'} successfully`,
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update document verification status');
    } finally {
      setVerifyingDoc(null);
    }
  };

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
          {averageRating > 0 && (
            <View style={styles.ratingHeader}>
              <View style={styles.ratingStars}>
                {renderStars(averageRating)}
              </View>
              <Text style={styles.ratingText}>
                {averageRating.toFixed(1)} ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
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

      {/* Ratings & Reviews Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
        {loadingReviews ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.noReviewsContainer}>
            <Icon name="star-border" size={48} color="#ccc" />
            <Text style={styles.noReviewsText}>No reviews yet</Text>
          </View>
        ) : (
          <>
            <View style={styles.ratingSummary}>
              <View style={styles.ratingSummaryLeft}>
                <Text style={styles.ratingSummaryNumber}>{averageRating.toFixed(1)}</Text>
                <View style={styles.ratingSummaryStars}>
                  {renderStars(averageRating)}
                </View>
                <Text style={styles.ratingSummaryCount}>
                  {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </Text>
              </View>
            </View>
            <View style={styles.reviewsList}>
              {reviews.map(review => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewHeaderLeft}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {review.customerName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewCustomerName}>{review.customerName}</Text>
                        <Text style={styles.reviewDate}>
                          {review.createdAt.toLocaleDateString()} {review.createdAt.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewRating}>
                      {renderStars(review.rating)}
                    </View>
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                  <Text style={styles.reviewServiceType}>{review.serviceType}</Text>
                </View>
              ))}
            </View>
          </>
        )}
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
                  <View style={styles.documentHeaderLeft}>
                    <Icon name="badge" size={24} color="#007AFF" />
                    <Text style={styles.documentTitle}>ID Proof</Text>
                  </View>
                  {provider.documents?.idProofVerified && (
                    <View style={styles.verifiedBadge}>
                      <Icon name="verified" size={16} color="#4CAF50" />
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
                  <View style={styles.documentFooterRight}>
                    {!imageErrors.has('idProof') && (
                      <>
                        <TouchableOpacity
                          style={styles.verifyButton}
                          onPress={() => verifyDocument('idProof')}
                          disabled={verifyingDoc === 'idProof'}>
                          {verifyingDoc === 'idProof' ? (
                            <ActivityIndicator size="small" color="#007AFF" />
                          ) : (
                            <>
                              <Icon
                                name={provider.documents?.idProofVerified ? "verified" : "check-circle-outline"}
                                size={18}
                                color={provider.documents?.idProofVerified ? "#4CAF50" : "#007AFF"}
                              />
                              <Text
                                style={[
                                  styles.verifyButtonText,
                                  provider.documents?.idProofVerified && styles.verifyButtonTextVerified,
                                ]}>
                                {provider.documents?.idProofVerified ? 'Verified' : 'Verify'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <Icon name="chevron-right" size={20} color="#007AFF" />
                      </>
                    )}
                  </View>
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
                  <View style={styles.documentHeaderLeft}>
                    <Icon name="home" size={24} color="#4CAF50" />
                    <Text style={styles.documentTitle}>Address Proof</Text>
                  </View>
                  {provider.documents?.addressProofVerified && (
                    <View style={styles.verifiedBadge}>
                      <Icon name="verified" size={16} color="#4CAF50" />
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
                  <View style={styles.documentFooterRight}>
                    {!imageErrors.has('addressProof') && (
                      <>
                        <TouchableOpacity
                          style={styles.verifyButton}
                          onPress={() => verifyDocument('addressProof')}
                          disabled={verifyingDoc === 'addressProof'}>
                          {verifyingDoc === 'addressProof' ? (
                            <ActivityIndicator size="small" color="#4CAF50" />
                          ) : (
                            <>
                              <Icon
                                name={provider.documents?.addressProofVerified ? "verified" : "check-circle-outline"}
                                size={18}
                                color={provider.documents?.addressProofVerified ? "#4CAF50" : "#4CAF50"}
                              />
                              <Text
                                style={[
                                  styles.verifyButtonText,
                                  provider.documents?.addressProofVerified && styles.verifyButtonTextVerified,
                                ]}>
                                {provider.documents?.addressProofVerified ? 'Verified' : 'Verify'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <Icon name="chevron-right" size={20} color="#4CAF50" />
                      </>
                    )}
                  </View>
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
                  <View style={styles.documentHeaderLeft}>
                    <Icon name="school" size={24} color="#FF9500" />
                    <Text style={styles.documentTitle}>Certificate</Text>
                  </View>
                  {provider.documents?.certificateVerified && (
                    <View style={styles.verifiedBadge}>
                      <Icon name="verified" size={16} color="#4CAF50" />
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
                  <View style={styles.documentFooterRight}>
                    {!imageErrors.has('certificate') && (
                      <>
                        <TouchableOpacity
                          style={styles.verifyButton}
                          onPress={() => verifyDocument('certificate')}
                          disabled={verifyingDoc === 'certificate'}>
                          {verifyingDoc === 'certificate' ? (
                            <ActivityIndicator size="small" color="#FF9500" />
                          ) : (
                            <>
                              <Icon
                                name={provider.documents?.certificateVerified ? "verified" : "check-circle-outline"}
                                size={18}
                                color={provider.documents?.certificateVerified ? "#4CAF50" : "#FF9500"}
                              />
                              <Text
                                style={[
                                  styles.verifyButtonText,
                                  provider.documents?.certificateVerified && styles.verifyButtonTextVerified,
                                ]}>
                                {provider.documents?.certificateVerified ? 'Verified' : 'Verify'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <Icon name="chevron-right" size={20} color="#FF9500" />
                      </>
                    )}
                  </View>
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
  documentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333',
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
    color: '#4CAF50',
    fontWeight: '600',
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
  documentFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  verifyButtonText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  verifyButtonTextVerified: {
    color: '#4CAF50',
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
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  noReviewsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noReviewsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
  ratingSummary: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  ratingSummaryLeft: {
    alignItems: 'center',
  },
  ratingSummaryNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingSummaryStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingSummaryCount: {
    fontSize: 14,
    color: '#666',
  },
  reviewsList: {
    gap: 15,
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  reviewCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
    marginLeft: 52,
  },
  reviewServiceType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 52,
  },
});

