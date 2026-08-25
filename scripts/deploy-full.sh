#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="root@59.110.215.35"
SSH_KEY="/Users/zhouying5/.ssh/id_ed25519"
API_DIR="/var/www/zhouying.cn/5lovelanguages-api"

cd "$PROJECT_DIR"
npm run build:static
rsync -avz -e "ssh -i $SSH_KEY" static-dist/ "$SERVER:/var/www/zhouying.cn/5lovelanguages/"
ssh -i "$SSH_KEY" "$SERVER" "mkdir -p '$API_DIR'"
rsync -avz -e "ssh -i $SSH_KEY" --exclude node_modules --exclude data analytics-server/ "$SERVER:$API_DIR/"
scp -i "$SSH_KEY" deploy/five-love-languages-analytics.service deploy/nginx-api-location.conf deploy/install-analytics-remote.sh "$SERVER:/tmp/"

read -r -s -p "请设置数据后台管理员密码: " ADMIN_PASSWORD
echo
if [ ${#ADMIN_PASSWORD} -lt 10 ]; then
  echo "密码至少需要 10 个字符" >&2
  exit 1
fi
printf 'PORT=3025\nDATA_DIR=%s/data\nADMIN_PASSWORD=%s\n' "$API_DIR" "$ADMIN_PASSWORD" | ssh -i "$SSH_KEY" "$SERVER" "umask 077; cat > '$API_DIR/.env'"
unset ADMIN_PASSWORD
ssh -i "$SSH_KEY" "$SERVER" "bash /tmp/install-analytics-remote.sh"

echo "站点: https://zhouying.cn/5lovelanguages/"
echo "后台: https://zhouying.cn/5lovelanguages/admin/"
