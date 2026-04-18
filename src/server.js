import app from './app.js';
import { env } from './config/environment.js';
import { logger } from './shared/logger.js';

const PORT = env.port;

app.listen(PORT, () => {
    logger.info(`🚀 ERP Pesantren Backend running on port ${PORT}`);
    logger.info(`📍 Environment: ${env.nodeEnv}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
    logger.info(`📡 API base: http://localhost:${PORT}/api/v1`);
    logger.info(`🌐 Frontend URL (CORS): ${env.frontendUrl}`);
});
