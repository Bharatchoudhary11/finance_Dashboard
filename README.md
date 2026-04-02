# Finance Dashboard Backend

A Node.js (Express + TypeScript) backend focused on user and role management for a finance dashboard.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment** – create a `.env` file with at least:
   ```bash
   PORT=4000
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

## API Overview

| Endpoint | Method | Roles | Description |
| --- | --- | --- | --- |
| `/health` | GET | Public | Service heartbeat |
| `/api/auth/login` | POST | Public | Issue JWT tokens |
| `/api/users/me` | GET | Any authenticated | View own profile |
| `/api/users` | POST | Admin | Create a user and assign roles |
| `/api/users` | GET | Admin | List all users |
| `/api/users/:id/status` | PATCH | Admin | Activate/deactivate user |
| `/api/users/:id/roles` | PATCH | Admin | Update role assignments |
| `/api/data/dashboard` | GET | Viewer+ | Read dashboard summary |
| `/api/data/records` | GET | Analyst+ | Access analytical records |
| `/api/data/insights` | GET | Admin | Administrative insights |

## Role Model

- **Viewer** – read-only dashboard access.
- **Analyst** – dashboard + insights/records.
- **Admin** – manage records and users (inherits all other permissions).

Inactive users are prevented from authenticating and all protected routes enforce both authentication and role checks.
