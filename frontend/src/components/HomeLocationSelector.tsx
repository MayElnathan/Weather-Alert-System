import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Navigation } from 'lucide-react';
import { GeolocationService, LocationInfo } from '../services/geolocationService';
import { useDebounce } from '../hooks/useDebounce';
import { toast } from 'react-hot-toast';

interface HomeLocationSelectorProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  currentLocationInfo?: LocationInfo | null;
}

const HomeLocationSelector = ({
  selectedLocation,
  onLocationChange,
  currentLocationInfo,
}: HomeLocationSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [geolocationSupported, setGeolocationSupported] = useState<boolean>(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check geolocation support on component mount (but don't auto-get location)
  useEffect(() => {
    GeolocationService.checkGeolocationSupport().then(({ supported }) => {
      setGeolocationSupported(supported);
      // Don't automatically get current location - only when user explicitly chooses it
    });
  }, []);

  // Search for locations when the debounced query changes
  useEffect(() => {
    const searchLocations = async () => {
      if (debouncedSearchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await GeolocationService.searchLocations(debouncedSearchQuery, 8);
        setSuggestions(results);
      } catch (error) {
        console.error('Failed to search locations:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchLocations();
  }, [debouncedSearchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0 || searchQuery.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleLocationSelect = (location: LocationInfo) => {
    setSearchQuery(location.name);
    onLocationChange(location.coordinates);
    setIsOpen(false);
    toast.success(`Location set to: ${location.name}`);
  };

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const locationInfo = await GeolocationService.getCurrentLocationWithName();
      onLocationChange(locationInfo.coordinates);
      setIsOpen(false);
      toast.success(`Location set to: ${locationInfo.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      toast.error(errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Determine what to display for the selected location
  const getDisplayText = () => {
    // If we have current location info and the selected location is coordinates, show the name
    if (currentLocationInfo && currentLocationInfo.coordinates === selectedLocation) {
      return currentLocationInfo.name;
    }

    // If it's coordinates but no current location info, show a better message
    const coordMatch = selectedLocation.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    if (coordMatch) {
      // Show a more user-friendly message while getting location name
      return 'Detecting location...';
    }

    // Fallback to the selected location
    return selectedLocation;
  };

  return (
    <div className="relative w-full md:w-96">
      {/* Current Location Display */}
      <div className="mt-2 text-center">
        <span className="text-lg text-gray-600">Current: {getDisplayText()}</span>
      </div>

      <div className="relative flex items-center bg-white rounded-lg border border-gray-200 w-full md:w-96">
        {/* Search Icon */}
        <Search className="ml-3 h-4 w-4 text-gray-500" />

        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder="Search location"
          className="flex-1 px-3 py-3 bg-white text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-0 border-0"
        />

        {/* Current Location Button */}
        {geolocationSupported && (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGettingLocation}
            className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-r-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Use current location"
          >
            {isGettingLocation ? (
              <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
            ) : (
              <Navigation className="h-5 w-5 text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
        >

          {/* Search Results */}
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Searching locations...
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((location, index) => (
                <button
                  key={`${location.coordinates}-${index}`}
                  type="button"
                  onClick={() => handleLocationSelect(location)}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">{location.name}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No locations found for "{searchQuery}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default HomeLocationSelector;
