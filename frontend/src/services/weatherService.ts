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

export const getCurrentWeather = async (location: string): Promise<WeatherData & { coordinates?: string }> => {
  try {
    const response = await apiClient.get<any>(`/weather`, { params: { location } });
    
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
