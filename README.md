# QRMesh

**Universal QR Action & Offline Data Transfer Platform**

QRMesh generates two different kinds of QR codes, and automatically picks the right one for each action:

```text
Can this action be represented as a standard, interoperable QR format?
        │
       YES → Universal QR (raw vCard / tel: / mailto: / geo: / WIFI: / upi:// / plain URL / plain text)
              Readable by any standard camera or QR scanner — QRMesh not required on the other device.
        │
       NO  → QRMesh Transfer (QM2 multi-frame protocol)
              Requires the QRMesh Receiver — used for images, audio, files, PDFs, and multi-action bundles.
```

There is no server, no account, and no network connection required after the page has loaded once.

```text
Device A screen  ↔  QR codes  ↔  Device B camera
```

## Universal QR

For actions with an established interoperable standard, the QR contains **only** that standard payload — no QRMesh wrapper, no JSON, no `QM2` prefix. Any phone camera, Google Lens, or third-party QR app can read it and hand it to the OS's native handler.

| Action | Standard format | Example |
|---|---|---|
| Contact | vCard 3.0 | `BEGIN:VCARD` … `END:VCARD` |
| Business Card | vCard 3.0 | `BEGIN:VCARD` … `END:VCARD` |
| Website | HTTP/HTTPS | `https://example.com` |
| Call | `tel:` | `tel:+911234567890` |
| SMS | `SMSTO:` | `SMSTO:+911234567890:Hello` |
| Email | `mailto:` | `mailto:a@b.com?subject=Hi` |
| Location | `geo:` | `geo:23.0225,72.5714` |
| Wi-Fi | `WIFI:` | `WIFI:T:WPA;S:MyNet;P:pass;;` |
| Payment Request | `upi://pay` (only when a UPI ID is given) | `upi://pay?pa=x@bank&am=500` |
| Text | Plain text | `Hello from QRMesh` |

What happens **after** a standard scanner reads the code — whether it opens a native "add contact" screen, a dialer, a browser — is controlled entirely by the scanning device's OS/app, not by QRMesh. This is platform dependent and QRMesh cannot force or simulate that native behavior.

## QRMesh Transfer

Everything else uses QRMesh's own versioned, checksummed, multi-frame protocol and requires the QRMesh Receiver on the other device:

| Action | Why |
|---|---|
| Image / Audio / File / PDF | Binary data — no compact standard QR representation |
| Calendar Event / Reminder | No universally-scanner-recognized calendar QR convention (unlike vCard/WIFI/tel/geo) — kept honest rather than inventing one |
| Event Ticket / Digital ID | Structured, potentially large fields; no backend exists to host a verification URL (this app is intentionally server-less) |
| Payment Request without a UPI ID | A bare amount/reference has no standard representation |
| Form Data / Clipboard / Configuration / Settings | App-specific structured data |
| App Link / Device Pairing / Authorization | Require confirmation flows standard QR scanners can't provide |
| Multi Action | Bundles several actions into one package |

## Contact — the important one

Scanning a QRMesh **Universal Contact QR** with a normal camera produces the best case a standard vCard allows:

```text
Camera → Contact detected → native Contact Details/Import screen → user saves
```

QRMesh cannot force this — some scanner apps insert their own "Add Contact" button, and that step is controlled by the OS/scanner, not QRMesh. What QRMesh guarantees on its side: the QR contains a real, correctly-escaped **vCard 3.0** payload with no wrapper around it, so the native path is as short as the platform allows. The photo is deliberately left out of the Universal QR (a full photo makes the code too dense to scan reliably) — the Enhanced/QRMesh-transferred Contact can carry a photo instead.

Scanning the same vCard — universal or QRMesh-enhanced — **with the QRMesh Receiver** skips the OS entirely and goes straight to a details preview:

```text
Scan → Contact Details Preview (name, phone, email, company, address, photo if present) → [Save Contact] / [Cancel]
```

Tapping **Save Contact** uses the Web Share API where available — on Android/iOS this opens the native "Open with"/share sheet straight into Contacts. Where Web Share isn't supported, it falls back to downloading a `.vcf` file. It is never shown as "Saved!" unless a save mechanism actually ran.

QRMesh's receiver also recognizes standard QR codes it didn't generate — vCard, URL, `tel:`, `mailto:`, `geo:`, `WIFI:`, `upi://`, `SMSTO:`/`sms:` — and shows the matching preview, making it a general-purpose QR reader as well as a QRMesh receiver. Unrecognized content falls back to a Text preview; nothing is ever executed just because it was scanned.

## Security model

- Received data is always validated (shape, protocol version, expiry, checksum) before it's shown, and again before it's acted on.
- Dangerous URL schemes (`javascript:`, `data:`, `vbscript:`, `file:`) are rejected wherever a scanned value could become a clickable link or navigation target — this includes the standard URL action, Business Card website links, and App Link's deep link and fallback URL.
- `mailto:` recipients are sanitized against CRLF/header injection (e.g. an untrusted `to` field can't inject an extra `bcc=`).
- Configuration transfers refuse to export fields that look like secrets (`key`, `token`, `password`, `secret`, `credential`, etc.).
- Optional AES-GCM encryption (Web Crypto, PBKDF2-derived key) is available for sensitive QRMesh payloads; SHA-256 integrity checking is applied to every QM2 payload.
- Chunk counts and compressed-payload sizes are capped (consistently, across both the legacy and QM2 transports) to bound memory/CPU use against a hostile or malformed QR sequence.
- Every HIGH-risk action (Call, SMS, Email, Payment, App Link, Authorization, Device Pairing) requires explicit user confirmation — nothing dangerous ever executes from a scan alone.
- Device Pairing and Authorization are honest about the one-way screen→camera channel: QRMesh never displays "Paired!" or "Approved!" unless that state is actually verified — there's no channel back to the sending device to confirm it.

## Offline / privacy

- No server required, no account required, no cloud storage.
- Transfers happen entirely device-to-device via the camera/screen.
- History and settings live only in this browser's local storage; "Clear transfer history" removes them. History stores metadata only (type, direction, timestamp, status, size) — never full payload contents.
- No analytics or telemetry.

## Known browser/OS limitations (by design, not bugs)

- **Wi-Fi**: no browser/QR standard can force a device to silently join a network. The receiver shows the SSID/password and a copy button; you connect via your OS's Wi-Fi settings.
- **Contacts**: see the Contact section above — QRMesh optimizes for the shortest native path but does not and cannot bypass OS/scanner UI.
- **Reminders**: no native reminder API. Falls back to a downloadable `.ics` calendar file.
- **Call / SMS / Email**: opens your device's dialer / messaging app / mail client pre-filled — nothing is sent or dialed automatically. States are always described precisely: *Generated*, *Detected*, *Opened*, *Requested* — never *Completed* or *Sent* unless it actually was.
- **Payment**: QRMesh only *generates a payment request* and opens a UPI app to review — it never handles a PIN, OTP, or credential, and never claims a payment completed.
- **App Link**: only opens an app via its declared deep link after you confirm, and only if the link uses a safe, explicit scheme.
- **Digital ID**: self-declared and unverified. Explicitly labeled as such — not government or official identity verification.

## Development

```bash
npm install       # install dependencies
npm run dev       # start the dev server (http://localhost:3000)
npm run build     # production build
npm run lint      # TypeScript type-check (tsc --noEmit)
npm run test      # run the automated test suite (vitest)
```

## Testing

`npm run test` runs an automated suite covering:

- QM2 protocol packetize/reassemble round trips (out-of-order packets, duplicates, corruption detection, DoS-guard rejections, expiry, malformed/invalid JSON, invalid protocol version)
- A **real** QR round trip: rendering an actual PNG with the `qrcode` library and decoding it with `jsqr` (the same libraries the app uses), including Unicode text
- Round trips for every Universal QR standard format: `tel:`, `SMSTO:`/`sms:`, `mailto:`, `geo:`, `WIFI:`, `upi://pay`, plain URL, and vCard 3.0 — including malformed/invalid input for each (bad coordinates, missing SSID, non-finite payment amounts, garbage strings)
- vCard escaping/unescaping round trips for structural characters (`,` `;` `\` newline) and multi-script Unicode (Gujarati, Hindi, Chinese, Japanese)
- The receiver's standard-format auto-detector, including its fallback-to-Text behavior for unrecognized content
- Action-registry validation rules for every action type
- Security regression tests for the specific vulnerabilities found during review: App Link `javascript:`/`data:`/`vbscript:`/`file:` scheme injection, mailto CRLF/header injection, and Configuration secret-field export

### Known limitation

This suite runs in Node and cannot exercise `getUserMedia`/camera permissions or a physical second device. The QR-image round trip above validates the actual encode→pixels→decode pipeline, but a live phone-camera-to-screen test (including real Android/iOS native contact-import behavior) has not been performed in this environment.
