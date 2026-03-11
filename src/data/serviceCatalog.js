const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const categoryMap = {
  'Hair Services': [
    'Haircut',
    'Premium Haircut',
    'Skin Fade',
    'Taper Fade',
    'Kids Haircut',
    'Senior Haircut',
    'Scissor Cut',
    'Hair Trim',
    'Long Hair Styling',
    'Afro Shape Up',
  ],
  'Beard Services': [
    'Beard Trim',
    'Beard Line Up',
    'Beard Sculpting',
    'Full Beard Grooming',
    'Beard Dye',
  ],
  'Grooming Services': [
    'Hair Wash',
    'Hot Towel Treatment',
    'Scalp Massage',
    'Hair Conditioning',
    'Dandruff Treatment',
  ],
  'Styling Services': [
    'Hair Styling',
    'Pomade Styling',
    'Curl Styling',
    'Afro Styling',
    'Twist Styling',
  ],
  'Premium Services': [
    'Haircut + Beard Combo',
    'VIP Grooming Package',
    'Wedding Grooming Package',
    'Haircut + Facial',
    'Haircut + Hot Towel Shave',
  ],
  'Shaving Services': [
    'Clean Shave',
    'Razor Line Up',
    'Head Shave',
    'Bald Fade',
    'Hot Towel Shave',
  ],
  'Hair Coloring': [
    'Hair Dye',
    'Grey Coverage',
    'Highlights',
    'Color Correction',
  ],
};

const seen = new Map();

export const DEFAULT_SERVICE_CATALOG = Object.entries(categoryMap).flatMap(([category, items]) =>
  items.map((name) => {
    const baseSlug = slugify(name);
    const count = (seen.get(baseSlug) || 0) + 1;
    seen.set(baseSlug, count);
    const slug = count > 1 ? `${baseSlug}-${slugify(category)}` : baseSlug;

    return {
      name,
      slug,
      category,
      description: `${name} by a professional barber.`,
      image: `https://placehold.co/800x600/png?text=${encodeURIComponent(name)}`,
      active: true,
    };
  }),
);

export default DEFAULT_SERVICE_CATALOG;
