/**
 * POST /api/contact
 *
 * Für die unverbindlichen Formulare (Kontakt-Seite, Kombi-Anfrage): verschickt
 * einfach eine E-Mail an Nicole, legt aber KEINE Lexoffice-Rechnung an.
 */

const { sendEmail, signatureHtml } = require('../lib/email');

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Wandelt vom Kunden eingegebenen Text in sicheren HTML-Text um, bevor er in
// eine E-Mail eingebaut wird (schützt vor eingeschleustem HTML/Links in den
// Formularfeldern).
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setCors(res) {
  // Standardmäßig auf die echte Domain eingeschränkt. Über die Umgebungsvariable
  // ALLOWED_ORIGIN in Vercel kann das bei Bedarf überschrieben werden.
  const origin = process.env.ALLOWED_ORIGIN || 'https://www.wohltatoffice.de';
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
      subject: `Neue Anfrage über die Website${source ? ' – ' + esc(source) : ''}`,
      replyTo: email,
      html: `
        <p><strong>Von:</strong> ${esc(name)} · ${esc(email)}${phone ? ' · ' + esc(phone) : ''}</p>
        ${source ? `<p><strong>Quelle:</strong> ${esc(source)}</p>` : ''}
        <p><strong>Nachricht:</strong><br>${esc(message || '').replace(/\n/g, '<br>')}</p>
      `,
    });

    const summaryBlock = (message || '').trim()
      ? `
        <p><strong>Zusammenfassung Ihrer Anfrage:</strong></p>
        <p style="background:#f6f3ea; border-radius:8px; padding:14px 16px;">${esc(message).replace(/\n/g, '<br>')}</p>
      `
      : '';

    await sendEmail({
      to: email,
      subject: 'Ihre Anfrage bei wohltat.office',
      html: `
        <p>Hallo ${esc(name)},</p>
        <p>vielen Dank für Ihre Nachricht – ich melde mich so schnell wie möglich persönlich bei Ihnen zurück.</p>
        ${summaryBlock}
        <p>Herzliche Grüße</p>
        ${signatureHtml()}
      `,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Kontakt-Fehler:', err);
    res.status(500).json({ ok: false, error: 'Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie direkt an info@wohltatoffice.de.' });
  }
};
