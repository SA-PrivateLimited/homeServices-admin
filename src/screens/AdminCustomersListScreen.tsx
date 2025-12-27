import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import type {User} from '../types/consultation';

interface Customer extends User {
  role?: 'customer';
}

export default function AdminCustomersListScreen({navigation}: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const {currentUser} = useStore();

  useEffect(() => {
    // SECURITY: Verify current user is admin
    if (currentUser?.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can access this screen.');
      navigation.goBack();
      return;
    }

    const unsubscribe = firestore()
      .collection('users')
      .where('role', '==', 'customer')
      .onSnapshot(
        snapshot => {
          const customersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
          })) as Customer[];

          setCustomers(customersList);
          setLoading(false);
        },
        error => {
          // If index doesn't exist, fallback to fetching all users and filtering
          console.warn('Index error, falling back to full query:', error);
          const fallbackUnsubscribe = firestore()
            .collection('users')
            .onSnapshot(
              snapshot => {
                const allUsers = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  createdAt: doc.data().createdAt?.toDate(),
                })) as Customer[];

                const customersList = allUsers.filter(user => user.role === 'customer');
                setCustomers(customersList);
                setLoading(false);
              },
              error => {
                Alert.alert('Error', 'Failed to load customers. Please try again.');
                setLoading(false);
              },
            );
          return fallbackUnsubscribe;
        },
      );

    return () => unsubscribe();
  }, [currentUser, navigation]);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch =
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery);
    return matchesSearch;
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customer Management</Text>
        <Text style={styles.headerSubtitle}>{customers.length} total customers</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>
      </View>

      {/* Customers List */}
      <ScrollView style={styles.customersList}>
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        ) : (
          filteredCustomers.map(customer => (
            <View key={customer.id} style={styles.customerCard}>
              <View style={styles.customerInfo}>
                <View style={[styles.roleBadge, {backgroundColor: '#4A90E220'}]}>
                  <Icon name="person" size={20} color="#4A90E2" />
                </View>
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{customer.name || 'No name'}</Text>
                  {customer.email && (
                    <Text style={styles.customerEmail}>{customer.email}</Text>
                  )}
                  {customer.phone && (
                    <Text style={styles.customerPhone}>{customer.phone}</Text>
                  )}
                  {customer.secondaryPhone && (
                    <Text style={styles.customerPhone}>
                      Secondary: {customer.secondaryPhone}
                      {customer.secondaryPhoneVerified && (
                        <Icon name="verified" size={14} color="#4CAF50" style={styles.verifiedIcon} />
                      )}
                    </Text>
                  )}
                  <View style={styles.statusContainer}>
                    <Text style={styles.statusLabel}>Phone Verified: </Text>
                    <Icon
                      name={customer.phoneVerified ? "check-circle" : "cancel"}
                      size={16}
                      color={customer.phoneVerified ? "#4CAF50" : "#FF3B30"}
                    />
                  </View>
                  {customer.createdAt && (
                    <Text style={styles.createdAt}>
                      Joined: {customer.createdAt.toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  loadingText: {
    marginTop: 10,
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  customersList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#8E8E93',
  },
  customerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  roleBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  createdAt: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
  },
});

