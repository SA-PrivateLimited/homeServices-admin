import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import firebaseApp from '@react-native-firebase/app';
import {launchImageLibrary} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';

const isFirebaseInitialized = (): boolean => {
  try {
    firebaseApp.app();
    return true;
  } catch (error) {
    return false;
  }
};

const SERVICE_TYPES = [
  'Carpenter',
  'Electrician',
  'Plumber',
  'Painter',
  'Mason',
  'Welder',
  'AC Repair',
  'Appliance Repair',
  'Cleaning Service',
  'Gardener',
  'Roofer',
  'Flooring',
  'Tiles & Marble',
  'Interior Designer',
  'Other',
];

export default function AdminEditProviderScreen({route, navigation}: any) {
  const {provider} = route.params;

  const [name, setName] = useState(provider.name || '');
  const [serviceType, setServiceType] = useState(provider.serviceType || '');
  const [email, setEmail] = useState(provider.email || '');
  const [phone, setPhone] = useState(provider.phone || '');
  const [experience, setExperience] = useState(provider.experience ? provider.experience.toString() : '0');
  const [photo, setPhoto] = useState<string | null>(() => {
    const existingImage = provider.profileImage;
    if (existingImage && typeof existingImage === 'string' && existingImage.trim() !== '' && 
        (existingImage.startsWith('http://') || existingImage.startsWith('https://') || 
         existingImage.startsWith('file://') || existingImage.startsWith('content://'))) {
      return existingImage.trim();
    }
    return null;
  });
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.3, // Lower quality to reduce file size
        maxWidth: 800,
        maxHeight: 800,
      },
      async response => {
        if (response.assets && response.assets[0].uri) {
          const {isImageTooLarge} = require('../utils/imageCompression');
          const tooLarge = await isImageTooLarge(response.assets[0].uri);
          
          if (tooLarge) {
            // Try with even lower quality
            launchImageLibrary(
              {
                mediaType: 'photo',
                quality: 0.1, // Very low quality
                maxWidth: 600,
                maxHeight: 600,
              },
              secondResponse => {
                if (secondResponse.assets && secondResponse.assets[0].uri) {
                  setPhoto(secondResponse.assets[0].uri);
                  setImageError(false);
                }
              },
            );
          } else {
            setPhoto(response.assets[0].uri);
            setImageError(false);
          }
        }
      },
    );
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const uploadImage = async (uri: string): Promise<string> => {
    if (!isFirebaseInitialized()) {
      throw new Error('Firebase is not initialized');
    }
    
    try {
      // Check image size before uploading (non-blocking)
      const {isImageTooLarge} = require('../utils/imageCompression');
      try {
        const tooLarge = await isImageTooLarge(uri);
        if (tooLarge) {
          Alert.alert(
            'Image Too Large',
            'The selected image is larger than 50KB. Please select a smaller image or use a lower quality setting.',
          );
          throw new Error('Image size exceeds 50KB limit');
        }
      } catch (sizeCheckError: any) {
        // If size check fails, log but don't block upload
        if (sizeCheckError.message === 'Image size exceeds 50KB limit') {
          throw sizeCheckError; // Re-throw size limit errors
        }
        console.warn('Size check failed, proceeding with upload:', sizeCheckError);
      }
      
      // Ensure URI is in correct format for Firebase Storage
      // Firebase Storage cannot access content:// URIs directly on Android
      let fileUri = uri;
      let tempFilePath: string | null = null;
      
      if (uri.startsWith('content://')) {
        // Copy content:// URI to a temporary file
        try {
          tempFilePath = `${RNFS.CachesDirectoryPath}/upload_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          await RNFS.copyFile(uri, tempFilePath);
          fileUri = `file://${tempFilePath}`;
        } catch (copyError: any) {
          console.error('Failed to copy content URI:', copyError);
          throw new Error('Failed to prepare image for upload. Please try selecting the image again.');
        }
      } else if (uri.startsWith('file://')) {
        // file:// URIs are fine as-is
        fileUri = uri;
      }
      
      const filename = `providers/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const reference = storage().ref(filename);
      
      try {
        // Upload with error handling
        await reference.putFile(fileUri);
      } finally {
        // Clean up temp file if we created one
        if (tempFilePath) {
          try {
            await RNFS.unlink(tempFilePath);
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp file:', cleanupError);
          }
        }
      }
      
      // Get download URL
      const downloadURL = await reference.getDownloadURL();
      return downloadURL;
    } catch (error: any) {
      console.error('Image upload error:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'storage/unauthorized') {
        throw new Error('You do not have permission to upload images. Please contact support.');
      } else if (error.code === 'storage/canceled') {
        throw new Error('Upload was canceled. Please try again.');
      } else if (error.code === 'storage/unknown') {
        throw new Error('An unknown error occurred. Please check your internet connection and try again.');
      } else if (error.message && error.message.includes('50KB')) {
        throw error; // Re-throw size limit errors
      } else {
        throw new Error(`Failed to upload image: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleUpdateProvider = async () => {
    if (!isFirebaseInitialized()) {
      Alert.alert('Error', 'Firebase is not initialized. Please restart the app.');
      return;
    }

    if (!name || !serviceType || !email || !phone) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      let photoUrl = provider.profileImage || '';
      
      if (photo && (photo.startsWith('file://') || photo.startsWith('content://'))) {
        try {
          photoUrl = await uploadImage(photo);
        } catch (uploadError: any) {
          console.error('Failed to upload image:', uploadError);
          // Check if it's a size limit error - don't allow saving in that case
          if (uploadError.message && uploadError.message.includes('50KB')) {
            Alert.alert('Image Too Large', uploadError.message);
            setLoading(false);
            return;
          }
          // For other errors, show warning but allow saving without image update
          Alert.alert('Warning', uploadError.message || 'Failed to upload image. Profile will be saved without updating the image.');
        }
      } else if (photo && (photo.startsWith('http://') || photo.startsWith('https://'))) {
        photoUrl = photo;
      }

      await firestore().collection('providers').doc(provider.id).update({
        name,
        serviceType,
        email,
        phone,
        experience: experience ? parseInt(experience, 10) : 0,
        profileImage: photoUrl,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Provider updated successfully', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update provider');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage} activeOpacity={0.8}>
          {photo && photo.trim() !== '' && !imageError ? (
            <View style={styles.imageContainer}>
              <Image
                source={{uri: photo}}
                style={styles.photo}
                onError={handleImageError}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Icon name="edit" size={20} color="#fff" />
                <Text style={styles.editText}>Change Photo</Text>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              {name && name.trim() !== '' ? (
                <>
                  <Text style={styles.initialsText}>
                    {name.trim().charAt(0).toUpperCase()}
                  </Text>
                  <View style={styles.plusIconContainer}>
                    <Icon name="add" size={20} color="#fff" />
                  </View>
                </>
              ) : (
                <>
                  <Icon name="person" size={48} color="#007AFF" />
                  <View style={styles.plusIconContainer}>
                    <Icon name="add" size={20} color="#fff" />
                  </View>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="John Doe"
        />

        <Text style={styles.label}>Service Type *</Text>
        <View style={styles.serviceTypeContainer}>
          {SERVICE_TYPES.map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.serviceTypeChip,
                serviceType === type && styles.serviceTypeChipSelected,
              ]}
              onPress={() => setServiceType(type)}>
              <Text
                style={[
                  styles.serviceTypeText,
                  serviceType === type && styles.serviceTypeTextSelected,
                ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="provider@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 9876543210"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Experience (years)</Text>
        <TextInput
          style={styles.input}
          value={experience}
          onChangeText={setExperience}
          placeholder="5"
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleUpdateProvider}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Update Provider</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    paddingVertical: 5,
    alignItems: 'center',
  },
  editText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    position: 'relative',
  },
  initialsText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#007AFF',
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  serviceTypeChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 10,
    marginBottom: 10,
  },
  serviceTypeChipSelected: {
    backgroundColor: '#007AFF',
  },
  serviceTypeText: {
    color: '#007AFF',
    fontSize: 14,
  },
  serviceTypeTextSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

