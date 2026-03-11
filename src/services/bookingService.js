// src/services/bookingService.js
import Appointment from '../models/Appointment.js';
import Customer from '../models/Customer.js';

export const createAppointment = async ({ barberId, serviceId, date, time, customerName, customerEmail, price }) => {
  // Prevent double booking
  const existing = await Appointment.findOne({ barberId, date, time });
  if (existing) throw new Error('Time slot already booked');

  // Upsert customer
  let customer = await Customer.findOne({ barberId, email: customerEmail });
  if (!customer) {
    customer = await Customer.create({ barberId, name: customerName, email: customerEmail, visitHistory: [] });
  }

  const appointment = await Appointment.create({
    barberId,
    serviceId,
    customerId: customer._id,
    customerName,
    customerEmail,
    date,
    time,
    price,
    status: 'confirmed',
  });

  customer.visitHistory.push(appointment._id);
  await customer.save();

  return appointment;
};