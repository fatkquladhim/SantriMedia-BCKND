import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/environment.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Module routes
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import rbacRoutes from './modules/rbac/rbac.routes.js';
import tasksRoutes from './modules/tasks/tasks.routes.js';
import izinRoutes from './modules/izin/izin.routes.js';
import inventarisRoutes from './modules/inventaris/inventaris.routes.js';
import evaluasiRoutes from './modules/evaluasi/evaluasi.routes.js';
import gradingRoutes from './modules/grading/grading.routes.js';
import divisiRoutes from './modules/divisi/divisi.routes.js';
import platformRoutes from './modules/platform/platform.routes.js';
import asramaRoutes from './modules/asrama/asrama.routes.js';
import aiRoutes from './modules/ai-agent/ai.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import searchRoutes from './modules/search/search.routes.js';


import { authGuard } from './middleware/authGuard.js';
import { profileComplete } from './middleware/profileComplete.js';

const app = express();

// ===== Global Middleware =====
app.use(helmet());
app.use(cors({
    origin: env.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(apiLimiter);

// ===== Health Check =====
app.get('/', (req, res) => {
    res.send('<h1>Halo, Selamat Datang di API ERP PESANTREN</h1>');
});
app.get('/info', (req, res) => {
    res.json({
        list_routes: {
            auth: '/api/v1/auth',
            users: '/api/v1/users',
            rbac: '/api/v1/rbac',
            tasks: '/api/v1/tasks',
            izin: '/api/v1/izin',
            inventaris: '/api/v1/inventaris',
            evaluasi: '/api/v1/evaluasi',
            grading: '/api/v1/grading',
            divisi: '/api/v1/divisi',
            platform: '/api/v1/platform',
            asrama: '/api/v1/asrama',
            ai: '/api/v1/ai',
            notifications: '/api/v1/notifications',
            upload: '/api/v1/upload',
            search: '/api/v1/search',
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'erp-pesantren-backend',
        timestamp: new Date().toISOString(),
        environment: env.nodeEnv,
    });
});

// ===== API Routes — v1 =====
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/rbac', authGuard, profileComplete, rbacRoutes);
app.use('/api/v1/tasks', authGuard, profileComplete, tasksRoutes);
app.use('/api/v1/izin', authGuard, profileComplete, izinRoutes);
app.use('/api/v1/inventaris', authGuard, profileComplete, inventarisRoutes);
app.use('/api/v1/evaluasi', authGuard, profileComplete, evaluasiRoutes);
app.use('/api/v1/grading', authGuard, profileComplete, gradingRoutes);
app.use('/api/v1/divisi', authGuard, profileComplete, divisiRoutes);
app.use('/api/v1/platform', authGuard, profileComplete, platformRoutes);
app.use('/api/v1/asrama', authGuard, profileComplete, asramaRoutes);
app.use('/api/v1/ai', authGuard, profileComplete, aiRoutes);
app.use('/api/v1/notifications', authGuard, profileComplete, notificationRoutes);
app.use('/api/v1/upload', authGuard, profileComplete, uploadRoutes);
app.use('/api/v1/search', authGuard, profileComplete, searchRoutes);


// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// ===== Global Error Handler (must be last) =====
app.use(errorHandler);

export default app;
