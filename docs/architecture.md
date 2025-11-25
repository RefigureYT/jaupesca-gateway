# ANOTAÇÕES
Projeto feito em Node JS 
Ele vai usar o node para expor todas as rotas e tudo mais
Os projetos, conforme forem sendo feitos 

Estrutura atual do projeto:

.env # Variáveis do ambiente
.env.example # Exemplo de .env
Dockerfile # vai ser criado mais tarde para deploy
architecture.md # Documento atual, usado apenas para registro do que eu estou fazendo
app.js # config geral (porta, prefixo /api, etc.)
env.js # carrega variáveis de ambiente
health.routes.js # /health, /status, ... (Apenas para teste)
index.js # Esse daqui vai registrar todas as rotas
server.js # ponto de entrada do app (ou server.ts futuramente)
services # Pasta com serviços prontos (SOMENTE SE NECESSÁRIO)


JauPesca-Gateway/
├─ .dirignore
├─ .env
├─ .env.example
├─ .gitignore
├─ .nvmrc
├─ Dockerfile
├─ LICENSE
├─ README.md
├─ docs
│  └─ architecture.md
├─ package.json
└─ src
   ├─ config
   │  ├─ app.js
   │  └─ env.js
   ├─ project
   ├─ routes
   │  ├─ health.routes.js
   │  └─ index.js
   ├─ server.js
   └─ services
