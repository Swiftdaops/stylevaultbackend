const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const categoryMap = {
  'Braids & Protective Styles': [
    'Box Braids',
    'Knotless Braids',
    'Cornrows',
    'Fulani Braids',
    'Ghana Weaving',
    'Twist Braids',
    'Crochet Braids',
  ],
  'Wig Services': [
    'Wig Installation',
    'Frontal Wig Installation',
    'Closure Installation',
    'Wig Revamping',
    'Lace Replacement',
    'Wig Customization',
    'Wig Maintenance',
  ],
  'Hair Styling': [
    'Silk Press',
    'Blow Dry',
    'Curl Styling',
    'Updo Styling',
    'Bridal Hair Styling',
    'Event Hair Styling',
    'Hair Straightening',
  ],
  'Hair Treatments': [
    'Deep Conditioning',
    'Protein Treatment',
    'Scalp Treatment',
    'Keratin Treatment',
    'Hair Repair Therapy',
    'Hair Hydration Treatment',
  ],
  'Hair Coloring': [
    'Full Hair Coloring',
    'Highlights',
    'Balayage',
    'Ombre Coloring',
    'Color Correction',
    'Root Touch Up',
  ],
  'Hair Extensions': [
    'Clip-in Extensions',
    'Tape-in Extensions',
    'Sew-in Weave',
    'Fusion Extensions',
    'Micro Link Extensions',
  ],
  'Natural Hair Care': [
    'Natural Hair Styling',
    'Twist Out',
    'Bantu Knots',
    'Wash and Go Styling',
    'Detangling Service',
  ],

  // New: Wig Spa & Restoration (Revamp)
  'The Wig Spa & Restoration (Revamp)': [
    "The Signature Detox Revamp",
    'Lace Replacement Surgery',
    "The 'Silk Glaze' Treatment",
    '24-Hour Express Laundry',
  ],

  // New: Advanced Lace Customization & Installs
  'Advanced Lace Customization & Installs': [
    'HD Lace Customization',
    "Glueless 'Fit-Lock' Install",
    "The 'Adhesive Melt' (Long-Wear)",
    'Wig Cut & Sculpt',
  ],

  // New: Business & Professional Development
  'Business & Professional Development': [
    'Salon Content Strategy Session',
    'Pricing for Profit Consultation',
    'Virtual Wig Making 101',
    'Wholesale Vendor Sourcing Guide',
  ],
};

const seen = new Map();

export const DEFAULT_HAIR_SERVICE_CATALOG = Object.entries(categoryMap).flatMap(([category, items]) =>
  items.map((name) => {
    const baseSlug = slugify(name);
    const count = (seen.get(baseSlug) || 0) + 1;
    seen.set(baseSlug, count);
    const slug = count > 1 ? `${baseSlug}-${slugify(category)}` : baseSlug;

    return {
      name,
      slug,
      category,
      description: `${name} by a professional hair specialist.`,
      image: `https://placehold.co/800x600/png?text=${encodeURIComponent(name)}`,
      active: true,
    };
  }),
);

export default DEFAULT_HAIR_SERVICE_CATALOG;
