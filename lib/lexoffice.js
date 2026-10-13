/**
 * Kleine Hilfsfunktionen für die Lexware-Office-API (ehemals "Lexoffice").
 * Offizielle Doku: https://developers.lexware.io/docs/
 *
 * WICHTIG ZUR SICHERHEIT:
 * Der API-Schlüssel (LEXOFFICE_API_KEY) darf AUSSCHLIESSLICH als Umgebungsvariable
 * auf dem Server (z. B. in den Vercel-Projekteinstellungen) hinterlegt werden.
 * Er darf niemals im Frontend-Code, im Git-Repository oder in einer Antwort an
 * den Browser auftauchen.
 */

const LEXOFFICE_BASE_URL = 'https://api.lexware.io/v1';

function getApiKey() {
  const key = process.env.LEXOFFICE_API_KEY;
  if (!key) {
    throw new Error('LEXOFFICE_API_KEY ist nicht gesetzt (Umgebungsvariable fehlt).');
  }
  return key;
}

async function lexRequest(path, options = {}) {
  const res = await fetch(`${LEXOFFICE_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    // Antwort war kein JSON (z. B. bei 406/500 manchmal HTML) – roh durchreichen.
  }

  if (!res.ok) {
    const message = json && json.message ? json.message : text || `HTTP ${res.status}`;
    const err = new Error(`Lexoffice-API-Fehler (${res.status}): ${message}`);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }

  return json;
}

/**
 * Sucht einen bestehenden Kontakt per E-Mail-Adresse. Lexoffice erlaubt nur eine
 * Substring-Suche, deshalb wird das Ergebnis zusätzlich auf exakte Übereinstimmung
 * geprüft (case-insensitive).
 */
async function findContactByEmail(email) {
  if (!email || email.length < 3) return null;
  const query = new URLSearchParams({ email });
  const result = await lexRequest(`/contacts?${query.toString()}`);
  const candidates = (result && result.content) || [];
  const normalized = email.trim().toLowerCase();

  for (const contact of candidates) {
    const addresses = (contact.emailAddresses && [
      ...(contact.emailAddresses.business || []),
      ...(contact.emailAddresses.office || []),
      ...(contact.emailAddresses.private || []),
      ...(contact.emailAddresses.other || []),
    ]) || [];
    if (addresses.some((a) => (a || '').trim().toLowerCase() === normalized)) {
      return contact;
    }
  }
  return null;
}

/**
 * Legt einen neuen Lexoffice-Kontakt (Rolle: Kunde) an.
 * customer: { name, email, phone }
 * Es wird immer als "person" angelegt (Einzelperson), da auf der Website kein
 * separates Firmenfeld abgefragt wird. Bei Bedarf hier erweitern.
 */
async function createContact(customer) {
  const nameParts = (customer.name || '').trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() : (nameParts[0] || 'Kunde');
  const firstName = nameParts.join(' ') || undefined;

  const payload = {
    version: 0,
    roles: { customer: {} },
    person: {
      firstName,
      lastName,
    },
  };

  if (customer.email) {
    payload.emailAddresses = { business: [customer.email] };
  }
  if (customer.phone) {
    payload.phoneNumbers = { business: [customer.phone] };
  }

  return lexRequest('/contacts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Findet einen Kontakt per E-Mail oder legt ihn neu an. Gibt die contactId zurück.
 */
async function findOrCreateContactId(customer) {
  const existing = await findContactByEmail(customer.email);
  if (existing && existing.id) return existing.id;
  const created = await createContact(customer);
  return created.id;
}

/**
 * Legt eine neue Rechnung als EDITIERBAREN ENTWURF an (voucherStatus "draft").
 * Wichtig: Ohne finalize=true (bzw. mit finalize=false) bleibt die Rechnung ein
 * Entwurf und wird NICHT an den Kunden verschickt oder als verbindliches Dokument
 * gezählt – genau wie von Nicole gefordert ("Rechnungen müssen im Entwurf bleiben,
 * bis ich sie freigegeben habe"). Die Freigabe/Finalisierung erfolgt bewusst NICHT
 * automatisch durch diesen Code, sondern manuell durch Nicole in der Lexoffice-Oberfläche.
 *
 * lineItems: [{ name, quantity, unitName, netAmount, taxRatePercentage }]
 */
async function createDraftInvoice({ contactId, lineItems, introduction, remark, voucherDate }) {
  const payload = {
    archived: false,
    voucherDate: voucherDate || new Date().toISOString(),
    address: {
      contactId,
    },
    lineItems: lineItems.map((item) => ({
      type: 'custom',
      name: item.name,
      quantity: item.quantity || 1,
      unitName: item.unitName || 'Stück',
      unitPrice: {
        currency: 'EUR',
        netAmount: item.netAmount,
        taxRatePercentage: typeof item.taxRatePercentage === 'number' ? item.taxRatePercentage : 19,
      },
      discountPercentage: 0,
    })),
    totalPrice: { currency: 'EUR' },
    taxConditions: { taxType: 'net' },
    paymentConditions: {
      paymentTermLabel: 'Zahlbar per Vorkasse innerhalb von 7 Tagen ohne Abzug.',
      paymentTermDuration: 7,
    },
    shippingConditions: {
      shippingType: 'service',
      shippingDate: voucherDate || new Date().toISOString(),
    },
    title: 'Rechnung',
    introduction: introduction || 'Vielen Dank für Ihre Buchung bei wohltat.office.',
    remark: remark || 'Zahlung per Vorkasse. Die Leistung wird nach Zahlungseingang terminiert.',
  };

  // Bewusst OHNE ?finalize=true aufrufen -> Rechnung bleibt Entwurf.
  return lexRequest('/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

module.exports = {
  findOrCreateContactId,
  createDraftInvoice,
};
