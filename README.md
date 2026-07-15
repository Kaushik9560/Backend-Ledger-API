# Backend-Ledger-API

SpendWise is a full-stack personal finance tracker built with a Node.js/Express API and a React dashboard. The backend uses immutable CREDIT/DEBIT ledger entries to derive balances, which makes transfers and account summaries easier to reason about than direct balance mutation.

This repository contains both parts of the project:

- `backend-ledger/` - Express, MongoDB, JWT auth, ledger logic, automated tests
- `ledger-frontend/` - React, TypeScript, Vite single-page application

## Why This Project Stands Out

- Ledger-driven balances instead of storing mutable account totals
- Idempotent transfer endpoint to reduce duplicate transaction risk
- Expense tracking, category analytics, budgets, CSV export, and demo data seeding
- JWT-based auth flow with protected routes
- In-memory MongoDB replica set support for fast demos and repeatable tests

## Tech Stack

| Layer | Stack |
| --- | --- |
| Backend | Node.js, Express, MongoDB, Mongoose |
| Frontend | React 19, TypeScript, Vite |
| Auth | JWT, HTTP cookies |
| Testing | `node:test`, Supertest, `mongodb-memory-server` |

## Repository Structure

```text
BackEnd/
|-- backend-ledger/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- models/
|   |   `-- routes/
|   |-- scripts/
|   |-- test/
|   |-- server.js
|   `-- README.md
|-- ledger-frontend/
|   |-- public/
|   |-- src/
|   |-- package.json
|   `-- README.md
`-- README.md
```

## Quick Start

### 1. Install dependencies

```powershell
cd backend-ledger
npm install
Copy-Item .env.example .env

cd ..\ledger-frontend
npm install
```

### 2. Recommended demo mode

The easiest way to evaluate the project is to run the backend with the bundled in-memory MongoDB replica set. That avoids any local MongoDB setup and keeps transfer endpoints working because Mongo transactions need replica set support.

Backend terminal:

```powershell
cd backend-ledger
npm run dev:memory
```

Frontend terminal:

```powershell
cd ledger-frontend
npm run dev
```

Open `http://localhost:5173`.

### 3. Optional one-command local demo

Once both folders have dependencies installed, this command starts the in-memory backend and the frontend dev server together:

```powershell
cd backend-ledger
npm run dev:full
```

## Environment

Backend `.env`:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/backend-ledger
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
EMAIL_ENABLED=false
EMAIL_USER=
CLIENT_ID=
CLIENT_SECRET=
REFRESH_TOKEN=
TRANSACTION_PROCESSING_DELAY_MS=15000
```

Frontend optional `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Quality Checks

Backend tests:

```powershell
cd backend-ledger
npm test
```

Frontend production build:

```powershell
cd ledger-frontend
npm run build
```

## API Summary

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service health check |
| `POST` | `/api/auth/register` | Register a user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `POST` | `/api/auth/logout` | Logout and blacklist the token |
| `POST` | `/api/accounts` | Create an account for the logged-in user |
| `GET` | `/api/accounts` | List user accounts |
| `GET` | `/api/accounts/balance/:accountId` | Compute balance from ledger entries |
| `POST` | `/api/expenses` | Record an income or expense |
| `GET` | `/api/expenses` | List expenses with filters |
| `GET` | `/api/expenses/categories` | Return supported categories |
| `GET` | `/api/expenses/summary` | Return analytics summary |
| `DELETE` | `/api/expenses/:id` | Soft-delete an expense and reverse ledger effect |
| `POST` | `/api/transactions` | Transfer money between accounts |
| `POST` | `/api/transactions/system/initial-funds` | Seed an account from a system user |

## Notes For Reviewers

- The backend test suite uses an in-memory MongoDB replica set, so it runs without external database setup.
- Transfer flows rely on MongoDB transactions; use `npm run dev:memory` or a replica-set-enabled MongoDB deployment when evaluating them manually.
- Budgets are currently stored in frontend local storage, while ledger entries, accounts, expenses, and auth live in the backend.
