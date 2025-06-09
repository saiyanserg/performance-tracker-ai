# Performance Tracker with AI “Tip of the Day"

A full-stack sales performance dashboard that lets you:

* **Log daily sales** (Voice Lines, BTS, IOT, HSI, Accessories, Protection, Plan Name, MRC)
* **Persist entries** in Supabase (PostgreSQL)
* **View summary statistics** (totals, percentages, averages)
* **Receive an AI-generated sales tip** via OpenAI (with a built-in fallback)
* **Secure access** with JWT authentication and protected routes

---

## 🚀 Features

* **Secure Login**
  * JWT-based authentication (Express + bcryptjs + jsonwebtoken)

* **Daily Sales Form**
  * Built with React Hook Form & Zod for schema validation

* **Persistent Storage**
  * Supabase to store and fetch entries; live updates on page load

* **Summary Dashboard**
  * Responsive grid displaying aggregate metrics

* **Tip of the Day**
  * Requests a one-line sales tip from OpenAI’s GPT-3.5-turbo via an Express endpoint (`POST /api/generateTip`)
  * Falls back to a static tip if the AI call fails

* **Clear Database**
  * “Delete all” button with confirmation; uses a non-nullable primary-key filter for PostgREST compatibility

* **Protected Routes**
  * `ProtectedRoute` in React Router v6 checks `localStorage.authToken` before rendering sensitive pages

* **Styling**
  * Tailwind CSS with a custom T-Mobile brand palette, enhanced by Shadcn/UI components

---

## 🛠 Tech Stack

| Layer        | Technologies                                                                         |
| ------------ | ------------------------------------------------------------------------------------ |
| **Client**   | React, TypeScript, Vite, React Router, React Hook Form, Zod, Tailwind CSS, Shadcn/UI |
| **Server**   | Node.js, Express, OpenAI SDK, bcryptjs, jsonwebtoken                                 |
| **Database** | Supabase (PostgreSQL)                                                                |

---

## 📦 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/performance-tracker-ai.git
cd performance-tracker-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

#### Client (root `.env`)
```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_OPENAI_API_KEY=<your-openai-api-key>
```

#### Server (`/server/.env`)
```env
OPENAI_API_KEY=<your-openai-api-key>
JWT_SECRET=<your-jwt-secret>
PORT=4000
```

### 4. Start the application

* **Backend**
  ```bash
  npm run dev:server
  ```

* **Frontend**
  ```bash
  npm run dev:client
  ```

### 5. Access the app

* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:4000](http://localhost:4000)

---

## 👤 Demo Credentials

* **Username:** `admin`
* **Password:** `password123`

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for enhancements or bug fixes.