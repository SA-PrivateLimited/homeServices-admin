import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {lightTheme, darkTheme} from '../utils/theme';

export default function AdminLoginScreen({navigation}: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const {setCurrentUser, isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      // Authenticate with Firebase
      const userCredential = await auth().signInWithEmailAndPassword(email, password);

      // Get user data from Firestore
      const userDoc = await firestore()
        .collection('users')
        .doc(userCredential.user.uid)
        .get();

      let userData: any = {
        id: userCredential.user.uid,
        email: userCredential.user.email || email,
        name: userCredential.user.displayName || 'Admin',
        phone: userCredential.user.phoneNumber || '',
        role: 'admin' as const,
      };

      if (userDoc.exists) {
        userData = {
          ...userData,
          ...userDoc.data(),
          role: userDoc.data()?.role || 'admin',
        };
      } else {
        // Create admin user document if it doesn't exist
        await firestore()
          .collection('users')
          .doc(userCredential.user.uid)
          .set({
            ...userData,
            createdAt: firestore.FieldValue.serverTimestamp(),
          }, {merge: true});
      }

      await setCurrentUser(userData);

      // Navigate to AdminMain
      navigation.replace('AdminMain');
    } catch (firebaseError: any) {

      // Provide helpful error messages
      let errorMessage = 'Login failed. Please try again.';

      if (firebaseError.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please create an admin account in Firebase Console.';
      } else if (firebaseError.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format.';
      } else if (firebaseError.message) {
        errorMessage = firebaseError.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Language Switcher */}
      <View style={styles.languageSwitcherContainer}>
        <LanguageSwitcher compact />
      </View>
      
      <Text style={[styles.title, {color: theme.text}]}>MediAdmin</Text>
      <Text style={[styles.subtitle, {color: theme.textSecondary}]}>Admin Portal</Text>

      {error ? <Text style={[styles.errorText, {backgroundColor: theme.error + '20', borderColor: theme.error}]}>{error}</Text> : null}

      <TextInput
        style={[styles.input, {backgroundColor: theme.card, borderColor: theme.border, color: theme.text}]}
        placeholder="Email"
        placeholderTextColor={theme.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={[styles.input, {backgroundColor: theme.card, borderColor: theme.border, color: theme.text}]}
        placeholder="Password"
        placeholderTextColor={theme.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, {backgroundColor: theme.primary}]}
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
  },
  languageSwitcherContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  errorText: {
    color: '#c62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    borderWidth: 1,
  },
  input: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
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
