import { sendEmail } from '../services/emailService.js'

export const requestPro = async (req, res) => {
  try {
    const { name, email, whatsapp } = req.body || {}

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' })
    }

    const adminEmail = process.env.ADMIN_BOOKING_EMAIL || process.env.ADMIN_EMAIL
    if (!adminEmail) {
      return res.status(500).json({ message: 'Admin email is not configured' })
    }

    const subject = `Pro plan request — ${name}`
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>New Pro plan request</h2>
        <ul>
          <li><strong>Name:</strong> ${String(name)}</li>
          <li><strong>Email:</strong> ${String(email)}</li>
          <li><strong>WhatsApp:</strong> ${String(whatsapp || '')}</li>
        </ul>
      </div>
    `

    // Send using shared email service
    await sendEmail({ to: adminEmail, subject, html })

    const adminWhatsApp = process.env.ADMIN_WHATSAPP || process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || null

    return res.json({ success: true, adminWhatsApp })
  } catch (err) {
    console.error('Pro request failed:', err)
    return res.status(500).json({ message: err.message || 'Failed to request pro' })
  }
}
