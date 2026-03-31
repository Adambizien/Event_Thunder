set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] docker n'est pas installé ou pas dans PATH"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm n'est pas installé ou pas dans PATH"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "[ERROR] Fichier .env introuvable à la racine du projet"
  exit 1
fi

if [ ! -f "secrets/postgres_user.txt" ] || [ ! -f "secrets/postgres_password.txt" ]; then
  echo "[ERROR] Secrets Postgres manquants dans ./secrets"
  exit 1
fi

read_env_var() {
  local key="$1"
  local value
  value="$(awk -F= -v k="$key" '$1==k {sub(/^[^=]*=/, "", $0); print $0; exit}' .env)"
  value="${value%$'\r'}"
  echo "$value"
}

POSTGRES_PORT="$(read_env_var POSTGRES_PORT)"
USER_DATABASE="$(read_env_var USER_DATABASE)"
SUBSCRIPTION_DATABASE="$(read_env_var SUBSCRIPTION_DATABASE)"
TICKETING_DATABASE="$(read_env_var TICKETING_DATABASE)"
EVENT_DATABASE="$(read_env_var EVENT_DATABASE)"
COMMENT_DATABASE="$(read_env_var COMMENT_DATABASE)"

required_vars=(POSTGRES_PORT USER_DATABASE SUBSCRIPTION_DATABASE TICKETING_DATABASE EVENT_DATABASE COMMENT_DATABASE)
for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "[ERROR] Variable $var_name manquante dans .env"
    exit 1
  fi
done


DB_USER="$(cat secrets/postgres_user.txt)"
DB_PASS="$(cat secrets/postgres_password.txt)"

if [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
  echo "[ERROR] secrets/postgres_user.txt ou secrets/postgres_password.txt est vide"
  exit 1
fi

echo "[1/8] Démarrage de postgres et rabbitmq..."
docker compose up -d postgres rabbitmq

echo "[2/8] Attente de Postgres (health=healthy)..."
for _ in {1..60}; do
  status="$(docker compose ps --format json postgres 2>/dev/null | grep -o '"Health":"[^"]*"' | head -n1 | cut -d '"' -f4 || true)"
  if [ "$status" = "healthy" ]; then
    break
  fi
  sleep 2
done

status="$(docker compose ps --format json postgres 2>/dev/null | grep -o '"Health":"[^"]*"' | head -n1 | cut -d '"' -f4 || true)"
if [ "$status" != "healthy" ]; then
  echo "[ERROR] Postgres n'est pas healthy après attente"
  docker compose ps
  exit 1
fi

echo "[3/8] Migration Prisma user-service..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${POSTGRES_PORT}/${USER_DATABASE}?schema=public" \
  npm --prefix user-service run prisma:migrate:deploy

echo "[4/8] Migration Prisma subscription-service..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${POSTGRES_PORT}/${SUBSCRIPTION_DATABASE}?schema=public" \
  npm --prefix subscription-service run prisma:migrate:deploy

echo "[5/8] Migration Prisma event-service..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${POSTGRES_PORT}/${EVENT_DATABASE}?schema=public" \
  npm --prefix event-service run prisma:migrate:deploy

echo "[6/8] Migration Prisma comment-service..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${POSTGRES_PORT}/${COMMENT_DATABASE}?schema=public" \
  npm --prefix comment-service run prisma:migrate:deploy

echo "[7/8] Migration Prisma ticketing-service..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${POSTGRES_PORT}/${TICKETING_DATABASE}?schema=public" \
  npm --prefix ticketing-service run prisma:migrate:deploy

echo "[8/8] Build + démarrage de toute la stack..."
docker compose up -d --build

echo ""
echo "✅ Stack démarrée proprement avec migrations Prisma appliquées"