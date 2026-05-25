FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json /app/
COPY backend/package*.json /app/backend/
COPY frontend/package*.json /app/frontend/ 2>/dev/null || true
RUN cd backend && npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tzdata
COPY --from=builder /app /app
COPY backend /app/backend
COPY frontend /app/frontend
RUN rm -rf /app/backend/node_modules && cp -r /app/backend/node_modules /app/backend/
RUN mkdir -p /app/backend/uploads
EXPOSE 3000
CMD ["node", "backend/server.js"]
