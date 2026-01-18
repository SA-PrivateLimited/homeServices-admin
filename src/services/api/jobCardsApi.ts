/**
 * Job Cards API Service (Admin App)
 * Handles all job card operations via backend API
 */

import {apiGet, apiPut, apiDelete} from './apiClient';

export interface JobCard {
  _id?: string;
  id?: string;
  providerId: string;
  providerName: string;
  providerAddress: {
    type: 'home' | 'office';
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: {
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  serviceType: string;
  problem?: string;
  consultationId?: string;
  bookingId?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  taskPIN?: string;
  pinGeneratedAt?: string | Date;
  scheduledTime?: string | Date;
  cancellationReason?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface JobCardFilters {
  status?: string;
  customerId?: string;
  providerId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get all job cards (admin endpoint)
 */
export async function getAllJobCards(filters?: JobCardFilters): Promise<JobCard[]> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/admin/jobCards?${queryString}` : '/admin/jobCards';

    const response = await apiGet<{data: JobCard[]; count: number} | JobCard[]>(endpoint);
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  } catch (error) {
    console.error('Error fetching job cards:', error);
    throw error;
  }
}

/**
 * Get job card by ID (admin endpoint)
 */
export async function getJobCardById(jobCardId: string): Promise<JobCard | null> {
  try {
    return await apiGet<JobCard>(`/admin/jobCards/${jobCardId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Update job card (admin endpoint)
 */
export async function updateJobCard(
  jobCardId: string,
  updates: Partial<JobCard>,
): Promise<JobCard> {
  return apiPut<JobCard>(`/admin/jobCards/${jobCardId}`, updates);
}

/**
 * Delete job card (admin endpoint)
 */
export async function deleteJobCard(jobCardId: string): Promise<void> {
  await apiDelete(`/admin/jobCards/${jobCardId}`);
}

export const jobCardsApi = {
  getAll: getAllJobCards,
  getById: getJobCardById,
  update: updateJobCard,
  delete: deleteJobCard,
};
