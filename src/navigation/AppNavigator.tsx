import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import AdminLoginScreen from '../screens/AdminLoginScreen';

// Tab Navigators
import MainTabs from './MainTabs'; // Patient tabs (existing)
import DoctorTabNavigator from './DoctorTabNavigator'; // Doctor tabs (new)
import AdminTabNavigator from './AdminTabNavigator'; // Admin tabs (new)

// Shared screens
import AdminConsultationDetailScreen from '../screens/AdminConsultationDetailScreen';
import AdminAddProviderScreen from '../screens/AdminAddProviderScreen';
import AdminEditProviderScreen from '../screens/AdminEditProviderScreen';
import AdminProviderApprovalsScreen from '../screens/AdminProviderApprovalsScreen';
import AdminProviderDetailsScreen from '../screens/AdminProviderDetailsScreen';
import AdminServiceCategoriesScreen from '../screens/AdminServiceCategoriesScreen';
import AdminUsersManagementScreen from '../screens/AdminUsersManagementScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PaymentScreen from '../components/PaymentScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userDoc = await firestore()
            .collection('users')
            .doc(authUser.uid)
            .get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            // HomeServicesAdmin app is for admins only - set role to admin
            setUserRole('admin');
          } else {
            // New user - set as admin for HomeServicesAdmin app
              setUserRole('admin');
          }
        } catch (error) {
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }

      setUser(authUser);
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  const getInitialRoute = () => {
    if (!user) return 'Login';
    // HomeServicesAdmin app is for admins only - always go to AdminMain
        return 'AdminMain';
  };

  return (
    <NavigationContainer
      theme={{
        dark: isDarkMode,
        colors: {
          primary: theme.primary,
          background: theme.background,
          card: theme.card,
          text: theme.text,
          border: theme.border,
          notification: theme.primary,
        },
      }}>
      <Stack.Navigator
        initialRouteName={getInitialRoute()}
        screenOptions={{headerShown: false}}>
        {/* Authentication */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{headerShown: true, title: 'Admin Login'}} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />

        {/* Patient Navigation */}
        <Stack.Screen name="Main" component={MainTabs} />

        {/* Doctor Navigation */}
        <Stack.Screen name="DoctorMain" component={DoctorTabNavigator} />

        {/* Admin Navigation */}
        <Stack.Screen name="AdminMain" component={AdminTabNavigator} />

        {/* Shared Screens */}
        <Stack.Screen
          name="AdminConsultationDetail"
          component={AdminConsultationDetailScreen}
          options={{
            headerShown: true,
            title: 'Service Request Details',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="AddProvider"
          component={AdminAddProviderScreen}
          options={{
            headerShown: true,
            title: 'Add Provider',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="EditProvider"
          component={AdminEditProviderScreen}
          options={{
            headerShown: true,
            title: 'Edit Provider',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="ProviderDetails"
          component={AdminProviderDetailsScreen}
          options={{
            headerShown: true,
            title: 'Provider Details',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="ServiceCategories"
          component={AdminServiceCategoriesScreen}
          options={{
            headerShown: true,
            title: 'Service Categories',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="AdminUsersManagement"
          component={AdminUsersManagementScreen}
          options={{
            headerShown: true,
            title: 'User Management',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            headerShown: true,
            title: 'My Profile',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{
            headerShown: true,
            title: 'Payment',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="HelpSupport"
          component={HelpSupportScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
