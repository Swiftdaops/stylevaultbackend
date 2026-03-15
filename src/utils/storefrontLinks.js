const normalizeBaseUrl = () => String(process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

const getBaseUrl = () => new URL(normalizeBaseUrl());

const isLocalHost = (hostname = '') => hostname.includes('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

export const buildStorefrontBaseUrl = ({ slug, providerPath }) => {
  const baseUrl = getBaseUrl();
  const rootHostname = baseUrl.hostname.replace(/^www\./, '');
  const shouldUseSubdomain = process.env.NODE_ENV === 'production' && slug && !isLocalHost(rootHostname);

  if (shouldUseSubdomain) {
    const host = `${slug}.${rootHostname}${baseUrl.port ? `:${baseUrl.port}` : ''}`;
    return new URL(`${baseUrl.protocol}//${host}/`).toString();
  }

  return new URL(`/${providerPath}/${slug}/`, `${baseUrl.origin}/`).toString();
};

export const buildStorefrontManageBookingUrl = ({ slug, providerPath, providerType, appointmentId, accessToken }) => {
  const storefrontBaseUrl = buildStorefrontBaseUrl({ slug, providerPath });
  const url = new URL(`bookings/${appointmentId}`, storefrontBaseUrl);

  if (accessToken) url.searchParams.set('access', accessToken);
  if (providerType) url.searchParams.set('provider', providerType);
  if (slug) url.searchParams.set('slug', slug);

  return url.toString();
};

export const buildDashboardUrl = (path = '/') => {
  const baseUrl = getBaseUrl();
  return new URL(path.startsWith('/') ? path : `/${path}`, `${baseUrl.origin}/`).toString();
};
