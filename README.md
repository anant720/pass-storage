# 🛡️ LiquidPass – End-to-End Encrypted Password Manager

A **zero-knowledge**, end-to-end encrypted password vault built with React, Node.js, and MongoDB. Your master password never leaves your browser — all vault data is encrypted client-side before transmission.

> **Zero-Knowledge Architecture**: The server stores only encrypted (ciphertext) data. Even with full database access, vault contents cannot be read without the user's master password.

---

## 🔐 Cybersecurity Features

### End-to-End Encryption (E2E)

| Layer | Technology | Details |
|---|---|---|
| **Key Derivation** | PBKDF2 | 600,000 iterations, SHA-256, salt = username |
| **Encryption** | AES-256-GCM | Authenticated encryption with 12-byte random IV per field |
| **Key Storage** | In-memory only | Key is derived on login, held in browser memory, cleared on logout |
| **Data at Rest** | Base64(IV ‖ ciphertext ‖ authTag) | All vault fields are individually encrypted |

### Authentication & Password Security

- **Bcrypt Hashing** — Account (login) passwords are hashed with bcrypt (cost factor 10) before storage
- **Legacy Migration** — Older plaintext account passwords are automatically upgraded to bcrypt on next login
- **No Password Recovery** — True zero-knowledge means forgotten master passwords result in unrecoverable data (by design)

### Transport & API Security

- **Helmet.js** — Sets secure HTTP headers (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, CSP, etc.)
- **CORS Lockdown** — API only accepts requests from the configured frontend origin
- **Rate Limiting** — Express-rate-limit protects all endpoints (100 requests per 15-minute window per IP)
- **Trust Proxy** — Correctly configured for reverse proxy deployments (Render, Vercel)
- **HTTPS** — Enforced in production via deployment platforms (Render + Vercel)

### Data Integrity & Access Control

- **AES-GCM Authentication Tags** — Every encrypted field includes a cryptographic authentication tag; tampering is detected and rejected
- **Ownership Verification** — All CRUD operations verify `userId` ownership before modifying data
- **Input Validation** — All endpoints validate required fields before processing
- **No Secrets in Code** — Environment variables for all sensitive configuration (MongoDB URI, CORS origins)

### Client-Side Security

- **Web Crypto API** — Uses the browser's built-in cryptographic primitives (no third-party crypto libraries)
- **Key Never Transmitted** — The AES key is derived locally and never sent to the server
- **Memory Cleanup** — Encryption key is explicitly cleared from state on logout
- **Gzip Compression** — Reduces payload size and transmission time

### Cryptographic Design Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
│                                                             │
│  Master Password ──► PBKDF2(600K, SHA-256) ──► AES-256 Key │
│                                                    │        │
│  Vault Item ──► AES-GCM Encrypt (random IV) ──► Ciphertext │
│                                                    │        │
│  Ciphertext ──────────────── HTTPS ──────────────► Server   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js)                        │
│                                                             │
│  Receives opaque Base64 strings ──► Stores in MongoDB       │
│  ❌ Cannot decrypt — no access to master password or key    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧰 Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Lucide Icons |
| Backend | Node.js, Express, Mongoose, bcryptjs |
| Database | MongoDB Atlas |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| Security | Helmet, express-rate-limit, CORS |
| Deployment | Vercel (frontend), Render (backend) |

---

## 📁 Project Structure

```
├── frontend/
│   ├── app.jsx          # Main React application
│   ├── crypto.js        # E2E encryption utilities (AES-GCM + PBKDF2)
│   ├── main.jsx         # React entry point
│   ├── index.html       # HTML template
│   ├── index.css        # Global styles
│   └── vite.config.js   # Vite configuration
│
├── backend/
│   └── server.js        # Express API server
│
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```bash
MONGODB_URI=your-mongodb-atlas-uri
PORT=5000
FRONTEND_URL=http://localhost:5173  # or your production frontend URL
```

### Frontend (`frontend/.env`)

```bash
VITE_API_URL=http://localhost:5000  # or your production backend URL
```

> `.env` files are gitignored and never committed to the repository.

---

## 🚀 Running Locally

```bash
# Terminal 1 — Backend
cd backend
npm install
npm start

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🌐 Production Deployment

| Service | Purpose | URL |
|---|---|---|
| **Vercel** | Frontend (static React build) | Set `VITE_API_URL` in Vercel env vars |
| **Render** | Backend (Node.js API) | Set `MONGODB_URI`, `FRONTEND_URL`, `PORT` in Render env vars |

### Frontend (Vercel)

```bash
cd frontend
npm run build   # outputs to dist/
```

### Backend (Render)

```bash
cd backend
npm start
```

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/signup` | Create new account |
| POST | `/api/auth/login` | Login & fetch encrypted vault |
| PUT | `/api/auth/change-password` | Change master password |
| POST | `/api/passwords` | Add encrypted password item |
| PUT | `/api/passwords/:id` | Update encrypted password item |
| DELETE | `/api/passwords/:id` | Delete password item |

---

## 🔧 Troubleshooting

- **Cannot connect to MongoDB** — Check `MONGODB_URI` and whitelist your IP in MongoDB Atlas Network Access
- **CORS errors** — Ensure `FRONTEND_URL` in backend `.env` exactly matches your frontend origin (including protocol and port)
- **"Invalid credentials" after password change** — The master password was changed; use the new one. Old vault data was re-encrypted automatically
- **Forgot master password** — Data is unrecoverable by design (zero-knowledge E2E encryption)

---

## 📜 License

This project is for educational and personal use.
