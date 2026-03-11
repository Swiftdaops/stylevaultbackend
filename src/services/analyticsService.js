// src/services/analyticsService.js
import Appointment from '../models/Appointment.js';
import Service from '../models/Service.js';

export const getBarberAnalytics = async (barberId) => {
  const appointments = await Appointment.find({ barberId });
  const totalRevenue = appointments.reduce((acc, a) => acc + a.price, 0);

  const services = await Service.find({ barberId });
  const popularServices = services
    .sort((a, b) => (b.bookingsCount || 0) - (a.bookingsCount || 0))
    .slice(0, 5);

  const repeatCustomers = new Set(appointments.map(a => a.customerId.toString())).size;

  return {
    totalRevenue,
    totalAppointments: appointments.length,
    popularServices,
    repeatCustomers,
  };
};