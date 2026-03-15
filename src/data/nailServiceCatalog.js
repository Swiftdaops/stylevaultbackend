const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const categoryMap = {
  Manicures: [
    'Classic Manicure',
    'Russian Manicure',
    'Gel Manicure',
    'BIAB Manicure',
    'French Manicure',
  ],
  Pedicures: [
    'Classic Pedicure',
    'Spa Pedicure',
    'Gel Pedicure',
    'Deluxe Pedicure',
    'Callus Treatment Pedicure',
  ],
  'Nail Extensions': [
    'Acrylic Full Set',
    'Gel Extensions',
    'Soft Gel Tips',
    'Acrylic Fill',
    'Builder Gel Overlay',
  ],
  'Nail Art & Design': [
    'Custom Nail Art',
    'Chrome Nails',
    'Ombre Nails',
    '3D Nail Design',
    'Bridal Nail Set',
  ],
  'Nail Care & Repair': [
    'Nail Repair',
    'Cuticle Treatment',
    'Nail Strengthening Treatment',
    'Gel Removal',
    'Acrylic Removal',
  ],
  'Mobile & Event Services': [
    'Home Service Manicure',
    'Home Service Pedicure',
    'Bridal Party Nails',
    'Birthday Glam Nails',
  ],
};

const seen = new Map();

export const DEFAULT_NAIL_SERVICE_CATALOG = Object.entries(categoryMap).flatMap(([category, items]) =>
  items.map((name) => {
    const baseSlug = slugify(name);
    const count = (seen.get(baseSlug) || 0) + 1;
    seen.set(baseSlug, count);
    const slug = count > 1 ? `${baseSlug}-${slugify(category)}` : baseSlug;

    return {
      name,
      slug,
      category,
      description: `${name} by a professional nail technician.`,
      image: `https://placehold.co/800x600/png?text=${encodeURIComponent(name)}`,
      active: true,
    };
  })
);

export default DEFAULT_NAIL_SERVICE_CATALOG;
