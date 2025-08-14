import { PrismaClient } from '@prisma/client';
import { TomorrowIOService, WeatherData } from './tomorrowIOService';
import { logger } from '../utils/logger';
import cron from 'node-cron';

export interface AlertEvaluationResult {
  alertId: string;
  alertName: string;
  location: string;
  parameter: string;
  threshold: number;
  currentValue: number;
  isTriggered: boolean;
  timestamp: Date;
}

export class AlertService {
  private prisma: PrismaClient;
  private tomorrowIOService: TomorrowIOService;
  private evaluationJob: cron.ScheduledTask | null = null;

  constructor(prisma: PrismaClient, tomorrowIOService: TomorrowIOService) {
    this.prisma = prisma;
    this.tomorrowIOService = tomorrowIOService;
  }

  /**
   * Start the alert evaluation service
   * Runs every 5 minutes by default
   */
  startEvaluationService(intervalMinutes: number = 5): void {
    const cronExpression = `*/${intervalMinutes} * * * *`;
    
    this.evaluationJob = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Starting scheduled alert evaluation');
        await this.evaluateAllAlerts();
        logger.info('Completed scheduled alert evaluation');
      } catch (error) {
        logger.error('Error during scheduled alert evaluation:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC',
    });

    this.evaluationJob.start();
    logger.info(`Alert evaluation service started with ${intervalMinutes}-minute interval`);
  }

  /**
   * Stop the alert evaluation service
   */
  stopEvaluationService(): void {
    if (this.evaluationJob) {
      this.evaluationJob.stop();
      this.evaluationJob = null;
      logger.info('Alert evaluation service stopped');
    }
  }

  /**
   * Evaluate all active alerts
   */
  async evaluateAllAlerts(): Promise<AlertEvaluationResult[]> {
    try {
      // Get all active alerts
      const activeAlerts = await this.prisma.alert.findMany({
        where: { isActive: true },
      });

      if (activeAlerts.length === 0) {
        logger.info('No active alerts to evaluate');
        return [];
      }

      logger.info(`Evaluating ${activeAlerts.length} active alerts`);

      const results: AlertEvaluationResult[] = [];

      // Evaluate each alert
      for (const alert of activeAlerts) {
        try {
          const result = await this.evaluateAlert(alert);
          results.push(result);
          
          // Save evaluation result to database
          await this.saveAlertEvaluation(result);
          
          logger.debug(`Alert evaluation completed for ${alert.name}:`, {
            alertId: alert.id,
            isTriggered: result.isTriggered,
            currentValue: result.currentValue,
            threshold: result.threshold,
          });
        } catch (error) {
          logger.error(`Failed to evaluate alert ${alert.name}:`, error);
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to evaluate all alerts:', error);
      throw error;
    }
  }

  /**
   * Evaluate a single alert
   */
  async evaluateAlert(alert: any): Promise<AlertEvaluationResult> {
    try {
      // Fetch current weather data for the alert location
      const weatherData = await this.tomorrowIOService.getCurrentWeather(alert.location);
      
      // Get the current value for the monitored parameter
      const currentValue = this.getParameterValue(weatherData, alert.parameter);
      
      // Evaluate the condition
      const isTriggered = this.evaluateCondition(
        currentValue,
        alert.operator,
        alert.threshold
      );

      return {
        alertId: alert.id,
        alertName: alert.name,
        location: alert.location,
        parameter: alert.parameter,
        threshold: alert.threshold,
        currentValue,
        isTriggered,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to evaluate alert ${alert.name}:`, error);
      throw error;
    }
  }

  /**
   * Get the value of a specific weather parameter
   */
  private getParameterValue(weatherData: WeatherData, parameter: string): number {
    const parameterMap: { [key: string]: keyof WeatherData } = {
      temperature: 'temperature',
      feelsLike: 'feelsLike',
      humidity: 'humidity',
      windSpeed: 'windSpeed',
      windDirection: 'windDirection',
      precipitation: 'precipitation',
      pressure: 'pressure',
      visibility: 'visibility',
      uvIndex: 'uvIndex',
      cloudCover: 'cloudCover',
    };

    const field = parameterMap[parameter];
    if (!field) {
      throw new Error(`Unknown weather parameter: ${parameter}`);
    }

    return weatherData[field] || 0;
  }

  /**
   * Evaluate if a condition is met
   */
  private evaluateCondition(currentValue: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': // greater than
        return currentValue > threshold;
      case 'gte': // greater than or equal
        return currentValue >= threshold;
      case 'lt': // less than
        return currentValue < threshold;
      case 'lte': // less than or equal
        return currentValue <= threshold;
      case 'eq': // equal
        return Math.abs(currentValue - threshold) < 0.01; // Small tolerance for floating point
      case 'ne': // not equal
        return Math.abs(currentValue - threshold) >= 0.01;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Save alert evaluation result to database
   */
  private async saveAlertEvaluation(result: AlertEvaluationResult): Promise<void> {
    try {
      await this.prisma.alertHistory.create({
        data: {
          alertId: result.alertId,
          isTriggered: result.isTriggered,
          currentValue: result.currentValue,
          thresholdValue: result.threshold,
        },
      });
    } catch (error) {
      logger.error('Failed to save alert evaluation:', error);
    }
  }

  /**
   * Get current alert status for all alerts
   */
  async getCurrentAlertStatus(): Promise<any[]> {
    try {
      const alerts = await this.prisma.alert.findMany({
        where: { isActive: true },
        include: {
          alertHistory: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      return alerts.map(alert => ({
        id: alert.id,
        name: alert.name,
        location: alert.location,
        parameter: alert.parameter,
        threshold: alert.threshold,
        unit: alert.unit,
        isActive: alert.isActive,
        lastEvaluation: alert.alertHistory[0] || null,
        isCurrentlyTriggered: alert.alertHistory[0]?.isTriggered || false,
      }));
    } catch (error) {
      logger.error('Failed to get current alert status:', error);
      throw error;
    }
  }

  /**
   * Manually trigger alert evaluation for a specific alert
   */
  async evaluateSpecificAlert(alertId: string): Promise<AlertEvaluationResult | null> {
    try {
      const alert = await this.prisma.alert.findUnique({
        where: { id: alertId },
      });

      if (!alert) {
        throw new Error(`Alert with ID ${alertId} not found`);
      }

      return await this.evaluateAlert(alert);
    } catch (error) {
      logger.error(`Failed to evaluate specific alert ${alertId}:`, error);
      throw error;
    }
  }
}

// If this file is run directly, start the alert service
if (require.main === module) {
  const { PrismaClient } = require('@prisma/client');
  const { TomorrowIOService } = require('./tomorrowIOService');
  
  const prisma = new PrismaClient();
  const tomorrowIOService = new TomorrowIOService({
    apiKey: process.env.TOMORROW_API_KEY || '',
    baseUrl: process.env.TOMORROW_API_BASE_URL || 'https://api.tomorrow.io/v4',
  });

  const alertService = new AlertService(prisma, tomorrowIOService);
  
  // Start the service
  alertService.startEvaluationService(5);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down alert service...');
    alertService.stopEvaluationService();
    await prisma.$disconnect();
    process.exit(0);
  });
}
