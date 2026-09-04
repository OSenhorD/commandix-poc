# syntax=docker/dockerfile:1
# Pin aligned with package.json engines.node (24.16.0)

FROM node:24.16.0-alpine AS build

WORKDIR /app

ENV PRISMA_DISABLE_TELEMETRY=1

COPY package.json package-lock.json ./
RUN npm ci

COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
RUN ./node_modules/.bin/prisma skills sync --disable

COPY migrations ./migrations
COPY src ./src

RUN npm run contract:emit
RUN npm run build

FROM node:24.16.0-alpine AS production

WORKDIR /app

# bcrypt native bindings on Alpine
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

ENV NODE_ENV=production
ENV PRISMA_DISABLE_TELEMETRY=1

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/.prisma ./.prisma
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/src/prisma ./src/prisma
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
