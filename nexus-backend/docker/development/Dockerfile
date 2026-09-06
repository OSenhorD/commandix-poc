# syntax=docker/dockerfile:1
# Imagem de desenvolvimento: mantém devDependencies e código montado via bind mount.

FROM node:24.16.0-alpine

WORKDIR /app

# bcrypt native bindings on Alpine
RUN apk add --no-cache python3 make g++

ENV NODE_ENV=development
ENV PRISMA_DISABLE_TELEMETRY=1

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY docker/development/entrypoint.sh ./docker/development/entrypoint.sh
RUN chmod +x docker/development/entrypoint.sh

EXPOSE 3000 9229

ENTRYPOINT ["./docker/development/entrypoint.sh"]
