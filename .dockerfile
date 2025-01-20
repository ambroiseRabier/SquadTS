# ---------- Build Stage ----------
FROM node:lts-alpine AS builder

WORKDIR /app

# Todo change URL
RUN wget 'https://github.com/Team-Silver-Sphere/SquadJS/archive/refs/heads/master.zip' && unzip master.zip

WORKDIR /app/SquadTS-master

RUN npm ci

RUN npm build


# ---------- Production Stage ----------
# We removed everything used to build to reduce image size.
FROM node:lts-alpine AS production

WORKDIR /app

# Install only production dependencies from the builder
COPY --from=builder /app/SquadTS-master/package*.json ./
RUN npm install --production

# Copy the transpiled app from the builder
COPY --from=builder /app/SquadTS-master/dist ./dist

CMD [ "node", "dist/index.js" ]
