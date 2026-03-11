import 'dotenv/config';
import connectDB from '../src/config/db.js';
import Barber from '../src/models/Barber.js';

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not configured. Set it in backend/.env or the environment.');
    process.exit(1);
  }

  await connectDB();

  try {
    const details = {
      name: 'Nnamdi',
      slug: 'nnamdi',
      bio: 'Professional barber from Anambra specializing in modern fades, precision cuts, and premium grooming services.',
      profileImage: '',
      location: 'Anambra, Nigeria',
      currency: 'USD',
      workingHours: {
        Monday: ['09:00','18:00'],
        Tuesday: ['09:00','18:00'],
        Wednesday: ['09:00','18:00'],
        Thursday: ['09:00','18:00'],
        Friday: ['09:00','18:00'],
        Saturday: ['10:00','17:00'],
      },
      subscriptionPlan: 'pro',
    };

    const barber = await Barber.findOneAndUpdate(
      { slug: details.slug },
      { $set: details },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    console.log('Upserted barber:');
    console.log(JSON.stringify({ id: barber._id.toString(), ...details }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Failed to upsert barber:', err.message || err);
    process.exit(1);
  }
}

main();
