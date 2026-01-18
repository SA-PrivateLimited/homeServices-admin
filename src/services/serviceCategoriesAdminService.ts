/**
 * Service Categories Admin Service
 * Admin operations for managing service categories
 */

import firestore from '@react-native-firebase/firestore';

export interface QuestionnaireQuestion {
  id: string;
  question: string; // English question (backward compatibility)
  questionHi?: string; // Hindi question (optional)
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  options?: string[]; // English options for select and multiselect types (backward compatibility)
  optionsHi?: string[]; // Hindi options for select and multiselect types (optional)
  required: boolean;
  placeholder?: string; // English placeholder (backward compatibility)
  placeholderHi?: string; // Hindi placeholder (optional)
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string; // Material icon name
  color: string; // Hex color code
  description?: string; // English description
  descriptionHi?: string; // Hindi description
  isActive: boolean;
  order: number; // Display order
  questionnaire?: QuestionnaireQuestion[]; // Questions for this service category
  requiresVehicle?: boolean; // For driver/transport services
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
    const updateData: any = {
      ...updates,
      updatedAt: firestore.Timestamp.now(),
    };

    // If questionnaire is explicitly set to undefined or empty array, delete the field
    if (updates.questionnaire === undefined || (Array.isArray(updates.questionnaire) && updates.questionnaire.length === 0)) {
      updateData.questionnaire = firestore.FieldValue.delete();
    }

    await firestore()
      .collection(COLLECTIONS.SERVICE_CATEGORIES)
      .doc(categoryId)
      .update(updateData);
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

