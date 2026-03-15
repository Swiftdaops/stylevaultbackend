const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const categoryMap = {
  'Bridal Makeup': [
    'Traditional Bridal Glam',
    'Soft Glam Bridal Look',
    'Court Wedding Makeup',
  ],
  'Event Makeup': [
    'Birthday Glam Makeup',
    'Photoshoot Makeup',
    'Red Carpet Glam',
  ],
  'Natural & Soft Glam': [
    'No-Makeup Makeup Look',
    'Soft Glam Full Face',
    'Radiant Everyday Glam',
  ],
  'Editorial & Creative': [
    'Editorial Beauty Look',
    'Creative Color Glam',
    'Avant-Garde Makeup',
  ],
  'Group & Mobile Services': [
    'Bridesmaid Makeup',
    'Home Service Makeup Session',
    'Group Glam Booking',
  ],
  'Add-On Beauty Services': [
    'Strip Lash Application',
    'Brows Definition Add-On',
    'Touch-Up Session',
  ],
};

const seen = new Map();

export const DEFAULT_MAKEUP_SERVICE_CATALOG = Object.entries(categoryMap).flatMap(([category, items]) =>
  items.map((name) => {
    const baseSlug = slugify(name);
    const count = (seen.get(baseSlug) || 0) + 1;
    seen.set(baseSlug, count);
    const slug = count > 1 ? `${baseSlug}-${slugify(category)}` : baseSlug;

    return {
      name,
      slug,
      category,
      description: `${name} by a professional makeup artist.`,
      image: `https://placehold.co/800x600/png?text=${encodeURIComponent(name)}`,
      active: true,
    };
  }),
);

export default DEFAULT_MAKEUP_SERVICE_CATALOG;
