FROM node:24.16.0-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# node_modules nasce de um RUN (root); sem o chown, o volume nomeado herda essa
# ownership e o Vite (rodando como ${UID:-1000}:${GID:-1000}, ex.: user "node" da
# própria imagem) não consegue escrever o cache de pre-bundling em node_modules/.vite.
RUN npm ci && chown -R node:node node_modules

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
