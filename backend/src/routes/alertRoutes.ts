import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AlertService } from '../services/alertService';
import { TomorrowIOService } from '../services/tomorrowIOService';
import { logger } from '../utils/logger';
import { CustomError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Create Tomorrow.io service factory function
const createTomorrowIOService = () => {
  return new TomorrowIOService({
    apiKey: process.env.TOMORROW_API_KEY || '',
    baseUrl: process.env.TOMORROW_API_BASE_URL || 'https://api.tomorrow.io/v4',
  });
};

const alertService = new AlertService(prisma, createTomorrowIOService());

// Validation schemas
const createAlertSchema = z.object({
  name: z.string().min(1, 'Alert name is required').max(100, 'Alert name too long'),
  location: z.string().min(1, 'Location is required'),
  parameter: z.string().min(1, 'Parameter is required'),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne'], {
    errorMap: () => ({ message: 'Invalid operator. Must be one of: gt, gte, lt, lte, eq, ne' }),
  }),
  threshold: z.number().finite('Threshold must be a valid number'),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional(),
});

const updateAlertSchema = createAlertSchema.partial();

const alertIdParamSchema = z.object({
  id: z.string().min(1, 'Alert ID is required'),
});

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Get all alerts
 *     description: Retrieve a list of all weather alerts
 *     tags: [Alerts]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *     responses:
 *       200:
 *         description: List of alerts
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
 *                     $ref: '#/components/schemas/Alert'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active, location } = req.query;

    // Build where clause
    const where: any = {};
    if (active !== undefined) {
      where.isActive = active === 'true';
    }
    if (location) {
      where.location = { contains: location as string, mode: 'insensitive' };
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/alerts/{id}:
 *   get:
 *     summary: Get alert by ID
 *     description: Retrieve a specific weather alert by its ID
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       404:
 *         description: Alert not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = alertIdParamSchema.parse(req.params);

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        alertHistory: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!alert) {
      throw new CustomError('Alert not found', 404);
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError('Invalid alert ID', 400);
    }
    
    logger.error('Error fetching alert:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: Create a new alert
 *     description: Create a new weather alert with specified parameters
 *     tags: [Alerts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - location
 *               - parameter
 *               - operator
 *               - threshold
 *               - unit
 *             properties:
 *               name:
 *                 type: string
 *                 description: Alert name
 *               location:
 *                 type: string
 *                 description: Location to monitor
 *               parameter:
 *                 type: string
 *                 description: Weather parameter to monitor
 *               operator:
 *                 type: string
 *                 enum: [gt, gte, lt, lte, eq, ne]
 *                 description: Comparison operator
 *               threshold:
 *                 type: number
 *                 description: Threshold value
 *               unit:
 *                 type: string
 *                 description: Unit of measurement
 *               description:
 *                 type: string
 *                 description: Optional description
 *     responses:
 *       201:
 *         description: Alert created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Alert'
 *       400:
 *         description: Bad request - validation error
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const alertData = createAlertSchema.parse(req.body);

    logger.info('Creating new alert:', { name: alertData.name, location: alertData.location });

    // Validate that the location can be used with Tomorrow.io API
    try {
      const tomorrowIOService = createTomorrowIOService();
      await tomorrowIOService.getCurrentWeather(alertData.location);
    } catch (error) {
      throw new CustomError(`Invalid location: ${alertData.location}`, 400);
    }

    const alert = await prisma.alert.create({
      data: alertData,
    });

    logger.info('Alert created successfully:', { alertId: alert.id });

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Alert created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
    }
    
    logger.error('Error creating alert:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/alerts/{id}:
 *   put:
 *     summary: Update an alert
 *     description: Update an existing weather alert
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Alert'
 *     responses:
 *       200:
 *         description: Alert updated successfully
 *       404:
 *         description: Alert not found
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = alertIdParamSchema.parse(req.params);
    const updateData = updateAlertSchema.parse(req.body);

    logger.info('Updating alert:', { alertId: id, updates: updateData });

    // Check if alert exists
    const existingAlert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!existingAlert) {
      throw new CustomError('Alert not found', 404);
    }

    // If location is being updated, validate it
    if (updateData.location) {
      try {
        const tomorrowIOService = createTomorrowIOService();
        await tomorrowIOService.getCurrentWeather(updateData.location);
      } catch (error) {
        throw new CustomError(`Invalid location: ${updateData.location}`, 400);
      }
    }

    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: updateData,
    });

    logger.info('Alert updated successfully:', { alertId: id });

    res.json({
      success: true,
      data: updatedAlert,
      message: 'Alert updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
    }
    
    logger.error('Error updating alert:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/alerts/{id}:
 *   delete:
 *     summary: Delete an alert
 *     description: Delete a weather alert by ID
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert deleted successfully
 *       404:
 *         description: Alert not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = alertIdParamSchema.parse(req.params);

    logger.info('Deleting alert:', { alertId: id });

    // Check if alert exists
    const existingAlert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!existingAlert) {
      throw new CustomError('Alert not found', 404);
    }

    // Soft delete by setting isActive to false
    await prisma.alert.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Alert deleted successfully:', { alertId: id });

    res.json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError('Invalid alert ID', 400);
    }
    
    logger.error('Error deleting alert:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/alerts/status:
 *   get:
 *     summary: Get current alert status
 *     description: Get the current status of all active alerts
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: Current alert status
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
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       isCurrentlyTriggered:
 *                         type: boolean
 *                       lastEvaluation:
 *                         type: object
 */
router.get('/status/current', async (req: Request, res: Response) => {
  try {
    const alertStatus = await alertService.getCurrentAlertStatus();

    res.json({
      success: true,
      data: alertStatus,
      count: alertStatus.length,
      triggeredCount: alertStatus.filter(alert => alert.isCurrentlyTriggered).length,
    });
  } catch (error) {
    logger.error('Error fetching alert status:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/alerts/{id}/evaluate:
 *   post:
 *     summary: Manually evaluate an alert
 *     description: Manually trigger evaluation of a specific alert
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     responses:
 *       200:
 *         description: Alert evaluation result
 *       404:
 *         description: Alert not found
 */
router.post('/:id/evaluate', async (req: Request, res: Response) => {
  try {
    const { id } = alertIdParamSchema.parse(req.params);

    logger.info('Manually evaluating alert:', { alertId: id });

    const result = await alertService.evaluateSpecificAlert(id);

    if (!result) {
      throw new CustomError('Alert not found', 404);
    }

    res.json({
      success: true,
      data: result,
      message: 'Alert evaluated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError('Invalid alert ID', 400);
    }
    
    logger.error('Error evaluating alert:', error);
    throw error;
  }
});

export default router;
