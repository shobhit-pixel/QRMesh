# ⚡ QRMesh

### **One Scan. Any Action. Zero Servers.**

QRMesh is a privacy-first, offline QR platform that turns QR codes into **actions, contacts, payments, links, and file transfers**.

### 🔥 Experience QRMesh

**Turn data into action — instantly.**

👉 **[Launch the Live App →](https://qrmesh-sepia.vercel.app/)**


```text
              What are you sending?
                       │
              ┌────────┴────────┐
              ▼                 ▼
        🌍 Universal QR     🔗 QRMesh Transfer
              │                 │
        Any QR Scanner     QRMesh Receiver
              │                 │
              └────────┬────────┘
                       ▼
                    Action
```

## ✨ What Makes QRMesh Different?

QRMesh automatically chooses the right format.

| Action                       | Format          |
| ---------------------------- | --------------- |
| 👤 Contact                   | vCard           |
| 🌐 Website                   | URL             |
| 📞 Call                      | `tel:`          |
| 💬 SMS                       | `SMSTO:`        |
| ✉️ Email                     | `mailto:`       |
| 📍 Location                  | `geo:`          |
| 📶 Wi-Fi                     | `WIFI:`         |
| 💳 UPI                       | `upi://`        |
| 📝 Text                      | Plain text      |
| 🖼️ Image / 📄 PDF / 📁 File | QRMesh Transfer |

### 🌍 Universal QR

**If a standard exists, QRMesh uses it.**

No custom wrapper. No QRMesh dependency.

```text
Contact → vCard
Website → https://...
Call    → tel:...
Wi-Fi   → WIFI:...
UPI     → upi://...
```

Scan it with your normal phone camera.

### 🔗 QRMesh Transfer

For files and advanced data, QRMesh uses its **QM2 multi-frame protocol**.

```text
File
 ↓
Compress → Split → QR Frames
 ↓
Scan
 ↓
Reassemble → Verify → Restore
```

**No server. No cloud. No account.**

## 🔐 Privacy First

* 🚫 No server
* 🚫 No account
* 🚫 No cloud storage
* 🚫 No tracking
* 🚫 No analytics
* ✅ Offline device-to-device transfer
* ✅ SHA-256 integrity
* ✅ Optional AES-GCM encryption
* ✅ Confirmation for high-risk actions

## 🧠 Smart Receiver

QRMesh can also recognize QR codes created by other apps:

`vCard` · `URL` · `tel:` · `mailto:` · `geo:` · `WIFI:` · `UPI` · `SMS`

Unknown content → **Text Preview**

> **Scan ≠ Trust.**
> Nothing executes automatically.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Test:

```bash
npm run test
```

## 🛠️ Built With

**React 19 · TypeScript · Vite · Tailwind CSS · qrcode · jsQR · Pako · Web Crypto · Vitest**

---

## 👨‍💻 Developer

### **Shobhit Tripathi**

**Full Stack Developer · AI Developer · B.Tech CSE**

I build **full-stack web applications, AI-powered systems, automation platforms, and modern developer tools** with a focus on practical UX, scalable architecture, and intelligent automation.

**Tech:**
`React` · `TypeScript` · `JavaScript` · `Node.js` · `Express` · `Python` · `FastAPI` · `MongoDB` · `AI/ML` · `RAG` · `LLM Integration`

### 🚀 Areas of Interest

* Full Stack Development
* AI & Agentic Systems
* Automation
* Offline-First Applications
* Modern Web Experiences
* API & System Integration

---

<div align="center">

### ⚡ QRMesh

**Universal when possible. Custom when necessary. Offline by default.**

Built with ❤️ by **Shobhit Tripathi**

</div>
