FROM node:22-bookworm-slim AS frontend
WORKDIR /app/ledger-frontend
COPY ledger-frontend/package*.json ./
RUN npm ci
COPY ledger-frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app/backend-ledger
COPY backend-ledger/package*.json ./
RUN npm ci --omit=dev
COPY backend-ledger/ ./
COPY --from=frontend /app/ledger-frontend/dist /app/ledger-frontend/dist
EXPOSE 3000
CMD ["npm", "start"]
