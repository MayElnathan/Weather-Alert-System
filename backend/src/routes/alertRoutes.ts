import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AlertService } from '../services/alertService';
import { createTomorrowIOService } from '../services/tomorrowIOService';
import { logger } from '../utils/logger';
import { CustomError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();
const alertService = new AlertService();


// Validation schemas
const createAlertSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
  locationName: z.string().optional(), // Optional human-readable location name
  parameter: z.string().min(1, 'Parameter is required'),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne']),
  threshold: z.number().min(0),
  unit: z.string().min(1, 'Unit is required'),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Validation schemas
const updateAlertSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  location: z.string().min(1, 'Location is required').optional(),
  locationName: z.string().optional(), // Optional human-readable location name
  parameter: z.string().min(1, 'Parameter is required').optional(),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne']).optional(),
  threshold: z.number().min(0).optional(),
  unit: z.string().min(1, 'Unit is required').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const alertIdParamSchema = z.object({
  id: z.string().min(1, 'Alert ID is required'),
});

const getAlerts = async (req: Request, _res: Response) => {
  try {
    const { active, location } = req.query;

    const alerts = await alertService.getAlerts(active as string, location as string);

    return alerts;

  } catch (error) {
    logger.error('Error fetching alerts:', error);
    throw error;
  }
}

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
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  getAlerts(req, res).then((alerts)=>{
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
    next();
  }).catch(next);
});

const getAlertById = async (req: Request, _res: Response) => {
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

    return alert;

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError('Invalid alert ID', 400);
    }
    
    logger.error('Error fetching alert:', error);
    throw error;
  }
}

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
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  getAlertById(req, res).then((alert)=>{
    res.json({
      success: true,
      data: alert,
    });
    next();
  }).catch(next);
});

const createAlert = async (req: Request, _res: Response) => {
  try {
    const data = createAlertSchema.parse(req.body);

    logger.info('Creating new alert:', { name: data.name, location: data.location });

    // Validate that the location can be used with Tomorrow.io API
    try {
      const tomorrowIOService = createTomorrowIOService();
      await tomorrowIOService.getCurrentWeather(data.location);
    } catch (error) {
      throw new CustomError(`Invalid location: ${data.location}`, 400);
    }

    // Create alert data
    const alertData = {
      name: data.name,
      location: data.location,
      locationName: data.locationName || data.location, // Use locationName if provided, fallback to location
      parameter: data.parameter,
      operator: data.operator,
      threshold: data.threshold,
      unit: data.unit,
      description: data.description || null, // Convert undefined to null for Prisma
    };

    const alert = await prisma.alert.create({
      data: alertData,
    });

    logger.info('Alert created successfully:', { alertId: alert.id });

    return alert;

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
    }
    
    logger.error('Error creating alert:', error);
    throw error;
  }
}

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
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  createAlert(req, res).then((alert)=>{
    res.status(201).json({
      success: true,
      data: alert,
      message: 'Alert created successfully',
    });
    next();
  }).catch(next);
});

const updateAlert = async (req: Request, _res: Response) => {
  try {
    const { id } = alertIdParamSchema.parse(req.params);
    const data = updateAlertSchema.parse(req.body);

    logger.info('Updating alert:', { alertId: id, updates: data });

    // Check if alert exists
    const existingAlert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!existingAlert) {
      throw new CustomError('Alert not found', 404);
    }

    // If location is being updated, validate it
    if (data.location) {
      try {
        const tomorrowIOService = createTomorrowIOService();
        await tomorrowIOService.getCurrentWeather(data.location);
      } catch (error) {
        throw new CustomError(`Invalid location: ${data.location}`, 400);
      }
    }

    // Prepare update data, filtering out undefined values
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.locationName !== undefined) updateData.locationName = data.locationName;
    if (data.parameter !== undefined) updateData.parameter = data.parameter;
    if (data.operator !== undefined) updateData.operator = data.operator;
    if (data.threshold !== undefined) updateData.threshold = data.threshold;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const alert = await prisma.alert.update({
      where: { id },
      data: updateData,
    });

    logger.info('Alert updated successfully:', { alertId: id });

    return alert;

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400);
    }
    
    logger.error('Error updating alert:', error);
    throw error;
  }
}

/**
 * @swagger
 * /api/alerts/{id}:
 *   patch:
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
router.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  updateAlert(req, res).then((alert)=>{
    res.json({
      success: true,
      data: alert,
      message: 'Alert updated successfully',
    });
    next();
  }).catch(next);
});

const deleteAlert = async (req: Request, _res: Response) => {
  try {
    const { id } = alertIdParamSchema.parse(req.params);

    logger.info('Deleting alert:', { alertId: id });

    await prisma.alertHistory.deleteMany({
      where: { alertId: id },
    });

    // Check if alert exists
    const existingAlert = await prisma.alert.delete({
      where: { id },
    });

    if (!existingAlert) {
      throw new CustomError('Alert not found', 404);
    }
    
    logger.info('Alert deleted successfully:', { alertId: id });

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CustomError('Invalid alert ID', 400);
    }
    
    logger.error('Error deleting alert:', error);
    throw error;
  }
}

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
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  deleteAlert(req, res).then(()=>{
    res.json({
      success: true,
      message: 'Alert deleted successfully',
    }); 
    next();
  }).catch(next);
});

export default router;
