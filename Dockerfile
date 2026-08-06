# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/ledger-frontend
COPY ledger-frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY ledger-frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app/backend-ledger
COPY backend-ledger/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --chown=node:node backend-ledger/ ./
COPY --chown=node:node --from=frontend-build /app/ledger-frontend/dist /app/ledger-frontend/dist
USER node
EXPOSE 3000
CMD ["node", "server.js"]
