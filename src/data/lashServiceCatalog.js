const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const categoryMap = {
  'Classic Lash Sets': [
    'Classic Full Set',
    'Classic Lash Fill',
    'Wet Look Classic Set',
  ],
  'Hybrid Lash Sets': [
    'Hybrid Full Set',
    'Hybrid Lash Fill',
    'Textured Hybrid Set',
  ],
  'Volume Lash Sets': [
    'Volume Full Set',
    'Volume Lash Fill',
    'Mega Volume Set',
  ],
  'Lash Lift & Tint': [
    'Lash Lift',
    'Lash Lift and Tint',
    'Bottom Lash Tint',
  ],
  'Removal & Aftercare': [
    'Lash Removal',
    'Lash Bath Treatment',
    'Aftercare Kit',
  ],
  'Brows & Combo Services': [
    'Brow Tint',
    'Brow Lamination',
    'Lash and Brow Combo',
  ],
};

const seen = new Map();

export const DEFAULT_LASH_SERVICE_CATALOG = Object.entries(categoryMap).flatMap(([category, items]) =>
  items.map((name) => {
    const baseSlug = slugify(name);
    const count = (seen.get(baseSlug) || 0) + 1;
    seen.set(baseSlug, count);
    const slug = count > 1 ? `${baseSlug}-${slugify(category)}` : baseSlug;

    return {
      name,
      slug,
      category,
      description: `${name} by a professional lash technician.`,
      image: `https://placehold.co/800x600/png?text=${encodeURIComponent(name)}`,
      active: true,
    };
  }),
);

export default DEFAULT_LASH_SERVICE_CATALOG;
