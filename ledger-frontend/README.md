# Ledger Frontend

React + JavaScript + Vite frontend for the SpendWise ledger API.

## Features

- register and login flow
- dashboard with balance, income, expense, and recent activity
- expense entry and deletion
- account listing and balance views
- transfer form with idempotency key generation
- analytics cards and category summaries
- local budget planning and CSV export

## Setup

```powershell
npm install
```

Optional local `.env` override:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server |
| `npm run build` | Creates a production build |
| `npm run preview` | Serves the production build locally |

## Structure

- `src/App.jsx` coordinates state and data loading
- `src/components/` contains reusable UI pieces
- `src/sections/` contains tab-level screens
- `src/lib/` contains format, storage, and analytics helpers

## Run

```powershell
npm run dev
```

Open `http://localhost:5173`.

The frontend expects the backend API at `http://localhost:3000` unless `VITE_API_BASE_URL` is overridden.
