# StageFront Events — Production Codebase

Premium live event management and ticket reservation platform built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS**, **Express.js**, and **Firebase Authentication & Firestore**.

---

## ⚡ Quick Start in VS Code

### 1. Prerequisites
- **Node.js** 18.0 or later (v20+ recommended). Download from [nodejs.org](https://nodejs.org).
- **npm** 9.0 or later (comes bundled with Node.js).
- **VS Code** (Visual Studio Code).

---

### 2. Open the Project
1. Extract the downloaded zip file (`stagefront-production.zip`).
2. Open **VS Code**.
3. Click **File > Open Folder...** (or run `code .` in your terminal inside the extracted directory).

---

### 3. Install Dependencies
Open the integrated terminal in VS Code (`Ctrl + ~` on Windows/Linux or `Cmd + ~` on macOS) and run:

```bash
npm install
```

---

### 4. Configure Environment Variables
Copy `.env.example` to create your local `.env` file:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On macOS / Linux:**
```bash
cp .env.example .env
```

Your `.env` file is already pre-configured with your Firebase project credentials:
```env
PORT=3000
APP_URL="http://localhost:3000"

# Firebase Web Client SDK Configuration (stagefront-events)
VITE_FIREBASE_API_KEY="AIzaSyD2m_yIhihSkt9e1oqdVHo2O7e0zX2eaw4"
VITE_FIREBASE_AUTH_DOMAIN="stagefront-events.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="stagefront-events"
VITE_FIREBASE_STORAGE_BUCKET="stagefront-events.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="220143378300"
VITE_FIREBASE_APP_ID="1:220143378300:web:81ff24ce4e8498cb524ef9"
VITE_FIREBASE_MEASUREMENT_ID="G-3ZHTEE345X"

# Server-Side Admin Authorization (Comma-separated authorized admin emails)
ADMIN_EMAILS="gvajaykumar125@gmail.com,admin@stagefront.com"
```

---

### 5. Run the Application in Development Mode

Run the unified full-stack server (runs Express API backend + Vite client on port 3000):

```bash
npm run dev
```

You should see:
```text
[StageFront] Express full-stack server running on http://0.0.0.0:3000
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### 6. VS Code Debugging (F5)
You can also launch and debug directly within VS Code:
1. Open the **Run and Debug** view (`Ctrl + Shift + D` or `Cmd + Shift + D`).
2. Select **StageFront: Full Stack Dev Server (Port 3000)**.
3. Press **F5** or click the green Play button.
4. Set breakpoints anywhere in `server.ts` or `src/`!

---

### 7. Production Build & Execution

To test the optimized production build:

```bash
# 1. Build the Vite production bundle:
npm run build

# 2. Run the production Express server:
npm start
```

Then visit **http://localhost:3000**.

---

## 🛡️ Admin Access & Features

- **Administrator Email:** `gvajaykumar125@gmail.com`
- **Protected Admin Console:** Located at the `/admin` navigation link in the top bar.
- **Admin Capabilities:**
  - Create new live events with category, venue, dates, pricing, capacity, and seat layout.
  - Edit existing event details and pricing in real time.
  - In-app safe deletion modal for live events and seat inventory.
  - Live seat tier capacity tracking & booking audits.
- **Customer Booking Flow:**
  - Interactive SVG stadium seat map with real-time selection.
  - 10-minute hold reservation with countdown timer.
  - Two-phase confirmed checkout with downloadable tickets.

---

## 📁 Project Architecture

```
.
├── .vscode/               # VS Code debugging & task configurations
│   ├── launch.json        # F5 launch configuration
│   ├── settings.json      # Workspace settings & TypeScript config
│   └── tasks.json         # Build & dev tasks
├── public/                # Static assets & public downloads
├── src/
│   ├── components/        # React UI components
│   │   ├── admin/         # Admin dashboard, event forms, deletion modals
│   │   ├── auth/          # Firebase Auth modals (Sign In, Register)
│   │   ├── booking/       # Interactive seat maps, checkout, tickets
│   │   └── common/        # Headers, navigation, notifications
│   ├── data/              # Initial seed events & venue seat templates
│   ├── hooks/             # useAuth, useEvents, useBookings custom hooks
│   ├── lib/               # Firebase Web SDK initialization (firebase.ts)
│   ├── services/          # Client API & Firestore data services
│   ├── types/             # TypeScript domain types & interfaces
│   ├── App.tsx            # Main application router & view controller
│   └── main.tsx           # React entry point
├── server.ts              # Express backend (RBAC, Firebase Admin, Vite dev server)
├── .env.example           # Environment variables template
├── package.json           # Dependencies and build scripts
├── tsconfig.json          # TypeScript compiler configuration
└── vite.config.ts         # Vite bundler configuration
```

---

## ❓ Troubleshooting

| Issue | Resolution |
| :--- | :--- |
| **Port 3000 already in use** | Stop any process using port 3000, or edit `PORT=3001` in `.env`. |
| **Administrator Access Required** | Sign in using `gvajaykumar125@gmail.com` (configured in `ADMIN_EMAILS`). |
| **Firebase Auth domain mismatch** | In Firebase Console > Authentication > Settings > Authorized domains, ensure `localhost` is listed. |
