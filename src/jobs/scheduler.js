import cron from 'node-cron';
import { logger } from '../shared/logger.js';

/**
 * Initialize all background job schedules.
 * Call this from server.js if you want to enable cron jobs.
 */
export function initScheduler() {
    // Grade calculation reminder — every 1st of the month at 8 AM
    cron.schedule('0 8 1 * *', async () => {
        logger.info('Running monthly grade calculation reminder...');
        // TODO: Trigger batch grade calculation
    });

    // Inventory alert check — every day at 9 AM
    cron.schedule('0 9 * * *', async () => {
        logger.info('Running daily inventory anomaly check...');
        // TODO: Trigger inventory anomaly detection
    });

    logger.info('📅 Background job scheduler initialized');
}
