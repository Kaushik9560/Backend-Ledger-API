# Backend Ledger Service

This service powers the SpendWise app with JWT auth, account creation, ledger-backed balances, expense tracking, and account-to-account transfers.

`Transaction` stores what happened (`INCOME`, `EXPENSE`, `TRANSFER`, or `REVERSAL`). `Ledger` stores how the balance changed (`CREDIT` or `DEBIT`).

## Requirements

- Node.js 22+
- npm 10+
- Recommended for evaluation: no local MongoDB needed if you use `npm run dev:memory`

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the API with your configured MongoDB connection |
| `npm run dev:memory` | Starts the API with an in-memory MongoDB replica set |
| `npm run dev:full` | Starts `dev:memory` and the frontend dev server together |
| `npm start` | Starts the API without nodemon |
| `npm run frontend:dev` | Starts the frontend from this folder |
| `npm run frontend:build` | Builds the frontend from this folder |
| `npm run build` | Builds the frontend |

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Update `.env` as needed:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/backend-ledger
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
COOKIE_SAME_SITE=lax
```

## Recommended Way To Run

```powershell
npm run dev:memory
```

Why this mode is recommended:

- no local MongoDB installation is required
- transfer endpoints work out of the box because Mongo transactions need replica set support

Health endpoint: `GET /api/health`

## If You Want To Use A Real MongoDB Instance

```powershell
npm run dev
```

Use a replica set enabled MongoDB deployment if you want to exercise transfer flows, because the transfer controller uses MongoDB transactions.


## API Overview

### Auth

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/auth/register` |
| `POST` | `/api/auth/login` |
| `GET` | `/api/auth/session` |
| `POST` | `/api/auth/logout` |
| `DELETE` | `/api/auth/account` |

### Accounts

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/accounts` |
| `GET` | `/api/accounts` |
| `GET` | `/api/accounts/balance/:accountId` |
| `DELETE` | `/api/accounts/:accountId` |

### Income and expense events

The route name stays `/api/expenses` because it is the existing frontend API contract. Internally, these endpoints use `Transaction` documents.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/expenses` | Record an income or expense event |
| `GET` | `/api/expenses` | List active income and expense events |
| `GET` | `/api/expenses/summary` | Calculate income and expense analytics |
| `DELETE` | `/api/expenses/:id` | Append a reversal transaction and reverse the ledger effect |

### Transactions

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/transactions` |

### Budgets

Budgets are stored per authenticated user in MongoDB and sync across devices.

| Method | Endpoint |
| --- | --- |
| `GET` | `/api/budgets` |
| `POST` | `/api/budgets` |
| `DELETE` | `/api/budgets/:category` |

A financial account can be deleted only when its ledger balance is zero. The account is archived so its transaction and ledger audit history remains valid. Deleting the user account permanently removes all data owned by that user in one MongoDB transaction.
