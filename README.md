# Backend-Ledger-API

SpendWise is a full-stack personal finance tracker built with a Node.js/Express API and a React dashboard. The backend uses immutable CREDIT/DEBIT ledger entries to derive balances, which makes transfers and account summaries easier to reason about than direct balance mutation.

This repository contains both parts of the project:

- `backend-ledger/` - Express, MongoDB, JWT auth, ledger logic
- `ledger-frontend/` - React, JavaScript, Vite single-page application

## Why This Project Stands Out

- Ledger-driven balances instead of storing mutable account totals
- Idempotent transfer endpoint to reduce duplicate transaction risk
- Expense tracking, category analytics, budgets, CSV export, and demo data seeding
- JWT-based auth flow with protected routes
- In-memory MongoDB replica set support for fast local demos

## Tech Stack

| Layer | Stack |
| --- | --- |
| Backend | Node.js, Express, MongoDB, Mongoose |
| Frontend | React 19, JavaScript, Vite |
| Auth | JWT, HTTP cookies |

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
FRONTEND_URL=http://localhost:5173
COOKIE_SAME_SITE=lax
```

Frontend optional `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Build Check

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
| `POST` | `/api/auth/login` | Login and create an authenticated session |
| `GET` | `/api/auth/session` | Restore the HttpOnly-cookie browser session |
| `POST` | `/api/auth/logout` | Logout and blacklist the token |
| `DELETE` | `/api/auth/account` | Permanently delete the signed-in user and their data |
| `POST` | `/api/accounts` | Create an account for the logged-in user |
| `GET` | `/api/accounts` | List user accounts |
| `GET` | `/api/accounts/balance/:accountId` | Compute balance from ledger entries |
| `DELETE` | `/api/accounts/:accountId` | Archive a zero-balance account |
| `POST` | `/api/expenses` | Record an income or expense |
| `GET` | `/api/expenses` | List recent income and expenses |
| `GET` | `/api/expenses/summary` | Return analytics summary |
| `DELETE` | `/api/expenses/:id` | Create a reversal event and reverse the ledger effect |
| `POST` | `/api/transactions` | Transfer money between accounts |
| `GET` | `/api/budgets` | List saved budget limits |
| `POST` | `/api/budgets` | Create or update a category budget |
| `DELETE` | `/api/budgets/:category` | Remove a category budget |

## Notes For Reviewers

- Transfer flows rely on MongoDB transactions; use `npm run dev:memory` or a replica-set-enabled MongoDB deployment when evaluating them manually.
- `Transaction` records what happened (income, expense, transfer, or reversal); `Ledger` records how money moved (credit or debit).
- Budgets are stored per user in MongoDB, so they remain available across devices.
- Deleting a financial account archives it only after its ledger balance reaches zero; its audit history remains intact.
- Deleting the user account permanently removes the user and all related SpendWise data in one MongoDB transaction.
