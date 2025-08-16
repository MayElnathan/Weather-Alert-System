import uniqBy from 'lodash/uniqBy';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationInfo {
  coordinates: string;
  name: string;
  isCurrentLocation: boolean;
}

export class GeolocationService {
  /**
   * Get the user's current location using the browser's geolocation API
   */
  static async getCurrentLocation(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        error => {
          let errorMessage = 'Failed to get location';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
            default:
              errorMessage = `Location error: ${error.message}`;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    });
  }

  /**
   * Convert coordinates to a readable location name using reverse geocoding
   */
  static async getLocationName(coordinates: LocationCoordinates): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}&zoom=10&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location name');
      }

      const data = await response.json();

      // Extract city and country from the response
      const address = data.address;
      let locationName = '';

      if (address.city) {
        locationName = address.city;
      } else if (address.town) {
        locationName = address.town;
      } else if (address.village) {
        locationName = address.village;
      } else if (address.county) {
        locationName = address.county;
      }

      if (address.country) {
        locationName = locationName ? `${locationName}, ${address.country}` : address.country;
      }

      // Fallback to coordinates if no readable name found
      return (
        locationName || `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
      );
    } catch (error) {
      // Fallback to coordinates if geocoding fails
      return `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`;
    }
  }

  /**
   * Get current location with a readable name
   */
  static async getCurrentLocationWithName(): Promise<LocationInfo> {
    const coordinates = await this.getCurrentLocation();
    const name = await this.getLocationName(coordinates);

    return {
      coordinates: `${coordinates.latitude},${coordinates.longitude}`,
      name,
      isCurrentLocation: true,
    };
  }

  /**
   * Search for locations by name (forward geocoding)
   */
  static async searchLocations(query: string, limit: number = 5): Promise<LocationInfo[]> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Failed to search locations');
      }

      const data = await response.json();
      
      const parsedLocations =data.map((item: any) => {
        const address = item.address || {};
        const city = address.city || address.town || address.village || address.county || '';
        const state = address.state || address.province || '';
        const country = address.country || '';
        
        let displayName = '';
        if (city) displayName += city;
        if (state && city !== state) displayName += displayName ? `, ${state}` : state;
        if (country) displayName += displayName ? `, ${country}` : country;
        
        // Fallback to the full display name if no structured address
        if (!displayName) {
          displayName = item.display_name || query;
        }

        return {
          coordinates: `${item.lat},${item.lon}`,
          name: displayName,
          isCurrentLocation: false,
        };
      });

      return uniqBy<LocationInfo>(parsedLocations, 'name');
    } catch (error) {
      console.error('Location search failed:', error);
      return [];
    }
  }

  /**
   * Check if geolocation is supported and permission is granted
   */
  static async checkGeolocationSupport(): Promise<{
    supported: boolean;
    permission: 'granted' | 'denied' | 'prompt';
  }> {
    if (!navigator.geolocation) {
      return { supported: false, permission: 'denied' };
    }

    try {
      // Check permission status
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });
        return { supported: true, permission: permission.state as 'granted' | 'denied' | 'prompt' };
      }

      // Fallback: assume permission is prompt if we can't check
      return { supported: true, permission: 'prompt' };
    } catch (error) {
      return { supported: true, permission: 'prompt' };
    }
  }
}
