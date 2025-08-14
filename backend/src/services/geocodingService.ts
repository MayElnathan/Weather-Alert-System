import axios from 'axios';
import { logger } from '../utils/logger';

export interface GeocodingResult {
  name: string;
  displayName: string;
  country: string;
  city?: string;
  state?: string;
  coordinates: string;
}

export class GeocodingService {
  private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

  /**
   * Reverse geocode coordinates to get location information
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult> {
    try {
      const response = await axios.get(`${this.NOMINATIM_BASE_URL}/reverse`, {
        params: {
          format: 'json',
          lat: latitude,
          lon: longitude,
          zoom: 10,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'Weather-Alert-System/1.0',
        },
        timeout: 5000,
      });

      const data = response.data;
      const address = data.address || {};

      // Extract location components
      const city = address.city || address.town || address.village || address.county;
      const state = address.state || address.province;
      const country = address.country || 'Unknown';

      // Build display name
      let displayName = '';
      if (city) displayName += city;
      if (state && city !== state) displayName += displayName ? `, ${state}` : state;
      if (country) displayName += displayName ? `, ${country}` : country;

      // Fallback to coordinates if no readable name
      if (!displayName) {
        displayName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      return {
        name: city || displayName,
        displayName,
        country,
        city,
        state,
        coordinates: `${latitude},${longitude}`,
      };
    } catch (error) {
      logger.error('Reverse geocoding failed:', error);

      // Fallback to coordinates
      return {
        name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        country: 'Unknown',
        coordinates: `${latitude},${longitude}`,
      };
    }
  }

  /**
   * Forward geocode a location name to get coordinates
   */
  static async forwardGeocode(locationName: string): Promise<GeocodingResult | null> {
    try {
      const response = await axios.get(`${this.NOMINATIM_BASE_URL}/search`, {
        params: {
          format: 'json',
          q: locationName,
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'Weather-Alert-System/1.0',
        },
        timeout: 5000,
      });

      if (!response.data || response.data.length === 0) {
        return null;
      }

      const result = response.data[0];
      const address = result.address || {};

      return {
        name: address.city || address.town || address.village || locationName,
        displayName: result.display_name || locationName,
        country: address.country || 'Unknown',
        city: address.city || address.town || address.village,
        state: address.state || address.province,
        coordinates: `${result.lat},${result.lon}`,
      };
    } catch (error) {
      logger.error('Forward geocoding failed:', error);
      return null;
    }
  }

  /**
   * Validate if a location string is valid (coordinates or known city)
   */
  static isValidLocation(location: string): boolean {
    // Check if it's valid coordinates
    const coordMatch = location.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1] || '0');
      const lon = parseFloat(coordMatch[2] || '0');
      return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    }

    // Check if it's a reasonable location name
    return location.length >= 2 && location.length <= 100;
  }

  /**
   * Get location info for either coordinates or city name
   */
  static async getLocationInfo(location: string): Promise<GeocodingResult> {
    // Check if it's coordinates
    const coordMatch = location.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const latitude = parseFloat(coordMatch[1] || '0');
      const longitude = parseFloat(coordMatch[2] || '0');
      return this.reverseGeocode(latitude, longitude);
    }

    // Try forward geocoding for city names
    const geocoded = await this.forwardGeocode(location);
    if (geocoded) {
      return geocoded;
    }

    // Fallback for unknown locations
    return {
      name: location,
      displayName: location,
      country: 'Unknown',
      coordinates: '',
    };
  }
}
