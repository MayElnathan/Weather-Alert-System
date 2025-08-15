import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Navigation } from 'lucide-react';
import { GeolocationService, LocationInfo } from '../services/geolocationService';
import { useDebounce } from '../hooks/useDebounce';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: LocationInfo) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  showCurrentLocationButton?: boolean;
}

const LocationAutocomplete = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Search location",
  className = "",
  error = false,
  showCurrentLocationButton = true,
}: LocationAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [geolocationSupported, setGeolocationSupported] = useState<boolean>(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check geolocation support on component mount
  useEffect(() => {
    GeolocationService.checkGeolocationSupport().then(({ supported }) => {
      setGeolocationSupported(supported);
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

  // Update search query when value prop changes
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleLocationSelect = (location: LocationInfo) => {
    setSearchQuery(location.name);
    onChange(location.name);
    onLocationSelect(location);
    setIsOpen(false);
  };

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const locationInfo = await GeolocationService.getCurrentLocationWithName();
      onChange(locationInfo.name);
      onLocationSelect(locationInfo);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to get current location:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className={`relative flex items-center bg-white rounded-lg border border-gray-200 ${className}`}>
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
          placeholder={placeholder}
          className={`flex-1 px-3 py-3 bg-white text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-0 border-0 ${
            error ? 'text-red-600' : ''
          }`}
        />
        
        {/* Current Location Button */}
        {showCurrentLocationButton && geolocationSupported && (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isGettingLocation}
            className="flex items-center justify-center w-12 h-12 bg-gray-200 rounded-r-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
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
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">
                        {location.name}
                      </div>
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

export default LocationAutocomplete;
