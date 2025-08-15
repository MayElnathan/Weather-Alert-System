import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Thermometer, Wind, Droplets, Eye, Cloud, Sun, MapPin, RefreshCw } from 'lucide-react';
import { getCurrentWeather } from '../services/weatherService';
import { WeatherData } from '../types/weather';
import { LocationInfo } from '../services/geolocationService';
import WeatherCard from '../components/WeatherCard';
import HomeLocationSelector from '../components/HomeLocationSelector';
import LoadingSpinner from '../components/LoadingSpinner';

const HomePage = () => {
  const [selectedLocation, setSelectedLocation] = useState('Tel Aviv, Israel');
  const [locationDisplayName, setLocationDisplayName] = useState('Tel Aviv, Israel');
  const [isCoordinateLocation, setIsCoordinateLocation] = useState(false);
  const [currentLocationInfo, setCurrentLocationInfo] = useState<LocationInfo | null>(null);



  // Fetch current weather data
  const {
    data: weatherData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['weather', selectedLocation],
    queryFn: () => getCurrentWeather(selectedLocation),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  // Update display name when weather data is received
  useEffect(() => {
    if (weatherData && weatherData.location) {
      setLocationDisplayName(weatherData.location);
      
      // If we have coordinates and location data, create LocationInfo for the selector
      if (weatherData.coordinates && isCoordinateLocation) {
        setCurrentLocationInfo({
          coordinates: weatherData.coordinates,
          name: weatherData.location,
          isCurrentLocation: true,
        });
      }
    }
  }, [weatherData, isCoordinateLocation]);

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    // Check if the location is coordinates
    const coordMatch = location.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
    setIsCoordinateLocation(!!coordMatch);
    
    // If it's coordinates, we need to get the display name
    if (coordMatch) {
      // For coordinates, keep the current display name until we get the new one
      // Don't show "Getting location name..." immediately
      // Clear current location info since we're getting new coordinates
      setCurrentLocationInfo(null);
    } else {
      // For city names, use the name directly
      setLocationDisplayName(location);
      // Clear current location info for predefined cities
      setCurrentLocationInfo(null);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const getWeatherIcon = (weatherCode: number) => {
    if (weatherCode >= 1000 && weatherCode < 2000)
      return <Sun className="h-8 w-8 text-weather-sunny" />;
    if (weatherCode >= 2000 && weatherCode < 3000)
      return <Cloud className="h-8 w-8 text-weather-cloudy" />;
    if (weatherCode >= 4000 && weatherCode < 5000)
      return <Droplets className="h-8 w-8 text-weather-rainy" />;
    if (weatherCode >= 5000 && weatherCode < 6000)
      return <Cloud className="h-8 w-8 text-weather-snowy" />;
    if (weatherCode >= 8000) return <Cloud className="h-8 w-8 text-weather-stormy" />;
    return <Sun className="h-8 w-8 text-weather-sunny" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to load weather data</h2>
        <p className="text-gray-600 mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Current Weather</h1>
        <p className="text-gray-600">Real-time weather information for your selected location</p>
      </div>

      {/* Location Selector */}
      <div className="flex justify-center">
        <HomeLocationSelector
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
          currentLocationInfo={currentLocationInfo}
        />
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={handleRefresh}
          disabled={isRefetching}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Refreshing...' : 'Refresh Weather'}
        </button>
      </div>

      {/* Weather Data */}
      {weatherData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Weather Card */}
          <WeatherCard title="Current Conditions" className="lg:col-span-2">
            <div className="text-center">
              <div className="flex justify-center items-center mb-4">
                {getWeatherIcon(weatherData.weatherCode)}
                <div className="ml-4">
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {weatherData.weatherDescription}
                  </h3>
                  <p className="text-gray-600">
                    {locationDisplayName}
                  </p>
                </div>
              </div>

              <div className="text-6xl font-bold text-gray-900 mb-2">
                {Math.round(weatherData.temperature)}°C
              </div>

              <p className="text-gray-600 mb-4">Feels like {Math.round(weatherData.feelsLike)}°C</p>

              <p className="text-sm text-gray-500">
                Last updated: {new Date(weatherData.timestamp).toLocaleString()}
              </p>
            </div>
          </WeatherCard>

          {/* Temperature Details */}
          <WeatherCard title="Temperature & Humidity">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Thermometer className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-gray-700">Temperature</span>
                </div>
                <span className="font-semibold">{Math.round(weatherData.temperature)}°C</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Thermometer className="h-5 w-5 text-orange-500 mr-2" />
                  <span className="text-gray-700">Feels Like</span>
                </div>
                <span className="font-semibold">{Math.round(weatherData.feelsLike)}°C</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Droplets className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">Humidity</span>
                </div>
                <span className="font-semibold">{Math.round(weatherData.humidity)}%</span>
              </div>
            </div>
          </WeatherCard>

          {/* Wind & Visibility */}
          <WeatherCard title="Wind & Visibility">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wind className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">Wind Speed</span>
                </div>
                <span className="font-semibold">{Math.round(weatherData.windSpeed)} m/s</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wind className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">Wind Direction</span>
                </div>
                <span className="font-semibold">{Math.round(weatherData.windDirection)}°</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">Visibility</span>
                </div>
                <span className="font-semibold">{Math.round(weatherData.visibility)} km</span>
              </div>
            </div>
          </WeatherCard>

          {/* Additional Weather Data */}
          <WeatherCard title="Additional Data">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Droplets className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-gray-700">Precipitation</span>
                </div>
                <span className="font-semibold">{weatherData.precipitation.toFixed(1)} mm/h</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cloud className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">Cloud Cover</span>
                </div>
                <span className="font-semibold">{Math.round(weatherData.cloudCover)}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Sun className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-gray-700">UV Index</span>
                </div>
                <span className="font-semibold">{Math.round(weatherData.uvIndex)}</span>
              </div>
            </div>
          </WeatherCard>
        </div>
      )}
    </div>
  );
};

export default HomePage;
