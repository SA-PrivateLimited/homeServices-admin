/**
 * Admin Authentication Service
 * Uses Firebase Admin SDK (via service account) for admin access verification
 * This allows admin access without requiring Firebase Auth user accounts
 */

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import type {User} from '../types/consultation';

// Service account email from serviceAccountKey.json
const SERVICE_ACCOUNT_EMAIL = 'firebase-adminsdk-fbsvc@home-services-1ea69.iam.gserviceaccount.com';

/**
 * Admin users list - emails that have admin access
 * This should match users in Firestore with role='admin'
 */
const ADMIN_EMAILS = [
  'jobforsandeep2025@gmail.com',
  SERVICE_ACCOUNT_EMAIL,
];

/**
 * Verify if an email has admin access
 * Checks both the admin emails list and Firestore user role
 */
export const verifyAdminAccess = async (email: string): Promise<boolean> => {
  try {
    // Check if email is in admin list
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      return true;
    }

    // Check Firestore for user with admin role
    const usersSnapshot = await firestore()
      .collection('users')
      .where('email', '==', email.toLowerCase())
      .where('role', '==', 'admin')
      .limit(1)
      .get();

    return !usersSnapshot.empty;
  } catch (error) {
    console.error('Error verifying admin access:', error);
    return false;
  }
};

/**
 * Create admin user account using service account credentials
 * This creates a Firebase Auth user and sets admin role in Firestore
 */
export const createAdminUser = async (
  email: string,
  password: string,
  name: string,
): Promise<User> => {
  try {
    // Verify this is an admin email
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      throw new Error('Email is not authorized for admin access');
    }

    // Create Firebase Auth user
    const userCredential = await auth().createUserWithEmailAndPassword(
      email,
      password,
    );

    // Update display name
    await userCredential.user.updateProfile({
      displayName: name,
    });

    // Create admin user document in Firestore
    const userData: User = {
      id: userCredential.user.uid,
      name,
      email,
      phone: userCredential.user.phoneNumber || '',
      role: 'admin',
      createdAt: new Date(),
    };

    await firestore()
      .collection('users')
      .doc(userCredential.user.uid)
      .set(userData);

    return userData;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      // User exists, update role to admin
      const existingUser = await auth().signInWithEmailAndPassword(email, password);
      await firestore()
        .collection('users')
        .doc(existingUser.user.uid)
        .set({role: 'admin'}, {merge: true});
      
      const userDoc = await firestore()
        .collection('users')
        .doc(existingUser.user.uid)
        .get();
      
      return {
        id: userDoc.id,
        ...userDoc.data(),
        role: 'admin',
      } as User;
    }
    throw error;
  }
};

/**
 * Login as admin using email/password
 * Verifies admin access before allowing login
 */
export const loginAsAdmin = async (
  email: string,
  password: string,
): Promise<User> => {
  try {
    // Verify admin access first
    const hasAdminAccess = await verifyAdminAccess(email);
    if (!hasAdminAccess) {
      throw new Error('Access denied. This email is not authorized for admin access.');
    }

    // Authenticate with Firebase
    const userCredential = await auth().signInWithEmailAndPassword(email, password);

    // Get or create user document
    const userDoc = await firestore()
      .collection('users')
      .doc(userCredential.user.uid)
      .get();

    let userData: User;

    if (userDoc.exists) {
      const docData = userDoc.data();
      // Ensure role is set to admin
      if (docData?.role !== 'admin') {
        await firestore()
          .collection('users')
          .doc(userCredential.user.uid)
          .set({role: 'admin'}, {merge: true});
      }
      userData = {
        id: userDoc.id,
        ...docData,
        role: 'admin',
        createdAt: docData?.createdAt?.toDate(),
      } as User;
    } else {
      // Create admin user document
      userData = {
        id: userCredential.user.uid,
        email: userCredential.user.email || email,
        name: userCredential.user.displayName || 'Admin',
        phone: userCredential.user.phoneNumber || '',
        role: 'admin',
        createdAt: new Date(),
      };

      await firestore()
        .collection('users')
        .doc(userCredential.user.uid)
        .set(userData);
    }

    return userData;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('User not found. Please create an admin account first.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email format.');
    } else if (error.message?.includes('Access denied')) {
      throw error;
    }
    throw new Error('Failed to login as admin. Please try again.');
  }
};

/**
 * Check if current user is admin
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser || !currentUser.email) {
      return false;
    }

    return await verifyAdminAccess(currentUser.email);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Grant admin access to an email
 * Adds email to admin list and updates Firestore
 */
export const grantAdminAccess = async (email: string): Promise<void> => {
  try {
    // Find user by email in Firestore
    const usersSnapshot = await firestore()
      .collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      throw new Error('User not found. User must have an account first.');
    }

    const userDoc = usersSnapshot.docs[0];
    await firestore()
      .collection('users')
      .doc(userDoc.id)
      .set({role: 'admin'}, {merge: true});

    console.log(`✅ Admin access granted to ${email}`);
  } catch (error: any) {
    throw new Error(`Failed to grant admin access: ${error.message}`);
  }
};

export default {
  verifyAdminAccess,
  createAdminUser,
  loginAsAdmin,
  isCurrentUserAdmin,
  grantAdminAccess,
};

