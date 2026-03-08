# ── WebSocket Server Dockerfile ──────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install build tools for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --production

COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3002
ENV PORT=3002
ENV ML_SERVER_URL=http://ml-inference:3003
ENV DB_PATH=/app/data/logs.db

CMD ["node", "server.js"]
