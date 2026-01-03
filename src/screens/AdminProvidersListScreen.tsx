import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';

interface Provider {
  id: string;
  name: string;
  serviceType?: string; // Service type (carpenter, electrician, plumber, etc.)
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
  };
}

export default function AdminProvidersListScreen({navigation}: any) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let retryCount = 0;
    const maxRetries = 20;
    let timeoutId: NodeJS.Timeout | null = null;

    const tryFetch = () => {
      try {
        const providersRef = firestore().collection('providers');
        
        unsubscribe = providersRef.onSnapshot(
          async snapshot => {
            const providersList = await Promise.all(
              snapshot.docs.map(async doc => {
                const providerData = {
                  id: doc.id,
                  ...doc.data(),
                } as Provider;
                
                // Fetch reviews count and calculate average rating
                try {
                  const reviewsSnapshot = await firestore()
                    .collection('reviews')
                    .where('providerId', '==', doc.id)
                    .get();
                  
                  const reviews = reviewsSnapshot.docs.map(reviewDoc => ({
                    rating: reviewDoc.data().rating || 0,
                  }));
                  
                  if (reviews.length > 0) {
                    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
                    providerData.rating = totalRating / reviews.length;
                    providerData.totalReviews = reviews.length;
                  } else {
                    providerData.rating = providerData.rating || 0;
                    providerData.totalReviews = 0;
                  }
                } catch (reviewError) {
                  console.warn(`Failed to fetch reviews for provider ${doc.id}:`, reviewError);
                  providerData.rating = providerData.rating || 0;
                  providerData.totalReviews = 0;
                }
                
                return providerData;
              })
            );
            setProviders(providersList);
            setLoading(false);
            setError(null);
          },
          error => {
            if (error.message?.includes('No Firebase App') && retryCount < maxRetries) {
              retryCount++;
              timeoutId = setTimeout(tryFetch, 200);
              return;
            }
            setError(error.message || 'Failed to load providers');
            setLoading(false);
          },
        );
      } catch (error: any) {
        if (error.message?.includes('No Firebase App') && retryCount < maxRetries) {
          retryCount++;
          timeoutId = setTimeout(tryFetch, 200);
        } else {
          setError(error.message || 'Firebase not initialized');
          setLoading(false);
        }
      }
    };

    timeoutId = setTimeout(tryFetch, 500);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleDelete = (providerId: string, providerName: string) => {
    Alert.alert(
      'Delete Provider',
      `Are you sure you want to delete ${providerName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('providers').doc(providerId).delete();
              Alert.alert('Success', 'Provider deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete provider');
            }
          },
        },
      ],
    );
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

  const renderProvider = ({item}: {item: Provider}) => {
    const serviceType = item.serviceType || 'General Service';
    const photo = item.profileImage;
    const rating = item.rating || 0;
    
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
            {item.approved && (
              <Icon name="check-circle" size={18} color="#2196F3" style={styles.approvedIcon} />
            )}
          </View>
          <Text style={styles.serviceType}>{serviceType}</Text>
          {item.experience && (
            <Text style={styles.detail}>
              {item.experience} years experience
            </Text>
          )}
          <Text style={styles.detail}>Phone: {item.phone}</Text>
          {item.email && (
            <Text style={styles.detail}>Email: {item.email}</Text>
          )}
          {item.address && (
            <View style={styles.addressRow}>
              <Icon name="location-on" size={14} color="#666" />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.address.address}, {item.address.pincode}
              </Text>
            </View>
          )}
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color={rating > 0 ? "#FFD700" : "#ccc"} />
            <Text style={[styles.rating, rating === 0 && styles.ratingEmpty]}>
              {rating > 0 ? rating.toFixed(1) : 'No ratings'}
            </Text>
            {item.totalReviews !== undefined && item.totalReviews > 0 && (
              <Text style={styles.reviewCount}>({item.totalReviews} {item.totalReviews === 1 ? 'review' : 'reviews'})</Text>
            )}
          </View>
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
        <Text style={styles.loadingText}>Loading providers...</Text>
      </View>
    );
  }

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setProviders([]);
    setTimeout(() => {
      try {
        const unsubscribe = firestore()
          .collection('providers')
          .onSnapshot(
            async snapshot => {
              const providersList = await Promise.all(
                snapshot.docs.map(async doc => {
                  const providerData = {
                    id: doc.id,
                    ...doc.data(),
                  } as Provider;
                  
                  // Fetch reviews count and calculate average rating
                  try {
                    const reviewsSnapshot = await firestore()
                      .collection('reviews')
                      .where('providerId', '==', doc.id)
                      .get();
                    
                    const reviews = reviewsSnapshot.docs.map(reviewDoc => ({
                      rating: reviewDoc.data().rating || 0,
                    }));
                    
                    if (reviews.length > 0) {
                      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
                      providerData.rating = totalRating / reviews.length;
                      providerData.totalReviews = reviews.length;
                    } else {
                      providerData.rating = providerData.rating || 0;
                      providerData.totalReviews = 0;
                    }
                  } catch (reviewError) {
                    console.warn(`Failed to fetch reviews for provider ${doc.id}:`, reviewError);
                    providerData.rating = providerData.rating || 0;
                    providerData.totalReviews = 0;
                  }
                  
                  return providerData;
                })
              );
              setProviders(providersList);
              setLoading(false);
              setError(null);
            },
            error => {
              setError(error.message || 'Failed to load providers');
              setLoading(false);
            },
          );
        return unsubscribe;
      } catch (error: any) {
        setError(error.message || 'Firebase not initialized');
        setLoading(false);
      }
    }, 500);
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Error loading providers</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
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
            <Text style={styles.emptyText}>No providers added yet</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProvider')}>
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>
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
  approvedIcon: {
    marginRight: 5,
  },
  serviceType: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
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
    color: '#333',
  },
  ratingEmpty: {
    color: '#999',
    fontWeight: 'normal',
  },
  reviewCount: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
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

