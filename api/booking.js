/**
 * POST /api/booking
 *
 * Nimmt eine verbindliche Buchung von der wohltat.office-Website entgegen und:
 *   1. legt (falls nötig) einen Kontakt in Lexware Office an,
 *   2. legt dort eine Rechnung als ENTWURF an (wird NICHT automatisch verschickt
 *      oder finalisiert – das macht Nicole bewusst manuell in Lexoffice),
 *   3. verschickt eine Bestellbestätigung an den Kunden (ohne Rechnungsdokument),
 *   4. verschickt eine interne Benachrichtigung an Nicole mit allen Details.
 *
 * Erwarteter Request-Body (JSON), vom Frontend aus initBookingForm() gebaut:
 * {
 *   "pageLabel": "Social Media & Website",
 *   "package": { "name": "Standard", "price": 399, "unit": "Monat" },
 *   "addons": [ { "name": "Nachrichten-Beantwortung", "price": 60, "unit": "Monat" } ],
 *   "totals": { "Monat": 459 },
 *   "customer": { "name": "Max Mustermann", "email": "max@example.com", "phone": "0151...", "message": "..." }
 * }
 */

const { findOrCreateContactId, createDraftInvoice } = require('../lib/lexoffice');
const { sendEmail, signatureHtml } = require('../lib/email');

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function eur(value) {
  return (Number(value) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Wandelt vom Kunden eingegebenen Text in sicheren HTML-Text um, bevor er in
// eine E-Mail eingebaut wird (schützt vor eingeschleustem HTML/Links in den
// Formularfeldern – sowohl in der Mail an Nicole als auch an den Kunden).
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setCors(res) {
  // Standardmäßig auf die echte Domain eingeschränkt. Über die Umgebungsvariable
  // ALLOWED_ORIGIN in Vercel kann das bei Bedarf überschrieben werden (siehe
  // README.md, Abschnitt "CORS absichern").
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
    const { pageLabel, package: pkg, addons, totals, customer, address, honeypot } = body || {};

    // Einfacher Spam-Schutz: verstecktes Feld im Formular, das ein Mensch nie ausfüllt.
    if (honeypot) {
      res.status(200).json({ ok: true }); // Bot still "erfolgreich" antworten, aber nichts tun.
      return;
    }

    if (!customer || !customer.name || !customer.name.trim()) {
      res.status(400).json({ ok: false, error: 'Name fehlt.' });
      return;
    }
    if (!isValidEmail(customer.email)) {
      res.status(400).json({ ok: false, error: 'Gültige E-Mail-Adresse fehlt.' });
      return;
    }
    if (!pkg || !pkg.name) {
      res.status(400).json({ ok: false, error: 'Kein Paket ausgewählt.' });
      return;
    }

    // --- Rechnungspositionen aus Paket + Add-ons bauen ---
    const lineItems = [];
    lineItems.push({
      name: `${pageLabel ? pageLabel + ' – ' : ''}${pkg.name}${pkg.unit ? ' (' + pkg.unit + ')' : ''}`,
      quantity: 1,
      unitName: 'Stück',
      netAmount: Number(pkg.price) || 0,
    });
    (addons || []).forEach((addon) => {
      if (!addon || !addon.name || !(Number(addon.price) > 0)) return;
      lineItems.push({
        name: `${addon.name}${addon.unit ? ' (' + addon.unit + ')' : ''}`,
        quantity: 1,
        unitName: 'Stück',
        netAmount: Number(addon.price) || 0,
      });
    });

    const contactId = await findOrCreateContactId({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.firma,
      address,
    });

    const billingName = customer.firma ? `${customer.firma} (${customer.name})` : customer.name;

    const invoice = await createDraftInvoice({
      contactId,
      billingName,
      street: address && address.street,
      zip: address && address.zip,
      city: address && address.city,
      countryCode: (address && address.country) || 'DE',
      lineItems,
      introduction: `Vielen Dank für Ihre Buchung bei wohltat.office – Leistungsbereich: ${pageLabel || pkg.name}.`,
      remark: 'Zahlung per Vorkasse. Diese Rechnung ist ein interner Entwurf und wird erst nach Prüfung durch wohltat.office final verschickt.',
    });

    // --- Bestellbestätigung an den Kunden (OHNE Rechnungsdokument) ---
    const addonLines = (addons || [])
      .filter((a) => a && a.name && Number(a.price) > 0)
      .map((a) => `<li>${esc(a.name)}: ${eur(a.price)}${a.unit ? ' / ' + esc(a.unit) : ''}</li>`)
      .join('');

    const totalsLines = Object.keys(totals || {})
      .map((unit) => `<li><strong>${unit === 'einmalig' ? 'Einmalig' : esc(unit)}:</strong> ${eur(totals[unit])}</li>`)
      .join('');

    await sendEmail({
      to: customer.email,
      subject: 'Ihre Bestellbestätigung – wohltat.office',
      html: `
        <p>Hallo ${esc(customer.name)},</p>
        <p>vielen Dank für Ihre verbindliche Buchung bei wohltat.office. Hier eine Zusammenfassung:</p>
        <ul>
          <li><strong>${esc(pkg.name)}</strong>${pkg.unit ? ' (' + esc(pkg.unit) + ')' : ''}: ${eur(pkg.price)}</li>
          ${addonLines}
        </ul>
        <ul>${totalsLines}</ul>
        ${customer.message ? `<p><strong>Ihre Nachricht:</strong> ${esc(customer.message).replace(/\n/g, '<br>')}</p>` : ''}
        <p>Die Rechnung mit den Zahlungsdetails (Vorkasse) erhalten Sie separat, sobald sie von Nicole Wohlfahrt geprüft und freigegeben wurde.</p>
        <p>Bei Fragen erreichen Sie uns jederzeit unter info@wohltatoffice.de oder per WhatsApp.</p>
        <p>Herzliche Grüße</p>
        ${signatureHtml()}
      `,
    });

    // --- Interne Benachrichtigung an Nicole ---
    await sendEmail({
      to: process.env.NOTIFY_EMAIL || 'info@wohltatoffice.de',
      subject: `Neue verbindliche Buchung: ${esc(pkg.name)} (${esc(customer.name)})`,
      replyTo: customer.email,
      html: `
        <p>Neue Buchung über die Website:</p>
        <ul>
          <li><strong>Bereich:</strong> ${esc(pageLabel) || '–'}</li>
          <li><strong>Paket:</strong> ${esc(pkg.name)} – ${eur(pkg.price)}${pkg.unit ? ' / ' + esc(pkg.unit) : ''}</li>
          ${addonLines}
        </ul>
        <ul>${totalsLines}</ul>
        <p><strong>Kunde:</strong> ${esc(customer.name)} · ${esc(customer.email)}${customer.phone ? ' · ' + esc(customer.phone) : ''}</p>
        ${customer.message ? `<p><strong>Nachricht:</strong> ${esc(customer.message).replace(/\n/g, '<br>')}</p>` : ''}
        <p><strong>Lexoffice-Entwurfsrechnung angelegt</strong> (Rechnungs-ID: ${esc(invoice.id)}). Die Rechnung liegt als Entwurf vor und wurde noch NICHT an den Kunden verschickt. Bitte in Lexoffice unter „Rechnungen → Entwürfe“ prüfen, ggf. anpassen und freigeben.</p>
      `,
    });

    res.status(200).json({ ok: true, invoiceId: invoice.id });
  } catch (err) {
    console.error('Booking-Fehler:', err);
    res.status(500).json({ ok: false, error: 'Die Buchung konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.' });
  }
};
