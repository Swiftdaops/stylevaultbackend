import 'dotenv/config';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Barber from '../src/models/Barber.js';
import bcrypt from 'bcryptjs';

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not configured. Set it in backend/.env or the environment.');
    process.exit(1);
  }

  await connectDB();

  try {
    const barber = await Barber.findOne({ slug: 'nnamdi' });
    if (!barber) {
      console.error('Barber with slug "nnamdi" was not found. Run createBarber.js first.');
      process.exit(1);
    }

    const email = process.argv[2] || 'invitationlite@gmail.com';
    const password = process.argv[3] || 'tobefavour';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log('User already exists:');
      console.log({ id: existing._id.toString(), email: existing.email, role: existing.role });
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      password: hashed,
      role: 'barber',
      barberId: barber._id,
    });

    console.log('Created user:');
    console.log({ id: user._id.toString(), email: user.email, role: user.role });
    console.log('Credentials:');
    console.log(`  email: ${email}`);
    console.log(`  password: ${password}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create Nnamdi user:', err.message || err);
    process.exit(1);
  }
}

main();
