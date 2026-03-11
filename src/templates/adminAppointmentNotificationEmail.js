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

const formatPrice = (value, currency = 'USD') => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Not specified';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
};

const summaryRow = (label, value, isLast = false) => `
  <tr>
    <td style="padding:14px 0; border-bottom:${isLast ? 'none' : '1px solid #e5e7eb'}; color:#6b7280; font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:14px 0; border-bottom:${isLast ? 'none' : '1px solid #e5e7eb'}; color:#111827; font-size:14px; font-weight:700; text-align:right;">${escapeHtml(value)}</td>
  </tr>
`;

export const adminAppointmentNotificationTemplate = ({
  customerName,
  customerEmail,
  customerPhone,
  barberName,
  serviceName,
  appointmentDate,
  appointmentTime,
  location,
  price,
  currency = 'USD',
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Appointment Submitted</title>
</head>
<body style="margin:0; padding:0; background:#f5f6fa; font-family:Arial,Helvetica,sans-serif; color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6fa; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="background:#111111; padding:28px 32px; text-align:center; color:#ffffff; font-size:24px; font-weight:700;">
              StyleVault Admin Alert
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="font-size:28px; line-height:1.2; font-weight:700; margin-bottom:12px;">New appointment submitted</div>
              <div style="font-size:16px; line-height:1.7; color:#4b5563; margin-bottom:24px;">A customer has just submitted a new appointment request.</div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:14px; padding:0 20px;">
                <tr>
                  <td style="padding:20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${summaryRow('Customer', customerName)}
                      ${summaryRow('Email', customerEmail)}
                      ${summaryRow('Phone', customerPhone || 'Not provided')}
                      ${summaryRow('Barber', barberName)}
                      ${summaryRow('Service', serviceName)}
                      ${summaryRow('Date', formatAppointmentDate(appointmentDate))}
                      ${summaryRow('Time', formatAppointmentTime(appointmentTime))}
                      ${summaryRow('Location', location)}
                      ${summaryRow('Price', formatPrice(price, currency), true)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px; color:#6b7280; font-size:12px; line-height:1.6; text-align:center;">
              StyleVault booking notification
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export default adminAppointmentNotificationTemplate;