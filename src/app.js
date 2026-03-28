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
import nailTechnicianRoutes from './routes/nailTechnicianRoutes.js';
import lashTechnicianRoutes from './routes/lashTechnicianRoutes.js';
import makeupArtistRoutes from './routes/makeupArtistRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import hairServiceRoutes from './routes/hairServiceRoutes.js';
import nailServiceRoutes from './routes/nailServiceRoutes.js';
import lashServiceRoutes from './routes/lashServiceRoutes.js';
import makeupServiceRoutes from './routes/makeupServiceRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import hairAppointmentRoutes from './routes/hairAppointmentRoutes.js';
import nailAppointmentRoutes from './routes/nailAppointmentRoutes.js';
import lashAppointmentRoutes from './routes/lashAppointmentRoutes.js';
import makeupAppointmentRoutes from './routes/makeupAppointmentRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import hairCustomerRoutes from './routes/hairCustomerRoutes.js';
import nailCustomerRoutes from './routes/nailCustomerRoutes.js';
import lashCustomerRoutes from './routes/lashCustomerRoutes.js';
import makeupCustomerRoutes from './routes/makeupCustomerRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import serviceCatalogRoutes from './routes/serviceCatalogRoutes.js';
import hairServiceCatalogRoutes from './routes/hairServiceCatalogRoutes.js';
import nailServiceCatalogRoutes from './routes/nailServiceCatalogRoutes.js';
import lashServiceCatalogRoutes from './routes/lashServiceCatalogRoutes.js';
import makeupServiceCatalogRoutes from './routes/makeupServiceCatalogRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import proRoutes from './routes/proRoutes.js';
import hairAuthRoutes from './routes/hairAuthRoutes.js';
import nailAuthRoutes from './routes/nailAuthRoutes.js';
import lashAuthRoutes from './routes/lashAuthRoutes.js';
import makeupAuthRoutes from './routes/makeupAuthRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

const app = express();

const DEFAULT_FRONTEND_URL = process.env.FRONTEND_URL || 'https://stylevault.site';

function normalizeOrigin(value) {
	return String(value || '').trim().replace(/\/$/, '');
}

function extractHostname(value) {
	try {
		return new URL(normalizeOrigin(value)).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
}

const allowedOrigins = new Set([
	normalizeOrigin(DEFAULT_FRONTEND_URL),
	'https://www.stylevault.site',
	'http://localhost:3000',
	'http://127.0.0.1:3000',
]);

const rawRootFrontendHost = extractHostname(DEFAULT_FRONTEND_URL) || 'stylevault.site';

function getBaseDomain(hostname) {
	if (!hostname) return '';
	if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
		return hostname;
	}

	const parts = hostname.split('.');
	if (parts.length <= 2) return hostname;

	return parts.slice(-2).join('.');
}

const rootFrontendHost = getBaseDomain(rawRootFrontendHost);

function escapeRegExp(str) {
	return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Match the root host and any subdomain levels (e.g. stylevault.site, jennie.stylevault.site,
// or a.b.c.stylevault.site)
const rootHostPattern = new RegExp(`(^|\\.)${escapeRegExp(rootFrontendHost)}$`, 'i');

function isAllowedOrigin(origin) {
	const normalizedOrigin = normalizeOrigin(origin);

	// allow requests with no origin (curl, Postman, same-origin server-to-server)
	if (!normalizedOrigin) {
		return true;
	}

	if (allowedOrigins.has(normalizedOrigin)) {
		return true;
	}

	let hostname = '';
	try {
		hostname = new URL(normalizedOrigin).hostname.replace(/^www\./, '');
	} catch {
		return false;
	}

	// allow the root frontend host and any subdomain of it
	if (rootHostPattern.test(hostname)) {
		return true;
	}

	// localdev allowances
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return true;
	}

	if (hostname.endsWith('.localhost')) {
		return true;
	}

	return false;
}

// Middleware
app.use(helmet());
app.use(
	cors({
		origin: (origin, callback) => {
			// allow requests with no origin (postman, mobile apps, same-origin)
			if (!origin) return callback(null, true);
			if (isAllowedOrigin(origin)) return callback(null, true);
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
app.use('/api/nail-auth', nailAuthRoutes);
app.use('/api/lash-auth', lashAuthRoutes);
app.use('/api/makeup-auth', makeupAuthRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/hair-specialists', hairSpecialistRoutes);
app.use('/api/nail-technicians', nailTechnicianRoutes);
app.use('/api/lash-technicians', lashTechnicianRoutes);
app.use('/api/makeup-artists', makeupArtistRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/hair-services', hairServiceRoutes);
app.use('/api/nail-services', nailServiceRoutes);
app.use('/api/lash-services', lashServiceRoutes);
app.use('/api/makeup-services', makeupServiceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/hair-appointments', hairAppointmentRoutes);
app.use('/api/nail-appointments', nailAppointmentRoutes);
app.use('/api/lash-appointments', lashAppointmentRoutes);
app.use('/api/makeup-appointments', makeupAppointmentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/hair-customers', hairCustomerRoutes);
app.use('/api/nail-customers', nailCustomerRoutes);
app.use('/api/lash-customers', lashCustomerRoutes);
app.use('/api/makeup-customers', makeupCustomerRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/service-catalog', serviceCatalogRoutes);
app.use('/api/hair-service-catalog', hairServiceCatalogRoutes);
app.use('/api/nail-service-catalog', nailServiceCatalogRoutes);
app.use('/api/lash-service-catalog', lashServiceCatalogRoutes);
app.use('/api/makeup-service-catalog', makeupServiceCatalogRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/pro-request', proRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use(errorHandler);

export default app;