// src/services/emailService.js
import fetch from 'node-fetch';

const extractEmail = (from) => {
  if (!from) return '';
  const m = String(from).match(/<([^>]+)>/);
  if (m && m[1]) return m[1].trim();
  const tokens = String(from).split(/\s+/);
  const possible = tokens[tokens.length - 1];
  return possible && possible.includes('@') ? possible : String(from).trim();
};

const htmlToText = (html = '') => {
  if (!html) return '';
  let text = String(html)
    .replace(/<(br|BR)\s*\/?\s*>/g, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  text = text.replace(/\s+\n/g, '\n').replace(/\n{2,}/g, '\n\n').trim();
  return text;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'StyleVault <vip@stylevault.site>';

  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const replyToEmail = process.env.RESEND_REPLY_TO || extractEmail(FROM_EMAIL);
  const plainText = text || htmlToText(html);

  const payload = {
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text: plainText,
    headers: {
      'Reply-To': replyToEmail,
      'List-Unsubscribe': `<mailto:${replyToEmail}>`,
    },
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || data?.error?.message || data?.error || 'Failed to send email';
    throw new Error(`${message} - ${JSON.stringify(data)}`);
  }

  return data;
};