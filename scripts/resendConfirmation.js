import 'dotenv/config';
import connectDB from '../src/config/db.js';
import Appointment from '../src/models/Appointment.js';
import Barber from '../src/models/Barber.js';
import Service from '../src/models/Service.js';
import { sendEmail } from '../src/services/emailService.js';

const DEFAULT_RECIPIENT = 'elitesafehaven@gmail.com';

async function main() {
  await connectDB();

  try {
    const recipient = process.argv[2] || process.env.RESEND_CONFIRMATION_TO || DEFAULT_RECIPIENT;

    const barber = await Barber.findOne({ slug: 'nnamdi' }).lean();
    if (!barber) {
      throw new Error('Barber with slug "nnamdi" was not found');
    }

    const appointment = await Appointment.findOne({
      barberId: barber._id,
      status: 'confirmed',
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!appointment) {
      throw new Error('No confirmed appointment found for Nnamdi');
    }

    const service = await Service.findById(appointment.serviceId).lean();
    if (!service) {
      throw new Error('Service for the selected appointment was not found');
    }

    const emailResult = await sendEmail({
      to: recipient,
      subject: 'Your StyleVault order is confirmed',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
          <h2>Order Confirmed</h2>
          <p>Hi there,</p>
          <p>This is a confirmation copy for an existing booking with ${barber.name}.</p>
          <ul>
            <li><strong>Service:</strong> ${service.name}</li>
            <li><strong>Date:</strong> ${appointment.date}</li>
            <li><strong>Time:</strong> ${appointment.time}</li>
            <li><strong>Price:</strong> $${(appointment.price / 100).toFixed(2)}</li>
            <li><strong>Booking status:</strong> ${appointment.status}</li>
          </ul>
          <p>No new appointment was created. This email was sent from an existing booking record.</p>
        </div>
      `,
    });

    console.log(
      JSON.stringify(
        {
          recipient,
          barber: { id: barber._id, name: barber.name, slug: barber.slug },
          appointment: {
            id: appointment._id,
            date: appointment.date,
            time: appointment.time,
            status: appointment.status,
          },
          service: { id: service._id, name: service.name, price: service.price },
          email: { sent: true, result: emailResult },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error('Failed to resend confirmation:', error.message || error);
    process.exit(1);
  }

  process.exit(0);
}

main();