function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeBrandName(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function slugifyBrand(value = '') {
  return normalizeBrandName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildBrandSuggestions(value = '') {
  const brandName = normalizeBrandName(value);
  const slugBase = slugifyBrand(brandName);
  if (!brandName || !slugBase) return [];

  const suggestions = [
    `${brandName} Lite`,
    `${brandName} Tech`,
    `${brandName} Pro`,
    `Pretty ${brandName}`,
    `The ${brandName}`,
  ];

  return suggestions
    .map((name) => ({ name, slug: slugifyBrand(name) }))
    .filter((item, index, collection) => item.slug && item.slug !== slugBase && collection.findIndex((entry) => entry.slug === item.slug) === index);
}

export async function findExistingBrand(Model, { name = '', slug = '' } = {}) {
  const normalizedName = normalizeBrandName(name);
  const normalizedSlug = slugifyBrand(slug || name);

  const checks = [];

  if (normalizedName) {
    checks.push(
      Model.findOne({ name: { $regex: `^${escapeRegExp(normalizedName)}$`, $options: 'i' } })
        .select('_id name slug')
        .lean()
    );
  } else {
    checks.push(Promise.resolve(null));
  }

  if (normalizedSlug) {
    checks.push(Model.findOne({ slug: normalizedSlug }).select('_id name slug').lean());
  } else {
    checks.push(Promise.resolve(null));
  }

  const [existingName, existingSlug] = await Promise.all(checks);

  return {
    normalizedName,
    normalizedSlug,
    existingName,
    existingSlug,
  };
}

export function buildTakenBrandResponse({ name = '', slug = '', existingName = null, existingSlug = null } = {}) {
  const suggestions = buildBrandSuggestions(name || slug);
  const field = existingSlug ? 'slug' : 'name';
  const message = existingSlug
    ? 'That brand slug is already taken. Try a small variation.'
    : 'That brand name is already taken. Try a small variation.';

  return {
    field,
    message,
    suggestions,
  };
}