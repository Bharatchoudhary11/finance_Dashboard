# Finance Dashboard Backend

A Node.js (Express + TypeScript) backend focused on user and role management for a finance dashboard.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment** – create a `.env` file with at least:
   ```bash
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/finance-dashboard
   JWT_SECRET=replace-with-secure-secret
   JWT_TTL=1h # optional
   ```
3. **Run in development**
   ```bash
   npm run dev
   ```
4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Features

- **JWT authentication + role & permission enforcement** (viewer, analyst, admin) via reusable middleware.
- **User management** endpoints covering creation, profile updates, role/status changes, and deletion with password hashing.
- **Financial record management** with CRUD, query filtering (type/category/date/amount), and data validation.
- **Dashboard summary API** that aggregates totals, category breakdowns, recent activity, and a six-month trend.
- **Robust validation & error handling** returning accurate HTTP status codes and descriptive messages.

## API Overview

| Endpoint | Method | Roles | Description |
| --- | --- | --- | --- |
| `/` | GET | Public | API welcome + quick route hints |
| `/health` | GET | Public | Service heartbeat |
| `/api/auth/login` | POST | Public | Issue JWT tokens |
| `/api/users/me` | GET | Any authenticated | View own profile |
| `/api/users` | POST | Admin | Create a user and assign roles |
| `/api/users` | GET | Admin | List all users |
| `/api/users/:id` | GET | Admin | View one user |
| `/api/users/:id` | PATCH | Admin | Update user profile fields (name/email) |
| `/api/users/:id/status` | PATCH | Admin | Activate/deactivate user |
| `/api/users/:id/roles` | PATCH | Admin | Update role assignments |
| `/api/users/:id` | DELETE | Admin | Remove a user |
| `/api/data/dashboard` | GET | Viewer+ | Read dashboard summary aggregates |
| `/api/data/records` | GET | Analyst+ | Access analytical records (supports filters) |
| `/api/data/records/:id` | GET | Analyst+ | View a single record |
| `/api/data/records` | POST | Admin | Create financial records |
| `/api/data/records/:id` | PATCH | Admin | Update financial records |
| `/api/data/records/:id` | DELETE | Admin | Remove financial records |
| `/api/data/insights` | GET | Analyst+ | Operational insights |

## Role Model

- **Viewer** – read-only dashboard access.
- **Analyst** – dashboard + records.
- **Admin** – manage users, create/update records, and access all data (inherits all other permissions).

Inactive users are prevented from authenticating and all protected routes enforce both authentication and role checks.

## Persistence & Data Modeling

- MongoDB via Mongoose stores both `User` and `FinancialRecord` documents (`src/models/*`).
- Users keep hashed passwords, multi-role arrays, and status flags.
- Financial records persist amount, type (`income`/`expense`), category, date, notes, creator reference, timestamps, and an index on `{ date, type, category }`.
- Dashboard summaries use aggregation pipelines plus in-memory helpers to backfill empty months.

## Validation & Error Handling

- Every controller validates inputs (required fields, enums, positive amounts, ISO dates) and responds with 400s on bad payloads.
- Duplicate emails, missing entities, and permission failures yield 409/404/403 respectively.
- Auth middleware guards against malformed/missing JWTs and inactive users.

## Sample Data Seeding

Use Node once to seed initial accounts (update emails/passwords as desired):

```bash
node -e "const mongoose=require('mongoose');const bcrypt=require('bcryptjs');(async()=>{await mongoose.connect(process.env.MONGODB_URI||'mongodb://localhost:27017/finance-dashboard');const db=mongoose.connection.db;const seed=async (email,password,roles)=>{const hash=await bcrypt.hash(password,10);await db.collection('users').updateOne({email},{\$set:{name:email.split('@')[0],email,password:hash,roles,status:'active',createdAt:new Date(),updatedAt:new Date()}},{upsert:true});};await seed('admin@example.com','yourpass',['admin']);await seed('viewer@example.com','viewerpass',['viewer']);await seed('analyst@example.com','analystpass',['analyst']);console.log('Seeded admin/viewer/analyst');await mongoose.disconnect();})().catch(e=>{console.error(e);process.exit(1);});"
```

## Testing & Verification

- `npm run build` – TypeScript compilation check.
- Manual verification: use the sample `curl` commands (login + dashboard/records) from the project notes to confirm role-specific access control and validation behavior.

## Deploying on Render

If Render shows build success but deployment exits with status 1, ensure TypeScript is compiled before startup.

- Build Command: `npm install && npm run build`
- Start Command: `npm start`

This repository includes a `render.yaml` blueprint with those defaults.
