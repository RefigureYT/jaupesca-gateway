# JauPesca Gateway  

> Plataforma principal de aplicações web da **Jaú Pesca**, centralizando múltiplos serviços internos em um único gateway HTTP.

Este gateway concentra vários serviços internos em um único subdomínio  
`apps.jaupesca.com.br`, organizados por **paths de URL**  
(por exemplo, `/home`, `/remarketing`, etc.), simplificando:

- o acesso dos usuários;
- o deploy em produção;
- o debug e a observabilidade;
- a organização dos projetos web em um só ponto de entrada.

---

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express.js-Gateway-000000?logo=express&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-DB-336791?logo=postgresql&logoColor=white">
  <img alt="MinIO" src="https://img.shields.io/badge/MinIO-S3%20Storage-a80030?logo=minio&logoColor=white">
</p>

<p align="center">
  <a href="https://wakatime.com/badge/user/db4a2800-e564-4201-9406-b98e170a6764/project/e1e5b096-507c-49b1-ace4-0c811291cf32">
    <img src="https://wakatime.com/badge/user/db4a2800-e564-4201-9406-b98e170a6764/project/e1e5b096-507c-49b1-ace4-0c811291cf32.svg" alt="WakaTime - tempo de desenvolvimento">
  </a>
</p>

## Visão geral da arquitetura

- **Node.js + Express (CommonJS)** rodando como gateway HTTP.
- **Auto-descoberta de projetos** na pasta `src/project`  
  Cada subpasta que exporta `{ mountPath, router }` em um `index.js` é montada automaticamente:
  - `src/project/home` → `mountPath: "/home"`
  - `src/project/remarketing` → `mountPath: "/remarketing"`
- **Front-end estático por projeto**
  - HTML / SCSS / JS servidos a partir das pastas `public/` e `templates/` de cada projeto.
- **Back-end de Remarketing**
  - API REST para gerenciar configurações de remarketing no PostgreSQL.
  - Upload de arquivos para bucket S3 MinIO da Jaú Pesca.
- **Healthcheck simples**
  - `GET /health` retorna status básico da aplicação.

---

## Estrutura de pastas

```text
JauPesca-Gateway/
├─ .env                 # Variáveis reais (NÃO commitar)
├─ .env.example         # Exemplo de configuração
├─ .gitignore
├─ .nvmrc               # Versão do Node usada (24.x)
├─ Dockerfile           # Build multi-stage (builder + runtime)
├─ build.sh             # Script de build + push para registry privado
├─ LICENSE              # Licença proprietária (uso restrito)
├─ README.md
├─ docs/
│  └─ architecture.md   # Anotações internas de arquitetura
├─ package-lock.json
├─ package.json
├─ tsconfig.json
└─ src/
   ├─ config/
   │  ├─ app.js         # Cria e configura o app Express
   │  └─ env.js         # Carrega e valida variáveis de ambiente (.env)
   ├─ project/
   │  ├─ index.js       # Auto-registro de projetos (home, remarketing, etc.)
   │  ├─ home/
   │  │  ├─ index.js    # Router do projeto /home
   │  │  └─ public/     # HTML/CSS/JS da home
   │  └─ remarketing/
   │     ├─ index.js    # Router do projeto /remarketing (front)
   │     └─ public/
   │        ├─ img/
   │        ├─ static/javascript/
   │        ├─ static/styles/
   │        └─ templates/
   │           ├─ remarketing.html
   │           └─ remarketing-config.html
   ├─ routes/
   │  ├─ index.js       # Rotas globais (/health, APIs, etc.)
   │  ├─ health.routes.js
   │  └─ remarketing/
   │     └─ remarketing-config.routes.ts  # API de config de remarketing
   ├─ services/
   │  └─ remarketing/
   │     └─ upload-remarketing.ts         # Upload de arquivos para MinIO
   └─ server.js          # Ponto de entrada: sobe o HTTP server
```

---

## Variáveis de ambiente

As variáveis são carregadas em `src/config/env.js` usando `dotenv` e mapeadas para um objeto `env`.
Se algo essencial não estiver definido, o app emite warnings ou encerra com erro.

Exemplo de `.env`:

```env
APP_NAME="JauPesca Gateway"
APP_ENV="development"        # ou "production"
APP_PORT=15432
APP_IP="0.0.0.0"

# ==========================
# MINIO (S3 JAÚ PESCA)
# ==========================
MINIO_ENDPOINT="https://s3.jaupesca.com.br"
MINIO_REGION="us-east-1"
MINIO_ACCESS_KEY="SEU_ACCESS_KEY"
MINIO_SECRET_KEY="SEU_SECRET_KEY"
MINIO_BUCKET_REMARKETING="public"
MINIO_PUBLIC_BASE_URL="https://s3.jaupesca.com.br"

# ==========================
# DATABASE PRINCIPAL
# ==========================
DB_HOST="192.168.15.121"
DB_PORT=5432
DB_USER="postgres"
DB_PASSWORD="SUA_SENHA"
DB_DATABASE="api"
DB_SSL=false
```

> **Importante:**  
> - Nunca commitar `.env` com credenciais reais.  
> - Em produção, essas variáveis devem ser passadas via `environment`, `env_file` ou secrets (Swarm/Traefik).

---

## Scripts NPM

Definidos em `package.json`:

```json
"scripts": {
  "dev": "ts-node-dev --respawn --transpile-only src/server.js",
  "build": "tsc",
  "start": "NODE_ENV=production node dist/server.js"
}
```

- `npm run dev`  
  Sobe o gateway em modo desenvolvimento com **ts-node-dev** (hot reload).
- `npm run build`  
  Compila TypeScript para `dist/`.
- `npm start`  
  Roda o servidor compilado em modo produção.

---

## Rotas principais

### Healthcheck

- `GET /health`  
  Retorna um JSON simples com o status da aplicação. Pode ser usado por Traefik, Swarm e monitoramento.

### Projeto `home` (landing)

- `GET /home`  
  Retorna `home.html`, a página inicial do gateway.
- Arquivos estáticos (CSS/JS/imagens) são servidos a partir de:
  - `src/project/home/public`

### Projeto `remarketing` (front)

- `GET /remarketing`  
  Retorna `remarketing.html` (tela principal de remarketing).
- `GET /remarketing/config`  
  Retorna `remarketing-config.html` (tela de configurações).
- Estáticos:
  - CSS: `src/project/remarketing/public/static/styles/...`
  - JS: `src/project/remarketing/public/static/javascript/...`

---

## API de Remarketing

### Configurações (PostgreSQL)

Implementadas em `src/routes/remarketing/remarketing-config.routes.ts` usando `pg.Pool` e as variáveis `DB_*`.

Principais endpoints:

- `GET /api/remarketing/config?page=1`  
  - Paginação 1-based.  
  - Retorna uma configuração por página, incluindo:
    - dados da instância (id, nome, etc.);
    - mensagens específicas para CNPJ;
    - mensagens genéricas;
    - metadados (intervalos, flags, etc.).

- `POST /api/remarketing/config`  
  Cria ou atualiza uma instância de configuração de remarketing.

- `DELETE /api/remarketing/config/:id`  
  Remove uma configuração existente.

- `GET /api/remarketing/config/instances`  
  Lista básica de todas as instâncias para navegação no front (paginador “< 1 de N >”).

- `POST /api/remarketing/config/messages`  
  Atualiza apenas o bloco de mensagens (CNPJ / genéricas), sem alterar outros campos.

### Upload para MinIO

Implementado em `src/services/remarketing/upload-remarketing.ts`:

- `POST /api/remarketing/upload`  
  - Espera `multipart/form-data` com campo `file`.
  - Usa `multer` em memória.
  - Envia o arquivo para o MinIO usando `@aws-sdk/client-s3` com as credenciais do `.env`.
  - Retorna um JSON com:
    - URL pública do arquivo;
    - bucket + key;
    - informações do arquivo (nome, tamanho, MIME).

---

## Adicionando um novo projeto ao gateway

1. Criar uma pasta em `src/project` com o nome do projeto, por exemplo:

   ```text
   src/project/
   ├─ home/
   ├─ remarketing/
   └─ meu-novo-projeto/
       └─ index.js
   ```

2. Dentro de `meu-novo-projeto/index.js`, exportar um objeto com `mountPath` + `router`:

   ```js
   const express = require("express");
   const router = express.Router();

   // Suas rotas do projeto:
   router.get("/", (req, res) => {
     res.send("Meu novo projeto no gateway!");
   });

   module.exports = {
     mountPath: "/meu-projeto", // caminho onde o projeto será exposto
     router,
   };
   ```

3. O arquivo `src/project/index.js` faz a autodiscovery e monta automaticamente:

   ```text
   [Gateway] Projeto "meu-novo-projeto" montado em "/meu-projeto"
   ```

4. Opcionalmente, criar `public/` e `templates/` dentro do projeto para servir HTML/CSS/JS específicos.

---

## Execução local (desenvolvimento)

1. Clonar o repositório:

   ```bash
   git clone https://github.com/RefigureYT/jaupesca-gateway.git
   cd jaupesca-gateway
   ```

2. Selecionar a versão correta do Node (via `nvm`):

   ```bash
   nvm use 24
   ```

3. Instalar dependências:

   ```bash
   npm install
   ```

4. Copiar o `.env.example` para `.env` e ajustar os valores:

   ```bash
   cp .env.example .env
   # editar .env com suas credenciais / IP / porta
   ```

5. Rodar em modo desenvolvimento:

   ```bash
   npm run dev
   ```

6. Acessar no navegador:

   - Home: `http://APP_IP:APP_PORT/home`
   - Remarketing: `http://APP_IP:APP_PORT/remarketing`
   - Health: `http://APP_IP:APP_PORT/health`

---

## Build e deploy com Docker

O projeto usa um `Dockerfile` multi-stage:

1. **Stage builder**
   - Base: `node:24-alpine`
   - Instala devDependencies com `npm ci`.
   - Roda `npm run build` (TypeScript → `dist/`).
   - Copia os assets de `src/project` para `dist/project`.

2. **Stage runner**
   - Base: `node:24-alpine`
   - Instala somente dependências de produção (`npm ci --omit=dev`).
   - Copia `dist/` do stage anterior.
   - Expõe a porta configurada (`APP_PORT`, default 15432).
   - Executa `node dist/server.js`.

### Script de build

`build.sh` automatiza:

- verificação de configs de debug (impede `NODE_ENV=development` em arquivos de deploy);
- `docker build` com tag para o registry privado;
- `docker push` para `192.168.15.121:5000`.

Uso:

```bash
chmod +x build.sh

# Build + push usando a tag latest
./build.sh
```

### Exemplo de serviço no Swarm (via Traefik)

```yaml
services:
  jaupesca-gateway:
    image: 192.168.15.121:5000/jaupesca-gateway:latest
    deploy:
      replicas: 1
      restart_policy:
        condition: any
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.jaupesca-gateway.rule=Host(`apps.jaupesca.com.br`)"
        - "traefik.http.routers.jaupesca-gateway.entrypoints=websecure"
        - "traefik.http.routers.jaupesca-gateway.tls.certresolver=myresolver"
        - "traefik.http.services.jaupesca-gateway.loadbalancer.server.port=15432"
    networks:
      - RedeGeralServidor

networks:
  RedeGeralServidor:
    external: true
```

As variáveis de ambiente usadas em produção devem ser passadas via `environment` ou `env_file` nesse mesmo serviço.

---

## Licença

Este projeto é **PROPRIETÁRIO** e de **USO RESTRITO**.

Nenhuma parte deste software pode ser copiada, reproduzida, modificada,
distribuída ou utilizada sem autorização **expressa, por escrito**, do autor.

Para detalhes completos, consulte o arquivo [`LICENSE`](./LICENSE).