import React, {useState, useEffect} from 'react';
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
import {launchImageLibrary, MediaType} from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import adminAuthService from '../services/adminAuthService';
import authService from '../services/authService';
import GeolocationService from '../services/geolocationService';

// Helper function to check if Firebase is initialized
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

export default function AdminAddProviderScreen({navigation}: any) {
  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [phoneConfirmation, setPhoneConfirmation] = useState<any>(null);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [experience, setExperience] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressVerified, setAddressVerified] = useState(false);
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [idProof, setIdProof] = useState<string | null>(null);
  const [addressProof, setAddressProof] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const {currentUser} = useStore();

  // Verify admin access on mount
  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        if (!currentUser) {
          Alert.alert('Access Denied', 'You must be logged in to add providers.');
          navigation.goBack();
          return;
        }

        const isAdmin = await adminAuthService.isCurrentUserAdmin();
        if (!isAdmin && currentUser.role !== 'admin') {
          Alert.alert('Access Denied', 'Only administrators can add providers.');
          navigation.goBack();
          return;
        }

        setCheckingAccess(false);
      } catch (error) {
        console.error('Error verifying admin access:', error);
        Alert.alert('Error', 'Failed to verify admin access.');
        navigation.goBack();
      }
    };

    verifyAdminAccess();
  }, [currentUser, navigation]);

  // Verify address when pincode is entered (debounced)
  useEffect(() => {
    if (!pincode || pincode.length !== 6) {
      setAddressVerified(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setVerifyingAddress(true);
      try {
        const addressData = await GeolocationService.geocodePincode(pincode);
        
        if (addressData.city || addressData.state) {
          // Auto-fill city and state if available
          if (addressData.city && !city) {
            setCity(addressData.city);
          }
          if (addressData.state && !state) {
            setState(addressData.state);
          }
          
          // Verify address if city and state match
          if (addressData.city && addressData.state) {
            const cityMatch = city.toLowerCase().includes(addressData.city.toLowerCase()) || 
                            addressData.city.toLowerCase().includes(city.toLowerCase());
            const stateMatch = state.toLowerCase().includes(addressData.state.toLowerCase()) || 
                             addressData.state.toLowerCase().includes(state.toLowerCase());
            
            if (cityMatch && stateMatch) {
              setAddressVerified(true);
            } else {
              setAddressVerified(false);
            }
          } else {
            setAddressVerified(false);
          }
        } else {
          setAddressVerified(false);
        }
      } catch (error) {
        console.error('Address verification error:', error);
        setAddressVerified(false);
      } finally {
        setVerifyingAddress(false);
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [pincode, city, state]);

  const handleVerifyAddress = async () => {
    if (!pincode || pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    if (!address || !city || !state) {
      Alert.alert('Error', 'Please fill all address fields');
      return;
    }

    setVerifyingAddress(true);
    try {
      const addressData = await GeolocationService.geocodePincode(pincode);
      
      if (addressData.city && addressData.state) {
        // Check if entered city/state match geocoded data
        const cityMatch = city.toLowerCase().includes(addressData.city.toLowerCase()) || 
                        addressData.city.toLowerCase().includes(city.toLowerCase());
        const stateMatch = state.toLowerCase().includes(addressData.state.toLowerCase()) || 
                         addressData.state.toLowerCase().includes(state.toLowerCase());
        
        if (cityMatch && stateMatch) {
          setAddressVerified(true);
          Alert.alert('Success', 'Address verified successfully');
        } else {
          Alert.alert(
            'Address Mismatch',
            `Pincode ${pincode} corresponds to:\nCity: ${addressData.city}\nState: ${addressData.state}\n\nPlease verify your address details.`,
            [
              {
                text: 'Use Suggested',
                onPress: () => {
                  setCity(addressData.city || city);
                  setState(addressData.state || state);
                  setAddressVerified(true);
                },
              },
              {text: 'Keep Current', style: 'cancel'},
            ],
          );
        }
      } else {
        Alert.alert('Warning', 'Could not verify address from pincode. Please ensure address is correct.');
        setAddressVerified(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify address. Please check your internet connection.');
      setAddressVerified(false);
    } finally {
      setVerifyingAddress(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter phone number first');
      return;
    }

    // Validate phone number format
    const phoneDigits = phone.replace(/[\s\-+]/g, '');
    if (phoneDigits.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number (at least 10 digits)');
      return;
    }

    setSendingOTP(true);
    try {
      // Format phone number with country code if not present
      let formattedPhone = phone.trim();
      if (!formattedPhone.startsWith('+')) {
        // Assume +91 for India if no country code
        formattedPhone = `+91${phoneDigits}`;
      }

      const confirmation = await authService.sendPhoneVerificationCode(formattedPhone);
      setPhoneConfirmation(confirmation);
      Alert.alert('Success', 'Verification code sent to phone number');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!phoneVerificationCode.trim()) {
      Alert.alert('Error', 'Please enter verification code');
      return;
    }

    setVerifyingOTP(true);
    try {
      if (!phoneConfirmation) {
        Alert.alert('Error', 'Please send OTP first');
        setVerifyingOTP(false);
        return;
      }

      await phoneConfirmation.confirm(phoneVerificationCode);
      setPhoneVerified(true);
      Alert.alert('Success', 'Phone number verified successfully');
    } catch (error: any) {
      if (error.code === 'auth/invalid-verification-code') {
        Alert.alert('Error', 'Invalid verification code. Please try again.');
      } else if (error.code === 'auth/code-expired') {
        Alert.alert('Error', 'Verification code expired. Please request a new one.');
        setPhoneConfirmation(null);
        setPhoneVerificationCode('');
      } else {
        Alert.alert('Error', error.message || 'Failed to verify code');
      }
    } finally {
      setVerifyingOTP(false);
    }
  };

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
                }
              },
            );
          } else {
            setPhoto(response.assets[0].uri);
          }
        }
      },
    );
  };

  const pickDocument = async (type: 'idProof' | 'addressProof' | 'certificate') => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      },
      response => {
        if (response.assets && response.assets[0] && response.assets[0].uri) {
          const uri = response.assets[0].uri;
          
          switch (type) {
            case 'idProof':
              setIdProof(uri);
              break;
            case 'addressProof':
              setAddressProof(uri);
              break;
            case 'certificate':
              setCertificate(uri);
              break;
          }
        }
      },
    );
  };

  const uploadDocument = async (uri: string, documentType: string): Promise<string> => {
    if (!isFirebaseInitialized()) {
      throw new Error('Firebase is not initialized');
    }
    
    try {
      // Ensure URI is in correct format for Firebase Storage
      let fileUri = uri;
      let tempFilePath: string | null = null;
      
      if (uri.startsWith('content://')) {
        // Copy content:// URI to a temporary file
        try {
          const fileExtension = uri.toLowerCase().endsWith('.pdf') ? 'pdf' : 'jpg';
          tempFilePath = `${RNFS.CachesDirectoryPath}/upload_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
          await RNFS.copyFile(uri, tempFilePath);
          fileUri = `file://${tempFilePath}`;
        } catch (copyError: any) {
          console.error('Failed to copy content URI:', copyError);
          throw new Error('Failed to prepare document for upload. Please try selecting the document again.');
        }
      } else if (uri.startsWith('file://')) {
        fileUri = uri;
      }
      
      // Determine file extension (default to jpg for images)
      const fileExtension = uri.toLowerCase().endsWith('.pdf') ? 'pdf' : 'jpg';
      const filename = `providers/documents/${documentType}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      const reference = storage().ref(filename);
      
      try {
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
      
      const downloadURL = await reference.getDownloadURL();
      return downloadURL;
    } catch (error: any) {
      console.error('Document upload error:', error);
      
      if (error.code === 'storage/unauthorized') {
        throw new Error('You do not have permission to upload documents. Please contact support.');
      } else if (error.code === 'storage/canceled') {
        throw new Error('Upload was canceled. Please try again.');
      } else if (error.code === 'storage/unknown') {
        throw new Error('An unknown error occurred. Please check your internet connection and try again.');
      } else if (error.code === 'storage/file-not-found') {
        throw new Error('File not found. Please select the document again.');
      }
      throw new Error(`Failed to upload document: ${error.message || 'Unknown error'}`);
    }
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

  const handleAddProvider = async () => {
    if (!isFirebaseInitialized()) {
      Alert.alert('Error', 'Firebase is not initialized. Please restart the app.');
      return;
    }

    if (!name || !serviceType || !email || !phone) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    // Verify phone number is verified
    if (!phoneVerified) {
      Alert.alert('Phone Verification Required', 'Please verify the phone number before adding provider');
      return;
    }

    // Verify phone number is verified
    if (!phoneVerified) {
      Alert.alert('Phone Verification Required', 'Please verify the phone number before adding provider');
      return;
    }

    // Verify address fields are filled
    if (!address || !city || !state || !pincode) {
      Alert.alert('Address Required', 'Please fill all address fields (Address, City, State, Pincode)');
      return;
    }

    // Validate pincode
    const pincodeDigitsOnly = pincode.replace(/\D/g, '');
    if (pincodeDigitsOnly.length !== 6) {
      Alert.alert('Invalid Pincode', 'Pincode must be 6 digits');
      return;
    }

    // Warn if address is not verified (but allow to proceed)
    if (!addressVerified) {
      Alert.alert(
        'Address Not Verified',
        'The address could not be verified from the pincode. Do you want to proceed anyway?',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Proceed', onPress: () => handleAddProviderSubmit()},
        ],
      );
      return;
    }

    handleAddProviderSubmit();
  };

  const handleAddProviderSubmit = async () => {

    const pincodeDigitsOnly = pincode.replace(/\D/g, '');
    
    setLoading(true);
    try {
      let photoUrl = '';
      if (photo) {
        try {
          photoUrl = await uploadImage(photo);
        } catch (error: any) {
          console.error('Failed to upload image:', error);
          Alert.alert('Upload Error', error.message || 'Failed to upload image. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Upload documents
      const documents: any = {};
      
      if (idProof) {
        try {
          documents.idProof = await uploadDocument(idProof, 'idProof');
        } catch (error: any) {
          console.error('Failed to upload ID proof:', error);
          Alert.alert('Upload Error', `Failed to upload ID proof: ${error.message}`);
          setLoading(false);
          return;
        }
      }

      if (addressProof) {
        try {
          documents.addressProof = await uploadDocument(addressProof, 'addressProof');
        } catch (error: any) {
          console.error('Failed to upload address proof:', error);
          Alert.alert('Upload Error', `Failed to upload address proof: ${error.message}`);
          setLoading(false);
          return;
        }
      }

      if (certificate) {
        try {
          documents.certificate = await uploadDocument(certificate, 'certificate');
        } catch (error: any) {
          console.error('Failed to upload certificate:', error);
          Alert.alert('Upload Error', `Failed to upload certificate: ${error.message}`);
          setLoading(false);
          return;
        }
      }

      // Create provider document with admin tracking
      const providerData: any = {
        name,
        serviceType,
        email,
        phone,
        phoneVerified: true, // Phone is verified via OTP
        experience: experience ? parseInt(experience, 10) : 0,
        profileImage: photoUrl,
        documents: Object.keys(documents).length > 0 ? documents : undefined,
        address: {
          address,
          city,
          state,
          pincode: pincodeDigitsOnly,
          verified: addressVerified, // Address verification status
        },
        verified: false,
        approved: false,
        approvalStatus: 'pending', // Use approvalStatus for consistency
        rating: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        // Admin tracking
        createdBy: currentUser?.id || 'admin',
        createdByName: currentUser?.name || 'Admin',
        createdByEmail: currentUser?.email || '',
      };

      await firestore().collection('providers').add(providerData);

      console.log('✅ Provider added successfully by admin:', {
        adminId: currentUser?.id,
        adminName: currentUser?.name,
        providerName: name,
        providerEmail: email,
      });

      Alert.alert('Success', 'Provider added successfully', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add provider');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Verifying admin access...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {photo ? (
            <Image source={{uri: photo}} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoText}>Add Photo</Text>
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
        <View style={styles.phoneContainer}>
          <TextInput
            style={[styles.input, styles.phoneInput]}
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              setPhoneVerified(false); // Reset verification when phone changes
              setPhoneConfirmation(null);
              setPhoneVerificationCode('');
            }}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
            editable={!phoneVerified}
          />
          {phoneVerified ? (
            <View style={styles.verifiedBadge}>
              <Icon name="check-circle" size={20} color="#34C759" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleSendOTP}
              disabled={sendingOTP || !phone.trim()}>
              {sendingOTP ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {phoneConfirmation && !phoneVerified && (
          <View style={styles.otpContainer}>
            <Text style={styles.label}>Enter Verification Code *</Text>
            <View style={styles.otpInputContainer}>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={phoneVerificationCode}
                onChangeText={setPhoneVerificationCode}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.verifyOTPButton}
                onPress={handleVerifyOTP}
                disabled={verifyingOTP || !phoneVerificationCode.trim()}>
                {verifyingOTP ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.verifyOTPButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.resendOTPButton}
              onPress={handleSendOTP}
              disabled={sendingOTP}>
              <Text style={styles.resendOTPText}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Address Section */}
        <Text style={styles.sectionTitle}>Address *</Text>
        
        <Text style={styles.label}>Street Address *</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="House/Flat No., Street, Area"
          multiline
          numberOfLines={2}
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="City"
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={styles.input}
              value={state}
              onChangeText={setState}
              placeholder="State"
            />
          </View>
        </View>

        <Text style={styles.label}>Pincode *</Text>
        <TextInput
          style={styles.input}
          value={pincode}
          onChangeText={(text) => {
            // Only allow digits and limit to 6
            const digits = text.replace(/\D/g, '').substring(0, 6);
            setPincode(digits);
          }}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
        />

        <Text style={styles.label}>Experience (years)</Text>
        <TextInput
          style={styles.input}
          value={experience}
          onChangeText={setExperience}
          placeholder="5"
          keyboardType="numeric"
        />

        {/* Documents Section */}
        <Text style={styles.sectionTitle}>Documents (Optional)</Text>
        
        {/* ID Proof */}
        <View style={styles.documentContainer}>
          <Text style={styles.documentLabel}>ID Proof</Text>
          <TouchableOpacity
            style={styles.documentButton}
            onPress={() => pickDocument('idProof')}>
            <Icon name="description" size={20} color="#007AFF" />
            <Text style={styles.documentButtonText}>
              {idProof ? 'Change ID Proof' : 'Upload ID Proof'}
            </Text>
          </TouchableOpacity>
          {idProof && (
            <View style={styles.selectedDocument}>
              <Icon name="check-circle" size={16} color="#34C759" />
              <Text style={styles.selectedDocumentText} numberOfLines={1}>
                {idProof.includes('/') ? idProof.split('/').pop()?.substring(0, 30) || 'ID Proof' : 'ID Proof selected'}
              </Text>
              <TouchableOpacity onPress={() => setIdProof(null)}>
                <Icon name="close" size={18} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Address Proof */}
        <View style={styles.documentContainer}>
          <Text style={styles.documentLabel}>Address Proof</Text>
          <TouchableOpacity
            style={styles.documentButton}
            onPress={() => pickDocument('addressProof')}>
            <Icon name="description" size={20} color="#007AFF" />
            <Text style={styles.documentButtonText}>
              {addressProof ? 'Change Address Proof' : 'Upload Address Proof'}
            </Text>
          </TouchableOpacity>
          {addressProof && (
            <View style={styles.selectedDocument}>
              <Icon name="check-circle" size={16} color="#34C759" />
              <Text style={styles.selectedDocumentText} numberOfLines={1}>
                {addressProof.includes('/') ? addressProof.split('/').pop()?.substring(0, 30) || 'Address Proof' : 'Address Proof selected'}
              </Text>
              <TouchableOpacity onPress={() => setAddressProof(null)}>
                <Icon name="close" size={18} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Certificate */}
        <View style={styles.documentContainer}>
          <Text style={styles.documentLabel}>Certificate / License</Text>
          <TouchableOpacity
            style={styles.documentButton}
            onPress={() => pickDocument('certificate')}>
            <Icon name="school" size={20} color="#007AFF" />
            <Text style={styles.documentButtonText}>
              {certificate ? 'Change Certificate' : 'Upload Certificate'}
            </Text>
          </TouchableOpacity>
          {certificate && (
            <View style={styles.selectedDocument}>
              <Icon name="check-circle" size={16} color="#34C759" />
              <Text style={styles.selectedDocumentText} numberOfLines={1}>
                {certificate.includes('/') ? certificate.split('/').pop()?.substring(0, 30) || 'Certificate' : 'Certificate selected'}
              </Text>
              <TouchableOpacity onPress={() => setCertificate(null)}>
                <Icon name="close" size={18} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleAddProvider}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add Provider</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    color: '#666',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
    color: '#333',
  },
  documentContainer: {
    marginBottom: 15,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    gap: 10,
  },
  documentButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  selectedDocumentText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  phoneInput: {
    flex: 1,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  verifiedText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  otpContainer: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  otpInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  otpInput: {
    flex: 1,
  },
  verifyOTPButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  verifyOTPButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resendOTPButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  resendOTPText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  halfWidth: {
    flex: 1,
  },
});

