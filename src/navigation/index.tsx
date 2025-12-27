import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

// Screens - Settings
import SettingsScreen from '../screens/SettingsScreen';

// Screens - Authentication
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Screens - Consultations
import DoctorsListScreen from '../screens/DoctorsListScreen';
import DoctorDetailsScreen from '../screens/DoctorDetailsScreen';
import BookingScreen from '../screens/BookingScreen';
import ConsultationsHistoryScreen from '../screens/ConsultationsHistoryScreen';
// import VideoCallScreen from '../screens/VideoCallScreen'; // Temporarily disabled

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ConsultationsStack = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}>
      <Stack.Screen
        name="DoctorsList"
        component={DoctorsListScreen}
        options={({navigation}) => ({
          title: 'Find Doctors',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('ConsultationsHistory')}
              style={{marginRight: 15}}>
              <Icon name="calendar-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="ConsultationsHistory"
        component={ConsultationsHistoryScreen}
        options={{title: 'My Consultations'}}
      />
      <Stack.Screen
        name="DoctorDetails"
        component={DoctorDetailsScreen}
        options={{title: 'Doctor Details'}}
      />
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{title: 'Book Consultation'}}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'My Profile'}}
      />
      {/* VideoCall screen temporarily disabled
      <Stack.Screen
        name="VideoCall"
        component={VideoCallScreen}
        options={{
          title: 'Video Consultation',
          headerShown: false,
        }}
      />
      */}
    </Stack.Navigator>
  );
};

const SettingsStack = React.memo(() => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}>
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: 'My Profile'}}
      />
    </Stack.Navigator>
  );
});

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Consultations':
              iconName = focused ? 'medical' : 'medical-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
          borderWidth: 0,
        },
        tabBarItemStyle: {
          borderWidth: 0,
          borderRightWidth: 0,
          borderLeftWidth: 0,
        },
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            style={[
              props.style,
              {
                borderWidth: 0,
                borderRightWidth: 0,
                borderLeftWidth: 0,
                borderColor: 'transparent',
              },
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarShowLabel: true,
      })}>
      <Tab.Screen 
        name="Consultations" 
        component={ConsultationsStack}
        options={{title: 'Consultations'}}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStack}
        options={{title: 'Settings'}}
      />
    </Tab.Navigator>
  );
};

const Navigation = () => {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  // For now, allow access without login (auth is optional)
  // Later can make it required: const isAuthenticated = currentUser !== null;
  const showAuthRequired = false; // Set to true to require login

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
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {showAuthRequired && !currentUser ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
        {/* Auth screens accessible from anywhere */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
