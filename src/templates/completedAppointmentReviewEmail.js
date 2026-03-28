const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatAppointmentDate = (value) => {
  if (!value) return 'Not specified';
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

const formatAppointmentTime = (value) => {
  if (!value) return 'Not specified';
  const parsed = new Date(`2000-01-01T${value}`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
};

const summaryRow = (label, value, isLast = false) => `
  <tr>
    <td style="padding:14px 0;border-bottom:${isLast ? 'none' : '1px solid #e5e7eb'};color:#6b7280;font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:14px 0;border-bottom:${isLast ? 'none' : '1px solid #e5e7eb'};color:#111827;font-size:14px;font-weight:700;text-align:right;">${escapeHtml(value)}</td>
  </tr>
`;

const renderButton = (href, label, background, color) => (
  href
    ? `<a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:${background};color:${color};text-decoration:none;font-weight:700;">${escapeHtml(label)}</a>`
    : ''
);

export const completedAppointmentReviewTemplate = ({
  customerName,
  providerName,
  providerLabel = 'Provider',
  serviceName,
  appointmentDate,
  appointmentTime,
  reviewLink,
  manageLink,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thanks for visiting ${escapeHtml(providerName || 'StyleVault')}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6fa;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="background:#111111;padding:28px 32px;text-align:center;color:#ffffff;font-size:24px;font-weight:700;">StyleVault</td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="display:inline-block;border-radius:999px;background:#fef3c7;color:#92400e;padding:8px 14px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Appointment completed</div>
              <h1 style="margin:18px 0 12px;font-size:30px;line-height:1.2;">Thank you for booking with ${escapeHtml(providerName || 'StyleVault')}</h1>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.75;color:#4b5563;">Hi ${escapeHtml(customerName || 'there')}, thank you for choosing ${escapeHtml(providerLabel)} ${escapeHtml(providerName || 'StyleVault')}. We appreciate your time and would love to hear how your appointment went.</p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.75;color:#4b5563;">You can leave a review and a star rating from your bookings page so future clients can book with confidence.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:0 20px;">
                <tr>
                  <td style="padding:20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${summaryRow(providerLabel, providerName || 'StyleVault')}
                      ${summaryRow('Service', serviceName || 'Appointment')}
                      ${summaryRow('Date', formatAppointmentDate(appointmentDate))}
                      ${summaryRow('Time', formatAppointmentTime(appointmentTime), true)}
                    </table>
                  </td>
                </tr>
              </table>

              <div style="margin-top:28px;display:flex;flex-wrap:wrap;gap:12px;">
                ${renderButton(reviewLink, 'Leave a review', '#f59e0b', '#111827')}
                ${renderButton(manageLink, 'Open booking manager', '#111111', '#ffffff')}
              </div>

              <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">Your review link opens your booking details and the review form directly. If you already left a review, you can use the same page to update it.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export default completedAppointmentReviewTemplate;
