import axios from 'axios';
import { 
  Alert, 
  CreateAlertData, 
  UpdateAlertData,
  AlertsResponse,
  AlertResponse,
  AlertStatusResponse
} from '../types/alert';

// API configuration
const API_BASE_URL = (typeof window !== 'undefined' && (window as any).__VITE_API_BASE_URL) || 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error?.message) {
      throw new Error(error.response.data.error.message);
    }
    throw new Error(error.message || 'An error occurred');
  }
);

export const getAlerts = async (params?: { active?: boolean; location?: string }): Promise<AlertsResponse> => {
  try {
    const response = await apiClient.get<AlertsResponse>('/alerts', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
};

export const getAlert = async (id: string): Promise<Alert> => {
  try {
    const response = await apiClient.get<AlertResponse>(`/alerts/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching alert:', error);
    throw error;
  }
};

export const createAlert = async (data: CreateAlertData): Promise<Alert> => {
  try {
    const response = await apiClient.post<AlertResponse>('/alerts', data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
};

export const updateAlert = async ({ id, data }: UpdateAlertData): Promise<Alert> => {
  try {
    const response = await apiClient.put<AlertResponse>(`/alerts/${id}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Error updating alert:', error);
    throw error;
  }
};

export const deleteAlert = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/alerts/${id}`);
  } catch (error) {
    console.error('Error deleting alert:', error);
    throw error;
  }
};

export const toggleAlertActive = async (id: string, isActive: boolean): Promise<Alert> => {
  try {
    const response = await apiClient.patch<AlertResponse>(`/alerts/${id}/toggle-active`, { isActive });
    return response.data.data;
  } catch (error) {
    console.error('Error toggling alert active state:', error);
    throw error;
  }
};

export const getCurrentAlertStatus = async (): Promise<AlertStatusResponse> => {
  try {
    const response = await apiClient.get<AlertStatusResponse>('/alerts/status/current');
    return response.data;
  } catch (error) {
    console.error('Error fetching alert status:', error);
    throw error;
  }
};

export const evaluateAlert = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.post(`/alerts/${id}/evaluate`);
    return response.data;
  } catch (error) {
    console.error('Error evaluating alert:', error);
    throw error;
  }
};
