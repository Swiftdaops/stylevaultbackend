import 'dotenv/config'
import connectDB from '../src/config/db.js'
import User from '../src/models/User.js'
import Barber from '../src/models/Barber.js'
import bcrypt from 'bcryptjs'

function slugify(s = '') {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function titleCase(s = '') {
  return String(s).replace(/[-_.]/g, ' ').replace(/(^|\s)\S/g, (t) => t.toUpperCase())
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  args.forEach((a) => {
    const [k, v] = a.split('=')
    if (k.startsWith('--')) out[k.slice(2)] = v === undefined ? true : v
  })
  return out
}

async function main() {
  const { email, password } = parseArgs()
  if (!email || !password) {
    console.error('Usage: node upsertBarberAndUpgrade.js --email=you@example.com --password=PASSWORD')
    process.exit(1)
  }

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not configured in backend/.env or environment')
    process.exit(1)
  }

  await connectDB()

  const normalizedEmail = String(email).trim().toLowerCase()

  // Find or create user
  let user = await User.findOne({ email: normalizedEmail })
  if (!user) {
    console.log('No user found for', normalizedEmail, '- creating user and barber')

    const barberName = titleCase(normalizedEmail.split('@')[0])
    const slug = slugify(barberName)

    const barber = await Barber.create({
      name: barberName,
      slug,
      bio: 'Upserted barber',
      location: '',
      workingHours: {},
      subscriptionPlan: 'pro',
    })

    const hashed = await bcrypt.hash(password, 10)
    user = await User.create({ email: normalizedEmail, password: hashed, role: 'barber', barberId: barber._id })

    console.log('Created user and barber:', { userId: user._id.toString(), barberId: barber._id.toString() })
  } else {
    console.log('Found user:', normalizedEmail)
    // Ensure role barber
    if (user.role !== 'barber') {
      console.log('Warning: user role is', user.role, '- setting to barber')
      user.role = 'barber'
    }

    // Update password to the provided value so login works
    const hashed = await bcrypt.hash(password, 10)
    user.password = hashed
    await user.save()
    console.log('Updated user password')
  }

  // Ensure barber record exists
  let barber = null
  if (user.barberId) barber = await Barber.findById(user.barberId)
  if (!barber) {
    const barberName = titleCase(normalizedEmail.split('@')[0])
    const slug = slugify(barberName)
    barber = await Barber.create({ name: barberName, slug, bio: 'Created from upsert script', location: '', workingHours: {}, subscriptionPlan: 'pro' })
    user.barberId = barber._id
    await user.save()
    console.log('Created barber and attached to user:', barber._id.toString())
  }

  // Set working hours Monday-Sunday 09:00 - 22:00 and upgrade to pro
  const hours = {
    Monday: ['09:00', '22:00'],
    Tuesday: ['09:00', '22:00'],
    Wednesday: ['09:00', '22:00'],
    Thursday: ['09:00', '22:00'],
    Friday: ['09:00', '22:00'],
    Saturday: ['09:00', '22:00'],
    Sunday: ['09:00', '22:00'],
  }

  barber.workingHours = hours
  barber.subscriptionPlan = 'pro'
  await barber.save()

  console.log('Updated barber:', { barberId: barber._id.toString(), subscriptionPlan: barber.subscriptionPlan, workingHours: barber.workingHours })
  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err?.message || err)
  process.exit(1)
})
