FROM node:20-alpine AS builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend .
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tzdata
COPY --from=builder /app/backend/dist /app/backend/dist
COPY --from=builder /app/backend/node_modules /app/backend/node_modules
COPY frontend /app/frontend
RUN mkdir -p /app/backend/uploads
EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
