import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import authService from '../services/authService';
import adminAuthService from '../services/adminAuthService';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const {isDarkMode, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const handleSendPhoneCode = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.sendPhoneVerificationCode(phoneNumber);
      setConfirmResult(result);
      Alert.alert('Success', 'Verification code sent to your phone');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const user = await authService.verifyPhoneCode(
        confirmResult,
        verificationCode,
        'Admin', // Default name for phone login
      );

      // Set role as 'admin' for HomeServicesAdmin app
      const userWithRole = {
        ...user,
        role: 'admin' as const,
      };

      // Update user role in Firestore if needed
      if (user.role !== 'admin') {
        try {
          await authService.updateUserRole(user.id, 'admin');
          userWithRole.role = 'admin';
        } catch (error) {
          // Role update failed, but continue with login
          console.warn('Failed to update user role:', error);
        }
      }

      setCurrentUser(userWithRole);
      navigation.reset({
        index: 0,
        routes: [{name: 'AdminMain'}],
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      console.log('🔵 [ADMIN LOGIN] Starting Google Sign-In...');
      const user = await authService.signInWithGoogle();
      console.log('✅ [ADMIN LOGIN] Google Sign-In successful:', {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      // Verify admin access using admin auth service
      if (user.email) {
        const hasAdminAccess = await adminAuthService.verifyAdminAccess(user.email);
        if (!hasAdminAccess) {
          // Grant admin access if email is authorized
          try {
            await adminAuthService.grantAdminAccess(user.email);
            console.log('✅ [ADMIN LOGIN] Admin access granted to:', user.email);
          } catch (grantError: any) {
            console.warn('⚠️ [ADMIN LOGIN] Could not grant admin access:', grantError.message);
            Alert.alert(
              'Access Denied',
              'This email is not authorized for admin access. Please contact an administrator.',
            );
            return;
          }
        }
      }

      // Set role as 'admin' for HomeServicesAdmin app
      const userWithRole = {
        ...user,
        role: 'admin' as const,
      };

      // Update user role in Firestore if needed
      if (user.role !== 'admin') {
        try {
          console.log('📝 [ADMIN LOGIN] Updating user role to admin...');
          await authService.updateUserRole(user.id, 'admin');
          userWithRole.role = 'admin';
          console.log('✅ [ADMIN LOGIN] User role updated to admin');
        } catch (error: any) {
          // Role update failed, but continue with login
          console.warn('⚠️ [ADMIN LOGIN] Failed to update user role:', error.message || error);
        }
      }

      console.log('💾 [ADMIN LOGIN] Setting current user in store...');
      await setCurrentUser(userWithRole);
      console.log('✅ [ADMIN LOGIN] User set in store, navigating to AdminMain...');
      
      navigation.reset({
        index: 0,
        routes: [{name: 'AdminMain'}],
      });
    } catch (error: any) {
      console.error('❌ [ADMIN LOGIN] Google Sign-In error:', {
        code: error.code,
        message: error.message,
        error: error,
      });
      
      if (error.message?.includes('cancelled')) {
        // User cancelled, don't show error
        console.log('ℹ️ [ADMIN LOGIN] User cancelled Google Sign-In');
        return;
      }
      
      // Show detailed error message
      let errorMessage = error.message || 'Failed to sign in with Google';
      if (error.code === 'DEVELOPER_ERROR') {
        errorMessage = 'Google Sign-In configuration error. Please check SHA-1 fingerprint in Firebase Console.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid Google credential. Please try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email using a different sign-in method.';
      }
      
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Icon name="shield-checkmark" size={60} color={theme.primary} />
          <Text style={[styles.title, {color: theme.text}]}>HomeServices Admin</Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            Login to manage home services
          </Text>
        </View>

        {/* Phone Login Form */}
          <View style={styles.form}>
            {!confirmResult ? (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  <Icon
                    name="call-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, {color: theme.text}]}
                    placeholder="Phone Number (with country code)"
                    placeholderTextColor={theme.textSecondary}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {backgroundColor: theme.primary},
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleSendPhoneCode}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  <Icon
                    name="keypad-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, {color: theme.text}]}
                    placeholder="Verification Code"
                    placeholderTextColor={theme.textSecondary}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {backgroundColor: theme.primary},
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleVerifyPhoneCode}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleSendPhoneCode}
                  disabled={loading}>
                  <Text style={[styles.resendText, {color: theme.primary}]}>
                    Resend Code
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, {backgroundColor: theme.border}]} />
            <Text style={[styles.dividerText, {color: theme.textSecondary}]}>
              OR
            </Text>
            <View style={[styles.divider, {backgroundColor: theme.border}]} />
          </View>

        {/* Google Sign-In */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              {backgroundColor: theme.card, borderColor: theme.border},
              loading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}>
            <Icon name="logo-google" size={20} color="#DB4437" />
            <Text style={[styles.googleButtonText, {color: theme.text}]}>
              Continue with Google
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },
  googleButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginScreen;
