import 'dotenv/config';
import connectDB from '../src/config/db.js';
import Appointment from '../src/models/Appointment.js';
import Barber from '../src/models/Barber.js';
import Customer from '../src/models/Customer.js';
import Service from '../src/models/Service.js';
import { sendEmail } from '../src/services/emailService.js';

const ORDER_DATE = '2026-04-20';
const START_HOUR = 10;
const START_MINUTE = 0;
const SLOT_INCREMENT_MINUTES = 30;
const MAX_SLOT_ATTEMPTS = 10;

const buildTime = (hour, minute) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

const addMinutes = (hour, minute, increment) => {
  const total = hour * 60 + minute + increment;
  return {
    hour: Math.floor(total / 60),
    minute: total % 60,
  };
};

async function getAvailableTime(barberId, date) {
  let hour = START_HOUR;
  let minute = START_MINUTE;

  for (let index = 0; index < MAX_SLOT_ATTEMPTS; index += 1) {
    const time = buildTime(hour, minute);
    const existing = await Appointment.findOne({ barberId, date, time }).lean();

    if (!existing) return time;

    const next = addMinutes(hour, minute, SLOT_INCREMENT_MINUTES);
    hour = next.hour;
    minute = next.minute;
  }

  throw new Error('No free appointment slot available for the configured date');
}

async function main() {
  await connectDB();

  try {
    const barber = await Barber.findOne({ slug: 'nnamdi' });
    if (!barber) {
      throw new Error('Barber with slug "nnamdi" was not found');
    }

    let service = await Service.findOne({ barberId: barber._id, name: 'Hair Cut' });
    if (!service) {
      service = await Service.create({
        barberId: barber._id,
        name: 'Hair Cut',
        price: 1000000,
        duration: 60,
        description: 'Premium hair cut service for Nnamdi',
        homeServiceAvailable: false,
      });
    } else {
      service.price = 1000000;
      service.duration = service.duration || 60;
      await service.save();
    }

    let customer = await Customer.findOne({
      barberId: barber._id,
      email: 'tobechukwufavobi@gmail.com',
    });

    if (!customer) {
      customer = await Customer.create({
        barberId: barber._id,
        name: 'Favobi Test Customer',
        email: 'tobechukwufavobi@gmail.com',
        phone: '08000000000',
        visitHistory: [],
      });
    }

    const time = await getAvailableTime(barber._id, ORDER_DATE);

    const appointment = await Appointment.create({
      barberId: barber._id,
      serviceId: service._id,
      customerId: customer._id,
      customerName: customer.name,
      customerEmail: customer.email,
      date: ORDER_DATE,
      time,
      price: 1000000,
      status: 'confirmed',
    });

    if (!customer.visitHistory.some((entry) => entry.toString() === appointment._id.toString())) {
      customer.visitHistory.push(appointment._id);
      await customer.save();
    }

    await Service.findByIdAndUpdate(service._id, { $inc: { bookingsCount: 1 } });

    let emailResult = null;
    let emailError = null;

    try {
      emailResult = await sendEmail({
        to: customer.email,
        subject: 'Your StyleVault order is confirmed',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
            <h2>Order Confirmed</h2>
            <p>Hi ${customer.name},</p>
            <p>Your booking with ${barber.name} has been confirmed.</p>
            <ul>
              <li><strong>Service:</strong> ${service.name}</li>
              <li><strong>Date:</strong> ${ORDER_DATE}</li>
              <li><strong>Time:</strong> ${time}</li>
              <li><strong>Price:</strong> $${(service.price / 100).toFixed(2)}</li>
            </ul>
            <p>Thank you for booking with StyleVault.</p>
          </div>
        `,
      });
    } catch (error) {
      emailError = error.message;
    }

    console.log(
      JSON.stringify(
        {
          barber: { id: barber._id, name: barber.name, slug: barber.slug },
          service: { id: service._id, name: service.name, price: service.price },
          appointment: { id: appointment._id, date: appointment.date, time: appointment.time, status: appointment.status },
          email: { sent: Boolean(emailResult), error: emailError, result: emailResult },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error('Failed to create Nnamdi haircut order:', error.message || error);
    process.exit(1);
  }

  process.exit(0);
}

main();