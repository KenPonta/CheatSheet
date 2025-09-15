# Simplified backend setup
FROM node:18-slim

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json and install dependencies
COPY backend-docker/package.json ./package.json
RUN npm install

# Copy server file
COPY backend-docker/server.js ./server.js

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "server.js"]