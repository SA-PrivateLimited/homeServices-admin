/**
 * Service Categories Admin Service
 * Admin operations for managing service categories
 */

import firestore from '@react-native-firebase/firestore';

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string; // Material icon name
  color: string; // Hex color code
  description?: string;
  isActive: boolean;
  order: number; // Display order
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTIONS = {
  SERVICE_CATEGORIES: 'serviceCategories',
};

/**
 * Fetch all service categories (including inactive ones for admin)
 */
export const fetchAllServiceCategories = async (): Promise<ServiceCategory[]> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.SERVICE_CATEGORIES)
      .orderBy('order', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    })) as ServiceCategory[];
  } catch (error) {
    console.error('Error fetching all service categories:', error);
    throw new Error('Failed to fetch service categories');
  }
};

/**
 * Add a new service category (Admin only)
 */
export const addServiceCategory = async (
  category: Omit<ServiceCategory, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> => {
  try {
    const now = firestore.Timestamp.now();
    const docRef = await firestore()
      .collection(COLLECTIONS.SERVICE_CATEGORIES)
      .add({
        ...category,
        createdAt: now,
        updatedAt: now,
      });

    return docRef.id;
  } catch (error) {
    console.error('Error adding service category:', error);
    throw new Error('Failed to add service category');
  }
};

/**
 * Update a service category (Admin only)
 */
export const updateServiceCategory = async (
  categoryId: string,
  updates: Partial<Omit<ServiceCategory, 'id' | 'createdAt'>>,
): Promise<void> => {
  try {
    await firestore()
      .collection(COLLECTIONS.SERVICE_CATEGORIES)
      .doc(categoryId)
      .update({
        ...updates,
        updatedAt: firestore.Timestamp.now(),
      });
  } catch (error) {
    console.error('Error updating service category:', error);
    throw new Error('Failed to update service category');
  }
};

/**
 * Delete a service category (Admin only)
 */
export const deleteServiceCategory = async (categoryId: string): Promise<void> => {
  try {
    await firestore()
      .collection(COLLECTIONS.SERVICE_CATEGORIES)
      .doc(categoryId)
      .delete();
  } catch (error) {
    console.error('Error deleting service category:', error);
    throw new Error('Failed to delete service category');
  }
};

