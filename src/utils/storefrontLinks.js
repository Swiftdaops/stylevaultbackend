const DEFAULT_STOREFRONT_URL = 'https://www.stylevault.site';

const isLocalHost = (hostname = '') => hostname.includes('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

const normalizeBaseUrl = () => {
  const rawValue = String(
    process.env.STOREFRONT_URL
    || process.env.APP_URL
    || process.env.FRONTEND_URL
    || DEFAULT_STOREFRONT_URL
  ).trim();

  if (!rawValue) {
    return DEFAULT_STOREFRONT_URL;
  }

  try {
    const parsed = new URL(rawValue);
    const hostname = parsed.hostname.replace(/^www\./, '');

    if (process.env.NODE_ENV === 'production' && isLocalHost(hostname)) {
      return DEFAULT_STOREFRONT_URL;
    }

    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return DEFAULT_STOREFRONT_URL;
  }
};

const getBaseUrl = () => new URL(normalizeBaseUrl());

export const buildStorefrontBaseUrl = ({ slug, providerPath }) => {
  const baseUrl = getBaseUrl();
  const rootHostname = baseUrl.hostname.replace(/^www\./, '');
  // Use a tenant subdomain when a slug is present and the root hostname is not localhost.
  // Previously this was limited to production only; allow subdomains in non-local environments
  // so links point at tenant subdomains (e.g. `nnamdi.stylevault.site`) when a proper
  // storefront domain is configured.
  const shouldUseSubdomain = slug && !isLocalHost(rootHostname);

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
