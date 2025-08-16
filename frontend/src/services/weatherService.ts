import axios from 'axios';
import { WeatherData } from '../types/weather';

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

export const getCurrentWeather = async (location: string): Promise<WeatherData & { coordinates?: string }> => {
  try {
    const response = await apiClient.get<any>(`/weather/current/${encodeURIComponent(location)}`);
    
    // The backend returns { success: true, data: { ...weatherData }, ... }
    if (response.data.success && response.data.data) {
      return {
        ...response.data.data,
        location: response.data.location,
        coordinates: response.data.coordinates,
      };
    } else {
      throw new Error('Invalid response format from weather API');
    }
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }
};

export const getWeatherForecast = async (location: string, timesteps: string = '1h'): Promise<any> => {
  try {
    const response = await apiClient.get(`/weather/forecast/${encodeURIComponent(location)}`, {
      params: { timesteps },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    throw error;
  }
};

export const getSupportedLocations = async (): Promise<any> => {
  try {
    const response = await apiClient.get<any>('/weather/locations');
    return response.data;
  } catch (error) {
    console.error('Error fetching supported locations:', error);
    throw error;
  }
};

export const getWeatherParameters = async (): Promise<any> => {
  try {
    const response = await apiClient.get<any>('/weather/parameters');
    return response.data;
  } catch (error) {
    console.error('Error fetching weather parameters:', error);
    throw error;
  }
};

export const validateLocation = async (location: string): Promise<any> => {
  try {
    const response = await apiClient.post('/weather/location/validate', { location });
    return response.data;
  } catch (error) {
    console.error('Error validating location:', error);
    throw error;
  }
};
