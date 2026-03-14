import 'dotenv/config';
import bcrypt from 'bcryptjs';
import connectDB from '../src/config/db.js';
import HairSpecialist from '../src/models/HairSpecialist.js';
import User from '../src/models/User.js';

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not configured. Set it in backend/.env or the environment.');
    process.exit(1);
  }

  await connectDB();

  const name = 'Jennie';
  const slug = 'jennie';
  const email = 'sparkyjenny@gmail.com';
  const password = 'Itoolovetobeh';

  try {
    let hairSpecialist = await HairSpecialist.findOne({ slug });

    if (!hairSpecialist) {
      hairSpecialist = await HairSpecialist.create({
        name,
        slug,
        bio: 'Professional hair specialist on StyleVault for wigs, braids, styling, and treatments.',
        location: 'Lagos, Nigeria',
        specialties: ['Wig Installation', 'Knotless Braids', 'Silk Press'],
        workingHours: {
          Monday: ['09:00', '17:00'],
          Tuesday: ['09:00', '17:00'],
          Wednesday: ['09:00', '17:00'],
          Thursday: ['09:00', '17:00'],
          Friday: ['09:00', '17:00'],
          Saturday: ['10:00', '16:00'],
        },
        subscriptionPlan: 'free',
      });
    } else {
      hairSpecialist = await HairSpecialist.findByIdAndUpdate(
        hairSpecialist._id,
        {
          $set: {
            name,
            bio: hairSpecialist.bio || 'Professional hair specialist on StyleVault for wigs, braids, styling, and treatments.',
            location: hairSpecialist.location || 'Lagos, Nigeria',
            specialties: hairSpecialist.specialties?.length ? hairSpecialist.specialties : ['Wig Installation', 'Knotless Braids', 'Silk Press'],
            workingHours: Object.keys(hairSpecialist.workingHours || {}).length
              ? hairSpecialist.workingHours
              : {
                  Monday: ['09:00', '17:00'],
                  Tuesday: ['09:00', '17:00'],
                  Wednesday: ['09:00', '17:00'],
                  Thursday: ['09:00', '17:00'],
                  Friday: ['09:00', '17:00'],
                  Saturday: ['10:00', '16:00'],
                },
          },
        },
        { new: true }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.role !== 'hair-specialist') {
      console.error(`A user with email ${email} already exists with role ${existingUser.role}.`);
      process.exit(1);
    }

    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          password: hashedPassword,
          role: 'hair-specialist',
          hairSpecialistId: hairSpecialist._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('Jennie hair specialist seeded successfully:');
    console.log({
      hairSpecialistId: hairSpecialist._id.toString(),
      userId: user._id.toString(),
      name: hairSpecialist.name,
      slug: hairSpecialist.slug,
      email: user.email,
      role: user.role,
    });
    console.log('Credentials:');
    console.log(`  email: ${email}`);
    console.log(`  password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed Jennie hair specialist:', error.message || error);
    process.exit(1);
  }
}

main();
