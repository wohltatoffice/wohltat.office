/**
 * POST /api/contact
 *
 * Für die unverbindlichen Formulare (Kontakt-Seite, Kombi-Anfrage): verschickt
 * einfach eine E-Mail an Nicole, legt aber KEINE Lexoffice-Rechnung an.
 */

const { sendEmail } = require('../lib/email');

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function setCors(res) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Nur POST erlaubt.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      res.status(400).json({ ok: false, error: 'Ungültiges JSON.' });
      return;
    }
  }

  try {
    const { name, email, phone, message, source, honeypot } = body || {};

    if (honeypot) {
      res.status(200).json({ ok: true });
      return;
    }
    if (!name || !name.trim()) {
      res.status(400).json({ ok: false, error: 'Name fehlt.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ ok: false, error: 'Gültige E-Mail-Adresse fehlt.' });
      return;
    }

    await sendEmail({
      to: process.env.NOTIFY_EMAIL || 'info@wohltatoffice.de',
      subject: `Neue Anfrage über die Website${source ? ' – ' + source : ''}`,
      replyTo: email,
      html: `
        <p><strong>Von:</strong> ${name} · ${email}${phone ? ' · ' + phone : ''}</p>
        ${source ? `<p><strong>Quelle:</strong> ${source}</p>` : ''}
        <p><strong>Nachricht:</strong><br>${(message || '').replace(/\n/g, '<br>')}</p>
      `,
    });

    await sendEmail({
      to: email,
      subject: 'Ihre Anfrage bei wohltat.office',
      html: `
        <p>Hallo ${name},</p>
        <p>vielen Dank für Ihre Nachricht – ich melde mich so schnell wie möglich persönlich bei Ihnen zurück.</p>
        <p>Herzliche Grüße<br>Nicole Wohlfahrt – wohltat.office</p>
      `,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Kontakt-Fehler:', err);
    res.status(500).json({ ok: false, error: 'Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie direkt an info@wohltatoffice.de.' });
  }
};
