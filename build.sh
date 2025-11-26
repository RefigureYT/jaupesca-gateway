#!/bin/bash
set -euo pipefail

# ================== CONFIG BÁSICA ==================
IP="192.168.15.121"      # IP do registry privado
REG_PORT="5000"          # Porta do Registry
NAME="jaupesca-gateway"  # Nome da imagem
VERSION="${VERSION:-latest}"  # Permite sobrescrever com: VERSION=1.0.0 ./build.sh
IMAGE_NAME="${IP}:${REG_PORT}/${NAME}:${VERSION}"

# Porta exposta pelo app dentro do container
APP_PORT="${APP_PORT:-15432}"

# ================== GUARDAS DE DEBUG ==================
if [[ "${ALLOW_DEBUG:-0}" != "1" ]]; then
    echo "🔍 Verificando flags de DEBUG/DEV em configs de deploy..."

    # NODE_ENV=development em arquivos de deploy
    if grep -RInE 'NODE_ENV[[:space:]]*=[[:space:]]*development' . \
        --include='Dockerfile' \
        --include='.env*' \
        --include='docker-compose*.yml' \
        --include='docker-compose*.yaml' 2>/dev/null; then
        echo "❌ Abortado: encontrado NODE_ENV=development em arquivos de deploy."
        exit 20
    fi

    echo "✅ Nenhum indicador crítico de debug encontrado. Prosseguindo com o build."
else
    echo "⚠️  ALLOW_DEBUG=1 definido — ignorando verificações de debug (uso consciente!)."
fi

# ================== BUILD DA IMAGEM ==================
echo "⏳ Iniciando build da imagem: ${IMAGE_NAME}..."
docker build -t "${IMAGE_NAME}" .
echo "✅ Build finalizado."

# ================== PUSH PARA O REGISTRY ==================
echo "📦 Enviando imagem para o registry privado em ${IP}:${REG_PORT}..."
docker push "${IMAGE_NAME}"
echo "🚀 Enviado com sucesso!"

# ================== DICA DE EXECUÇÃO ==================
cat <<EOF

🔗 Para rodar o container do gateway:

  docker run -d --name ${NAME} \\
    -p ${APP_PORT}:${APP_PORT} \\
    --env-file .env \\
    ${IMAGE_NAME}

🌐 Depois, acesse:
  http://${IP}:${APP_PORT}/home
  http://${IP}:${APP_PORT}/remarketing

EOF
