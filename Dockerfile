# ------------------------ STAGE 1: BUILD (TypeScript -> JS) ------------------------
FROM node:24-alpine AS builder

# Dependências para compilar libs nativas (pg, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copia apenas o necessário para instalar as dependências
COPY package.json package-lock.json tsconfig.json ./

# Instala TODAS as dependências (inclui devDependencies para build)
RUN npm ci

# Copia código fonte
COPY src ./src

# Build TypeScript -> dist/
RUN npm run build

# Copia assets estáticos de project (HTML, CSS, JS, imagens) para o dist
# Isso garante que __dirname nos arquivos compilados encontre "public", "templates", etc.
RUN mkdir -p dist/project \
    && cp -R src/project/* dist/project/

# ------------------------ STAGE 2: RUNTIME (produção) ------------------------
FROM node:24-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

# Instala só dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia apenas o que foi buildado
COPY --from=builder /app/dist ./dist

# Porta interna da aplicação (deve bater com APP_PORT do .env)
ENV APP_PORT=15432
EXPOSE 15432

# Entry point compilado (src/server.ts/js -> dist/server.js)
CMD ["node", "dist/server.js"]
