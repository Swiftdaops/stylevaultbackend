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
    const barbers = await Barber.find().lean();
    if (!barbers || barbers.length === 0) {
      console.log('No barbers found.');
      process.exit(0);
    }

    console.log('Barbers:');
    console.log(JSON.stringify(barbers.map(b => ({ id: b._id, name: b.name, slug: b.slug })), null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error listing barbers:', err.message || err);
    process.exit(1);
  }
}

main();
