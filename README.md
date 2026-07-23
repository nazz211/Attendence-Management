# Attendance Management System

A full-stack **Attendance Management System** built with **React**, **FastAPI**, and **PostgreSQL**. The application provides secure authentication, employee management, attendance tracking, and a production-ready deployment using **PM2** and **Nginx**.

---

# Project Overview

The Attendance Management System is designed to simplify employee attendance management for organizations. It enables administrators to manage employees, monitor attendance records, and view attendance statistics, while employees can securely log in and mark their daily attendance.

This project demonstrates modern full-stack web development using a REST API architecture, JWT authentication, PostgreSQL, and production deployment on Ubuntu using PM2 and Nginx.

---

# Features

* Secure JWT-based authentication
* Role-based access (Admin & Employee)
* Employee Management (Create, Read, Update, Delete)
* Daily employee Check-In / Check-Out
* Attendance history
* Search and filter attendance records
* Dashboard with attendance statistics
* PostgreSQL database integration
* RESTful API built with FastAPI
* Responsive React user interface
* Production deployment using PM2 and Nginx

---

# Technology Stack

## Frontend

* React
* Vite
* JavaScript
* HTML5
* CSS3

## Backend

* Python
* FastAPI

## Database

* PostgreSQL

## Deployment

* PM2
* Nginx
* Ubuntu Linux

## Version Control

* Git
* GitHub

---

# Project Structure

```text
Attendence-Management/
│
├── backend/
│   ├── app/
│   ├── uploads/
│   ├── requirements.txt
│   ├── ecosystem.config.cjs
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── ecosystem.config.cjs
│   ├── vite.config.js
│   └── .env.example
│
├── .gitignore
└── README.md
```

> **Note:** The `venv/`, `.env`, `node_modules/`, and `__pycache__/` directories/files are intentionally excluded from Git and must be created locally after cloning the repository.

---

# Prerequisites

Install the following software before running the project.

* Git
* Node.js 18 or later
* npm
* Python 3.10 or later
* PostgreSQL
* PM2 (Production only)

Verify installation:

```bash
node -v
npm -v
python3 --version
psql --version
```

Install PM2 globally:

```bash
npm install -g pm2
```

---

# Installation

## 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/Attendence-Management.git

cd Attendence-Management
```

Replace `<your-username>` with the repository owner.

---

## 2. Backend Setup

Navigate to the backend folder.

```bash
cd backend
```

Create a virtual environment.

```bash
python3 -m venv venv
```

Activate it.

### Ubuntu / Linux

```bash
source venv/bin/activate
```

### Windows

```cmd
venv\Scripts\activate
```

Install dependencies.

```bash
pip install -r requirements.txt
```

---

## 3. PostgreSQL Setup

Create a database.

```sql
CREATE DATABASE attendance_db;
```

(Optional)

```sql
CREATE USER attendance_user WITH PASSWORD 'yourpassword';

GRANT ALL PRIVILEGES ON DATABASE attendance_db TO attendance_user;
```

Import your database schema or initialize your database according to your project configuration before running the backend.

---

## 4. Backend Environment Variables

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL=postgresql+psycopg2://attendance_user:yourpassword@localhost:5432/attendance_db

JWT_SECRET=your-secret-key

JWT_ALGORITHM=HS256

ACCESS_TOKEN_EXPIRE_MINUTES=480

CORS_ORIGINS=http://localhost:5173
```

For production behind Nginx:

```env
CORS_ORIGINS=http://localhost
```

---

## 5. Frontend Setup

Open another terminal.

```bash
cd frontend
```

Install dependencies.

```bash
npm install
```

Create:

```text
frontend/.env
```

Development:

```env
VITE_API_URL=http://localhost:8000/api
```

Production:

```env
VITE_API_URL=/api
```

---

# Running the Application (Development)

## Start Backend

```bash
cd backend

source venv/bin/activate

uvicorn app.main:app --reload
```

Backend URL

```text
http://localhost:8000
```

Swagger API Documentation

```text
http://localhost:8000/docs
```

ReDoc

```text
http://localhost:8000/redoc
```

---

## Start Frontend

```bash
cd frontend

npm run dev
```

Frontend URL

```text
http://localhost:5173
```

---

# Production Deployment (Ubuntu)

## Build the Frontend

```bash
cd frontend

npm install

npm run build
```

---

## Start Backend with PM2

```bash
cd backend

pm2 start ecosystem.config.cjs
```

---

## Start Frontend with PM2

```bash
cd ../frontend

pm2 start ecosystem.config.cjs
```

Verify processes.

```bash
pm2 status
```

Expected process names:

* attendance-api
* attendance-web

---

## Enable PM2 Auto Startup

```bash
pm2 startup
```

Run the generated command shown by PM2.

Save the running process list.

```bash
pm2 save
```

Restart the server.

Verify:

```bash
pm2 status
```

---

## Configure Nginx

Install Nginx.

```bash
sudo apt update

sudo apt install nginx -y
```

Configure Nginx as a reverse proxy.

Routing:

* `/` → Frontend
* `/api` → Backend

Test configuration.

```bash
sudo nginx -t
```

Reload.

```bash
sudo systemctl reload nginx
```

---

# Verify Deployment

After deployment, verify the following.

* Backend starts successfully.
* Frontend loads correctly.
* Login works.
* Employee CRUD works.
* Attendance operations work.
* Dashboard loads successfully.
* Database connection is successful.
* PM2 processes remain online.
* Services automatically restart after reboot.
* Nginx correctly proxies requests.

---

# PM2 Process Names

| Application | Process Name   |
| ----------- | -------------- |
| Frontend    | attendance-web |
| Backend     | attendance-api |

---

# PM2 Management Commands

Check status

```bash
pm2 status
```

Monitor processes

```bash
pm2 monit
```

View logs

```bash
pm2 logs
```

Frontend logs

```bash
pm2 logs attendance-web
```

Backend logs

```bash
pm2 logs attendance-api
```

Restart frontend

```bash
pm2 restart attendance-web
```

Restart backend

```bash
pm2 restart attendance-api
```

Restart all

```bash
pm2 restart all
```

Stop all

```bash
pm2 stop all
```

Delete all

```bash
pm2 delete all
```

Save PM2 configuration

```bash
pm2 save
```

Generate startup script

```bash
pm2 startup
```

---

# Troubleshooting

## Database Connection Error

* Ensure PostgreSQL is running.
* Verify the `DATABASE_URL`.
* Confirm the database exists.
* Check database credentials.

---

## Frontend Cannot Connect to Backend

Development:

```env
VITE_API_URL=http://localhost:8000/api
```

Production:

```env
VITE_API_URL=/api
```

---

## CORS Error

Development:

```env
CORS_ORIGINS=http://localhost:5173
```

Production:

```env
CORS_ORIGINS=http://localhost
```

---

## PM2 Processes Not Starting

Check process status.

```bash
pm2 status
```

View logs.

```bash
pm2 logs
```

Restart if necessary.

```bash
pm2 restart all

pm2 save
```

---

# Screenshots

Add screenshots of:

* Login Page
* Admin Dashboard
* Employee Management
* Attendance Management
* Attendance History

---

# Future Improvements

* Email notifications
* Password reset
* Leave management
* Attendance reports (PDF / Excel)
* QR code attendance
* Face recognition attendance
* Docker support
* Cloud deployment (AWS, Azure, Oracle Cloud)

---

# Contributors

* Rishal
* Navaf

---

# License

This project is intended for educational and portfolio purposes only.

---

# Result

The Attendance Management System has been successfully developed using **React**, **FastAPI**, and **PostgreSQL**, with a production-ready deployment using **PM2** and **Nginx**. The application supports secure authentication, employee management, attendance tracking, automatic service startup after server reboot, process monitoring, and stable background execution suitable for real-world deployment.
