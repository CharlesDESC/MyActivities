FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
# La compilation TypeScript a besoin de types declares en devDependencies.
# --include=dev evite que NODE_ENV=production fourni par l'hebergeur les omette.
RUN npm ci --include=dev

FROM base AS dev
ENV NODE_ENV=development
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY . .
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
# PORT est injecté par Render (10000) ou Docker Compose (3000)
ENV PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Les .sql ne sont pas compilés par tsc : migrate.js les cherche dans dist/db/migrations
COPY --from=builder /app/src/db/migrations ./dist/db/migrations
# app.ts lit swagger.yaml depuis __dirname/.. → /app/swagger.yaml
COPY --from=builder /app/swagger.yaml ./swagger.yaml
EXPOSE ${PORT}
# npm start = migrations puis serveur
CMD ["npm", "start"]
