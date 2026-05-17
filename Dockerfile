# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Runner Stage
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Hugging Face Spaces runs on port 7860 by default
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 7860
CMD ["npx", "next", "start", "-p", "7860"]
