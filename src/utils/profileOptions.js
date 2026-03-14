export const SUPPORTED_CURRENCIES = ['USD', 'NGN', 'GHS', 'KES', 'ZAR', 'GBP', 'EUR', 'CAD', 'AED'];

export const COUNTRY_TO_CURRENCY = {
  NG: 'NGN',
  GH: 'GHS',
  KE: 'KES',
  ZA: 'ZAR',
  GB: 'GBP',
  US: 'USD',
  CA: 'CAD',
  AE: 'AED',
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  IE: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  PT: 'EUR',
};

export function normalizeCountryCode(value = '') {
  const code = String(value || '').trim().toUpperCase();
  return code && COUNTRY_TO_CURRENCY[code] ? code : '';
}

export function isValidCurrencyCode(value = '') {
  return SUPPORTED_CURRENCIES.includes(String(value || '').trim().toUpperCase());
}

export function resolveCurrencyInput({ currency, country, fallback = 'USD' } = {}) {
  const normalizedCurrency = String(currency || '').trim().toUpperCase();
  if (isValidCurrencyCode(normalizedCurrency)) return normalizedCurrency;

  const normalizedCountry = normalizeCountryCode(country);
  if (normalizedCountry) return COUNTRY_TO_CURRENCY[normalizedCountry];

  const normalizedFallback = String(fallback || '').trim().toUpperCase();
  if (isValidCurrencyCode(normalizedFallback)) return normalizedFallback;

  return 'USD';
}

export function buildWhatsAppSocialLink(value = '') {
  const phone = String(value || '').replace(/\D/g, '');
  return phone ? `https://wa.me/${phone}` : '';
}

export function mergeWhatsappSocialLink(socialLinks = {}, whatsapp = '') {
  const next = { ...(socialLinks || {}) };
  const whatsappLink = buildWhatsAppSocialLink(whatsapp);

  if (whatsappLink) next.whatsapp = whatsappLink;
  else delete next.whatsapp;

  return next;
}

export function sanitizeProfileUpdates(payload = {}) {
  const next = { ...payload };

  if ('country' in next) {
    const country = normalizeCountryCode(next.country);
    next.country = country || undefined;
  }

  if ('currency' in next || 'country' in next) {
    next.currency = resolveCurrencyInput({
      currency: next.currency,
      country: next.country,
      fallback: next.currency,
    });
  }

  if ('whatsapp' in next || 'socialLinks' in next) {
    next.socialLinks = mergeWhatsappSocialLink(next.socialLinks, next.whatsapp);
  }

  return next;
}