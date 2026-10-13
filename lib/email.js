/**
 * Minimaler E-Mail-Versand über Resend (https://resend.com).
 * RESEND_API_KEY und FROM_EMAIL werden als Umgebungsvariablen erwartet.
 * FROM_EMAIL muss auf einer bei Resend verifizierten Domain liegen
 * (siehe README.md, Schritt "E-Mail-Versand einrichten").
 */

async function sendEmail({ to, subject, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!apiKey) throw new Error('RESEND_API_KEY ist nicht gesetzt.');
  if (!from) throw new Error('FROM_EMAIL ist nicht gesetzt.');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`E-Mail-Versand fehlgeschlagen (${res.status}): ${text}`);
  }

  return res.json();
}

module.exports = { sendEmail };
