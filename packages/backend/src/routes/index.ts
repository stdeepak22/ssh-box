import { Express } from 'express';
import authRoutes from './auth';
import pingRoutes from './ping';
import secretsRoutes from './secrets';


export const registerRoutes = (app: Express) => {
    app.use('/auth', authRoutes);
    app.use('/ping', pingRoutes);
    app.use('/secrets', secretsRoutes);
}