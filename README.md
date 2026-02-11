# LiquidPass – Password Manager (React + Vite + Node + MongoDB)

Modern glassmorphism-style password manager with:

- React + Vite + Tailwind UI
- Node.js / Express API
- MongoDB (Atlas or local)
- Bcrypt-hashed **account** passwords

> Note: Vault (site) passwords are currently stored in readable form so they can be displayed/copied in the UI. In a real production system, you would encrypt those with a key (not just hash them) so they can be decrypted only on demand.

---

## Stack

- **Frontend**: React 18, Vite, TailwindCSS, lucide-react icons
- **Backend**: Node.js, Express, Mongoose, bcryptjs, helmet, express-rate-limit
- **Database**: MongoDB (Atlas recommended)

---

## Environment variables

Create a `.env` file in the project root (next to `package.json`) with at least:

```bash
MONGODB_URI=your-mongodb-uri-here
PORT=5000
VITE_API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

Example MongoDB Atlas URI (with password URL‑encoded):

```bash
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD_ENCODED@YOUR_CLUSTER.mongodb.net/liquidpass?retryWrites=true&w=majority&appName=liquidpass
```

Make sure MongoDB is reachable from where you run the server.

---

## Installation

From the project folder:

```bash
npm install
```

This installs both frontend and backend dependencies.

---

## Running in development

1. **Start the backend API** (port `5000` by default):

```bash
npm run server
```

2. In a **second terminal**, start the React dev server (port `5173`):

```bash
npm run dev
```

3. Open the URL printed by Vite (usually `http://localhost:5173`).

You can now sign up, log in, and store passwords backed by MongoDB.

---

## Production notes

- **Account passwords** (for logging into LiquidPass) are stored as **bcrypt hashes**.
- **Existing legacy users** (created before bcrypt) are automatically upgraded to bcrypt on first successful login.
- **Vault passwords** (for websites/apps) are stored as plain text so they can be shown/copied.
  - For a real production deployment, you should:
    - Encrypt these passwords with a strong key (e.g., AES via Node `crypto`).
    - Store the encryption key in a secure secret store (not in the repo).

Backend hardening already included:

- `helmet` for secure HTTP headers.
- `express-rate-limit` to limit repeated requests (basic anti‑abuse).
- CORS restricted to `FRONTEND_URL` from `.env` (falls back to `http://localhost:5173`).

---

## Building the frontend

To produce an optimized production build of the React app:

```bash
npm run build
```

This outputs static assets into `dist/`. You can deploy those to any static host (Netlify, Vercel, S3, etc.).

The Node/Express API (`server.js`) can be deployed to services like Render, Railway, Fly.io, or a VPS. Set the same environment variables there (`MONGODB_URI`, `PORT`, `FRONTEND_URL`) and run:

```bash
npm start
```

---

## Quick troubleshooting

- **Cannot connect to MongoDB**: Check `MONGODB_URI` and allow your server IP in MongoDB Atlas Network Access.
- **CORS errors in browser**: Make sure `FRONTEND_URL` in `.env` matches the exact origin of your frontend (including `http/https` and port).
- **Invalid credentials for an old account**: After the bcrypt upgrade code, the *first* login with the correct password will migrate it to a hash; make sure the backend was restarted after code changes.

