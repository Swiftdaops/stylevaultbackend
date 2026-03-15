const ALLOWED_PERMISSIONS = new Set(['default', 'granted', 'denied', 'unsupported']);

const normalizeString = (value) => String(value || '').trim();

export const normalizeNotificationPermission = (value) => {
  const permission = normalizeString(value).toLowerCase();
  return ALLOWED_PERMISSIONS.has(permission) ? permission : 'default';
};

export const buildNotificationDeviceEntry = (payload = {}, req = null) => {
  const permission = normalizeNotificationPermission(payload.permission);
  const token = permission === 'granted' ? normalizeString(payload.token) : '';
  const userAgent = normalizeString(payload.userAgent || req?.get?.('user-agent'));
  const platform = normalizeString(payload.platform);
  const language = normalizeString(payload.language);
  const scope = normalizeString(payload.scope);

  if (!token && !userAgent && !platform && !language && permission === 'default') {
    return null;
  }

  return {
    token,
    permission,
    userAgent,
    platform,
    language,
    scope,
    lastSeenAt: new Date(),
  };
};

const matchesDeviceContext = (entry, candidate) => {
  if (!entry || !candidate) return false;

  if (candidate.token && entry.token === candidate.token) {
    return true;
  }

  return Boolean(
    candidate.userAgent
    && entry.userAgent === candidate.userAgent
    && (candidate.platform ? entry.platform === candidate.platform : true)
    && (candidate.scope ? entry.scope === candidate.scope : true)
  );
};

export const upsertNotificationDeviceEntries = (entries = [], payload = {}, options = {}) => {
  const deviceEntry = payload && payload.lastSeenAt ? payload : buildNotificationDeviceEntry(payload, options.req);
  if (!deviceEntry) {
    return Array.isArray(entries) ? entries : [];
  }

  const maxItems = Number(options.maxItems) > 0 ? Number(options.maxItems) : 10;
  const now = new Date();
  const currentEntries = Array.isArray(entries) ? entries.map((entry) => ({ ...entry })) : [];
  const existingIndex = currentEntries.findIndex((entry) => matchesDeviceContext(entry, deviceEntry));
  const existingEntry = existingIndex >= 0 ? currentEntries[existingIndex] : null;

  const nextEntry = {
    token: deviceEntry.permission === 'granted' ? normalizeString(deviceEntry.token) : '',
    permission: normalizeNotificationPermission(deviceEntry.permission),
    userAgent: normalizeString(deviceEntry.userAgent),
    platform: normalizeString(deviceEntry.platform),
    language: normalizeString(deviceEntry.language),
    scope: normalizeString(deviceEntry.scope),
    subscribedAt: existingEntry?.subscribedAt || now,
    lastSeenAt: now,
  };

  if (existingIndex >= 0) {
    currentEntries.splice(existingIndex, 1);
  }

  currentEntries.push(nextEntry);

  return currentEntries.slice(-maxItems);
};