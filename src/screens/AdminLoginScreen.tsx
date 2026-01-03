import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useStore} from '../store';
import adminAuthService from '../services/adminAuthService';

export default function AdminLoginScreen({navigation}: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const {setCurrentUser} = useStore();

  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 [ADMIN LOGIN] Attempting admin login for:', email);
      
      // Use admin authentication service which verifies admin access
      const userData = await adminAuthService.loginAsAdmin(email, password);
      
      console.log('✅ [ADMIN LOGIN] Admin login successful:', {
        userId: userData.id,
        email: userData.email,
        role: userData.role,
      });

      await setCurrentUser(userData);

      // Navigate to AdminMain
      navigation.replace('AdminMain');
    } catch (loginError: any) {
      console.error('❌ [ADMIN LOGIN] Login error:', {
        code: loginError.code,
        message: loginError.message,
        error: loginError,
      });

      // Provide helpful error messages
      let errorMessage = loginError.message || 'Login failed. Please try again.';

      if (loginError.message?.includes('Access denied')) {
        errorMessage = 'Access denied. This email is not authorized for admin access.';
      } else if (loginError.message?.includes('User not found')) {
        errorMessage = 'User not found. Please create an admin account first.';
      } else if (loginError.message?.includes('Incorrect password')) {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (loginError.message?.includes('Invalid email')) {
        errorMessage = 'Invalid email format.';
      } else if (loginError.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (loginError.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (loginError.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MediAdmin</Text>
      <Text style={styles.subtitle}>Admin Portal</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  errorText: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ef9a9a',
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
