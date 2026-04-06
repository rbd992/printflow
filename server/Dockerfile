FROM node:20-alpine

LABEL maintainer="PrintFlow"
LABEL description="PrintFlow NAS Server"
LABEL org.opencontainers.image.source="https://github.com/rbd992/printflow"
LABEL org.opencontainers.image.description="PrintFlow 3D Print Business Suite — Server"
LABEL org.opencontainers.image.licenses="Proprietary"

# Install build deps for better-sqlite3 native module + ffmpeg for camera streaming
RUN apk add --no-cache python3 make g++ sqlite ffmpeg

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
