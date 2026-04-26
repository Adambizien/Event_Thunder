#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] docker n'est pas installe ou pas dans le PATH"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "[ERROR] Fichier .env introuvable a la racine du projet"
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

USER_DATABASE="$(read_env_var USER_DATABASE)"

if [ -z "${USER_DATABASE:-}" ]; then
  echo "[ERROR] Variable USER_DATABASE manquante dans .env"
  exit 1
fi

if ! docker compose ps --status running postgres >/dev/null 2>&1; then
  echo "[ERROR] Le service postgres n'est pas demarre. Lance d'abord docker compose up -d postgres"
  exit 1
fi

SQL_LIST_USERS=$(cat <<'EOF'
SELECT
  u.id,
  u.email,
  COALESCE(ui.first_name, ''),
  COALESCE(ui.last_name, ''),
  u.role
FROM users u
LEFT JOIN users_info ui ON ui.user_id = u.id
ORDER BY u.email ASC;
EOF
)

mapfile -t USERS < <(
  docker compose exec -T postgres sh -lc \
    "PGPASSWORD=\"\$(cat /run/secrets/postgres_password)\" psql -h 127.0.0.1 -U \"\$(cat /run/secrets/postgres_user)\" -d \"$USER_DATABASE\" -At -F '|' -c \"$SQL_LIST_USERS\""
)

if [ "${#USERS[@]}" -eq 0 ]; then
  echo "[INFO] Aucun utilisateur trouve dans la base $USER_DATABASE"
  exit 0
fi

echo ""
echo "Utilisateurs disponibles :"
echo ""

for i in "${!USERS[@]}"; do
  IFS='|' read -r user_id email first_name last_name role <<<"${USERS[$i]}"
  full_name="$(printf '%s %s' "$first_name" "$last_name" | xargs)"
  if [ -z "$full_name" ]; then
    full_name="-"
  fi

  printf "%2d) %s | %s | role=%s | id=%s\n" \
    "$((i + 1))" \
    "$email" \
    "$full_name" \
    "$role" \
    "$user_id"
done

echo ""
read -r -p "Numero de l'utilisateur a promouvoir Admin: " selection

if ! [[ "$selection" =~ ^[0-9]+$ ]]; then
  echo "[ERROR] Merci de saisir un numero valide"
  exit 1
fi

if [ "$selection" -lt 1 ] || [ "$selection" -gt "${#USERS[@]}" ]; then
  echo "[ERROR] Numero hors plage"
  exit 1
fi

IFS='|' read -r selected_user_id selected_email selected_first_name selected_last_name selected_role <<<"${USERS[$((selection - 1))]}"
selected_name="$(printf '%s %s' "$selected_first_name" "$selected_last_name" | xargs)"

echo ""
echo "Utilisateur selectionne : $selected_email${selected_name:+ | $selected_name} | role actuel=$selected_role"

if [ "$selected_role" = "Admin" ]; then
  echo "[INFO] Cet utilisateur est deja Admin"
  exit 0
fi

read -r -p "Confirmer le passage en Admin ? [y/N] " confirm

case "$confirm" in
  y|Y|yes|YES|o|O|oui|OUI)
    ;;
  *)
    echo "[INFO] Operation annulee"
    exit 0
    ;;
esac

docker compose exec -T postgres sh -lc \
  "PGPASSWORD=\"\$(cat /run/secrets/postgres_password)\" psql -h 127.0.0.1 -U \"\$(cat /run/secrets/postgres_user)\" -d \"$USER_DATABASE\" -v ON_ERROR_STOP=1 -c \"UPDATE users SET role = 'Admin' WHERE id = '$selected_user_id';\""

echo ""
echo "[OK] $selected_email est maintenant Admin"
