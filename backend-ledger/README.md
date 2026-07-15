# Backend Ledger Service

This service powers the SpendWise app with JWT auth, account creation, ledger-backed balances, expense tracking, and account-to-account transfers.

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
| `npm test` | Runs the backend smoke tests |
| `npm run frontend:dev` | Starts the frontend from this folder |
| `npm run frontend:build` | Builds the frontend from this folder |

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
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
EMAIL_ENABLED=false
EMAIL_USER=
CLIENT_ID=
CLIENT_SECRET=
REFRESH_TOKEN=
TRANSACTION_PROCESSING_DELAY_MS=15000
```

## Recommended Way To Run

```powershell
npm run dev:memory
```

Why this mode is recommended:

- no local MongoDB installation is required
- transfer endpoints work out of the box because Mongo transactions need replica set support
- it matches the automated test setup closely

Health endpoints:

- `GET /` -> `Ledger Service is up and running`
- `GET /api/health` -> JSON health response

## If You Want To Use A Real MongoDB Instance

```powershell
npm run dev
```

Use a replica set enabled MongoDB deployment if you want to exercise transfer flows, because the transfer controller uses MongoDB transactions.

## Test The Backend

```powershell
npm test
```

The test suite covers:

- service boot health check
- register and login flow
- account creation and account listing
- initial account funding through the system transaction endpoint
- balance computation from ledger entries

## API Overview

### Auth

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/auth/register` |
| `POST` | `/api/auth/login` |
| `POST` | `/api/auth/logout` |

### Accounts

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/accounts` |
| `GET` | `/api/accounts` |
| `GET` | `/api/accounts/balance/:accountId` |

### Expenses

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/expenses` |
| `GET` | `/api/expenses` |
| `GET` | `/api/expenses/categories` |
| `GET` | `/api/expenses/summary` |
| `DELETE` | `/api/expenses/:id` |

### Transactions

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/transactions` |
| `POST` | `/api/transactions/system/initial-funds` |

## Sample Requests

Register:

```powershell
curl.exe -X POST http://localhost:3000/api/auth/register `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Kaushik\",\"email\":\"kaushik@example.com\",\"password\":\"secret123\"}"
```

Login:

```powershell
curl.exe -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"kaushik@example.com\",\"password\":\"secret123\"}"
```

Create an account with a bearer token:

```powershell
curl.exe -X POST http://localhost:3000/api/accounts `
  -H "Authorization: Bearer YOUR_TOKEN"
```

Record an expense:

```powershell
curl.exe -X POST http://localhost:3000/api/expenses `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -d "{\"accountId\":\"ACCOUNT_ID\",\"amount\":450,\"type\":\"expense\",\"category\":\"Food & Dining\",\"description\":\"Lunch\"}"
```
