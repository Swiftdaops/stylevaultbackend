import 'dotenv/config';
import connectDB from '../src/config/db.js';
import Barber from '../src/models/Barber.js';

const slugify = (s = '') =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not configured. Set it in backend/.env or the environment.');
    process.exit(1);
  }

  await connectDB();

  const barberName = 'Nnamdi';
  const slug = slugify(barberName);

  try {
    const existing = await Barber.findOne({ slug });
    if (existing) {
      console.log('Barber already exists:');
      console.log({ id: existing._id.toString(), name: existing.name, slug: existing.slug });
      process.exit(0);
    }

    const barber = await Barber.create({
      name: barberName,
      slug,
      bio: 'Professional barber at StyleVault',
      profileImage: '',
      location: 'Lagos, Nigeria',
      workingHours: {
        Monday: ['09:00', '17:00'],
        Tuesday: ['09:00', '17:00'],
        Wednesday: ['09:00', '17:00'],
        Thursday: ['09:00', '17:00'],
        Friday: ['09:00', '17:00'],
      },
      subscriptionPlan: 'free',
    });

    console.log('Created barber:');
    console.log({ id: barber._id.toString(), name: barber.name, slug: barber.slug });
    process.exit(0);
  } catch (err) {
    console.error('Error creating barber:', err.message || err);
    process.exit(1);
  }
}

main();
