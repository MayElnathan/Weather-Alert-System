import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Navigation, Loader2 } from 'lucide-react';
import { GeolocationService, LocationInfo } from '../services/geolocationService';
import { toast } from 'react-hot-toast';

interface Location {
  name: string;
  coordinates: string;
  country: string;
}

interface LocationSelectorProps {
  locations: Location[];
  selectedLocation: string;
  onLocationChange: (location: string) => void;
}

const LocationSelector = ({
  locations,
  selectedLocation,
  onLocationChange,
}: LocationSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [geolocationSupported, setGeolocationSupported] = useState<boolean>(false);

  useEffect(() => {
    // Check geolocation support on component mount
    GeolocationService.checkGeolocationSupport().then(({ supported }) => {
      setGeolocationSupported(supported);
    });
  }, []);

  const handleLocationSelect = (location: string) => {
    onLocationChange(location);
    setIsOpen(false);
  };

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const locationInfo = await GeolocationService.getCurrentLocationWithName();
      setCurrentLocation(locationInfo);
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

  const selectedLocationData = locations.find(loc => loc.name === selectedLocation);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
        <span className="mr-2">
          {selectedLocationData ? selectedLocationData.name : selectedLocation}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-64 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {/* Use My Location Button */}
          {geolocationSupported && (
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-blue-700 border-b border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center">
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                <span className="font-medium">
                  {isGettingLocation ? 'Getting location...' : 'Use My Location'}
                </span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {currentLocation ? `Current: ${currentLocation.name}` : 'Get your current location'}
              </div>
            </button>
          )}

          {/* Divider */}
          {geolocationSupported && locations.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
              Popular Cities
            </div>
          )}

          {/* Location List */}
          {locations.map(location => (
            <button
              key={location.name}
              onClick={() => handleLocationSelect(location.name)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                location.name === selectedLocation
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-900'
              }`}
            >
              <div className="font-medium">{location.name}</div>
              <div className="text-xs text-gray-500">{location.country}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
