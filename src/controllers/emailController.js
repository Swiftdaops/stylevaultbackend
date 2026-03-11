// src/controllers/emailController.js
import { sendEmail } from '../services/emailService.js';

const getHtmlContent = ({ html, text, message }) => {
  if (html) return html;
  if (text) return `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${text}</pre>`;
  if (message) return `<div style="font-family: Arial, sans-serif; white-space: pre-wrap;">${message}</div>`;
  return null;
};

// Send booking confirmation
export const sendBookingEmail = async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    const data = await sendEmail({ to, subject, html });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send reminder email
export const sendReminderEmail = async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    const data = await sendEmail({ to, subject, html });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Manual admin email sending
export const sendAdminEmail = async (req, res) => {
  const { to, subject, html, text, message } = req.body;

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const emailHtml = getHtmlContent({ html, text, message });

  if (!to || !subject || !emailHtml) {
    return res.status(400).json({ message: 'to, subject and email content are required' });
  }

  try {
    const data = await sendEmail({ to, subject, html: emailHtml });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};