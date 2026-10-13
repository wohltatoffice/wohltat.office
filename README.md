# wohltat.office – komplettes Deployment (Website + Buchungs-Backend)

Dieser Ordner enthält die **komplette, fertige Website** (`index.html`) und das
**Buchungs-Backend** (`api/`, `lib/`) in einem einzigen Projekt. Beides zusammen
auf **Vercel** hochladen – dann läuft alles unter derselben Adresse, und die
Buchungsformulare funktionieren ohne weitere Einstellungen.

Du brauchst dafür keine Programmierkenntnisse – nur etwas Geduld beim
Durchklicken. Die Schritte 1–5 machst du einmalig; danach läuft die Seite.

---

## Schritt 1 – Vercel-Konto anlegen

1. Auf <https://vercel.com> gehen und kostenlos registrieren (am einfachsten
   mit einem GitHub-, GitLab- oder E-Mail-Login).
2. Der kostenlose „Hobby“-Plan reicht für diese Website völlig aus.

## Schritt 2 – Dieses Projekt hochladen

Es gibt zwei Wege – nimm den, der dir leichter fällt:

**Variante A – per Drag & Drop über die Vercel-Website (einfachster Weg ohne Technik-Vorkenntnisse):**

1. Im Vercel-Dashboard auf „Add New…“ → „Project“ klicken.
2. Vercel bietet meist „Import Git Repository“ an – stattdessen unten nach
   „Deploy without Git“ bzw. der Möglichkeit suchen, einen Ordner per Drag &
   Drop hochzuladen (Vercel nennt das teils „Upload“ im CLI-Flow, siehe
   Variante B, falls die Weboberfläche gerade keinen Datei-Upload anbietet).

**Variante B – mit der Vercel-Kommandozeile (etwas technischer, aber zuverlässig):**

1. Node.js installieren, falls noch nicht vorhanden: <https://nodejs.org>
   (einfach die „LTS“-Version herunterladen und installieren).
2. Ein Terminal öffnen (Mac: „Terminal“-App, Windows: „Eingabeaufforderung“
   oder „PowerShell“) und eingeben:
   ```
   npm i -g vercel
   ```
3. In diesen Ordner wechseln (den Ordnerpfad anpassen):
   ```
   cd Pfad/zu/diesem/Ordner
   ```
4. Dann:
   ```
   vercel
   ```
   Den Anweisungen folgen (bei der Anmeldung öffnet sich der Browser). Bei
   der Frage nach dem Projektnamen reicht die Standardvorgabe oder z. B.
   `wohltat-office`. Bei „Link to existing project?“ → Nein, neues Projekt.
5. Nach dem ersten Deploy zusätzlich:
   ```
   vercel --prod
   ```
   damit die Seite auch als „Produktions“-Version läuft (nicht nur als
   Vorschau).

Falls dir beides zu viel ist: Schick mir einfach kurz Bescheid, ich kann dich
auch Schritt für Schritt live durchleiten, oder du gibst mir Zugriff auf ein
leeres Vercel-Projekt, dann übernehme ich den Upload.

## Schritt 3 – API-Schlüssel eintragen (Environment Variables)

Das ist der wichtigste Schritt – ohne ihn bleiben die Buchungsformulare im
„Kontakt uns bitte direkt“-Modus.

1. Im Vercel-Dashboard dein Projekt öffnen → „Settings“ → „Environment
   Variables“.
2. Folgende Werte eintragen (siehe auch `.env.example` in diesem Ordner als
   Vorlage – dort **nicht** die echten Werte eintragen, diese Datei ist nur
   eine Vorlage/Erinnerung):

   | Name | Wert |
   |---|---|
   | `LEXOFFICE_API_KEY` | dein API-Schlüssel aus Lexoffice (siehe unten) |
   | `RESEND_API_KEY` | dein API-Schlüssel aus Resend (siehe unten) |
   | `FROM_EMAIL` | z. B. `wohltat.office <buchung@wohltatoffice.de>` |
   | `NOTIFY_EMAIL` | `info@wohltatoffice.de` |
   | `ALLOWED_ORIGIN` | `https://www.wohltatoffice.de` |

   **Lexoffice-Schlüssel erstellen:** In Lexoffice einloggen
   (<https://app.lexware.de>) → „Einstellungen → API-Anbindungen“ bzw.
   „Öffentliche API“ (<https://app.lexware.de/addons/public-api>) → neuen
   Schlüssel erstellen.

   **Resend-Schlüssel erstellen** (für den automatischen E-Mail-Versand):
   Kostenloses Konto auf <https://resend.com> anlegen → unter „Domains“
   `wohltatoffice.de` hinzufügen und die angezeigten DNS-Einträge (SPF/DKIM)
   bei United Domains eintragen (siehe Schritt 4 – das sind zusätzliche,
   andere Einträge als die für die eigentliche Website) → unter „API Keys“
   einen Schlüssel erstellen.

3. Nach dem Eintragen der Variablen: Im Vercel-Dashboard unter
   „Deployments“ beim neuesten Deployment auf die drei Punkte → „Redeploy“
   klicken, damit die neuen Werte übernommen werden.

## Schritt 4 – Domain www.wohltatoffice.de verbinden (bei United Domains)

1. Im Vercel-Projekt zu „Settings“ → „Domains“ gehen und `wohltatoffice.de`
   sowie `www.wohltatoffice.de` eintragen (beides hinzufügen, Vercel leitet
   meist automatisch zwischen beiden weiter).
2. Vercel zeigt dir danach konkrete DNS-Einträge an, typischerweise:
   - Für die „nackte“ Domain (`wohltatoffice.de`): ein **A-Record** auf
     `76.76.21.21`
   - Für `www.wohltatoffice.de`: ein **CNAME-Record** auf
     `cname.vercel-dns.com`

   (Vercel kann die genauen Werte zum Zeitpunkt deines Setups leicht anders
   anzeigen – immer die Werte nehmen, die **in deinem Vercel-Dashboard**
   stehen, nicht blind diese hier abtippen.)
3. Bei **United Domains** einloggen (<https://www.united-domains.de>) →
   „Domains“ → `wohltatoffice.de` auswählen → „DNS“ bzw.
   „Nameserver/DNS-Einstellungen“ öffnen.
4. Dort die von Vercel angezeigten Einträge eintragen bzw. bestehende
   Jimdo-Einträge für `@` (bzw. `wohltatoffice.de`) und `www` entsprechend
   ersetzen. Falls United Domains für die Haupt-Domain kein „A-Record“,
   sondern nur „ALIAS“ oder „ANAME“ anbietet – das ist dasselbe Prinzip,
   dann dort die Vercel-Zieladresse eintragen, die im Dashboard steht.
5. Speichern. Die Umstellung dauert meist wenige Minuten, kann in seltenen
   Fällen aber bis zu 24 Stunden dauern (DNS-Ausbreitung weltweit).
6. Vercel zeigt in „Settings → Domains“ ein grünes Häkchen, sobald die
   Domain erfolgreich erkannt und ein kostenloses SSL-Zertifikat (https)
   automatisch ausgestellt wurde.

**Wichtig:** Solange die alte Jimdo-Seite noch unter derselben Domain läuft,
überschneiden sich die DNS-Einträge nicht automatisch – erst wenn du die
DNS-Einträge bei United Domains auf Vercel umstellst, wird die neue Seite
sichtbar und die alte Jimdo-Seite ist nicht mehr erreichbar. Am besten also
erst alles wie unten in Schritt 5 testen (über die `*.vercel.app`-Adresse,
die Vercel dir vor der Domain-Umstellung schon gibt), bevor du die Domain
umhängst.

## Schritt 5 – Testen, bevor es „scharf“ ist

1. Vercel gibt dir sofort nach dem Deployment eine Test-Adresse wie
   `https://wohltat-office.vercel.app` – die funktioniert bereits identisch
   zur späteren Domain und eignet sich perfekt zum Testen, **bevor** du bei
   United Domains irgendetwas umstellst.
2. Auf dieser Test-Adresse einmal eine Test-Buchung abschicken (am besten
   mit deiner eigenen E-Mail-Adresse), einmal „Verbindlich bestellen“ und
   einmal „Unverbindlich anfragen“ durchspielen.
3. Prüfen: Kommt die Bestellbestätigung per E-Mail an? Kommt die interne
   Benachrichtigung bei dir an? Taucht in Lexoffice unter
   „Rechnungen → Entwürfe“ eine neue Entwurfsrechnung mit den richtigen
   Positionen auf?
4. Erst wenn das alles funktioniert: Domain wie in Schritt 4 beschrieben bei
   United Domains umstellen.
5. Falls etwas nicht funktioniert: Im Vercel-Dashboard unter
   „Deployments → (Deployment auswählen) → Logs“ nachsehen, ob dort eine
   Fehlermeldung steht, und mir die Meldung schicken – das lässt sich dann
   gezielt nachbessern.

## Danach: alte Jimdo-Seite abschalten/kündigen

Erst wenn die neue Seite unter `www.wohltatoffice.de` zuverlässig läuft,
den Jimdo-Vertrag kündigen bzw. die alte Seite deaktivieren – nicht vorher,
damit es keine Lücke gibt, in der die Domain auf „nichts“ zeigt.

---

## Rechtlicher Hinweis (kein Rechtsrat)

Impressum, Datenschutzerklärung, AGB und Widerrufsrecht sind bereits mit
Inhalten gefüllt (siehe Footer der Website). Die Datenschutzerklärung wurde
für die neue technische Infrastruktur angepasst, und die
Widerrufsrecht-Seite basiert auf der B2B-Klausel der AGB, da die ursprüngliche
Widerrufsbelehrung der alten Seite nicht mehr abrufbar war. Vor dem
Livegang empfiehlt sich eine kurze anwaltliche Prüfung dieser beiden Seiten
sowie der in §9 AGB ergänzten Vorkasse-Regelung – siehe Chat-Hinweis dazu.
Ich bin kein Rechtsanwalt, dies ist keine Rechtsberatung.

---

## Technische Details

- `index.html` – die komplette Website (ein einziges, in sich
  geschlossenes HTML-Dokument inkl. aller Bilder als eingebettete Daten).
  Frontend ruft `/api/booking` bzw. `/api/contact` als **relative** Pfade
  auf, funktioniert also automatisch, sobald beides im selben
  Vercel-Projekt liegt – keine URL muss manuell eingetragen werden.
- `api/booking.js` – nimmt verbindliche Buchungen entgegen, legt in
  Lexware Office einen Kontakt + eine Rechnung **als Entwurf** an
  (nie automatisch finalisiert/verschickt), verschickt
  Bestätigungs- und Benachrichtigungs-E-Mails.
- `api/contact.js` – einfache Kontakt-/Anfrage-E-Mail ohne Lexoffice.
- `lib/lexoffice.js` / `lib/email.js` – dünne Wrapper um die
  Lexware-Office- bzw. Resend-API.
- Kein Build-Schritt nötig, reines Node.js (Vercel erkennt `api/*.js`
  automatisch als Serverless Functions).
- Einfacher Spam-Schutz über ein unsichtbares Honeypot-Feld ist im
  Frontend bereits eingebaut.
