import { logger } from '../shared/logger.js';
import { AppError } from '../shared/errors.js';

/**
 * Global Express error handler. Must be the last middleware registered.
 */
export const errorHandler = (err, req, res, _next) => {
    // Log the error
    logger.error({
        err,
        method: req.method,
        url: req.originalUrl,
        user: req.user?.id,
    }, err.message);

    // Operational errors (thrown intentionally)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors,
            timestamp: new Date().toISOString(),
        });
    }

    // Supabase errors
    if (err.code && err.message && err.details) {
        return res.status(400).json({
            success: false,
            message: err.message,
            errors: err.details,
            timestamp: new Date().toISOString(),
        });
    }

    // Unknown errors
    return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        timestamp: new Date().toISOString(),
    });
};
