# Employee Attendance Management System v2

A simple role-based attendance system built with React (Vite), FastAPI, PostgreSQL, SQLAlchemy, and JWT authentication.

## Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL running locally
- PM2 (only required for PM2 deployment): `npm install -g pm2`

## Database setup

Create a PostgreSQL database (adjust the user/password to match your PostgreSQL installation):

```sql
CREATE USER at_user WITH PASSWORD '12345678';
CREATE DATABASE attendance_db OWNER at_user;


```

## Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate              # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` with your PostgreSQL connection and a secure `JWT_SECRET`, then start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

On its first start the API creates its tables and seeds the default administrator:

- Email: `admin@example.com`
- Password: `admin123`

## Frontend setup

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The frontend expects the API at `http://localhost:8000/api`; change `VITE_API_URL` in `frontend/.env` if needed.

## Run with PM2

Install dependencies and create the backend virtual environment as above. Build the frontend for a production-style static bundle:

```bash
cd frontend
npm run build
```

For local PM2-managed processes (the Vite server and API), run:

```bash
cd backend && pm2 start ecosystem.config.cjs
cd ../frontend && pm2 start ecosystem.config.cjs
pm2 save
```

The API runs on port 8000 and the frontend on port 5173. For a production deployment, serve `frontend/dist` from your web server and set `CORS_ORIGINS` and `VITE_API_URL` to the public domains before building.

## Features

- JWT login with Admin and Employee roles
- Admin employee CRUD, dashboard totals, and searchable attendance logs
- Employee daily check-in/check-out and personal history
- Database uniqueness rule enforcing one attendance record per employee per day
