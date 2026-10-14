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

/**
 * Offizielle E-Mail-Signatur von Nicole Wohlfahrt (inkl. Logo), die an die
 * Kunden-E-Mails (Bestätigungen) angehängt wird. Das Logo liegt als eigene
 * Bild-Datei im selben Vercel-Projekt (email-logo.png) und wird daher per
 * fester Website-URL eingebunden, damit es in möglichst vielen E-Mail-
 * Programmen (inkl. Outlook) zuverlässig angezeigt wird.
 */
function signatureHtml() {
  const siteUrl = 'https://www.wohltatoffice.de';
  const link = (href, label) =>
    `<a href="${href}" style="color:#2a6469; text-decoration:none;">${label}</a>`;

  return `
    <table cellpadding="0" cellspacing="0" style="margin-top:30px; border-top:1px solid #e4dccb; padding-top:22px; font-family:Arial, Helvetica, sans-serif;">
      <tr>
        <td style="padding-bottom:14px;">
          <img src="${siteUrl}/email-logo.png" width="170" alt="wohltat.office" style="display:block; border:0;">
        </td>
      </tr>
      <tr>
        <td style="font-size:13px; line-height:1.6; color:#333333;">
          <strong style="font-size:14px; color:#1b4448;">Nicole Wohlfahrt</strong><br>
          Inhaberin<br><br>
          <strong>wohltat.office</strong><br>
          Am Ockenheimer Graben 54<br>
          55411 Bingen am Rhein<br>
          Germany<br><br>
          Tel: ${link('tel:+4917623563253', '+49 (0)176–23563253')}<br>
          Fax: 06722-9443365<br>
          Email: ${link('mailto:info@wohltatoffice.de', 'info@wohltatoffice.de')}<br>
          Web: ${link(siteUrl, 'www.wohltatoffice.de')}<br>
          WhatsApp: ${link('https://wa.me/4917623563253', '+49 (0)176-23563253')}<br>
          Instagram: ${link('https://instagram.com/wohltat.office', 'wohltat.office')}<br>
          Facebook: ${link('https://facebook.com/Wohltat.office', 'Wohltat.office')}
        </td>
      </tr>
      <tr>
        <td style="padding-top:16px; font-size:11px; color:#8a938d; font-family:Arial, Helvetica, sans-serif;">
          SAVE PAPER – THINK BEFORE YOU PRINT
        </td>
      </tr>
      <tr>
        <td style="padding-top:12px; font-size:10px; line-height:1.6; color:#aaaaaa; font-family:Arial, Helvetica, sans-serif;">
          Diese Nachricht und alle Anhänge sind vertraulich zu behandeln. Wenn Sie diese Nachricht empfangen, obwohl Sie nicht der beabsichtigte Adressat sind, kontaktieren Sie bitte den Absender und löschen Sie die Nachricht und deren Anhänge vollständig aus Ihrem System. In diesem Fall dürfen Sie erhaltene Informationen nicht an Dritte weitergeben.
          <br><br>
          This message and all attachments thereto must be treated confidentially. If you receive this message although you are not the intended recipient, please contact the sender and delete the message and its attachments completely from your system. In such an event you are prohibited from disclosing any of the information received to third parties.
        </td>
      </tr>
    </table>
  `;
}

module.exports = { sendEmail, signatureHtml };
