import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { weatherCache } from '../utils/cache';
import { GeocodingService } from './geocodingService';

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  cloudCover: number;
  weatherCode: number;
  weatherDescription: string;
  timestamp: string;
}

export interface TomorrowIOConfig {
  apiKey: string;
  baseUrl: string;
}

// Create Tomorrow.io service factory function
export const createTomorrowIOService = () => {
  return new TomorrowIOService({
    apiKey: process.env['TOMORROW_API_KEY'] || '',
    baseUrl: process.env['TOMORROW_API_BASE_URL'] || 'https://api.tomorrow.io/v4',
  });
};

export class TomorrowIOService {
  private client: AxiosInstance;
  private config: TomorrowIOConfig;

  constructor(config: TomorrowIOConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 15000, // Increased timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get current weather data for a location with caching and retry logic
   * @param location - City name or coordinates (lat,lng)
   * @returns Promise<WeatherData>
   */
  async getCurrentWeather(location: string): Promise<WeatherData> {
    // Check cache first
    const cacheKey = `weather:${location}`;
    const cachedData = weatherCache.get(cacheKey);
    if (cachedData) {
      logger.debug('Returning cached weather data for:', location);
      return cachedData;
    }

    // Use retry handler with exponential backoff
    const result = await this.fetchWeatherData(location);

    // Cache the successful result
    weatherCache.set(cacheKey, result!, 3 * 60 * 1000); // 3 minutes TTL
    
    return result!;
  }

  /**
   * Fetch weather data from API (internal method)
   * @param location - Location string
   * @returns Promise<WeatherData>
   */
  private async fetchWeatherData(location: string): Promise<WeatherData> {
    try {
      // Parse location - could be city name or coordinates
      const coordinates = await this.parseLocation(location);
      
      // Fetch weather data from Tomorrow.io API
      const response = await this.client.get('/weather/realtime', {
        params: {
          location: coordinates,
          apikey: this.config.apiKey,
          units: 'metric',
        },
      });

      const data = response.data;
      
      if (!data.data || !data.data.values) {
        throw new Error('Invalid response format from Tomorrow.io API');
      }

      const values = data.data.values;
      const time = data.data.time;

      return {
        temperature: values.temperature || 0,
        feelsLike: values.temperatureApparent || 0,
        humidity: values.humidity || 0,
        windSpeed: values.windSpeed || 0,
        windDirection: values.windDirection || 0,
        precipitation: values.precipitationIntensity || 0,
        pressure: values.pressureSurfaceLevel || 0,
        visibility: values.visibility || 0,
        uvIndex: values.uvIndex || 0,
        cloudCover: values.cloudCover || 0,
        weatherCode: values.weatherCode || 0,
        weatherDescription: this.getWeatherDescription(values.weatherCode || 0),
        timestamp: time || new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to fetch current weather:', {
        location,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get weather forecast for a location with caching
   * @param location - City name or coordinates (lat,lng)
   * @param timesteps - Forecast timesteps (e.g., '1h', '1d')
   * @returns Promise<any>
   */
  async getForecast(location: string, timesteps: string = '1h'): Promise<any> {
    // Check cache first
    const cacheKey = `forecast:${location}:${timesteps}`;
    const cachedData = weatherCache.get(cacheKey);
    if (cachedData) {
      logger.debug('Returning cached forecast data for:', location);
      return cachedData;
    }

    // Use retry handler
    const result = await this.fetchForecastData(location, timesteps);

    if (!result.success) {
      throw result.error;
    }

    // Cache the successful result (forecast data can be cached longer)
    weatherCache.set(cacheKey, result.data!, 3 * 60 * 1000); // 3 minutes TTL
    
    return result.data!;
  }

  /**
   * Fetch forecast data from API (internal method)
   * @param location - Location string
   * @param timesteps - Forecast timesteps
   * @returns Promise<any>
   */
  private async fetchForecastData(location: string, timesteps: string): Promise<any> {
    try {
      const coordinates = await this.parseLocation(location);
      
      const response = await this.client.get('/weather/forecast', {
        params: {
          location: coordinates,
          apikey: this.config.apiKey,
          units: 'metric',
          timesteps,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch weather forecast:', {
        location,
        timesteps,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Parse location parameter to determine if it's coordinates or city name
   * @param location - Location string
   * @returns Object with location parameters
   */
  private async parseLocation(location: string): Promise<string> {
    // Check if location is coordinates (lat,lng format)
    const coordMatch = location.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    
    if (coordMatch) {
      return location;
    }

    const geocodingResult = await GeocodingService.forwardGeocode(location);

    if (!geocodingResult) {
      throw new Error(`Location "${location}" not supported. Please use coordinates (lat,lng) format or a supported city name.`);
    }

    return geocodingResult.coordinates;
  }

  /**
   * Get human-readable weather description from weather code
   * @param code - Weather code from API
   * @returns Weather description string
   */
  private getWeatherDescription(code: number): string {
    const weatherDescriptions: { [key: number]: string } = {
      1000: 'Clear',
      1001: 'Cloudy',
      1100: 'Mostly Clear',
      1101: 'Partly Cloudy',
      1102: 'Mostly Cloudy',
      2000: 'Fog',
      2100: 'Light Fog',
      4000: 'Drizzle',
      4001: 'Rain',
      4200: 'Light Rain',
      4201: 'Heavy Rain',
      5000: 'Snow',
      5001: 'Flurries',
      5100: 'Light Snow',
      5101: 'Heavy Snow',
      6000: 'Freezing Drizzle',
      6001: 'Freezing Rain',
      6200: 'Light Freezing Rain',
      6201: 'Heavy Freezing Rain',
      7000: 'Ice Pellets',
      7101: 'Heavy Ice Pellets',
      7102: 'Light Ice Pellets',
      8000: 'Thunderstorm',
    };

    return weatherDescriptions[code] || 'Unknown';
  }

  /**
   * Validate API configuration
   * @returns Promise<boolean>
   */
  async validateConfig(): Promise<boolean> {
    try {
      // Make a simple API call to validate the configuration
      await this.client.get('/weather/realtime', {
        params: {
          location: 'New York',
          apikey: this.config.apiKey,
        },
      });
      return true;
    } catch (error) {
      logger.error('Tomorrow.io API configuration validation failed:', error);
      return false;
    }
  }
}
