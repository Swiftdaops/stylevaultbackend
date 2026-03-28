const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatReviewDate = (value) => {
  if (!value) return 'Just now';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
};

const summaryRow = (label, value, isLast = false) => `
  <tr>
    <td style="padding:14px 0; border-bottom:${isLast ? 'none' : '1px solid #e5e7eb'}; color:#6b7280; font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:14px 0; border-bottom:${isLast ? 'none' : '1px solid #e5e7eb'}; color:#111827; font-size:14px; font-weight:700; text-align:right;">${escapeHtml(value)}</td>
  </tr>
`;

const renderStars = (rating = 0) => '★'.repeat(Math.max(0, Math.min(5, Number(rating) || 0))) + '☆'.repeat(Math.max(0, 5 - (Number(rating) || 0)));

export const storefrontOwnerReviewNotificationTemplate = ({
  customerName,
  providerName,
  providerLabel = 'Storefront',
  serviceName,
  rating,
  comment,
  createdAt,
  dashboardLink,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New review for ${escapeHtml(providerName)}</title>
</head>
<body style="margin:0; padding:0; background:#f5f6fa; font-family:Arial,Helvetica,sans-serif; color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f6fa; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden;">
          <tr>
            <td style="background:#111111; padding:28px 32px; text-align:center; color:#ffffff; font-size:24px; font-weight:700;">
              New review received
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="font-size:28px; line-height:1.2; font-weight:700; margin-bottom:12px;">${escapeHtml(customerName)} left a ${escapeHtml(String(rating))}-star review</div>
              <div style="font-size:16px; line-height:1.7; color:#4b5563; margin-bottom:24px;">Your ${escapeHtml(providerLabel.toLowerCase())} storefront received new feedback from a completed appointment.</div>

              <div style="margin-bottom:24px; padding:18px 20px; border-radius:14px; background:#111111; color:#ffffff; font-size:24px; letter-spacing:2px; text-align:center;">${renderStars(rating)}</div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:14px; padding:0 20px;">
                <tr>
                  <td style="padding:20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${summaryRow('Customer', customerName)}
                      ${summaryRow(providerLabel, providerName)}
                      ${summaryRow('Service', serviceName || 'Appointment')}
                      ${summaryRow('Rating', `${rating} / 5`)}
                      ${summaryRow('Review date', formatReviewDate(createdAt), true)}
                    </table>
                  </td>
                </tr>
              </table>

              ${comment ? `<div style="margin-top:24px; padding:18px 20px; border-radius:14px; background:#fff7ed; border:1px solid #fed7aa; color:#7c2d12; font-size:15px; line-height:1.7;"><strong style="display:block; margin-bottom:8px; color:#9a3412;">Customer comment</strong>${escapeHtml(comment)}</div>` : ''}

              ${dashboardLink ? `
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                  <tr>
                    <td align="center" bgcolor="#111111" style="border-radius:999px;">
                      <a href="${escapeHtml(dashboardLink)}" style="display:inline-block; padding:14px 24px; color:#ffffff; text-decoration:none; font-size:14px; font-weight:700;">Open dashboard</a>
                    </td>
                  </tr>
                </table>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px; color:#6b7280; font-size:12px; line-height:1.6; text-align:center;">
              StyleVault storefront owner notification
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
