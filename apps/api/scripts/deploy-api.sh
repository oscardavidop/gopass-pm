#!/bin/bash
set -e

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for API deploy"
  exit 1
fi

API_ENV_FILE="${API_ENV_FILE:-./.env.docker.prod}"
export API_ENV_FILE

if [[ ! -f "$API_ENV_FILE" ]]; then
  echo "Environment file not found: $API_ENV_FILE"
  exit 1
fi


# Configuración de variables de AWS
CLUSTER_NAME="tasku-cluster"
SERVICE_NAME="tasku-api-task-service"
AWS_REGION="us-east-2"
ECR_REGISTRY="210347900704.dkr.ecr.us-east-2.amazonaws.com"
IMAGE_NAME="tasku-api"
TAG="latest"

echo "===================================================="
echo "🚀 INICIANDO SCRIPT DE DESPLIEGUE A PRODUCCIÓN - TASKU"
echo "===================================================="

# ── PRIMERA CONFIRMACIÓN ─────────────────────────────────
read -p "❓ ¿Estás seguro de que quieres desplegar en PRODUCCIÓN? (y/n): " confirm1
if [ "$confirm1" != "y" ] && [ "$confirm1" != "Y" ]; then
    echo "❌ Despliegue cancelado por el usuario."
    exit 1
fi

# ── SEGUNDA CONFIRMACIÓN (EL FILTRO DE SEGURIDAD) ────────
echo "⚠️  ADVERTENCIA: Esto actualizará el servicio en vivo de Tasku en AWS Fargate."
read -p "❓ ¿De verdad estás seguro? Escribe 'y' para confirmar el envío: " confirm2
if [ "$confirm2" != "y" ] && [ "$confirm2" != "Y" ]; then
    echo "❌ Segunda confirmación fallida. Despliegue abortado."
    exit 1
fi

echo "🚀 Confirmaciones aprobadas. Iniciando pipeline de despliegue..."
echo "----------------------------------------------------"

# 1. Autenticarse en AWS ECR
echo "🔐 Logueándose en AWS ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# 2. Compilar con BuildKit moderno (Sin warnings molestos) with buildx
echo "📦 Compilando imagen Docker con BuildKit..."
DOCKER_BUILDKIT=1 docker build --no-cache --load -t $IMAGE_NAME:$TAG .

# 3. Taguear la imagen para AWS ECR
echo "🏷️  Etiquetando imagen para producción..."
docker tag $IMAGE_NAME:$TAG $ECR_REGISTRY/$IMAGE_NAME:$TAG

# 4. Subir imagen a la nube
echo "⬆️  Subiendo imagen a AWS ECR (Subiendo capas)..."
docker push $ECR_REGISTRY/$IMAGE_NAME:$TAG

# 5. Forzar actualización en AWS ECS Fargate (Aplica el Seed en start-prod.sh)
echo "🔄 Forzando nueva implementación en AWS ECS Fargate..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region $AWS_REGION

echo "===================================================="
echo "🎉 ¡DESPLIEGUE COMPLETADO EXITOSAMENTE EN AWS FARGATE!"
echo "===================================================="