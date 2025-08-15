import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { tomorrowIORateLimiter } from '../utils/rateLimiter';
import { defaultRetryHandler } from '../utils/retry';
import { weatherCache } from '../utils/cache';

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

    // Add request interceptor for logging and rate limiting
    this.client.interceptors.request.use(
      (config) => {
        // Check rate limit before making request
        const rateLimitCheck = tomorrowIORateLimiter.canProceed('weather-api');
        
        if (!rateLimitCheck.canProceed) {
          const retryAfter = rateLimitCheck.retryAfter;
          if (retryAfter) {
            const error = new Error(`Rate limit exceeded. Try again after ${new Date(retryAfter).toISOString()}`);
            error.name = 'RateLimitError';
            return Promise.reject(error);
          } else {
            const error = new Error('Rate limit exceeded. Please try again later.');
            error.name = 'RateLimitError';
            return Promise.reject(error);
          }
        }

        logger.debug('Tomorrow.io API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
          remainingRequests: tomorrowIORateLimiter.getRemainingRequests('weather-api'),
        });
        return config;
      },
      (error) => {
        logger.error('Tomorrow.io API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Tomorrow.io API Response:', {
          status: response.status,
          url: response.config.url,
          dataKeys: Object.keys(response.data || {}),
        });
        return response;
      },
      (error: AxiosError) => {
        // Handle rate limiting specifically
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          
          logger.warn('Tomorrow.io API rate limit hit:', {
            status: error.response.status,
            retryAfter: retryAfterMs,
            url: error.config?.url,
          });

          // Create a more informative error
          const rateLimitError = new Error(`Rate limit exceeded. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds`);
          rateLimitError.name = 'RateLimitError';
          return Promise.reject(rateLimitError);
        }

        logger.error('Tomorrow.io API Response Error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
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
    const result = await defaultRetryHandler.execute(
      async () => {
        return await this.fetchWeatherData(location);
      }
    );

    if (!result.success) {
      throw result.error;
    }

    // Cache the successful result
    weatherCache.set(cacheKey, result.data!, 10 * 60 * 1000); // 10 minutes TTL
    
    return result.data!;
  }

  /**
   * Fetch weather data from API (internal method)
   * @param location - Location string
   * @returns Promise<WeatherData>
   */
  private async fetchWeatherData(location: string): Promise<WeatherData> {
    try {
      // Parse location - could be city name or coordinates
      const params = this.parseLocation(location);
      
      // Fetch weather data from Tomorrow.io API
      const response = await this.client.get('/weather/realtime', {
        params: {
          location: params.coordinates || params.location,
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
    const result = await defaultRetryHandler.execute(
      async () => {
        return await this.fetchForecastData(location, timesteps);
      }
    );

    if (!result.success) {
      throw result.error;
    }

    // Cache the successful result (forecast data can be cached longer)
    weatherCache.set(cacheKey, result.data!, 30 * 60 * 1000); // 30 minutes TTL
    
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
      const params = this.parseLocation(location);
      
      const response = await this.client.get('/weather/forecast', {
        params: {
          ...params,
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
  private parseLocation(location: string): { location?: string; coordinates?: string } {
    // Check if location is coordinates (lat,lng format)
    const coordMatch = location.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    
    if (coordMatch) {
      return { coordinates: location };
    }
    
    // For city names, we need to convert them to coordinates
    // For now, let's use some common city coordinates
    const cityCoordinates: { [key: string]: string } = {
      'Tel Aviv, Israel': '32.0853,34.7818',
      'New York, NY': '40.7128,-74.0060',
      'London, UK': '51.5074,-0.1278',
      'Tokyo, Japan': '35.6762,139.6503',
      'Sydney, Australia': '-33.8688,151.2093',
      'Toronto, Canada': '43.6532,-79.3832',
      'Berlin, Germany': '52.5200,13.4050',
      'Paris, France': '48.8566,2.3522',
      'Mumbai, India': '19.0760,72.8777',
      'São Paulo, Brazil': '-23.5505,-46.6333',
      'Cape Town, South Africa': '-33.9249,18.4241',
    };
    
    if (cityCoordinates[location]) {
      return { coordinates: cityCoordinates[location] };
    }
    
    // If we don't have coordinates for this city, throw an error
    throw new Error(`Location "${location}" not supported. Please use coordinates (lat,lng) format or a supported city name.`);
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

  /**
   * Get rate limit information
   * @returns Object with rate limit details
   */
  getRateLimitInfo(): {
    remainingRequests: number;
    resetTime: number | null;
    canProceed: boolean;
  } {
    const remaining = tomorrowIORateLimiter.getRemainingRequests('weather-api');
    const resetTime = tomorrowIORateLimiter.getResetTime('weather-api');
    const canProceed = tomorrowIORateLimiter.canProceed('weather-api').canProceed;

    return {
      remainingRequests: remaining,
      resetTime,
      canProceed,
    };
  }
}
