FROM node:24.14-bookworm AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs24-debian13

WORKDIR /app

COPY --from=deps /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

EXPOSE 8000

CMD ["dist/main.js"]