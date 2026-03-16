import { sendEmail } from '../services/emailService.js'

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

export const requestPro = async (req, res) => {
  try {
    const {
      name,
      email,
      whatsapp,
      phone,
      country,
      plan,
      niche,
    } = req.body || {}

    const phoneNumber = String(phone || whatsapp || '').trim()

    if (!name || !email || !phoneNumber || !country || !plan || !niche) {
      return res.status(400).json({
        message: 'Name, email, phone number, country, plan, and niche are required',
      })
    }

    const fallbackAdminEmail = 'stylevaultlite@gmail.com'
    const configuredAdminEmail = process.env.ADMIN_BOOKING_EMAIL || process.env.ADMIN_EMAIL || ''
    const adminRecipients = [...new Set([configuredAdminEmail, fallbackAdminEmail].map((value) => String(value || '').trim()).filter(Boolean))]

    const subject = `Pro plan request — ${name} (${niche})`
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>New Pro plan request</h2>
        <ul>
          <li><strong>Name:</strong> ${escapeHtml(name)}</li>
          <li><strong>Email:</strong> ${escapeHtml(email)}</li>
          <li><strong>Phone / WhatsApp:</strong> ${escapeHtml(phoneNumber)}</li>
          <li><strong>Country:</strong> ${escapeHtml(country)}</li>
          <li><strong>Plan:</strong> ${escapeHtml(plan)}</li>
          <li><strong>Niche:</strong> ${escapeHtml(niche)}</li>
        </ul>
      </div>
    `

    // Send using shared email service
    await sendEmail({ to: adminRecipients, subject, html })

    const adminWhatsApp = process.env.ADMIN_WHATSAPP || process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || null

    return res.json({ success: true, adminWhatsApp })
  } catch (err) {
    console.error('Pro request failed:', err)
    return res.status(500).json({ message: err.message || 'Failed to request pro' })
  }
}
