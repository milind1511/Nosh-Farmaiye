# syntax=docker/dockerfile:1.6
FROM node:18-alpine AS base
WORKDIR /usr/src/app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend ./
COPY shared ../shared
COPY frontend/src/assets/frontend_assets ../frontend-assets

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "server.js"]
