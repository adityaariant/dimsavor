# Dimsavor 🥟
**The Zero-Budget Mini-ERP for a Home Dimsum Business**

Dimsavor is a full-stack internal operational dashboard designed to transform informal, unstructured WhatsApp orders into a streamlined, structured data pipeline. It acts as a customized mini-ERP (Enterprise Resource Planning) system for a home-based Dimsum business, managing everything from order parsing to kitchen production boards and financial tracking.

The entire application was built under a strict "zero-budget" constraint, utilizing powerful free-tier services without compromising on aesthetics, performance, or security.

---

## 🎯 The Business Problem
Home-based culinary businesses often rely on WhatsApp to receive orders. This leads to:
- **Chaotic Data Entry:** Manually reading chat messages and copying them into spreadsheets.
- **Human Error:** Miscalculating totals, forgetting delivery instructions, or misinterpreting order variations.
- **Inefficient Production:** Struggling to aggregate daily orders into an actionable production plan for the kitchen.
- **Financial Blind Spots:** Difficulty tracking expenses against revenues and splitting profits accurately between partners.

**The Solution:** Dimsavor solves this by providing a smart WhatsApp text parser, an automated kitchen production board, and a real-time financial reconciliation dashboard—all wrapped in a premium, highly responsive user interface.

---

## 🛠️ Technology Stack
- **Frontend:** React (Vite) + Tailwind CSS
  - *Context API* for robust state management.
  - Custom UI components utilizing modern design aesthetics (glassmorphism, micro-animations, curated color palettes).
- **Backend:** FastAPI + Python 3.11
  - Lightning-fast asynchronous endpoints.
  - Native regex-based NLP parsing pipeline for unstructured text.
- **Database:** Supabase (PostgreSQL)
  - Relational schema optimized for order tracking and historical data querying.

---

## 🔒 Security Architecture
Despite being an internal tool hosted on public repositories, Dimsavor is secured by an elegant and robust architecture:
- **Stateless In-Memory PIN:** Access requires an Admin PIN. Crucially, this PIN is stored *strictly* in React state. It is never saved to `localStorage` or cookies, ensuring it cannot be extracted by malicious scripts. A hard refresh forces re-authentication.
- **API Key Headers:** The frontend automatically attaches the in-memory PIN as an `X-API-Key` header on every request.
- **Backend Validation & Global Rate Limiting:** The FastAPI backend utilizes dependency injection to validate the API key. We leverage `slowapi` to enforce strict rate limits based on client IP (e.g., maximum 5 login attempts per minute) to prevent brute-force attacks and spam.

---

## 🚀 Local Setup & Run Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- A Supabase Project (Free Tier)

### 1. Database Setup
1. Create a new Supabase project.
2. Execute the SQL scripts located in `/backend/migrations/` in your Supabase SQL Editor. Run `001_initial_schema.sql` first, followed by `002_seed_data.sql`.

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials and a custom ADMIN_SECRET_KEY

# Run the server
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env to set VITE_API_BASE_URL (defaults to http://127.0.0.1:8000)

# Start the dev server
npm run dev
```

### 4. Access the App
Navigate to `http://localhost:5173`. You will be greeted by the secure login screen. Enter your `ADMIN_SECRET_KEY` to access the dashboard.

---

## ☁️ Cloud Deployment (Zero-Budget)

Dimsavor can be deployed entirely for free on Vercel (both Frontend and Backend).

### 1. Deploy Backend to Vercel
Since we use FastAPI, it can run as Serverless Functions on Vercel.
1. Go to Vercel and **Add New Project**.
2. Select the `backend` folder as the **Root Directory**.
3. Under Environment Variables, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `ADMIN_SECRET_KEY`
   - `CORS_ALLOWED_ORIGINS` (leave blank for now, update after deploying frontend).
4. Click **Deploy**. Vercel will automatically use `vercel.json` to build the Python environment.

### 2. Deploy Frontend to Vercel
1. Go to Vercel and **Add New Project**.
2. Select the `frontend` folder as the **Root Directory**.
3. Under Environment Variables, add:
   - `VITE_API_BASE_URL` = (Your Backend Vercel URL, e.g., `https://dimsavor-api.vercel.app`)
4. Click **Deploy**.

*Note: Remember to update the `CORS_ALLOWED_ORIGINS` on your backend project with your new frontend URL once it's live!*

---

## 📚 Documentation Suite
For a deep dive into the engineering and product decisions, review our documentation suite:
- [PRD (Product Requirements Document)](PRD.md)
- [SRS (Software Requirements Specification)](SRS.md)
- [SDD (Software Design Document)](SDD.md)
- [UI/UX Flow](UIUX_FLOW.md)
- [Roadmap](docs/ROADMAP.md)
