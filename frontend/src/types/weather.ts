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
  location?: string;
}

export interface WeatherForecast {
  data: any;
  timestamp: string;
  location: string;
  timesteps: string;
}

export interface Location {
  name: string;
  coordinates: string;
  country: string;
}

export interface WeatherParameter {
  key: string;
  name: string;
  description: string;
  unit: string;
}

export interface WeatherResponse {
  success: boolean;
  data: WeatherData;
  timestamp: string;
  location: string;
}

export interface LocationsResponse {
  success: boolean;
  data: Location[];
  count: number;
}

export interface ParametersResponse {
  success: boolean;
  data: WeatherParameter[];
  count: number;
}
