<div align="center">
  <img src="public/logo.png" alt="Ping! Logo" width="120" height="120" />
  <h1>Ping! — Real-Time Messaging App</h1>
  <p><b>Fast, minimal, and secure messaging built for the modern web.</b></p>

  <p>
    <a href="https://ping-chatapp.netlify.app"><strong>🌐 Live Demo</strong></a> •
    <a href="#key-features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#installation">Getting Started</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Socket.io-4-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Security-E2EE_Encrypted-green?style=for-the-badge&logo=shieldsdotio&logoColor=white" alt="E2EE Security" />
  </p>
</div>

---

## ✨ Key Features

* ⚡ **Instant Messaging:** Real-time bi-directional messaging powered by Socket.IO.
* 🟢 **Dynamic Presence & Status:** Live status tracking (`Online`, `Away`, `Busy`, `Offline`) with real-time sync across clients.
* 📱 **PWA Ready:** Installable directly as a native-like Desktop/Mobile app complete with custom PWA manifest.
* 📷 **Optimistic Uploads:** Instantly render image and media uploads without UI blocking.
* 🔏 **End-to-End Encryption (E2EE):** Private messages are encrypted on the client side before transmission, ensuring maximum privacy and data confidentiality.
* 🔒 **Secure Auth:** JWT-based authentication with persistent user sessions and profile metadata storage.
* 📌 **Pinned Messages & Media:** Pin important conversations, share images, and stream voice notes seamlessly.
* 🎨 **Sleek Dark Mode UI:** Designed with a clean, dark-themed interface tuned for high contrast and readability.


## 🔒 Security & Privacy

* **End-to-End Encryption (E2EE):** All message payloads are encrypted locally on the sender's device using cryptographic keys before sending over Socket.IO, ensuring nobody (not even the server/database) can read raw text messages.
* **Session Protection:** Auth tokens are safely stored with JWT and secure cookie policies to prevent unauthorized session hijacking.
---

## 🛠️ Tech Stack

**Frontend:**
* React (Vite)
* Tailwind CSS
* Lucide Icons / React Icons
* Zustand (State Management)

**Backend & Database:**
* Node.js & Express.js
* Socket.IO (WebSocket Communication)
* MongoDB & Mongoose
* Cloudinary API (Media Asset Management)

**Deployment:**
* **Frontend:** Netlify
* **Backend:** Render

---
