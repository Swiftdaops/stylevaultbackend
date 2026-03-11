import 'dotenv/config';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Barber from '../src/models/Barber.js';

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not configured. Set it in backend/.env or the environment.');
    process.exit(1);
  }

  await connectDB();

  const oldEmail = process.argv[2] || 'invitationlite@gmail..com';
  const newEmail = process.argv[3] || 'invitationlite@gmail.com';

  try {
    const barber = await Barber.findOne({ slug: 'nnamdi' });

    let user = await User.findOne({ email: oldEmail });
    if (!user && barber) {
      user = await User.findOne({ barberId: barber._id });
    }

    if (!user) {
      console.error(`User not found (tried email ${oldEmail} and barber slug 'nnamdi')`);
      process.exit(1);
    }

    const conflict = await User.findOne({ email: newEmail });
    if (conflict && conflict._id.toString() !== user._id.toString()) {
      console.error(`A different user already exists with the target email ${newEmail}. Aborting.`);
      process.exit(1);
    }

    user.email = newEmail;
    await user.save();

    console.log('Updated user email:');
    console.log({ id: user._id.toString(), email: user.email, role: user.role });
    process.exit(0);
  } catch (err) {
    console.error('Failed to update user email:', err.message || err);
    process.exit(1);
  }
}

main();
