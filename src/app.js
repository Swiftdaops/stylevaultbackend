// src/app.js
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import barberRoutes from './routes/barberRoutes.js';
import hairSpecialistRoutes from './routes/hairSpecialistRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import hairServiceRoutes from './routes/hairServiceRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import hairAppointmentRoutes from './routes/hairAppointmentRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import hairCustomerRoutes from './routes/hairCustomerRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import serviceCatalogRoutes from './routes/serviceCatalogRoutes.js';
import hairServiceCatalogRoutes from './routes/hairServiceCatalogRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import proRoutes from './routes/proRoutes.js';
import hairAuthRoutes from './routes/hairAuthRoutes.js';

const app = express();

// Allowed CORS origins (frontend)
const allowedOrigins = [
	process.env.FRONTEND_URL || 'https://stylevault.site',
	'https://www.stylevault.site',
	'http://localhost:3000',
	'http://127.0.0.1:3000',
];

// Middleware
app.use(helmet());
app.use(
	cors({
		origin: (origin, callback) => {
			// allow requests with no origin (postman, mobile apps, same-origin)
			if (!origin) return callback(null, true);
			if (allowedOrigins.includes(origin)) return callback(null, true);
			return callback(new Error('CORS policy: Origin not allowed'));
		},
		credentials: true,
	})
);
app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hair-auth', hairAuthRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/hair-specialists', hairSpecialistRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/hair-services', hairServiceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/hair-appointments', hairAppointmentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/hair-customers', hairCustomerRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/service-catalog', serviceCatalogRoutes);
app.use('/api/hair-service-catalog', hairServiceCatalogRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/pro-request', proRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use(errorHandler);

export default app;