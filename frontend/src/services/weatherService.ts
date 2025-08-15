import axios from 'axios';
import { 
  WeatherData, 
  WeatherForecast, 
  Location, 
  WeatherParameter,
  WeatherResponse,
  LocationsResponse,
  ParametersResponse
} from '../types/weather';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

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
    const response = await apiClient.get<WeatherResponse & { coordinates?: string }>(`/weather/current/${encodeURIComponent(location)}`);
    return {
      ...response.data.data,
      location: response.data.location,
      coordinates: response.data.coordinates,
    };
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }
};

export const getWeatherForecast = async (location: string, timesteps: string = '1h'): Promise<WeatherForecast> => {
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

export const getSupportedLocations = async (): Promise<LocationsResponse> => {
  try {
    const response = await apiClient.get<LocationsResponse>('/weather/locations');
    return response.data;
  } catch (error) {
    console.error('Error fetching supported locations:', error);
    throw error;
  }
};

export const getWeatherParameters = async (): Promise<ParametersResponse> => {
  try {
    const response = await apiClient.get<ParametersResponse>('/weather/parameters');
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
