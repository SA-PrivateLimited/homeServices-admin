import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import LanguageSwitcher from '../components/LanguageSwitcher';
import useTranslation from '../hooks/useTranslation';

import AdminProvidersListScreen from '../screens/AdminProvidersListScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import AdminProviderApprovalsScreen from '../screens/AdminProviderApprovalsScreen';
import AdminCustomersListScreen from '../screens/AdminCustomersListScreen';
import AdminJobCardsListScreen from '../screens/AdminJobCardsListScreen';
import AdminOrdersScreen from '../screens/AdminOrdersScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabNavigator() {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF9500',
        tabBarInactiveTintColor: '#8E8E93',
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerRight: () => (
          <View style={{marginRight: 16}}>
            <LanguageSwitcher compact />
          </View>
        ),
      }}>
      <Tab.Screen
        name="Providers"
        component={AdminProvidersListScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="handyman" size={size} color={color} />
          ),
          tabBarLabel: t('common.providers'),
        }}
      />
      <Tab.Screen
        name="Customers"
        component={AdminCustomersListScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="people" size={size} color={color} />
          ),
          tabBarLabel: t('common.customers'),
        }}
      />
      <Tab.Screen
        name="Approvals"
        component={AdminProviderApprovalsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="verified-user" size={size} color={color} />
          ),
          tabBarLabel: t('common.approvals'),
        }}
      />
      <Tab.Screen
        name="Job Cards"
        component={AdminJobCardsListScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="assignment" size={size} color={color} />
          ),
          tabBarLabel: t('common.jobCards'),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={AdminOrdersScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="receipt-long" size={size} color={color} />
          ),
          tabBarLabel: t('common.orders'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={AdminSettingsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="settings" size={size} color={color} />
          ),
          tabBarLabel: t('common.settings'),
        }}
      />
    </Tab.Navigator>
  );
}
