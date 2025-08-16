import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createTomorrowIOService } from '../services/tomorrowIOService';
import { GeocodingService } from '../services/geocodingService';
import { logger } from '../utils/logger';
import { CustomError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const locationParamSchema = z.object({
  location: z.string().min(1, 'Location is required'),
});


const getWeather = async (req: Request, res: Response) => {
  try {
    // Validate request parameters
    const { location } = locationParamSchema.parse({
      location: req.query['location'],
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

    return res.json({
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
};

/**
 * @swagger
 * /api/weather:
 *   get:
 *     summary: Get current weather for a location
 *     description: Fetch real-time weather data from Tomorrow.io API
 *     tags: [Weather]
 *     parameters:
 *       - in: query
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
 *                   type: string
 *       400:
 *         description: Bad request - invalid location
 *       500:
 *         description: Internal server error
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  getWeather(req, res).then(next).catch(next);
});

export default router;
