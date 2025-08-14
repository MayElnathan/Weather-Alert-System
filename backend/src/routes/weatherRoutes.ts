import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TomorrowIOService } from '../services/tomorrowIOService';
import { GeocodingService } from '../services/geocodingService';
import { logger } from '../utils/logger';
import { CustomError } from '../middleware/errorHandler';

const router = Router();

// Create Tomorrow.io service factory function
const createTomorrowIOService = () => {
  return new TomorrowIOService({
    apiKey: process.env['TOMORROW_API_KEY'] || '',
    baseUrl: process.env['TOMORROW_API_BASE_URL'] || 'https://api.tomorrow.io/v4',
  });
};

// Validation schemas
const locationParamSchema = z.object({
  location: z.string().min(1, 'Location is required'),
});

const forecastQuerySchema = z.object({
  timesteps: z.string().optional().default('1h'),
});

/**
 * @swagger
 * /api/weather/current/{location}:
 *   get:
 *     summary: Get current weather for a location
 *     description: Fetch real-time weather data from Tomorrow.io API
 *     tags: [Weather]
 *     parameters:
 *       - in: path
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: City name or coordinates (lat,lng)
 *       - in: query
 *         name: units
 *         schema:
 *           type: string
 *           enum: [metric, imperial]
 *         description: Units for temperature and other measurements
 *     responses:
 *       200:
 *         description: Current weather data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/WeatherData'
 *       400:
 *         description: Bad request - invalid location
 *       500:
 *         description: Internal server error
 */
router.get('/current/:location', async (req: Request, res: Response) => {
  try {
    // Validate request parameters
    const { location } = locationParamSchema.parse({
      location: req.params['location'],
    });

    logger.info(`Fetching current weather for location: ${location}`);

    // Create service instance with current environment variables
    const tomorrowIOService = createTomorrowIOService();

    // Fetch weather data
    const weatherData = await tomorrowIOService.getCurrentWeather(location);

    // Get enhanced location information
    const locationInfo = await GeocodingService.getLocationInfo(location);

    // Save weather data to database for historical tracking
    // This could be moved to a separate service if needed
    try {
      // You could implement database storage here
      logger.debug('Weather data fetched successfully', { location });
    } catch (dbError) {
      logger.warn('Failed to save weather data to database', dbError);
      // Don't fail the request if database save fails
    }

    res.json({
      success: true,
      data: {
        ...weatherData,
        location: locationInfo.displayName,
        coordinates: locationInfo.coordinates,
        country: locationInfo.country,
      },
      timestamp: new Date().toISOString(),
      location: locationInfo.displayName,
      coordinates: locationInfo.coordinates,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError('Invalid location parameter', 400);
    }

    logger.error('Error fetching current weather:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/weather/forecast/{location}:
 *   get:
 *     summary: Get weather forecast for a location
 *     description: Fetch weather forecast data from Tomorrow.io API
 *     tags: [Weather]
 *     parameters:
 *       - in: path
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: City name or coordinates (lat,lng)
 *       - in: query
 *         name: timesteps
 *         schema:
 *           type: string
 *           enum: [1h, 1d]
 *         description: Forecast timesteps
 *     responses:
 *       200:
 *         description: Weather forecast data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request - invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/forecast/:location', async (req: Request, res: Response) => {
  try {
    // Validate request parameters and query
    const { location } = locationParamSchema.parse({
      location: req.params['location'],
    });

    const { timesteps } = forecastQuerySchema.parse(req.query);

    logger.info(`Fetching weather forecast for location: ${location}, timesteps: ${timesteps}`);

    // Create service instance with current environment variables
    const tomorrowIOService = createTomorrowIOService();

    // Fetch forecast data
    const forecastData = await tomorrowIOService.getForecast(location, timesteps);

    res.json({
      success: true,
      data: forecastData,
      timestamp: new Date().toISOString(),
      location,
      timesteps,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError('Invalid parameters', 400);
    }

    logger.error('Error fetching weather forecast:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/weather/locations:
 *   get:
 *     summary: Get supported locations
 *     description: Get a list of commonly used locations
 *     tags: [Weather]
 *     responses:
 *       200:
 *         description: List of supported locations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       coordinates:
 *                         type: string
 *                       country:
 *                         type: string
 */
router.get('/locations', async (req: Request, res: Response) => {
  try {
    // This could be expanded to include more locations or fetched from a database
    const commonLocations = [
      { name: 'New York, NY', coordinates: '40.7128,-74.0060', country: 'USA' },
      { name: 'London, UK', coordinates: '51.5074,-0.1278', country: 'UK' },
      { name: 'Tokyo, Japan', coordinates: '35.6762,139.6503', country: 'Japan' },
      { name: 'Sydney, Australia', coordinates: '-33.8688,151.2093', country: 'Australia' },
      { name: 'Toronto, Canada', coordinates: '43.6532,-79.3832', country: 'Canada' },
      { name: 'Berlin, Germany', coordinates: '52.5200,13.4050', country: 'Germany' },
      { name: 'Paris, France', coordinates: '48.8566,2.3522', country: 'France' },
      { name: 'Mumbai, India', coordinates: '19.0760,72.8777', country: 'India' },
      { name: 'São Paulo, Brazil', coordinates: '-23.5505,-46.6333', country: 'Brazil' },
      { name: 'Cape Town, South Africa', coordinates: '-33.9249,18.4241', country: 'South Africa' },
    ];

    res.json({
      success: true,
      data: commonLocations,
      count: commonLocations.length,
    });
  } catch (error) {
    logger.error('Error fetching supported locations:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/weather/parameters:
 *   get:
 *     summary: Get supported weather parameters
 *     description: Get a list of weather parameters that can be monitored
 *     tags: [Weather]
 *     responses:
 *       200:
 *         description: List of supported weather parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       unit:
 *                         type: string
 */
router.get('/parameters', async (req: Request, res: Response) => {
  try {
    const weatherParameters = [
      { key: 'temperature', name: 'Temperature', description: 'Air temperature', unit: '°C/°F' },
      { key: 'feelsLike', name: 'Feels Like', description: 'Apparent temperature', unit: '°C/°F' },
      { key: 'humidity', name: 'Humidity', description: 'Relative humidity', unit: '%' },
      { key: 'windSpeed', name: 'Wind Speed', description: 'Wind speed', unit: 'm/s, mph, km/h' },
      {
        key: 'windDirection',
        name: 'Wind Direction',
        description: 'Wind direction',
        unit: 'degrees',
      },
      {
        key: 'precipitation',
        name: 'Precipitation',
        description: 'Precipitation intensity',
        unit: 'mm/h',
      },
      { key: 'pressure', name: 'Pressure', description: 'Atmospheric pressure', unit: 'hPa' },
      { key: 'visibility', name: 'Visibility', description: 'Visibility distance', unit: 'km' },
      { key: 'uvIndex', name: 'UV Index', description: 'Ultraviolet index', unit: 'index' },
      {
        key: 'cloudCover',
        name: 'Cloud Cover',
        description: 'Cloud coverage percentage',
        unit: '%',
      },
    ];

    res.json({
      success: true,
      data: weatherParameters,
      count: weatherParameters.length,
    });
  } catch (error) {
    logger.error('Error fetching weather parameters:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/weather/location/validate:
 *   post:
 *     summary: Validate and get information about a location
 *     description: Validate a location string and return detailed information
 *     tags: [Weather]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location
 *             properties:
 *               location:
 *                 type: string
 *                 description: Location string (city name or coordinates)
 *     responses:
 *       200:
 *         description: Location information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     country:
 *                       type: string
 *                     coordinates:
 *                       type: string
 *       400:
 *         description: Bad request - invalid location
 */
router.post('/location/validate', async (req: Request, res: Response) => {
  try {
    const { location } = req.body;

    if (!location || typeof location !== 'string') {
      throw new CustomError('Location is required and must be a string', 400);
    }

    // Validate location format
    if (!GeocodingService.isValidLocation(location)) {
      throw new CustomError('Invalid location format', 400);
    }

    // Get location information
    const locationInfo = await GeocodingService.getLocationInfo(location);

    res.json({
      success: true,
      data: locationInfo,
    });
  } catch (error) {
    logger.error('Error validating location:', error);
    throw error;
  }
});

export default router;
