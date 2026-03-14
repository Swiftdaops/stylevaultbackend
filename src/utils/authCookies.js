function normalizeUrl(value) {
	return String(value || '').trim().replace(/\/+$/, '');
}

function extractHostname(value) {
	const normalized = normalizeUrl(value);
	if (!normalized) return '';

	try {
		return new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();
	} catch {
		return normalized.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/:\d+$/, '').toLowerCase();
	}
}

function getBaseDomain(hostname) {
	if (!hostname) return '';
	if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
		return hostname;
	}

	const parts = hostname.split('.').filter(Boolean);
	if (parts.length <= 2) return hostname;

	return parts.slice(-2).join('.');
}

function getResponseHostname(req) {
	const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
	const host = forwardedHost || String(req.headers.host || '').trim();
 
	return extractHostname(host);
}

function getFrontendHostname() {
	return extractHostname(process.env.FRONTEND_URL);
}

function isLocalHostname(hostname) {
	return (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname.endsWith('.localhost')
	);
}

function isSecureRequest(req) {
	if (req?.secure) return true;

	const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '')
		.split(',')[0]
		.trim()
		.toLowerCase();
	if (forwardedProto) {
		return forwardedProto === 'https';
	}

	const origin = String(req?.headers?.origin || '').trim();
	if (origin) {
		try {
			return new URL(origin).protocol === 'https:';
		} catch {
			// ignore malformed origin and continue to hostname fallback
		}
	}

	const responseHostname = getResponseHostname(req);
	return !!responseHostname && !isLocalHostname(responseHostname);
}

export function getAuthCookieDomain(req) {
	if (process.env.NODE_ENV !== 'production') return undefined;

	const responseHostname = getResponseHostname(req);
	const frontendHostname = getFrontendHostname();
	if (!responseHostname || !frontendHostname) return undefined;

	const responseBaseDomain = getBaseDomain(responseHostname);
	const frontendBaseDomain = getBaseDomain(frontendHostname);

	// Browsers only accept a cookie domain that matches the response host. When the
	// API is hosted on Render and the frontend is on a separate domain, we must keep
	// the cookie host-only and omit the domain attribute entirely.
	if (!responseBaseDomain || responseBaseDomain !== frontendBaseDomain) {
		return undefined;
	}

	if (isLocalHostname(responseBaseDomain)) {
		return undefined;
	}

	return `.${responseBaseDomain}`;
}

export function getAuthCookieOptions(req) {
	const domain = getAuthCookieDomain(req);
	const secure = isSecureRequest(req);

	return {
		httpOnly: true,
		secure,
		sameSite: secure ? 'none' : 'lax',
		path: '/',
		...(domain ? { domain } : {}),
	};
}