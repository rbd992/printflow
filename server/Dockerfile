FROM node:20-alpine

LABEL maintainer="PrintFlow"
LABEL description="PrintFlow NAS Server"

# Install build deps for better-sqlite3 native module
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copy package files first for layer caching
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/

# Create data and log directories
RUN mkdir -p /app/data /app/logs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
