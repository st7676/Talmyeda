# Multi-stage build (spec section 101): the final image only carries
# production dependencies and the compiled dist/ output, not the whole
# TypeScript source tree or devDependencies.

FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first so `npm ci` is cached separately from source
# changes - editing src/ shouldn't force a full dependency reinstall.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main"]
